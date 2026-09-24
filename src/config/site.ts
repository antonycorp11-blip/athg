// Configuração pública da plataforma. Dados puros (lido também no build).
export const DEFAULT_SITE_URL = 'https://athg.antonycorp11.workers.dev'

export const site = {
  name: 'ATHG',
  defaultOgImage: '/brand/og-default.jpg',
  logo: '/brand/icon-512.png',
  themeColor: '#060B14',
  /** @handle do X/Twitter quando existir, ex: '@athggames' */
  twitterHandle: '',
}

export const normalizeSiteUrl = (url: string | undefined) => (url || DEFAULT_SITE_URL).replace(/\/+$/, '')
