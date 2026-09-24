// Biblioteca do jogador (favoritos + histórico + tempo jogado).
// Cache local lido pela UI; favoritos vão para a nuvem na hora e o resto é
// alinhado pelo services/backend/sync ao entrar.
import { createPersistentStore } from './persistentStore'
import { analytics } from './analytics'
import { remote } from './backend/remote'

export interface FavoriteEntry {
  slug: string
  addedAt: number
}

export interface HistoryEntry {
  slug: string
  firstPlayedAt: number
  lastPlayedAt: number
  sessions: number
  /** Tempo ativo acumulado (aba visível) em segundos. */
  secondsPlayed: number
}

const HISTORY_LIMIT = 50

export const favoritesStore = createPersistentStore<FavoriteEntry[]>('favorites', [])
export const historyStore = createPersistentStore<HistoryEntry[]>('history', [])

export const library = {
  isFavorite: (slug: string) => favoritesStore.get().some((f) => f.slug === slug),

  /** Retorna true se o jogo passou a ser favorito. */
  toggleFavorite(slug: string): boolean {
    const exists = library.isFavorite(slug)
    favoritesStore.set((prev) =>
      exists ? prev.filter((f) => f.slug !== slug) : [{ slug, addedAt: Date.now() }, ...prev],
    )
    analytics.track(exists ? 'favorite_removed' : 'favorite_added', { game: slug })
    void remote.setFavorite(slug, !exists)
    return !exists
  },

  recordSessionStart(slug: string) {
    const now = Date.now()
    historyStore.set((prev) => {
      const current = prev.find((h) => h.slug === slug)
      const entry: HistoryEntry = current
        ? { ...current, lastPlayedAt: now, sessions: current.sessions + 1 }
        : { slug, firstPlayedAt: now, lastPlayedAt: now, sessions: 1, secondsPlayed: 0 }
      return [entry, ...prev.filter((h) => h.slug !== slug)].slice(0, HISTORY_LIMIT)
    })
  },

  addPlaytime(slug: string, seconds: number) {
    if (seconds <= 0) return
    historyStore.set((prev) =>
      prev.map((h) => (h.slug === slug ? { ...h, secondsPlayed: h.secondsPlayed + Math.round(seconds) } : h)),
    )
  },
}
