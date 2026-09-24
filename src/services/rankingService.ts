// Rankings. V1: dados de demonstração + melhor pontuação local do jogador.
// Futuro: GET /api/leaderboards/:id — basta trocar a implementação de getLeaderboard.
import { demoLeaderboards } from '@/data/demo/leaderboards'
import type { Leaderboard, LeaderboardEntry, LeaderboardId } from '@/types/ranking'
import { createPersistentStore } from './persistentStore'

/** Melhor pontuação local por jogo (enviada pelo jogo via SCORE_UPDATED). */
export const bestScoresStore = createPersistentStore<Record<string, number>>('best-scores', {})

export const rankingService = {
  async getLeaderboard(id: LeaderboardId, player?: { username: string; avatarSeed: string; level: number }): Promise<Leaderboard> {
    const base = demoLeaderboards[id] ?? []
    let entries: LeaderboardEntry[] = base
    const best = bestScoresStore.get()[id]
    if (player && id !== 'global' && best) {
      const me: LeaderboardEntry = { rank: 0, playerId: 'me', ...player, score: best, isCurrentPlayer: true }
      entries = [...base, me].sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 }))
    }
    return { id, period: 'weekly', entries, isDemo: true, updatedAt: Date.now() }
  },

  submitScore(game: string, score: number) {
    if (!Number.isFinite(score)) return
    bestScoresStore.set((prev) => (score > (prev[game] ?? -Infinity) ? { ...prev, [game]: score } : prev))
  },
}
