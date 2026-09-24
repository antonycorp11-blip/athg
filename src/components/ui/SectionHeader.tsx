import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  action?: { label: string; to: string }
  extra?: ReactNode
  id?: string
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}

export function SectionHeader({ title, subtitle, icon: Icon, action, extra, id, as: Tag = 'h2', className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3.5 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <Tag id={id} className="display-title flex items-center gap-2 text-lg sm:text-xl">
          {Icon && <Icon size={18} className="text-brand" aria-hidden />}
          {title}
          {extra}
        </Tag>
        {subtitle && <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action && (
        <Link
          to={action.to}
          className="group inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1 text-[13px] font-semibold text-muted transition-colors hover:text-fg"
        >
          {action.label}
          <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  )
}
