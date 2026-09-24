import { normalizeSiteUrl } from './site'

/** URL pública (VITE_SITE_URL). Usada em canonical, Open Graph e compartilhamento. */
export const SITE_URL = normalizeSiteUrl(import.meta.env.VITE_SITE_URL)
