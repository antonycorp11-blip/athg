import type { Game } from '@/types/game'

/**
 * Resolve a URL final da build.
 * - self-hosted: caminho relativo servido pela própria plataforma (/builds/<slug>/...)
 * - external: URL absoluta de outro domínio (precisa permitir embed via iframe)
 * Futuro: aqui entra CDN de builds, versionamento (?v=) ou URLs assinadas.
 */
export function resolveGameUrl(game: Game): string {
  if (!game.gameUrl) return ''
  if (game.hosting === 'external') return game.gameUrl
  return game.gameUrl.startsWith('/') ? game.gameUrl : `/builds/${game.slug}/${game.gameUrl}`
}
