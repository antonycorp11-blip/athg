import { useEffect } from 'react'
import { SITE_URL } from '@/config/env'
import { site } from '@/config/site'
import { absoluteUrl, type PageMeta } from '@/utils/seo'

function setTag(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

function meta(key: 'name' | 'property', id: string, content: string) {
  const create = () => {
    const el = document.createElement('meta')
    el.setAttribute(key, id)
    return el
  }
  setTag(`meta[${key}="${id}"]`, create, 'content', content)
}

/** Atualiza title, description, canonical, Open Graph, Twitter e JSON-LD da página. */
export function useSeo(page: PageMeta | null) {
  const key = page ? JSON.stringify(page) : ''
  useEffect(() => {
    if (!page) return
    const url = SITE_URL + page.path
    const image = absoluteUrl(SITE_URL, page.image ?? site.defaultOgImage)
    document.title = page.title
    meta('name', 'description', page.description)
    meta('name', 'robots', page.noindex ? 'noindex' : 'index,follow')
    meta('property', 'og:title', page.title)
    meta('property', 'og:description', page.description)
    meta('property', 'og:type', page.type ?? 'website')
    meta('property', 'og:url', url)
    meta('property', 'og:image', image)
    meta('name', 'twitter:card', 'summary_large_image')
    meta('name', 'twitter:title', page.title)
    meta('name', 'twitter:description', page.description)
    meta('name', 'twitter:image', image)
    setTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', url)

    const existing = document.getElementById('ld-json')
    if (page.jsonLd) {
      const script = existing ?? Object.assign(document.createElement('script'), { id: 'ld-json', type: 'application/ld+json' })
      script.textContent = JSON.stringify(page.jsonLd)
      if (!existing) document.head.appendChild(script)
    } else existing?.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
