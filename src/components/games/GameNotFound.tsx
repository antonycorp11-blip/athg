import { Ghost } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useSeo } from '@/hooks/useSeo'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'

export function GameNotFound() {
  const { t } = useTranslation()
  useSeo({ title: t('seo.notFoundTitle'), description: t('game.notFoundText'), path: '/404', noindex: true })
  return (
    <div className="py-16">
      <EmptyState
        icon={Ghost}
        title={t('game.notFound')}
        text={t('game.notFoundText')}
        action={<ButtonLink to="/games">{t('nav.allGames')}</ButtonLink>}
      />
    </div>
  )
}
