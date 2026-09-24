import { useEffect, useRef } from 'react'
import { adService, type AdPlacement } from '@/services/ads'

/**
 * Espaço reservado para anúncio de display. Enquanto não houver provedor
 * (adService.enabled = false), não renderiza nada — zero impacto visual.
 */
export function AdSlot({ placement, className }: { placement: AdPlacement; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const enabled = adService.enabled

  useEffect(() => {
    if (enabled && ref.current) adService.renderDisplay(ref.current, placement)
  }, [enabled, placement])

  if (!enabled) return null
  return <div ref={ref} data-ad-placement={placement} className={className} aria-label="Publicidade" role="complementary" />
}
