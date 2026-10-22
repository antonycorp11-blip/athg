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

/** Cronômetro de gravação: "1:02:03" ou "02:03". */
export function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const hh = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Tamanho de arquivo: "812 MB" / "3,4 GB". */
export function formatBytes(bytes: number, locale: string) {
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${gb.toLocaleString(locale, { maximumFractionDigits: 1 })} GB`
  return `${Math.round(bytes / 1024 ** 2)} MB`
}
