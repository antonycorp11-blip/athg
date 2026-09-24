import { Sparkles, Rocket, Hourglass, Megaphone } from 'lucide-react'
import { gamesService } from '@/services/gamesService'
import { useSeo } from '@/hooks/useSeo'
import { useTranslation } from '@/i18n/useTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GameGrid } from '@/components/games/GameGrid'

export default function NewsPage() {
  const { t } = useTranslation()
  useSeo({ title: t('seo.newsTitle'), description: t('news.subtitle'), path: '/news' })

  return (
    <div className="space-y-12">
      <PageHeader title={t('news.title')} subtitle={t('news.subtitle')} icon={Sparkles} />

      <section aria-labelledby="news-releases">
        <SectionHeader id="news-releases" title={t('news.releases')} icon={Rocket} />
        <GameGrid games={gamesService.getNewReleases()} source="news_releases" />
      </section>

      <section aria-labelledby="news-upcoming">
        <SectionHeader id="news-upcoming" title={t('news.upcoming')} subtitle={t('home.comingSoonSub')} icon={Hourglass} />
        <GameGrid games={gamesService.getComingSoon()} source="news_upcoming" />
      </section>

      <section aria-labelledby="news-platform">
        <SectionHeader id="news-platform" title={t('news.platform')} icon={Megaphone} />
        <article className="surface relative overflow-hidden rounded-card p-5 sm:p-6">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-brand to-cyan" aria-hidden />
          <p className="eyebrow text-cyan">V1</p>
          <h3 className="mt-1 font-display text-lg font-bold">{t('news.v1Title')}</h3>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">{t('news.v1Text')}</p>
        </article>
      </section>
    </div>
  )
}
