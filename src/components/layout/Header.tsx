import { Link, NavLink } from 'react-router'
import { Crown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useProfile } from '@/hooks/useProfile'
import { useNavActive } from '@/hooks/useNavActive'
import { uiStore } from '@/services/uiStore'
import { useStore } from '@/hooks/useStore'
import { analytics } from '@/services/analytics'
import { Logo } from './Logo'
import { headerNav } from './navItems'
import { NotificationsMenu } from './NotificationsMenu'
import { SearchBar } from '@/components/ui/SearchBar'
import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'
import { ButtonLink } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export function Header() {
  const { t } = useTranslation()
  const profile = useProfile()
  const isActive = useNavActive()
  const { sidebarCollapsed } = useStore(uiStore)

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[var(--header-h)] border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="flex h-full items-center gap-2 px-3 md:px-4 lg:gap-4">
        <div className="flex items-center gap-1 lg:w-[calc(var(--sidebar-w)-16px)]">
          <span className="hidden lg:contents">
            <IconButton
              icon={sidebarCollapsed ? PanelLeftOpen : PanelLeftClose}
              label={sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
              onClick={() => uiStore.set((s) => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed }))}
            />
          </span>
          <Logo className="ml-1 md:ml-0" />
        </div>

        <nav aria-label={t('nav.mainNav')} className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {headerNav.map((item) => {
              const active = isActive(item.to, item.exact)
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex h-10 items-center rounded-md px-3 text-sm font-semibold transition-colors',
                      active ? 'text-fg' : 'text-muted hover:text-fg',
                    )}
                  >
                    {t(item.labelKey)}
                    {active && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand" aria-hidden />}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <SearchBar className="hidden w-56 md:block lg:w-64 2xl:w-80" />
          <NotificationsMenu />
          <Link
            to="/profile"
            aria-label={t('nav.profile')}
            title={profile.username}
            className="hidden items-center rounded-full p-1 transition-colors hover:bg-white/[0.06] md:flex"
          >
            <Avatar name={profile.username} seed={profile.avatarSeed} size="sm" />
          </Link>
          <ButtonLink
            to="/pass"
            variant="gold"
            size="sm"
            icon={Crown}
            onClick={() => analytics.track('pass_clicked', { source: 'header' })}
            className="ml-1 font-display tracking-wider uppercase"
            aria-label={t('nav.pass')}
          >
            <span className="hidden xs:inline">ATHG Pass</span>
          </ButtonLink>
        </div>
      </div>
    </header>
  )
}
