import { useId, useState } from 'react'
import type { Game, GameTheme } from '@/types/game'
import { cn } from '@/utils/cn'

type Variant = 'thumb' | 'banner' | 'poster'

interface GameArtProps {
  game: Game
  variant?: Variant
  className?: string
  /** Carregamento imediato (hero / acima da dobra). */
  priority?: boolean
  /** Mostra o título dentro do placeholder. */
  showTitle?: boolean
  sizes?: string
}

/**
 * Arte do jogo. Se `thumbnail`/`banner` existir, usa a imagem (lazy).
 * Senão, gera um placeholder elegante a partir de `game.theme` — trocar pela
 * arte oficial é só preencher o campo no catálogo.
 */
export function GameArt({ game, variant = 'thumb', className, priority, showTitle = true, sizes }: GameArtProps) {
  const src = variant === 'thumb' ? (game.thumbnail ?? game.banner) : (game.banner ?? game.thumbnail)
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={game.title}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        sizes={sizes}
        onError={() => setFailed(true)}
        className={cn('size-full object-cover', className)}
      />
    )
  }

  return <ArtPlaceholder game={game} variant={variant} className={className} showTitle={showTitle} />
}

function ArtPlaceholder({ game, variant, className, showTitle }: { game: Game; variant: Variant; className?: string; showTitle: boolean }) {
  const { primary, secondary } = game.theme
  return (
    <div
      role="img"
      aria-label={game.title}
      className={cn('noise relative size-full overflow-hidden [container-type:inline-size]', className)}
      style={{
        background: `radial-gradient(120% 90% at 78% 18%, ${primary}55 0%, transparent 55%), linear-gradient(160deg, ${secondary} 0%, #070b14 72%)`,
      }}
    >
      <Motif theme={game.theme} align={variant === 'poster' ? 'xMaxYMid' : 'xMidYMid'} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      {showTitle && variant !== 'banner' && (
        <div className={cn('absolute inset-x-0 bottom-0 p-[6cqw]', variant === 'poster' && 'p-[8cqw]')}>
          {game.original && (
            <p className="mb-[1.5cqw] font-display text-[max(8px,3.2cqw)] font-semibold tracking-[0.25em] text-white/60 uppercase">
              ATHG Original
            </p>
          )}
          <p
            className={cn(
              'font-display leading-[0.95] font-bold tracking-tight text-white uppercase drop-shadow-[0_2px_12px_rgb(0_0_0/0.5)]',
              variant === 'poster' ? 'text-[13cqw]' : 'text-[9.5cqw]',
            )}
          >
            {game.title}
          </p>
        </div>
      )}
    </div>
  )
}

