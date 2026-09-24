import type { Game } from '@/types/game'
import { GameCard } from './GameCard'
import { cn } from '@/utils/cn'

export function GameGrid({ games, source, className }: { games: Game[]; source?: string; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:gap-x-4 lg:grid-cols-4 2xl:grid-cols-5', className)}>
      {games.map((g, i) => (
        <GameCard key={g.slug} game={g} source={source} priority={i < 4} />
      ))}
    </div>
  )
}
