import { Play, Compass, Heart, Clock, Droplet, Sprout, Castle, Moon, Anchor, WavesHorizontal, Gauge, Gem, type LucideIcon } from 'lucide-react'
import type { AchievementIcon, AchievementRarity } from '@/types/achievement'

export const achievementIcons: Record<AchievementIcon, LucideIcon> = {
  play: Play,
  compass: Compass,
  heart: Heart,
  clock: Clock,
  droplet: Droplet,
  sprout: Sprout,
  castle: Castle,
  moon: Moon,
  anchor: Anchor,
  waves: WavesHorizontal,
  gauge: Gauge,
  gem: Gem,
}

export const rarityStyles: Record<AchievementRarity, { text: string; ring: string; glow: string; bg: string }> = {
  common: { text: 'text-[#cbd5e1]', ring: 'ring-white/15', glow: '', bg: 'from-slate-500/25 to-slate-700/10' },
  rare: { text: 'text-cyan', ring: 'ring-cyan/40', glow: 'shadow-[0_0_24px_-6px_rgb(21_200_255/0.55)]', bg: 'from-cyan/30 to-brand/10' },
  epic: { text: 'text-[#b69cff]', ring: 'ring-violet/50', glow: 'shadow-[0_0_24px_-6px_rgb(139_92_246/0.6)]', bg: 'from-violet/35 to-violet/5' },
  legendary: { text: 'text-gold', ring: 'ring-gold/55', glow: 'shadow-[0_0_28px_-6px_rgb(246_196_83/0.6)]', bg: 'from-gold/35 to-[#c98f1c]/10' },
}