function Motif({ theme, align }: { theme: GameTheme; align: string }) {
  const id = useId().replace(/:/g, '')
  const { primary: p, secondary: s } = theme
  const common = { className: 'absolute inset-0 size-full', viewBox: '0 0 400 225', preserveAspectRatio: `${align} slice`, 'aria-hidden': true }

  switch (theme.motif) {
    case 'blood':
      return (
        <svg {...common}>
          <defs>
            <radialGradient id={`${id}m`}>
              <stop offset="0" stopColor={p} stopOpacity="0.55" />
              <stop offset="1" stopColor={p} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1a0309" />
              <stop offset="1" stopColor="#050104" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="62" r="95" fill={`url(#${id}m)`} />
          <circle cx="300" cy="62" r="30" fill={p} opacity="0.9" />
          <circle cx="291" cy="55" r="30" fill={s} opacity="0.35" />
          {[
            [240, 48],
            [256, 38],
            [348, 92],
          ].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} q5 -6 10 0 q5 -6 10 0 q-5 -2 -10 4 q-5 -6 -10 -4z`} fill="#0a0205" opacity="0.85" />
          ))}
          <path d="M0 170 Q70 140 150 160 T300 150 T400 158 V225 H0Z" fill={`url(#${id}h)`} />
          <path d="M210 150 l0 -26 l14 -12 l14 12 l0 26 z M226 150 v-10 h-6 v10z" fill="#070104" />
          <path d="M252 152 v-18 l8 -8 l8 8 v18z" fill="#070104" />
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M${200 + (i - 3) * 14} 225 L${200 + (i - 3) * 60} 170`} stroke={p} strokeOpacity="0.14" strokeWidth="1" />
          ))}
          {[
            [70, 60],
            [120, 95],
            [355, 150],
          ].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} c-4 7 -6 10 -6 13 a6 6 0 0 0 12 0 c0 -3 -2 -6 -6 -13z`} fill={p} opacity={0.35 + i * 0.1} />
          ))}
        </svg>
      )
    case 'depths':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#bff6ff" stopOpacity="0.28" />
              <stop offset="1" stopColor="#bff6ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[
            [230, 40],
            [290, 30],
            [340, 55],
          ].map(([x, w], i) => (
            <polygon key={i} points={`${x},0 ${x + w},0 ${x + w * 2.2},225 ${x + w * 0.6},225`} fill={`url(#${id}r)`} opacity={0.7 - i * 0.15} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M0 ${95 + i * 34} Q50 ${85 + i * 34} 100 ${95 + i * 34} T200 ${95 + i * 34} T300 ${95 + i * 34} T400 ${95 + i * 34} V225 H0Z`}
              fill={s}
              opacity={0.35 + i * 0.18}
            />
          ))}
          <line x1="300" y1="0" x2="300" y2="128" stroke={p} strokeOpacity="0.5" strokeDasharray="3 4" />
          <circle cx="300" cy="134" r="7" fill={p} />
          <circle cx="300" cy="134" r="22" fill="none" stroke={p} strokeOpacity="0.35" />
          <circle cx="300" cy="134" r="40" fill="none" stroke={p} strokeOpacity="0.15" />
          {[
            [262, 110, 3],
            [330, 96, 2],
            [318, 70, 4],
            [80, 150, 3],
            [120, 176, 2],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="none" stroke="#bff6ff" strokeOpacity="0.45" />
          ))}
        </svg>
      )
    case 'territory': {
      const hexes: { x: number; y: number; k: number }[] = []
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 12; col++) hexes.push({ x: col * 36 + (row % 2) * 18, y: row * 31 + 6, k: (row * 7 + col * 3) % 11 })
      return (
        <svg {...common}>
          {hexes.map(({ x, y, k }, i) => (
            <polygon
              key={i}
              transform={`translate(${x} ${y})`}
              points="18,0 34,9 34,27 18,36 2,27 2,9"
              fill={k === 0 || (x > 230 && x < 330 && y > 40 && y < 140 && k < 5) ? p : 'transparent'}
              fillOpacity={k === 0 ? 0.35 : 0.55}
              stroke={p}
              strokeOpacity={x > 200 ? 0.35 : 0.12}
            />
          ))}
        </svg>
      )
    }
    case 'waves':
      return (
        <svg {...common}>
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M0 ${90 + i * 6} C80 ${30 + i * 20} 140 ${150 - i * 10} 220 ${95 + i * 4} S340 ${40 + i * 14} 400 ${88 + i * 6}`}
              fill="none"
              stroke={i % 2 ? s : p}
              strokeOpacity={0.75 - i * 0.12}
              strokeWidth={2 - i * 0.25}
            />
          ))}
          {Array.from({ length: 16 }, (_, i) => {
            const h = 12 + Math.abs(Math.sin(i * 1.7)) * 44
            return <rect key={i} x={236 + i * 10} y={200 - h} width="5" height={h} rx="2" fill={p} opacity={0.25 + (i % 4) * 0.12} />
          })}
        </svg>
      )
    case 'growth':
      return (
        <svg {...common}>
          {Array.from({ length: 12 }, (_, i) => {
            const h = 8 + Math.pow(1.32, i) * 6
            return <rect key={i} x={170 + i * 19} y={210 - Math.min(h, 180)} width="12" height={Math.min(h, 180)} rx="2" fill={p} opacity={0.18 + i * 0.05} />
          })}
          <path d="M150 205 C260 200 330 150 392 20" fill="none" stroke={p} strokeWidth="2.5" strokeLinecap="round" />
          {[
            [250, 190],
            [320, 150],
            [362, 95],
            [392, 20],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3.5} fill="#fff" opacity="0.85" />
          ))}
        </svg>
      )
    default:
      return (
        <svg {...common}>
          {Array.from({ length: 14 }, (_, i) => (
            <line key={i} x1={200 + (i - 7) * 14} y1="110" x2={200 + (i - 7) * 70} y2="225" stroke={p} strokeOpacity="0.25" />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <line key={i} x1="0" x2="400" y1={115 + i * i * 4} y2={115 + i * i * 4} stroke={p} strokeOpacity="0.2" />
          ))}
        </svg>
      )
  }
}
