// Gera, no build, HTML estático com meta tags próprias para cada rota indexável
// (/game/:slug, /category/:id, páginas principais) + sitemap.xml + robots.txt.
// Crawlers e previews de redes sociais recebem título/OG corretos sem executar JS.
// Arquivos saem como /game/<slug>.html — o Cloudflare Pages serve /game/<slug> direto.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Plugin } from 'vite'
import { games } from '../src/data/games.ts'
import { categories } from '../src/data/categories.ts'
import { translate } from '../src/i18n/translate.ts'
import type { TranslationKey, TranslationVars } from '../src/locales/types.ts'
import { absoluteUrl, categoryMeta, gameMeta, staticPages, websiteJsonLd, type PageMeta } from '../src/utils/seo.ts'
import { site } from '../src/config/site.ts'

const t = (key: TranslationKey, vars?: TranslationVars) => translate('pt-BR', key, vars)

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function headTags(meta: PageMeta, siteUrl: string) {
  const url = siteUrl + meta.path
  const image = absoluteUrl(siteUrl, meta.image ?? site.defaultOgImage)
  const e = escapeHtml
  const tags = [
    `<title>${e(meta.title)}</title>`,
    `<meta name="description" content="${e(meta.description)}" />`,
    `<link rel="canonical" href="${e(url)}" />`,
    meta.noindex ? `<meta name="robots" content="noindex" />` : '',
    `<meta property="og:site_name" content="${site.name}" />`,
    `<meta property="og:type" content="${meta.type ?? 'website'}" />`,
    `<meta property="og:title" content="${e(meta.title)}" />`,
    `<meta property="og:description" content="${e(meta.description)}" />`,
    `<meta property="og:url" content="${e(url)}" />`,
    `<meta property="og:image" content="${e(image)}" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${e(meta.title)}" />`,
    `<meta name="twitter:description" content="${e(meta.description)}" />`,
    `<meta name="twitter:image" content="${e(image)}" />`,
    site.twitterHandle ? `<meta name="twitter:site" content="${site.twitterHandle}" />` : '',
    meta.jsonLd
      ? `<script type="application/ld+json" id="ld-json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`
      : '',
  ]
  return tags.filter(Boolean).join('\n    ')
}

const SEO_BLOCK = /<!--seo:start-->[\s\S]*?<!--seo:end-->/

export function seoPlugin(siteUrl: string): Plugin {
  let outDir = 'dist'
  return {
    name: 'athg-seo',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    async closeBundle() {
      const template = await readFile(join(outDir, 'index.html'), 'utf8')
      if (!SEO_BLOCK.test(template)) throw new Error('[athg-seo] index.html sem bloco <!--seo:start-->')

      const pages: { file: string; meta: PageMeta }[] = [
        {
          file: 'index.html',
          meta: { title: t('seo.defaultTitle'), description: t('seo.defaultDescription'), path: '/', jsonLd: websiteJsonLd(siteUrl) },
        },
        ...games.map((g) => ({ file: `game/${g.slug}.html`, meta: gameMeta(g, t, siteUrl) })),
        ...categories.map((c) => ({ file: `category/${c.id}.html`, meta: categoryMeta(c, t) })),
        ...staticPages.map((p) => ({
          file: `${p.path.slice(1)}.html`,
          meta: { title: t(p.titleKey), description: t(p.descriptionKey ?? 'seo.defaultDescription'), path: p.path },
        })),
      ]

      for (const { file, meta } of pages) {
        const html = template.replace(SEO_BLOCK, `<!--seo:start-->\n    ${headTags(meta, siteUrl)}\n    <!--seo:end-->`)
        const target = join(outDir, file)
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, html)
      }

      const today = new Date().toISOString().slice(0, 10)
      const urls = pages
        .map((p) => p.meta.path)
        .map((path) => `  <url><loc>${siteUrl}${path === '/' ? '/' : path}</loc><lastmod>${today}</lastmod></url>`)
      await writeFile(
        join(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      )
      await writeFile(
        join(outDir, 'robots.txt'),
        `User-agent: *\nAllow: /\nDisallow: /play/\nDisallow: /builds/\nDisallow: /profile\nDisallow: /favorites\nDisallow: /search\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
      )
      console.log(`[athg-seo] ${pages.length} páginas + sitemap.xml + robots.txt (${siteUrl})`)
    },
  }
}
