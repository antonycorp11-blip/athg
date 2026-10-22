import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import qrcode from 'qrcode-generator'
import {
  ArrowLeft, Circle, CircleCheck, FlipHorizontal2, FolderOpen, Headphones, Maximize, Minimize, MonitorUp, RectangleHorizontal, RotateCw, ScreenShare, SlidersHorizontal,
  AudioLines, Smartphone, Square, SquareDashed, TriangleAlert, Video, Volume2, VolumeX,
} from 'lucide-react'
import type { Game } from '@/types/game'
import { STUDIO_SCENES, type CamRotation, type CamToStudio, type StudioScene } from '@/types/studio'
import { gamesService, isPlayable } from '@/services/gamesService'
import { storage } from '@/services/storage'
import { captureScreen, captureStage, captureSupported, overlaysHidden, pickVideoMime, QUALITY, type StudioFps } from '@/services/studio/capture'
import { createDiskFile, diskSupported, ensureWritable, extensionFor, fileDuration, pickFolder, savedFolder, takeName, type DiskFile } from '@/services/studio/disk'
import { StudioMixer, type MixChannel } from '@/services/studio/mixer'
import { VoiceTap } from '@/services/studio/wav'
import { rotatedVideoStyle } from '@/services/studio/video'
import { useAccount, useAuthStatus, useIsAdmin } from '@/hooks/useIsAdmin'
import { useGameBridge } from '@/hooks/useGameBridge'
import { usePlaySession } from '@/hooks/usePlaySession'
import { useSeo } from '@/hooks/useSeo'
import { useStudioLink } from '@/hooks/useStudioLink'
import { useTranslation } from '@/i18n/useTranslation'
import { originOf } from '@/services/gameBridge'
import { resolveGameUrl } from '@/utils/gameUrl'
import { formatBytes, formatDuration } from '@/utils/format'
import { GameNotFound } from '@/components/games/GameNotFound'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'

const SANDBOX = 'allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads'
/** /estudio/tela: grava a tela do Mac (game dev) em vez de um jogo. */
export const SCREEN_SLUG = 'tela'

type CamShape = 'wide' | 'square' | 'circle'
interface StudioSettings {
  scene: StudioScene
  /** Canto superior esquerdo do rosto, em fração do palco. */
  x: number
  y: number
  /** Largura do rosto em fração do palco. */
  w: number
  shape: CamShape
  mirror: boolean
  rotate: CamRotation
  fps: StudioFps
  gameVol: number
  voiceVol: number
  gameMute: boolean
  voiceMute: boolean
  monitorVol: number
}
const DEFAULTS: StudioSettings = {
  scene: 'game-face', x: 0.74, y: 0.66, w: 0.24, shape: 'wide', mirror: true, rotate: 0, fps: 30,
  gameVol: 1, voiceVol: 1, gameMute: false, voiceMute: false, monitorVol: 1,
}
const SETTINGS_KEY = 'studio-settings'

/** Altura do rosto (fração do palco 16:9) para uma largura w. */
const heightOf = (w: number, shape: CamShape) => (shape === 'wide' ? w : (w * 16) / 9)
const maxWidthOf = (shape: CamShape) => (shape === 'wide' ? 0.6 : 0.5)
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function fit(s: StudioSettings): StudioSettings {
  const w = clamp(s.w, 0.1, maxWidthOf(s.shape))
  const h = heightOf(w, s.shape)
  return { ...s, w, x: clamp(s.x, 0, 1 - w), y: clamp(s.y, 0, 1 - h) }
}

/** Modo Gravação: só para contas admin. */
export default function StudioPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const screenMode = slug === SCREEN_SLUG
  const game = screenMode ? undefined : gamesService.getBySlug(slug)
  const isAdmin = useIsAdmin()
  const authStatus = useAuthStatus()
  const account = useAccount()
  const { t } = useTranslation()
  useSeo({ title: t('studio.seoTitle', { title: game?.title ?? t('studio.screen') }), description: t('studio.title'), path: game ? `/game/${game.slug}` : '/', noindex: true })

  // A flag de admin chega depois do login/sync: espera um pouco antes de mandar embora.
  const [waitOver, setWaitOver] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setWaitOver(true), 5000)
    return () => clearTimeout(timer)
  }, [])
  // Teste local sem conta admin (só no `npm run dev`).
  const devBypass = import.meta.env.DEV && params.has('devstudio')
  const allowed = devBypass || isAdmin
  const back = game ? `/game/${game.slug}` : '/'

  if (!game && !screenMode) return <GameNotFound />
  if (!allowed && (account === 'checking' || (!waitOver && authStatus !== 'unavailable')))
    return <div className="grid min-h-dvh place-items-center bg-bg text-sm text-muted">{t('studio.checking')}</div>
  if (!allowed || (game && (!isPlayable(game, true) || !game.gameUrl))) return <Navigate to={back} replace />
  // Sem `key`: trocar de jogo mantém o estúdio montado (iPhone, captura e mixer continuam).
  return <Studio game={game ?? null} />
}

