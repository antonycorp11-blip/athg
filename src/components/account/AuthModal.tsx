import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { MailCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useStore } from '@/hooks/useStore'
import { useTranslation } from '@/i18n/useTranslation'
import { auth, authStore } from '@/services/backend/auth'
import type { TranslationKey } from '@/locales/types'
import { authModalStore, closeAuthModal, type AuthModalMode } from './authModalStore'

const titles: Record<AuthModalMode, TranslationKey> = {
  signin: 'account.signInTitle',
  signup: 'account.signUpTitle',
  forgot: 'account.forgotTitle',
  reset: 'account.resetTitle',
  'check-email': 'account.checkEmailTitle',
}
const subtitles: Partial<Record<AuthModalMode, TranslationKey>> = {
  signin: 'account.signInSubtitle',
  signup: 'account.signUpSubtitle',
  forgot: 'account.forgotSubtitle',
}

const inputClass =
  'h-11 w-full rounded-md border border-line bg-white/[0.04] px-3 text-sm outline-none placeholder:text-subtle focus:border-brand/60'

/** Entrar / criar conta / recuperar senha. Montado uma vez no AppLayout. */
export function AuthModal() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { open, mode, email: sentTo } = useStore(authModalStore)
  const { recovery } = useStore(authStore)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Voltou pelo link de recuperação: abre direto em "nova senha".
  useEffect(() => {
    if (recovery) authModalStore.set((s) => ({ ...s, open: true, mode: 'reset' }))
  }, [recovery])

  useEffect(() => {
    setError(null)
    setPassword('')
  }, [mode, open])

  const setMode = (next: AuthModalMode) => authModalStore.set((s) => ({ ...s, mode: next }))
  const fail = (code: string) => setError(t(`account.errors.${code}` as TranslationKey))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signin') {
        const r = await auth.signIn(email.trim(), password)
        if (!r.ok) return fail(r.error)
        closeAuthModal()
        toast(t('account.welcome', { name: email.split('@')[0] }))
      } else if (mode === 'signup') {
        if (password.length < 8) return fail('weakPassword')
        const r = await auth.signUp(email.trim(), password)
        if (!r.ok) return fail(r.error)
        if (r.needsConfirmation) authModalStore.set((s) => ({ ...s, mode: 'check-email', email: email.trim() }))
        else {
          closeAuthModal()
          toast(t('account.welcome', { name: email.split('@')[0] }))
        }
      } else if (mode === 'forgot') {
        const r = await auth.requestPasswordReset(email.trim())
        if (!r.ok) return fail(r.error)
        toast(t('account.resetSent'), { icon: 'info', duration: 5000 })
        setMode('signin')
      } else if (mode === 'reset') {
        if (password.length < 8) return fail('weakPassword')
        const r = await auth.updatePassword(password)
        if (!r.ok) return fail(r.error)
        closeAuthModal()
        toast(t('account.passwordUpdated'))
      }
    } finally {
      setBusy(false)
    }
  }

  const sub = subtitles[mode]

  return (
    <Modal open={open} onClose={closeAuthModal} title={t(titles[mode])} description={sub ? t(sub) : undefined} size="sm">
      {mode === 'check-email' ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand/15 text-brand">
            <MailCheck size={22} aria-hidden />
          </span>
          <p className="text-sm text-muted">{t('account.checkEmailText', { email: sentTo })}</p>
          <Button variant="secondary" onClick={closeAuthModal}>
            {t('common.close')}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3" noValidate>
          {mode !== 'reset' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">{t('account.email')}</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder={mode === 'signup' ? 'voce@gmail.com' : 'voce@email.com'}
              />
              {mode === 'signup' && <span className="mt-1 block text-[11px] text-subtle">{t('account.emailHint')}</span>}
            </label>
          )}
          {mode !== 'forgot' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">
                {mode === 'reset' ? t('account.newPassword') : t('account.password')}
              </span>
              <input
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'signin' ? undefined : 8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              {mode !== 'signin' && <span className="mt-1 block text-[11px] text-subtle">{t('account.passwordHint')}</span>}
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-[#ff9aac]">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" fullWidth disabled={busy}>
            {mode === 'signin'
              ? t('account.signIn')
              : mode === 'signup'
                ? t('account.signUp')
                : mode === 'forgot'
                  ? t('account.sendReset')
                  : t('account.savePassword')}
          </Button>

          <div className="space-y-1.5 pt-1 text-center text-[13px] text-muted">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => setMode('forgot')} className="hover:text-fg">
                  {t('account.forgot')}
                </button>
                <p>
                  {t('account.noAccount')}{' '}
                  <button type="button" onClick={() => setMode('signup')} className="font-semibold text-brand hover:text-cyan">
                    {t('account.signUp')}
                  </button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <>
                <p>
                  {t('account.haveAccount')}{' '}
                  <button type="button" onClick={() => setMode('signin')} className="font-semibold text-brand hover:text-cyan">
                    {t('account.signIn')}
                  </button>
                </p>
                <p className="text-[11px] text-subtle">
                  {t('account.legal')}{' '}
                  <Link to="/termos" onClick={closeAuthModal} className="underline hover:text-fg">
                    Termos
                  </Link>{' '}
                  ·{' '}
                  <Link to="/privacidade" onClick={closeAuthModal} className="underline hover:text-fg">
                    Privacidade
                  </Link>
                </p>
              </>
            )}
            {mode === 'forgot' && (
              <button type="button" onClick={() => setMode('signin')} className="font-semibold text-brand hover:text-cyan">
                {t('account.backToSignIn')}
              </button>
            )}
          </div>
        </form>
      )}
    </Modal>
  )
}
