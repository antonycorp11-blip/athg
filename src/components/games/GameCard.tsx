import { Link } from 'react-router'
import { Play, Hourglass } from 'lucide-react'
import type { Game } from '@/types/game'
import { isPlayable } from '@/services/gamesService'
import { analytics } from '@/services/analytics'
import { useTranslation } from '@/i18n/useTranslation'
import { GameArt } from './GameArt'
import { GameBadges } from './GameBadges'
import { FavoriteButton } from './FavoriteButton'
import { cn } from '@/utils/cn'

interface GameCardProps {
  game: Game
  /** Nome da seção para analytics (ex: "home_trending"). */
  source?: string
  /** Substitui a linha de categoria (ex: "Jogado há 2 h"). */
  meta?: string
  /** Variante "continuar jogando": CTA vira Continuar e o link vai direto ao player. */
  continueMode?: boolean
  priority?: boolean
  className?: string
}

export function GameCard({ game, source, meta, continueMode, priority, className }: GameCardProps) {
  const { t } = useTranslation()
  const playable = isPlayable(game)
  const detailsHref = `/game/${game.slug}`
  const playHref = `/play/${game.slug}`
  const primaryHref = continueMode && playable ? playHref : detailsHref
  const track = (target: string) => analytics.track('game_card_clicked', { game: game.slug, source, target })

  return (
    <article className={cn('group relative transition-transform duration-300 ease-athg hover:-translate-y-1', className)}>
      <div className="relative aspect-video overflow-hidden rounded-card bg-card shadow-card ring-1 ring-line transition-shadow duration-300 group-hover:shadow-lift">
        <GameArt
          game={game}
          priority={priority}
          sizes="(max-width: 640px) 70vw, 300px"
          className={cn('transition-transform duration-500 ease-athg group-hover:scale-[1.06]', !playable && 'saturate-[0.8]')}
        />

        <GameBadges game={game} max={1} className="absolute top-2 left-2 z-10 flex" />

        {/* Overlay de hover (só em dispositivos com mouse) */}
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-t from-black/75 via-black/30 to-black/10 pointer-events-none opacity-0 transition-opacity duration-300 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
          {playable ? (
            <Link
              to={playHref}
              onClick={() => track('play')}
              tabIndex={-1}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 font-display text-sm font-bold tracking-wider text-white uppercase shadow-glow transition-transform duration-200 hover:scale-105"
            >
              <Play size={15} fill="currentColor" aria-hidden />
              {continueMode ? t('common.continue') : t('common.play')}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-fg backdrop-blur">
              <Hourglass size={14} aria-hidden />
              {t('common.inDevelopment')}
            </span>
          )}
          <FavoriteButton game={game} className="absolute top-2 right-2" />
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <h3 className="truncate text-[14px] leading-tight font-semibold">
          <Link
            to={primaryHref}
            onClick={() => track(primaryHref === playHref ? 'play' : 'details')}
            className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-cyan"
          >
            {game.title}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted">
          {meta ?? game.categories.map((c) => t(`categories.${c}`)).join(' · ')}
        </p>
      </div>
    </article>
  )
}