/** Iframe do jogo isolado do resto: trocar de cena nunca recarrega o jogo. */
const GameFrame = memo(function GameFrame({ slug, gameUrl, title }: { slug: string; gameUrl: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const onLoad = useGameBridge(iframeRef, slug, gameUrl, 0)
  const crossOrigin = originOf(gameUrl) !== window.location.origin
  return (
    <iframe
      key={gameUrl}
      ref={iframeRef}
      src={gameUrl}
      title={title}
      onLoad={() => {
        onLoad()
        // Avisa o jogo que está no estúdio: ele passa a repassar ⌘1/⌘2/⌘3 (troca de cena).
        iframeRef.current?.contentWindow?.postMessage({ type: 'ATHG_STUDIO_ON' }, '*')
      }}
      allow="autoplay; fullscreen; gamepad; clipboard-write; accelerometer; gyroscope; screen-wake-lock"
      sandbox={crossOrigin ? SANDBOX : undefined}
      referrerPolicy="strict-origin-when-cross-origin"
      className="absolute inset-0 size-full border-0"
    />
  )
})

/** Modo tela: a tela do Mac aparece no palco (e é gravada com o rosto por cima). */
function ScreenFrame({ stream, onPick, label }: { stream: MediaStream | null; onPick: () => void; label: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])
  return stream ? (
    <video ref={ref} autoPlay playsInline muted className="absolute inset-0 size-full bg-black object-contain" />
  ) : (
    <button type="button" onClick={onPick} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0b1220] text-muted hover:text-fg">
      <ScreenShare size={40} aria-hidden />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  )
}

/** Medidor de nível (escala em dB, vermelho perto de estourar). */
function Meter({ mixer, ch, className }: { mixer: StudioMixer | null; ch: MixChannel; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!mixer) return
    let raf = 0
    const tick = () => {
      const level = mixer.level(ch)
      const pct = level > 0 ? clamp(((20 * Math.log10(level) + 60) / 60) * 100, 0, 100) : 0
      const el = ref.current
      if (el) {
        el.style.width = `${pct}%`
        el.style.background = level > 0.89 ? 'var(--color-danger)' : level > 0.5 ? 'var(--color-gold)' : 'var(--color-success)'
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [mixer, ch])
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-white/[0.08]', className)} aria-hidden>
      <div ref={ref} className="h-full w-0 rounded-full" />
    </div>
  )
}

interface Take {
  base: string
  dir: FileSystemDirectoryHandle
  recorder: MediaRecorder
  video: DiskFile
  voice: DiskFile | null
  startedAt: number
}

