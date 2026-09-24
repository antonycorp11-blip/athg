import type { LeaderboardEntry } from '@/types/ranking'
import { useTranslation } from '@/i18n/useTranslation'
import { Avatar } from '@/components/ui/Avatar'
import { formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  const { t, locale } = useTranslation()
  return (
    <div className="surface overflow-hidden rounded-card">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left text-xs text-muted">
          <tr>
            <th scope="col" className="w-14 py-3 pl-4 font-medium">#</th>
            <th scope="col" className="py-3 font-medium">{t('rankings.player')}</th>
            <th scope="col" className="hidden py-3 font-medium sm:table-cell">{t('rankings.level')}</th>
            <th scope="col" className="py-3 pr-4 text-right font-medium">{t('rankings.score')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {entries.map((e) => (
            <tr key={e.playerId} className={cn('transition-colors hover:bg-white/[0.02]', e.isCurrentPlayer && 'bg-brand/10')}>
              <td className="py-3 pl-4 font-display font-bold text-muted">{e.rank}</td>
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={e.username} seed={e.avatarSeed} size="sm" />
                  <div className="min-w-0">
                    <p className={cn('truncate font-semibold', e.isCurrentPlayer && 'text-cyan')}>{e.isCurrentPlayer ? `${e.username} (${t('rankings.you')})` : e.username}</p>
                    <p className="text-[11px] text-muted sm:hidden">{t('common.levelShort', { level: e.level })}</p>
                  </div>
                </div>
              </td>
              <td className="hidden py-3 text-muted sm:table-cell">{e.level}</td>
              <td className="py-3 pr-4 text-right font-display font-bold tabular-nums">{formatNumber(e.score, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
