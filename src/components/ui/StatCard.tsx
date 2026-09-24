import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  accent?: 'brand' | 'cyan' | 'gold' | 'violet'
  className?: string
}

const accents = {
  brand: 'text-brand bg-brand/12',
  cyan: 'text-cyan bg-cyan/12',
  gold: 'text-gold bg-gold/12',
  violet: 'text-violet bg-violet/15',
}

export function StatCard({ icon: Icon, label, value, hint, accent = 'brand', className }: StatCardProps) {
  return (
    <div className={cn('surface flex items-center gap-3 rounded-card p-3.5 sm:p-4', className)}>
      <span className={cn('hidden size-10 shrink-0 items-center justify-center rounded-md xs:flex', accents[accent])}>
        <Icon size={18} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs leading-tight text-muted">{label}</p>
        <p className="font-display text-xl leading-tight font-bold">{value}</p>
        {hint && <p className="truncate text-[11px] text-subtle">{hint}</p>}
      </div>
    </div>
  )
}
