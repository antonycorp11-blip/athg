import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { IconButton } from '@/components/ui/IconButton'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'

interface GameCarouselProps<T> {
  title: string
  subtitle?: string
  icon?: LucideIcon
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  getKey: (item: T) => string
  action?: { label: string; to: string }
  extra?: ReactNode
  /** Largura dos itens: md = cards padrão, sm = mais itens por linha. */
  itemSize?: 'sm' | 'md'
  className?: string
}

const itemWidths = {
  md: 'w-[72%] xs:w-[46%] sm:w-[38%] md:w-[31%] lg:w-[23.5%] 2xl:w-[18.8%]',
  sm: 'w-[44%] xs:w-[38%] sm:w-[30%] md:w-[23.5%] lg:w-[18.8%] 2xl:w-[15.6%]',
}

/** Carrossel horizontal com scroll nativo (swipe no mobile, setas no desktop). */
export function GameCarousel<T>({ title, subtitle, icon, items, renderItem, getKey, action, extra, itemSize = 'md', className }: GameCarouselProps<T>) {
  const scroller = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  const headingId = useId()
  const { t } = useTranslation()

  const update = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    update()
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update, items.length])

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  if (!items.length) return null
  const showArrows = !(edges.start && edges.end)

  return (
    <section aria-labelledby={headingId} className={cn('relative', className)}>
      <div className="flex items-end justify-between gap-2">
        <SectionHeader id={headingId} title={title} subtitle={subtitle} icon={icon} action={action} extra={extra} className="flex-1" />
        {showArrows && (
          <div className="mb-3.5 hidden gap-1 md:flex">
            <IconButton icon={ChevronLeft} label={t('common.previous')} size="sm" variant="solid" disabled={edges.start} onClick={() => scrollBy(-1)} className="disabled:opacity-30" />
            <IconButton icon={ChevronRight} label={t('common.next')} size="sm" variant="solid" disabled={edges.end} onClick={() => scrollBy(1)} className="disabled:opacity-30" />
          </div>
        )}
      </div>
      <div
        ref={scroller}
        onScroll={update}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pt-2.5 pb-3 -mt-1.5 md:mx-0 md:scroll-px-0 md:gap-4 md:px-0"
      >
        {items.map((item, i) => (
          <div key={getKey(item)} className={cn('shrink-0 snap-start', itemWidths[itemSize])}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    </section>
  )
}
