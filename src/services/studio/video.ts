import type { CSSProperties } from 'react'
import type { CamRotation } from '@/types/studio'

/**
 * Estilo de um <video> girado/espelhado que cobre a caixa inteira (object-cover).
 * Em 90°/270° a largura e a altura trocam: o vídeo é dimensionado pela caixa girada.
 * `boxAspect` = largura / altura da caixa.
 */
export function rotatedVideoStyle(rotate: CamRotation, mirror: boolean, boxAspect: number): CSSProperties {
  const sideways = rotate === 90 || rotate === 270
  return {
    left: '50%',
    top: '50%',
    width: sideways ? `${100 / boxAspect}%` : '100%',
    height: sideways ? `${100 * boxAspect}%` : '100%',
    transform: `translate(-50%, -50%) rotate(${rotate}deg)${mirror ? ' scaleX(-1)' : ''}`,
  }
}
