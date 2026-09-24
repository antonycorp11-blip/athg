import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import type { GameBadge } from '@/types/game'

export type BadgeTone = 'brand' | 'cyan' | 'gold' | 'violet' | 'neutral' | 'danger' | 'success' | 'hot'

const tones: Record<BadgeTone, string> = {
  brand: 'bg-brand/90 text-white',
  cyan: 'bg-cyan/15 text-cyan ring-1 ring-inset ring-cyan/30',
  gold: 'bg-gold/15 text-gold ring-1 ring-inset ring-gold/35',
  violet: 'bg-violet/20 text-[#c4b0ff] ring-1 ring-inset ring-violet/40',
  neutral: 'bg-white/10 text-fg ring-1 ring-inset ring-white/10',
  danger: 'bg-danger/15 text-[#ff8da1] ring-1 ring-inset ring-danger/30',
  success: 'bg-success/15 text-[#6ee7a0] ring-1 ring-inset ring-success/30',
  hot: 'bg-gradient-to-r from-[#ff6a3d] to-[#ff3d71] text-white',
}

export const gameBadgeTone: Record<GameBadge, BadgeTone> = {
  new: 'brand',
  trending: 'hot',
  original: 'neutral',
  'coming-soon': 'violet',
  beta: 'cyan',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
  size?: 'sm' | 'md'
}

export function Badge({ tone = 'neutral', size = 'sm', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[5px] font-display font-semibold tracking-wider uppercase',
        size === 'sm' ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Selo "DEMO" para dados de demonstração. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="gold" className={className}>
      Demo
    </Badge>
  )
}
