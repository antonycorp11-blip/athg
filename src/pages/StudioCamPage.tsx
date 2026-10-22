import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useParams } from 'react-router'
import { Camera, Circle, Square, SwitchCamera, Wifi, WifiOff } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useSeo } from '@/hooks/useSeo'
import { ICE_SERVERS, drain, joinSignaling, sendBinary, type Signaling } from '@/services/studio/signaling'
import { STUDIO_SCENES, type CamToStudio, type SignalMessage, type StudioScene, type StudioToCam } from '@/types/studio'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/format'

type Facing = 'user' | 'environment'
type CamStatus = 'idle' | 'connecting' | 'connected' | 'error'

const VIDEO_MAX_BITRATE = 2_500_000

function pickAudioMime() {
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
}

/**
 * Câmera do Modo Gravação (abre no iPhone pelo QR code do estúdio).
 * Manda o rosto ao vivo para o computador, grava a voz aqui mesmo (qualidade cheia)
 * enviando os pedaços pelo data channel, e serve de controle remoto das cenas.
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
  const voiceRef = useRef<RTCDataChannel | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const sigRef = useRef<Signaling | null>(null)

  const [status, setStatus] = useState<CamStatus>('idle')
  const [error, setError] = useState('')
  const [facing, setFacing] = useState<Facing>('user')
  const [studio, setStudio] = useState<{ scene: StudioScene; recording: boolean; startedAt: number | null }>({ scene: 'game-face', recording: false, startedAt: null })
  const [now, setNow] = useState(Date.now())

  const sendCtl = (m: CamToStudio) => {
    const dc = ctlRef.current
    if (dc?.readyState === 'open') dc.send(JSON.stringify(m))
  }

  // Voz: grava no iPhone e manda cada pedaço (1 s) para o computador escrever no disco.
  const startVoice = useCallback(() => {
    const stream = streamRef.current
    const dc = voiceRef.current
    if (!stream || !dc || recRef.current) return
    const mime = pickAudioMime()
    try {
      const rec = new MediaRecorder(new MediaStream(stream.getAudioTracks()), { mimeType: mime || undefined, audioBitsPerSecond: 192_000 })
      let queue = Promise.resolve()
      dc.send(JSON.stringify({ t: 'voice-start', mime: rec.mimeType || mime } satisfies CamToStudio))
      rec.ondataavailable = (e) => {
        if (!e.data.size) return
        queue = queue.then(async () => sendBinary(dc, await e.data.arrayBuffer()))
      }
      rec.onstop = () => {
        queue = queue.then(async () => {
          await drain(dc)
          if (dc.readyState === 'open') dc.send(JSON.stringify({ t: 'voice-end' } satisfies CamToStudio))
        })
        recRef.current = null
      }
      rec.start(1000)
      recRef.current = rec
    } catch (e) {
      sendCtl({ t: 'voice-error', message: String(e) })
    }
  }, [])

  const stopVoice = useCallback(() => {
    if (recRef.current?.state === 'recording') recRef.current.stop()
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
    const voice = pc.createDataChannel('voice', { ordered: true })
    voice.binaryType = 'arraybuffer'
    ctlRef.current = ctl
    voiceRef.current = voice
    ctl.onmessage = (e) => {
      const m = JSON.parse(e.data as string) as StudioToCam
      if (m.t === 'state') setStudio({ scene: m.scene, recording: m.recording, startedAt: m.startedAt })
      if (m.t === 'rec-start') startVoice()
      if (m.t === 'rec-stop') stopVoice()
    }
    const sender = pc.addTrack(stream.getVideoTracks()[0], stream)
    pc.onicecandidate = (e) => e.candidate && signaling.send({ type: 'ice', from: 'cam', candidate: e.candidate.toJSON() })
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return
      if (pc.connectionState === 'connected') {
        setStatus('connected')
        const params = sender.getParameters()
        if (params.encodings?.[0]) {
          params.encodings[0].maxBitrate = VIDEO_MAX_BITRATE
          void sender.setParameters(params).catch(() => {})
        }
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setStatus('connecting')
        stopVoice()
      }
    }
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    signaling.send({ type: 'offer', sdp: offer.sdp ?? '' })
  }, [startVoice, stopVoice])

  const openCamera = useCallback(async (which: Facing) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: which, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      // Voz crua: sem filtros do sistema, melhor para editar depois.
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    return stream
  }, [])

  const start = async () => {
    setError('')
    try {
      const stream = await openCamera(facing)
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      startMeter(stream, meterRef)
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
      const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: next, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } })
      const track = fresh.getVideoTracks()[0]
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
      recRef.current?.state === 'recording' && recRef.current.stop()
      pcRef.current?.close()
      sigRef.current?.close()
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
    },
    [],
  )

  const connected = status === 'connected'
  const elapsed = studio.recording && studio.startedAt ? now - studio.startedAt : 0

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))] text-fg">
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

      <div className="relative mt-2 overflow-hidden rounded-xl bg-black ring-1 ring-line">
        <video ref={videoRef} autoPlay playsInline muted className={cn('aspect-[3/4] w-full object-cover', facing === 'user' && '-scale-x-100')} />
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
        <div className="mt-4 flex flex-1 flex-col gap-3">
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
                {t(`studio.scenes.${s}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!connected}
            onClick={() => sendCtl({ t: 'rec-toggle' })}
            className={cn(
              'flex h-16 items-center justify-center gap-2.5 rounded-xl text-base font-bold transition-colors disabled:opacity-40',
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
  )
}

/** Barra de nível do microfone (confirma que a voz está chegando). */
function startMeter(stream: MediaStream, ref: RefObject<HTMLDivElement | null>) {
  try {
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    ctx.createMediaStreamSource(stream).connect(analyser)
    const data = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128))
      if (ref.current) ref.current.style.width = `${Math.min(100, (peak / 128) * 160)}%`
      requestAnimationFrame(tick)
    }
    tick()
  } catch {
    /* sem medidor */
  }
}

async function requestWakeLock() {
  try {
    await (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<unknown> } }).wakeLock?.request('screen')
  } catch {
    /* sem wake lock: o usuário precisa deixar a tela acesa */
  }
}
