import { useMemo, useState } from 'react'
import { Award } from 'lucide-react'
import { useAchievements } from '@/hooks/useAchievements'
import { gamesService } from '@/services/gamesService'
import { useSeo } from '@/hooks/useSeo'
import { useTranslation } from '@/i18n/useTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Notice } from '@/components/ui/Notice'
import { AchievementCard } from '@/components/achievements/AchievementCard'

const FILTERS = ['all', 'hemofazenda', 'profundio'] as const
type Filter = (typeof FILTERS)[number]

export default function AchievementsPage() {
  const { t } = useTranslation()
  const all = useAchievements()
  const [filter, setFilter] = useState<Filter>('all')

  useSeo({ title: t('seo.achievementsTitle'), description: t('achievements.subtitle'), path: '/achievements' })

  const list = useMemo(
    () => (filter === 'all' ? all : all.filter((a) => a.scope === filter)).slice().sort((a, b) => Number(b.unlocked) - Number(a.unlocked)),
    [all, filter],
  )
  const unlocked = list.filter((a) => a.unlocked).length
  const pct = list.length ? Math.round((unlocked / list.length) * 100) : 0
  const tabs = FILTERS.map((id) => ({ id, label: id === 'all' ? t('achievements.all') : (gamesService.getBySlug(id)?.title ?? id) }))

  return (
    <div>
      <PageHeader title={t('achievements.title')} subtitle={t('achievements.subtitle')} icon={Award}>
        <Tabs items={tabs} value={filter} onChange={setFilter} label={t('achievements.title')} idBase="achievements" className="w-fit max-w-full" />
      </PageHeader>

      <div id="achievements-panel" role="tabpanel" aria-labelledby={`achievements-tab-${filter}`} className="space-y-5">
        <div className="surface flex items-center gap-4 rounded-card p-4">
          <div className="flex-1">
            <p className="text-sm font-semibold">{t('achievements.progress', { unlocked, total: list.length })}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-brand to-cyan transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="font-display text-2xl font-bold text-cyan">{pct}%</span>
        </div>
        <Notice>{t('achievements.demoNotice')}</Notice>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
        </div>
      </div>
    </div>
  )
}
