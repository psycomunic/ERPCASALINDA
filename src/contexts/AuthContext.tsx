/**
 * AuthContext.tsx
 * Autenticação via Supabase Auth + perfil de usuário com role-based access (RBAC).
 * Login único para Casa Linda e Lar e Vida (mesma empresa, 2 lojas).
 */
import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'gerente' | 'producao' | 'financeiro' | 'almoxarifado'

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
  | 'users'   // admin panel

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

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured()) return
    const { data, error } = await supabase
      .from('user_profiles' as any)
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.warn('[Auth] Could not fetch profile:', error.message)
      return
    }
    setProfile(data as unknown as UserProfile)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  // ── Bootstrap session ──
  useEffect(() => {
    if (!isSupabaseConfigured()) { setLoading(false); return }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) await fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

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
  financeiro:   '💰 Financeiro',
  almoxarifado: '📦 Almoxarifado',
}

export const ROLE_COLORS: Record<Role, string> = {
  admin:        'bg-purple-100 text-purple-800 border-purple-200',
  gerente:      'bg-blue-100 text-blue-800 border-blue-200',
  producao:     'bg-amber-100 text-amber-800 border-amber-200',
  financeiro:   'bg-green-100 text-green-800 border-green-200',
  almoxarifado: 'bg-gray-100 text-gray-700 border-gray-200',
}
