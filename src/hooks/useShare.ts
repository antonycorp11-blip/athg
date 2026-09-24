import { useCallback } from 'react'
import type { Game } from '@/types/game'
import { SITE_URL } from '@/config/env'
import { analytics } from '@/services/analytics'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/useTranslation'

/** Compartilha um jogo: Web Share API no celular, cópia do link no desktop. */
export function useShareGame() {
  const { toast } = useToast()
  const { t } = useTranslation()

  return useCallback(
    async (game: Game, source: string) => {
      // Usa a origem atual (funciona em preview/dev); SITE_URL é o canônico em produção.
      const origin = import.meta.env.PROD ? SITE_URL : window.location.origin
      const url = `${origin}/game/${game.slug}`
      const text = t('share.text', { title: game.title })
      analytics.track('share_clicked', { game: game.slug, source })
      try {
        if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
          await navigator.share({ title: game.title, text, url })
          return
        }
        await navigator.clipboard.writeText(url)
        toast(t('share.copied'), { icon: 'check' })
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return
        toast(t('share.failed'), { icon: 'info' })
      }
    },
    [toast, t],
  )
}
