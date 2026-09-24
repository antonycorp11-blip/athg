// Cliente Supabase carregado sob demanda: quem só navega pela Home não baixa
// a biblioteca. Ela entra quando há sessão salva, retorno de email ou quando o
// jogador faz algo que precisa de conta (jogar, favoritar, entrar).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { SUPABASE_KEY, SUPABASE_URL } from '@/config/env'

export type Db = SupabaseClient<Database>

export const AUTH_STORAGE_KEY = 'athg-auth'
export const backendConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)

let clientPromise: Promise<Db> | null = null

export function getBackend(): Promise<Db> {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
      auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    }),
  )
  return clientPromise
}

export function hasStoredSession() {
  try {
    return Boolean(localStorage.getItem(AUTH_STORAGE_KEY))
  } catch {
    return false
  }
}

/** Voltando de um link de email (confirmação, recuperação de senha). */
export function urlHasAuthCallback() {
  return /[?&#](code|access_token|error_description|token_hash)=/.test(window.location.search + window.location.hash)
}

export function currentDevice(): 'mobile' | 'tablet' | 'desktop' {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  if (!coarse) return 'desktop'
  return Math.min(window.screen.width, window.screen.height) >= 700 ? 'tablet' : 'mobile'
}
