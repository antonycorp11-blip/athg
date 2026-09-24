import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Bell, Sparkles, Rocket } from 'lucide-react'
import { gamesService } from '@/services/gamesService'
import { uiStore } from '@/services/uiStore'
import { identityStore } from '@/services/profileService'
import { useStore } from '@/hooks/useStore'
import { useTranslation } from '@/i18n/useTranslation'
import { IconButton } from '@/components/ui/IconButton'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Notice {
  id: string
  title: string
  text: string
  at: number
  to?: string
  icon: typeof Bell
}

/** Notificações locais (boas-vindas + lançamentos reais do catálogo). */
export function NotificationsMenu() {
  const { t, locale } = useTranslation()
  const [open, setOpen] = useState(false)
  const ui = useStore(uiStore)
  const identity = useStore(identityStore)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const notices = useMemo<Notice[]>(() => {
    const releases = gamesService
      .getNewReleases()
      .slice(0, 2)
      .map((g) => ({
        id: `release-${g.slug}`,
        title: t('notifications.releaseTitle', { title: g.title }),
        text: t('notifications.releaseText'),
        at: new Date(g.releaseDate + 'T12:00:00').getTime(),
        to: `/game/${g.slug}`,
        icon: Rocket,
      }))
    const welcome = { id: 'welcome', title: t('notifications.welcomeTitle'), text: t('notifications.welcomeText'), at: identity?.joinedAt ?? Date.now(), icon: Sparkles }
    return [welcome, ...releases].sort((a, b) => b.at - a.at)
  }, [t, identity?.joinedAt])

  const unread = notices.filter((n) => n.at > ui.notificationsReadAt).length

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const markRead = () => uiStore.set((s) => ({ ...s, notificationsReadAt: Date.now() }))

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        icon={Bell}
        label={t('nav.notifications')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      />
      {unread > 0 && <span className="pointer-events-none absolute top-2 right-2 size-2 rounded-full bg-cyan ring-2 ring-bg" aria-hidden />}
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t('notifications.title')}
          className="fixed inset-x-3 top-[calc(var(--header-h)+6px)] z-50 animate-fade-in overflow-hidden rounded-xl border border-line-strong bg-[#0d1626]/98 shadow-2xl backdrop-blur-xl sm:absolute sm:inset-x-auto sm:top-[calc(100%+8px)] sm:right-0 sm:w-[360px]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="display-title text-sm">{t('notifications.title')}</p>
            {unread > 0 && (
              <button type="button" onClick={markRead} className="text-xs font-semibold text-brand hover:text-cyan">
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto p-1.5">
            {notices.map((n) => {
              const isUnread = n.at > ui.notificationsReadAt
              const body = (
                <>
                  <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md', isUnread ? 'bg-brand/15 text-brand' : 'bg-white/5 text-muted')}>
                    <n.icon size={15} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{n.title}</span>
                    <span className="block text-xs text-muted">{n.text}</span>
                    <span className="mt-1 block text-[11px] text-subtle">{formatDate(n.at, locale)}</span>
                  </span>
                  {isUnread && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan" aria-hidden />}
                </>
              )
              return (
                <li key={n.id}>
                  {n.to ? (
                    <Link to={n.to} onClick={() => setOpen(false)} className="flex gap-3 rounded-lg p-2.5 hover:bg-white/[0.05]">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex gap-3 rounded-lg p-2.5">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
