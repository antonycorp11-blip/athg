// Configuração pública da plataforma. Dados puros (lido também no build).
export const DEFAULT_SITE_URL = 'https://athg.antonycorp11.workers.dev'

export const site = {
  name: 'ATHG',
  defaultOgImage: '/brand/og-default.jpg',
  logo: '/brand/icon-512.png',
  themeColor: '#060B14',
  /** @handle do X/Twitter quando existir, ex: '@athggames' */
  twitterHandle: '',
  /** Contato público (privacidade/LGPD e suporte). */
  contactEmail: 'antonycorp11@gmail.com',
}

export const normalizeSiteUrl = (url: string | undefined) => (url || DEFAULT_SITE_URL).replace(/\/+$/, '')

// Supabase (backend). A URL e a chave publicável são públicas por natureza:
// a segurança vem das regras RLS do banco. NUNCA coloque a chave secret aqui.
export const supabaseDefaults = {
  url: 'https://kdcgdkzdjdkebadnupgu.supabase.co',
  publishableKey: 'sb_publishable_ANUtklosjEqev3UXEFeEwA_WANBDrcW',
}
