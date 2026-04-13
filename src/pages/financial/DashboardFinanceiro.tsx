import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, DollarSign, Filter, Download, Printer, X, Paperclip,
  MoreVertical, Check, Trash2, Edit2, ChevronDown
} from 'lucide-react'

interface Tx {
  id: number
  data: string
  hora: string
  descricao: string
  categoria: string
  catColor: string
  valor: number
  tipo: 'entrada' | 'saida'
  status: 'pago' | 'pendente' | 'atrasado'
  anexos: number
}

const CAT_COLORS: Record<string, string> = {
  VENDAS:          'bg-blue-100 text-blue-800',
  'MATÉRIA PRIMA': 'bg-amber-100 text-amber-800',
  MANUTENÇÃO:      'bg-purple-100 text-purple-700',
  OPERACIONAL:     'bg-gray-100 text-gray-700',
  LOGÍSTICA:       'bg-cyan-100 text-cyan-800',
  RH:              'bg-pink-100 text-pink-700',
}

const STATUS_DOT: Record<string, string>   = { pago: 'bg-green-500', pendente: 'bg-blue-500', atrasado: 'bg-red-500' }
const STATUS_LABEL: Record<string, string> = { pago: 'PAGO', pendente: 'PENDENTE', atrasado: 'ATRASADO' }

const INITIAL: Tx[] = []

const PERIODOS = ['ESTE MÊS (OUTUBRO)', 'SETEMBRO', 'AGOSTO', 'ÚLTIMO TRIMESTRE', 'ESTE ANO']
const CATEGORIAS = ['TODAS CATEGORIAS', ...Object.keys(CAT_COLORS)]

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

function ContextMenu({ tx, onDelete, onMarkPaid, onClose }: {
  tx: Tx; onDelete: () => void; onMarkPaid: () => void; onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="absolute right-8 top-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 min-w-[160px] overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {tx.status !== 'pago' && (
        <button onClick={() => { onMarkPaid(); onClose() }}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          <Check size={14} className="text-green-600" /> Marcar como pago
        </button>
      )}
      <button onClick={() => { onClose() }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100">
        <Edit2 size={14} className="text-blue-600" /> Editar
      </button>
      <button onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100">
        <Trash2 size={14} /> Excluir
      </button>
    </motion.div>
  )
}

