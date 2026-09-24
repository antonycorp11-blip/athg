import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { seoPlugin } from './scripts/vite-plugin-seo.ts'
import { normalizeSiteUrl } from './src/config/site.ts'

// Dev: /builds/<jogo>/ deve servir o index.html da build (como a Cloudflare faz),
// e não cair no fallback da SPA.
const buildsIndex: Plugin = {
  name: 'athg-builds-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && /^\/builds\/[^?]+\/(\?|$)/.test(req.url)) req.url = req.url.replace(/\/(\?|$)/, '/index.html$1')
      next()
    })
  },
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss(), buildsIndex, seoPlugin(normalizeSiteUrl(env.VITE_SITE_URL))],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      assetsInlineLimit: 2048,
    },
  }
})
