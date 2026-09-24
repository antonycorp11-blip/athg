// Metadados de SEO como dados puros: usados no runtime (useSeo) e no build
// (vite-plugin-seo gera HTML estático por jogo/categoria + sitemap).
import type { Category, Game } from '../types/game.ts'
import type { Translator } from '../i18n/translate.ts'
import { site } from '../config/site.ts'

export interface PageMeta {
  title: string
  description: string
  /** Caminho canônico, ex: /game/hemofazenda */
  path: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
  jsonLd?: Record<string, unknown>
}

export const absoluteUrl = (siteUrl: string, path: string) => (/^https?:\/\//.test(path) ? path : siteUrl + path)

export function truncate(text: string, max = 160) {
  return text.length <= max ? text : text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

export function gameMeta(game: Game, t: Translator, siteUrl: string): PageMeta {
  const path = `/game/${game.slug}`
  const image = game.banner ?? game.thumbnail ?? site.defaultOgImage
  return {
    title: t('seo.gameTitle', { title: game.title }),
    description: truncate(t('seo.gameDescription', { description: game.shortDescription, title: game.title })),
    path,
    image,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: game.title,
      description: game.shortDescription,
      url: siteUrl + path,
      image: absoluteUrl(siteUrl, image),
      genre: game.categories.map((c) => t(`categories.${c}`)),
      gamePlatform: ['Web browser'],
      applicationCategory: 'Game',
      operatingSystem: 'Any',
      inLanguage: 'pt-BR',
      ...(game.releaseDate ? { datePublished: game.releaseDate } : {}),
      author: { '@type': 'Organization', name: game.developer },
      publisher: { '@type': 'Organization', name: site.name },
      ...(game.status !== 'coming-soon'
        ? { offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' } }
        : {}),
    },
  }
}

export function categoryMeta(category: Category, t: Translator): PageMeta {
  const name = t(`categories.${category.id}`)
  return {
    title: t('seo.categoryTitle', { category: name }),
    description: truncate(t('seo.categoryDescription', { category: name.toLowerCase(), description: category.description })),
    path: `/category/${category.id}`,
  }
}

export function websiteJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

/** Páginas estáticas indexáveis (usado no sitemap e no HTML pré-gerado). */
export const staticPages: { path: string; titleKey: Parameters<Translator>[0]; descriptionKey?: Parameters<Translator>[0] }[] = [
  { path: '/games', titleKey: 'seo.gamesTitle' },
  { path: '/news', titleKey: 'seo.newsTitle' },
  { path: '/rankings', titleKey: 'seo.rankingsTitle' },
  { path: '/achievements', titleKey: 'seo.achievementsTitle' },
  { path: '/pass', titleKey: 'seo.passTitle', descriptionKey: 'seo.passDescription' },
]
