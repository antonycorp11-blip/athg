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
//      gameUrl: '/builds/<slug>/index.html' + hosting: 'self-hosted'.
//      Build em outro domínio: gameUrl absoluto + hosting: 'external'.
//
// IMPORTANTE: este arquivo é lido também no build (SEO/sitemap), então use
// apenas imports relativos e dados puros aqui.
// ============================================================================

export const games: Game[] = [
  {
    id: 'hemofarm',
    slug: 'hemofarm',
    title: 'Hemofarm',
    tagline: 'Construa sua fazenda de sangue.',
    shortDescription:
      'Gerencie uma fazenda vampírica, otimize a produção e mantenha seu império bem alimentado.',
    description:
      'Você é um vampiro com um problema de abastecimento. Em Hemofarm, você monta, expande e administra a sua própria fazenda de sangue. Planeje a produção, gerencie recursos, desbloqueie melhorias e tome decisões estratégicas para que o seu império noturno nunca passe fome.',
    // TODO: trocar pela build real do Hemofarm (URL externa ou /builds/hemofarm/index.html).
    gameUrl: '/builds/sandbox/index.html?game=hemofarm',
    hosting: 'self-hosted',
    categories: ['gerenciamento', 'estrategia'],
    tags: ['Vampiros', 'Fazenda', 'Singleplayer'],
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
      'Use o mouse (ou toque, no celular) para interagir com a fazenda.',
      'Construa estruturas para aumentar a produção de sangue.',
      'Reinvista os recursos em melhorias para crescer mais rápido.',
      'Equilibre expansão e manutenção: um império faminto não dura.',
    ],
    screenshots: [],
    theme: { primary: '#C8163A', secondary: '#2A0612', motif: 'blood' },
  },
  {
    id: 'profundio',
    slug: 'profundio',
    title: 'Profund.io',
    tagline: 'Quanto mais fundo, melhor.',
    shortDescription: 'Explore as profundezas, colete recursos e evolua para descer cada vez mais.',
    description:
      'Profund.io é uma aventura de progressão sobre ir além do limite. Explore camadas cada vez mais profundas, colete recursos, melhore seu equipamento e descubra o que existe lá embaixo. Cada descida deixa você mais forte para a próxima.',
    // TODO: trocar pela build real do Profund.io.
    gameUrl: '/builds/sandbox/index.html?game=profundio',
    hosting: 'self-hosted',
    categories: ['aventura', 'progressao'],
    tags: ['Exploração', 'Upgrades', 'Singleplayer'],
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
      'Use o mouse ou toque para explorar e coletar recursos.',
      'Invista os recursos em melhorias para alcançar camadas mais profundas.',
      'Volte à superfície quando precisar e planeje a próxima descida.',
    ],
    screenshots: [],
    theme: { primary: '#0FB5C9', secondary: '#04213D', motif: 'depths' },
  },
  {
    id: 'hemofarm-incremental',
    slug: 'hemofarm-incremental',
    title: 'Hemofarm Incremental',
    tagline: 'A fazenda nunca dorme.',
    shortDescription: 'O universo de Hemofarm em formato incremental. Produza, automatize e escale.',
    description:
      'Uma nova forma de viver Hemofarm: números crescendo, automações encadeadas e prestígio. Em desenvolvimento pela ATHG.',
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
