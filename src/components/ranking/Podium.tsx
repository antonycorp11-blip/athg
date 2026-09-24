import { Crown } from 'lucide-react'
import type { LeaderboardEntry } from '@/types/ranking'
import { useTranslation } from '@/i18n/useTranslation'
import { Avatar } from '@/components/ui/Avatar'
import { formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'

const styles = {
  1: { text: 'text-gold', bar: 'from-gold/30 to-gold/5 border-gold/40 h-28 sm:h-32', ring: 'ring-gold', label: '1º' },
  2: { text: 'text-[#d7dde6]', bar: 'from-white/15 to-white/[0.02] border-white/20 h-20 sm:h-24', ring: 'ring-[#d7dde6]', label: '2º' },
  3: { text: 'text-[#e3a06b]', bar: 'from-[#e3a06b]/25 to-[#e3a06b]/5 border-[#e3a06b]/35 h-16 sm:h-20', ring: 'ring-[#e3a06b]', label: '3º' },
} as const

/** Top 3 com destaque visual (ordem 2 - 1 - 3). */
export function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const { t, locale } = useTranslation()
  const [first, second, third] = entries
  const order = [second, first, third].filter(Boolean)

  return (
    <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Top 3">
      {order.map((e) => {
        const s = styles[e.rank as 1 | 2 | 3]
        return (
          <li key={e.playerId} className="flex min-w-0 flex-col items-center">
            <div className="relative mb-3">
              {e.rank === 1 && <Crown size={22} className="absolute -top-6 left-1/2 -translate-x-1/2 text-gold drop-shadow-[0_0_8px_rgb(246_196_83/0.6)]" fill="currentColor" aria-hidden />}
              <Avatar name={e.username} seed={e.avatarSeed} size={e.rank === 1 ? 'lg' : 'md'} className={cn('ring-2 ring-offset-2 ring-offset-bg sm:size-16', s.ring, e.rank === 1 && 'sm:size-20')} />
            </div>
            <p className={cn('max-w-full truncate text-center text-sm font-semibold', e.isCurrentPlayer && 'text-cyan')}>{e.isCurrentPlayer ? t('rankings.you') : e.username}</p>
            <p className="text-[11px] text-muted">{t('common.levelShort', { level: e.level })}</p>
            <div className={cn('mt-2 flex w-full flex-col items-center justify-start rounded-t-xl border border-b-0 bg-gradient-to-b pt-3', s.bar)}>
              <span className={cn('font-display text-2xl font-bold', s.text)}>{s.label}</span>
              <span className="font-display text-xs font-semibold tabular-nums sm:text-sm">{formatNumber(e.score, locale)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
