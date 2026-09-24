import { createMemoryStore } from '@/services/persistentStore'

export type AuthModalMode = 'signin' | 'signup' | 'forgot' | 'reset' | 'check-email'

export const authModalStore = createMemoryStore<{ open: boolean; mode: AuthModalMode; email: string }>({
  open: false,
  mode: 'signin',
  email: '',
})

export const openAuthModal = (mode: AuthModalMode = 'signin') => authModalStore.set((s) => ({ ...s, open: true, mode }))
export const closeAuthModal = () => authModalStore.set((s) => ({ ...s, open: false }))
