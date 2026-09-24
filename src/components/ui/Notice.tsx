import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/utils/cn'

/** Aviso discreto (ex: "dados de demonstração"). */
export function Notice({ children, tone = 'gold', className }: { children: ReactNode; tone?: 'gold' | 'brand'; className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-[13px]',
        tone === 'gold' ? 'border-gold/25 bg-gold/[0.06] text-[#f3dca3]' : 'border-brand/25 bg-brand/[0.07] text-[#a9cbff]',
        className,
      )}
    >
      <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
