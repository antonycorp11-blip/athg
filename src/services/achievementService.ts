import { achievements } from '@/data/achievements'
import type { Achievement, AchievementWithState } from '@/types/achievement'
import { createPersistentStore } from './persistentStore'
import { favoritesStore, historyStore, type FavoriteEntry, type HistoryEntry } from './library'
import { analytics } from './analytics'
import { remote } from './backend/remote'

/** id da conquista -> timestamp do desbloqueio (real, neste dispositivo). */
export const unlockedStore = createPersistentStore<Record<string, number>>('achievements', {})

type PlatformRule = (ctx: { history: HistoryEntry[]; favorites: FavoriteEntry[] }) => boolean
const platformRules: Record<string, PlatformRule> = {
  'athg-first-game': ({ history }) => history.length >= 1,
  'athg-explorer': ({ history }) => history.length >= 2,
  'athg-collector': ({ favorites }) => favorites.length >= 3,
  'athg-dedicated': ({ history }) => history.reduce((s, h) => s + h.secondsPlayed, 0) >= 3600,
}

export const achievementService = {
  catalog: (): Achievement[] => achievements,

  /** Estado de cada conquista para o jogador atual. */
  withState(unlocked: Record<string, number>): AchievementWithState[] {
    return achievements.map((a) => {
      const at = unlocked[a.id]
      return at ? { ...a, unlocked: true, unlockedAt: at, demo: false } : { ...a, unlocked: false, demo: false }
    })
  },

  /** Avalia conquistas da plataforma; retorna as recém-desbloqueadas. */
  evaluatePlatform(): Achievement[] {
    const ctx = { history: historyStore.get(), favorites: favoritesStore.get() }
    const current = unlockedStore.get()
    const fresh = achievements.filter((a) => a.scope === 'athg' && !current[a.id] && platformRules[a.id]?.(ctx))
    if (fresh.length) {
      const now = Date.now()
      unlockedStore.set((prev) => ({ ...prev, ...Object.fromEntries(fresh.map((a) => [a.id, now])) }))
      fresh.forEach((a) => void remote.unlockAchievement(a.id, a.scope, a.xp))
    }
    return fresh
  },

  /** Chamado quando um jogo envia ACHIEVEMENT_UNLOCKED. Retorna a conquista se for nova. */
  unlockFromGame(game: string, id: string): Achievement | null {
    const def = achievements.find((a) => a.id === id && a.scope === game)
    if (unlockedStore.get()[id]) return null
    unlockedStore.set((prev) => ({ ...prev, [id]: Date.now() }))
    void remote.unlockAchievement(id, game, def?.xp ?? 0)
    analytics.track('game_event', { game, event: 'achievement_unlocked', achievement: id })
    return def ?? null
  },

  /** XP de conquistas reais (demo não conta). */
  realXp(unlocked: Record<string, number>) {
    return achievements.reduce((sum, a) => sum + (unlocked[a.id] ? a.xp : 0), 0)
  },
}
