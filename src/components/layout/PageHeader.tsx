import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  extra?: ReactNode
  children?: ReactNode
}

export function PageHeader({ title, subtitle, icon: Icon, extra, children }: PageHeaderProps) {
  return (
    <header className="pt-6 pb-6 md:pt-8">
      <div className="flex flex-wrap items-center gap-3">
        {Icon && (
          <span className="flex size-10 items-center justify-center rounded-[12px] bg-brand/12 text-brand ring-1 ring-brand/25">
            <Icon size={20} aria-hidden />
          </span>
        )}
        <h1 className="display-title text-2xl sm:text-3xl">{title}</h1>
        {extra}
      </div>
      {subtitle && <p className="mt-2 text-sm text-muted sm:text-[15px]">{subtitle}</p>}
      {children && <div className="mt-5">{children}</div>}
    </header>
  )
}
