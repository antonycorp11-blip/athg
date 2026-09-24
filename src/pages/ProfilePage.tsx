import { useState } from 'react'
import { Link } from 'react-router'
import { Gamepad2, Clock, Award, Coins, Pencil, Check, X, History, Play, IdCard } from 'lucide-react'
import type { CardRarity } from '@/types/player'
import { useProfile } from '@/hooks/useProfile'
import { useHistory } from '@/hooks/useLibrary'
import { useAchievements } from '@/hooks/useAchievements'
import { useSeo } from '@/hooks/useSeo'
import { useTranslation } from '@/i18n/useTranslation'
import { profileService } from '@/services/profileService'
import { gamesService, isPlayable } from '@/services/gamesService'
import { formatDate, formatPlaytime, formatRelative } from '@/utils/format'
import { Avatar } from '@/components/ui/Avatar'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { IconButton } from '@/components/ui/IconButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import { Chips } from '@/components/ui/Tabs'
import { GameArt } from '@/components/games/GameArt'
import { PlayerCard } from '@/components/profile/PlayerCard'
import { AchievementCard } from '@/components/achievements/AchievementCard'
import { AccountCard } from '@/components/account/AccountCard'
import { useToast } from '@/components/ui/Toast'

const RARITIES: CardRarity[] = ['common', 'rare', 'epic', 'legendary', 'founder', 'pass']

