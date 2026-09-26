# ATHG — plataforma de jogos web (V1)

Jogue direto no navegador. Sem instalação.

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · React Router 7. Sem backend na V1.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build + páginas SEO + sitemap
npm run preview    # testa o build de produção
```

## Publicação (Cloudflare)

No ar em https://athg.antonycorp11.workers.dev — cada push na `main` publica.

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Variável de ambiente:** `VITE_SITE_URL=https://seu-dominio` (canonical, Open Graph, sitemap). Sem ela, usa `https://athg.antonycorp11.workers.dev`.
- Node 22 (arquivo `.node-version`).

O build gera HTML estático com título/descrição/OG/JSON-LD próprios para cada jogo (`/game/<slug>`), categoria e página principal, além de `sitemap.xml` e `robots.txt`. As demais rotas caem no modo SPA da Cloudflare (não crie `404.html`).

## Adicionar um jogo

1. Em [`src/data/games.ts`](src/data/games.ts), copie um bloco e ajuste os campos.
2. Artes em `public/games/<slug>/` → preencha `thumbnail` (16:9), `banner` e `screenshots`.
   Sem arte, a plataforma gera um placeholder a partir de `theme` (cores + motivo).
3. Build do jogo:
   - **Hospedada na ATHG:** copie para `public/builds/<slug>/` e use `gameUrl: '/builds/<slug>/'` (com barra no fim: a Cloudflare redireciona `index.html`), `hosting: 'self-hosted'`.
   - **Em outro domínio:** `gameUrl` absoluto + `hosting: 'external'` (o domínio precisa permitir iframe). Roda em sandbox.
   - Jogos de **terceiros** devem ficar em um domínio separado do portal, nunca em `/builds`.

> Hemofazenda (`hemofarm.antonycorp11.workers.dev`) e Profund.io (`profund-io.antonycorp11.workers.dev`) rodam como projetos próprios na Cloudflare. `/builds/sandbox/` é só uma build de teste da ponte portal ↔ jogo.

Destaque da Home: [`src/data/home.ts`](src/data/home.ts). Categorias: [`src/data/categories.ts`](src/data/categories.ts).

## SDK do jogo (portal ↔ jogo)

Inclua no jogo:

```html
<script src="https://SEU-DOMINIO/sdk/athg-sdk.js"></script>
<script>
  ATHG.ready()                                 // assim que carregar
  ATHG.gameStarted()
  ATHG.updateScore(1500)                       // ranking
  ATHG.gameOver(1500)
  ATHG.unlockAchievement('hemofazenda-first-harvest')
  await ATHG.save({ nivel: 3 })                // hoje: dispositivo; futuro: nuvem
  const save = await ATHG.load()
  const ad = await ATHG.showRewardedAd()       // { status, rewarded } — hoje sempre 'unavailable'
  ATHG.on('pause', () => {}); ATHG.on('resume', () => {})
</script>
```

Fora do portal, o SDK cai para `localStorage` e o jogo roda normalmente. Protocolo: [`src/types/bridge.ts`](src/types/bridge.ts). Os ids de conquista ficam em [`src/data/achievements.ts`](src/data/achievements.ts).

## Arquitetura

```
src/
  components/   ui (design system) · layout · games · player · home · profile · ranking · achievements · pass · ads
  pages/        uma página por rota (carregadas sob demanda)
  data/         catálogo, categorias, conquistas, curadoria da home · data/demo = dados demonstrativos
  services/     gamesService, library (favoritos/histórico), analytics, ads, gameBridge, saveService,
                profileService, rankingService, achievementService, reportService
  hooks/        acesso reativo aos services (useFavorites, useProfile, useSeo, usePlaySession…)
  locales/      pt-BR (base) · en · es (parcial, cai para pt-BR)
  types/        contratos de dados (Game, PlayerProfile, Leaderboard, Achievement, mensagens da bridge)
```

Componentes nunca leem `src/data` direto: sempre via `services/`. Para ligar uma API, troque a implementação do service; a UI não muda. Os pontos de extensão prontos:

| Futuro | Onde plugar |
|---|---|
| Google Analytics / outro | `analytics.setProvider()` em `main.tsx` |
| Anúncios (display, interstitial, rewarded) | `adService.setProvider()` — `AdSlot` já está posicionado e hoje não renderiza nada |
| Save em nuvem | `saveService.setProvider()` |
| Login / perfil real | `profileService` + `identityStore` |
| Rankings reais | `rankingService.getLeaderboard()` |
| Reports | `reportService.submit()` → `POST /api/reports` |

## Backend (Supabase — projeto ATHG `kdcgdkzdjdkebadnupgu`, São Paulo)

- **Contas:** obrigatórias para jogar (email + senha, sem confirmação por email). Só Gmail, Outlook/Hotmail/Live e iCloud: lista em `src/config/site.ts` e no gatilho `enforce_account_email` em `auth.users`, que também recusa contas anônimas. Convidados antigos que ainda tenham sessão têm o progresso transferido ao criar conta (`merge_guest`).
- **Dados:** perfis, sessões de jogo (tempo ativo validado no servidor), favoritos, conquistas, pontuações, saves, eventos e reports — todos com RLS.
- **Painel admin:** `/admin`, só para contas em `public.app_admins`. Para adicionar um admin (SQL Editor do Supabase):
  `insert into app_admins (user_id) select id from auth.users where email = 'email@da.conta';`
- **Configuração no painel do Supabase:** Authentication → Sign In / Providers → *Allow anonymous sign-ins* desligado e *Confirm email* desligado; Authentication → URL Configuration → Site URL e Redirect URLs (`https://athg.antonycorp11.workers.dev/**`, `http://localhost:5173/**`).
- Chave publicável e URL ficam em `src/config/site.ts` (públicas por natureza; a segurança é o RLS). **Nunca** use a chave secret no site.

## O que é real e o que é demo

- **Real:** contas, progresso, horas jogadas, favoritos, conquistas da plataforma, rankings (Geral = minutos nos últimos 7 dias; jogos = melhor pontuação), saves e reports.
- **Aguardando integração dos jogos (SDK):** conquistas e pontuações de cada jogo.
- **Visual apenas:** ATHG Pass (sem checkout).
