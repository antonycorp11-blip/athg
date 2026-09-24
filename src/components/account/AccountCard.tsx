import { useState } from 'react'
import { Cloud, CloudOff, LogOut, ShieldCheck, Trash2, UserPlus, LogIn } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { useTranslation } from '@/i18n/useTranslation'
import { auth, authStore } from '@/services/backend/auth'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { openAuthModal } from './authModalStore'

/** Estado da conta no perfil: convidado (CTA para criar conta) ou conectado. */
export function AccountCard() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { email, isAnonymous, isAdmin, userId } = useStore(authStore)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const permanent = Boolean(userId && !isAnonymous)

  if (!permanent) {
    return (
      <section className="flex flex-col gap-4 rounded-xl border border-brand/30 bg-[radial-gradient(90%_140%_at_0%_0%,rgb(22_119_255/0.16),transparent_60%)] p-5 sm:flex-row sm:items-center">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-brand/15 text-brand">
          <CloudOff size={20} aria-hidden />
        </span>
        <div className="flex-1">
          <p className="font-display text-lg font-bold">{t('account.guestTitle')}</p>
          <p className="text-sm text-muted">{t('account.guestText')}</p>
        </div>
        <div className="flex gap-2">
          <Button icon={UserPlus} onClick={() => openAuthModal('signup')}>
            {t('account.signUp')}
          </Button>
          <Button variant="secondary" icon={LogIn} onClick={() => openAuthModal('signin')}>
            {t('account.signIn')}
          </Button>
        </div>
      </section>
    )
  }

  const signOut = async () => {
    setBusy(true)
    await auth.signOut()
    setBusy(false)
    toast(t('account.signedOut'), { icon: 'info' })
  }

  const deleteAccount = async () => {
    setBusy(true)
    const r = await auth.deleteAccount()
    setBusy(false)
    setConfirmDelete(false)
    toast(r.ok ? t('account.deleted') : t('account.errors.generic'), { icon: 'info' })
  }

  return (
    <section className="surface flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-success/15 text-success">
        <Cloud size={20} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t('account.cloudSynced')}</p>
        <p className="truncate text-sm text-muted">{t('account.loggedInAs', { email: email ?? '' })}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {isAdmin && (
          <ButtonLink to="/admin" variant="gold" icon={ShieldCheck}>
            {t('account.admin')}
          </ButtonLink>
        )}
        <Button variant="secondary" icon={LogOut} onClick={signOut} disabled={busy}>
          {t('account.signOut')}
        </Button>
        <Button variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} className="text-danger hover:text-danger">
          {t('account.deleteAccount')}
        </Button>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('account.deleteConfirmTitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={deleteAccount} disabled={busy} className="bg-danger hover:bg-danger/90">
              {t('account.deleteConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('account.deleteConfirmText')}</p>
      </Modal>
    </section>
  )
}
