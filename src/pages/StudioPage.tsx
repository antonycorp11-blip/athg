import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import qrcode from 'qrcode-generator'
import {
  ArrowLeft, Circle, CircleCheck, FlipHorizontal2, FolderOpen, Maximize, Minimize, MonitorUp, RectangleHorizontal, Smartphone, Square, SquareDashed, TriangleAlert, Video,
} from 'lucide-react'
import type { Game } from '@/types/game'
import { STUDIO_SCENES, type CamToStudio, type StudioScene } from '@/types/studio'
import { gamesService, isPlayable } from '@/services/gamesService'
import { storage } from '@/services/storage'
import { captureStage, captureSupported, pickVideoMime, QUALITY, type StudioFps } from '@/services/studio/capture'
import { createDiskFile, diskSupported, ensureWritable, extensionFor, pickFolder, savedFolder, takeName, type DiskFile } from '@/services/studio/disk'
import { useAccount, useAuthStatus, useIsAdmin } from '@/hooks/useIsAdmin'
import { useGameBridge } from '@/hooks/useGameBridge'
import { usePlaySession } from '@/hooks/usePlaySession'
import { useSeo } from '@/hooks/useSeo'
import { useStudioLink, type VoiceEvent } from '@/hooks/useStudioLink'
import { useTranslation } from '@/i18n/useTranslation'
import { originOf } from '@/services/gameBridge'
import { resolveGameUrl } from '@/utils/gameUrl'
import { formatBytes, formatDuration } from '@/utils/format'
import { GameNotFound } from '@/components/games/GameNotFound'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'

const SANDBOX = 'allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads'

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
  fps: StudioFps
}
const DEFAULTS: StudioSettings = { scene: 'game-face', x: 0.74, y: 0.66, w: 0.24, shape: 'wide', mirror: true, fps: 30 }
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
  const game = gamesService.getBySlug(slug)
  const isAdmin = useIsAdmin()
  const authStatus = useAuthStatus()
  const account = useAccount()
  const { t } = useTranslation()
  useSeo(game ? { title: t('studio.seoTitle', { title: game.title }), description: game.shortDescription, path: `/game/${game.slug}`, noindex: true } : null)

  // A flag de admin chega depois do login/sync: espera um pouco antes de mandar embora.
  const [waitOver, setWaitOver] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setWaitOver(true), 5000)
    return () => clearTimeout(timer)
  }, [])
  // Teste local sem conta admin (só no `npm run dev`).
  const devBypass = import.meta.env.DEV && params.has('devstudio')
  const allowed = devBypass || isAdmin

  if (!game) return <GameNotFound />
  if (!allowed && (account === 'checking' || (!waitOver && authStatus !== 'unavailable')))
    return <div className="grid min-h-dvh place-items-center bg-bg text-sm text-muted">{t('studio.checking')}</div>
  if (!allowed || !isPlayable(game, true) || !game.gameUrl) return <Navigate to={`/game/${game.slug}`} replace />
  return <Studio game={game} />
}

