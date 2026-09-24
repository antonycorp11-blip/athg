import type { Translator } from '@/i18n/translate'

export function formatPlaytime(seconds: number, t: Translator) {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('common.minutes', { count: minutes })
  const hours = seconds / 3600
  return t('common.hours', { count: hours >= 10 ? Math.round(hours) : hours.toFixed(1).replace('.0', '') })
}

export function formatRelative(timestamp: number, t: Translator, now = Date.now()) {
  const diff = Math.max(0, now - timestamp)
  const min = Math.floor(diff / 60_000)
  if (min < 2) return t('time.justNow')
  if (min < 60) return t('time.minutesAgo', { count: min })
  const h = Math.floor(min / 60)
  if (h < 24) return t('time.hoursAgo', { count: h })
  return t('time.daysAgo', { count: Math.floor(h / 24) })
}

export function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatDate(value: string | number, locale: string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  const date = typeof value === 'string' ? new Date(value + (value.length === 10 ? 'T00:00:00' : '')) : new Date(value)
  return new Intl.DateTimeFormat(locale, opts).format(date)
}
