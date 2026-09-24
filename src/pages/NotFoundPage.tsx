import { Ghost } from 'lucide-react'
import { useSeo } from '@/hooks/useSeo'
import { useTranslation } from '@/i18n/useTranslation'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'

export default function NotFoundPage() {
  const { t } = useTranslation()
  useSeo({ title: t('seo.notFoundTitle'), description: t('notFound.text'), path: '/404', noindex: true })
  return (
    <div className="py-16">
      <EmptyState icon={Ghost} title={t('notFound.title')} text={t('notFound.text')} action={<ButtonLink to="/">{t('notFound.cta')}</ButtonLink>} />
    </div>
  )
}
