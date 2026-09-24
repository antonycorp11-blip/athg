import { useEffect } from 'react'
import { library } from '@/services/library'
import { analytics } from '@/services/analytics'
import { remote } from '@/services/backend/remote'

const TICK_SECONDS = 15

/**
 * Registra a sessão ao abrir o player e acumula tempo ATIVO (aba visível).
 * Local: alimenta "Continue jogando" e o perfil na hora.
 * Nuvem: abre uma sessão no banco e envia batimentos a cada 15 s — o servidor
 * confere o tempo real decorrido, então não dá para inflar horas.
 */
export function usePlaySession(slug: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!slug || !enabled) return
    library.recordSessionStart(slug)
    analytics.track('game_started', { game: slug, source: 'portal' })

    const startedAt = Date.now()
    let pendingLocal = 0
    let pendingRemote = 0
    let lastTick = Date.now()
    let sessionId: string | null = null
    let closed = false

    void remote.startSession(slug).then((id) => {
      if (closed && id) void remote.heartbeat(id, pendingRemote)
      sessionId = id
    })

    const accumulate = () => {
      const now = Date.now()
      if (document.visibilityState === 'visible') {
        const delta = (now - lastTick) / 1000
        pendingLocal += delta
        pendingRemote += delta
      }
      lastTick = now
    }
    const flush = () => {
      accumulate()
      if (pendingLocal >= 1) {
        library.addPlaytime(slug, pendingLocal)
        pendingLocal = 0
      }
      if (sessionId && pendingRemote >= 1) {
        void remote.heartbeat(sessionId, pendingRemote)
        pendingRemote = 0
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
      closed = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      analytics.track('game_closed', { game: slug, seconds: Math.round((Date.now() - startedAt) / 1000) })
    }
  }, [slug, enabled])
}
