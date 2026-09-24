import { forwardRef, type ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'solid' | 'glass'
  active?: boolean
}

const sizes = { sm: 'size-8', md: 'size-10', lg: 'size-11' }
const iconSizes = { sm: 16, md: 18, lg: 20 }
const variants = {
  ghost: 'text-muted hover:text-fg hover:bg-white/[0.07]',
  solid: 'bg-white/[0.07] border border-line text-fg hover:bg-white/[0.12]',
  glass: 'bg-black/45 backdrop-blur-md border border-white/10 text-fg hover:bg-black/65',
}

/** Botão só com ícone. `label` vira aria-label e title. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = 'md', variant = 'ghost', active, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-200 ease-athg active:scale-95',
        sizes[size],
        variants[variant],
        active && 'text-brand',
        className,
      )}
      {...rest}
    >
      <Icon size={iconSizes[size]} aria-hidden strokeWidth={2} />
    </button>
  )
})
