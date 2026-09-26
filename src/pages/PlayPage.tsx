import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { Share2, Flag, ArrowLeft, Sparkles, Layers } from 'lucide-react'
import { gamesService, isPlayable } from '@/services/gamesService'
import { useAccount, useAuthStatus, useIsAdmin } from '@/hooks/useIsAdmin'
import { useSeo } from '@/hooks/useSeo'
import { useShareGame } from '@/hooks/useShare'
import { usePlaySession } from '@/hooks/usePlaySession'
import { useTranslation } from '@/i18n/useTranslation'
import { GamePlayer } from '@/components/player/GamePlayer'
import { AccountGate } from '@/components/account/AccountGate'
import { ReportProblemModal } from '@/components/player/ReportProblemModal'
import { GameArt } from '@/components/games/GameArt'
import { FavoriteButton } from '@/components/games/FavoriteButton'
import { GameCarousel } from '@/components/games/GameCarousel'
import { GameCard } from '@/components/games/GameCard'
import { GameNotFound } from '@/components/games/GameNotFound'
import { IconButton } from '@/components/ui/IconButton'
import { AdSlot } from '@/components/ads/AdSlot'
import { resolveGameUrl } from '@/utils/gameUrl'

export default function PlayPage() {
  const { slug } = useParams()
  const game = gamesService.getBySlug(slug)
  const { t } = useTranslation()
  const share = useShareGame()
  const [reportOpen, setReportOpen] = useState(false)
  const isAdmin = useIsAdmin()
  const authStatus = useAuthStatus()
  const playable = Boolean(game && isPlayable(game, isAdmin))
  // Prévia admin: a flag de admin chega depois do login/sync. Espera um pouco antes de mandar embora.
  const [adminWaitOver, setAdminWaitOver] = useState(false)
  const awaitingAdmin = Boolean(game?.adminPreview && game.status === 'coming-soon' && !isAdmin && !adminWaitOver && authStatus !== 'unavailable')
  useEffect(() => {
    if (!awaitingAdmin) return
    const timer = setTimeout(() => setAdminWaitOver(true), 5000)
    return () => clearTimeout(timer)
  }, [awaitingAdmin])

  // Jogar exige conta: sem ela, o player dá lugar ao convite para entrar/criar conta.
  const account = useAccount()
  usePlaySession(game?.slug, playable && account === 'signed-in')
  useSeo(game ? { title: t('seo.playTitle', { title: game.title }), description: game.shortDescription, path: `/game/${game.slug}`, noindex: true } : null)

  const { originals, similar } = useMemo(() => {
    if (!game) return { originals: [], similar: [] }
    return {
      originals: gamesService.getOriginals().filter((g) => g.slug !== game.slug),
      similar: gamesService.getRelated(game),
    }
  }, [game])

  if (!game) return <GameNotFound />
  if (game.slug !== slug) return <Navigate to={`/play/${game.slug}`} replace />
  if (awaitingAdmin || account === 'checking') return <div className="py-24 text-center text-sm text-muted">Verificando acesso…</div>
  // Em breve / sem build: a página do jogo explica o status.
  if (!playable || !game.gameUrl) return <Navigate to={`/game/${game.slug}`} replace />

  return (
    <div className="pt-0 md:pt-5">
      {account !== 'signed-in' ? (
        <AccountGate title={game.title} poster={<GameArt game={game} variant="banner" showTitle={false} />} />
      ) : (
        <GamePlayer
          key={game.slug}
          slug={game.slug}
          gameUrl={resolveGameUrl(game)}
          title={game.title}
          orientation={game.orientation}
          supportsMobile={game.supportsMobile}
          aspectRatio={game.aspectRatio}
          poster={<GameArt game={game} variant="banner" showTitle={false} />}
          toolbarStart={
            <Link to={`/game/${game.slug}`} className="group flex min-w-0 items-center gap-2.5" aria-label={t('player.backToGame')}>
              <span className="hidden aspect-video w-14 shrink-0 overflow-hidden rounded-md ring-1 ring-line xs:block">
                <GameArt game={game} showTitle={false} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold group-hover:text-cyan">{game.title}</span>
                <span className="block truncate text-xs text-muted">{t('common.by', { name: game.developer })}</span>
              </span>
            </Link>
          }
          toolbarActions={
            <>
              <FavoriteButton game={game} className="size-10 border-0 bg-transparent backdrop-blur-none hover:bg-white/[0.07] hover:scale-100" />
              <IconButton icon={Share2} label={t('common.share')} onClick={() => share(game, 'player')} />
              <IconButton icon={Flag} label={t('player.report')} onClick={() => setReportOpen(true)} />
            </>
          }
        />
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="max-w-3xl">
          <h1 className="display-title text-2xl uppercase sm:text-3xl">{game.title}</h1>
          <p className="mt-1.5 text-sm text-muted sm:text-[15px]">{game.shortDescription}</p>
          <Link to={`/game/${game.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-cyan">
            <ArrowLeft size={15} aria-hidden /> {t('player.backToGame')}
          </Link>
        </div>
        <AdSlot placement="play-sidebar" />
      </div>

      <AdSlot placement="play-below" className="mt-8" />

      <div className="mt-10 space-y-10">
        <GameCarousel
          title={t('player.otherATHG')}
          icon={Sparkles}
          items={originals}
          getKey={(g) => g.slug}
          renderItem={(g) => <GameCard game={g} source="player_originals" />}
        />
        <GameCarousel
          title={t('player.similar')}
          icon={Layers}
          items={similar}
          getKey={(g) => g.slug}
          renderItem={(g) => <GameCard game={g} source="player_similar" />}
        />
      </div>

      <ReportProblemModal open={reportOpen} onClose={() => setReportOpen(false)} game={game.slug} title={game.title} />
    </div>
  )
}
