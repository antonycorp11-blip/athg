// Saves dos jogos (via bridge SAVE_GAME / LOAD_GAME).
// Nuvem (Supabase) quando há sessão + cópia local sempre, para funcionar offline.
import { storage } from './storage'
import { remote } from './backend/remote'

const MAX_BYTES = 512 * 1024
const localKey = (game: string, slot: string) => `save:${game}:${slot}`

export const saveService = {
  async save(game: string, data: unknown, slot = 'default'): Promise<{ ok: boolean; error?: string }> {
    const serialized = JSON.stringify(data ?? null)
    if (serialized.length > MAX_BYTES) return { ok: false, error: 'SAVE_TOO_LARGE' }
    storage.set(localKey(game, slot), { data, savedAt: Date.now() })
    void remote.saveGame(game, slot, data)
    return { ok: true }
  },

  async load(game: string, slot = 'default'): Promise<unknown> {
    const cloud = await remote.loadGame(game, slot).catch(() => ({ found: false, data: null }))
    if (cloud.found) return cloud.data
    return storage.get<{ data: unknown } | null>(localKey(game, slot), null)?.data ?? null
  },
}
