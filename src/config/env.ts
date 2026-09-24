import { normalizeSiteUrl, supabaseDefaults } from './site'

/** URL pública (VITE_SITE_URL). Usada em canonical, Open Graph e compartilhamento. */
export const SITE_URL = normalizeSiteUrl(import.meta.env.VITE_SITE_URL)

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || supabaseDefaults.url
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || supabaseDefaults.publishableKey
