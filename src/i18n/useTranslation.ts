import { useContext } from 'react'
import { I18nContext } from './I18nProvider'

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation precisa estar dentro de <I18nProvider>')
  return ctx
}