function Studio({ game }: { game: Game | null }) {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  usePlaySession(game?.slug, Boolean(game))
  const screenMode = !game
  const gameUrl = game ? resolveGameUrl(game) : ''
  const supported = captureSupported() && diskSupported()
  const hudOk = overlaysHidden()
  const games = useMemo(() => gamesService.getAll().filter((g) => isPlayable(g, true)), [])

  const [settings, setSettings] = useState<StudioSettings>(() => fit({ ...DEFAULTS, ...storage.get<Partial<StudioSettings>>(SETTINGS_KEY, {}) }))
  const update = useCallback((patch: Partial<StudioSettings>) => {
    setSettings((s) => {
      const next = fit({ ...s, ...patch })
      storage.set(SETTINGS_KEY, next)
      return next
    })
  }, [])

  const stageRef = useRef<HTMLDivElement>(null)
  const camVideoRef = useRef<HTMLVideoElement>(null)
  const [folder, setFolder] = useState<{ dir: FileSystemDirectoryHandle; granted: boolean } | null>(null)
  const [capture, setCapture] = useState<MediaStream | null>(null)
  const [screen, setScreen] = useState<MediaStream | null>(null)
  const [mixer, setMixer] = useState<StudioMixer | null>(null)
  const [monitorOpen, setMonitorOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [mixerOpen, setMixerOpen] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'warn' | 'ok'; text: string } | null>(null)
  const [recording, setRecording] = useState<{ startedAt: number; stageWidth: number } | null>(null)
  const [stats, setStats] = useState({ now: Date.now(), video: 0, voice: 0 })
  const [dragging, setDragging] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const takeRef = useRef<Take | null>(null)
  const tapRef = useRef<Promise<VoiceTap | null> | null>(null)
  const [noise, setNoise] = useState<boolean | null>(null)

  // ---------- Gravação ----------
  const stopRec = useCallback(() => {
    const take = takeRef.current
    if (!take) return
    takeRef.current = null
    // Vídeo e voz param no mesmo instante; quando o vídeo fecha, a voz é cortada na
    // duração exata dele (o MP4 termina alguns quadros antes).
    const closeVoice = tapRef.current?.then((tap) => tap?.stop())
    const videoClosed = new Promise<void>((resolve) => {
      take.recorder.onstop = () => void take.video.close().then(resolve)
    })
    if (take.recorder.state !== 'inactive') take.recorder.stop()
    void Promise.all([closeVoice, videoClosed]).then(async ([finish]) => {
      if (!finish) return
      await finish(await fileDuration(take.dir, take.video.name))
    })
    setRecording(null)
    setNotice({ tone: 'ok', text: t('studio.saved', { name: take.base }) })
  }, [t])

  const startRec = useCallback(async () => {
    if (takeRef.current) return
    if (!folder?.granted) return setNotice({ tone: 'warn', text: t('studio.needFolder') })
    if (!capture || !mixer) return setNotice({ tone: 'warn', text: t('studio.needCapture') })
    if (screenMode && !screen) return setNotice({ tone: 'warn', text: t('studio.needScreen') })
    const mimeType = pickVideoMime()
    const base = takeName(game?.slug ?? SCREEN_SLUG)
    try {
      await mixer.resume()
      tapRef.current ??= VoiceTap.create(mixer.ctx, mixer.voiceInput).catch(() => null)
      const tap = await tapRef.current
      const video = await createDiskFile(folder.dir, `${base} - video.${extensionFor(mimeType)}`)
      const voice = tap ? await createDiskFile(folder.dir, `${base} - voz.wav`) : null
      // Vídeo do palco com o som do jogo; a voz do iPhone vai para o WAV separado.
      const recorder = new MediaRecorder(new MediaStream([...capture.getVideoTracks(), mixer.recordTrack]), {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: QUALITY[settings.fps].videoBitsPerSecond,
        audioBitsPerSecond: 192_000,
      })
      recorder.ondataavailable = (e) => video.write(e.data)
      recorder.onstop = () => void video.close()
      recorder.onerror = () => setNotice({ tone: 'warn', text: t('studio.recError') })
      const startedAt = Date.now()
      takeRef.current = { base, dir: folder.dir, recorder, video, voice, startedAt }
      // A voz começa quando o vídeo realmente começa (o codificador leva um instante para
      // ligar): os dois arquivos ficam alinhados desde o primeiro quadro.
      recorder.start(1000)
      if (tap && voice) tap.start(voice)
      setRecording({ startedAt, stageWidth: stageRef.current?.getBoundingClientRect().width ?? 0 })
      setNotice(!screenMode && !mixer.hasInput('game') ? { tone: 'warn', text: t('studio.noGameAudio') } : null)
    } catch {
      setNotice({ tone: 'warn', text: t('studio.recError') })
    }
  }, [folder, capture, mixer, screen, screenMode, game, settings.fps, t])

  const toggleRec = () => (takeRef.current ? stopRec() : void startRec())

  const onCtl = (m: CamToStudio) => {
    if (m.t === 'scene') update({ scene: m.scene })
    if (m.t === 'rec-toggle') toggleRec()
    if (m.t === 'cam-transform') update({ ...(m.mirror !== undefined && { mirror: m.mirror }), ...(m.rotate !== undefined && { rotate: m.rotate }) })
    if (m.t === 'cam-info') setNoise(m.noise)
  }

  const link = useStudioLink({ onCtl })
  const { status: linkStatus, sendCtl, camStream } = link

  // Rosto ao vivo (e a voz ao vivo entra no mixer)
  useEffect(() => {
    if (camVideoRef.current) camVideoRef.current.srcObject = camStream
    mixer?.setStream('voice', camStream)
  }, [camStream, mixer])
  useEffect(() => {
    if (linkStatus === 'connected') setQrOpen(false)
  }, [linkStatus])

  // Volumes do mixer
  useEffect(() => {
    if (!mixer) return
    mixer.setVolume('game', settings.gameVol, settings.gameMute)
    mixer.setVolume('voice', settings.voiceVol, settings.voiceMute)
    mixer.setMonitorVolume(settings.monitorVol)
  }, [mixer, settings.gameVol, settings.gameMute, settings.voiceVol, settings.voiceMute, settings.monitorVol])

  // Janela de retorno: avisa se foi fechada
  useEffect(() => {
    if (!mixer) return
    const id = window.setInterval(() => setMonitorOpen(mixer.monitorOpen), 1000)
    return () => window.clearInterval(id)
  }, [mixer])

  // Mantém o iPhone (controle remoto) sabendo a cena, o ajuste da imagem e se está gravando.
  useEffect(() => {
    if (linkStatus !== 'connected') return
    sendCtl({ t: 'state', scene: settings.scene, recording: Boolean(recording), startedAt: recording?.startedAt ?? null, screen: screenMode, mirror: settings.mirror, rotate: settings.rotate })
  }, [linkStatus, sendCtl, settings.scene, settings.mirror, settings.rotate, recording, screenMode])

  // Pasta lembrada
  useEffect(() => {
    if (!supported) return
    void savedFolder().then(async (dir) => {
      if (!dir) return
      const granted = (await (dir as FileSystemDirectoryHandle & { queryPermission(d: { mode: 'readwrite' }): Promise<PermissionState> }).queryPermission({ mode: 'readwrite' })) === 'granted'
      setFolder({ dir, granted })
    })
  }, [supported])

  const chooseFolder = async () => {
    try {
      if (folder && !folder.granted) {
        const granted = await ensureWritable(folder.dir)
        if (granted) return setFolder({ dir: folder.dir, granted })
      }
      const dir = await pickFolder()
      setFolder({ dir, granted: await ensureWritable(dir) })
    } catch {
      /* cancelou */
    }
  }

  const openMonitor = (m: StudioMixer | null = mixer) => {
    if (!m) return
    const ok = m.openMonitor(t('studio.monitorTitle'), t('studio.monitorText'))
    setMonitorOpen(ok)
    if (!ok) setNotice({ tone: 'warn', text: t('studio.monitorBlocked') })
  }

  const enableCapture = async () => {
    if (!stageRef.current) return
    // O mixer nasce no clique (o navegador só libera áudio depois de um gesto).
    const m = mixer ?? new StudioMixer()
    if (!mixer) {
      m.setStream('voice', camStream)
      setMixer(m)
    }
    void m.resume()
    try {
      const stream = await captureStage(stageRef.current, settings.fps)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setCapture(null)
        m.setStream('game', null)
        stopRec()
      })
      m.setStream('game', stream)
      setCapture(stream)
      setNotice(null)
      openMonitor(m)
    } catch (e) {
      setNotice({ tone: 'warn', text: e instanceof Error && e.message === 'not-this-tab' ? t('studio.notThisTab') : t('studio.captureDenied') })
    }
  }

  const pickScreen = async () => {
    try {
      const stream = await captureScreen(settings.fps)
      stream.getVideoTracks()[0].addEventListener('ended', () => setScreen(null))
      screen?.getTracks().forEach((tr) => tr.stop())
      setScreen(stream)
    } catch {
      /* cancelou */
    }
  }

  // Encerra tudo ao sair do estúdio
  const live = useRef({ capture, screen, mixer })
  live.current = { capture, screen, mixer }
  useEffect(
    () => () => {
      const take = takeRef.current
      if (take && take.recorder.state !== 'inactive') take.recorder.stop()
      live.current.capture?.getTracks().forEach((tr) => tr.stop())
      live.current.screen?.getTracks().forEach((tr) => tr.stop())
      live.current.mixer?.close()
    },
    [],
  )
  useEffect(() => {
    if (game || !screen) return
    return () => screen.getTracks().forEach((tr) => tr.stop())
  }, [game, screen])

  // Cronômetro, tamanhos e proteção contra fechar a aba no meio
  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => {
      setStats({ now: Date.now(), video: takeRef.current?.video.written ?? 0, voice: takeRef.current?.voice?.written ?? 0 })
    }, 1000)
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    let lock: { release(): Promise<void> } | null = null
    void (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => {})
    return () => {
      window.clearInterval(id)
      window.removeEventListener('beforeunload', onBeforeUnload)
      void lock?.release()
    }
  }, [recording])

  // Atalhos ⌘1, ⌘2, ⌘3 (Ctrl no Windows) trocam de cena. Com o foco dentro do jogo, quem
  // recebe a tecla é o jogo: a trava ATHG / o SDK do jogo repassam o atalho por postMessage.
  useEffect(() => {
    const go = (key: string) => {
      const i = ['1', '2', '3'].indexOf(key)
      if (i >= 0) update({ scene: STUDIO_SCENES[i] })
      return i >= 0
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && go(e.key)) e.preventDefault()
    }
    const gameOrigin = gameUrl ? originOf(gameUrl) : null
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; key?: string } | null
      if (data?.type === 'ATHG_STUDIO_KEY' && typeof data.key === 'string' && e.origin === gameOrigin) go(data.key)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('message', onMessage)
    }
  }, [update, gameUrl])

  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggleFullscreen = () => (document.fullscreenElement ? void document.exitFullscreen() : void rootRef.current?.requestFullscreen().catch(() => {}))

  // ---------- Arrastar e redimensionar o rosto ----------
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (settings.scene !== 'game-face') return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, x: settings.x, y: settings.y }
    setDragging(true)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const stage = stageRef.current?.getBoundingClientRect()
    if (!d || !stage) return
    update({ x: d.x + (e.clientX - d.px) / stage.width, y: d.y + (e.clientY - d.py) / stage.height })
  }
  const onPointerUp = () => {
    drag.current = null
    setDragging(false)
  }

  const s = settings
  const camAspect = s.scene === 'face' ? 16 / 9 : s.shape === 'wide' ? 16 / 9 : 1
  const camStyle: CSSProperties =
    s.scene === 'face'
      ? { left: 0, top: 0, width: '100%', height: '100%', borderRadius: 0 }
      : {
          left: `${s.x * 100}%`,
          top: `${s.y * 100}%`,
          width: `${s.w * 100}%`,
          height: `${heightOf(s.w, s.shape) * 100}%`,
          borderRadius: s.shape === 'circle' ? '9999px' : '14px',
          opacity: s.scene === 'game' ? 0 : 1,
          pointerEvents: s.scene === 'game' ? 'none' : undefined,
        }

  const camUrl = `${window.location.origin}/cam/${link.room}`
  const qrSvg = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(camUrl)
    qr.make()
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true })
  }, [camUrl])

  const ready = Boolean(folder?.granted && capture && (!screenMode || screen))
  const elapsed = recording ? stats.now - recording.startedAt : 0
  const phoneConnected = linkStatus === 'connected' || (linkStatus === 'connecting' && Boolean(camStream))
  const sceneLabel = (scene: StudioScene) => t(screenMode ? `studio.screenScenes.${scene}` : `studio.scenes.${scene}`)
  const stageWidth = recording?.stageWidth
    ? `${recording.stageWidth}px`
    : fullscreen
      ? 'min(100vw, 100dvh * 16 / 9)'
      : 'min(100%, calc((100dvh - 48px - 64px - 16px) * 16 / 9))'

  const recButton = (compact = false) => (
    <button
      type="button"
      onClick={toggleRec}
      disabled={!ready && !recording}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-lg font-bold transition-colors disabled:opacity-40',
        compact ? 'h-9 px-3 text-xs' : 'h-11 px-5 text-sm',
        recording ? 'bg-white/[0.12] text-fg hover:bg-white/[0.18]' : 'bg-danger text-white hover:brightness-110',
      )}
    >
      {recording ? <Square size={compact ? 13 : 16} className="fill-current" aria-hidden /> : <Circle size={compact ? 13 : 16} className="fill-current" aria-hidden />}
      {recording ? formatDuration(elapsed) : t('studio.record')}
    </button>
  )

  return (
    <div ref={rootRef} className="relative flex h-dvh flex-col overflow-hidden bg-black text-fg">
      {/* Preparação */}
      {!fullscreen && (
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-bg px-3">
          <Link to={game ? `/game/${game.slug}` : '/'} className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-white/[0.06] hover:text-fg" aria-label={t('studio.back')}>
            <ArrowLeft size={18} aria-hidden />
          </Link>
          <Video size={16} className="shrink-0 text-danger" aria-hidden />
          <span className="shrink-0 text-sm font-semibold">{t('studio.title')}</span>
          <select
            value={game?.slug ?? SCREEN_SLUG}
            disabled={Boolean(recording)}
            onChange={(e) => navigate(`/estudio/${e.target.value}`)}
            aria-label={t('studio.source')}
            className="h-8 min-w-0 max-w-52 rounded-md border border-line bg-white/[0.06] px-2 text-xs font-semibold disabled:opacity-50"
          >
            <option value={SCREEN_SLUG}>{t('studio.screen')}</option>
            {games.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.title}
              </option>
            ))}
          </select>
          <div className="ml-auto flex min-w-0 items-center gap-1.5">
            <SetupButton done={Boolean(folder?.granted)} icon={FolderOpen} onClick={() => void chooseFolder()} disabled={!supported || Boolean(recording)}>
              {folder ? (folder.granted ? folder.dir.name || t('studio.folderChosen') : t('studio.allowFolder', { name: folder.dir.name })) : t('studio.chooseFolder')}
            </SetupButton>
            <SetupButton done={phoneConnected} icon={Smartphone} onClick={() => setQrOpen(true)}>
              {phoneConnected ? t('studio.phoneConnected') : t('studio.connectPhone')}
            </SetupButton>
            {screenMode && (
              <SetupButton done={Boolean(screen)} icon={ScreenShare} onClick={() => void pickScreen()} disabled={!supported || Boolean(recording)}>
                {screen ? t('studio.screenOn') : t('studio.pickScreen')}
              </SetupButton>
            )}
            <SetupButton done={Boolean(capture)} icon={MonitorUp} onClick={() => void enableCapture()} disabled={!supported || Boolean(capture)}>
              {capture ? t('studio.captureOn') : t('studio.enableCapture')}
            </SetupButton>
            <select
              value={s.fps}
              disabled={Boolean(capture)}
              onChange={(e) => update({ fps: Number(e.target.value) as StudioFps })}
              aria-label={t('studio.quality')}
              className="h-8 rounded-md border border-line bg-white/[0.06] px-2 text-xs font-semibold disabled:opacity-50"
            >
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
            <button
              type="button"
              onClick={toggleFullscreen}
              disabled={Boolean(recording)}
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-white/[0.06] hover:text-fg disabled:opacity-40"
              aria-label={t('player.fullscreen')}
              title={t('player.fullscreen')}
            >
              <Maximize size={16} aria-hidden />
            </button>
          </div>
        </header>
      )}

      {/* Palco: exatamente o que é gravado */}
      <div className={cn('flex min-h-0 flex-1 items-center justify-center', !fullscreen && 'p-2')}>
        <div ref={stageRef} className="relative isolate aspect-video overflow-hidden bg-black" style={{ width: stageWidth }}>
          {game ? (
            <GameFrame slug={game.slug} gameUrl={gameUrl} title={t('player.gameArea', { title: game.title })} />
          ) : (
            <ScreenFrame stream={screen} onPick={() => void pickScreen()} label={t('studio.pickScreen')} />
          )}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(e) => s.scene === 'game-face' && update({ w: s.w - e.deltaY * 0.0006 })}
            style={camStyle}
            className={cn(
              'absolute z-10 touch-none overflow-hidden bg-[#0b1220] shadow-[0_10px_30px_-8px_rgb(0_0_0/0.7)]',
              !dragging && 'transition-[left,top,width,height,border-radius,opacity] duration-300 ease-athg',
              s.scene === 'game-face' && 'cursor-grab active:cursor-grabbing',
            )}
          >
            <video
              ref={camVideoRef}
              autoPlay
              playsInline
              muted
              className={cn('absolute object-cover', !camStream && 'hidden')}
              style={rotatedVideoStyle(s.rotate, s.mirror, camAspect)}
            />
            {!camStream && (
              <div className="grid size-full place-items-center text-subtle">
                <Smartphone size={s.scene === 'face' ? 48 : 22} aria-hidden />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tela cheia: controles por cima do jogo (ficam fora da gravação) */}
      {fullscreen && hudOk && (
        <div className="absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/70 p-1.5 opacity-45 backdrop-blur transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100">
            {STUDIO_SCENES.map((scene, i) => (
              <button
                key={scene}
                type="button"
                onClick={() => update({ scene })}
                className={cn('h-9 rounded-md px-2.5 text-xs font-semibold', s.scene === scene ? 'bg-brand/30 text-fg' : 'text-muted hover:text-fg')}
              >
                <span className="mr-1 text-subtle">{i + 1}</span>
                {sceneLabel(scene)}
              </button>
            ))}
            <div className="flex w-24 flex-col gap-1 px-1" title={t('studio.mixer')}>
              {!screenMode && <Meter mixer={mixer} ch="game" />}
              <Meter mixer={mixer} ch="voice" />
            </div>
            <button type="button" onClick={() => setMixerOpen((o) => !o)} className={cn('grid size-9 place-items-center rounded-md', mixerOpen ? 'bg-white/[0.14] text-fg' : 'text-muted hover:text-fg')} aria-label={t('studio.mixer')}>
              <SlidersHorizontal size={16} aria-hidden />
            </button>
            {recButton(true)}
            <button type="button" onClick={toggleFullscreen} className="grid size-9 place-items-center rounded-md text-muted hover:text-fg" aria-label={t('player.exitFullscreen')}>
              <Minimize size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* Mixer */}
      {mixerOpen && (
        <div className={cn('absolute right-3 z-40 w-80 rounded-xl border border-line bg-bg/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur', fullscreen ? 'bottom-20' : 'bottom-[76px]')}>
          <p className="mb-3 text-sm font-semibold">{t('studio.mixer')}</p>
          {!screenMode && (
            <MixRow
              label={t('studio.mixGame')}
              mixer={mixer}
              ch="game"
              volume={s.gameVol}
              muted={s.gameMute}
              onVolume={(v) => update({ gameVol: v })}
              onMute={() => update({ gameMute: !s.gameMute })}
              empty={!capture ? t('studio.mixNoCapture') : undefined}
            />
          )}
          <MixRow
            label={t('studio.mixVoice')}
            mixer={mixer}
            ch="voice"
            volume={s.voiceVol}
            muted={s.voiceMute}
            onVolume={(v) => update({ voiceVol: v })}
            onMute={() => update({ voiceMute: !s.voiceMute })}
            empty={!camStream ? t('studio.mixNoPhone') : !mixer ? t('studio.mixNoCapture') : undefined}
          />
          <button
            type="button"
            disabled={noise === null || linkStatus !== 'connected'}
            onClick={() => sendCtl({ t: 'set-noise', on: !noise })}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-xs font-semibold disabled:opacity-40',
              noise ? 'border-brand/50 bg-brand/15' : 'border-line bg-white/[0.04]',
            )}
          >
            <span className="flex items-center gap-1.5">
              <AudioLines size={14} aria-hidden /> {t('studio.noise')}
            </span>
            <span className={noise ? 'text-cyan' : 'text-subtle'}>{noise === null ? '—' : noise ? t('studio.on') : t('studio.off')}</span>
          </button>
          <p className="mt-1.5 text-[11px] leading-snug text-subtle">{t('studio.voiceFileHint')}</p>
          <div className="mt-3 border-t border-line pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Headphones size={14} aria-hidden /> {t('studio.monitor')}
              </span>
              <button
                type="button"
                onClick={() => openMonitor()}
                disabled={!mixer}
                className={cn('rounded-md px-2 py-1 text-[11px] font-semibold disabled:opacity-40', monitorOpen ? 'bg-success/15 text-success' : 'bg-white/[0.08] text-fg hover:bg-white/[0.13]')}
              >
                {monitorOpen ? t('studio.monitorOn') : t('studio.monitorOpen')}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.01}
              value={s.monitorVol}
              onChange={(e) => update({ monitorVol: Number(e.target.value) })}
              aria-label={t('studio.monitorVolume')}
              className="mt-2 w-full accent-[var(--color-brand)]"
            />
            <p className="mt-1 text-[11px] leading-snug text-subtle">{t('studio.monitorHint')}</p>
          </div>
        </div>
      )}

      {/* Cenas, rosto e gravação */}
      {!fullscreen && (
        <footer className="flex h-16 shrink-0 items-center gap-3 border-t border-line bg-bg px-3">
          <div className="flex gap-1" role="group" aria-label={t('studio.scene')}>
            {STUDIO_SCENES.map((scene, i) => (
              <button
                key={scene}
                type="button"
                onClick={() => update({ scene })}
                className={cn(
                  'h-10 rounded-md border px-3 text-xs font-semibold transition-colors',
                  s.scene === scene ? 'border-brand bg-brand/20 text-fg' : 'border-line bg-white/[0.04] text-muted hover:text-fg',
                )}
              >
                <span className="mr-1.5 text-subtle">{i + 1}</span>
                {sceneLabel(scene)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 border-l border-line pl-3">
            {([['wide', RectangleHorizontal], ['square', SquareDashed], ['circle', Circle]] as const).map(([shape, Icon]) => (
              <IconToggle key={shape} active={s.shape === shape} label={t(`studio.shapes.${shape}`)} onClick={() => update({ shape })}>
                <Icon size={16} aria-hidden />
              </IconToggle>
            ))}
            <IconToggle active={s.mirror} label={t('studio.mirror')} onClick={() => update({ mirror: !s.mirror })}>
              <FlipHorizontal2 size={16} aria-hidden />
            </IconToggle>
            <IconToggle active={s.rotate !== 0} label={`${t('studio.rotate')} (${s.rotate}°)`} onClick={() => update({ rotate: ((s.rotate + 90) % 360) as CamRotation })}>
              <RotateCw size={16} aria-hidden />
            </IconToggle>
            <input
              type="range"
              min={0.1}
              max={maxWidthOf(s.shape)}
              step={0.01}
              value={s.w}
              onChange={(e) => update({ w: Number(e.target.value) })}
              aria-label={t('studio.camSize')}
              className="ml-1 w-20 accent-[var(--color-brand)]"
            />
          </div>

          <button
            type="button"
            onClick={() => setMixerOpen((o) => !o)}
            className={cn('flex h-10 items-center gap-2 rounded-md border px-2.5', mixerOpen ? 'border-brand bg-brand/15' : 'border-line bg-white/[0.04] hover:bg-white/[0.08]')}
            aria-label={t('studio.mixer')}
            title={t('studio.mixer')}
          >
            <SlidersHorizontal size={15} className="text-muted" aria-hidden />
            <span className="flex w-16 flex-col gap-1">
              {!screenMode && <Meter mixer={mixer} ch="game" />}
              <Meter mixer={mixer} ch="voice" />
            </span>
            {mixer && !monitorOpen && <Headphones size={14} className="text-gold" aria-label={t('studio.monitorClosed')} />}
          </button>

          <div className="ml-auto flex min-w-0 items-center gap-3">
            {notice && (
              <p className={cn('flex min-w-0 items-center gap-1.5 text-xs', notice.tone === 'warn' ? 'text-gold' : 'text-success')}>
                {notice.tone === 'warn' ? <TriangleAlert size={14} className="shrink-0" aria-hidden /> : <CircleCheck size={14} className="shrink-0" aria-hidden />}
                <span className="truncate">{notice.text}</span>
              </p>
            )}
            {!supported && <p className="text-xs text-gold">{t('studio.unsupported')}</p>}
            {recording && (
              <div className="text-right text-[11px] leading-tight text-subtle tabular-nums">
                {t('studio.sizes', { video: formatBytes(stats.video, locale), voice: formatBytes(stats.voice, locale) })}
              </div>
            )}
            {recButton()}
          </div>
        </footer>
      )}

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title={t('studio.qrTitle')} description={t('studio.qrText')} size="sm">
        <div className="mx-auto w-56 rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <p className="mt-3 text-center text-[11px] break-all text-muted select-all" data-cam-url>
          {camUrl}
        </p>
        <p className="mt-3 text-center text-xs text-subtle">
          {linkStatus === 'error' ? t('studio.linkError') : linkStatus === 'connecting' ? t('studio.cam.status.connecting') : t('studio.qrWaiting')}
        </p>
      </Modal>
    </div>
  )
}

function MixRow({
  label, mixer, ch, volume, muted, onVolume, onMute, empty,
}: { label: string; mixer: StudioMixer | null; ch: MixChannel; volume: number; muted: boolean; onVolume: (v: number) => void; onMute: () => void; empty?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-[11px] text-subtle tabular-nums">{muted ? '—' : `${Math.round(volume * 100)}%`}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <button type="button" onClick={onMute} className={cn('grid size-7 shrink-0 place-items-center rounded-md', muted ? 'bg-danger/20 text-danger' : 'text-muted hover:text-fg')} aria-label={label}>
          {muted ? <VolumeX size={14} aria-hidden /> : <Volume2 size={14} aria-hidden />}
        </button>
        <input type="range" min={0} max={2} step={0.01} value={volume} onChange={(e) => onVolume(Number(e.target.value))} aria-label={label} className="min-w-0 flex-1 accent-[var(--color-brand)]" />
      </div>
      <Meter mixer={mixer} ch={ch} className="mt-1.5" />
      {empty && <p className="mt-1 text-[11px] text-gold">{empty}</p>}
    </div>
  )
}

function IconToggle({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn('grid size-9 place-items-center rounded-md', active ? 'bg-white/[0.12] text-fg' : 'text-muted hover:text-fg')}
    >
      {children}
    </button>
  )
}

function SetupButton({ done, icon: Icon, children, onClick, disabled }: { done: boolean; icon: typeof Video; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 min-w-0 max-w-44 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors disabled:cursor-default',
        done ? 'border-success/30 bg-success/10 text-success' : 'border-line bg-white/[0.06] text-fg hover:bg-white/[0.1] disabled:opacity-50',
      )}
    >
      {done ? <CircleCheck size={14} className="shrink-0" aria-hidden /> : <Icon size={14} className="shrink-0" aria-hidden />}
      <span className="truncate">{children}</span>
    </button>
  )
}
