import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchItens, fetchMovimentacoes, registrarMovimentacao } from '../services/estoque'
import { fetchPedidos } from '../services/pedidos'
import { useAuth } from '../contexts/AuthContext'
import {
  Download, Plus, Filter, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  X, Lightbulb, Check, ChevronDown
} from 'lucide-react'

interface Item {
  id: string
  ref: string
  nome: string
  unidade: string
  atual: number
  minimo: number
  status: 'NORMAL' | 'CRÍTICO' | 'ATENÇÃO'
}

type Movement = { tipo: 'saida' | 'entrada' | 'ajuste'; desc: string; sub: string; time: string }


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
  const { profile } = useAuth()
  const [items, setItems]         = useState<Item[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [stats, setStats]         = useState({ tamanhos: {} as any, molduras: {} as any, vidro: { com: 0, sem: 0 } })
  const [modal, setModal]         = useState(false)
  const [showAll, setShowAll]     = useState(false)
  const [toast, setToast]         = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [showFilter, setShowFilter]     = useState(false)
  const [form, setForm] = useState({ materialId: '', quantidade: '', nf: '', fornecedor: '', obs: '' })

  const loadData = async () => {
    const rawItens = await fetchItens()
    const mappedItens: Item[] = rawItens.map(i => {
      const atual = i.quantidade || 0
      const min = i.quantidade_minima || 0
      const status = atual < min ? 'CRÍTICO' : atual < (min * 1.5) ? 'ATENÇÃO' : 'NORMAL'
      return {
        id: i.id, ref: i.codigo || i.id.substring(0, 6).toUpperCase(),
        nome: i.nome, unidade: i.unidade || 'un', atual, minimo: min, status
      }
    })
    setItems(mappedItens)
    if (mappedItens.length > 0 && !form.materialId) {
      setForm(prev => ({ ...prev, materialId: mappedItens[0].id }))
    }

    const rawMovs = await fetchMovimentacoes()
    const mappedMovs: Movement[] = rawMovs.map(m => {
      const dataStr = new Date(m.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      const itemData = m.estoque_itens as any
      const nome = itemData?.nome || 'Item Desconhecido'
      const un = itemData?.unidade || 'un'
      const desc = `${m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'saida' ? 'Saída' : 'Ajuste'} de ${m.quantidade} ${un} de ${nome}`
      const sub = m.motivo || 'Sem observações'
      return { tipo: m.tipo as any, desc, sub, time: dataStr }
    })
    setMovements(mappedMovs)

    // Agregações de Produção (Mês Atual baseando-se nos pedidos puxados)
    const pedidos = await fetchPedidos()
    const currMonth = new Date().getMonth()
    const aggTam: Record<string, number> = {}
    const aggMold: Record<string, number> = {}
    let comVidro = 0, semVidro = 0

    pedidos.forEach(p => {
      const d = new Date(p.created_at)
      if (d.getMonth() === currMonth) {
        // quantidade
        const qtd = p.quantidade || 1
        
        // Tamanho
        const tam = p.tamanho || 'Outro'
        aggTam[tam] = (aggTam[tam] || 0) + qtd
        
        // Moldura
        const mold = p.moldura || 'N/A'
        aggMold[mold] = (aggMold[mold] || 0) + qtd
        
        // Vidro
        const aba = (p.acabamento || '').toLowerCase()
        if (aba.includes('vidro') || aba.includes('acrílico')) {
          if (aba.includes('sem vidro')) semVidro += qtd
          else comVidro += qtd
        } else {
          semVidro += qtd // fallback "sem vidro"
        }
      }
    })
    setStats({ tamanhos: aggTam, molduras: aggMold, vidro: { com: comVidro, sem: semVidro } })
  }

  useEffect(() => { loadData() }, [])

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

  const handleAtualizar = async () => {
    await loadData()
    showToast('Inventário sincronizado com sucesso!')
  }

  const handleRegistrarEntrada = async () => {
    const qty = parseFloat(form.quantidade)
    if (!form.quantidade || isNaN(qty) || !form.materialId) return
    
    let motivo = form.obs || ''
    if (form.nf) motivo += ` (NF ${form.nf})`
    if (form.fornecedor) motivo += ` - Fornecedor: ${form.fornecedor}`

    const success = await registrarMovimentacao({
      item_id: form.materialId,
      tipo: 'entrada',
      quantidade: qty,
      motivo: motivo.trim() || 'Entrada manual avulsa',
      usuario: profile?.nome || profile?.email || 'Sistema'
    })

    if (success) {
      await loadData()
      setModal(false)
      setForm({ materialId: items[0]?.id || '', quantidade: '', nf: '', fornecedor: '', obs: '' })
      showToast('Entrada de insumo registrada com sucesso!')
    } else {
      showToast('Erro ao registrar entrada.')
    }
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

      {/* Analytics Panel */}
      <div className="card p-5 mt-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Filter size={16} className="text-blue-500" />
          Estatísticas de Produção (Mês Atual)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tamanhos */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2">Tamanhos mais produzidos</h3>
            <div className="space-y-2">
              {Object.entries(stats.tamanhos).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0, 5).map(([tam, val]) => (
                <div key={tam} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 font-medium">{tam}</span>
                  <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{String(val)} un</span>
                </div>
              ))}
              {Object.keys(stats.tamanhos).length === 0 && <p className="text-xs text-gray-400 italic">Sem dados neste mês</p>}
            </div>
          </div>
          {/* Molduras */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2">Cores de Moldura</h3>
            <div className="space-y-2">
              {Object.entries(stats.molduras).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0, 5).map(([mold, val]) => (
                <div key={mold} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 font-medium">{mold}</span>
                  <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{String(val)} un</span>
                </div>
              ))}
              {Object.keys(stats.molduras).length === 0 && <p className="text-xs text-gray-400 italic">Sem dados neste mês</p>}
            </div>
          </div>
          {/* Acabamento */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2">Acabamento com Vidro</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Com Vidro/Acrílico</p>
                <p className="text-2xl font-black text-gray-900">{stats.vidro.com}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Sem Vidro</p>
                <p className="text-2xl font-black text-gray-400">{stats.vidro.sem}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
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
                  <select className="input" value={form.materialId} onChange={e => setForm(f => ({ ...f, materialId: e.target.value }))}>
                    {items.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
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
