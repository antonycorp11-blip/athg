import {
  House,
  LayoutGrid,
  Heart,
  Sparkles,
  Flame,
  TrendingUp,
  Trophy,
  Award,
  Newspaper,
  Search,
  User,
  Gamepad2,
  ChartColumn,
  Layers,
  Swords,
  Compass,
  Globe,
  Music,
  GraduationCap,
  Dices,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { TranslationKey } from '@/locales/types'
import type { CategoryId } from '@/types/game'

export interface NavItem {
  to: string
  labelKey: TranslationKey
  icon: LucideIcon
  /** Rota ativa só com match exato (inclui query string). */
  exact?: boolean
}

export const headerNav: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: House, exact: true },
  { to: '/games', labelKey: 'nav.games', icon: Gamepad2 },
  { to: '/rankings', labelKey: 'nav.rankings', icon: Trophy },
  { to: '/achievements', labelKey: 'nav.achievements', icon: Award },
  { to: '/news', labelKey: 'nav.news', icon: Newspaper },
]

export const sidebarNav: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: House, exact: true },
  { to: '/games', labelKey: 'nav.allGames', icon: LayoutGrid, exact: true },
  { to: '/favorites', labelKey: 'nav.favorites', icon: Heart },
  { to: '/news', labelKey: 'nav.news', icon: Sparkles },
  { to: '/games?sort=popular', labelKey: 'nav.mostPlayed', icon: Flame, exact: true },
  { to: '/games?sort=trending', labelKey: 'nav.trending', icon: TrendingUp, exact: true },
]

export const bottomNav: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: House, exact: true },
  { to: '/games', labelKey: 'nav.games', icon: Gamepad2 },
  { to: '/search', labelKey: 'nav.search', icon: Search },
  { to: '/rankings', labelKey: 'nav.ranking', icon: Trophy },
  { to: '/profile', labelKey: 'nav.profile', icon: User },
]

export const categoryIcons: Record<CategoryId, LucideIcon> = {
  incremental: ChartColumn,
  gerenciamento: Layers,
  estrategia: Swords,
  aventura: Compass,
  progressao: TrendingUp,
  simulacao: Globe,
  musica: Music,
  educacao: GraduationCap,
  casual: Dices,
  multiplayer: Users,
}
