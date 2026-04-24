import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Download, Plus, Filter, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  X, Lightbulb, Check, ChevronDown
} from 'lucide-react'

interface Item {
  id: number
  ref: string
  nome: string
  unidade: string
  atual: number
  minimo: number
  status: 'NORMAL' | 'CRÍTICO' | 'ATENÇÃO'
}

type Movement = { tipo: 'saida' | 'entrada' | 'ajuste'; desc: string; sub: string; time: string }

const INITIAL_ITEMS: Item[] = []

const INITIAL_MOVEMENTS: Movement[] = []

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

export default function Inventory() {
  const [items, setItems]         = useState(INITIAL_ITEMS)
  const [movements, setMovements] = useState(INITIAL_MOVEMENTS)
  const [modal, setModal]         = useState(false)
  const [showAll, setShowAll]     = useState(false)
  const [toast, setToast]         = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [showFilter, setShowFilter]     = useState(false)
  const [form, setForm] = useState({ material: INITIAL_ITEMS[0]?.nome || '', quantidade: '', nf: '', fornecedor: '', obs: '' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
  const criticos = items.filter(i => i.status === 'CRÍTICO').length

  const filteredItems = filterStatus === 'TODOS' ? items : items.filter(i => i.status === filterStatus)

  const handleExportar = () => {
    const csv = ['Ref,Nome,Unidade,Atual,Mínimo,Status',
      ...items.map(i => `"${i.ref}","${i.nome}","${i.unidade}","${i.atual}","${i.minimo}","${i.status}"`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'inventario.csv'; a.click()
    URL.revokeObjectURL(url)
    showToast('Inventário exportado!')
  }

  const handleAtualizar = () => {
    showToast('Inventário sincronizado com sucesso!')
  }

  const handleRegistrarEntrada = () => {
    const qty = parseFloat(form.quantidade)
    if (!form.quantidade || isNaN(qty)) return
    const item = items.find(i => i.nome === form.material)
    if (item) {
      setItems(prev => prev.map(i => {
        if (i.nome !== form.material) return i
        const novoAtual = i.atual + qty
        const novoStatus: Item['status'] = novoAtual < i.minimo ? 'CRÍTICO' : novoAtual < i.minimo * 1.5 ? 'ATENÇÃO' : 'NORMAL'
        return { ...i, atual: novoAtual, status: novoStatus }
      }))
      const newMov: Movement = {
        tipo: 'entrada',
        desc: `Entrada de ${qty} ${item.unidade} de ${item.nome}`,
        sub: `NF ${form.nf || 'S/N'} · ${form.fornecedor || 'Fornecedor não informado'}`,
        time: 'AGORA MESMO',
      }
      setMovements(prev => [newMov, ...prev])
    }
    setModal(false)
    setForm({ material: INITIAL_ITEMS[0]?.nome || '', quantidade: '', nf: '', fornecedor: '', obs: '' })
    showToast('Entrada de insumo registrada com sucesso!')
  }

  const visibleMovements = showAll ? movements : movements.slice(0, 3)

  return (
    <div className="p-6 space-y-5" onClick={() => setShowFilter(false)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Almoxarifado</h1>
          <p className="text-sm text-gray-500 mt-0.5">Controle de insumos, matérias-primas e gestão de estoque mínimo para a linha de produção Casa Linda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={handleExportar}><Download size={14} /> Exportar</button>
          <button onClick={() => setModal(true)} className="btn-primary"><Plus size={14} /> Entrada de Insumo</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">⬡</div>
            <span className="badge badge-normal text-[11px]">ESTÁVEL</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">1.240m</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total de Molduras em Estoque</p>
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
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600 text-sm">📋</div>
            <span className="badge badge-pendente text-[11px]">PENDENTE</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">R$ 12.4k</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Valor em Pedidos de Compra</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Table */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Filter size={14} className="text-gray-400" /> Inventário de Insumos
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
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${filterStatus === s ? 'font-bold text-navy-900' : 'text-gray-700'}`}>
                          {s}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <button className="btn-ghost text-xs" onClick={handleAtualizar}><RefreshCw size={12} /> Atualizar</button>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">Material</th>
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
                  <td className="td text-gray-500 text-xs">{item.unidade}</td>
                  <td className={`td font-bold ${item.status === 'CRÍTICO' ? 'text-red-600' : item.status === 'ATENÇÃO' ? 'text-orange-600' : 'text-gray-900'}`}>
                    {item.atual}
                  </td>
                  <td className="td text-gray-500">{item.minimo}</td>
                  <td className="td"><span className={`badge ${STATUS_BADGE[item.status]}`}>{item.status}</span></td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={5} className="td text-center text-gray-400 py-6">Nenhum item encontrado.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Movement Log */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <RefreshCw size={14} className="text-gray-400" /> Log de Movimentação
            </p>
            <button className="text-navy-900 text-xs font-semibold hover:underline" onClick={() => setShowAll(v => !v)}>
              {showAll ? 'VER MENOS' : 'VER TODOS'}
            </button>
          </div>
          <div className="space-y-3">
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
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{m.sub}</p>
                    <p className="text-[10px] text-gray-300 mt-1 font-medium">{m.time}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2">
            <Lightbulb size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-blue-800 font-semibold">DICA PRO</p>
              <p className="text-xs text-blue-600 mt-0.5">Configure alertas automáticos por e-mail quando insumos atingirem o estoque mínimo.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Entry modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)}>
            <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">Entrada de Insumo</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Registre a chegada de materiais ao almoxarifado.</p>
                </div>
                <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Material *</label>
                  <select className="input" value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))}>
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
                  <button onClick={handleRegistrarEntrada} className="btn-primary flex-1 justify-center">Registrar Entrada</button>
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
