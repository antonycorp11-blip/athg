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
