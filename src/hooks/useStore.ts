import { useSyncExternalStore } from 'react'
import type { Store } from '@/services/persistentStore'

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
