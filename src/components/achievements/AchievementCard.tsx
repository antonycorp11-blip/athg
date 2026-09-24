import { Lock, EyeOff } from 'lucide-react'
import type { AchievementWithState } from '@/types/achievement'
import { gamesService } from '@/services/gamesService'
import { useTranslation } from '@/i18n/useTranslation'
import { achievementIcons, rarityStyles } from './achievementIcons'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

export function AchievementCard({ achievement: a, compact }: { achievement: AchievementWithState; compact?: boolean }) {
  const { t, locale } = useTranslation()
  const style = rarityStyles[a.rarity]
  const concealed = a.hidden && !a.unlocked
  const Icon = concealed ? EyeOff : achievementIcons[a.icon]
  const gameTitle = a.scope === 'athg' ? 'ATHG' : (gamesService.getBySlug(a.scope)?.title ?? a.scope)

  return (
    <article
      className={cn(
        'surface relative flex gap-3.5 overflow-hidden rounded-card p-4 transition-colors duration-200 hover:bg-card-hover',
        !a.unlocked && 'bg-card/60',
      )}
    >
      {a.unlocked && <div className={cn('pointer-events-none absolute -top-10 -left-10 size-32 rounded-full bg-gradient-to-br opacity-60 blur-2xl', style.bg)} aria-hidden />}
      <div
        className={cn(
          'relative flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br ring-1',
          a.unlocked ? [style.bg, style.ring, style.glow, style.text].join(' ') : 'from-white/[0.06] to-transparent text-subtle ring-white/10',
        )}
      >
        <Icon size={24} aria-hidden strokeWidth={2} />
        {!a.unlocked && (
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-surface ring-1 ring-line-strong">
            <Lock size={11} className="text-muted" aria-hidden />
          </span>
        )}
      </div>
      <div className="relative min-w-0 flex-1">
        <h3 className={cn('truncate text-[15px] font-semibold', !a.unlocked && 'text-fg/80')}>{concealed ? t('achievements.hidden') : a.name}</h3>
        <p className={cn('mt-0.5 text-[13px] text-muted', compact && 'line-clamp-1')}>{concealed ? t('achievements.hiddenDesc') : a.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          <span className="font-display font-bold text-cyan">+{a.xp} XP</span>
          <span className="text-subtle">•</span>
          <span className={cn('font-display font-semibold tracking-wider uppercase', style.text)}>{t(`achievements.rarity.${a.rarity}`)}</span>
          <span className="text-subtle">•</span>
          <span className="text-muted">{gameTitle}</span>
          <span className="text-subtle">•</span>
          <span className={a.unlocked ? 'text-success' : 'text-subtle'}>
            {a.unlocked ? (a.unlockedAt ? formatDate(a.unlockedAt, locale) : t('achievements.unlocked')) : t('achievements.locked')}
          </span>
          {a.demo && a.unlocked && <span className="rounded bg-gold/15 px-1 font-semibold text-gold">DEMO</span>}
        </div>
      </div>
    </article>
  )
}
