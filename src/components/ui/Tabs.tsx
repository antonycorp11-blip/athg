import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/utils/cn'

export interface TabItem<T extends string> {
  id: T
  label: string
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  label: string
  /** id base para aria-controls dos painéis: `${idBase}-panel` */
  idBase: string
  className?: string
}

/** Tabs acessíveis (setas do teclado navegam entre abas). */
export function Tabs<T extends string>({ items, value, onChange, label, idBase, className }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (index + delta + items.length) % items.length
    refs.current[next]?.focus()
    onChange(items[next].id)
  }

  return (
    <div role="tablist" aria-label={label} className={cn('scrollbar-none flex gap-1 overflow-x-auto rounded-[12px] border border-line bg-surface p-1', className)}>
      {items.map((item, i) => {
        const selected = item.id === value
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            id={`${idBase}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'h-9 shrink-0 rounded-md px-4 text-sm font-semibold transition-colors duration-200',
              selected ? 'bg-card-hover text-fg shadow-card' : 'text-muted hover:text-fg',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

interface ChipsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  label: string
  className?: string
}

/** Filtros em formato de chip (radio group). */
export function Chips<T extends string>({ items, value, onChange, label, className }: ChipsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0', className)}>
      {items.map((item) => {
        const selected = item.id === value
        return (
          <button
            key={item.id}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              'h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-200',
              selected ? 'border-brand/60 bg-brand/15 text-fg' : 'border-line bg-white/[0.03] text-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
