/**
 * AuthContext.tsx
 * Autenticação via Supabase Auth + perfil de usuário com role-based access (RBAC).
 * Login único para Casa Linda e Lar e Vida (mesma empresa, 2 lojas).
 */
import {
  createContext, useContext, useEffect, useState, useCallback, useRef,
  type ReactNode,
} from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'gerente' | 'producao' | 'impressao' | 'financeiro' | 'almoxarifado'

export type Module =
  | 'dashboard'
  | 'production'
  | 'financial'
  | 'inventory'
  | 'patrimonio'
  | 'partners'
  | 'reports'
  | 'settings'
  | 'catalogo'
  | 'users'

export interface UserProfile {
  id: string
  email: string
  nome: string
  role: Role
  avatar_url?: string | null
  ativo: boolean
  created_at: string
}

// ─── Permission Map ───────────────────────────────────────────────────────────

const ROLE_MODULES: Record<Role, Module[]> = {
  admin:        ['dashboard','production','financial','inventory','patrimonio','partners','reports','settings','catalogo','users'],
  gerente:      ['dashboard','production','financial','inventory','patrimonio','partners','reports','catalogo'],
  producao:     ['production'],
  impressao:    ['production'],
  financeiro:   ['dashboard','financial'],
  almoxarifado: ['inventory','patrimonio'],
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthCtx {
  user:    User | null
  profile: UserProfile | null
  loading: boolean
  signIn:  (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  can:     (module: Module) => boolean
  isAdmin: boolean
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null, profile: null, loading: true,
  signIn: async () => ({}), signOut: async () => {},
  can: () => false, isAdmin: false,
  refreshProfile: async () => {},
})

// ─── Helper: fetch profile with timeout ───────────────────────────────────────

async function fetchProfileSafe(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return null
  try {
    // Race against a 4-second timeout
    const result = await Promise.race([
      supabase
        .from('user_profiles' as any)
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('profile fetch timeout')), 4000)
      ),
    ]) as { data: unknown; error: unknown }

    if (result.data) return result.data as UserProfile
    if (result.error) console.warn('[Auth] fetchProfile:', (result.error as any).message)
  } catch (e) {
    console.warn('[Auth] fetchProfile failed:', (e as Error).message)
  }
  return null
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  // Prevent duplicate profile fetches (getSession + onAuthStateChange can fire together)
  const fetchingRef = useRef(false)

  const loadProfile = useCallback(async (u: User) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    const p = await fetchProfileSafe(u.id)
    if (p) setProfile(p) // Only update if we got a valid profile; keep existing on failure
    fetchingRef.current = false
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      fetchingRef.current = false // allow re-fetch
      await loadProfile(user)
    }
  }, [user, loadProfile])

  // ── Bootstrap: check for existing session ──
  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return }

    // Hard safety net: never stay on loading screen more than 6 seconds
    const safetyTimer = setTimeout(() => {
      console.warn('[Auth] Safety timeout hit — forcing loading=false')
      setLoading(false)
    }, 6000)

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) console.warn('[Auth] getSession error:', error.message)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) await loadProfile(currentUser)
      clearTimeout(safetyTimer)
      setLoading(false)
    }).catch(err => {
      console.error('[Auth] getSession threw:', err)
      clearTimeout(safetyTimer)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only clear profile/user on explicit sign out
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        fetchingRef.current = false
        return
      }

      const currentUser = session?.user ?? null
      if (!currentUser) return

      setUser(currentUser)

      // On token refresh or new sign-in, try to reload profile
      // but KEEP the existing profile if the fetch fails
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        fetchingRef.current = false // allow re-fetch on these important events
        await loadProfile(currentUser)
      }
    })

    return () => {
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [loadProfile])

  // ── SignIn ──
  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase não configurado. Verifique o .env do projeto.' }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message.includes('Invalid login credentials')
        ? 'E-mail ou senha incorretos.'
        : error.message
      return { error: msg }
    }
    return {}
  }, [])

  // ── SignOut ──
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    fetchingRef.current = false
  }, [])

  // ── Permission check ──
  const can = useCallback((module: Module): boolean => {
    if (!profile) return false
    if (!profile.ativo) return false
    return ROLE_MODULES[profile.role]?.includes(module) ?? false
  }, [profile])

  const isAdmin = profile?.role === 'admin' && profile.ativo

  return (
    <Ctx.Provider value={{ user, profile, loading, signIn, signOut, can, isAdmin, refreshProfile }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx)

// ─── Role labels ──────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<Role, string> = {
  admin:        '👑 Administrador',
  gerente:      '🏢 Gerente',
  producao:     '🏭 Produção',
  impressao:    '🖨️ Impressão',
  financeiro:   '💰 Financeiro',
  almoxarifado: '📦 Almoxarifado',
}

export const ROLE_COLORS: Record<Role, string> = {
  admin:        'bg-purple-100 text-purple-800 border-purple-200',
  gerente:      'bg-blue-100 text-blue-800 border-blue-200',
  producao:     'bg-amber-100 text-amber-800 border-amber-200',
  impressao:    'bg-blue-100 text-blue-900 border-blue-300',
  financeiro:   'bg-green-100 text-green-800 border-green-200',
  almoxarifado: 'bg-gray-100 text-gray-700 border-gray-200',
}
