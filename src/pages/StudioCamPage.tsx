import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { useParams } from 'react-router'
import { AudioLines, Camera, Circle, FlipHorizontal2, RotateCw, Square, SwitchCamera, Wifi, WifiOff } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useSeo } from '@/hooks/useSeo'
import { ICE_SERVERS, joinSignaling, type Signaling } from '@/services/studio/signaling'
import { storage } from '@/services/storage'
import { preferH264 } from '@/services/studio/sdp'
import { rotatedVideoStyle } from '@/services/studio/video'
import { STUDIO_SCENES, type CamRotation, type CamToStudio, type SignalMessage, type StudioToCam } from '@/types/studio'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/format'

type Facing = 'user' | 'environment'
type CamStatus = 'idle' | 'connecting' | 'connected' | 'error'
type StudioState = Extract<StudioToCam, { t: 'state' }>

const VIDEO_MAX_BITRATE = 8_000_000
const VIDEO: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }

// v2: o padrão passou a ser desligado (o processamento do iPhone abafava a voz).
const NOISE_KEY = 'studio-cam-noise-v2'

/** Voz: com redução de ruído usa o processamento de voz do iPhone (o mesmo das ligações). */
const voiceConstraints = (noise: boolean): MediaTrackConstraints => ({ echoCancellation: noise, noiseSuppression: noise, autoGainControl: noise })

