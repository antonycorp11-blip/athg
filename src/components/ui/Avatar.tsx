import { cn } from '@/utils/cn'
import { hashString, initials } from '@/utils/text'

const palettes = [
  ['#1677FF', '#15C8FF'],
  ['#8B5CF6', '#1677FF'],
  ['#0066FF', '#8B5CF6'],
  ['#15C8FF', '#0EA57A'],
  ['#F6C453', '#E2621B'],
  ['#E23A5B', '#8B5CF6'],
  ['#0FB5C9', '#1677FF'],
]

interface AvatarProps {
  name: string
  seed?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  ring?: 'none' | 'brand' | 'gold'
  className?: string
}

const sizes = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-xl',
  xl: 'size-24 text-3xl',
}
const rings = {
  none: '',
  brand: 'ring-2 ring-brand/70 ring-offset-2 ring-offset-bg',
  gold: 'ring-2 ring-gold ring-offset-2 ring-offset-bg',
}

/** Avatar gerado a partir de uma semente (sem imagens externas). */
export function Avatar({ name, seed, src, size = 'md', ring = 'none', className }: AvatarProps) {
  const h = hashString(seed ?? name)
  const [a, b] = palettes[h % palettes.length]
  const angle = h % 360
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold text-white',
        sizes[size],
        rings[ring],
        className,
      )}
      style={{ background: `linear-gradient(${angle}deg, ${a}, ${b})` }}
      role="img"
      aria-label={name}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden className="drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)]">
          {initials(name)}
        </span>
      )}
    </span>
  )
}
