import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Download, Plus, Filter, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  X, Lightbulb, Check, ChevronDown, Sofa, Package
} from 'lucide-react'

interface Item {
  id: number
  ref: string
  nome: string
  categoria: string
  unidade: string
  atual: number
  minimo: number
  status: 'NORMAL' | 'CRÍTICO' | 'ATENÇÃO'
}

type Movement = { tipo: 'saida' | 'entrada' | 'ajuste'; desc: string; sub: string; time: string }

const CATEGORIAS = ['Tapete', 'Quadro', 'Cama/Mesa/Banho', 'Almofada', 'Vaso/Decoração', 'Outro']

const STATUS_BADGE: Record<string, string> = { NORMAL: 'badge-normal', CRÍTICO: 'badge-critico', ATENÇÃO: 'badge-atencao' }

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

export default function InventoryLV() {
  const [items, setItems]         = useState<Item[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [modal, setModal]         = useState(false)
  const [showAll, setShowAll]     = useState(false)
  const [toast, setToast]         = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [filterCat, setFilterCat]       = useState<string>('TODAS')
  const [showFilter, setShowFilter]     = useState(false)
  const [newItemModal, setNewItemModal] = useState(false)

  const [form, setForm] = useState({
    material: '', quantidade: '', nf: '', fornecedor: '', obs: ''
  })
  const [newItemForm, setNewItemForm] = useState({
    ref: '', nome: '', categoria: CATEGORIAS[0], unidade: 'un', atual: '', minimo: ''
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
  const criticos = items.filter(i => i.status === 'CRÍTICO').length

  const filteredItems = items.filter(i => {
    const statusOk = filterStatus === 'TODOS' || i.status === filterStatus
    const catOk    = filterCat === 'TODAS' || i.categoria === filterCat
    return statusOk && catOk
  })

  const handleExportar = () => {
    const csv = ['Ref,Nome,Categoria,Unidade,Atual,Mínimo,Status',
      ...items.map(i => `"${i.ref}","${i.nome}","${i.categoria}","${i.unidade}","${i.atual}","${i.minimo}","${i.status}"`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'inventario-lar-e-vida.csv'; a.click()
    URL.revokeObjectURL(url)
    showToast('Inventário exportado!')
  }

  const handleAddItem = () => {
    const atual  = parseFloat(newItemForm.atual)
    const minimo = parseFloat(newItemForm.minimo)
    if (!newItemForm.nome.trim() || isNaN(atual) || isNaN(minimo)) return

    const status: Item['status'] = atual < minimo ? 'CRÍTICO' : atual < minimo * 1.5 ? 'ATENÇÃO' : 'NORMAL'
    const item: Item = {
      id: Date.now(), ref: newItemForm.ref || `LV-${items.length + 1}`,
      nome: newItemForm.nome, categoria: newItemForm.categoria,
      unidade: newItemForm.unidade, atual, minimo, status,
    }
    setItems(prev => [...prev, item])
    setNewItemModal(false)
    setNewItemForm({ ref: '', nome: '', categoria: CATEGORIAS[0], unidade: 'un', atual: '', minimo: '' })
    showToast('Item adicionado ao inventário!')
  }

  const handleEntrada = () => {
    const qty = parseFloat(form.quantidade)
    if (!form.material || !form.quantidade || isNaN(qty)) return
    const item = items.find(i => i.nome === form.material)
    if (item) {
      setItems(prev => prev.map(i => {
        if (i.nome !== form.material) return i
        const novo = i.atual + qty
        const status: Item['status'] = novo < i.minimo ? 'CRÍTICO' : novo < i.minimo * 1.5 ? 'ATENÇÃO' : 'NORMAL'
        return { ...i, atual: novo, status }
      }))
      setMovements(prev => [{
        tipo: 'entrada',
        desc: `Entrada de ${qty} ${item.unidade} de ${item.nome}`,
        sub: `NF ${form.nf || 'S/N'} · ${form.fornecedor || 'Fornecedor não informado'}`,
        time: 'AGORA MESMO',
      }, ...prev])
    }
    setModal(false)
    setForm({ material: '', quantidade: '', nf: '', fornecedor: '', obs: '' })
    showToast('Entrada de insumo registrada!')
  }

  const visibleMovements = showAll ? movements : movements.slice(0, 3)

  return (
    <div className="p-6 space-y-5" onClick={() => setShowFilter(false)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
            <Sofa size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Almoxarifado — Lar e Vida</h1>
            <p className="text-sm text-gray-500 mt-0.5">Controle de estoque de produtos de decoração e utilidades.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleExportar}><Download size={14} /> Exportar</button>
          <button
            onClick={() => setNewItemModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
          >
            <Plus size={14} /> Novo Item
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
              <Package size={16} style={{ color: '#d97706' }} />
            </div>
            <span className="badge badge-normal text-[11px]">ESTÁVEL</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{items.length}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Itens Cadastrados</p>
        </div>
        <div className="stat cursor-pointer" onClick={() => setFilterStatus('CRÍTICO')}>
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm">⚠</div>
            <span className="badge badge-critico text-[11px]">CRÍTICO</span>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{criticos.toString().padStart(2, '0')} Itens</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Abaixo do Estoque Mínimo</p>
        </div>
        <div className="stat">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
              <span style={{ color: '#d97706' }}>📋</span>
            </div>
            <span className="badge badge-normal text-[11px]">CATEGORIAS</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{CATEGORIAS.length}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Linhas de Produto</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Table */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Filter size={14} className="text-gray-400" /> Inventário de Produtos
              </p>
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setShowFilter(v => !v) }}
                  className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50"
                >
                  {filterStatus} <ChevronDown size={10} />
                </button>
                <AnimatePresence>
                  {showFilter && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-max">
                      {['TODOS', 'NORMAL', 'ATENÇÃO', 'CRÍTICO'].map(s => (
                        <button key={s} onClick={e => { e.stopPropagation(); setFilterStatus(s); setShowFilter(false) }}
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${filterStatus === s ? 'font-bold' : 'text-gray-700'}`}
                          style={filterStatus === s ? { color: '#b45309' } : {}}>
                          {s}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <button
              onClick={() => items.length > 0 ? setModal(true) : setNewItemModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: '#d97706', color: '#b45309' }}
            >
              <Plus size={12} /> {items.length > 0 ? 'Entrada de Estoque' : 'Adicionar Item'}
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#fef3c7' }}>
                <Package size={28} style={{ color: '#d97706' }} />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Nenhum item cadastrado</p>
              <p className="text-xs text-gray-400 max-w-xs mb-4">
                Comece cadastrando os produtos que a Lar e Vida trabalha: tapetes, quadros, linha cama/mesa, etc.
              </p>
              <button
                onClick={() => setNewItemModal(true)}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl text-white"
                style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
              >
                <Plus size={14} /> Cadastrar Primeiro Item
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="th">Produto</th>
                  <th className="th">Categoria</th>
                  <th className="th">Unidade</th>
                  <th className="th">Atual</th>
                  <th className="th">Mínimo</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id} className="tr">
                    <td className="td">
                      <p className="font-medium text-gray-800">{item.nome}</p>
                      <p className="text-[11px] text-gray-400">{item.ref}</p>
                    </td>
                    <td className="td"><span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{item.categoria}</span></td>
                    <td className="td text-gray-500 text-xs">{item.unidade}</td>
                    <td className={`td font-bold ${item.status === 'CRÍTICO' ? 'text-red-600' : item.status === 'ATENÇÃO' ? 'text-orange-600' : 'text-gray-900'}`}>{item.atual}</td>
                    <td className="td text-gray-500">{item.minimo}</td>
                    <td className="td"><span className={`badge ${STATUS_BADGE[item.status]}`}>{item.status}</span></td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr><td colSpan={6} className="td text-center text-gray-400 py-6">Nenhum item encontrado.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Movement Log */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <RefreshCw size={14} className="text-gray-400" /> Log de Movimentação
            </p>
            <button className="text-xs font-semibold hover:underline" style={{ color: '#b45309' }} onClick={() => setShowAll(v => !v)}>
              {showAll ? 'VER MENOS' : 'VER TODOS'}
            </button>
          </div>
          <div className="space-y-3">
            {visibleMovements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                <RefreshCw size={24} className="mb-2 opacity-30" />
                <p className="text-xs">Nenhuma movimentação ainda</p>
              </div>
            ) : (
              <AnimatePresence>
                {visibleMovements.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {m.tipo === 'entrada' ? <ArrowUpCircle size={16} className="text-green-500" />
                       : m.tipo === 'saida' ? <ArrowDownCircle size={16} className="text-red-500" />
                       : <RefreshCw size={16} className="text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-tight">{m.desc}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
                      <p className="text-[10px] text-gray-300 mt-1 font-medium">{m.time}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2">
            <Lightbulb size={14} className="shrink-0 mt-0.5" style={{ color: '#d97706' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#92400e' }}>DICA PRO</p>
              <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>Configure alertas para reposição quando produtos atingirem o estoque mínimo.</p>
            </div>
          </div>
        </div>
      </div>

      {/* New Item Modal */}
      <AnimatePresence>
        {newItemModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNewItemModal(false)}>
            <motion.div className="modal" style={{ maxWidth: 480 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
                    <Plus size={14} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Novo Item — Lar e Vida</h3>
                    <p className="text-xs text-gray-500">Cadastre um produto no inventário</p>
                  </div>
                </div>
                <button onClick={() => setNewItemModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" placeholder="Código/Ref (opcional)" value={newItemForm.ref} onChange={e => setNewItemForm(f => ({ ...f, ref: e.target.value }))} />
                  <input className="input" placeholder="Nome do produto *" value={newItemForm.nome} onChange={e => setNewItemForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                    <select className="input" value={newItemForm.categoria} onChange={e => setNewItemForm(f => ({ ...f, categoria: e.target.value }))}>
                      {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Unidade</label>
                    <select className="input" value={newItemForm.unidade} onChange={e => setNewItemForm(f => ({ ...f, unidade: e.target.value }))}>
                      {['un', 'm²', 'cx', 'kit', 'par', 'peça', 'rolo'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Qtd. Atual *</label>
                    <input type="number" className="input" placeholder="0" value={newItemForm.atual} onChange={e => setNewItemForm(f => ({ ...f, atual: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Qtd. Mínima *</label>
                    <input type="number" className="input" placeholder="0" value={newItemForm.minimo} onChange={e => setNewItemForm(f => ({ ...f, minimo: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setNewItemModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button
                    onClick={handleAddItem}
                    disabled={!newItemForm.nome.trim() || !newItemForm.atual || !newItemForm.minimo}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                  >
                    <Check size={14} /> Cadastrar Item
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Entry Modal */}
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)}>
            <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">Entrada de Estoque</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Registre a chegada de produtos ao almoxarifado.</p>
                </div>
                <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Produto *</label>
                  <select className="input" value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))}>
                    <option value="">Selecionar...</option>
                    {items.map(i => <option key={i.id}>{i.nome}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantidade *</label>
                    <input className="input" type="number" placeholder="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nota Fiscal</label>
                    <input className="input" placeholder="NF 0000" value={form.nf} onChange={e => setForm(f => ({ ...f, nf: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fornecedor</label>
                  <input className="input" placeholder="Nome do fornecedor" value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Observações</label>
                  <textarea className="input h-16 resize-none" placeholder="Informações adicionais..." value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button
                    onClick={handleEntrada}
                    disabled={!form.material || !form.quantidade}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                  >
                    <Check size={14} /> Registrar Entrada
                  </button>
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
