// Autenticação ATHG — "play first":
// - Ninguém precisa de conta para jogar. Ao jogar pela primeira vez, criamos
//   uma conta anônima (convidado) para registrar progresso e horas.
// - Ao entrar ou criar conta, o progresso do convidado é transferido para a
//   conta (token de fusão + função merge_guest no banco).
import type { Session } from '@supabase/supabase-js'
import { createMemoryStore } from '../persistentStore'
import { storage } from '../storage'
import { backendConfigured, getBackend, hasStoredSession, urlHasAuthCallback, type Db } from './client'

export interface AuthState {
  /** idle = backend ainda não carregado; unavailable = backend fora/desligado */
  status: 'idle' | 'loading' | 'ready' | 'unavailable'
  userId: string | null
  email: string | null
  isAnonymous: boolean
  isAdmin: boolean
  /** Voltou pelo link de "esqueci minha senha": pedir nova senha. */
  recovery: boolean
}

export const authStore = createMemoryStore<AuthState>({
  status: 'idle',
  userId: null,
  email: null,
  isAnonymous: true,
  isAdmin: false,
  recovery: false,
})

const MERGE_TOKEN_KEY = 'merge-token'
type Listener = (db: Db, session: Session) => void
const signedInListeners = new Set<Listener>()
const signedOutListeners = new Set<() => void>()

let initPromise: Promise<Db | null> | null = null
let lastUserId: string | null = null

function applySession(session: Session | null) {
  const user = session?.user ?? null
  authStore.set((s) => ({
    ...s,
    status: 'ready',
    userId: user?.id ?? null,
    email: user?.email ?? null,
    isAnonymous: user ? Boolean(user.is_anonymous) : true,
    isAdmin: user && user.id === s.userId ? s.isAdmin : false,
  }))
}

function init(): Promise<Db | null> {
  if (!backendConfigured) {
    authStore.set((s) => ({ ...s, status: 'unavailable' }))
    return Promise.resolve(null)
  }
  initPromise ??= (async () => {
    authStore.set((s) => ({ ...s, status: 'loading' }))
    try {
      const db = await getBackend()
      db.auth.onAuthStateChange((event, session) => {
        applySession(session)
        if (event === 'PASSWORD_RECOVERY') authStore.set((s) => ({ ...s, recovery: true }))
        if (event === 'SIGNED_OUT') {
          lastUserId = null
          signedOutListeners.forEach((l) => l())
        }
        // Nunca chamar o Supabase direto dentro deste callback (trava o client).
        if (session && session.user.id !== lastUserId) {
          lastUserId = session.user.id
          setTimeout(() => signedInListeners.forEach((l) => l(db, session)), 0)
        }
      })
      const { data } = await db.auth.getSession()
      applySession(data.session)
      return db
    } catch (err) {
      console.warn('[auth] backend indisponível', err)
      authStore.set((s) => ({ ...s, status: 'unavailable' }))
      initPromise = null
      return null
    }
  })()
  return initPromise
}

async function prepareGuestMerge(db: Db) {
  const { data } = await db.auth.getSession()
  if (!data.session?.user.is_anonymous) return
  const { data: token } = await db.rpc('create_guest_merge_token')
  if (token) storage.set(MERGE_TOKEN_KEY, token)
}

export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; error: string }

function authError(err: { message?: string; code?: string } | null | undefined): AuthResult {
  const m = (err?.message ?? '').toLowerCase()
  const code = err?.code ?? ''
  let error = 'generic'
  if (code === 'invalid_credentials' || m.includes('invalid login')) error = 'invalidCredentials'
  else if (code === 'user_already_exists' || m.includes('already registered')) error = 'alreadyRegistered'
  else if (code === 'email_not_confirmed' || m.includes('not confirmed')) error = 'emailNotConfirmed'
  else if (code === 'weak_password' || m.includes('password')) error = 'weakPassword'
  else if (code.startsWith('over_') || m.includes('rate limit') || m.includes('too many')) error = 'rateLimited'
  else if (code === 'anonymous_provider_disabled' || m.includes('anonymous')) error = 'guestDisabled'
  return { ok: false, error }
}

export const auth = {
  /** Na abertura do site: só carrega o backend se já existe sessão ou retorno de email. */
  boot() {
    if (hasStoredSession() || urlHasAuthCallback()) void init()
  },

  onSignedIn(listener: Listener) {
    signedInListeners.add(listener)
    return () => signedInListeners.delete(listener)
  },

  onSignedOut(listener: () => void) {
    signedOutListeners.add(listener)
    return () => signedOutListeners.delete(listener)
  },

  /** Garante uma sessão (cria convidado se preciso). null = backend indisponível. */
  async ensureSession(): Promise<Db | null> {
    const db = await init()
    if (!db) return null
    const { data } = await db.auth.getSession()
    if (data.session) return db
    const { error } = await db.auth.signInAnonymously()
    if (error) {
      console.warn('[auth] não foi possível criar convidado:', error.message)
      return null
    }
    return db
  },

  /** Cliente somente se já houver sessão — nunca cria conta. */
  async sessionClient(): Promise<Db | null> {
    if (!authStore.get().userId && !hasStoredSession()) return null
    const db = await init()
    return db && authStore.get().userId ? db : null
  },

  /** Cliente para leituras públicas (rankings), sem exigir sessão. */
  publicClient: () => init(),

  takeMergeToken(): string | null {
    const token = storage.get<string | null>(MERGE_TOKEN_KEY, null)
    storage.remove(MERGE_TOKEN_KEY)
    return token
  },

  async signUp(email: string, password: string): Promise<AuthResult> {
    const db = await init()
    if (!db) return { ok: false, error: 'unavailable' }
    await prepareGuestMerge(db)
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/profile` },
    })
    if (error) return authError(error)
    // Supabase não revela se o email já existe: identities vazio = já cadastrado.
    if (data.user && data.user.identities?.length === 0) return { ok: false, error: 'alreadyRegistered' }
    return { ok: true, needsConfirmation: !data.session }
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    const db = await init()
    if (!db) return { ok: false, error: 'unavailable' }
    await prepareGuestMerge(db)
    const { error } = await db.auth.signInWithPassword({ email, password })
    return error ? authError(error) : { ok: true }
  },

  async requestPasswordReset(email: string): Promise<AuthResult> {
    const db = await init()
    if (!db) return { ok: false, error: 'unavailable' }
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/profile` })
    return error ? authError(error) : { ok: true }
  },

  async updatePassword(password: string): Promise<AuthResult> {
    const db = await init()
    if (!db) return { ok: false, error: 'unavailable' }
    const { error } = await db.auth.updateUser({ password })
    if (error) return authError(error)
    authStore.set((s) => ({ ...s, recovery: false }))
    return { ok: true }
  },

  async signOut() {
    const db = await init()
    await db?.auth.signOut()
  },

  /** LGPD: apaga a conta e todos os dados no banco, depois limpa este aparelho. */
  async deleteAccount(): Promise<AuthResult> {
    const db = await init()
    if (!db) return { ok: false, error: 'unavailable' }
    const { error } = await db.rpc('delete_my_account')
    if (error) return authError(error)
    await db.auth.signOut({ scope: 'local' })
    return { ok: true }
  },

  setAdmin(isAdmin: boolean) {
    authStore.set((s) => ({ ...s, isAdmin }))
  },
}
