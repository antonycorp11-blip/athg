import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Maximize, Minimize, X, RotateCw, Monitor, RefreshCw, TriangleAlert } from 'lucide-react'
import type { Orientation } from '@/types/game'
import { useTranslation } from '@/i18n/useTranslation'
import { useIsPortrait, useIsTouch } from '@/hooks/useMediaQuery'
import { useGameBridge } from '@/hooks/useGameBridge'
import { originOf } from '@/services/gameBridge'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export interface GamePlayerProps {
  /** Identificador do jogo (usado pela bridge: saves, conquistas, scores). */
  slug: string
  gameUrl: string
  title: string
  orientation: Orientation
  supportsMobile: boolean
  /** Ex: "16/9". Padrão definido pela orientação. */
  aspectRatio?: string
  /** Arte exibida durante o carregamento. */
  poster?: ReactNode
  /** Conteúdo à esquerda da barra (título etc.). */
  toolbarStart?: ReactNode
  /** Ações extras da barra (favoritar, compartilhar, reportar). */
  toolbarActions?: ReactNode
}

const LOAD_TIMEOUT_MS = 20_000
const SANDBOX = 'allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads'

type ScreenOrientationLock = ScreenOrientation & { lock?: (o: 'landscape' | 'portrait') => Promise<void> }

function ratioOf(aspect: string | undefined, orientation: Orientation) {
  const [w, h] = (aspect ?? (orientation === 'portrait' ? '9/16' : '16/9')).split('/').map(Number)
  return w > 0 && h > 0 ? w / h : 16 / 9
}

/**
 * Player de jogos HTML5. Carrega a build num iframe isolado e cuida de:
 * tela cheia (nativa ou "pseudo" no iOS), orientação no mobile, loading,
 * timeout/retry e a ponte postMessage com o portal.
 */
