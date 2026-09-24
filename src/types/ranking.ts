/** 'global' = ranking geral ATHG; demais ids = slug do jogo. */
export type LeaderboardId = 'global' | (string & {})

export interface LeaderboardEntry {
  rank: number
  playerId: string
  username: string
  avatarSeed: string
  level: number
  score: number
  isCurrentPlayer?: boolean
}

export interface Leaderboard {
  id: LeaderboardId
  period: 'weekly' | 'all-time'
  entries: LeaderboardEntry[]
  /** true enquanto os dados forem mockados. A UI mostra o selo DEMO. */
  isDemo: boolean
  updatedAt: number
}
