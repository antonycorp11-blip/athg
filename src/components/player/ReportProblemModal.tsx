import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useTranslation } from '@/i18n/useTranslation'
import { reportService, type ReportType } from '@/services/reportService'
import { cn } from '@/utils/cn'

const TYPES: ReportType[] = ['notLoading', 'performance', 'controls', 'display', 'other']

export function ReportProblemModal({ open, onClose, game, title }: { open: boolean; onClose: () => void; game: string; title: string }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [type, setType] = useState<ReportType>('notLoading')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async () => {
    setSending(true)
    await reportService.submit({ game, type, details })
    setSending(false)
    setDetails('')
    onClose()
    toast(t('report.thanks'))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('report.title')}
      description={t('report.subtitle', { title })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={sending}>
            {t('report.submit')}
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t('report.typeLabel')}</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TYPES.map((id) => (
            <label
              key={id}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors',
                type === id ? 'border-brand/60 bg-brand/10' : 'border-line hover:border-line-strong',
              )}
            >
              <input type="radio" name="report-type" value={id} checked={type === id} onChange={() => setType(id)} className="accent-brand" />
              {t(`report.types.${id}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold">{t('report.detailsLabel')}</span>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder={t('report.detailsPlaceholder')}
          className="w-full resize-none rounded-md border border-line bg-white/[0.03] p-3 text-sm outline-none placeholder:text-subtle focus:border-brand/60"
        />
      </label>
    </Modal>
  )
}