export default function Financial() {
  const [txs, setTxs]           = useState(INITIAL)
  const [filter, setFilter]     = useState('ESTE MÊS (OUTUBRO)')
  const [catFilter, setCatFilter] = useState('TODAS CATEGORIAS')
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState({ descricao: '', categoria: 'VENDAS', tipo: 'entrada', valor: '', data: '', obs: '' })
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const [showPeriodo, setShowPeriodo]   = useState(false)
  const [showCategoria, setShowCategoria] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const filtered = txs.filter(t => catFilter === 'TODAS CATEGORIAS' || t.categoria === catFilter)
  const entradas = filtered.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
  const saidas   = filtered.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)
  const saldo    = entradas - saidas

  const save = () => {
    if (!form.descricao || !form.valor) return
    setTxs(prev => [{
      id: Date.now(),
      data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      descricao: form.descricao, categoria: form.categoria,
      catColor: CAT_COLORS[form.categoria] ?? 'bg-gray-100 text-gray-700',
      valor: parseFloat(form.valor), tipo: form.tipo as 'entrada' | 'saida', status: 'pendente', anexos: 0,
    }, ...prev])
    setModal(false)
    setForm({ descricao: '', categoria: 'VENDAS', tipo: 'entrada', valor: '', data: '', obs: '' })
    showToast('Lançamento registrado com sucesso!')
  }

  const deleteTx = (id: number) => {
    setTxs(prev => prev.filter(t => t.id !== id))
    showToast('Lançamento excluído.')
  }

  const markPaid = (id: number) => {
    setTxs(prev => prev.map(t => t.id === id ? { ...t, status: 'pago' } : t))
    showToast('Lançamento marcado como pago!')
  }

  const handleExportar = () => {
    const csv = [
      'Data,Hora,Descrição,Categoria,Valor,Tipo,Status',
      ...txs.map(t => `"${t.data}","${t.hora}","${t.descricao}","${t.categoria}","${t.valor}","${t.tipo}","${t.status}"`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `financeiro-${filter.toLowerCase().replace(/ /g,'-')}.csv`; a.click()
    URL.revokeObjectURL(url)
    showToast('Exportado com sucesso!')
  }

  const handleImprimir = () => {
    window.print()
  }

  return (
    <div className="p-6 space-y-5" onClick={() => { setOpenMenu(null); setShowPeriodo(false); setShowCategoria(false) }}>
      {/* Summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat col-span-2 xl:col-span-1">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Saldo do Período</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{fmt(saldo)}</p>
          <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
            <TrendingUp size={12} /> +12% VS MÊS ANTERIOR
          </p>
        </div>
        <div className="stat">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total Entradas</p>
          <p className="text-2xl font-bold text-blue-600">{fmt(entradas)}</p>
          <div className="mt-2 h-1 bg-blue-600 rounded-full w-full" />
        </div>
        <div className="stat">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total Saídas</p>
          <p className="text-2xl font-bold text-red-600">{fmt(saidas)}</p>
          <div className="mt-2 h-1 bg-red-600 rounded-full" style={{ width: `${Math.min(100, (saidas/Math.max(entradas,1))*100)}%` }} />
        </div>
        <div
          className="bg-navy-900 rounded-xl p-4 flex flex-col justify-between cursor-pointer hover:bg-blue-900 transition-colors"
          onClick={() => setModal(true)}
        >
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <DollarSign size={18} className="text-white" />
          </div>
          <div className="mt-3">
            <p className="text-white font-bold text-sm">Novo Lançamento</p>
            <p className="text-blue-200 text-xs">REGISTRAR ENTRADA OU SAÍDA</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setShowPeriodo(v => !v); setShowCategoria(false) }}
            className="btn-secondary text-xs py-1.5"
          >
            <Filter size={12} /> {filter} <ChevronDown size={11} />
          </button>
          <AnimatePresence>
            {showPeriodo && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-max overflow-hidden">
                {PERIODOS.map(p => (
                  <button key={p} onClick={e => { e.stopPropagation(); setFilter(p); setShowPeriodo(false) }}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${filter === p ? 'font-bold text-navy-900' : 'text-gray-700'}`}>
                    {p}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setShowCategoria(v => !v); setShowPeriodo(false) }}
            className="btn-secondary text-xs py-1.5"
          >
            <Filter size={12} /> {catFilter} <ChevronDown size={11} />
          </button>
          <AnimatePresence>
            {showCategoria && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-max overflow-hidden">
                {CATEGORIAS.map(c => (
                  <button key={c} onClick={e => { e.stopPropagation(); setCatFilter(c); setShowCategoria(false) }}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${catFilter === c ? 'font-bold text-navy-900' : 'text-gray-700'}`}>
                    {c}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1" />
        <button className="btn-secondary text-xs py-1.5" onClick={handleExportar}><Download size={12} /> Exportar</button>
        <button className="btn-secondary text-xs py-1.5" onClick={handleImprimir}><Printer size={12} /> Imprimir</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="th">Data</th>
              <th className="th">Descrição</th>
              <th className="th">Categoria</th>
              <th className="th">Valor</th>
              <th className="th">Status</th>
              <th className="th">Anexos</th>
              <th className="th w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <motion.tr key={t.id} layout className="tr relative">
                <td className="td whitespace-nowrap">
                  <p className="text-gray-700 text-xs font-medium">{t.data}</p>
                  <p className="text-gray-400 text-[11px]">{t.hora}</p>
                </td>
                <td className="td text-gray-800 max-w-xs">
                  <p className="truncate">{t.descricao}</p>
                </td>
                <td className="td">
                  <span className={`badge text-[11px] ${t.catColor}`}>{t.categoria}</span>
                </td>
                <td className={`td font-bold whitespace-nowrap ${t.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.tipo === 'entrada' ? '+' : '-'} {fmt(t.valor)}
                </td>
                <td className="td">
                  <button
                    onClick={() => t.status !== 'pago' && markPaid(t.id)}
                    className={`flex items-center gap-1.5 text-xs font-medium text-gray-600 ${t.status !== 'pago' ? 'hover:text-green-600 cursor-pointer' : 'cursor-default'}`}
                    title={t.status !== 'pago' ? 'Clique para marcar como pago' : undefined}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[t.status]}`} />
                    {STATUS_LABEL[t.status]}
                  </button>
                </td>
                <td className="td">
                  {t.anexos > 0 && (
                    <button className="flex items-center gap-1 text-gray-400 hover:text-navy-900 transition-colors text-xs">
                      <Paperclip size={13} /> {t.anexos}
                    </button>
                  )}
                </td>
                <td className="td relative">
                  <button
                    onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === t.id ? null : t.id) }}
                    className="text-gray-300 hover:text-gray-600"
                  >
                    <MoreVertical size={14} />
                  </button>
                  <AnimatePresence>
                    {openMenu === t.id && (
                      <ContextMenu
                        tx={t}
                        onDelete={() => deleteTx(t.id)}
                        onMarkPaid={() => markPaid(t.id)}
                        onClose={() => setOpenMenu(null)}
                      />
                    )}
                  </AnimatePresence>
                </td>
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="td text-center text-gray-400 py-8">
                  Nenhum lançamento encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)}>
            <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">Novo Lançamento Financeiro</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Preencha os detalhes para registrar uma nova movimentação de caixa.</p>
                </div>
                <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700 ml-4"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  {(['entrada','saida'] as const).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        form.tipo === t
                          ? t === 'entrada' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {t === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Descrição *</label>
                  <input className="input" placeholder="Ex: Venda Pedido #8830 – Cliente" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Valor (R$) *</label>
                    <input className="input" type="number" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data</label>
                    <input className="input" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                  <select className="input" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                    {Object.keys(CAT_COLORS).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Observações</label>
                  <textarea className="input h-20 resize-none" placeholder="Informações adicionais..." value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Anexo</label>
                  <label className="input flex items-center gap-2 cursor-pointer text-gray-400 hover:text-gray-700 transition-colors">
                    <Paperclip size={14} /> Selecionar arquivo (NF, boleto, recibo...)
                    <input type="file" className="hidden" />
                  </label>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button onClick={save} className="btn-primary flex-1 justify-center">Salvar Lançamento</button>
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
