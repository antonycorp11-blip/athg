import { useMemo } from 'react'
import { achievementService, unlockedStore } from '@/services/achievementService'
import { useStore } from './useStore'

export function useAchievements() {
  const unlocked = useStore(unlockedStore)
  return useMemo(() => achievementService.withState(unlocked), [unlocked])
}
