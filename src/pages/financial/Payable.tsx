import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UploadCloud, CheckCircle, Search, Filter, Plus, X, Trash2, Link, FileText, User } from 'lucide-react'
import { getEntries, saveEntry, deleteEntry, FinEntry } from '../../services/dbLocal'

export default function Payable() {
  const [entries, setEntries] = useState<FinEntry[]>([])
  const [drag, setDrag] = useState(false)
  const [term, setTerm] = useState('')
  const [modalType, setModalType] = useState<false | 'new'>(false)
  
  // Modal State
  const [tab, setTab] = useState(0) // 0: Lançamento, 1: Outras, 2: Anexos
  const [form, setForm] = useState({
    descricao: '', vencimento: '', planoContas: 'Fornecedores', centroCusto: '',
    formaPagamento: '', quitado: 'Não', dataCompensacao: '',
    valorBruto: '', juros: '', desconto: '',
    fornecedor: '', dataCompetencia: '', obs: ''
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

  const toggleStatus = (entry: FinEntry) => {
    const isPago = entry.status === 'pago'
    const edit = { 
       ...entry, 
       status: isPago ? 'pendente' as const : 'pago' as const, 
       // Only set dataPagamento if marking as paid
       dataPagamento: !isPago ? new Date().toISOString().split('T')[0] : undefined 
    }
    saveEntry(edit)
    setEntries(prev => prev.map(e => e.id === entry.id ? edit : e))
  }

  const handleDelete = (id: string) => {
    if(!window.confirm('Tem certeza que deseja excluir esta conta a pagar permanentemente?')) return
    deleteEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const pendentes = entries.filter(e => e.status !== 'pago')
  const totalPendente = pendentes.reduce((acc, e) => acc + e.valor, 0)

  const handleSaveNovo = () => {
    if (!form.descricao || !form.valorBruto || !form.vencimento) return alert('Preencha os campos obrigatórios: Descrição, Valor Bruto e Vencimento')
    
    const vb = parseFloat(form.valorBruto) || 0
    const vj = parseFloat(form.juros) || 0
    const vd = parseFloat(form.desconto) || 0
    const finalValor = vb + vj - vd

    const novo: FinEntry = {
      id: Date.now().toString(),
      tipo: 'pagamento',
      categoria: form.planoContas || 'Geral',
      descricao: form.descricao,
      valor: finalValor,
      dataVencimento: form.vencimento,
      dataPagamento: form.quitado === 'Sim' && form.dataCompensacao ? form.dataCompensacao : undefined,
      status: form.quitado === 'Sim' ? 'pago' : 'pendente',
      fornecedor_cliente: form.fornecedor || 'Fornecedor Genérico'
    }
    saveEntry(novo)
    setEntries(prev => [novo, ...prev])
    setModalType(false)
    setTab(0)
    setForm({ 
      descricao: '', vencimento: '', planoContas: 'Fornecedores', centroCusto: '',
      formaPagamento: '', quitado: 'Não', dataCompensacao: '',
      valorBruto: '', juros: '', desconto: '',
      fornecedor: '', dataCompetencia: '', obs: ''
    })
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* HEADER */}
      <div className="border-b border-gray-100 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Contas a Pagar</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-medium tracking-wider">Gestão de Fornecedores e Despesas</p>
        </div>
        <div className="flex flex-wrap gap-2 text-right justify-start md:justify-end">
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-2 w-full sm:w-auto text-left sm:text-right">
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

          <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm min-w-[800px]">
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
                <tr key={e.id} className="hover:bg-gray-50/80 group transition-colors border-l-2 border-transparent hover:border-navy-500">
                  <td className="py-4 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                    {new Date(e.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')} 
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                        <User size={14} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm tracking-tight">{e.fornecedor_cliente}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 max-w-[200px] truncate">{e.descricao}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="bg-gray-100 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">{e.categoria}</span>
                  </td>
                  <td className="py-4 px-4 text-right font-black text-red-600 whitespace-nowrap text-sm">
                    R$ {e.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {e.status === 'pago' ? (
                       <button onClick={() => toggleStatus(e)} className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200 group/btn" title="Clique para reverter para pendente">
                         <span className="group-hover/btn:hidden flex items-center gap-1"><CheckCircle size={10} /> PAGO</span>
                         <span className="hidden group-hover/btn:block mx-1">⨯ REVERTER</span>
                       </button>
                    ) : (
                       <button onClick={() => toggleStatus(e)} className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 hover:bg-amber-100" title="Clique para marcar como pago"> PENDENTE</button>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-end gap-1.5">
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Anexar">
                        <Link size={14} />
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Excluir Conta">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-xs">Nenhuma despesa encontrada.</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Modal Nova Despesa (Gestão Click Style) */}
      {modalType && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-50 rounded shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-white p-4 flex justify-between items-center border-b border-gray-200">
              <h2 className="text-xl text-gray-700">Adicionar pagamento</h2>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <p>Início {'>'} Contas a pagar {'>'} Adicionar</p>
                <button onClick={() => setModalType(false)}><X size={18}/></button>
              </div>
            </div>

            <div className="bg-white border-b border-gray-200 px-4 flex gap-6 text-sm text-gray-600">
              <button onClick={() => setTab(0)} className={`py-4 px-2 border-b-2 font-medium ${tab === 0 ? 'border-navy-600 text-gray-900 font-bold' : 'border-transparent hover:text-gray-900'}`}>Lançamento financeiro</button>
              <button onClick={() => setTab(1)} className={`py-4 px-2 border-b-2 font-medium ${tab === 1 ? 'border-navy-600 text-gray-900 font-bold' : 'border-transparent hover:text-gray-900'}`}>Outras informações</button>
              <button onClick={() => setTab(2)} className={`py-4 px-2 border-b-2 font-medium ${tab === 2 ? 'border-navy-600 text-gray-900 font-bold' : 'border-transparent hover:text-gray-900'}`}>Anexos</button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {tab === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 bg-white rounded border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4"><span className="text-gray-400">📝</span> Dados gerais</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      <div className="col-span-2 lg:col-span-1">
                        <label className="block text-xs text-gray-600 mb-1">Descrição do pagamento *</label>
                        <input className="w-full border border-gray-300 rounded p-2 focus:border-navy-500 focus:outline-none" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
                      </div>
                      <div className="col-span-2 lg:col-span-1">
                        <label className="block text-xs text-gray-600 mb-1">Vencimento *</label>
                        <input type="date" className="w-full border border-gray-300 rounded p-2 focus:border-navy-500 focus:outline-none" value={form.vencimento} onChange={e => setForm({...form, vencimento: e.target.value})} />
                      </div>
                      
                      <div className="col-span-2 lg:col-span-1">
                        <label className="block text-xs text-gray-600 mb-1">Plano de contas *</label>
                        <select className="w-full border border-gray-300 rounded p-2 focus:border-navy-500 focus:outline-none" value={form.planoContas} onChange={e => setForm({...form, planoContas: e.target.value})}>
                          <option>Fornecedores Gerais</option>
                          <option>Folha de Pagamento</option>
                          <option>Manutenção</option>
                          <option>Impostos</option>
                        </select>
                      </div>
                      <div className="col-span-2 lg:col-span-1">
                        <label className="block text-xs text-gray-600 mb-1">Centro de custo</label>
                        <input placeholder="Digite para buscar" className="w-full border border-gray-300 rounded p-2 focus:border-navy-500 focus:outline-none" value={form.centroCusto} onChange={e => setForm({...form, centroCusto: e.target.value})} />
                      </div>

                      <div className="col-span-2 lg:col-span-1">
                        <label className="block text-xs text-gray-600 mb-1">Forma de pagamento *</label>
                        <select className="w-full border border-gray-300 rounded p-2 focus:border-navy-500 focus:outline-none" value={form.formaPagamento} onChange={e => setForm({...form, formaPagamento: e.target.value})}>
                          <option>Boleto</option>
                          <option>Pix</option>
                          <option>Transferência</option>
                        </select>
                      </div>
                      <div className="col-span-2 lg:col-span-1" />

                      <div className="col-span-2 lg:col-span-1">
                        <label className="block text-xs text-gray-600 mb-1">Pagamento quitado *</label>
                        <select className="w-full border border-gray-300 rounded p-2 focus:border-navy-500 focus:outline-none" value={form.quitado} onChange={e => setForm({...form, quitado: e.target.value})}>
                          <option>Não</option>
                          <option>Sim</option>
                        </select>
                      </div>
                      <div className="col-span-2 lg:col-span-1">
                        <label className="block text-xs text-gray-600 mb-1">Data de compensação</label>
                        <input type="date" disabled={form.quitado === 'Não'} className="w-full border border-gray-300 rounded p-2 focus:border-navy-500 focus:outline-none disabled:bg-gray-100" value={form.dataCompensacao} onChange={e => setForm({...form, dataCompensacao: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded border border-gray-200 flex flex-col">
                    <div className="p-5 flex-1">
                      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4"><span className="text-gray-400">💵</span> Valores</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Valor bruto *</label>
                          <input type="number" className="w-full border border-gray-300 rounded p-2 focus:border-navy-500 focus:outline-none" value={form.valorBruto} onChange={e => setForm({...form, valorBruto: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Juros / Multas</label>
                          <input type="number" className="w-full border border-gray-300 rounded p-2 focus:border-navy-500 focus:outline-none" value={form.juros} onChange={e => setForm({...form, juros: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Desconto</label>
                          <input type="number" className="w-full border border-gray-300 rounded p-2 focus:border-navy-500 focus:outline-none" value={form.desconto} onChange={e => setForm({...form, desconto: e.target.value})} />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 border-t border-gray-200 p-4 text-center">
                      <span className="text-gray-700 font-bold text-lg">Total: {((parseFloat(form.valorBruto)||0) + (parseFloat(form.juros)||0) - (parseFloat(form.desconto)||0)).toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                    </div>
                  </div>
                </div>
              )}

              {tab === 1 && (
                <div className="bg-white rounded border border-gray-200 p-5 min-h-[300px]">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                    <div className="col-span-2 lg:col-span-1">
                      <label className="block text-xs text-gray-600 mb-1">Entidade</label>
                      <select className="w-full border border-gray-300 rounded p-2"><option>Fornecedor</option><option>Funcionário</option></select>
                    </div>
                    <div className="col-span-2 lg:col-span-2">
                       <label className="block text-xs text-gray-600 mb-1">Fornecedor</label>
                       <input placeholder="Digite para buscar" className="w-full border border-gray-300 rounded p-2" value={form.fornecedor} onChange={e => setForm({...form, fornecedor: e.target.value})} />
                    </div>
                    <div className="col-span-2 lg:col-span-1">
                       <label className="block text-xs text-gray-600 mb-1">Data de competência *</label>
                       <input type="date" className="w-full border border-gray-300 rounded p-2" value={form.dataCompetencia} onChange={e => setForm({...form, dataCompetencia: e.target.value})} />
                    </div>
                    <div className="col-span-4">
                       <label className="block text-xs text-gray-600 mb-1">Informações complementares</label>
                       <textarea className="w-full border border-gray-300 rounded p-2 h-32 resize-none" value={form.obs} onChange={e => setForm({...form, obs: e.target.value})}></textarea>
                    </div>
                  </div>
                </div>
              )}

              {tab === 2 && (
                <div className="bg-white rounded border border-gray-200 p-5 min-h-[300px] flex flex-col items-center justify-center border-dashed border-2 m-4 bg-gray-50/50">
                  <UploadCloud size={32} className="text-gray-400 mb-4" />
                  <p className="text-gray-600 text-sm mb-2">Solte o arquivo aqui para fazer upload...</p>
                  <p className="text-gray-400 text-xs mb-4">Utilize este espaço para anexar comprovantes e documentos. Tamanho máximo 5Mb.</p>
                  <button className="bg-[#111827] text-white px-4 py-2 rounded text-sm flex items-center gap-2"><UploadCloud size={16}/> Selecionar arquivo</button>
                </div>
              )}
            </div>

            <div className="bg-white border-t border-gray-200 p-4 flex justify-between items-center">
              <div className="flex gap-2">
                 <button onClick={handleSaveNovo} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2 rounded text-sm flex items-center gap-2">✓ Cadastrar</button>
                 <button onClick={() => setModalType(false)} className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2 rounded text-sm flex items-center gap-2">⨯ Cancelar</button>
              </div>
              <div className="flex items-center gap-2">
                 <button disabled={tab === 0} onClick={() => setTab(tab-1)} className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm disabled:opacity-50">← Voltar</button>
                 <button disabled={tab === 2} onClick={() => setTab(tab+1)} className="border border-gray-300 bg-gray-50 text-gray-600 px-4 py-2 rounded text-sm disabled:opacity-50">Continuar →</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
