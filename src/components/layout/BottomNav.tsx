import { Link } from 'react-router'
import { useTranslation } from '@/i18n/useTranslation'
import { useNavActive } from '@/hooks/useNavActive'
import { bottomNav } from './navItems'
import { cn } from '@/utils/cn'

/** Navegação inferior estilo app nativo (somente mobile). */
export function BottomNav() {
  const { t } = useTranslation()
  const isActive = useNavActive()
  return (
    <nav
      aria-label={t('nav.bottomNav')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[var(--safe-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid h-[var(--bottom-nav-h)] grid-cols-5">
        {bottomNav.map((item) => {
          const active = isActive(item.to, item.exact)
          const Icon = item.icon
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:scale-95',
                  active ? 'text-fg' : 'text-subtle',
                )}
              >
                <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', active && 'bg-brand/15')}>
                  <Icon size={20} aria-hidden strokeWidth={active ? 2.4 : 2} className={active ? 'text-brand' : undefined} />
                </span>
                {t(item.labelKey)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
