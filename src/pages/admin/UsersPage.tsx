/**
 * UsersPage.tsx — Painel de Gestão de Usuários (apenas admin)
 * Lista usuários, permite alterar papel (role) e convidar novos.
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, RefreshCw, Check, X, Mail, Shield,
  ToggleLeft, ToggleRight, ChevronDown, Send, Eye, EyeOff, Key
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth, type UserProfile, type Role, ROLE_LABELS, ROLE_COLORS } from '../../contexts/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InviteForm {
  email: string
  nome: string
  role: Role
  password: string
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-medium
        ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
    >
      {type === 'success' ? <Check size={16} /> : <X size={16} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </motion.div>
  )
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  )
}

// ─── Role Selector ────────────────────────────────────────────────────────────

function RoleSelect({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  const roles: Role[] = ['admin', 'gerente', 'producao', 'impressao', 'financeiro', 'almoxarifado']
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={e => onChange(e.target.value as Role)}
        disabled={disabled}
        className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-navy-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {roles.map(r => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

// ─── Invite Modal ──────────────────────────────────────────────────────────────

function InviteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<InviteForm>({ email: '', nome: '', role: 'producao', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof InviteForm, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.email.trim() || !form.nome.trim() || !form.password) {
      setError('Preencha todos os campos obrigatórios.'); return
    }
    if (form.password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    setSaving(true); setError('')

    // Create user via admin API (requires service role key — use Supabase admin endpoint)
    // As a workaround we use signUp + immediate profile insert
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: { nome: form.nome.trim(), role: form.role },
        emailRedirectTo: window.location.origin,
      }
    })

    if (signUpErr) { setError(signUpErr.message); setSaving(false); return }

    // Upsert the profile with the correct role
    if (data.user) {
      await supabase.from('user_profiles' as any).upsert({
        id: data.user.id,
        email: form.email.trim().toLowerCase(),
        nome: form.nome.trim(),
        role: form.role,
        ativo: true,
      })
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 460 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-navy-900 flex items-center justify-center"><Plus size={16} className="text-white" /></div>
            <div><h3 className="font-bold text-gray-900">Novo Usuário</h3><p className="text-xs text-gray-400">Cadastre um colaborador</p></div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-semibold mb-1 block">Nome completo *</label>
            <input className="input" placeholder="Ex: João Silva" value={form.nome} onChange={e => set('nome', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold mb-1 block">E-mail *</label>
            <input className="input" type="email" placeholder="email@empresa.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold mb-1 block">Senha inicial *</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="mínimo 6 caracteres" value={form.password} onChange={e => set('password', e.target.value)} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">O usuário pode alterar a senha depois no perfil.</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold mb-1 block">Papel (Permissões)</label>
            <select className="input" value={form.role} onChange={e => set('role', e.target.value as Role)}>
              <option value="admin">👑 Administrador — acesso total</option>
              <option value="gerente">🏢 Gerente — tudo exceto config. avançadas</option>
              <option value="producao">🏭 Produção — somente PCP / Kanban</option>
              <option value="impressao">🖨️ Impressão — produção + OK exclusivo na Impressão</option>
              <option value="financeiro">💰 Financeiro — Dashboard + Financeiro</option>
              <option value="almoxarifado">📦 Almoxarifado — Estoque + Patrimônio</option>
            </select>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 flex items-center gap-2">
              <X size={12} className="shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.email || !form.nome || !form.password}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white text-sm font-semibold bg-navy-900 hover:bg-blue-900 disabled:opacity-50 transition-colors">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            Cadastrar Usuário
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Reset Password Modal ──────────────────────────────────────────────────────

function ResetPasswordModal({ userProfile, onClose, onSaved }: { userProfile: UserProfile; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!password || password.length < 6) {
      setError('A senha provisória deve ter no mínimo 6 caracteres.')
      return
    }
    
    setSaving(true)
    setError('')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Por favor, faça login novamente.')

      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: userProfile.id, newPassword: password })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao redefinir a senha.')
      
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div className="modal-overlay z-50 fixed inset-0 bg-black/40 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center"><Key size={16} className="text-amber-700" /></div>
            <div>
              <h3 className="font-bold text-gray-900 leading-tight">Redefinir Senha</h3>
              <p className="text-[10px] text-gray-500">{userProfile.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 mb-2">
            Crie uma senha provisória para este usuário. Ele poderá acessar o sistema e alterá-la depois no próprio perfil.
          </p>
          <div>
            <label className="text-xs text-gray-500 font-semibold mb-1 block">Nova Senha Provisória</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="Ex: mudar123" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 flex items-center gap-2">
              <X size={12} className="shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !password}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white text-sm font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            Confirmar Reset
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { profile: me } = useAuth()
  const [users, setUsers]       = useState<UserProfile[]>([])
  const [loading, setLoading]   = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [resetUser, setResetUser] = useState<UserProfile | null>(null)
  const [saving, setSaving]     = useState<string | null>(null)
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_profiles' as any)
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { showToast('Erro ao carregar usuários: ' + error.message, 'error') }
    else setUsers((data ?? []) as unknown as UserProfile[])
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (userId === me?.id && newRole !== 'admin') {
      if (!window.confirm('Tem certeza que deseja alterar o próprio papel de Administrador?')) return
    }
    setSaving(userId)
    const { error } = await supabase
      .from('user_profiles' as any)
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)
    setSaving(null)
    if (error) showToast('Erro ao atualizar papel: ' + error.message, 'error')
    else { showToast('Papel atualizado com sucesso!'); loadUsers() }
  }

  const handleToggleAtivo = async (user: UserProfile) => {
    if (user.id === me?.id) { showToast('Você não pode desativar sua própria conta.', 'error'); return }
    setSaving(user.id)
    const { error } = await supabase
      .from('user_profiles' as any)
      .update({ ativo: !user.ativo, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    setSaving(null)
    if (error) showToast('Erro: ' + error.message, 'error')
    else { showToast(user.ativo ? 'Usuário desativado.' : 'Usuário reativado!'); loadUsers() }
  }

  const getInitials = (nome: string) => nome.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
  const getAvatarColor = (role: Role) => ({
    admin: '#7c3aed', gerente: '#1d4ed8', producao: '#b45309', impressao: '#2563eb', financeiro: '#059669', almoxarifado: '#374151'
  })[role]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={22} className="text-navy-900" /> Gestão de Usuários
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} usuário(s) cadastrado(s) · acesso para as 2 lojas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadUsers} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500" title="Recarregar">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setInviteOpen(true)} className="btn-primary">
            <Plus size={15} /> Novo Usuário
          </button>
        </div>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {(['admin','gerente','producao','impressao','financeiro','almoxarifado'] as Role[]).map(role => {
          const count = users.filter(u => u.role === role).length
          return (
            <div key={role} className="card p-3 text-center">
              <p className="text-2xl font-black text-gray-900">{count}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{ROLE_LABELS[role].split(' ').slice(1).join(' ')}</p>
            </div>
          )
        })}
      </div>

      {/* Users table */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={24} className="animate-spin text-gray-300" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Usuário</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">E-mail</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Papel</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(user => (
                <motion.tr key={user.id} layout className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ background: getAvatarColor(user.role) }}>
                        {getInitials(user.nome)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          {user.nome}
                          {user.id === me?.id && <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold">você</span>}
                        </p>
                        <p className="text-[11px] text-gray-400 md:hidden">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Mail size={12} className="text-gray-300 shrink-0" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleSelect
                      value={user.role}
                      onChange={r => handleRoleChange(user.id, r)}
                      disabled={saving === user.id}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.ativo
                      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Ativo</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />Inativo</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setResetUser(user)}
                        title="Redefinir senha (Admin)"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-400 hover:text-amber-600"
                      >
                        <Key size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleAtivo(user)}
                        disabled={saving === user.id || user.id === me?.id}
                        title={user.ativo ? 'Desativar acesso' : 'Reativar acesso'}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-gray-700"
                      >
                        {saving === user.id
                          ? <RefreshCw size={13} className="animate-spin" />
                          : user.ativo ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center">
                  <Users size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">Nenhum usuário cadastrado ainda.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Permission reference */}
      <div className="mt-6 card p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Referência de Permissões</p>
        <div className="space-y-2">
          {(['admin','gerente','producao','impressao','financeiro','almoxarifado'] as Role[]).map(role => (
            <div key={role} className="flex items-center gap-3">
              <RoleBadge role={role} />
              <p className="text-xs text-gray-500 flex-1">
                {role === 'admin' && 'Acesso total a todas as áreas, incluindo gestão de usuários'}
                {role === 'gerente' && 'Dashboard, Produção, Financeiro, Almoxarifado, Patrimônio, Parceiros, Relatórios'}
                {role === 'producao' && 'Somente painel de Produção (PCP) — Casa Linda e Lar e Vida'}
                {role === 'impressao' && 'Produção + permissão exclusiva de confirmar OK na etapa Impressão'}
                {role === 'financeiro' && 'Dashboard e módulo Financeiro completo'}
                {role === 'almoxarifado' && 'Almoxarifado e Patrimônio'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onSaved={loadUsers} />}
        {resetUser && (
          <ResetPasswordModal 
            userProfile={resetUser} 
            onClose={() => setResetUser(null)} 
            onSaved={() => showToast(`Senha de ${resetUser.nome} redefinida com sucesso!`)} 
          />
        )}
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
