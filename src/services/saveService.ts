// Saves dos jogos (via bridge SAVE_GAME / LOAD_GAME).
// V1: localStorage neste dispositivo. Futuro: provider de save em nuvem por conta.
import { storage } from './storage'

const MAX_BYTES = 512 * 1024

export interface SaveProvider {
  save: (game: string, slot: string, data: unknown) => Promise<{ ok: boolean; error?: string }>
  load: (game: string, slot: string) => Promise<unknown>
}

const localProvider: SaveProvider = {
  async save(game, slot, data) {
    const serialized = JSON.stringify(data ?? null)
    if (serialized.length > MAX_BYTES) return { ok: false, error: 'SAVE_TOO_LARGE' }
    storage.set(`save:${game}:${slot}`, { data, savedAt: Date.now() })
    return { ok: true }
  },
  async load(game, slot) {
    return storage.get<{ data: unknown } | null>(`save:${game}:${slot}`, null)?.data ?? null
  },
}

let provider: SaveProvider = localProvider

export const saveService = {
  setProvider(next: SaveProvider) {
    provider = next
  },
  save: (game: string, data: unknown, slot = 'default') => provider.save(game, slot, data),
  load: (game: string, slot = 'default') => provider.load(game, slot),
}
