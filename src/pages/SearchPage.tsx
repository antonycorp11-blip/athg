import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Search, SearchX, X } from 'lucide-react'
import { gamesService } from '@/services/gamesService'
import { useSeo } from '@/hooks/useSeo'
import { useIsTouch } from '@/hooks/useMediaQuery'
import { useTranslation } from '@/i18n/useTranslation'
import { useGameSearch, useTrackSearch } from '@/components/ui/SearchBar'
import { GameGrid } from '@/components/games/GameGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import { categoryIcons } from '@/components/layout/navItems'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const isTouch = useIsTouch()
  const results = useGameSearch(query)
  useTrackSearch(query, results.length)

  useSeo({ title: t('seo.searchTitle'), description: t('seo.defaultDescription'), path: '/search', noindex: true })

  useEffect(() => {
    // Desktop: foca direto. Mobile: foca só se veio vazio (evita teclado cobrindo resultados).
    if (!isTouch || !query) inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setQuery = (q: string) => setParams(q ? { q } : {}, { replace: true })
  const hasQuery = query.trim().length > 0

  return (
    <div className="pt-5 md:pt-8">
      <h1 className="sr-only">{t('search.title')}</h1>
      <form role="search" onSubmit={(e) => { e.preventDefault(); inputRef.current?.blur() }} className="relative">
        <Search size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          aria-label={t('search.label')}
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-14 w-full rounded-xl border border-line-strong bg-surface pr-12 pl-12 text-base outline-none placeholder:text-subtle focus:border-brand/60 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label={t('common.close')} className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-white/10 hover:text-fg">
            <X size={16} aria-hidden />
          </button>
        )}
      </form>

      <div className="mt-6" aria-live="polite">
        {!hasQuery ? (
          <>
            <p className="display-title text-xl">{t('search.emptyTitle')}</p>
            <p className="mt-1 text-sm text-muted">{t('search.emptyHint')}</p>
            <h2 className="eyebrow mt-8 mb-3 text-subtle">{t('search.suggestions')}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {gamesService.getListedCategories().map((c) => {
                const Icon = categoryIcons[c.id]
                return (
                  <Link key={c.id} to={`/category/${c.id}`} className="surface flex items-center gap-3 rounded-card p-3.5 text-sm font-semibold transition-colors hover:bg-card-hover">
                    <Icon size={18} className="text-brand" aria-hidden />
                    {t(`categories.${c.id}`)}
                  </Link>
                )
              })}
            </div>
          </>
        ) : results.length ? (
          <>
            <p className="mb-4 text-sm text-muted">
              <span className="font-semibold text-fg">{t('search.resultsFor', { query: query.trim() })}</span> · {t('search.resultsCount', { count: results.length })}
            </p>
            <GameGrid games={results} source="search_page" />
          </>
        ) : (
          <EmptyState icon={SearchX} title={t('search.noResults', { query: query.trim() })} text={t('search.noResultsHint')} />
        )}
      </div>
    </div>
  )
}
