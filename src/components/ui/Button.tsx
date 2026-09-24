import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface StyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  iconRight?: LucideIcon
  fullWidth?: boolean
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white shadow-[0_8px_24px_-10px_rgb(22_119_255/0.8)] hover:bg-[#2a86ff] active:bg-electric',
  secondary: 'bg-white/[0.08] text-fg hover:bg-white/[0.13] border border-line',
  ghost: 'text-muted hover:text-fg hover:bg-white/[0.06]',
  gold: 'bg-gradient-to-b from-[#FFD978] to-gold text-[#1a1203] shadow-[0_8px_24px_-12px_rgb(246_196_83/0.8)] hover:brightness-105',
  outline: 'border border-line-strong text-fg hover:border-white/30 hover:bg-white/[0.04]',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-[12px]',
}

export function buttonClasses({ variant = 'primary', size = 'md', fullWidth }: StyleProps, extra?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap select-none',
    'transition-[background-color,color,border-color,filter,transform] duration-200 ease-athg active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    extra,
  )
}

function Content({ icon: Icon, iconRight: IconRight, size = 'md', children }: StyleProps & { children?: ReactNode }) {
  const s = size === 'lg' ? 18 : size === 'sm' ? 14 : 16
  return (
    <>
      {Icon && <Icon size={s} aria-hidden strokeWidth={2.25} className={size === 'lg' ? '-ml-0.5' : undefined} />}
      {children}
      {IconRight && <IconRight size={s} aria-hidden strokeWidth={2.25} />}
    </>
  )
}

type ButtonProps = StyleProps & ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, iconRight, fullWidth, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses({ variant, size, fullWidth }, className)} {...rest}>
      <Content icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Content>
    </button>
  )
})

type ButtonLinkProps = StyleProps & LinkProps

export function ButtonLink({ variant, size, icon, iconRight, fullWidth, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth }, className)} {...rest}>
      <Content icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Content>
    </Link>
  )
}
