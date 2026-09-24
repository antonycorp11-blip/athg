import { Suspense, useEffect, type CSSProperties } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useTranslation } from '@/i18n/useTranslation'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useStore } from '@/hooks/useStore'
import { uiStore } from '@/services/uiStore'
import { analytics } from '@/services/analytics'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Footer } from './Footer'
import { AchievementWatcher } from './AchievementWatcher'

export function AppLayout() {
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const isDesktop = useIsDesktop()
  const { sidebarCollapsed } = useStore(uiStore)
  const isPlayRoute = pathname.startsWith('/play/')
  // Tablet: sempre recolhida. Player: recolhida para dar espaço ao jogo.
  const collapsed = !isDesktop || sidebarCollapsed || isPlayRoute

  useEffect(() => {
    analytics.track('page_view', { path: pathname + search })
  }, [pathname, search])

  return (
    <div style={{ '--sidebar-current': collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)' } as CSSProperties}>
      <a
        href="#main"
        className="fixed top-2 left-2 z-[100] -translate-y-20 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        {t('nav.skipToContent')}
      </a>
      <Header />
      <Sidebar collapsed={collapsed} />
      <main id="main" tabIndex={-1} className="overflow-x-clip pt-[var(--header-h)] outline-none transition-[padding] duration-300 ease-athg md:pl-[var(--sidebar-current)]">
        <div className="mx-auto w-full max-w-[1680px] px-4 pb-safe md:px-6 md:pb-8 lg:px-8">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
          <Footer />
        </div>
      </main>
      <BottomNav />
      <AchievementWatcher />
      {/* Carga completa usa a chave "default" em toda rota: nesse caso, chaveia pelo caminho. */}
      <ScrollRestoration getKey={(location) => (location.key === 'default' ? location.pathname : location.key)} />
    </div>
  )
}
