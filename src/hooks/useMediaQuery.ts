import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
/** Dispositivo de toque sem mouse (celular/tablet). */
export const useIsTouch = () => useMediaQuery('(hover: none) and (pointer: coarse)')
export const useIsPortrait = () => useMediaQuery('(orientation: portrait)')