/** Ângulo da tela (0, 90, 180, 270): a interface gira ao contrário e fica sempre em retrato. */
function useScreenAngle() {
  const read = () => {
    const a = screen.orientation?.angle ?? Number((window as Window & { orientation?: number }).orientation ?? 0)
    return ((a % 360) + 360) % 360
  }
  const [angle, setAngle] = useState(read)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const update = () => {
      setAngle(read())
      setSize({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    screen.orientation?.addEventListener?.('change', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      screen.orientation?.removeEventListener?.('change', update)
    }
  }, [])
  return { angle: size.w > size.h ? angle || 90 : 0, size }
}

/**
 * Câmera do Modo Gravação (abre no iPhone pelo QR code do estúdio).
 * Manda o rosto e a voz ao vivo para o computador (que grava a voz num arquivo separado,
 * sincronizado com o vídeo) e serve de controle remoto das cenas.
 */
export default function StudioCamPage() {
  const { room = '' } = useParams()
  const { t } = useTranslation()
  useSeo({ title: t('studio.cam.title'), description: t('studio.cam.title'), path: '/', noindex: true })

  const videoRef = useRef<HTMLVideoElement>(null)
  const meterRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const ctlRef = useRef<RTCDataChannel | null>(null)
  const stopMeterRef = useRef<() => void>(() => {})
  const sigRef = useRef<Signaling | null>(null)

  const [status, setStatus] = useState<CamStatus>('idle')
  const [error, setError] = useState('')
  const [facing, setFacing] = useState<Facing>('user')
  const [studio, setStudio] = useState<StudioState>({ t: 'state', scene: 'game-face', recording: false, startedAt: null, screen: false, mirror: true, rotate: 0 })
  const [now, setNow] = useState(Date.now())
  const [noise, setNoise] = useState(() => storage.get(NOISE_KEY, false))
  const noiseRef = useRef(noise)
  noiseRef.current = noise
  const { angle, size } = useScreenAngle()

  const sendCtl = (m: CamToStudio) => {
    const dc = ctlRef.current
    if (dc?.readyState === 'open') dc.send(JSON.stringify(m))
  }

  /** Liga/desliga a redução de ruído trocando o microfone (sem derrubar a conexão). */
  const applyNoise = useCallback(async (on: boolean) => {
    const stream = streamRef.current
    setNoise(on)
    storage.set(NOISE_KEY, on)
    if (stream) {
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({ audio: voiceConstraints(on) })
        const track = fresh.getAudioTracks()[0]
        await pcRef.current?.getSenders().find((x) => x.track?.kind === 'audio')?.replaceTrack(track)
        stream.getAudioTracks().forEach((tr) => {
          stream.removeTrack(tr)
          tr.stop()
        })
        stream.addTrack(track)
        stopMeterRef.current()
        stopMeterRef.current = startMeter(stream, meterRef)
      } catch {
        /* mantém o microfone atual */
      }
    }
    const dc = ctlRef.current
    if (dc?.readyState === 'open') dc.send(JSON.stringify({ t: 'cam-info', noise: on } satisfies CamToStudio))
  }, [])

  const connect = useCallback(async () => {
    const stream = streamRef.current
    const signaling = sigRef.current
    if (!stream || !signaling) return
    pcRef.current?.close()
    setStatus('connecting')
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc
    const ctl = pc.createDataChannel('ctl')
    ctlRef.current = ctl
    ctl.onopen = () => ctl.send(JSON.stringify({ t: 'cam-info', noise: noiseRef.current } satisfies CamToStudio))
    ctl.onmessage = (e) => {
      const m = JSON.parse(e.data as string) as StudioToCam
      if (m.t === 'state') setStudio(m)
      if (m.t === 'set-noise') void applyNoise(m.on)
    }
    // Vídeo e voz ao vivo no mesmo stream: o computador mantém os dois sincronizados.
    const sender = pc.addTrack(stream.getVideoTracks()[0], stream)
    for (const track of stream.getAudioTracks()) pc.addTrack(track, stream)
    const transceiver = pc.getTransceivers().find((tr) => tr.sender === sender)
    if (transceiver) preferH264(transceiver)
    pc.onicecandidate = (e) => e.candidate && signaling.send({ type: 'ice', from: 'cam', candidate: e.candidate.toJSON() })
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return
      if (pc.connectionState === 'connected') {
        setStatus('connected')
        const params = sender.getParameters()
        if (params.encodings?.[0]) {
          params.encodings[0].maxBitrate = VIDEO_MAX_BITRATE
          params.encodings[0].maxFramerate = 30
          ;(params as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference = 'maintain-resolution'
          void sender.setParameters(params).catch(() => {})
        }
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') setStatus('connecting')
    }
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    signaling.send({ type: 'offer', sdp: offer.sdp ?? '' })
  }, [applyNoise])

  const start = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, ...VIDEO },
        audio: voiceConstraints(noiseRef.current),
      })
      for (const track of stream.getVideoTracks()) track.contentHint = 'detail'
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      stopMeterRef.current = startMeter(stream, meterRef)
      void requestWakeLock()
      let pending: RTCIceCandidateInit[] = []
      const onMessage = (m: SignalMessage) => {
        const pc = pcRef.current
        if (m.type === 'studio-ready') void connect()
        if (m.type === 'answer' && pc) {
          void pc.setRemoteDescription({ type: 'answer', sdp: m.sdp }).then(() => {
            pending.forEach((c) => void pc.addIceCandidate(c).catch(() => {}))
            pending = []
          })
        }
        if (m.type === 'ice' && m.from === 'studio') {
          if (pc?.remoteDescription) void pc.addIceCandidate(m.candidate).catch(() => {})
          else pending.push(m.candidate)
        }
      }
      sigRef.current = await joinSignaling(room, onMessage, () => void connect())
      setStatus('connecting')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error && e.name === 'NotAllowedError' ? t('studio.cam.denied') : t('studio.cam.failed'))
    }
  }

  const flip = async () => {
    const next: Facing = facing === 'user' ? 'environment' : 'user'
    const old = streamRef.current
    if (!old) return setFacing(next)
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next, ...VIDEO } })
      const track = fresh.getVideoTracks()[0]
      track.contentHint = 'detail'
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video')
      await sender?.replaceTrack(track)
      old.getVideoTracks().forEach((tr) => {
        old.removeTrack(tr)
        tr.stop()
      })
      old.addTrack(track)
      if (videoRef.current) videoRef.current.srcObject = old
      setFacing(next)
    } catch {
      /* mantém a câmera atual */
    }
  }

  // Timer da gravação + manter a tela acesa ao voltar para a aba
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500)
    const onVisible = () => document.visibilityState === 'visible' && streamRef.current && void requestWakeLock()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(
    () => () => {
      stopMeterRef.current()
      pcRef.current?.close()
      sigRef.current?.close()
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
    },
    [],
  )

  const connected = status === 'connected'
  const elapsed = studio.recording && studio.startedAt ? now - studio.startedAt : 0

  // Celular deitado: gira a interface de volta, como um app travado em retrato.
  const lockStyle: CSSProperties | undefined = angle
    ? { position: 'fixed', top: '50%', left: '50%', width: size.h, height: size.w, transform: `translate(-50%, -50%) rotate(${angle === 270 ? 90 : -90}deg)` }
    : undefined
  // A imagem da câmera continua em pé: gira junto com o mundo, não com a interface.
  const previewRotate = (angle === 270 ? 270 : angle ? 90 : 0) as CamRotation

  return (
    <div className="min-h-dvh overflow-hidden bg-bg text-fg">
      <div
        style={lockStyle}
        className={cn('flex flex-col overflow-y-auto px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))]', !lockStyle && 'min-h-dvh')}
      >
        <header className="flex items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-2">
            <img src="/brand/athg-symbol.png" alt="" className="size-7" />
            <span className="display-title text-sm tracking-wider">{t('studio.cam.title')}</span>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', connected ? 'bg-success/15 text-success' : 'bg-white/[0.07] text-muted')}>
            {connected ? <Wifi size={13} aria-hidden /> : <WifiOff size={13} aria-hidden />}
            {t(`studio.cam.status.${status}`)}
          </span>
        </header>

        <div className="relative mx-auto mt-2 aspect-[3/4] w-full max-w-sm shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-line">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute object-cover"
            style={rotatedVideoStyle(previewRotate, facing === 'user', 3 / 4)}
          />
          {status === 'idle' || status === 'error' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <Camera size={36} className="text-cyan" aria-hidden />
              <p className="text-sm text-muted">{t('studio.cam.intro')}</p>
              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
              <Button size="lg" icon={Camera} onClick={() => void start()}>
                {t('studio.cam.start')}
              </Button>
            </div>
          ) : (
            <>
              {studio.recording && (
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white tabular-nums">
                  <span className="size-2 animate-pulse rounded-full bg-danger" aria-hidden /> REC {formatDuration(elapsed)}
                </span>
              )}
              <button type="button" onClick={() => void flip()} aria-label={t('studio.cam.flip')} className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-black/55 text-white">
                <SwitchCamera size={18} aria-hidden />
              </button>
              <div className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-black/50" aria-hidden>
                <div ref={meterRef} className="h-full w-0 rounded-full bg-success transition-[width] duration-75" />
              </div>
            </>
          )}
        </div>

        {status !== 'idle' && status !== 'error' && (
          <div className="mx-auto mt-4 flex w-full max-w-sm flex-1 flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              {STUDIO_SCENES.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  disabled={!connected}
                  onClick={() => sendCtl({ t: 'scene', scene: s })}
                  className={cn(
                    'rounded-lg border px-2 py-3 text-xs font-semibold transition-colors disabled:opacity-40',
                    studio.scene === s ? 'border-brand bg-brand/20 text-fg' : 'border-line bg-white/[0.05] text-muted',
                  )}
                >
                  <span className="block text-base font-bold">{i + 1}</span>
                  {t(studio.screen ? `studio.screenScenes.${s}` : `studio.scenes.${s}`)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!connected}
                onClick={() => sendCtl({ t: 'cam-transform', mirror: !studio.mirror })}
                className={cn('flex h-11 items-center justify-center gap-2 rounded-lg border text-xs font-semibold disabled:opacity-40', studio.mirror ? 'border-brand bg-brand/20' : 'border-line bg-white/[0.05] text-muted')}
              >
                <FlipHorizontal2 size={16} aria-hidden /> {t('studio.mirror')}
              </button>
              <button
                type="button"
                disabled={!connected}
                onClick={() => sendCtl({ t: 'cam-transform', rotate: (((studio.rotate + 90) % 360) as CamRotation) })}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white/[0.05] text-xs font-semibold text-muted disabled:opacity-40"
              >
                <RotateCw size={16} aria-hidden /> {t('studio.rotate')} {studio.rotate ? `${studio.rotate}°` : ''}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void applyNoise(!noise)}
              className={cn('flex h-11 items-center justify-center gap-2 rounded-lg border text-xs font-semibold', noise ? 'border-brand bg-brand/20' : 'border-line bg-white/[0.05] text-muted')}
            >
              <AudioLines size={16} aria-hidden /> {t('studio.noise')}: {noise ? t('studio.on') : t('studio.off')}
            </button>
            <button
              type="button"
              disabled={!connected}
              onClick={() => sendCtl({ t: 'rec-toggle' })}
              className={cn(
                'flex h-16 shrink-0 items-center justify-center gap-2.5 rounded-xl text-base font-bold transition-colors disabled:opacity-40',
                studio.recording ? 'bg-white/[0.1] text-fg' : 'bg-danger text-white',
              )}
            >
              {studio.recording ? <Square size={20} aria-hidden className="fill-current" /> : <Circle size={20} aria-hidden className="fill-current" />}
              {studio.recording ? t('studio.stop') : t('studio.record')}
            </button>
            <p className="text-center text-xs text-subtle">{t('studio.cam.tip')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/** Barra de nível do microfone (confirma que a voz está chegando). */
function startMeter(stream: MediaStream, ref: RefObject<HTMLDivElement | null>): () => void {
  try {
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    ctx.createMediaStreamSource(stream).connect(analyser)
    const data = new Uint8Array(analyser.fftSize)
    let raf = 0
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128))
      if (ref.current) ref.current.style.width = `${Math.min(100, (peak / 128) * 160)}%`
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(raf)
      void ctx.close()
    }
  } catch {
    return () => {}
  }
}

async function requestWakeLock() {
  try {
    await (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<unknown> } }).wakeLock?.request('screen')
  } catch {
    /* sem wake lock: o usuário precisa deixar a tela acesa */
  }
}
