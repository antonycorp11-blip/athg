import { Link } from 'react-router'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

/** Card "Novos mundos estão chegando" — completa fileiras com poucos jogos. */
export function ComingSoonTeaser() {
  const { t } = useTranslation()
  return (
    <Link
      to="/news"
      className="group flex aspect-video flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong bg-[radial-gradient(80%_80%_at_50%_0%,rgb(22_119_255/0.10),transparent)] p-4 text-center transition-colors hover:border-brand/50"
    >
      <Sparkles size={20} className="text-cyan" aria-hidden />
      <span className="font-display text-sm font-semibold">{t('home.comingSoon')}</span>
      <span className="inline-flex items-center gap-1 text-xs text-muted group-hover:text-fg">
        {t('common.exploreMore')} <ArrowRight size={13} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
