import { Crown, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { analytics } from '@/services/analytics'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function PassBanner({ source = 'home_banner' }: { source?: string }) {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby="pass-banner"
      className="noise relative isolate overflow-hidden rounded-xl border border-gold/25 bg-[linear-gradient(115deg,#1a1405_0%,#0d0f18_45%,#0b1220_100%)] p-6 sm:p-8 lg:p-10"
    >
      <div className="absolute -top-24 -right-10 -z-10 size-80 rounded-full bg-gold/20 blur-3xl" aria-hidden />
      <div className="absolute -bottom-32 left-1/3 -z-10 size-72 rounded-full bg-violet/15 blur-3xl" aria-hidden />
      <Crown className="absolute top-1/2 right-6 -z-10 hidden -translate-y-1/2 rotate-12 text-gold/10 md:block" size={220} strokeWidth={1.2} aria-hidden />

      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-gold/15 text-gold">
              <Crown size={17} aria-hidden />
            </span>
            <h2 id="pass-banner" className="display-title text-2xl tracking-wide text-gold uppercase sm:text-3xl">
              {t('pass.name')}
            </h2>
            <Badge tone="gold">{t('pass.soon')}</Badge>
          </div>
          <p className="font-display text-xl leading-snug font-semibold text-fg sm:text-2xl">
            {t('pass.bannerLine1')}
            <br />
            <span className="text-muted">{t('pass.bannerLine2')}</span> <span className="text-muted">{t('pass.bannerLine3')}</span>
          </p>
        </div>
        <ButtonLink
          to="/pass"
          variant="gold"
          size="lg"
          iconRight={ArrowRight}
          onClick={() => analytics.track('pass_clicked', { source })}
          className="self-start font-display tracking-wider uppercase md:self-auto"
        >
          {t('pass.cta')}
        </ButtonLink>
      </div>
    </section>
  )
}
