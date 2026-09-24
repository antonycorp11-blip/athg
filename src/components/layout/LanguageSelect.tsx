import { Globe } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { LOCALES, type Locale } from '@/locales/types'

const names: Record<Locale, string> = { 'pt-BR': 'Português (BR)', en: 'English', es: 'Español' }

export function LanguageSelect() {
  const { locale, setLocale, t } = useTranslation()
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <Globe size={14} aria-hidden />
      <span className="sr-only">{t('nav.language')}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="cursor-pointer rounded-md bg-transparent py-1 pr-1 text-xs font-medium text-muted outline-none hover:text-fg focus-visible:text-fg"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} className="bg-surface text-fg">
            {names[l]}
          </option>
        ))}
      </select>
    </label>
  )
}
