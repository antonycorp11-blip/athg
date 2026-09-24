// Wrapper seguro para localStorage (modo privado, cota cheia, SSR etc.).
const PREFIX = 'athg:'

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export const storage = {
  key: (key: string) => PREFIX + key,

  get<T>(key: string, fallback: T): T {
    try {
      const raw = safeStorage()?.getItem(PREFIX + key)
      return raw == null ? fallback : (JSON.parse(raw) as T)
    } catch {
      return fallback
    }
  },

  set<T>(key: string, value: T) {
    try {
      safeStorage()?.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      /* cota cheia ou storage bloqueado: segue sem persistir */
    }
  },

  remove(key: string) {
    try {
      safeStorage()?.removeItem(PREFIX + key)
    } catch {
      /* ignore */
    }
  },
}
