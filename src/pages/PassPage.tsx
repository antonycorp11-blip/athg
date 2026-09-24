import { Crown, Ban, Gift, IdCard, Rocket, Palette, PartyPopper, BadgeCheck, Zap, Hourglass, ChevronDown } from 'lucide-react'
import { useSeo } from '@/hooks/useSeo'
import { useTranslation } from '@/i18n/useTranslation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { TranslationKey } from '@/locales/types'
import { cn } from '@/utils/cn'

const BENEFITS: { icon: typeof Ban; key: string }[] = [
  { icon: Ban, key: 'noAds' },
  { icon: Gift, key: 'monthly' },
  { icon: IdCard, key: 'card' },
  { icon: Rocket, key: 'early' },
  { icon: Palette, key: 'cosmetics' },
  { icon: PartyPopper, key: 'events' },
  { icon: BadgeCheck, key: 'badge' },
  { icon: Zap, key: 'bonus' },
]

// Preços apenas ilustrativos — sem checkout na V1.
const PLANS = [
  { id: 'monthly', price: 9.9, period: 'pass.perMonth', highlight: false },
  { id: 'yearly', price: 99, period: 'pass.perYear', highlight: true },
] as const

export default function PassPage() {
  const { t, locale } = useTranslation()
  useSeo({ title: t('seo.passTitle'), description: t('seo.passDescription'), path: '/pass' })
  const brl = new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-14 pt-4 md:pt-6">
      {/* Hero */}
      <section className="noise relative isolate overflow-hidden rounded-xl border border-gold/25 bg-[radial-gradient(70%_90%_at_80%_0%,rgb(246_196_83/0.22),transparent_60%),radial-gradient(60%_80%_at_0%_100%,rgb(139_92_246/0.14),transparent_60%),linear-gradient(180deg,#120f08,#080b13)] px-6 py-14 text-center sm:py-20">
        <Crown className="absolute -bottom-28 left-1/2 -z-10 -translate-x-1/2 text-gold/[0.06]" size={420} strokeWidth={1} aria-hidden />
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#FFD978] to-gold text-[#1a1203] shadow-gold">
          <Crown size={28} aria-hidden />
        </span>
        <h1 className="display-title mt-6 bg-gradient-to-b from-[#FFF1C2] to-gold bg-clip-text text-5xl tracking-wide text-transparent uppercase sm:text-7xl">
          {t('pass.name')}
        </h1>
        <p className="mt-3 font-display text-xl font-semibold sm:text-2xl">{t('pass.tagline')}</p>
        <Badge tone="gold" size="md" className="mt-5">
          <Hourglass size={11} aria-hidden /> {t('pass.soon')}
        </Badge>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted">{t('pass.notifyHint')}</p>
      </section>

      {/* Benefícios */}
      <section aria-labelledby="benefits">
        <SectionHeader id="benefits" title={t('pass.benefitsTitle')} />
        <ul className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, key }) => (
            <li key={key} className="surface group rounded-card p-5 transition-colors hover:border-gold/30 hover:bg-card-hover">
              <span className="flex size-10 items-center justify-center rounded-md bg-gold/12 text-gold transition-transform group-hover:scale-105">
                <Icon size={19} aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold">{t(`pass.benefits.${key}` as TranslationKey)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`pass.benefits.${key}Desc` as TranslationKey)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Planos */}
      <section aria-labelledby="plans">
        <SectionHeader id="plans" title={t('pass.plansTitle')} subtitle={t('pass.notAvailable')} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:max-w-3xl">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-xl border p-6',
                plan.highlight ? 'border-gold/40 bg-[linear-gradient(180deg,rgb(246_196_83/0.10),transparent_60%)] shadow-gold' : 'surface',
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">{t(plan.id === 'monthly' ? 'pass.monthly' : 'pass.yearly')}</h3>
                <Badge tone="gold">{t('pass.soon')}</Badge>
              </div>
              <p className="mt-4">
                <span className="font-display text-4xl font-bold">{brl.format(plan.price)}</span>
                <span className="text-muted">{t(plan.period)}</span>
              </p>
              <p className="mt-1 h-5 text-xs text-gold">{plan.id === 'yearly' ? t('pass.yearlyHint') : ''}</p>
              <Button variant={plan.highlight ? 'gold' : 'secondary'} size="lg" fullWidth disabled className="mt-5 !opacity-60">
                {t('pass.soon')}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="lg:max-w-3xl">
        <SectionHeader id="faq" title={t('pass.faqTitle')} />
        <div className="space-y-2">
          {([1, 2, 3] as const).map((n) => (
            <details key={n} className="surface group rounded-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {t(`pass.faq${n}q`)}
                <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-2 text-sm text-muted">{t(`pass.faq${n}a`)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
