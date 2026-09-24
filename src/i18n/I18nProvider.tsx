import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LOCALE, LOCALES, type Locale, type TranslationKey, type TranslationVars } from '@/locales/types'
import { storage } from '@/services/storage'
import { translate } from './translate'

const STORAGE_KEY = 'locale'

export interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, vars?: TranslationVars) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)

function initialLocale(): Locale {
  const saved = storage.get<Locale | null>(STORAGE_KEY, null)
  if (saved && LOCALES.includes(saved)) return saved
  return DEFAULT_LOCALE
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    storage.set(STORAGE_KEY, next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t: (key, vars) => translate(locale, key, vars) }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
