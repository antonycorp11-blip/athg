import { Link } from 'react-router'
import { useTranslation } from '@/i18n/useTranslation'
import { useNavActive } from '@/hooks/useNavActive'
import { useFavorites } from '@/hooks/useLibrary'
import { gamesService } from '@/services/gamesService'
import { Tooltip } from '@/components/ui/Tooltip'
import { categoryIcons, sidebarNav, type NavItem } from './navItems'
import { LanguageSelect } from './LanguageSelect'
import { cn } from '@/utils/cn'

interface SidebarProps {
  collapsed: boolean
}

/** Sidebar desktop/tablet. Recolhida = só ícones com tooltip. */
export function Sidebar({ collapsed }: SidebarProps) {
  const { t } = useTranslation()
  const isActive = useNavActive()
  const { favorites } = useFavorites()
  const categories = gamesService.getListedCategories()

  const renderItem = (item: NavItem & { label: string; count?: number }) => {
    const active = isActive(item.to, item.exact)
    const Icon = item.icon
    return (
      <li key={item.to}>
        <Tooltip content={item.label} side="right" disabled={!collapsed} className="w-full">
          <Link
            to={item.to}
            aria-current={active ? 'page' : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={cn(
              'group relative flex h-10 w-full items-center gap-3 rounded-md text-sm font-medium transition-colors duration-200',
              collapsed ? 'justify-center px-0' : 'px-3',
              active ? 'bg-white/[0.07] text-fg' : 'text-muted hover:bg-white/[0.04] hover:text-fg',
            )}
          >
            {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-brand" aria-hidden />}
            <Icon size={18} aria-hidden className={cn('shrink-0', active ? 'text-brand' : 'text-muted group-hover:text-fg')} />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && item.count ? (
              <span className="ml-auto rounded-full bg-white/[0.07] px-1.5 text-[11px] font-semibold text-muted">{item.count}</span>
            ) : null}
          </Link>
        </Tooltip>
      </li>
    )
  }

  return (
    <aside
      className={cn(
        'fixed top-[var(--header-h)] bottom-0 left-0 z-30 hidden flex-col border-r border-line bg-bg transition-[width] duration-300 ease-athg md:flex',
        collapsed ? 'w-[var(--sidebar-w-collapsed)]' : 'w-[var(--sidebar-w)]',
      )}
    >
      <nav aria-label={t('nav.sideNav')} className={cn('scrollbar-none flex-1 overflow-y-auto py-4', collapsed ? 'px-2.5' : 'px-3')}>
        <ul className="space-y-0.5">
          {sidebarNav.map((item) =>
            renderItem({ ...item, label: t(item.labelKey), count: item.to === '/favorites' ? favorites.length : undefined }),
          )}
        </ul>

        <div className={cn('my-4 h-px bg-line', collapsed ? 'mx-2' : 'mx-1')} />

        {!collapsed && <p className="eyebrow mb-2 px-3 text-subtle">{t('nav.categories')}</p>}
        <ul className="space-y-0.5">
          {categories.map((c) =>
            renderItem({ to: `/category/${c.id}`, labelKey: `categories.${c.id}`, label: t(`categories.${c.id}`), icon: categoryIcons[c.id] }),
          )}
        </ul>
      </nav>

      {!collapsed && (
        <div className="border-t border-line px-4 py-3">
          <LanguageSelect />
        </div>
      )}
    </aside>
  )
}
