import { storage } from './storage'

export interface Store<T> {
  get: () => T
  set: (updater: T | ((prev: T) => T)) => void
  subscribe: (listener: () => void) => () => void
}

/**
 * Store mínimo persistido em localStorage, sincronizado entre abas.
 * Consumido via useStore() (useSyncExternalStore). Quando existir backend,
 * os serviços que usam isto passam a sincronizar com a API.
 */
export function createPersistentStore<T>(key: string, initial: T): Store<T> {
  let state = storage.get<T>(key, initial)
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== storage.key(key)) return
      state = storage.get<T>(key, initial)
      emit()
    })
  }

  return {
    get: () => state,
    set: (updater) => {
      state = typeof updater === 'function' ? (updater as (prev: T) => T)(state) : updater
      storage.set(key, state)
      emit()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
