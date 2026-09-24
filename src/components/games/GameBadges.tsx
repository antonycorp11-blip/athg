import type { Game } from '@/types/game'
import { getGameBadges } from '@/services/gamesService'
import { Badge, gameBadgeTone } from '@/components/ui/Badge'
import { useTranslation } from '@/i18n/useTranslation'

/** Badges do jogo. `max` limita quantos aparecem (cards mostram 1). */
export function GameBadges({ game, max = 3, className }: { game: Game; max?: number; className?: string }) {
  const { t } = useTranslation()
  const badges = getGameBadges(game).slice(0, max)
  if (!badges.length) return null
  return (
    <div className={className ?? 'flex flex-wrap gap-1.5'}>
      {badges.map((b) => (
        <Badge key={b} tone={gameBadgeTone[b]}>
          {t(`badges.${b}`)}
        </Badge>
      ))}
    </div>
  )
}