export function GamePlayer({ slug, gameUrl, title, orientation, supportsMobile, aspectRatio, poster, toolbarStart, toolbarActions }: GamePlayerProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [frameKey, setFrameKey] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [nativeFs, setNativeFs] = useState(false)
  const [pseudoFs, setPseudoFs] = useState(false)
  const [gateDismissed, setGateDismissed] = useState(false)
  const [autoImmersiveOff, setAutoImmersiveOff] = useState(false)

  const isTouch = useIsTouch()
  const isPortrait = useIsPortrait()
  const onFrameLoad = useGameBridge(iframeRef, slug, gameUrl, frameKey)
  const crossOrigin = originOf(gameUrl) !== window.location.origin

  // Celular deitado = modo imersivo automático (header/nav somem).
  const autoImmersive = isTouch && !isPortrait && orientation !== 'portrait' && !autoImmersiveOff
  const immersive = nativeFs || pseudoFs || autoImmersive
  const pseudoImmersive = !nativeFs && (pseudoFs || autoImmersive)

  const gate: 'rotate' | 'desktop' | null = gateDismissed || immersive || !isTouch
    ? null
    : !supportsMobile
      ? 'desktop'
      : orientation === 'landscape' && isPortrait
        ? 'rotate'
        : null

  // Loading + timeout
  useEffect(() => {
    setLoaded(false)
    setTimedOut(false)
    const id = window.setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(id)
  }, [frameKey, gameUrl])

  // Estado da tela cheia nativa
  useEffect(() => {
    const onChange = () => setNativeFs(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Trava o scroll da página no modo imersivo "pseudo"
  useEffect(() => {
    if (!pseudoImmersive) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPseudoFs(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [pseudoImmersive])

  // Voltou para retrato: reativa o modo imersivo automático na próxima rotação
  useEffect(() => {
    if (isPortrait) setAutoImmersiveOff(false)
  }, [isPortrait])

  const enterFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (el?.requestFullscreen && document.fullscreenEnabled) {
      try {
        // Alguns webviews deixam a promise pendente para sempre: limite de espera.
        const granted = await Promise.race([
          el.requestFullscreen({ navigationUI: 'hide' }).then(() => true),
          new Promise<false>((resolve) => setTimeout(() => resolve(false), 1500)),
        ])
        if (granted) {
          if (orientation !== 'any') await (screen.orientation as ScreenOrientationLock | undefined)?.lock?.(orientation).catch(() => {})
          return
        }
      } catch {
        /* cai para o modo pseudo */
      }
    }
    setPseudoFs(true)
  }, [orientation])

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    setPseudoFs(false)
    if (autoImmersive) setAutoImmersiveOff(true)
  }, [autoImmersive])

  const toggleFullscreen = () => (immersive ? exitFullscreen() : void enterFullscreen())

  const ratio = ratioOf(aspectRatio, orientation)
  const fillMobile = isTouch && isPortrait && orientation !== 'landscape'

  // Dimensionamento: cabe na tela sem rolar (desktop) / ocupa a largura (mobile)
  const stageStyle: CSSProperties | undefined =
    immersive || fillMobile || gate
      ? undefined
      : { aspectRatio: String(ratio), width: `min(100%, calc((100dvh - var(--header-h) - 132px) * ${ratio}))` }

  return (
    <div className="-mx-4 md:mx-0">
      <div
        ref={containerRef}
        style={stageStyle}
        className={cn(
          'mx-auto overflow-hidden bg-black',
          pseudoImmersive ? 'fixed inset-0 z-[80] h-dvh w-screen' : 'relative',
          !immersive && 'md:rounded-xl md:shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)] md:ring-1 md:ring-line',
          !immersive && fillMobile && 'h-[calc(100dvh-var(--header-h)-var(--bottom-nav-h)-var(--safe-bottom)-60px)] w-full',
          !immersive && gate && 'h-[62dvh] w-full',
        )}
      >
        <iframe
          key={frameKey}
          ref={iframeRef}
          src={gameUrl}
          title={t('player.gameArea', { title })}
          onLoad={() => {
            setLoaded(true)
            onFrameLoad()
          }}
          allow="autoplay; fullscreen; gamepad; clipboard-write; accelerometer; gyroscope; screen-wake-lock"
          // Builds de outra origem rodam em sandbox. Builds self-hosted (mesma origem) são
          // da ATHG; jogos de terceiros devem ser servidos de um domínio separado.
          sandbox={crossOrigin ? SANDBOX : undefined}
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />

        {/* Carregando */}
        {!loaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-bg" role="status" aria-live="polite">
            {poster && <div className="absolute inset-0 scale-110 opacity-40 blur-2xl">{poster}</div>}
            <div className="relative flex flex-col items-center gap-4 px-6 text-center">
              {timedOut ? (
                <>
                  <TriangleAlert className="text-gold" size={28} aria-hidden />
                  <p className="text-sm font-semibold">{t('player.loadError')}</p>
                  <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => setFrameKey((k) => k + 1)}>
                    {t('player.retry')}
                  </Button>
                </>
              ) : (
                <>
                  <span className="size-10 animate-spin rounded-full border-[3px] border-white/15 border-t-brand" aria-hidden />
                  <p className="text-sm font-medium text-fg/90">{t('player.loading', { title })}</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Gate mobile: girar o celular / não otimizado para mobile */}
        {gate && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-bg/92 px-8 text-center backdrop-blur-md">
            {poster && <div className="absolute inset-0 -z-10 opacity-30 blur-xl">{poster}</div>}
            {gate === 'rotate' ? (
              <RotateCw size={40} className="animate-[spin_2.4s_ease-in-out_infinite] text-cyan" aria-hidden />
            ) : (
              <Monitor size={40} className="text-cyan" aria-hidden />
            )}
            <div>
              <p className="display-title text-xl">{gate === 'rotate' ? t('player.rotateTitle') : t('player.desktopOnlyTitle')}</p>
              <p className="mt-1 text-sm text-muted">{gate === 'rotate' ? t('player.rotateText', { title }) : t('player.desktopOnlyText')}</p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-2">
              {gate === 'rotate' && (
                <Button size="lg" icon={Maximize} onClick={() => void enterFullscreen()} fullWidth>
                  {t('player.fullscreen')}
                </Button>
              )}
              <Button size="lg" variant="secondary" onClick={() => setGateDismissed(true)} fullWidth>
                {gate === 'rotate' ? t('player.playAnyway') : t('player.tryAnyway')}
              </Button>
            </div>
          </div>
        )}

        {/* Saída do modo imersivo (pseudo) */}
        {pseudoImmersive && (
          <IconButton
            icon={X}
            label={t('player.exitFullscreen')}
            variant="glass"
            size="md"
            onClick={exitFullscreen}
            className="absolute top-[max(8px,env(safe-area-inset-top))] right-[max(8px,env(safe-area-inset-right))] z-30 rounded-full opacity-60 hover:opacity-100"
          />
        )}
      </div>

      {/* Barra discreta */}
      <div className="mx-auto flex items-center justify-between gap-3 px-4 py-2.5 md:px-0" style={stageStyle ? { width: stageStyle.width } : undefined}>
        <div className="min-w-0 flex-1">{toolbarStart}</div>
        <div className="flex shrink-0 items-center gap-0.5">
          {toolbarActions}
          <IconButton icon={immersive ? Minimize : Maximize} label={immersive ? t('player.exitFullscreen') : t('player.fullscreen')} onClick={toggleFullscreen} />
        </div>
      </div>
    </div>
  )
}
