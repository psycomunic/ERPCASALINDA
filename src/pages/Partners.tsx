import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Plus, Phone, Mail, MapPin, X, Filter, Check, Trash2, Edit2, ChevronDown } from 'lucide-react'

interface Partner {
  id: number
  nome: string
  tipo: string
  subtipo: string
  contato: string
  email: string
  telefone: string
  cidade: string
  ativo: boolean
}

const INITIAL_PARTNERS: Partner[] = [
  { id: 1, nome: 'Decora Mais',         tipo: 'Fornecedor', subtipo: 'Tecidos',    contato: 'Sandro Lima',   email: 'contato@decoramais.com',   telefone: '(11) 98765-4321', cidade: 'São Paulo, SP',    ativo: true  },
  { id: 2, nome: 'Arte em Vidro',        tipo: 'Fornecedor', subtipo: 'Vidros',     contato: 'Renata Souza',  email: 'vendas@arteemvidro.com',   telefone: '(11) 91234-5678', cidade: 'São Paulo, SP',    ativo: true  },
  { id: 3, nome: 'Transportes Rápidos',  tipo: 'Serviço',    subtipo: 'Logística',  contato: 'Marcos Costa',  email: 'logistica@tr.com',         telefone: '(11) 99887-7665', cidade: 'São Paulo, SP',    ativo: false },
  { id: 4, nome: 'Madeiras Nobres',      tipo: 'Fornecedor', subtipo: 'Madeira',    contato: 'Paulo Andrade', email: 'vendas@madeirasnobres.com', telefone: '(11) 97654-3210', cidade: 'Guarulhos, SP',    ativo: true  },
  { id: 5, nome: 'Papel & Cia',          tipo: 'Fornecedor', subtipo: 'Papelaria',  contato: 'Ricardo Silva', email: 'ri@papelecia.com.br',       telefone: '(11) 3344-5566',  cidade: 'São Paulo, SP',    ativo: true  },
  { id: 6, nome: 'MDF Total',            tipo: 'Fornecedor', subtipo: 'Molduras',   contato: 'Fernanda Lima', email: 'fe@mdftotal.com.br',        telefone: '(11) 9988-7722',  cidade: 'Guarulhos, SP',    ativo: true  },
  { id: 7, nome: 'Técnico Gomes',        tipo: 'Serviço',    subtipo: 'Manutenção', contato: 'João Gomes',    email: 'jg@manutencao.com',         telefone: '(11) 9911-2233',  cidade: 'Mogi das Cruzes',  ativo: true  },
  { id: 8, nome: 'Print Store',          tipo: 'Fornecedor', subtipo: 'Impressão',  contato: 'Carlos Souza',  email: 'cs@printstore.com.br',      telefone: '(11) 3322-1100',  cidade: 'São Paulo, SP',    ativo: true  },
]

const TIPOS = ['TODOS', 'Fornecedor', 'Serviço', 'Transportadora']

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm"
    >
      <Check size={16} className="text-green-400 shrink-0" />
      {msg}
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white"><X size={14} /></button>
    </motion.div>
  )
}

