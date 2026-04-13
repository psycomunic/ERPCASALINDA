import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UploadCloud, CheckCircle, Search, Filter, MoreVertical, Plus, X } from 'lucide-react'
import { getEntries, saveEntry, FinEntry } from '../../services/dbLocal'

export default function Payable() {
  const [entries, setEntries] = useState<FinEntry[]>([])
  const [drag, setDrag] = useState(false)
  const [term, setTerm] = useState('')
  const [modalType, setModalType] = useState<false | 'new'>(false)
  
  // Modal State
  const [form, setForm] = useState({
    fornecedor: '', descricao: '', valor: '', vencimento: '', categoria: 'Fornecedores'
  })

  useEffect(() => {
    setEntries(getEntries().filter(e => e.tipo === 'pagamento'))
  }, [])

  const handleParseXML = (file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(text, 'text/xml')
        
        // Extração simulada de NFe Brasileira Padrão
        const fornecedor = xmlDoc.getElementsByTagName('xNome')[0]?.textContent || 'Fornecedor XML'
        const valorStr = xmlDoc.getElementsByTagName('vNF')[0]?.textContent || '0'
        const dataEmi = xmlDoc.getElementsByTagName('dhEmi')[0]?.textContent || new Date().toISOString()
        
        const valor = parseFloat(valorStr)
        const novo: FinEntry = {
          id: Date.now().toString(),
          tipo: 'pagamento',
          categoria: 'Compras (XML Importado)',
          descricao: `NFe Genérica`,
          valor,
          dataVencimento: dataEmi.split('T')[0],
          status: 'pendente',
          fornecedor_cliente: fornecedor
        }
        
        saveEntry(novo)
        setEntries(prev => [novo, ...prev])
        alert(`Sucesso! NFe de ${fornecedor} no valor de R$ ${valor.toFixed(2)} importada.`)
        
      } catch (err) {
        alert('Erro ao processar arquivo XML. Ele parece não ser uma NFe válida.')
      }
    }
    reader.readAsText(file)
  }

  const markPaid = (entry: FinEntry) => {
    const edit = { ...entry, status: 'pago' as const, dataPagamento: new Date().toISOString().split('T')[0] }
    saveEntry(edit)
    setEntries(prev => prev.map(e => e.id === entry.id ? edit : e))
  }

  const pendentes = entries.filter(e => e.status !== 'pago')
  const totalPendente = pendentes.reduce((acc, e) => acc + e.valor, 0)

  const handleSaveNovo = () => {
    if (!form.fornecedor || !form.valor || !form.vencimento) return alert('Preencha os campos obrigatórios')
    
    const novo: FinEntry = {
      id: Date.now().toString(),
      tipo: 'pagamento',
      categoria: form.categoria,
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      dataVencimento: form.vencimento,
      status: 'pendente',
      fornecedor_cliente: form.fornecedor
    }
    saveEntry(novo)
    setEntries(prev => [novo, ...prev])
    setModalType(false)
    setForm({ fornecedor: '', descricao: '', valor: '', vencimento: '', categoria: 'Fornecedores' })
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* HEADER */}
      <div className="border-b border-gray-100 px-6 py-5 flex items-center justify-between shrink-0 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Contas a Pagar</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-medium tracking-wider">Gestão de Fornecedores e Despesas</p>
        </div>
        <div className="flex gap-2 text-right">
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-2">
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-0.5">Total Aberto</p>
            <p className="text-lg font-black text-red-700 leading-none">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits:2 })}</p>
          </div>
          <button onClick={() => setModalType('new')} className="btn-primary"><Plus size={14} /> Nova Despesa</button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto w-full max-w-5xl mx-auto space-y-6">
        
        {/* MAGNETIC DROPZONE XML */}
        <div 
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => {
            e.preventDefault(); setDrag(false)
            if (e.dataTransfer.files.length) handleParseXML(e.dataTransfer.files[0])
          }}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors ${drag ? 'border-navy-500 bg-blue-50' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300'}`}
        >
          <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-gray-100 mb-3">
            <UploadCloud size={20} className="text-navy-600" />
          </div>
          <p className="text-sm font-bold text-gray-700">Importar XML de Fornecedor</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">Arraste e solte arquivos de Nota Fiscal (XML) aqui. O sistema extrairá os valores e datas de vencimento automaticamente.</p>
        </div>

        {/* LIST */}
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                placeholder="Buscar despesa ou fornecedor..." 
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
                <th className="py-3 px-4">Fornecedor / Descrição</th>
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
                  <td className="py-3 px-4 text-right font-black text-red-600 whitespace-nowrap">
                    R$ {e.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {e.status === 'pago' ? (
                       <span className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><CheckCircle size={10} /> PAGO</span>
                    ) : (
                       <button onClick={() => markPaid(e)} className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 hover:bg-amber-100"> PENDENTE</button>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-gray-400 hover:text-navy-900"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-xs">Nenhuma despesa encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Despesa */}
      {modalType && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Registrar Contas a Pagar</h2>
              <button onClick={() => setModalType(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Fornecedor *</label>
                <input className="input" placeholder="Ex: Silva Madeiras" value={form.fornecedor} onChange={e => setForm({...form, fornecedor: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Descrição</label>
                <input className="input" placeholder="Ex: Compra de matéria prima..." value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
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
                   <option>Fornecedores (Madeira)</option>
                   <option>Fornecedores (Vidros)</option>
                   <option>Impostos (DAS)</option>
                   <option>Manutenção Operacional</option>
                   <option>Folha de Pagamento</option>
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
