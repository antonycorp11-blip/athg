export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'founder' | 'pass'

export type PlayerBadge = 'rookie' | 'explorer' | 'veteran'

export interface PlayerStats {
  gamesPlayed: number
  secondsPlayed: number
  achievements: number
  /** Pontos ATHG: ainda não existe economia real, então fica null. */
  athgScore: number | null
}

export interface PlayerProfile {
  athgId: string
  username: string
  /** Semente para o avatar gerado. Futuro: URL de avatar da conta. */
  avatarSeed: string
  avatarUrl?: string
  level: number
  xp: number
  /** XP acumulado necessário para o nível atual e o próximo. */
  levelFloorXp: number
  nextLevelXp: number
  joinedAt: number
  favoriteGameSlug?: string
  badge: PlayerBadge
  rarity: CardRarity
  stats: PlayerStats
  isGuest: boolean
}
