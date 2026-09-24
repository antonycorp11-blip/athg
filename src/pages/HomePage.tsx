import { useMemo } from 'react'
import { Award, Flame, History, Rocket, ChartColumn, GraduationCap, Star, Sparkles } from 'lucide-react'
import { homeConfig } from '@/data/home'
import { gamesService } from '@/services/gamesService'
import { useHistory } from '@/hooks/useLibrary'
import { useAchievements } from '@/hooks/useAchievements'
import { useSeo } from '@/hooks/useSeo'
import { useTranslation } from '@/i18n/useTranslation'
import { SITE_URL } from '@/config/env'
import { websiteJsonLd } from '@/utils/seo'
import { formatRelative } from '@/utils/format'
import { HomeHero } from '@/components/home/HomeHero'
import { GameCarousel } from '@/components/games/GameCarousel'
import { GameCard } from '@/components/games/GameCard'
import { ComingSoonTeaser } from '@/components/games/ComingSoonTeaser'
import { RankingPreview } from '@/components/ranking/RankingPreview'
import { AchievementCard } from '@/components/achievements/AchievementCard'
import { PassBanner } from '@/components/pass/PassBanner'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { AdSlot } from '@/components/ads/AdSlot'
import type { Game } from '@/types/game'

const TEASER = '__teaser__'
type Item = Game | typeof TEASER

/** Completa fileiras curtas com o card "Novos mundos estão chegando". */
const withTeaser = (list: Game[], min = 4): Item[] => (list.length < min ? [...list, TEASER] : list)
const keyOf = (item: Item) => (item === TEASER ? TEASER : item.slug)

export default function HomePage() {
  const { t } = useTranslation()
  const { games: recent } = useHistory()
  const achievements = useAchievements()

  useSeo({ title: t('seo.defaultTitle'), description: t('seo.defaultDescription'), path: '/', jsonLd: websiteJsonLd(SITE_URL) })

  const data = useMemo(() => {
    const hero = gamesService.getBySlug(homeConfig.heroSlug) ?? gamesService.getFeatured()[0]
    return {
      hero,
      side: gamesService.getMany(homeConfig.heroSideSlugs),
      featured: gamesService.list('all'),
      latest: gamesService.getNewReleases(),
      incremental: gamesService.getByCategory('incremental'),
      educational: gamesService.getByCategory('educacao'),
      trending: gamesService.getTrending(),
      originals: gamesService.getOriginals(),
    }
  }, [])

  const featuredAchievements = useMemo(
    () => [...achievements].filter((a) => !a.hidden).sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).slice(0, 4),
    [achievements],
  )

  const renderItem = (source: string) => (item: Item) =>
    item === TEASER ? <ComingSoonTeaser /> : <GameCard game={item} source={source} />

  return (
    <div className="space-y-10 md:space-y-12">
      {data.hero && <HomeHero game={data.hero} side={data.side} />}

      <GameCarousel
        title={t('home.featured')}
        subtitle={t('home.featuredSub')}
        icon={Star}
        items={data.featured}
        getKey={(g) => g.slug}
        renderItem={(g, i) => <GameCard game={g} source="home_featured" priority={i < 2} />}
        action={{ label: t('common.seeAll'), to: '/games' }}
      />

      {recent.length > 0 && (
        <GameCarousel
          title={t('home.continue')}
          subtitle={t('home.continueSub')}
          icon={History}
          items={recent}
          getKey={(r) => r.game.slug}
          renderItem={({ game, entry }) => (
            <GameCard game={game} source="home_continue" continueMode meta={t('profile.lastPlayed', { when: formatRelative(entry.lastPlayedAt, t) })} />
          )}
        />
      )}

      <GameCarousel
        title={t('home.latest')}
        subtitle={t('home.latestSub')}
        icon={Rocket}
        items={withTeaser(data.latest)}
        getKey={keyOf}
        renderItem={renderItem('home_latest')}
        action={{ label: t('common.seeAll'), to: '/games?sort=new' }}
      />

      <GameCarousel
        title={t('home.incremental')}
        subtitle={t('home.incrementalSub')}
        icon={ChartColumn}
        items={withTeaser(data.incremental)}
        getKey={keyOf}
        renderItem={renderItem('home_incremental')}
        action={{ label: t('common.seeAll'), to: '/category/incremental' }}
      />

      <GameCarousel
        title={t('home.educational')}
        subtitle={t('home.educationalSub')}
        icon={GraduationCap}
        items={withTeaser(data.educational)}
        getKey={keyOf}
        renderItem={renderItem('home_educational')}
        action={{ label: t('common.seeAll'), to: '/category/educacao' }}
      />

      {/* Em alta: numerado, estilo "top da semana" */}
      <GameCarousel
        title={t('home.trending')}
        subtitle={t('home.trendingSub')}
        icon={Flame}
        items={data.trending}
        getKey={(g) => g.slug}
        renderItem={(g, i) => (
          <div className="flex items-end gap-1">
            <span
              aria-hidden
              className="-mr-1 shrink-0 translate-y-2 font-display text-[88px] leading-none font-bold text-transparent [-webkit-text-stroke:2px_rgb(255_255_255/0.22)] sm:text-[104px]"
            >
              {i + 1}
            </span>
            <GameCard game={g} source="home_trending" className="min-w-0 flex-1" />
          </div>
        )}
        action={{ label: t('common.seeAll'), to: '/games?sort=trending' }}
      />

      <AdSlot placement="home-inline" />

      <GameCarousel
        title={t('home.originals')}
        subtitle={t('home.originalsSub')}
        icon={Sparkles}
        items={data.originals}
        getKey={(g) => g.slug}
        renderItem={(g) => <GameCard game={g} source="home_originals" />}
      />

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-6">
        <RankingPreview />
        <section aria-labelledby="home-achievements">
          <SectionHeader
            id="home-achievements"
            title={t('home.achievements')}
            subtitle={t('home.achievementsSub')}
            icon={Award}
            action={{ label: t('common.seeAll'), to: '/achievements' }}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {featuredAchievements.map((a) => (
              <AchievementCard key={a.id} achievement={a} compact />
            ))}
          </div>
        </section>
      </div>

      <PassBanner />
    </div>
  )
}
