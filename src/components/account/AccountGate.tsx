import type { ReactNode } from 'react'
import { Lock, LogIn, UserPlus } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from '@/components/ui/Button'
import { openAuthModal } from './authModalStore'

/** No lugar do player para quem não tem conta: jogar exige conta ATHG. */
export function AccountGate({ title, poster }: { title: string; poster: ReactNode }) {
  const { t } = useTranslation()
  return (
    <section className="relative isolate overflow-hidden rounded-none bg-black md:rounded-xl">
      <div className="aspect-[4/5] w-full opacity-40 blur-[2px] xs:aspect-video" aria-hidden>
        {poster}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/85 via-black/55 to-black/30 p-5">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand/20 text-brand">
            <Lock size={22} aria-hidden />
          </span>
          <h2 className="font-display text-xl font-bold sm:text-2xl">{t('account.gateTitle', { title })}</h2>
          <p className="text-sm text-muted">{t('account.gateText')}</p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Button icon={UserPlus} onClick={() => openAuthModal('signup')}>
              {t('account.signUp')}
            </Button>
            <Button variant="secondary" icon={LogIn} onClick={() => openAuthModal('signin')}>
              {t('account.signIn')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