/** Iframe do jogo isolado do resto: trocar de cena nunca recarrega o jogo. */
const GameFrame = memo(function GameFrame({ slug, gameUrl, title }: { slug: string; gameUrl: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const onLoad = useGameBridge(iframeRef, slug, gameUrl, 0)
  const crossOrigin = originOf(gameUrl) !== window.location.origin
  return (
    <iframe
      ref={iframeRef}
      src={gameUrl}
      title={title}
      onLoad={onLoad}
      allow="autoplay; fullscreen; gamepad; clipboard-write; accelerometer; gyroscope; screen-wake-lock"
      sandbox={crossOrigin ? SANDBOX : undefined}
      referrerPolicy="strict-origin-when-cross-origin"
      className="absolute inset-0 size-full border-0"
    />
  )
})

interface Take {
  base: string
  dir: FileSystemDirectoryHandle
  recorder: MediaRecorder
  video: DiskFile
  startedAt: number
  voiceParts: number
}

function Studio({ game }: { game: Game }) {
  const { t, locale } = useTranslation()
  usePlaySession(game.slug, true)
  const gameUrl = resolveGameUrl(game)
  const supported = captureSupported() && diskSupported()

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
  const [qrOpen, setQrOpen] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'warn' | 'ok'; text: string } | null>(null)
  const [recording, setRecording] = useState<{ startedAt: number; stageWidth: number } | null>(null)
  const [stats, setStats] = useState({ now: Date.now(), video: 0, voice: 0 })
  const [dragging, setDragging] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const takeRef = useRef<Take | null>(null)
  const voiceRef = useRef<Promise<DiskFile | null> | null>(null)
  const voiceFileRef = useRef<DiskFile | null>(null)
  const voiceWrittenRef = useRef(0)

  // ---------- Voz (chega do iPhone em pedaços de 1 s) ----------
  const closeVoice = useCallback(() => {
    const pending = voiceRef.current
    voiceRef.current = null
    void pending?.then((f) => {
      if (!f) return
      voiceWrittenRef.current += f.written
      if (voiceFileRef.current === f) voiceFileRef.current = null
      return f.close()
    })
  }, [])

  const onVoice = useCallback(
    (e: VoiceEvent) => {
      const take = takeRef.current
      if (e.kind === 'start') {
        if (!take) return
        closeVoice()
        take.voiceParts += 1
        const name = `${take.base} - voz${take.voiceParts > 1 ? ` (${take.voiceParts})` : ''}.${extensionFor(e.mime)}`
        voiceRef.current = createDiskFile(take.dir, name).then(
          (f) => (voiceFileRef.current = f),
          () => null,
        )
      } else if (e.kind === 'data') {
        void voiceRef.current?.then((f) => f?.write(e.data))
      } else closeVoice()
    },
    [closeVoice],
  )

  // ---------- Gravação ----------
  const stopRec = useCallback(() => {
    const take = takeRef.current
    if (!take) return
    takeRef.current = null
    if (take.recorder.state !== 'inactive') take.recorder.stop()
    link.sendCtl({ t: 'rec-stop' })
    setRecording(null)
    // O iPhone avisa quando a voz terminou; se não avisar (caiu), fecha assim mesmo.
    setTimeout(closeVoice, 8000)
    setNotice({ tone: 'ok', text: t('studio.saved', { name: take.base }) })
  }, [closeVoice, t])

  const startRec = useCallback(async () => {
    if (takeRef.current) return
    if (!folder?.granted) return setNotice({ tone: 'warn', text: t('studio.needFolder') })
    if (!capture) return setNotice({ tone: 'warn', text: t('studio.needCapture') })
    const mimeType = pickVideoMime()
    const base = takeName(game.slug)
    try {
      const video = await createDiskFile(folder.dir, `${base} - video.${extensionFor(mimeType)}`)
      const recorder = new MediaRecorder(capture, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: QUALITY[settings.fps].videoBitsPerSecond,
        audioBitsPerSecond: 192_000,
      })
      recorder.ondataavailable = (e) => video.write(e.data)
      recorder.onstop = () => void video.close()
      recorder.onerror = () => setNotice({ tone: 'warn', text: t('studio.recError') })
      const startedAt = Date.now()
      takeRef.current = { base, dir: folder.dir, recorder, video, startedAt, voiceParts: 0 }
      voiceWrittenRef.current = 0
      recorder.start(1000)
      link.sendCtl({ t: 'rec-start' })
      setRecording({ startedAt, stageWidth: stageRef.current?.getBoundingClientRect().width ?? 0 })
      setNotice(capture.getAudioTracks().length ? null : { tone: 'warn', text: t('studio.noGameAudio') })
    } catch {
      setNotice({ tone: 'warn', text: t('studio.recError') })
    }
  }, [folder, capture, game.slug, settings.fps, t])

  const toggleRec = () => (takeRef.current ? stopRec() : void startRec())

  const onCtl = (m: CamToStudio) => {
    if (m.t === 'scene') update({ scene: m.scene })
    if (m.t === 'rec-toggle') toggleRec()
    if (m.t === 'voice-error') setNotice({ tone: 'warn', text: t('studio.voiceError') })
  }

  const link = useStudioLink({ onCtl, onVoice })

  // Rosto ao vivo
  useEffect(() => {
    if (camVideoRef.current) camVideoRef.current.srcObject = link.camStream
  }, [link.camStream])
  useEffect(() => {
    if (link.status === 'connected') setQrOpen(false)
  }, [link.status])

  // Mantém o iPhone (controle remoto) sabendo a cena e se está gravando.
  const { status: linkStatus, sendCtl } = link
  useEffect(() => {
    if (linkStatus !== 'connected') return
    sendCtl({ t: 'state', scene: settings.scene, recording: Boolean(recording), startedAt: recording?.startedAt ?? null })
    // iPhone (re)conectou no meio de uma tomada: volta a gravar a voz.
    if (takeRef.current && !voiceRef.current) sendCtl({ t: 'rec-start' })
  }, [linkStatus, sendCtl, settings.scene, recording])

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

  const enableCapture = async () => {
    if (!stageRef.current) return
    try {
      const stream = await captureStage(stageRef.current, settings.fps)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setCapture(null)
        stopRec()
      })
      setCapture(stream)
      setNotice(null)
    } catch (e) {
      setNotice({ tone: 'warn', text: e instanceof Error && e.message === 'not-this-tab' ? t('studio.notThisTab') : t('studio.captureDenied') })
    }
  }

  // Encerra tudo ao sair
  const captureRef = useRef(capture)
  captureRef.current = capture
  useEffect(
    () => () => {
      const take = takeRef.current
      if (take && take.recorder.state !== 'inactive') take.recorder.stop()
      captureRef.current?.getTracks().forEach((tr) => tr.stop())
    },
    [],
  )

  // Cronômetro, tamanhos e proteção contra fechar a aba no meio
  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => {
      setStats({ now: Date.now(), video: takeRef.current?.video.written ?? 0, voice: voiceWrittenRef.current + (voiceFileRef.current?.written ?? 0) })
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

  // Atalhos (quando o foco está fora do jogo): 1, 2, 3 trocam de cena.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey) return
      const i = ['1', '2', '3'].indexOf(e.key)
      if (i >= 0) update({ scene: STUDIO_SCENES[i] })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [update])

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggleFullscreen = () => (document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen().catch(() => {}))

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

  const ready = Boolean(folder?.granted && capture)
  const elapsed = recording ? stats.now - recording.startedAt : 0
  const phoneConnected = link.status === 'connected' || (link.status === 'connecting' && Boolean(link.camStream))

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-black text-fg">
      {/* Preparação */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-bg px-3">
        <Link to={`/game/${game.slug}`} className="grid size-9 place-items-center rounded-md text-muted hover:bg-white/[0.06] hover:text-fg" aria-label={t('studio.back')}>
          <ArrowLeft size={18} aria-hidden />
        </Link>
        <Video size={16} className="text-danger" aria-hidden />
        <span className="truncate text-sm font-semibold">
          {t('studio.title')} <span className="text-muted">· {game.title}</span>
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <SetupButton done={Boolean(folder?.granted)} icon={FolderOpen} onClick={() => void chooseFolder()} disabled={!supported || Boolean(recording)}>
            {folder ? (folder.granted ? folder.dir.name || t('studio.folderChosen') : t('studio.allowFolder', { name: folder.dir.name })) : t('studio.chooseFolder')}
          </SetupButton>
          <SetupButton done={phoneConnected} icon={Smartphone} onClick={() => setQrOpen(true)}>
            {phoneConnected ? t('studio.phoneConnected') : t('studio.connectPhone')}
          </SetupButton>
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
          <button type="button" onClick={toggleFullscreen} className="grid size-8 place-items-center rounded-md text-muted hover:bg-white/[0.06] hover:text-fg" aria-label={t('player.fullscreen')}>
            {fullscreen ? <Minimize size={16} aria-hidden /> : <Maximize size={16} aria-hidden />}
          </button>
        </div>
      </header>

      {/* Palco: exatamente o que é gravado */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        <div
          ref={stageRef}
          className="relative isolate aspect-video overflow-hidden bg-black"
          // Durante a tomada o palco fica com tamanho fixo: o arquivo MP4 não aceita mudar de resolução.
          style={{ width: recording?.stageWidth ? `${recording.stageWidth}px` : 'min(100%, calc((100dvh - 48px - 64px - 16px) * 16 / 9))' }}
        >
          <GameFrame slug={game.slug} gameUrl={gameUrl} title={t('player.gameArea', { title: game.title })} />
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
            <video ref={camVideoRef} autoPlay playsInline muted className={cn('size-full object-cover', s.mirror && '-scale-x-100', !link.camStream && 'hidden')} />
            {!link.camStream && (
              <div className="grid size-full place-items-center text-subtle">
                <Smartphone size={s.scene === 'face' ? 48 : 22} aria-hidden />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cenas, rosto e gravação */}
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
              {t(`studio.scenes.${scene}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 border-l border-line pl-3">
          {([['wide', RectangleHorizontal], ['square', SquareDashed], ['circle', Circle]] as const).map(([shape, Icon]) => (
            <button
              key={shape}
              type="button"
              onClick={() => update({ shape })}
              aria-label={t(`studio.shapes.${shape}`)}
              title={t(`studio.shapes.${shape}`)}
              className={cn('grid size-9 place-items-center rounded-md', s.shape === shape ? 'bg-white/[0.12] text-fg' : 'text-muted hover:text-fg')}
            >
              <Icon size={16} aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={() => update({ mirror: !s.mirror })}
            aria-label={t('studio.mirror')}
            title={t('studio.mirror')}
            className={cn('grid size-9 place-items-center rounded-md', s.mirror ? 'bg-white/[0.12] text-fg' : 'text-muted hover:text-fg')}
          >
            <FlipHorizontal2 size={16} aria-hidden />
          </button>
          <input
            type="range"
            min={0.1}
            max={maxWidthOf(s.shape)}
            step={0.01}
            value={s.w}
            onChange={(e) => update({ w: Number(e.target.value) })}
            aria-label={t('studio.camSize')}
            className="ml-1 w-24 accent-[var(--color-brand)]"
          />
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-3">
          {notice && (
            <p className={cn('flex min-w-0 items-center gap-1.5 text-xs', notice.tone === 'warn' ? 'text-gold' : 'text-success')}>
              {notice.tone === 'warn' ? <TriangleAlert size={14} className="shrink-0" aria-hidden /> : <CircleCheck size={14} className="shrink-0" aria-hidden />}
              <span className="truncate">{notice.text}</span>
            </p>
          )}
          {!supported && <p className="text-xs text-gold">{t('studio.unsupported')}</p>}
          {recording && (
            <div className="text-right text-xs leading-tight tabular-nums">
              <div className="font-bold text-fg">{formatDuration(elapsed)}</div>
              <div className="text-subtle">
                {t('studio.sizes', { video: formatBytes(stats.video, locale), voice: formatBytes(stats.voice, locale) })}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={toggleRec}
            disabled={!ready && !recording}
            className={cn(
              'flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-bold transition-colors disabled:opacity-40',
              recording ? 'bg-white/[0.1] text-fg hover:bg-white/[0.15]' : 'bg-danger text-white hover:brightness-110',
            )}
          >
            {recording ? <Square size={16} className="fill-current" aria-hidden /> : <Circle size={16} className="fill-current" aria-hidden />}
            {recording ? t('studio.stop') : t('studio.record')}
          </button>
        </div>
      </footer>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title={t('studio.qrTitle')} description={t('studio.qrText')} size="sm">
        <div className="mx-auto w-56 rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <p className="mt-3 text-center text-[11px] break-all text-muted select-all" data-cam-url>
          {camUrl}
        </p>
        <p className="mt-3 text-center text-xs text-subtle">
          {link.status === 'error' ? t('studio.linkError') : link.status === 'connecting' ? t('studio.cam.status.connecting') : t('studio.qrWaiting')}
        </p>
      </Modal>
    </div>
  )
}

function SetupButton({ done, icon: Icon, children, onClick, disabled }: { done: boolean; icon: typeof Video; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 max-w-48 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors disabled:cursor-default',
        done ? 'border-success/30 bg-success/10 text-success' : 'border-line bg-white/[0.06] text-fg hover:bg-white/[0.1] disabled:opacity-50',
      )}
    >
      {done ? <CircleCheck size={14} className="shrink-0" aria-hidden /> : <Icon size={14} className="shrink-0" aria-hidden />}
      <span className="truncate">{children}</span>
    </button>
  )
}
