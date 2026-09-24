// Acesso ao catálogo. Hoje lê de src/data; amanhã pode chamar a API.
// Componentes NUNCA importam src/data/games diretamente — sempre por aqui.
import { games } from '@/data/games'
import { categories } from '@/data/categories'
import type { Category, CategoryId, Game, GameBadge } from '@/types/game'
import { normalize } from '@/utils/text'

const NEW_WINDOW_DAYS = 60
const bySlug = new Map(games.map((g) => [g.slug, g]))

export type GameSort = 'all' | 'new' | 'popular' | 'trending' | 'az'

export const isPlayable = (g: Game) => g.status !== 'coming-soon' && Boolean(g.gameUrl)

export function isNewRelease(g: Game, now = Date.now()) {
  if (!g.releaseDate || g.status === 'coming-soon') return false
  const age = now - new Date(g.releaseDate + 'T00:00:00').getTime()
  return age >= 0 && age < NEW_WINDOW_DAYS * 86_400_000
}

/** Todos os badges aplicáveis, em ordem de prioridade visual. */
export function getGameBadges(g: Game): GameBadge[] {
  const badges: GameBadge[] = []
  if (g.status === 'coming-soon') badges.push('coming-soon')
  if (g.status === 'beta') badges.push('beta')
  if (isNewRelease(g)) badges.push('new')
  if (g.trending && g.status !== 'coming-soon') badges.push('trending')
  if (g.original) badges.push('original')
  return badges
}

const byRelease = (a: Game, b: Game) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '')
const byEditorial = (a: Game, b: Game) => (a.editorialRank ?? 999) - (b.editorialRank ?? 999)
/** Jogáveis primeiro, "em breve" depois. */
const playableFirst = (a: Game, b: Game) => Number(isPlayable(b)) - Number(isPlayable(a))

export const gamesService = {
  getAll: () => games,
  getBySlug: (slug: string | undefined) => (slug ? bySlug.get(slug) : undefined),
  getMany: (slugs: string[]) => slugs.map((s) => bySlug.get(s)).filter((g): g is Game => Boolean(g)),

  getCategories: () => categories,
  getListedCategories: () => categories.filter((c) => c.listed),
  getCategory: (id: string | undefined): Category | undefined => categories.find((c) => c.id === id),

  getFeatured: () => games.filter((g) => g.featured).sort(playableFirst),
  getNewReleases: () => games.filter((g) => g.status !== 'coming-soon').sort(byRelease),
  getTrending: () => games.filter((g) => g.trending && isPlayable(g)).sort(byEditorial),
  getOriginals: () => [...games].filter((g) => g.original).sort(playableFirst),
  getComingSoon: () => games.filter((g) => g.status === 'coming-soon'),
  getByCategory: (id: CategoryId) => games.filter((g) => g.categories.includes(id)).sort(playableFirst),

  list(sort: GameSort = 'all', category?: CategoryId): Game[] {
    let list = category ? games.filter((g) => g.categories.includes(category)) : [...games]
    switch (sort) {
      case 'new':
        list = list.filter((g) => g.status !== 'coming-soon').sort(byRelease)
        break
      case 'popular':
        list = list.filter(isPlayable).sort(byEditorial)
        break
      case 'trending':
        list = list.filter((g) => g.trending && isPlayable(g)).sort(byEditorial)
        break
      case 'az':
        list.sort((a, b) => a.title.localeCompare(b.title))
        break
      default:
        list.sort((a, b) => playableFirst(a, b) || byEditorial(a, b))
    }
    return list
  },

  /** Busca por nome, categoria (id ou rótulo) e tag. Ordena por relevância. */
  search(query: string, categoryLabel: (id: CategoryId) => string = (id) => id): Game[] {
    const q = normalize(query.trim())
    if (!q) return []
    const terms = q.split(/\s+/)
    const scored = games
      .map((g) => {
        const title = normalize(g.title)
        const cats = g.categories.map((c) => normalize(`${c} ${categoryLabel(c)} ${gamesService.getCategory(c)?.label ?? ''}`))
        const tags = g.tags.map(normalize)
        let score = 0
        for (const term of terms) {
          let hit = 0
          if (title.startsWith(term)) hit = 10
          else if (title.includes(term)) hit = 6
          if (cats.some((c) => c.includes(term))) hit = Math.max(hit, 4)
          if (tags.some((t) => t.includes(term))) hit = Math.max(hit, 3)
          if (!hit && normalize(g.shortDescription).includes(term)) hit = 1
          if (!hit) return { g, score: 0 }
          score += hit
        }
        if (isPlayable(g)) score += 0.5
        return { g, score }
      })
      .filter((r) => r.score > 0)
    return scored.sort((a, b) => b.score - a.score).map((r) => r.g)
  },

  /** Jogos parecidos: categorias/tags em comum, jogáveis primeiro. */
  getRelated(game: Game, limit = 8): Game[] {
    return games
      .filter((g) => g.slug !== game.slug)
      .map((g) => {
        const sharedCats = g.categories.filter((c) => game.categories.includes(c)).length
        const sharedTags = g.tags.filter((t) => game.tags.includes(t)).length
        return { g, score: sharedCats * 3 + sharedTags * 2 + (isPlayable(g) ? 1 : 0) + (g.original === game.original ? 0.5 : 0) }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.g)
  },
}
