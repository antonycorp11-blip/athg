import { Heart } from 'lucide-react'
import type { Game } from '@/types/game'
import { useFavorites, useToggleFavorite } from '@/hooks/useLibrary'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface FavoriteButtonProps {
  game: Game
  /** icon = só o coração (cards/player) | button = botão com texto (página do jogo) */
  variant?: 'icon' | 'button'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function FavoriteButton({ game, variant = 'icon', className, size = 'md' }: FavoriteButtonProps) {
  const { isFavorite } = useFavorites()
  const toggle = useToggleFavorite()
  const { t } = useTranslation()
  const active = isFavorite(game.slug)
  const label = active ? t('common.unfavorite') : t('common.favorite')
  const comingSoon = game.status === 'coming-soon'

  if (variant === 'button') {
    return (
      <Button
        variant="secondary"
        size={size}
        onClick={() => toggle(game)}
        aria-pressed={active}
        className={cn(active && 'border-[#ff5c7a]/40 text-[#ff8da1]', className)}
      >
        <Heart size={size === 'lg' ? 18 : 16} aria-hidden fill={active ? 'currentColor' : 'none'} />
        {comingSoon ? (active ? t('game.following') : t('game.followGame')) : active ? t('common.favorited') : t('common.favorite')}
      </Button>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(game)
      }}
      aria-pressed={active}
      aria-label={`${label}: ${game.title}`}
      title={label}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-black/50 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-black/70',
        active ? 'text-[#ff5c7a]' : 'text-white',
        className,
      )}
    >
      <Heart size={16} aria-hidden fill={active ? 'currentColor' : 'none'} strokeWidth={2.25} />
    </button>
  )
}
