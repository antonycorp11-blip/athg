// Tipos centrais do catálogo de jogos.
// Estes tipos são o "contrato" entre dados locais hoje e uma API no futuro.

export type CategoryId =
  | 'incremental'
  | 'gerenciamento'
  | 'estrategia'
  | 'aventura'
  | 'progressao'
  | 'simulacao'
  | 'musica'
  | 'educacao'
  | 'casual'
  | 'multiplayer'

export interface Category {
  id: CategoryId
  /** Rótulo em pt-BR. A tradução da UI fica em locales (categories.<id>). */
  label: string
  /** Aparece na sidebar/lista principal de categorias. */
  listed: boolean
  description: string
}

/** released = jogável | coming-soon = em desenvolvimento | beta = jogável, mas instável */
export type GameStatus = 'released' | 'beta' | 'coming-soon'

export type Orientation = 'landscape' | 'portrait' | 'any'

/**
 * Como a build do jogo é servida:
 * - external: URL de outro domínio carregada via iframe (precisa permitir embed)
 * - self-hosted: build estática copiada para /public/builds/<slug>/ (mesma origem)
 */
export type GameHosting = 'external' | 'self-hosted'

/** Motivo visual usado pelo placeholder elegante enquanto não há arte oficial. */
export type ArtMotif = 'blood' | 'depths' | 'territory' | 'waves' | 'growth' | 'grid'

export interface GameTheme {
  /** Cor dominante (hex) — usada em glows e placeholders. */
  primary: string
  /** Cor secundária (hex). */
  secondary: string
  motif: ArtMotif
}

export interface Game {
  id: string
  slug: string
  /** Slugs antigos: links velhos redirecionam para o atual. */
  previousSlugs?: string[]
  title: string
  /** Frase de efeito curta (hero). */
  tagline?: string
  shortDescription: string
  description: string
  /** Imagem 16:9 do card. Sem valor = placeholder gerado a partir de `theme`. */
  thumbnail?: string
  /** Imagem grande (hero/página do jogo). Sem valor = placeholder. */
  banner?: string
  /** URL da build. Relativa (/builds/...) para self-hosted ou absoluta para external. */
  gameUrl?: string
  hosting: GameHosting
  categories: CategoryId[]
  tags: string[]
  featured: boolean
  /** Produzido oficialmente pela ATHG. */
  original: boolean
  /** Curadoria editorial: aparece em "Em alta". Não é métrica inventada. */
  trending?: boolean
  /** Ordem editorial para "Mais jogados" enquanto não há métricas reais (menor = primeiro). */
  editorialRank?: number
  status: GameStatus
  /**
   * Prévia de desenvolvimento: com status 'coming-soon', contas admin (app_admins) já podem jogar.
   * Para o público o jogo continua "Em breve". Controle só de interface: a build em /builds é pública.
   */
  adminPreview?: boolean
  /** ISO yyyy-mm-dd */
  releaseDate?: string
  developer: string
  supportsMobile: boolean
  orientation: Orientation
  /** Proporção da área de jogo, ex: "16/9". Padrão depende da orientação. */
  aspectRatio?: string
  instructions: string[]
  screenshots: string[]
  theme: GameTheme
}

export type GameBadge = 'new' | 'trending' | 'original' | 'coming-soon' | 'beta'