export default function ProfilePage() {
  const { t, locale } = useTranslation()
  const { toast } = useToast()
  const [nameError, setNameError] = useState<string | null>(null)
  const profile = useProfile()
  const { games: recent } = useHistory()
  const achievements = useAchievements()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.username)
  const [previewRarity, setPreviewRarity] = useState<CardRarity>(profile.rarity)

  useSeo({ title: t('seo.profileTitle'), description: t('profile.guestNotice'), path: '/profile', noindex: true })

  const favorite = gamesService.getBySlug(profile.favoriteGameSlug)
  const levelSpan = profile.nextLevelXp - profile.levelFloorXp
  const levelPct = Math.round(((profile.xp - profile.levelFloorXp) / levelSpan) * 100)
  const unlockedReal = achievements.filter((a) => a.unlocked && !a.demo).sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))

  const saveName = async () => {
    setNameError(null)
    const result = await profileService.updateUsername(name)
    if (result === 'invalid') return setNameError(t('account.nameInvalid'))
    if (result === 'taken') return setNameError(t('account.nameTaken'))
    setEditing(false)
    toast(t('account.nameSaved'))
  }

  return (
    <div className="space-y-8 pt-6 md:pt-8">
      <AccountCard />

      {/* Cabeçalho */}
      <section className="noise relative overflow-hidden rounded-xl border border-line bg-[radial-gradient(80%_120%_at_0%_0%,rgb(22_119_255/0.18),transparent_60%),linear-gradient(180deg,#0d1627,#0a111e)] p-5 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={profile.username} seed={profile.avatarSeed} size="xl" ring="brand" />
          <div className="min-w-0 flex-1">
            {editing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void saveName()
                }}
                className="flex items-center gap-1"
              >
                <label className="sr-only" htmlFor="username">{t('profile.nameLabel')}</label>
                <input
                  id="username"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={20}
                  minLength={3}
                  className="h-10 w-full max-w-xs rounded-md border border-brand/50 bg-white/[0.04] px-3 font-display text-xl font-bold outline-none"
                />
                <IconButton icon={Check} label={t('common.save')} type="submit" />
                <IconButton icon={X} label={t('common.cancel')} onClick={() => { setEditing(false); setName(profile.username); setNameError(null) }} />
              </form>
            ) : null}
            {editing && nameError && <p role="alert" className="mt-1 text-xs text-[#ff9aac]">{nameError}</p>}
            {!editing && (
              <div className="flex items-center gap-1">
                <h1 className="display-title truncate text-2xl sm:text-3xl">{profile.username}</h1>
                <IconButton icon={Pencil} label={t('profile.editName')} size="sm" onClick={() => { setName(profile.username); setEditing(true) }} />
              </div>
            )}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs"><IdCard size={14} aria-hidden /> {profile.athgId}</span>
              <span>{t('profile.joined', { date: formatDate(profile.joinedAt, locale) })}</span>
              <span>
                {t('profile.favoriteGame')}: <span className="font-semibold text-fg">{favorite?.title ?? t('profile.noFavoriteGame')}</span>
              </span>
            </p>

            <div className="mt-4 max-w-md">
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="font-display font-bold text-cyan">{t('common.level', { level: profile.level })}</span>
                <span className="text-xs text-muted">{profile.xp} XP · {t('profile.xpToNext', { xp: profile.nextLevelXp - profile.xp, level: profile.level + 1 })}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuenow={levelPct} aria-valuemin={0} aria-valuemax={100} aria-label="XP">
                <div className="h-full rounded-full bg-gradient-to-r from-brand to-cyan" style={{ width: `${levelPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Estatísticas */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t('profile.statsLabel')}>
        <StatCard icon={Gamepad2} label={t('profile.stats.gamesPlayed')} value={String(profile.stats.gamesPlayed)} />
        <StatCard icon={Clock} label={t('profile.stats.timePlayed')} value={formatPlaytime(profile.stats.secondsPlayed, t)} accent="cyan" />
        <StatCard icon={Award} label={t('profile.stats.achievements')} value={String(profile.stats.achievements)} accent="violet" />
        <StatCard icon={Coins} label={t('profile.stats.score')} value={profile.stats.athgScore == null ? '—' : String(profile.stats.athgScore)} hint={profile.stats.athgScore == null ? t('profile.scoreSoon') : undefined} accent="gold" />
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="recent">
            <SectionHeader id="recent" title={t('profile.recent')} icon={History} />
            {recent.length ? (
              <ul className="surface divide-y divide-line overflow-hidden rounded-card">
                {recent.slice(0, 6).map(({ game, entry }) => (
                  <li key={game.slug} className="flex items-center gap-3 p-3">
                    <Link to={`/game/${game.slug}`} className="aspect-video w-24 shrink-0 overflow-hidden rounded-md ring-1 ring-line">
                      <GameArt game={game} showTitle={false} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/game/${game.slug}`} className="block truncate font-semibold hover:text-cyan">{game.title}</Link>
                      <p className="text-xs text-muted">
                        {t('profile.lastPlayed', { when: formatRelative(entry.lastPlayedAt, t) })} · {formatPlaytime(entry.secondsPlayed, t)}
                      </p>
                    </div>
                    {isPlayable(game) && (
                      <ButtonLink to={`/play/${game.slug}`} size="sm" icon={Play} aria-label={`${t('common.continue')}: ${game.title}`}>
                        <span className="hidden sm:inline">{t('common.continue')}</span>
                      </ButtonLink>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Gamepad2} title={t('profile.recentEmpty')} action={<ButtonLink to="/games">{t('nav.allGames')}</ButtonLink>} />
            )}
          </section>

          <section aria-labelledby="profile-achievements">
            <SectionHeader id="profile-achievements" title={t('profile.achievements')} icon={Award} action={{ label: t('achievements.viewAll'), to: '/achievements' }} />
            {unlockedReal.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {unlockedReal.slice(0, 4).map((a) => (
                  <AchievementCard key={a.id} achievement={a} compact />
                ))}
              </div>
            ) : (
              <EmptyState icon={Award} title={t('achievements.locked')} text={achievements.find((a) => a.id === 'athg-first-game')?.description} />
            )}
          </section>
        </div>

        <aside aria-labelledby="player-card" className="space-y-4">
          <h2 id="player-card" className="display-title text-lg">{t('profile.playerCard')}</h2>
          <PlayerCard profile={profile} rarity={previewRarity} />
          <div>
            <p className="mb-2 text-xs text-muted">{t('profile.cardStyles')}</p>
            <Chips label={t('profile.cardStyles')} items={RARITIES.map((r) => ({ id: r, label: t(`card.rarity.${r}`) }))} value={previewRarity} onChange={setPreviewRarity} className="md:flex-wrap" />
          </div>
        </aside>
      </div>
    </div>
  )
}
