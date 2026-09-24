import { useEffect, useRef, type RefObject } from 'react'
import { createGameBridge, type GameBridge } from '@/services/gameBridge'
import { adService } from '@/services/ads'
import { saveService } from '@/services/saveService'
import { achievementService } from '@/services/achievementService'
import { rankingService } from '@/services/rankingService'
import { analytics } from '@/services/analytics'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/useTranslation'
import { BRIDGE_VERSION, type PortalMessage } from '@/types/bridge'

const initMessage = (game: string, locale: string): PortalMessage => ({
  type: 'PORTAL_INIT',
  payload: {
    game,
    locale,
    bridgeVersion: BRIDGE_VERSION,
    features: { ads: adService.enabled, cloudSave: false, achievements: true, leaderboards: true },
  },
})

/**
 * Conecta o iframe do jogo ao portal via postMessage.
 * Retorna `onFrameLoad` para ser chamado no onLoad do iframe.
 * `frameKey` muda quando o iframe é recriado (retry), religando a bridge.
 */
export function useGameBridge(iframeRef: RefObject<HTMLIFrameElement | null>, slug: string, gameUrl: string, frameKey: number) {
  const bridgeRef = useRef<GameBridge | null>(null)
  const { toast } = useToast()
  const { t, locale } = useTranslation()

  // Mantém as dependências de UI atualizadas sem recriar a bridge.
  const ui = useRef({ toast, t, locale })
  ui.current = { toast, t, locale }

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const sendInit = () => bridge.send(initMessage(slug, ui.current.locale))

    const bridge = createGameBridge(iframe, gameUrl, {
      GAME_READY: () => sendInit(),
      GAME_STARTED: () => analytics.track('game_event', { game: slug, event: 'started' }),
      GAME_OVER: (m) => {
        analytics.track('game_event', { game: slug, event: 'game_over', score: m.payload?.score })
        if (typeof m.payload?.score === 'number') rankingService.submitScore(slug, m.payload.score)
      },
      SCORE_UPDATED: (m) => rankingService.submitScore(slug, m.payload.score),
      ACHIEVEMENT_UNLOCKED: (m) => {
        const unlocked = achievementService.unlockFromGame(slug, m.payload.id)
        if (unlocked) ui.current.toast(ui.current.t('achievements.unlockedToast', { name: unlocked.name }), { icon: 'trophy', duration: 4000 })
      },
      REQUEST_REWARDED_AD: async (m) => {
        const result = await adService.showRewarded()
        bridge.send({ type: 'REWARDED_AD_RESULT', requestId: m.requestId, payload: result })
      },
      SAVE_GAME: async (m) => {
        const result = await saveService.save(slug, m.payload.data, m.payload.slot)
        bridge.send({ type: 'SAVE_RESULT', requestId: m.requestId, payload: result })
      },
      LOAD_GAME: async (m) => {
        const data = await saveService.load(slug, m.payload?.slot)
        bridge.send({ type: 'LOAD_RESULT', requestId: m.requestId, payload: { data } })
      },
    })
    bridgeRef.current = bridge

    const onVisibility = () => bridge.send({ type: document.visibilityState === 'hidden' ? 'PAUSE' : 'RESUME' })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      bridge.destroy()
      bridgeRef.current = null
    }
  }, [iframeRef, slug, gameUrl, frameKey])

  /** Chame no onLoad do iframe: envia PORTAL_INIT para jogos que já estão escutando. */
  return function onFrameLoad() {
    bridgeRef.current?.send(initMessage(slug, ui.current.locale))
  }
}
