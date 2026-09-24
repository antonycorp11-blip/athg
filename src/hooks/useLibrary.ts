import { useCallback, useMemo } from 'react'
import { favoritesStore, historyStore, library } from '@/services/library'
import { gamesService } from '@/services/gamesService'
import type { Game } from '@/types/game'
import { useStore } from './useStore'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/useTranslation'

export function useFavorites() {
  const favorites = useStore(favoritesStore)
  const slugs = useMemo(() => new Set(favorites.map((f) => f.slug)), [favorites])
  const games = useMemo(() => gamesService.getMany(favorites.map((f) => f.slug)), [favorites])
  return { favorites, games, isFavorite: (slug: string) => slugs.has(slug) }
}

/** Alterna favorito com feedback (toast). */
export function useToggleFavorite() {
  const { toast } = useToast()
  const { t } = useTranslation()
  return useCallback(
    (game: Game) => {
      const added = library.toggleFavorite(game.slug)
      toast(t(added ? 'favorites.added' : 'favorites.removed', { title: game.title }), { icon: added ? 'heart' : undefined })
    },
    [toast, t],
  )
}

export function useHistory() {
  const history = useStore(historyStore)
  const games = useMemo(
    () =>
      history
        .map((h) => ({ entry: h, game: gamesService.getBySlug(h.slug) }))
        .filter((x): x is { entry: typeof x.entry; game: Game } => Boolean(x.game)),
    [history],
  )
  return { history, games }
}