function DetailModal({ partner, onClose, onToggle, onDelete }: {
  partner: Partner; onClose: () => void; onToggle: () => void; onDelete: () => void
}) {
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900">{partner.nome}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{partner.tipo} · {partner.subtipo}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={partner.ativo ? 'badge badge-ativo' : 'badge badge-inativo'}>
              {partner.ativo ? 'ATIVO' : 'INATIVO'}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">CONTATO</p>
              <p className="text-sm font-semibold text-gray-800">{partner.contato}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">CIDADE</p>
              <p className="text-sm font-semibold text-gray-800">{partner.cidade}</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Mail size={16} className="text-gray-400 shrink-0" />
              <a href={`mailto:${partner.email}`} className="hover:text-navy-900 transition-colors">{partner.email}</a>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Phone size={16} className="text-gray-400 shrink-0" />
              <a href={`tel:${partner.telefone}`} className="hover:text-navy-900 transition-colors">{partner.telefone}</a>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <MapPin size={16} className="text-gray-400 shrink-0" />
              <span>{partner.cidade}</span>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { onDelete(); onClose() }}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors">
              <Trash2 size={14} /> Remover
            </button>
            <button onClick={() => { onToggle(); onClose() }} className="btn-secondary flex-1 justify-center">
              <Edit2 size={14} /> {partner.ativo ? 'Desativar' : 'Reativar'}
            </button>
            <button
              onClick={() => { window.open(`mailto:${partner.email}`); onClose() }}
              className="btn-primary flex-1 justify-center"
            >
              <Mail size={14} /> Enviar E-mail
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Partners() {
  const [partners, setPartners] = useState(INITIAL_PARTNERS)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(false)
  const [detail, setDetail]     = useState<Partner | null>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const [tipoFilter, setTipoFilter] = useState('TODOS')
  const [showFilter, setShowFilter] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'Fornecedor', subtipo: '', contato: '', email: '', telefone: '', cidade: '' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const filtered = partners.filter(p =>
    (tipoFilter === 'TODOS' || p.tipo === tipoFilter) &&
    (p.nome.toLowerCase().includes(search.toLowerCase()) ||
     p.contato.toLowerCase().includes(search.toLowerCase()) ||
     p.tipo.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSave = () => {
    if (!form.nome || !form.contato) return
    setPartners(prev => [...prev, { id: Date.now(), ...form, ativo: true }])
    setModal(false)
    setForm({ nome: '', tipo: 'Fornecedor', subtipo: '', contato: '', email: '', telefone: '', cidade: '' })
    showToast(`Parceiro "${form.nome}" cadastrado com sucesso!`)
  }

  const togglePartner = (id: number) => {
    const p = partners.find(x => x.id === id)
    setPartners(prev => prev.map(x => x.id === id ? { ...x, ativo: !x.ativo } : x))
    showToast(p?.ativo ? `"${p?.nome}" desativado.` : `"${p?.nome}" reativado!`)
  }

  const deletePartner = (id: number) => {
    const p = partners.find(x => x.id === id)
    setPartners(prev => prev.filter(x => x.id !== id))
    showToast(`"${p?.nome}" removido dos parceiros.`)
  }

  return (
    <div className="p-6 space-y-5" onClick={() => setShowFilter(false)}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parceiros</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de fornecedores, prestadores de serviço e parceiros estratégicos da Casa Linda.</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary"><Plus size={14} /> Novo Parceiro</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Parceiros', value: partners.length,                        onClick: () => setTipoFilter('TODOS') },
          { label: 'Parceiros Ativos',   value: partners.filter(p => p.ativo).length,   onClick: () => setTipoFilter('TODOS') },
          { label: 'Inativos',           value: partners.filter(p => !p.ativo).length,  onClick: () => {} },
        ].map(s => (
          <div key={s.label} className="stat cursor-pointer hover:shadow-lg transition-shadow" onClick={s.onClick}>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Search size={14} className="text-gray-400" />
          <input
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
            placeholder="Buscar por nome, categoria ou contato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')}><X size={14} className="text-gray-400 hover:text-gray-700" /></button>}
        </div>
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setShowFilter(v => !v) }}
            className="btn-secondary text-xs py-2"
          >
            <Filter size={12} /> {tipoFilter} <ChevronDown size={11} />
          </button>
          <AnimatePresence>
            {showFilter && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-max">
                {TIPOS.map(t => (
                  <button key={t} onClick={e => { e.stopPropagation(); setTipoFilter(t); setShowFilter(false) }}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${tipoFilter === t ? 'font-bold text-navy-900' : 'text-gray-700'}`}>
                    {t}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.04 }}
              className="card p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <span className={p.ativo ? 'badge badge-ativo' : 'badge badge-inativo'}>
                  {p.ativo ? 'ATIVO' : 'INATIVO'}
                </span>
              </div>

              <h3 className="font-bold text-gray-900">{p.nome}</h3>
              <p className="text-xs text-gray-500 mb-3">{p.tipo} · {p.subtipo}</p>

              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-gray-400 shrink-0" />
                  <a href={`mailto:${p.email}`} className="hover:text-navy-900 transition-colors truncate">{p.email}</a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-gray-400 shrink-0" />
                  <span>{p.telefone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-gray-400 shrink-0" />
                  <span>{p.cidade}</span>
                </div>
              </div>

              <button
                onClick={() => setDetail(p)}
                className="mt-4 w-full py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-navy-900/20 hover:text-navy-900 transition-all"
              >
                VER DETALHES
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            <p className="font-medium">Nenhum parceiro encontrado.</p>
            <p className="text-xs mt-1">Tente ajustar os filtros ou cadastre um novo.</p>
          </div>
        )}
      </div>

      {/* New partner modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)}>
            <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">Cadastrar Novo Parceiro</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Preencha os dados do fornecedor ou prestador de serviço.</p>
                </div>
                <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome / Razão Social *</label>
                  <input className="input" placeholder="Ex: Decora Mais Ltda." value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                    <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                      {['Fornecedor', 'Serviço', 'Transportadora'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Especialidade</label>
                    <input className="input" placeholder="Ex: Tecidos, Molduras" value={form.subtipo} onChange={e => setForm(f => ({ ...f, subtipo: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome do Contato *</label>
                  <input className="input" placeholder="Nome do responsável" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">E-mail</label>
                    <input className="input" type="email" placeholder="contato@empresa.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                    <input className="input" placeholder="(11) 9xxxx-xxxx" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cidade / Estado</label>
                  <input className="input" placeholder="Ex: São Paulo, SP" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button onClick={handleSave} className="btn-primary flex-1 justify-center">Cadastrar</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {detail && (
          <DetailModal
            partner={detail}
            onClose={() => setDetail(null)}
            onToggle={() => togglePartner(detail.id)}
            onDelete={() => deletePartner(detail.id)}
          />
        )}

        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
