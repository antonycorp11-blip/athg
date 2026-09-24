// Sincronização local <-> nuvem. Os stores locais continuam sendo a fonte que
// a UI lê (rápido e funciona offline); aqui eles são alinhados com o banco.
import type { Session } from '@supabase/supabase-js'
import { favoritesStore, historyStore, type HistoryEntry } from '../library'
import { unlockedStore } from '../achievementService'
import { bestScoresStore } from '../rankingService'
import { identityStore, ensureIdentity } from '../profileService'
import { achievements } from '@/data/achievements'
import { auth } from './auth'
import type { Db } from './client'

async function mergeGuestIfPending(db: Db, session: Session) {
  if (session.user.is_anonymous) return
  const token = auth.takeMergeToken()
  if (!token) return
  const { error } = await db.rpc('merge_guest', { p_token: token })
  if (error) console.warn('[sync] merge_guest:', error.message)
}

/** Envia o que existe só neste aparelho (idempotente: upserts). */
async function pushLocal(db: Db, userId: string) {
  const favorites = favoritesStore.get()
  if (favorites.length) {
    await db.from('favorites').upsert(
      favorites.map((f) => ({ user_id: userId, game_slug: f.slug, created_at: new Date(f.addedAt).toISOString() })),
      { ignoreDuplicates: true },
    )
  }
  const unlocked = Object.entries(unlockedStore.get())
  if (unlocked.length) {
    const byId = new Map(achievements.map((a) => [a.id, a]))
    await db.from('achievement_unlocks').upsert(
      unlocked
        .filter(([id]) => byId.has(id))
        .map(([id, at]) => ({
          user_id: userId,
          achievement_id: id,
          game_slug: byId.get(id)!.scope,
          xp: byId.get(id)!.xp,
          unlocked_at: new Date(at).toISOString(),
        })),
      { ignoreDuplicates: true },
    )
  }
  for (const [game, score] of Object.entries(bestScoresStore.get())) {
    await db.rpc('submit_score', { p_game: game, p_score: Math.trunc(score) })
  }
}

/** Baixa perfil, favoritos, conquistas, pontuações e histórico da nuvem. */
async function pullRemote(db: Db, userId: string) {
  const [profile, favorites, unlocks, scores, sessions, admin] = await Promise.all([
    db.from('profiles').select('username, avatar_seed, athg_id, created_at').eq('id', userId).maybeSingle(),
    db.from('favorites').select('game_slug, created_at').order('created_at', { ascending: false }),
    db.from('achievement_unlocks').select('achievement_id, unlocked_at'),
    db.from('game_scores').select('game_slug, best_score'),
    db.from('play_sessions').select('game_slug, started_at, last_heartbeat_at, seconds_active').order('started_at', { ascending: false }).limit(1000),
    db.rpc('is_admin'),
  ])

  if (profile.data) {
    const p = profile.data
    identityStore.set({ athgId: p.athg_id, username: p.username, avatarSeed: p.avatar_seed, joinedAt: new Date(p.created_at).getTime() })
  }

  if (favorites.data) {
    favoritesStore.set(favorites.data.map((f) => ({ slug: f.game_slug, addedAt: new Date(f.created_at).getTime() })))
  }

  if (unlocks.data) {
    const remoteUnlocks = Object.fromEntries(unlocks.data.map((u) => [u.achievement_id, new Date(u.unlocked_at).getTime()]))
    unlockedStore.set((local) => ({ ...local, ...remoteUnlocks }))
  }

  if (scores.data) {
    bestScoresStore.set((local) => {
      const next = { ...local }
      for (const s of scores.data!) next[s.game_slug] = Math.max(next[s.game_slug] ?? -Infinity, s.best_score)
      return next
    })
  }

  if (sessions.data?.length) {
    const agg = new Map<string, HistoryEntry>()
    for (const s of sessions.data) {
      const started = new Date(s.started_at).getTime()
      const last = new Date(s.last_heartbeat_at).getTime()
      const cur = agg.get(s.game_slug) ?? { slug: s.game_slug, firstPlayedAt: started, lastPlayedAt: last, sessions: 0, secondsPlayed: 0 }
      cur.firstPlayedAt = Math.min(cur.firstPlayedAt, started)
      cur.lastPlayedAt = Math.max(cur.lastPlayedAt, last)
      cur.sessions += 1
      cur.secondsPlayed += s.seconds_active
      agg.set(s.game_slug, cur)
    }
    historyStore.set((local) => {
      const merged = new Map(local.map((h) => [h.slug, h]))
      for (const r of agg.values()) {
        const l = merged.get(r.slug)
        merged.set(
          r.slug,
          l
            ? {
                slug: r.slug,
                firstPlayedAt: Math.min(l.firstPlayedAt, r.firstPlayedAt),
                lastPlayedAt: Math.max(l.lastPlayedAt, r.lastPlayedAt),
                sessions: Math.max(l.sessions, r.sessions),
                secondsPlayed: Math.max(l.secondsPlayed, r.secondsPlayed),
              }
            : r,
        )
      }
      return [...merged.values()].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
    })
  }

  auth.setAdmin(admin.data === true)
}

let running: Promise<void> | null = null

async function syncAll(db: Db, session: Session) {
  running ??= (async () => {
    try {
      await mergeGuestIfPending(db, session)
      await pushLocal(db, session.user.id)
      await pullRemote(db, session.user.id)
    } catch (err) {
      console.warn('[sync] falhou (segue com dados locais):', err)
    } finally {
      running = null
    }
  })()
  return running
}

/** Liga a sincronização. Chamado uma vez no main.tsx. */
export function startSync() {
  auth.onSignedIn((db, session) => void syncAll(db, session))
  // Saiu da conta: limpa os dados locais para não vazarem para a próxima pessoa.
  auth.onSignedOut(() => {
    favoritesStore.set([])
    historyStore.set([])
    unlockedStore.set({})
    bestScoresStore.set({})
    identityStore.set(null)
    ensureIdentity()
  })
}
