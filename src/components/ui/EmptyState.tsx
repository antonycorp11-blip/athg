import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  text?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, text, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center rounded-card border border-dashed border-line-strong px-6 py-12 text-center', className)}>
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-white/[0.05] text-muted">
        <Icon size={22} aria-hidden />
      </span>
      <p className="font-display text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
