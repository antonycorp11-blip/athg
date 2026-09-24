import { useMemo } from 'react'
import { useParams } from 'react-router'
import { Play, Share2, Hourglass, Gamepad2, ScrollText, Image, Layers, Info, Code, Calendar, MonitorSmartphone, RotateCw } from 'lucide-react'
import { gamesService, isAdminPreview, isPlayable } from '@/services/gamesService'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { analytics } from '@/services/analytics'
import { useSeo } from '@/hooks/useSeo'
import { useShareGame } from '@/hooks/useShare'
import { useTranslation } from '@/i18n/useTranslation'
import { SITE_URL } from '@/config/env'
import { gameMeta } from '@/utils/seo'
import { formatDate } from '@/utils/format'
import { GameArt } from '@/components/games/GameArt'
import { GameBadges } from '@/components/games/GameBadges'
import { FavoriteButton } from '@/components/games/FavoriteButton'
import { GameCarousel } from '@/components/games/GameCarousel'
import { GameCard } from '@/components/games/GameCard'
import { GameNotFound } from '@/components/games/GameNotFound'
import { Button, ButtonLink } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { AdSlot } from '@/components/ads/AdSlot'
import { Link, Navigate } from 'react-router'

export default function GamePage() {
  const { slug } = useParams()
  const game = gamesService.getBySlug(slug)
  const { t, locale } = useTranslation()
  const share = useShareGame()
  const related = useMemo(() => (game ? gamesService.getRelated(game) : []), [game])
  const isAdmin = useIsAdmin()

  useSeo(game ? gameMeta(game, t, SITE_URL) : null)

  if (!game) return <GameNotFound />
  if (game.slug !== slug) return <Navigate to={`/game/${game.slug}`} replace />

  const playable = isPlayable(game, isAdmin)
  const preview = isAdminPreview(game, isAdmin)
  const onPlay = () => analytics.track('game_card_clicked', { game: game.slug, source: 'game_page', target: 'play' })

  const info = [
    { icon: Code, label: t('game.developer'), value: game.developer },
    game.releaseDate && { icon: Calendar, label: t('game.released'), value: formatDate(game.releaseDate, locale) },
    { icon: MonitorSmartphone, label: t('game.platforms'), value: game.supportsMobile ? t('game.desktopAndMobile') : t('game.desktopOnly') },
    { icon: RotateCw, label: t('game.orientation'), value: t(`game.orientations.${game.orientation}`) },
  ].filter(Boolean) as { icon: typeof Code; label: string; value: string }[]

  return (
    <div className="pt-4 pb-20 md:pt-6 md:pb-0">
      {/* Banner */}
      <section className="noise relative isolate flex min-h-[380px] overflow-hidden rounded-xl ring-1 ring-line md:min-h-[420px]">
        <div className="absolute inset-0 -z-10">
          <GameArt game={game} variant="banner" priority showTitle={false} />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/60 to-bg/5 md:bg-gradient-to-r md:from-bg/95 md:via-bg/55 md:to-transparent" />
        <div className="mt-auto w-full max-w-2xl p-5 sm:p-8 md:my-auto lg:p-12">
          <GameBadges game={game} className="mb-3 flex flex-wrap gap-1.5" />
          <h1 className="display-title text-4xl leading-[0.95] uppercase sm:text-6xl">{game.title}</h1>
          {game.tagline && <p className="mt-3 text-lg font-semibold">{game.tagline}</p>}
          <p className="mt-2 max-w-lg text-sm text-muted sm:text-[15px]">{game.shortDescription}</p>
          <p className="mt-3 text-xs text-subtle">
            {t('common.by', { name: game.developer })} · {t('game.free')} · {t('game.noInstall')}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {playable ? (
              <ButtonLink to={`/play/${game.slug}`} size="lg" icon={Play} onClick={onPlay} className="font-display tracking-wider uppercase">
                {t('common.playNow')}
              </ButtonLink>
            ) : (
              <Button size="lg" variant="secondary" icon={Hourglass} disabled className="!opacity-80">
                {t('common.comingSoon')}
              </Button>
            )}
            <FavoriteButton game={game} variant="button" size="lg" />
            <Button size="lg" variant="secondary" icon={Share2} onClick={() => share(game, 'game_page')} aria-label={t('common.share')}>
              <span className="hidden sm:inline">{t('common.share')}</span>
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div className="min-w-0 space-y-10">
          {preview && (
            <div className="flex items-start gap-3 rounded-card border border-brand/40 bg-brand/10 p-4">
              <Code size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
              <div>
                <p className="font-semibold">Prévia de desenvolvimento (admin)</p>
                <p className="text-sm text-muted">Só contas admin veem o botão Jogar. Para o público este jogo continua como “Em breve”.</p>
              </div>
            </div>
          )}
          {!playable && (
            <div className="flex items-start gap-3 rounded-card border border-violet/30 bg-violet/10 p-4">
              <Hourglass size={18} className="mt-0.5 shrink-0 text-[#b69cff]" aria-hidden />
              <div>
                <p className="font-semibold">{t('game.comingSoonTitle')}</p>
                <p className="text-sm text-muted">{t('game.comingSoonText')}</p>
              </div>
            </div>
          )}

          <section aria-labelledby="about">
            <SectionHeader id="about" title={t('game.about')} icon={Info} />
            <p className="max-w-3xl text-[15px] leading-relaxed text-fg/85">{game.description}</p>
          </section>

          {game.instructions.length > 0 && (
            <section aria-labelledby="how-to">
              <SectionHeader id="how-to" title={t('game.howToPlay')} icon={Gamepad2} />
              <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {game.instructions.map((step, i) => (
                  <li key={i} className="surface flex gap-3 rounded-card p-3.5 text-sm text-fg/85">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand/15 font-display text-xs font-bold text-brand">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="screens">
            <SectionHeader id="screens" title={t('game.screenshots')} icon={Image} />
            {game.screenshots.length ? (
              <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:px-0">
                {game.screenshots.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt={`${game.title} — screenshot ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="aspect-video w-[80%] shrink-0 snap-start rounded-card object-cover ring-1 ring-line sm:w-[46%]"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="relative aspect-video overflow-hidden rounded-card opacity-40 ring-1 ring-line">
                    <GameArt game={game} showTitle={false} />
                  </div>
                ))}
                <p className="col-span-3 text-sm text-muted">{t('game.screenshotsEmpty')}</p>
              </div>
            )}
          </section>

          <section aria-labelledby="updates">
            <SectionHeader id="updates" title={t('game.updates')} icon={ScrollText} />
            <p className="rounded-card border border-dashed border-line-strong p-5 text-sm text-muted">{t('game.updatesEmpty')}</p>
          </section>
        </div>

        {/* Ficha técnica */}
        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          <div className="surface rounded-card p-5">
            <dl className="space-y-3.5">
              {info.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon size={16} className="shrink-0 text-muted" aria-hidden />
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="ml-auto text-right text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 flex items-center gap-2 text-xs text-muted">
                <Layers size={13} aria-hidden /> {t('game.categories')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {game.categories.map((c) => (
                  <Link key={c} to={`/category/${c}`} className="rounded-full border border-line bg-white/[0.04] px-2.5 py-1 text-xs font-medium hover:border-brand/50 hover:text-fg">
                    {t(`categories.${c}`)}
                  </Link>
                ))}
                {game.tags.map((tag) => (
                  <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`} className="rounded-full px-2.5 py-1 text-xs text-muted hover:text-fg">
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <AdSlot placement="game-page" />
        </aside>
      </div>

      <GameCarousel
        className="mt-12"
        title={t('game.similar')}
        icon={Layers}
        items={related}
        getKey={(g) => g.slug}
        renderItem={(g) => <GameCard game={g} source="game_similar" />}
      />

      {/* CTA fixo no mobile: jogar está sempre a um toque */}
      {playable && (
        <div className="fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+var(--safe-bottom))] z-30 border-t border-line bg-bg/90 p-3 backdrop-blur-xl md:hidden">
          <ButtonLink to={`/play/${game.slug}`} size="lg" icon={Play} fullWidth onClick={onPlay} className="font-display tracking-wider uppercase">
            {t('common.playNow')}
          </ButtonLink>
        </div>
      )}
    </div>
  )
}
