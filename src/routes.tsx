import { lazy } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteError } from '@/components/layout/RouteError'

// Code splitting por rota: cada página vira um chunk carregado sob demanda.
const load = {
  home: () => import('@/pages/HomePage'),
  games: () => import('@/pages/GamesPage'),
  game: () => import('@/pages/GamePage'),
  play: () => import('@/pages/PlayPage'),
  search: () => import('@/pages/SearchPage'),
  favorites: () => import('@/pages/FavoritesPage'),
  news: () => import('@/pages/NewsPage'),
  rankings: () => import('@/pages/RankingsPage'),
  achievements: () => import('@/pages/AchievementsPage'),
  pass: () => import('@/pages/PassPage'),
  profile: () => import('@/pages/ProfilePage'),
  notFound: () => import('@/pages/NotFoundPage'),
}

const HomePage = lazy(load.home)
const GamesPage = lazy(load.games)
const GamePage = lazy(load.game)
const PlayPage = lazy(load.play)
const SearchPage = lazy(load.search)
const FavoritesPage = lazy(load.favorites)
const NewsPage = lazy(load.news)
const RankingsPage = lazy(load.rankings)
const AchievementsPage = lazy(load.achievements)
const PassPage = lazy(load.pass)
const ProfilePage = lazy(load.profile)
const NotFoundPage = lazy(load.notFound)

/** Pré-carrega em segundo plano as rotas do funil principal (jogo -> player). */
export function prefetchCoreRoutes() {
  const run = () => {
    void load.game()
    void load.play()
    void load.games()
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 2000)
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'games', element: <GamesPage /> },
      { path: 'category/:categoryId', element: <GamesPage /> },
      { path: 'game/:slug', element: <GamePage /> },
      { path: 'play/:slug', element: <PlayPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'news', element: <NewsPage /> },
      { path: 'rankings', element: <RankingsPage /> },
      { path: 'achievements', element: <AchievementsPage /> },
      { path: 'pass', element: <PassPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
