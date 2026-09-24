import { Heart } from 'lucide-react'
import { useFavorites } from '@/hooks/useLibrary'
import { useSeo } from '@/hooks/useSeo'
import { useTranslation } from '@/i18n/useTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { GameGrid } from '@/components/games/GameGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'

export default function FavoritesPage() {
  const { t } = useTranslation()
  const { games } = useFavorites()
  useSeo({ title: t('seo.favoritesTitle'), description: t('favorites.subtitle'), path: '/favorites', noindex: true })

  return (
    <div>
      <PageHeader title={t('favorites.title')} subtitle={t('favorites.subtitle')} icon={Heart} />
      {games.length ? (
        <GameGrid games={games} source="favorites" />
      ) : (
        <EmptyState
          icon={Heart}
          title={t('favorites.empty')}
          text={t('favorites.emptyHint')}
          action={<ButtonLink to="/games">{t('nav.allGames')}</ButtonLink>}
        />
      )}
    </div>
  )
}
