// Rankings reais (Supabase). 'global' = minutos jogados nos últimos 7 dias;
// slug de jogo = melhor pontuação enviada pelo jogo (SCORE_UPDATED / GAME_OVER).
import type { Leaderboard, LeaderboardId } from '@/types/ranking'
import { createPersistentStore } from './persistentStore'
import { auth } from './backend/auth'
import { remote } from './backend/remote'

/** Melhor pontuação local por jogo (cache; a oficial fica no banco). */
export const bestScoresStore = createPersistentStore<Record<string, number>>('best-scores', {})

export const rankingService = {
  async getLeaderboard(id: LeaderboardId): Promise<Leaderboard> {
    const db = await auth.publicClient()
    if (!db) throw new Error('backend_unavailable')
    const { data, error } = await db.rpc('leaderboard', { p_board: id, p_limit: 50 })
    if (error) throw error
    return {
      id,
      period: id === 'global' ? 'weekly' : 'all-time',
      isDemo: false,
      updatedAt: Date.now(),
      entries: (data ?? []).map((e) => ({
        rank: e.rank,
        playerId: `${id}-${e.rank}`,
        username: e.username,
        avatarSeed: e.avatar_seed,
        level: e.level,
        score: e.score,
        isCurrentPlayer: e.is_me,
      })),
    }
  },

  submitScore(game: string, score: number) {
    if (!Number.isFinite(score)) return
    bestScoresStore.set((prev) => (score > (prev[game] ?? -Infinity) ? { ...prev, [game]: score } : prev))
    void remote.submitScore(game, score)
  },
}
