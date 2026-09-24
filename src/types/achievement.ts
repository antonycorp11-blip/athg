export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

/** Nomes de ícone mapeados em components/achievements/achievementIcons.ts */
export type AchievementIcon =
  | 'play'
  | 'compass'
  | 'heart'
  | 'clock'
  | 'droplet'
  | 'sprout'
  | 'castle'
  | 'moon'
  | 'anchor'
  | 'waves'
  | 'gauge'
  | 'gem'

export interface Achievement {
  id: string
  /** 'athg' = conquista da plataforma; demais = slug do jogo. */
  scope: 'athg' | (string & {})
  name: string
  description: string
  icon: AchievementIcon
  rarity: AchievementRarity
  xp: number
  hidden?: boolean
}

export interface AchievementWithState extends Achievement {
  unlocked: boolean
  unlockedAt?: number
  /** true quando o estado vem de dados de demonstração. */
  demo: boolean
}
