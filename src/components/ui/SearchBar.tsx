import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { Search, X, ArrowRight } from 'lucide-react'
import { gamesService, isPlayable } from '@/services/gamesService'
import { analytics } from '@/services/analytics'
import { useTranslation } from '@/i18n/useTranslation'
import { GameArt } from '@/components/games/GameArt'
import { Badge } from './Badge'
import { cn } from '@/utils/cn'

const MAX_RESULTS = 6

/** Hook de busca compartilhado (dropdown do header e página /search). */
export function useGameSearch(query: string) {
  const { t } = useTranslation()
  return useMemo(() => gamesService.search(query, (id) => t(`categories.${id}`)), [query, t])
}

/** Registra o termo buscado (uma vez por termo estabilizado). */
export function useTrackSearch(query: string, resultCount: number) {
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const id = setTimeout(() => analytics.track('search', { query: q, results: resultCount }), 900)
    return () => clearTimeout(id)
  }, [query, resultCount])
}

/** Barra de busca do header: resultados em tempo real num dropdown (combobox ARIA). */
export function SearchBar({ className }: { className?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const results = useGameSearch(query).slice(0, MAX_RESULTS)
  const hasQuery = query.trim().length > 0
  useTrackSearch(query, results.length)

  // Atalho global: "/" foca a busca
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key !== '/' || target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const reset = () => {
    setQuery('')
    setOpen(false)
    setActive(-1)
    inputRef.current?.blur()
  }

  const goToGame = (slug: string) => {
    analytics.track('game_card_clicked', { game: slug, source: 'search_dropdown' })
    navigate(`/game/${slug}`)
    reset()
  }

  const goToResults = () => {
    if (!hasQuery) return
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    reset()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && results[active]) goToGame(results[active].slug)
      else goToResults()
    } else if (e.key === 'Escape') {
      if (query) setQuery('')
      else inputRef.current?.blur()
      setOpen(false)
    }
  }

  const showDropdown = open && hasQuery

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="group relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label={t('search.label')}
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-full border border-line bg-white/[0.04] pr-9 pl-9 text-sm text-fg placeholder:text-subtle transition-colors outline-none hover:border-line-strong focus:border-brand/60 focus:bg-white/[0.06] [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            aria-label={t('common.close')}
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-white/10 hover:text-fg"
          >
            <X size={14} aria-hidden />
          </button>
        ) : (
          <kbd
            title={t('search.shortcut')}
            className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-line-strong px-1.5 font-sans text-[11px] text-subtle lg:block"
          >
            /
          </kbd>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-[calc(100%+8px)] right-0 left-0 z-50 min-w-[320px] animate-fade-in overflow-hidden rounded-xl border border-line-strong bg-[#0d1626]/98 shadow-2xl backdrop-blur-xl">
          <ul id={listId} role="listbox" aria-label={t('search.label')} className="p-1.5">
            {results.map((game, i) => (
              <li
                key={game.slug}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => goToGame(game.slug)}
                className={cn('flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors', i === active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]')}
              >
                <span className="aspect-video w-20 shrink-0 overflow-hidden rounded-md ring-1 ring-line">
                  <GameArt game={game} showTitle={false} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{game.title}</span>
                  <span className="block truncate text-xs text-muted">{game.categories.map((c) => t(`categories.${c}`)).join(' · ')}</span>
                </span>
                {!isPlayable(game) && <Badge tone="violet">{t('badges.coming-soon')}</Badge>}
              </li>
            ))}
          </ul>
          {results.length === 0 ? (
            <div className="px-4 pt-2 pb-5 text-center">
              <p className="text-sm font-semibold">{t('search.noResults', { query: query.trim() })}</p>
              <p className="mt-0.5 text-xs text-muted">{t('search.noResultsHint')}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={goToResults}
              className="flex w-full items-center justify-between border-t border-line px-4 py-3 text-[13px] font-semibold text-muted transition-colors hover:bg-white/[0.04] hover:text-fg"
            >
              {t('search.seeAllResults')}
              <ArrowRight size={15} aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
