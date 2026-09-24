import { Trophy } from 'lucide-react'
import { rankingService } from '@/services/rankingService'
import { useAsync } from '@/hooks/useAsync'
import { useTranslation } from '@/i18n/useTranslation'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'

const medal = ['text-gold', 'text-[#d7dde6]', 'text-[#e3a06b]']

/** Top 5 do ranking geral para a Home. */
export function RankingPreview() {
  const { t, locale } = useTranslation()
  const state = useAsync(() => rankingService.getLeaderboard('global'), [])

  return (
    <section aria-labelledby="home-ranking">
      <SectionHeader
        id="home-ranking"
        title={t('home.weeklyRanking')}
        subtitle={t('rankings.minutes')}
        icon={Trophy}
        action={{ label: t('common.seeAll'), to: '/rankings' }}
      />
      <ol className="surface divide-y divide-line overflow-hidden rounded-card">
        {state.status === 'success' && state.data.entries.length === 0 ? (
          <li className="px-4 py-6 text-center">
            <p className="text-sm font-semibold">{t('rankings.empty')}</p>
            <p className="text-xs text-muted">{t('rankings.emptyHint')}</p>
          </li>
        ) : state.status === 'error' ? (
          <li className="px-4 py-6 text-center text-sm text-muted">{t('rankings.loadError')}</li>
        ) : state.status !== 'success'
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </li>
            ))
          : state.data.entries.slice(0, 5).map((e) => (
              <li key={e.playerId} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.02]">
                <span className={cn('w-6 text-center font-display text-base font-bold', medal[e.rank - 1] ?? 'text-subtle')}>{e.rank}</span>
                <Avatar name={e.username} seed={e.avatarSeed} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.username}</p>
                  <p className="text-[11px] text-muted">{t('common.levelShort', { level: e.level })}</p>
                </div>
                <span className="font-display text-sm font-bold tabular-nums">
                  {formatNumber(e.score, locale)} <span className="text-[11px] font-medium text-muted">min</span>
                </span>
              </li>
            ))}
      </ol>
    </section>
  )
}
