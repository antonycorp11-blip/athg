import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { rankingService } from '@/services/rankingService'
import { gamesService } from '@/services/gamesService'
import { useAsync } from '@/hooks/useAsync'
import { useProfile } from '@/hooks/useProfile'
import { useStore } from '@/hooks/useStore'
import { bestScoresStore } from '@/services/rankingService'
import { useSeo } from '@/hooks/useSeo'
import { useTranslation } from '@/i18n/useTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { DemoBadge } from '@/components/ui/Badge'
import { Notice } from '@/components/ui/Notice'
import { Skeleton } from '@/components/ui/Skeleton'
import { Podium } from '@/components/ranking/Podium'
import { LeaderboardTable } from '@/components/ranking/LeaderboardTable'

const BOARDS = ['global', 'hemofazenda', 'profundio'] as const
type Board = (typeof BOARDS)[number]

export default function RankingsPage() {
  const { t } = useTranslation()
  const [board, setBoard] = useState<Board>('global')
  const profile = useProfile()
  const bestScores = useStore(bestScoresStore)
  const state = useAsync(
    () => rankingService.getLeaderboard(board, { username: profile.username, avatarSeed: profile.avatarSeed, level: profile.level }),
    [board, profile.username, profile.level, bestScores],
  )

  useSeo({ title: t('seo.rankingsTitle'), description: t('rankings.subtitle'), path: '/rankings' })

  const tabs = BOARDS.map((id) => ({ id, label: id === 'global' ? t('rankings.tabs.global') : (gamesService.getBySlug(id)?.title ?? id) }))

  return (
    <div>
      <PageHeader title={t('rankings.title')} subtitle={t('rankings.subtitle')} icon={Trophy} extra={<DemoBadge />}>
        <Tabs items={tabs} value={board} onChange={setBoard} label={t('rankings.title')} idBase="rankings" className="w-fit max-w-full" />
      </PageHeader>

      <div id="rankings-panel" role="tabpanel" aria-labelledby={`rankings-tab-${board}`} className="space-y-6">
        <Notice>{t('rankings.demoNotice')}</Notice>
        {state.status !== 'success' ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-56 w-full rounded-card" />
            <Skeleton className="h-80 w-full rounded-card" />
          </div>
        ) : (
          <>
            <div className="mx-auto max-w-2xl pt-6">
              <Podium entries={state.data.entries.slice(0, 3)} />
            </div>
            <LeaderboardTable entries={state.data.entries.slice(3)} />
          </>
        )}
      </div>
    </div>
  )
}
