import { useEffect } from 'react'
import { library } from '@/services/library'
import { analytics } from '@/services/analytics'

const TICK_SECONDS = 15

/**
 * Registra a sessão no histórico ao abrir o player e acumula tempo ATIVO
 * (só conta com a aba visível). Alimenta "Continue jogando" e o perfil.
 */
export function usePlaySession(slug: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!slug || !enabled) return
    library.recordSessionStart(slug)
    analytics.track('game_started', { game: slug, source: 'portal' })

    const startedAt = Date.now()
    let pending = 0
    let lastTick = Date.now()

    const accumulate = () => {
      const now = Date.now()
      if (document.visibilityState === 'visible') pending += (now - lastTick) / 1000
      lastTick = now
    }
    const flush = () => {
      accumulate()
      if (pending >= 1) {
        library.addPlaytime(slug, pending)
        pending = 0
      }
    }

    const interval = window.setInterval(flush, TICK_SECONDS * 1000)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
      else lastTick = Date.now()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)

    return () => {
      flush()
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      analytics.track('game_closed', { game: slug, seconds: Math.round((Date.now() - startedAt) / 1000) })
    }
  }, [slug, enabled])
}
