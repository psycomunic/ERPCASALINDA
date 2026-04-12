import { useState } from 'react'
import { useLayout } from '../contexts/LayoutContext'
import {
  User, Bell, Palette, Shield, Building, Sun, Moon, Monitor,
  Save, Lock, Check, X, Plug, RefreshCw, CheckCircle2, AlertCircle, Circle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { testMagazordConnection, isMagazordConfigured, getMagazordStatus } from '../magazord'

const SECTIONS = [
  { id: 'Perfil',        icon: User },
  { id: 'Notificações', icon: Bell },
  { id: 'Aparência',    icon: Palette },
  { id: 'Empresa',      icon: Building },
  { id: 'Integrações',  icon: Plug },
  { id: 'Segurança',    icon: Shield },
]

function Toast({ msg, isError, onClose }: { msg: string; isError?: boolean; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm ${isError ? 'bg-red-600' : 'bg-gray-900'} text-white`}
    >
      {isError
        ? <X size={16} className="text-red-200 shrink-0" />
        : <Check size={16} className="text-green-400 shrink-0" />
      }
      {msg}
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white"><X size={14} /></button>
    </motion.div>
  )
}

export default function Settings() {
  const { activeTab, setActiveTab } = useLayout()
  const [theme, setTheme]   = useState<'light' | 'dark' | 'system'>('light')
  const [toast, setToast]   = useState<{ msg: string; isError?: boolean } | null>(null)
  const [notifs, setNotifs] = useState({ pedidos: true, estoque: true, financeiro: false, email: true, whatsapp: false })

  // Perfil form
  const [perfil, setPerfil] = useState({ nome: 'Administrador', cargo: 'Gestor de Fábrica', email: 'admin@casalinda.com.br', telefone: '(11) 99999-9999' })

  // Empresa form
  const [empresa, setEmpresa] = useState({ razao: 'Casa Linda Decorações Ltda.', cnpj: '00.000.000/0001-00', telefone: '(11) 3333-4444', endereco: 'Rua das Decorações, 123 — São Paulo, SP', emailCom: 'comercial@casalinda.com.br' })

  // Segurança form
  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirmar: '' })

  // Magazord connection test
  const [mzTesting, setMzTesting]   = useState(false)
  const [mzResult, setMzResult]     = useState<{ ok: boolean; message: string } | null>(null)
  const mzConfigured = isMagazordConfigured()
  const mzStatus     = getMagazordStatus()

  const showToast = (msg: string, isError?: boolean) => {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSalvarPerfil = () => {
    if (!perfil.nome || !perfil.email) { showToast('Nome e e-mail são obrigatórios.', true); return }
    showToast('Perfil salvo com sucesso!')
  }

  const handleSalvarEmpresa = () => {
    if (!empresa.razao) { showToast('Razão social é obrigatória.', true); return }
    showToast('Dados da empresa salvos!')
  }

  const handleAlterarSenha = () => {
    if (!senhas.atual || !senhas.nova || !senhas.confirmar) { showToast('Preencha todos os campos.', true); return }
    if (senhas.nova !== senhas.confirmar) { showToast('As senhas não coincidem.', true); return }
    if (senhas.nova.length < 8) { showToast('A nova senha deve ter ao menos 8 caracteres.', true); return }
    setSenhas({ atual: '', nova: '', confirmar: '' })
    showToast('Senha alterada com sucesso!')
  }

  const handleTestMagazord = async () => {
    setMzTesting(true)
    setMzResult(null)
    const result = await testMagazordConnection()
    setMzResult(result)
    setMzTesting(false)
  }

  const tab = activeTab

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie suas preferências e dados da empresa.</p>
      </div>

      <div className="card p-0 overflow-hidden">
        {/* Inner nav */}
        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === s.id
                  ? 'border-navy-900 text-navy-900 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <s.icon size={13} /> {s.id}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* PERFIL */}
          {tab === 'Perfil' && (
            <div className="space-y-5">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-navy-900 flex items-center justify-center text-white font-bold text-2xl shrink-0">A</div>
                <div>
                  <p className="font-semibold text-gray-800">{perfil.nome}</p>
                  <p className="text-sm text-gray-500">{perfil.email}</p>
                  <button
                    onClick={() => showToast('Upload de foto — disponível em breve')}
                    className="text-navy-900 text-xs font-semibold hover:underline mt-1"
                  >
                    Alterar foto
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome</label>
                  <input className="input" value={perfil.nome} onChange={e => setPerfil(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cargo</label>
                  <input className="input" value={perfil.cargo} onChange={e => setPerfil(p => ({ ...p, cargo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">E-mail</label>
                  <input className="input" type="email" value={perfil.email} onChange={e => setPerfil(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                  <input className="input" value={perfil.telefone} onChange={e => setPerfil(p => ({ ...p, telefone: e.target.value }))} />
                </div>
              </div>
              <button onClick={handleSalvarPerfil} className="btn-primary"><Save size={14} /> Salvar Alterações</button>
            </div>
          )}

          {/* NOTIFICAÇÕES */}
          {tab === 'Notificações' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 mb-4">Escolha quais eventos geram notificações</p>
              {[
                { key: 'pedidos',    label: 'Novos pedidos',    desc: 'Alertas ao receber ou atualizar pedidos de produção' },
                { key: 'estoque',    label: 'Estoque crítico',  desc: 'Quando algum insumo atingir o estoque mínimo' },
                { key: 'financeiro', label: 'Lançamentos',      desc: 'Notificações de novas transações financeiras' },
                { key: 'email',      label: 'Resumo por e-mail',desc: 'Relatório diário das atividades por e-mail' },
                { key: 'whatsapp',   label: 'Alertas WhatsApp', desc: 'Notificações urgentes via WhatsApp Business' },
              ].map(n => (
                <div key={n.key} className="flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex-1 mr-4">
                    <p className="text-sm font-medium text-gray-800">{n.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      setNotifs(p => ({ ...p, [n.key]: !p[n.key as keyof typeof p] }))
                      showToast(notifs[n.key as keyof typeof notifs] ? `${n.label} desativado` : `${n.label} ativado!`)
                    }}
                    className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 mt-0.5 ${notifs[n.key as keyof typeof notifs] ? 'bg-navy-900' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${notifs[n.key as keyof typeof notifs] ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
              <button onClick={() => showToast('Preferências de notificação salvas!')} className="btn-primary mt-2">
                <Save size={14} /> Salvar Preferências
              </button>
            </div>
          )}

          {/* APARÊNCIA */}
          {tab === 'Aparência' && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Tema do sistema</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light',  label: 'Claro',   icon: Sun },
                    { id: 'dark',   label: 'Escuro',  icon: Moon },
                    { id: 'system', label: 'Sistema', icon: Monitor },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id as typeof theme); showToast(`Tema "${t.label}" aplicado!`) }}
                      className={`flex flex-col items-center gap-2.5 p-5 rounded-xl border-2 transition-all ${
                        theme === t.id ? 'border-navy-900 bg-blue-50 text-navy-900' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <t.icon size={22} />
                      <span className="text-sm font-medium">{t.label}</span>
                      {theme === t.id && <span className="badge badge-ativo text-[10px]">ATIVO</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-800 font-semibold mb-1">NOTA</p>
                <p className="text-xs text-blue-600">O modo escuro e o modo sistema estarão disponíveis na próxima atualização. Atualmente o sistema suporta apenas o tema Claro.</p>
              </div>
            </div>
          )}

          {/* EMPRESA */}
          {tab === 'Empresa' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Razão Social</label>
                <input className="input" value={empresa.razao} onChange={e => setEmpresa(p => ({ ...p, razao: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CNPJ</label>
                  <input className="input" value={empresa.cnpj} onChange={e => setEmpresa(p => ({ ...p, cnpj: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                  <input className="input" value={empresa.telefone} onChange={e => setEmpresa(p => ({ ...p, telefone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Endereço</label>
                <input className="input" value={empresa.endereco} onChange={e => setEmpresa(p => ({ ...p, endereco: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">E-mail Comercial</label>
                <input className="input" type="email" value={empresa.emailCom} onChange={e => setEmpresa(p => ({ ...p, emailCom: e.target.value }))} />
              </div>
              <button onClick={handleSalvarEmpresa} className="btn-primary"><Save size={14} /> Salvar</button>
            </div>
          )}

          {/* INTEGRAÇÕES */}
          {tab === 'Integrações' && (
            <div className="space-y-6">
              {/* Magazord Card */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-lg font-bold text-navy-900 shadow-sm">M</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Magazord</p>
                      <p className="text-xs text-gray-500">Plataforma de e-commerce &amp; pedidos</p>
                    </div>
                  </div>
                  {/* Status badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    mzConfigured && mzStatus === 'configured' ? 'bg-green-100 text-green-700' :
                    mzStatus === 'error'                       ? 'bg-red-100 text-red-700' :
                                                                 'bg-gray-100 text-gray-500'
                  }`}>
                    {mzConfigured && mzStatus === 'configured' ? <CheckCircle2 size={12} /> :
                     mzStatus === 'error'                       ? <AlertCircle size={12} /> :
                                                                  <Circle size={12} />}
                    {mzConfigured && mzStatus === 'configured' ? 'Conectado' :
                     mzStatus === 'error'                       ? 'Erro' : 'Não configurado'}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Info box */}
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Como configurar</p>
                    <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                      <li>No painel Magazord vá em <strong>Configurações → Integrações → API</strong></li>
                      <li>Crie ou copie o usuário e senha de integração</li>
                      <li>Adicione as variáveis abaixo no arquivo <code className="bg-amber-100 px-1 rounded">.env</code> do projeto:</li>
                    </ol>
                    <div className="mt-3 p-3 bg-gray-900 rounded-lg font-mono text-xs text-green-400 space-y-1">
                      <div>VITE_MAGAZORD_BASE_URL=https://casalinda.magazord.com.br</div>
                      <div>VITE_MAGAZORD_USER=<span className="text-yellow-300">seu-usuario</span></div>
                      <div>VITE_MAGAZORD_PASS=<span className="text-yellow-300">sua-senha</span></div>
                    </div>
                    <p className="text-xs text-amber-700 mt-2">⚠️ Reinicie o servidor (<code className="bg-amber-100 px-1 rounded">npm run dev</code>) após salvar o <code className="bg-amber-100 px-1 rounded">.env</code>.</p>
                  </div>

                  {/* Status atual */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Usuário</p>
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {mzConfigured ? import.meta.env.VITE_MAGAZORD_USER : <span className="text-gray-400 italic">não configurado</span>}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Base URL</p>
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {import.meta.env.VITE_MAGAZORD_BASE_URL
                          ? import.meta.env.VITE_MAGAZORD_BASE_URL.replace('https://', '')
                          : <span className="text-gray-400 italic">não configurado</span>}
                      </p>
                    </div>
                  </div>

                  {/* Test result */}
                  <AnimatePresence>
                    {mzResult && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
                          mzResult.ok
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        {mzResult.ok
                          ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                          : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                        <span>{mzResult.message}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action button */}
                  <button
                    onClick={handleTestMagazord}
                    disabled={mzTesting}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      mzConfigured
                        ? 'bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-60'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <RefreshCw size={14} className={mzTesting ? 'animate-spin' : ''} />
                    {mzTesting ? 'Testando conexão…' : 'Testar Conexão'}
                  </button>
                </div>
              </div>

              {/* Supabase Card (status info) */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-bold text-emerald-600 text-sm shadow-sm">SB</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Supabase</p>
                      <p className="text-xs text-gray-500">Banco de dados &amp; sincronização em tempo real</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('seu-projeto')
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('seu-projeto')
                      ? <><CheckCircle2 size={12} /> Conectado</>
                      : <><Circle size={12} /> Não configurado</>}
                  </div>
                </div>
                <div className="p-5 grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Project URL</p>
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {import.meta.env.VITE_SUPABASE_URL?.replace('https://', '') ?? <span className="italic text-gray-400">não configurado</span>}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Anon Key</p>
                    <p className="text-xs font-medium text-gray-700">
                      {import.meta.env.VITE_SUPABASE_ANON_KEY ? '••••••••••••••••' : <span className="italic text-gray-400">não configurado</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEGURANÇA */}
          {tab === 'Segurança' && (
            <div className="space-y-4 max-w-md">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <Lock size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">Utilize uma senha forte com pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Senha Atual</label>
                <input className="input" type="password" placeholder="••••••••" value={senhas.atual} onChange={e => setSenhas(p => ({ ...p, atual: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nova Senha</label>
                <input className="input" type="password" placeholder="••••••••" value={senhas.nova} onChange={e => setSenhas(p => ({ ...p, nova: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Confirmar Nova Senha</label>
                <input
                  className={`input ${senhas.confirmar && senhas.nova !== senhas.confirmar ? 'border-red-400' : ''}`}
                  type="password" placeholder="••••••••"
                  value={senhas.confirmar} onChange={e => setSenhas(p => ({ ...p, confirmar: e.target.value }))}
                />
                {senhas.confirmar && senhas.nova !== senhas.confirmar && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
                )}
              </div>
              <button onClick={handleAlterarSenha} className="btn-primary"><Lock size={14} /> Alterar Senha</button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} isError={toast.isError} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
