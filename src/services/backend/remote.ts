// Escritas no backend. Todas são "melhor esforço": se o backend estiver fora,
// o site continua funcionando com os dados locais (e sincroniza depois).
import type { Json } from '@/types/database'
import { auth, authStore } from './auth'
import { currentDevice } from './client'

function warn(what: string, error: unknown) {
  if (error) console.warn(`[remote] ${what}:`, error)
}

// ---------- Eventos de analytics (em lote) ----------
const REMOTE_EVENTS = new Set([
  'game_card_clicked',
  'search',
  'favorite_added',
  'favorite_removed',
  'share_clicked',
  'pass_clicked',
  'game_event',
])
const MAX_QUEUE = 50
let queue: { name: string; props: Json }[] = []
let flushTimer: number | undefined

async function flushEvents() {
  flushTimer = undefined
  if (!queue.length) return
  const db = await auth.sessionClient()
  if (!db) return // sem sessão: segura na fila até existir uma
  const batch = queue.splice(0, queue.length)
  const { error } = await db.from('events').insert(batch)
  warn('events', error)
}

export const remote = {
  // ---------- Sessões de jogo ----------
  async startSession(game: string): Promise<string | null> {
    const db = await auth.ensureSession()
    if (!db) return null
    const { data, error } = await db.rpc('start_session', { p_game: game, p_device: currentDevice() })
    warn('start_session', error)
    return data ?? null
  },

  async heartbeat(sessionId: string, seconds: number) {
    const db = await auth.sessionClient()
    if (!db) return
    const { error } = await db.rpc('heartbeat', { p_session: sessionId, p_seconds: Math.round(seconds) })
    warn('heartbeat', error)
  },

  // ---------- Favoritos ----------
  async setFavorite(game: string, favorite: boolean) {
    const db = await auth.ensureSession()
    const userId = authStore.get().userId
    if (!db || !userId) return
    const { error } = favorite
      ? await db.from('favorites').upsert({ user_id: userId, game_slug: game }, { ignoreDuplicates: true })
      : await db.from('favorites').delete().eq('user_id', userId).eq('game_slug', game)
    warn('favorites', error)
  },

  // ---------- Conquistas / pontuação ----------
  async unlockAchievement(id: string, game: string, xp: number) {
    const db = await auth.sessionClient()
    const userId = authStore.get().userId
    if (!db || !userId) return
    const { error } = await db
      .from('achievement_unlocks')
      .upsert({ user_id: userId, achievement_id: id, game_slug: game, xp }, { ignoreDuplicates: true })
    warn('achievement', error)
  },

  async submitScore(game: string, score: number) {
    const db = await auth.sessionClient()
    if (!db) return
    const { error } = await db.rpc('submit_score', { p_game: game, p_score: Math.trunc(score) })
    warn('submit_score', error)
  },

  // ---------- Saves ----------
  async saveGame(game: string, slot: string, data: unknown): Promise<boolean> {
    const db = await auth.ensureSession()
    const userId = authStore.get().userId
    if (!db || !userId) return false
    const { error } = await db
      .from('game_saves')
      .upsert({ user_id: userId, game_slug: game, slot, data: data as Json, updated_at: new Date().toISOString() })
    warn('save', error)
    return !error
  },

  async loadGame(game: string, slot: string): Promise<{ found: boolean; data: unknown }> {
    const db = await auth.sessionClient()
    if (!db) return { found: false, data: null }
    const { data, error } = await db.from('game_saves').select('data').eq('game_slug', game).eq('slot', slot).maybeSingle()
    warn('load', error)
    return { found: Boolean(data), data: data?.data ?? null }
  },

  // ---------- Reports ----------
  async report(input: { game: string; type: string; details: string; userAgent: string; url: string }) {
    const db = await auth.ensureSession()
    const userId = authStore.get().userId
    if (!db || !userId) return false
    const { error } = await db.from('problem_reports').insert({
      user_id: userId,
      game_slug: input.game,
      type: input.type,
      details: input.details,
      user_agent: input.userAgent.slice(0, 400),
      url: input.url.slice(0, 400),
    })
    warn('report', error)
    return !error
  },

  // ---------- Perfil ----------
  async updateUsername(username: string): Promise<'ok' | 'taken' | 'error'> {
    const db = await auth.ensureSession()
    const userId = authStore.get().userId
    if (!db || !userId) return 'error'
    const { error } = await db.from('profiles').update({ username }).eq('id', userId)
    if (!error) return 'ok'
    return error.code === '23505' ? 'taken' : 'error'
  },

  // ---------- Analytics ----------
  trackEvent(name: string, props: Record<string, unknown> | undefined) {
    if (!REMOTE_EVENTS.has(name)) return
    queue.push({ name, props: (props ?? {}) as Json })
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE)
    flushTimer ??= window.setTimeout(() => void flushEvents(), 8000)
  },

  flushEvents,
}
