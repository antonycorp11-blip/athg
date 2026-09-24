import { Link } from 'react-router'
import { cn } from '@/utils/cn'

/** Logo oficial ATHG (versão para fundo escuro gerada a partir do arquivo original). */
export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" aria-label="ATHG — Início" className={cn('flex shrink-0 items-center gap-2.5 rounded-md', className)}>
      <img
        src="/brand/athg-symbol.png"
        srcSet="/brand/athg-symbol.png 1x, /brand/athg-symbol@2x.png 2x"
        alt=""
        width={56}
        height={33}
        className="h-[30px] w-auto"
        decoding="async"
      />
      {!compact && <span className="hidden font-display text-[19px] font-bold tracking-[0.28em] text-fg sm:inline">ATHG</span>}
    </Link>
  )
}
