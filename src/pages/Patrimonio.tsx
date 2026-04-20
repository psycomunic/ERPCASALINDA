import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Plus, Search, Wrench, MapPin, X, MoreVertical, Check, Trash2, Edit2 } from 'lucide-react'

interface Asset {
  id: number
  tag: string
  nome: string
  categoria: string
  localizacao: string
  valor: number
  dataAquisicao: string
  status: 'ATIVO' | 'MANUTENÇÃO' | 'INATIVO'
}

type Manutencao = { ativo: string; tipo: string; status: 'CONCLUÍDO' | 'PENDENTE'; time: string }

const INITIAL_ASSETS: Asset[] = []

const INITIAL_MANUTENCOES: Manutencao[] = []

const STATUS_BADGE: Record<string, string> = { ATIVO: 'badge-ativo', MANUTENÇÃO: 'badge-manutencao', INATIVO: 'badge-inativo' }
const MAINT_BADGE: Record<string, string>  = { CONCLUÍDO: 'badge-concluido', PENDENTE: 'badge-pendente' }

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

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

function ContextMenu({ onClose, onDelete, onToggleStatus }: { onClose: () => void; onDelete: () => void; onToggleStatus: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="absolute right-8 top-0 bg-white border border-gray-200 rounded-xl shadow-xl z-30 min-w-[180px] overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <button onClick={() => { onToggleStatus(); onClose() }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
        <Edit2 size={14} className="text-blue-600" /> Alterar Status
      </button>
      <button onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100">
        <Trash2 size={14} /> Remover Ativo
      </button>
    </motion.div>
  )
}

