import { cn } from '@/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-md', className)} />
}

export function GameCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-hidden>
      <Skeleton className="aspect-video w-full rounded-card" />
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}

/** Fallback genérico de página enquanto a rota (lazy) carrega. */
export function PageSkeleton() {
  return (
    <div className="space-y-8 px-4 py-6 md:px-8" role="status" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="aspect-[21/9] w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
