import { Link } from 'react-router'
import { useTranslation } from '@/i18n/useTranslation'
import { LanguageSelect } from './LanguageSelect'

export function Footer() {
  const { t } = useTranslation()
  const links = [
    { to: '/games', label: t('nav.allGames') },
    { to: '/news', label: t('nav.news') },
    { to: '/rankings', label: t('nav.rankings') },
    { to: '/achievements', label: t('nav.achievements') },
    { to: '/pass', label: t('nav.pass') },
  ]
  return (
    <footer className="mt-16 border-t border-line pt-8 pb-4 text-sm text-muted">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <img src="/brand/athg-symbol.png" alt="ATHG" width={56} height={33} className="h-7 w-auto opacity-90" loading="lazy" />
          <p className="mt-3 text-[13px]">{t('footer.playFirst')}</p>
        </div>
        <ul className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="text-[13px] hover:text-fg">
                {l.label}
              </Link>
            </li>
          ))}
          <li className="text-[13px]">
            {t('footer.developers')} <span className="text-subtle">· {t('footer.developersSoon')}</span>
          </li>
        </ul>
      </div>
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-4 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>
          {t('footer.rights', { year: new Date().getFullYear() })} ·{' '}
          <Link to="/termos" className="hover:text-fg">
            Termos
          </Link>{' '}
          ·{' '}
          <Link to="/privacidade" className="hover:text-fg">
            Privacidade
          </Link>
        </p>
        <div className="md:hidden">
          <LanguageSelect />
        </div>
      </div>
    </footer>
  )
}
