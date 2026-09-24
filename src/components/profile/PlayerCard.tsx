import { useRef, type CSSProperties, type PointerEvent } from 'react'
import { Award, Heart } from 'lucide-react'
import type { CardRarity, PlayerProfile } from '@/types/player'
import { gamesService } from '@/services/gamesService'
import { useTranslation } from '@/i18n/useTranslation'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/utils/cn'

interface RarityStyle {
  border: string
  glow: string
  accent: string
  label: string
}

export const rarityStyles: Record<CardRarity, RarityStyle> = {
  common: { border: 'linear-gradient(140deg,#a9bbd0,#2b3747 40%,#56677d 70%,#a9bbd0)', glow: '#1677FF', accent: '#a9bbd0', label: 'text-[#c3cfdd]' },
  rare: { border: 'linear-gradient(140deg,#15C8FF,#0a3d6b 45%,#1677FF 75%,#8fe6ff)', glow: '#15C8FF', accent: '#15C8FF', label: 'text-cyan' },
  epic: { border: 'linear-gradient(140deg,#c4b0ff,#3b1f84 45%,#8B5CF6 75%,#e2d8ff)', glow: '#8B5CF6', accent: '#b69cff', label: 'text-[#c4b0ff]' },
  legendary: { border: 'linear-gradient(140deg,#FFE08A,#9a3d09 40%,#F6C453 70%,#fff1c2)', glow: '#F59E0B', accent: '#F6C453', label: 'text-gold' },
  founder: { border: 'linear-gradient(140deg,#15C8FF,#1677FF 30%,#8B5CF6 60%,#15C8FF 90%)', glow: '#1677FF', accent: '#15C8FF', label: 'text-cyan' },
  pass: { border: 'linear-gradient(140deg,#FFF1C2,#C98F1C 40%,#F6C453 70%,#FFE08A)', glow: '#F6C453', accent: '#F6C453', label: 'text-gold' },
}

interface PlayerCardProps {
  profile: PlayerProfile
  /** Sobrescreve a raridade (preview de estilos). */
  rarity?: CardRarity
  className?: string
}

/** ATHG Player Card — cartão colecionável do jogador, com leve tilt holográfico. */
export function PlayerCard({ profile, rarity = profile.rarity, className }: PlayerCardProps) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const style = rarityStyles[rarity]
  const favorite = gamesService.getBySlug(profile.favoriteGameSlug)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', `${(0.5 - y) * 10}deg`)
    el.style.setProperty('--ry', `${(x - 0.5) * 12}deg`)
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return (
    <div className={cn('[perspective:900px]', className)}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ background: style.border, '--glow': style.glow } as CSSProperties}
        className="group relative mx-auto aspect-[5/7] w-full max-w-[300px] rounded-[20px] p-[2px] shadow-[0_30px_60px_-25px_var(--glow)] transition-transform duration-300 ease-out [transform:rotateX(var(--rx,0))_rotateY(var(--ry,0))] [transform-style:preserve-3d]"
        role="group"
        aria-label={`${t('card.title')}: ${profile.username}`}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[18px] bg-[#070c17] p-5">
          {/* Fundo */}
          <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: `radial-gradient(90% 60% at 50% 22%, ${style.glow}40, transparent 70%)` }} aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-0 mix-blend-color-dodge transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: 'radial-gradient(circle at var(--mx,50%) var(--my,50%), rgb(255 255 255 / 0.18), transparent 45%)' }}
            aria-hidden
          />

          {/* Topo */}
          <div className="relative flex items-center justify-between">
            <span className="font-display text-[10px] font-semibold tracking-[0.22em] text-white/55 uppercase">{t('card.title')}</span>
            <span className={cn('font-display text-[11px] font-bold tracking-[0.18em] uppercase', style.label)}>{t(`card.rarity.${rarity}`)}</span>
          </div>

          {/* Avatar + nível */}
          <div className="relative mt-6 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full opacity-60 blur-xl" style={{ background: style.glow }} aria-hidden />
              <Avatar name={profile.username} seed={profile.avatarSeed} src={profile.avatarUrl} size="xl" className="relative ring-2 ring-white/20" />
              <span
                className="absolute -right-2 -bottom-1 flex size-10 flex-col items-center justify-center rounded-full border-2 bg-[#070c17] font-display leading-none"
                style={{ borderColor: style.accent }}
              >
                <span className="text-[8px] tracking-wider text-white/60 uppercase">{t('card.level')}</span>
                <span className="text-sm font-bold">{profile.level}</span>
              </span>
            </div>
          </div>

          <div className="relative mt-5 text-center">
            <p className="truncate font-display text-2xl leading-tight font-bold">{profile.username}</p>
            <span className="mt-1.5 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold" style={{ borderColor: `${style.accent}66`, color: style.accent }}>
              {t(`card.badges.${profile.badge}`)}
            </span>
          </div>

          {/* Stats */}
          <dl className="relative mt-auto grid grid-cols-2 gap-2 text-left">
            <div className="rounded-lg bg-white/[0.05] p-2.5 ring-1 ring-white/[0.06]">
              <dt className="flex items-center gap-1 text-[10px] text-white/55 uppercase">
                <Heart size={10} aria-hidden /> {t('card.favorite')}
              </dt>
              <dd className="mt-0.5 truncate text-[13px] font-semibold">{favorite?.title ?? '—'}</dd>
            </div>
            <div className="rounded-lg bg-white/[0.05] p-2.5 ring-1 ring-white/[0.06]">
              <dt className="flex items-center gap-1 text-[10px] text-white/55 uppercase">
                <Award size={10} aria-hidden /> {t('card.achievements')}
              </dt>
              <dd className="mt-0.5 text-[13px] font-semibold">{profile.stats.achievements}</dd>
            </div>
          </dl>

          {/* Rodapé */}
          <div className="relative mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <div>
              <p className="text-[9px] tracking-[0.2em] text-white/45 uppercase">{t('card.id')}</p>
              <p className="font-mono text-[11px] tracking-wider text-white/80">{profile.athgId}</p>
            </div>
            <img src="/brand/athg-symbol.png" alt="" className="h-5 w-auto opacity-80" loading="lazy" />
          </div>
        </div>
      </div>
    </div>
  )
}
