import { useMemo } from 'react'
import { favoritesStore, historyStore } from '@/services/library'
import { unlockedStore } from '@/services/achievementService'
import { ensureIdentity, identityStore, profileService } from '@/services/profileService'
import { useStore } from './useStore'

export function useProfile() {
  const identity = useStore(identityStore) ?? ensureIdentity()
  const history = useStore(historyStore)
  const favorites = useStore(favoritesStore)
  const unlocked = useStore(unlockedStore)
  return useMemo(
    () => profileService.compute(identity, history, favorites, unlocked),
    [identity, history, favorites, unlocked],
  )
}
