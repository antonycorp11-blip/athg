import { useId, type ReactElement, cloneElement, type HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface TooltipProps {
  content: string
  children: ReactElement<HTMLAttributes<HTMLElement>>
  side?: 'top' | 'bottom' | 'right'
  /** Desativa (ex: sidebar expandida já mostra o texto). */
  disabled?: boolean
  className?: string
}

const positions = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  right: 'left-full top-1/2 ml-3 -translate-y-1/2',
}

/** Tooltip leve em CSS: aparece no hover e no foco do teclado. */
export function Tooltip({ content, children, side = 'top', disabled, className }: TooltipProps) {
  const id = useId()
  if (disabled) return children
  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {cloneElement(children, { 'aria-describedby': id })}
      <span
        role="tooltip"
        id={id}
        className={cn(
          'pointer-events-none absolute z-50 rounded-md border border-line bg-[#0f1829] px-2 py-1 text-xs font-medium whitespace-nowrap text-fg shadow-lg',
          'opacity-0 transition-opacity duration-150 group-focus-within/tt:opacity-100 group-hover/tt:opacity-100',
          positions[side],
        )}
      >
        {content}
      </span>
    </span>
  )
}