export default function Patrimonio() {
  const [assets, setAssets]             = useState(INITIAL_ASSETS)
  const [manutencoes, setManutencoes]   = useState(INITIAL_MANUTENCOES)
  const [search, setSearch]             = useState('')
  const [modal, setModal]               = useState(false)
  const [maintModal, setMaintModal]     = useState(false)
  const [openMenu, setOpenMenu]         = useState<number | null>(null)
  const [toast, setToast]               = useState<string | null>(null)
  const [form, setForm]                 = useState({ nome: '', categoria: 'Maquinário', localizacao: 'Produção A', valor: '', data: '', serie: '' })
  const [maintForm, setMaintForm]       = useState({ ativo: INITIAL_ASSETS[0]?.nome || '', tipo: 'Preventiva', empresa: '', obs: '' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const totalValor   = assets.reduce((s, a) => s + a.valor, 0)
  const emManutencao = assets.filter(a => a.status === 'MANUTENÇÃO').length
  const ativos       = assets.filter(a => a.status === 'ATIVO').length

  const filtered = assets.filter(a =>
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    a.tag.toLowerCase().includes(search.toLowerCase()) ||
    a.categoria.toLowerCase().includes(search.toLowerCase())
  )

  const handleSaveAsset = () => {
    if (!form.nome) return
    const newTag = `PAT-${String(assets.length + 1).padStart(3, '0')}`
    setAssets(prev => [...prev, {
      id: Date.now(), tag: newTag, nome: form.nome, categoria: form.categoria,
      localizacao: form.localizacao, valor: parseFloat(form.valor) || 0,
      dataAquisicao: form.data || new Date().toLocaleDateString('pt-BR'),
      status: 'ATIVO',
    }])
    setModal(false)
    setForm({ nome: '', categoria: 'Maquinário', localizacao: 'Produção A', valor: '', data: '', serie: '' })
    showToast(`Ativo ${newTag} cadastrado com sucesso!`)
  }

  const handleSaveMaint = () => {
    const newMaint: Manutencao = {
      ativo: maintForm.ativo,
      tipo: `${maintForm.tipo} · ${maintForm.empresa || 'Empresa não informada'}`,
      status: 'PENDENTE',
      time: 'AGORA MESMO',
    }
    setManutencoes(prev => [newMaint, ...prev])
    // Update asset status
    setAssets(prev => prev.map(a => a.nome === maintForm.ativo ? { ...a, status: 'MANUTENÇÃO' } : a))
    setMaintModal(false)
    setMaintForm({ ativo: INITIAL_ASSETS[0]?.nome || '', tipo: 'Preventiva', empresa: '', obs: '' })
    showToast('Manutenção registrada!')
  }

  const deleteAsset = (id: number) => {
    const asset = assets.find(a => a.id === id)
    setAssets(prev => prev.filter(a => a.id !== id))
    showToast(`Ativo ${asset?.tag} removido.`)
  }

  const toggleStatus = (id: number) => {
    setAssets(prev => prev.map(a => {
      if (a.id !== id) return a
      const next: Asset['status'] = a.status === 'ATIVO' ? 'INATIVO' : a.status === 'INATIVO' ? 'ATIVO' : 'ATIVO'
      return { ...a, status: next }
    }))
    showToast('Status atualizado!')
  }

  const handleExportar = () => {
    const csv = ['Tag,Nome,Categoria,Localização,Valor,Aquisição,Status',
      ...assets.map(a => `"${a.tag}","${a.nome}","${a.categoria}","${a.localizacao}","${a.valor}","${a.dataAquisicao}","${a.status}"`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a'); el.href = url; el.download = 'patrimonio.csv'; el.click()
    URL.revokeObjectURL(url)
    showToast('Relatório exportado!')
  }

  return (
    <div className="p-6 space-y-5" onClick={() => setOpenMenu(null)}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patrimônio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de ativos fixos, equipamentos, mobiliário e veículos da Casa Linda Decorações.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleExportar}><Download size={14} /> Relatório</button>
          <button onClick={() => setModal(true)} className="btn-primary"><Plus size={14} /> Novo Ativo</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">$</span>
            </div>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">+R$ 12k este ano</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">R$ {(totalValor / 1000).toFixed(1)}k</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Valor Total do Patrimônio</p>
        </div>
        <div className="stat">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <Wrench size={16} className="text-orange-500" />
            </div>
            {emManutencao > 0 && <span className="badge badge-atencao text-[11px]">{emManutencao} URGENTES</span>}
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{String(emManutencao).padStart(2, '0')}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Itens em Manutenção</p>
        </div>
        <div className="stat">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <MapPin size={15} className="text-green-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">{ativos} ITENS ATIVOS</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{Math.round((ativos / Math.max(assets.length, 1)) * 100)}%</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Localização: Fábrica</p>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <Search size={14} className="text-gray-400" />
              <input
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
                placeholder="Buscar por tag, nome ou categoria..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="btn-secondary text-xs py-2" onClick={() => setSearch('')}>
              {search ? <><X size={12} /> Limpar</> : <><span>⚙</span> Filtros</>}
            </button>
          </div>
          <div className="card overflow-x-auto w-full">
            <table className="w-full min-w-[600px] text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="th">Ativo / Tag</th>
                  <th className="th">Categoria</th>
                  <th className="th">Localização</th>
                  <th className="th">Valor / Aquisição</th>
                  <th className="th">Status</th>
                  <th className="th w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="tr">
                    <td className="td">
                      <p className="font-medium text-gray-800">{a.nome}</p>
                      <p className="text-[11px] text-gray-400">{a.tag}</p>
                    </td>
                    <td className="td text-gray-600 text-xs">{a.categoria}</td>
                    <td className="td">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={11} className="text-gray-400" />{a.localizacao}
                      </span>
                    </td>
                    <td className="td">
                      <p className="font-semibold text-gray-800 text-xs">{fmt(a.valor)}</p>
                      <p className="text-[11px] text-gray-400">{a.dataAquisicao}</p>
                    </td>
                    <td className="td"><span className={`badge ${STATUS_BADGE[a.status]}`}>{a.status}</span></td>
                    <td className="td relative">
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === a.id ? null : a.id) }}
                        className="text-gray-300 hover:text-gray-600"
                      >
                        <MoreVertical size={14} />
                      </button>
                      <AnimatePresence>
                        {openMenu === a.id && (
                          <ContextMenu
                            onClose={() => setOpenMenu(null)}
                            onDelete={() => deleteAsset(a.id)}
                            onToggleStatus={() => toggleStatus(a.id)}
                          />
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="td text-center text-gray-400 py-6">Nenhum ativo encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance log */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Wrench size={14} className="text-gray-400" /> Manutenções
            </p>
          </div>
          <div className="space-y-4">
            {manutencoes.map((m, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-800 text-sm">{m.ativo}</p>
                  <span className={`badge ${MAINT_BADGE[m.status]} text-[10px]`}>{m.status}</span>
                </div>
                <p className="text-xs text-gray-500">{m.tipo}</p>
                <p className="text-[11px] text-gray-400 mt-1">{m.time}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setMaintModal(true)}
            className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-navy-900/30 hover:text-navy-900 transition-colors"
          >
            <Plus size={13} /> Registrar Manutenção
          </button>
        </div>
      </div>

      {/* New asset modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)}>
            <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">Cadastrar Novo Ativo</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Preencha as informações do bem patrimonial.</p>
                </div>
                <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome do Ativo *</label>
                  <input className="input" placeholder="Ex: Impressora HP Latex 800" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                    <select className="input" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                      {['Maquinário', 'TI', 'Veículos', 'Móveis', 'Estrutura'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Localização</label>
                    <select className="input" value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))}>
                      {['Produção A', 'Produção B', 'Escritório', 'Almoxarifado', 'Externo'].map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Valor de Aquisição (R$)</label>
                    <input className="input" type="number" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data de Aquisição</label>
                    <input className="input" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Número de Série / NF</label>
                  <input className="input" placeholder="Ex: HP-SN-2024-001" value={form.serie} onChange={e => setForm(f => ({ ...f, serie: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button onClick={handleSaveAsset} className="btn-primary flex-1 justify-center">Salvar Ativo</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Maintenance modal */}
        {maintModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMaintModal(false)}>
            <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">Registrar Manutenção</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Registre uma ocorrência de manutenção para um ativo.</p>
                </div>
                <button onClick={() => setMaintModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ativo *</label>
                  <select className="input" value={maintForm.ativo} onChange={e => setMaintForm(f => ({ ...f, ativo: e.target.value }))}>
                    {assets.map(a => <option key={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo de Manutenção</label>
                  <select className="input" value={maintForm.tipo} onChange={e => setMaintForm(f => ({ ...f, tipo: e.target.value }))}>
                    {['Preventiva', 'Corretiva', 'Limpeza', 'Calibração', 'Inspeção'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Empresa / Prestador</label>
                  <input className="input" placeholder="Ex: Techinsumos Ltda" value={maintForm.empresa} onChange={e => setMaintForm(f => ({ ...f, empresa: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Observações</label>
                  <textarea className="input h-16 resize-none" placeholder="Detalhes da manutenção..." value={maintForm.obs} onChange={e => setMaintForm(f => ({ ...f, obs: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMaintModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button onClick={handleSaveMaint} className="btn-primary flex-1 justify-center">Registrar</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
