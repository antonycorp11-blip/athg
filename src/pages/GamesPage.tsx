import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { LayoutGrid, Gamepad2 } from 'lucide-react'
import { gamesService, type GameSort } from '@/services/gamesService'
import { useSeo } from '@/hooks/useSeo'
import { useTranslation } from '@/i18n/useTranslation'
import { categoryMeta } from '@/utils/seo'
import { PageHeader } from '@/components/layout/PageHeader'
import { categoryIcons } from '@/components/layout/navItems'
import { GameGrid } from '@/components/games/GameGrid'
import { Chips } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import NotFoundPage from './NotFoundPage'
import type { CategoryId } from '@/types/game'

const SORTS: GameSort[] = ['all', 'new', 'popular', 'trending', 'az']

/** /games (todos) e /category/:categoryId (páginas indexáveis por categoria). */
export default function GamesPage() {
  const { categoryId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const category = categoryId ? gamesService.getCategory(categoryId) : undefined
  const sortParam = params.get('sort') as GameSort | null
  const sort: GameSort = sortParam && SORTS.includes(sortParam) ? sortParam : 'all'
  const games = useMemo(() => gamesService.list(sort, category?.id), [sort, category?.id])

  useSeo(
    category
      ? categoryMeta(category, t)
      : { title: t('seo.gamesTitle'), description: t('seo.defaultDescription'), path: '/games' },
  )

  if (categoryId && !category) return <NotFoundPage />

  const title = category ? t('games.categoryTitle', { category: t(`categories.${category.id}`) }) : t('games.title')
  const setSort = (next: GameSort) => {
    const p = new URLSearchParams(params)
    if (next === 'all') p.delete('sort')
    else p.set('sort', next)
    setParams(p, { replace: true })
  }

  const categoryItems = [
    { id: 'all' as const, label: t('games.allCategories') },
    ...gamesService.getListedCategories().map((c) => ({ id: c.id, label: t(`categories.${c.id}`) })),
  ]

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={category ? category.description : t('games.subtitle')}
        icon={category ? categoryIcons[category.id] : LayoutGrid}
      >
        <div className="space-y-3">
          <Chips
            label={t('games.filterByCategory')}
            items={categoryItems}
            value={category?.id ?? 'all'}
            onChange={(id: CategoryId | 'all') => navigate(id === 'all' ? '/games' : `/category/${id}`)}
          />
          <Chips label={t('games.sortLabel')} items={SORTS.map((s) => ({ id: s, label: t(`games.sort.${s}`) }))} value={sort} onChange={setSort} />
        </div>
      </PageHeader>

      {sort === 'popular' && <p className="-mt-2 mb-5 text-xs text-subtle">{t('games.popularNote')}</p>}

      {games.length ? (
        <GameGrid games={games} source={category ? `category_${category.id}` : 'all_games'} />
      ) : (
        <EmptyState
          icon={Gamepad2}
          title={t('games.empty')}
          text={t('games.emptyHint')}
          action={
            <ButtonLink to="/games" variant="secondary">
              {t('nav.allGames')}
            </ButtonLink>
          }
        />
      )}
    </div>
  )
}
