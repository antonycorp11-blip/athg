import { Link } from 'react-router'
import { Play, Info, Hourglass } from 'lucide-react'
import type { Game } from '@/types/game'
import { isPlayable } from '@/services/gamesService'
import { analytics } from '@/services/analytics'
import { useTranslation } from '@/i18n/useTranslation'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { GameArt } from '@/components/games/GameArt'
import { GameBadges } from '@/components/games/GameBadges'

interface HomeHeroProps {
  game: Game
  side: Game[]
}

export function HomeHero({ game, side }: HomeHeroProps) {
  const { t } = useTranslation()
  const chips = [...game.categories.map((c) => t(`categories.${c}`)), ...game.tags].slice(0, 3)
  const playable = isPlayable(game)

  return (
    <section aria-labelledby="hero-title" className="grid grid-cols-1 gap-3 pt-4 md:pt-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-4">
      {/* Destaque principal */}
      <div className="noise relative isolate flex min-h-[440px] overflow-hidden rounded-xl ring-1 ring-line sm:min-h-[400px] lg:min-h-[460px]">
        <div className="absolute inset-0 -z-10">
          <GameArt game={game} variant="banner" priority showTitle={false} />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/55 to-transparent md:bg-gradient-to-r md:from-bg/95 md:via-bg/60 md:to-transparent" />

        <div className="mt-auto flex max-w-xl flex-col p-5 sm:p-8 md:my-auto lg:p-12">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="eyebrow text-cyan">{t('home.heroEyebrow')}</span>
            <GameBadges game={game} max={2} className="flex gap-1.5" />
          </div>
          <h1 id="hero-title" className="display-title text-[44px] leading-[0.95] uppercase sm:text-6xl lg:text-7xl">
            {game.title}
          </h1>
          {game.tagline && <p className="mt-3 text-lg font-semibold text-fg sm:text-xl">{game.tagline}</p>}
          <p className="mt-2 line-clamp-3 max-w-md text-sm text-muted sm:text-[15px]">{game.shortDescription}</p>

          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={t('game.tags')}>
            {chips.map((c) => (
              <li key={c} className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-fg/90 backdrop-blur">
                {c}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {playable && (
              <ButtonLink
                to={`/play/${game.slug}`}
                size="lg"
                icon={Play}
                onClick={() => analytics.track('game_card_clicked', { game: game.slug, source: 'home_hero', target: 'play' })}
                className="font-display tracking-wider uppercase"
              >
                {t('common.playNow')}
              </ButtonLink>
            )}
            <ButtonLink to={`/game/${game.slug}`} size="lg" variant="secondary" icon={Info} className="backdrop-blur">
              {t('common.details')}
            </ButtonLink>
          </div>
        </div>
      </div>

      {/* Cards laterais */}
      <div className="relative">
        <p className="eyebrow mt-2 mb-2 text-subtle xl:hidden">{t('home.heroSideLabel')}</p>
        <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 xl:h-full xl:grid-cols-1 xl:grid-rows-3">
          {side.map((g) => (
            <li key={g.slug} className="w-[72%] shrink-0 snap-start xs:w-[48%] md:w-auto">
              <SideCard game={g} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function SideCard({ game }: { game: Game }) {
  const { t } = useTranslation()
  const playable = isPlayable(game)
  return (
    <Link
      to={`/game/${game.slug}`}
      onClick={() => analytics.track('game_card_clicked', { game: game.slug, source: 'home_hero_side' })}
      className="group relative flex aspect-video h-full w-full overflow-hidden rounded-card ring-1 ring-line transition-[box-shadow,transform] duration-300 ease-athg hover:-translate-y-0.5 hover:shadow-lift xl:aspect-auto"
    >
      <div className="absolute inset-0 transition-transform duration-500 ease-athg group-hover:scale-105">
        <GameArt game={game} showTitle={false} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      {!playable && (
        <Badge tone="violet" className="absolute top-3 left-3">
          <Hourglass size={10} aria-hidden />
          {t('badges.coming-soon')}
        </Badge>
      )}
      <div className="relative mt-auto flex w-full items-end justify-between gap-2 p-3.5">
        <div className="min-w-0">
          <p className="line-clamp-2 font-display text-lg leading-tight font-bold uppercase">{game.title}</p>
          <p className="truncate text-xs text-muted">
            {playable ? game.categories.map((c) => t(`categories.${c}`)).join(' · ') : t('common.inDevelopment')}
          </p>
        </div>
        {playable && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-glow transition-transform group-hover:scale-110">
            <Play size={15} fill="currentColor" aria-hidden />
            <span className="sr-only">{t('common.play')}</span>
          </span>
        )}
      </div>
    </Link>
  )
}
