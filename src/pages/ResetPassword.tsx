/**
 * ResetPassword.tsx — Página de redefinição de senha
 * Acionada quando o usuário clica no link do e-mail de recuperação.
 * O Supabase injeta o token de recuperação na URL (hash).
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, KeyRound, Loader2, Check, AlertCircle, Building2, Sofa } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Stage = 'loading' | 'form' | 'success' | 'invalid'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [stage,    setStage]    = useState<Stage>('loading')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [showCf,   setShowCf]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  // Quando o Supabase processa o link de recuperação ele dispara PASSWORD_RECOVERY
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStage('form')
      }
    })

    // Se já tiver sessão de recovery no hash, verifica após breve delay
    const timer = setTimeout(() => {
      setStage(s => s === 'loading' ? 'invalid' : s)
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }

    setSaving(true)
    setError('')

    const { error: err } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (err) {
      setError(err.message)
    } else {
      setStage('success')
      setTimeout(() => navigate('/'), 2500)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 40%, #1e1b4b 100%)' }}
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      <motion.div
        className="relative w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="rounded-2xl border border-white/10 p-8 shadow-2xl backdrop-blur-xl"
          style={{ background: 'rgba(255,255,255,0.05)' }}>

          {/* Branding */}
          <div className="mb-8 text-center">
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
            <h1 className="text-2xl font-bold text-white mb-1">Redefinir Senha</h1>
            <p className="text-sm text-gray-400">ERP Grupo Casa Linda</p>
          </div>

          {/* ── Loading ── */}
          {stage === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={32} className="animate-spin text-indigo-400" />
              <p className="text-sm text-gray-400">Validando link de recuperação...</p>
            </div>
          )}

          {/* ── Invalid / Expirado ── */}
          {stage === 'invalid' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Link inválido ou expirado</p>
                <p className="text-sm text-gray-400 mt-1">
                  Solicite um novo link de recuperação na tela de login.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-6 rounded-xl font-semibold text-sm text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
              >
                Voltar ao Login
              </button>
            </div>
          )}

          {/* ── Formulário ── */}
          {stage === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 mb-2">
                <KeyRound size={14} className="text-indigo-400 shrink-0" />
                <p className="text-xs text-indigo-300">Crie uma nova senha segura para sua conta.</p>
              </div>

              {/* Nova senha */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="mínimo 6 caracteres"
                    className="w-full rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <input
                    type={showCf ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError('') }}
                    placeholder="repita a senha"
                    className="w-full rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button type="button" onClick={() => setShowCf(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !password || !confirm}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{
                  background: saving || !password || !confirm
                    ? 'rgba(99,102,241,0.4)'
                    : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  boxShadow: !saving && password && confirm ? '0 8px 24px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                {saving
                  ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                  : <><KeyRound size={16} /> Salvar Nova Senha</>
                }
              </button>
            </form>
          )}

          {/* ── Sucesso ── */}
          {stage === 'success' && (
            <div className="text-center py-6 space-y-4">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto"
              >
                <Check size={24} className="text-emerald-400" />
              </motion.div>
              <div>
                <p className="text-white font-semibold">Senha redefinida com sucesso!</p>
                <p className="text-sm text-gray-400 mt-1">Redirecionando para o sistema...</p>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }} animate={{ width: '100%' }}
                  transition={{ duration: 2.5 }}
                />
              </div>
            </div>
          )}
        </div>

        <p className="text-center mt-4 text-[10px] text-white/15">ERP v2.0 · Grupo Casa Linda</p>
      </motion.div>
    </div>
  )
}
