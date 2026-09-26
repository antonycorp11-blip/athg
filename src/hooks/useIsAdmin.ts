import { hasStoredSession } from '@/services/backend/client'
import { authStore } from '@/services/backend/auth'
import { useStore } from './useStore'

/** Conta atual está em app_admins (carregado pelo sync após o login). */
export function useIsAdmin(): boolean {
  return useStore(authStore).isAdmin
}

/** Status da autenticação — para esperar a checagem de admin antes de redirecionar. */
export function useAuthStatus() {
  return useStore(authStore).status
}

/**
 * Conta de verdade (email + senha) conectada. Convidados antigos não contam.
 * 'checking' = ainda carregando a sessão salva neste aparelho.
 */
export function useAccount(): 'checking' | 'signed-in' | 'signed-out' {
  const { status, userId, isAnonymous } = useStore(authStore)
  if (userId && !isAnonymous) return 'signed-in'
  if ((status === 'idle' || status === 'loading') && hasStoredSession()) return 'checking'
  return 'signed-out'
}
