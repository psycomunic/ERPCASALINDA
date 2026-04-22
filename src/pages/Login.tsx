/**
 * Login.tsx — Tela de login premium
 * Autenticação via Supabase Auth. Design: dark glassmorphism.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, LogIn, AlertCircle, Building2, Sofa, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, loading: authLoading, signIn, can } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Redirect when authenticated — don't wait for profile (may be slow due to RLS)
  useEffect(() => {
    if (authLoading || !user) return

    const from = (location.state as any)?.from?.pathname
    if (from && from !== '/login') { navigate(from, { replace: true }); return }

    // If profile loaded, use role-aware redirect; otherwise default to dashboard
    if (profile) {
      if (can('dashboard'))  { navigate('/dashboard',  { replace: true }); return }
      if (can('production')) { navigate('/production', { replace: true }); return }
      if (can('financial'))  { navigate('/financial',  { replace: true }); return }
      if (can('inventory'))  { navigate('/inventory',  { replace: true }); return }
    }
    // Profile not yet loaded or no specific permission match — go to dashboard
    navigate('/dashboard', { replace: true })
  }, [user, profile, authLoading, navigate, location, can])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Preencha e-mail e senha.'); return }
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email.trim().toLowerCase(), password)
    setLoading(false)
    if (err) setError(err)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 40%, #1e1b4b 100%)'
    }}>
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      <motion.div
        className="relative w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Card */}
        <div className="rounded-2xl border border-white/10 p-8 shadow-2xl backdrop-blur-xl"
          style={{ background: 'rgba(255,255,255,0.05)' }}>

          {/* Branding */}
          <div className="mb-8 text-center">
            {/* Store logos */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                <Building2 size={18} className="text-white" />
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-amber-500/40"
                style={{ background: 'rgba(180,83,9,0.3)' }}>
                <Sofa size={18} className="text-amber-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">ERP Grupo</h1>
            <p className="text-sm text-gray-400">Casa Linda & Lar e Vida</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all backdrop-blur-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                >
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading || !email || !password
                  ? 'rgba(99,102,241,0.4)'
                  : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                boxShadow: !loading && email && password ? '0 8px 24px rgba(99,102,241,0.4)' : 'none',
                color: 'white',
              }}
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Entrando...</>
                : <><LogIn size={16} /> Entrar no Sistema</>}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <p className="text-[11px] text-gray-600">
              Acesso restrito a colaboradores autorizados
            </p>
          </div>
        </div>

        {/* Version badge */}
        <p className="text-center mt-4 text-[10px] text-white/15">
          ERP v2.0 · Grupo Casa Linda
        </p>
      </motion.div>
    </div>
  )
}
