// Perfil do jogador, calculado a partir da atividade (cache local sincronizado
// com o Supabase). A identidade vem do banco quando há sessão.
import type { PlayerBadge, PlayerProfile } from '@/types/player'
import { createPersistentStore } from './persistentStore'
import type { FavoriteEntry, HistoryEntry } from './library'
import { achievementService } from './achievementService'
import { remote } from './backend/remote'

export interface LocalIdentity {
  athgId: string
  username: string
  avatarSeed: string
  joinedAt: number
}

function randomBlock(len: number) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

function createIdentity(): LocalIdentity {
  const tag = String(1000 + (crypto.getRandomValues(new Uint16Array(1))[0] % 9000))
  return {
    athgId: `ATHG-${randomBlock(4)}-${randomBlock(4)}`,
    username: `Jogador${tag}`,
    avatarSeed: randomBlock(8),
    joinedAt: Date.now(),
  }
}

export const identityStore = createPersistentStore<LocalIdentity | null>('identity', null)

export function ensureIdentity(): LocalIdentity {
  const current = identityStore.get()
  if (current) return current
  const created = createIdentity()
  identityStore.set(created)
  return created
}

// Curva de nível: nível L exige 150 * L * (L - 1) / 2 XP acumulado.
const LEVEL_STEP = 150
export const xpForLevel = (level: number) => (LEVEL_STEP * level * (level - 1)) / 2

export function levelFromXp(xp: number) {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  return level
}

function badgeFor(level: number): PlayerBadge {
  if (level >= 10) return 'veteran'
  if (level >= 3) return 'explorer'
  return 'rookie'
}

export const profileService = {
  /** Valida, grava na nuvem (nome é único) e atualiza o cache local. */
  async updateUsername(username: string): Promise<'ok' | 'invalid' | 'taken' | 'error'> {
    const clean = username.replace(/[^\p{L}\p{N}_.-]/gu, '').slice(0, 20)
    if (clean.length < 3) return 'invalid'
    const result = await remote.updateUsername(clean)
    if (result === 'taken') return 'taken'
    identityStore.set({ ...ensureIdentity(), username: clean })
    return result === 'error' ? 'error' : 'ok'
  },

  compute(
    identity: LocalIdentity,
    history: HistoryEntry[],
    favorites: FavoriteEntry[],
    unlocked: Record<string, number>,
  ): PlayerProfile {
    const secondsPlayed = history.reduce((s, h) => s + h.secondsPlayed, 0)
    const xp = history.length * 100 + Math.floor(secondsPlayed / 60) * 2 + achievementService.realXp(unlocked)
    const level = levelFromXp(xp)
    const mostPlayed = [...history].sort((a, b) => b.secondsPlayed - a.secondsPlayed || b.sessions - a.sessions)[0]

    return {
      ...identity,
      level,
      xp,
      levelFloorXp: xpForLevel(level),
      nextLevelXp: xpForLevel(level + 1),
      favoriteGameSlug: mostPlayed?.slug ?? favorites[0]?.slug,
      badge: badgeFor(level),
      rarity: 'common',
      stats: {
        gamesPlayed: history.length,
        secondsPlayed,
        achievements: Object.keys(unlocked).length,
        athgScore: null,
      },
      isGuest: true,
    }
  },
}
