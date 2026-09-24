import { useState } from 'react'
import { Trophy, CloudOff } from 'lucide-react'
import { rankingService } from '@/services/rankingService'
import { gamesService } from '@/services/gamesService'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { useTranslation } from '@/i18n/useTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Notice } from '@/components/ui/Notice'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import { Podium } from '@/components/ranking/Podium'
import { LeaderboardTable } from '@/components/ranking/LeaderboardTable'

const BOARDS = ['global', 'hemofazenda', 'profundio'] as const
type Board = (typeof BOARDS)[number]

export default function RankingsPage() {
  const { t } = useTranslation()
  const [board, setBoard] = useState<Board>('global')
  const state = useAsync(() => rankingService.getLeaderboard(board), [board])

  useSeo({ title: t('seo.rankingsTitle'), description: t('rankings.subtitle'), path: '/rankings' })

  const tabs = BOARDS.map((id) => ({ id, label: id === 'global' ? t('rankings.tabs.global') : (gamesService.getBySlug(id)?.title ?? id) }))
  const scoreLabel = board === 'global' ? t('rankings.minutes') : t('rankings.score')

  return (
    <div>
      <PageHeader title={t('rankings.title')} subtitle={t('rankings.subtitle')} icon={Trophy}>
        <Tabs items={tabs} value={board} onChange={setBoard} label={t('rankings.title')} idBase="rankings" className="w-fit max-w-full" />
      </PageHeader>

      <div id="rankings-panel" role="tabpanel" aria-labelledby={`rankings-tab-${board}`} className="space-y-6">
        <Notice tone="brand">{t('rankings.liveNotice')}</Notice>
        {state.status === 'loading' ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-56 w-full rounded-card" />
            <Skeleton className="h-80 w-full rounded-card" />
          </div>
        ) : state.status === 'error' ? (
          <EmptyState icon={CloudOff} title={t('rankings.loadError')} />
        ) : state.data.entries.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={t('rankings.empty')}
            text={t('rankings.emptyHint')}
            action={<ButtonLink to={board === 'global' ? '/games' : `/play/${board}`}>{t('common.playNow')}</ButtonLink>}
          />
        ) : (
          <>
            <div className="mx-auto max-w-2xl pt-6">
              <Podium entries={state.data.entries.slice(0, 3)} />
            </div>
            {state.data.entries.length > 3 && <LeaderboardTable entries={state.data.entries.slice(3)} scoreLabel={scoreLabel} />}
          </>
        )}
      </div>
    </div>
  )
}
