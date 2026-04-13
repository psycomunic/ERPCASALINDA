import { useState, useEffect } from 'react'
import { Search, Filter, MoreVertical, Plus, CheckCircle, TrendingUp, X } from 'lucide-react'
import { getEntries, saveEntry, FinEntry } from '../../services/dbLocal'

export default function Receivable() {
  const [entries, setEntries] = useState<FinEntry[]>([])
  const [term, setTerm] = useState('')
  const [modalType, setModalType] = useState<false | 'new'>(false)
  
  const [form, setForm] = useState({
    cliente: '', descricao: '', valor: '', vencimento: '', categoria: 'Vendas Loja Física'
  })

  useEffect(() => {
    setEntries(getEntries().filter(e => e.tipo === 'recebimento'))
  }, [])

  const markPaid = (entry: FinEntry) => {
    const edit = { ...entry, status: 'pago' as const, dataPagamento: new Date().toISOString().split('T')[0] }
    saveEntry(edit)
    setEntries(prev => prev.map(e => e.id === entry.id ? edit : e))
  }

  const pendentes = entries.filter(e => e.status !== 'pago')
  const totalPendente = pendentes.reduce((acc, e) => acc + e.valor, 0)
  const totalRecebido = entries.filter(e => e.status === 'pago').reduce((acc, e) => acc + e.valor, 0)

  const handleSaveNovo = () => {
    if (!form.cliente || !form.valor || !form.vencimento) return alert('Preencha os campos obrigatórios')
    
    const novo: FinEntry = {
      id: Date.now().toString(),
      tipo: 'recebimento',
      categoria: form.categoria,
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      dataVencimento: form.vencimento,
      status: 'pendente',
      fornecedor_cliente: form.cliente
    }
    saveEntry(novo)
    setEntries(prev => [novo, ...prev])
    setModalType(false)
    setForm({ cliente: '', descricao: '', valor: '', vencimento: '', categoria: 'Vendas Loja Física' })
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="border-b border-gray-100 px-6 py-5 flex items-center justify-between shrink-0 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Contas a Receber</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-medium tracking-wider">Gestão de Faturamentos e Receitas</p>
        </div>
        <div className="flex gap-4 text-right items-center">
          <div>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-0.5">Total Recebido</p>
            <p className="text-base font-bold text-emerald-700 leading-none">R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits:2 })}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-0.5">A Receber</p>
            <p className="text-lg font-black text-blue-700 leading-none">+ R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits:2 })}</p>
          </div>
          <button onClick={() => setModalType('new')} className="btn-primary ml-2"><Plus size={14} /> Novo Recebimento</button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto w-full max-w-5xl mx-auto space-y-6">
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                placeholder="Buscar cliente ou número do pedido..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                value={term} onChange={e => setTerm(e.target.value)}
              />
            </div>
            <button className="btn-secondary text-xs"><Filter size={14} /> Filtros</button>
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <tr>
                <th className="py-3 px-4 w-32">Vencimento</th>
                <th className="py-3 px-4">Cliente / Origem</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.filter(e => e.fornecedor_cliente.toLowerCase().includes(term.toLowerCase()) || e.descricao.toLowerCase().includes(term.toLowerCase())).map(e => (
                <tr key={e.id} className="hover:bg-gray-50 group">
                  <td className="py-3 px-4 text-xs font-semibold text-gray-600 whitespace-nowrap">
                    {new Date(e.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')} 
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-gray-900 text-xs">{e.fornecedor_cliente}</p>
                    <p className="text-[11px] text-gray-500">{e.descricao}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-gray-100 border border-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{e.categoria}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-blue-600 whitespace-nowrap">
                    R$ {e.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {e.status === 'pago' ? (
                       <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><CheckCircle size={10} /> RECEBIDO</span>
                    ) : (
                       <button onClick={() => markPaid(e)} className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 hover:bg-amber-100"> PENDENTE</button>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-gray-400 hover:text-navy-900"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-xs">Nenhum recebimento encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Recebimento */}
      {modalType && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Registrar Contas a Receber</h2>
              <button onClick={() => setModalType(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Cliente / Origem *</label>
                <input className="input" placeholder="Ex: João da Silva ou Magazord" value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Descrição</label>
                <input className="input" placeholder="Ex: Venda Pedido #1020" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Valor (R$) *</label>
                  <input className="input" type="number" placeholder="0,00" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Vencimento *</label>
                  <input className="input" type="date" value={form.vencimento} onChange={e => setForm({...form, vencimento: e.target.value})} />
                </div>
              </div>
              <div>
                 <label className="block text-xs font-semibold text-gray-500 mb-1">Categoria</label>
                 <select className="input" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                   <option>Vendas Loja Física</option>
                   <option>Vendas E-commerce</option>
                   <option>Repasse Plataforma</option>
                   <option>Serviços Adicionais</option>
                 </select>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModalType(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSaveNovo} className="btn-primary">Salvar Lançamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
