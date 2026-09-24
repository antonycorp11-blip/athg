import type { Game } from '../types/game.ts'

// ============================================================================
// CATÁLOGO DE JOGOS ATHG
// ----------------------------------------------------------------------------
// Para adicionar um jogo:
//   1. Copie um bloco abaixo e ajuste os campos.
//   2. Coloque as artes em /public/games/<slug>/ (thumbnail 16:9, banner, screenshots)
//      e aponte `thumbnail`, `banner` e `screenshots` para elas.
//      Sem arte? Deixe vazio: a plataforma gera um placeholder a partir de `theme`.
//   3. Build própria: copie para /public/builds/<slug>/ e use
//      gameUrl: '/builds/<slug>/' + hosting: 'self-hosted'.
//      Build em outro domínio: gameUrl absoluto + hosting: 'external'.
//
// IMPORTANTE: este arquivo é lido também no build (SEO/sitemap), então use
// apenas imports relativos e dados puros aqui.
// ============================================================================

export const games: Game[] = [
  {
    id: 'hemofazenda',
    slug: 'hemofazenda',
    previousSlugs: ['hemofarm'],
    title: 'Hemofazenda',
    tagline: 'Construa sua fazenda de sangue.',
    shortDescription:
      'Herde uma fazenda vampírica, pague o Dízimo do castelo e defenda suas terras dos lobisomens.',
    description:
      'Você herdou uma fazenda de sangue — e, com ela, uma dívida com o castelo. Toda noite chega o Dízimo, e a cota só cresce. Construa casas e hortas, cuide dos humanos que vivem ali, pesquise com o Dr. Hemático e feche contratos para manter a produção de pé. Quando a lua cheia sobe, os lobisomens atacam: monte a defesa e proteja o que é seu. Falhe três vezes com o castelo e perde tudo.',
    thumbnail: '/games/hemofazenda/thumbnail.webp',
    banner: '/games/hemofazenda/banner.jpg',
    gameUrl: 'https://hemofarm.antonycorp11.workers.dev/',
    hosting: 'external',
    categories: ['gerenciamento', 'estrategia'],
    tags: ['Vampiros', 'Fazenda', 'Lobisomens', 'Singleplayer'],
    featured: true,
    original: true,
    trending: true,
    editorialRank: 1,
    status: 'released',
    releaseDate: '2026-09-15',
    developer: 'ATHG',
    supportsMobile: true,
    orientation: 'landscape',
    instructions: [
      'Arraste para mover o mapa e toque (ou clique) nos humanos e construções para interagir.',
      'Construa casas e hortas: gente com teto e comida produz mais.',
      'Cumpra a cota do Dízimo a cada noite — três falhas e o castelo confisca a fazenda.',
      'Pesquise melhorias no Laboratório e prepare a defesa para as noites de lua cheia.',
    ],
    screenshots: [],
    theme: { primary: '#C8163A', secondary: '#2A0612', motif: 'blood' },
  },
  {
    id: 'profundio',
    slug: 'profundio',
    title: 'Profund.io',
    tagline: 'Quanto mais fundo, mais perto da verdade.',
    shortDescription: 'Desça na mina onde seu pai desapareceu: cave, explore cidades subterrâneas e vá cada vez mais fundo.',
    description:
      'Há 14 anos, Santiago Ramires desceu na mina e nunca mais voltou. Agora é a vez do filho, Elias. Cave, encontre pistas, resgate quem ficou para trás e monte uma operação industrial lá embaixo. Quatro cidades subterrâneas guardam as passagens para as camadas mais profundas — e cada uma só abre caminho para quem a serviu.',
    thumbnail: '/games/profundio/thumbnail.webp',
    banner: '/games/profundio/banner.jpg',
    // TODO: trocar pela URL da Cloudflare quando o projeto "profundio" estiver no ar.
    gameUrl: '/builds/sandbox/?game=profundio',
    hosting: 'self-hosted',
    categories: ['aventura', 'progressao'],
    tags: ['Mineração', 'Exploração', 'Mistério', 'Singleplayer'],
    featured: true,
    original: true,
    trending: true,
    editorialRank: 2,
    status: 'released',
    releaseDate: '2026-08-28',
    developer: 'ATHG',
    supportsMobile: true,
    orientation: 'landscape',
    instructions: [
      'Feito para o celular deitado — no computador, também roda no navegador.',
      'Cave para abrir caminho, colete minérios e volte para melhorar seu equipamento.',
      'Converse com os moradores das cidades subterrâneas e siga as pistas do seu pai.',
      'Automatize a operação para render mais enquanto você desce.',
    ],
    screenshots: [],
    theme: { primary: '#0FB5C9', secondary: '#04213D', motif: 'depths' },
  },
  {
    id: 'hemofazenda-incremental',
    slug: 'hemofazenda-incremental',
    previousSlugs: ['hemofarm-incremental'],
    title: 'Hemofazenda Incremental',
    tagline: 'A fazenda nunca dorme.',
    shortDescription: 'O universo de Hemofazenda em formato incremental. Produza, automatize e escale.',
    description:
      'Uma nova forma de viver Hemofazenda: números crescendo, automações encadeadas e prestígio. Em desenvolvimento pela ATHG.',
    hosting: 'self-hosted',
    categories: ['incremental'],
    tags: ['Vampiros', 'Idle', 'Automação'],
    featured: false,
    original: true,
    status: 'coming-soon',
    developer: 'ATHG',
    supportsMobile: true,
    orientation: 'any',
    instructions: [],
    screenshots: [],
    theme: { primary: '#E23A5B', secondary: '#240A2B', motif: 'growth' },
  },
  {
    id: 'territory',
    slug: 'territory',
    title: 'Territory',
    tagline: 'Cada metro conta.',
    shortDescription: 'Estratégia de território: expanda, defenda e domine o mapa.',
    description:
      'Territory é um jogo de estratégia sobre ocupar espaço e tomar decisões rápidas. Expanda suas fronteiras, proteja o que é seu e domine o mapa. Em desenvolvimento pela ATHG.',
    hosting: 'self-hosted',
    categories: ['estrategia'],
    tags: ['Mapa', 'Conquista'],
    featured: false,
    original: true,
    status: 'coming-soon',
    developer: 'ATHG',
    supportsMobile: true,
    orientation: 'landscape',
    instructions: [],
    screenshots: [],
    theme: { primary: '#8B5CF6', secondary: '#15123A', motif: 'territory' },
  },
  {
    id: 'athg-music',
    slug: 'athg-music',
    title: 'ATHG Music',
    tagline: 'Aprenda música jogando.',
    shortDescription: 'Ritmo, ouvido e teoria musical em desafios rápidos e viciantes.',
    description:
      'ATHG Music transforma o estudo de música em jogo: ritmo, percepção e teoria em desafios curtos, feitos para jogar todos os dias. Em desenvolvimento.',
    hosting: 'self-hosted',
    categories: ['musica', 'educacao'],
    tags: ['Ritmo', 'Aprendizado'],
    featured: false,
    original: false,
    status: 'coming-soon',
    developer: 'ATHG',
    supportsMobile: true,
    orientation: 'any',
    instructions: [],
    screenshots: [],
    theme: { primary: '#15C8FF', secondary: '#0A1F5C', motif: 'waves' },
  },
]
