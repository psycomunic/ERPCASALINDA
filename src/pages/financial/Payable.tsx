import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, X, ChevronDown, List, Edit2, Trash2, ExternalLink, SlidersHorizontal, Settings2, FileText, Printer, Copy, RotateCcw } from 'lucide-react'
import { fetchTransacoes, createTransacao, updateTransacao, deleteTransacao } from '../../services/apiFinTransacoes'
import type { Database } from '../../lib/database.types'

type Transacao = Database['public']['Tables']['fin_transacoes']['Row']

export default function Payable() {
  const [entries, setEntries] = useState<Transacao[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState('Abril de 2026')
  const [showPeriodoMenu, setShowPeriodoMenu] = useState(false)

  // Advanced search states
  const [advFilters, setAdvFilters] = useState({
    planoContas: 'Todos',
    fornecedor: '',
    periodoInicio: '',
    periodoFim: '',
    situacao: 'Todas'
  })

  // Modal State (for New Expense)
  const [modalType, setModalType] = useState<false | 'new'>(false)
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState({
    descricao: '', vencimento: '', planoContas: 'Fornecedores Gerais', centroCusto: '',
    formaPagamento: 'Boleto Bancário', quitado: 'Não', dataCompensacao: '',
    valorBruto: '', juros: '', desconto: '',
    fornecedor: '', dataCompetencia: '', obs: ''
  })

  useEffect(() => {
    fetchTransacoes({ tipo: 'despesa' }).then(setEntries)
  }, [])

  // KPI Calculations
  const calcKpis = () => {
    const today = new Date().toISOString().split('T')[0]
    let vencidos = 0, vencemHoje = 0, aVencer = 0, pagos = 0, total = 0

    entries.forEach(e => {
      total += e.valor_final
      if (e.situacao === 'pago') {
        pagos += e.valor_final
      } else {
        if (e.data_vencimento < today) vencidos += e.valor_final
        else if (e.data_vencimento === today) vencemHoje += e.valor_final
        else aVencer += e.valor_final
      }
    })
    return { vencidos, vencemHoje, aVencer, pagos, total }
  }
  const kpi = calcKpis()

  // Handlers
  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta despesa permanentemente?')) return
    await deleteTransacao(id)
    setEntries(prev => prev.filter(e => e.id !== id))
    setActiveMenuId(null)
  }

  const toggleStatus = async (entry: Transacao) => {
    const isPago = entry.situacao === 'pago'
    const newSituacao = isPago ? 'pendente' : 'pago'
    const novaDataPagamento = !isPago ? new Date().toISOString().split('T')[0] : null
    
    await updateTransacao(entry.id, { situacao: newSituacao, data_pagamento: novaDataPagamento })
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, situacao: newSituacao, data_pagamento: novaDataPagamento } : e))
  }

  const handleSaveNovo = async () => {
    if (!form.descricao || !form.valorBruto || !form.vencimento) {
      alert('Preencha os campos obrigatórios: Descrição, Valor Bruto e Vencimento')
      return
    }
    
    const vb = parseFloat(form.valorBruto) || 0
    const vj = parseFloat(form.juros) || 0
    const vd = parseFloat(form.desconto) || 0
    const finalValor = vb + vj - vd

    const transacao = await createTransacao({
      tipo: 'despesa',
      plano_contas: form.planoContas,
      descricao: form.descricao,
      valor_bruto: vb,
      juros_multas: vj,
      desconto: vd,
      valor_final: finalValor,
      data_vencimento: form.vencimento,
      data_pagamento: form.quitado === 'Sim' && form.dataCompensacao ? form.dataCompensacao : null,
      situacao: form.quitado === 'Sim' ? 'pago' : 'pendente',
      fornecedor: form.fornecedor || '',
      forma_pagamento: form.formaPagamento,
      centro_custo: form.centroCusto || null,
      data_competencia: form.dataCompetencia || null,
      observacoes: form.obs || null
    })

    if (transacao) {
      setEntries(prev => [transacao, ...prev])
      setModalType(false)
      setTab(0)
      setForm({...form, descricao: '', valorBruto: '', fornecedor: ''})
    } else {
      alert('Tabela fin_transacoes não encontrada no Banco de Dados. Por favor execute o Script SQL presente em supabase_script.sql no seu painel do Supabase.')
    }
  }

  const getFilteredEntries = () => {
    return itemsFilteredByAdvanced()
  }

  const itemsFilteredByAdvanced = () => {
    return entries.filter(e => {
      const nome_fornecedor = e.fornecedor || ''
      const matchSearch = nome_fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) || e.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchPlan = advFilters.planoContas === 'Todos' || e.plano_contas === advFilters.planoContas
      const matchStatus = advFilters.situacao === 'Todas' 
        ? true 
        : (advFilters.situacao === 'Pago' ? e.situacao === 'pago' : e.situacao === 'pendente')
      
      return matchSearch && matchPlan && matchStatus
    })
  }

  const resultList = getFilteredEntries()

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative overflow-hidden" onClick={() => setActiveMenuId(null)}>
      {/* HEADER / TOOLBAR */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-3">
          <Settings2 className="text-navy-900" size={20} />
          Contas a pagar
        </h1>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Ações da Esquerda */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide w-full xl:w-auto pb-1 xl:pb-0">
            <button onClick={() => setModalType('new')} className="bg-[#10b981] hover:bg-emerald-600 text-white font-medium px-4 py-[9px] rounded text-sm flex items-center gap-2 shrink-0 transition-colors">
              <Plus size={16} /> Adicionar
            </button>
            <button className="bg-[#701a75] hover:bg-fuchsia-900 text-white font-medium px-4 py-[9px] rounded text-sm flex items-center gap-2 shrink-0 transition-colors">
              <FileText size={16} /> Contas fixas
            </button>
            <div className="relative shrink-0">
              <button className="bg-[#111827] hover:bg-gray-900 text-white font-medium px-4 py-[9px] rounded text-sm flex items-center gap-2 transition-colors">
                <Settings2 size={16} /> Mais ações <ChevronDown size={14} />
              </button>
            </div>
            <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-[9px] rounded flex items-center shrink-0 transition-colors">
              <List size={16} />
            </button>
          </div>

          {/* Ações da Direita */}
          <div className="flex bg-white items-center gap-2 overflow-x-auto scrollbar-hide py-1 xl:py-0 w-full xl:w-auto shrink-0 justify-start xl:justify-end">
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowPeriodoMenu(!showPeriodoMenu) }}
                className="bg-[#111827] hover:bg-gray-900 text-white font-medium px-4 py-[9px] rounded text-sm flex items-center gap-2 min-w-[140px] justify-between transition-colors"
              >
                {periodo} <ChevronDown size={14} />
              </button>
              <AnimatePresence>
                {showPeriodoMenu && (
                   <motion.div 
                     initial={{ opacity:0, y:-5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-5 }}
                     className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg w-full py-1 z-30"
                   >
                     {['Hoje', 'Esta semana', 'Mês passado', 'Este mês', 'Próximo mês', 'Todo o período'].map(m => (
                       <button key={m} onClick={() => { setPeriodo(m); setShowPeriodoMenu(false) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                         {m}
                       </button>
                     ))}
                   </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)} 
              className="bg-[#111827] hover:bg-gray-900 text-white font-medium px-4 py-[9px] rounded text-sm flex items-center gap-2 transition-colors shrink-0"
            >
              <Search size={16} /> Busca avançada
            </button>
          </div>
        </div>
      </div>

      {/* BUSCA AVANÇADA PANEL */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-gray-200 overflow-hidden shrink-0 shadow-sm relative z-20"
          >
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Loja</label>
                  <select className="input text-sm"><option>CASA LINDA</option><option>LAR E VIDA</option></select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Código</label>
                  <input className="input text-sm" placeholder="ID da conta" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Plano de contas</label>
                  <select value={advFilters.planoContas} onChange={e=>setAdvFilters({...advFilters, planoContas: e.target.value})} className="input text-sm">
                    <option>Todos</option>
                    <option>Fornecedores Gerais</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                  <input className="input text-sm" placeholder="Descrição do pagamento" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Entidade</label>
                  <select className="input text-sm"><option>Fornecedor</option><option>Colaborador</option></select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fornecedor (busca)</label>
                  <input className="input text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Digite para buscar" />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Período de Vencimento</label>
                  <div className="flex items-center gap-2">
                    <input type="date" className="input text-sm" />
                    <span className="text-gray-400">a</span>
                    <input type="date" className="input text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Situação</label>
                  <select value={advFilters.situacao} onChange={e=>setAdvFilters({...advFilters, situacao: e.target.value})} className="input text-sm">
                    <option>Todas</option>
                    <option>Pendente</option>
                    <option>Pago</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Conta bancária</label>
                  <select className="input text-sm"><option>Todos</option></select>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="bg-[#10b981] hover:bg-emerald-600 text-white font-medium px-4 py-2 rounded text-sm flex items-center gap-1">
                  ✓ Buscar
                </button>
                <button onClick={() => { setSearchTerm(''); setAdvFilters({...advFilters, situacao:'Todas', planoContas:'Todos'}) }} className="bg-rose-500 hover:bg-rose-600 text-white font-medium px-4 py-2 rounded text-sm flex items-center gap-1">
                  ⨯ Limpar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-[1400px] mx-auto pb-20">
        
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
          <div className="bg-white border text-center pt-0 overflow-hidden shadow-sm flex flex-col border-t-4 border-gray-200 border-t-red-500 rounded-sm">
             <div className="bg-[#ef4444] text-white text-xs font-bold py-1.5 flex justify-between px-3">
               <span>Vencidos</span>
               <ExternalLink size={12}/>
             </div>
             <div className="py-4 font-normal text-2xl text-red-500">
               {kpi.vencidos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
             </div>
          </div>
          <div className="bg-white border text-center pt-0 overflow-hidden shadow-sm flex flex-col border-t-4 border-gray-200 border-t-orange-500 rounded-sm">
             <div className="bg-[#f97316] text-white text-xs font-bold py-1.5 flex justify-between px-3">
               <span>Vencem hoje</span>
               <ExternalLink size={12}/>
             </div>
             <div className="py-4 font-normal text-2xl text-orange-500">
               {kpi.vencemHoje.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
             </div>
          </div>
          <div className="bg-white border text-center pt-0 overflow-hidden shadow-sm flex flex-col border-t-4 border-gray-200 border-t-slate-500 rounded-sm">
             <div className="bg-[#64748b] text-white text-xs font-bold py-1.5 flex justify-between px-3">
               <span>A vencer</span>
               <ExternalLink size={12}/>
             </div>
             <div className="py-4 font-normal text-2xl text-slate-500">
               {kpi.aVencer.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
             </div>
          </div>
          <div className="bg-white border text-center pt-0 overflow-hidden shadow-sm flex flex-col border-t-4 border-gray-200 border-t-emerald-500 rounded-sm">
             <div className="bg-[#10b981] text-white text-xs font-bold py-1.5 flex justify-between px-3">
               <span>Pagos</span>
               <ExternalLink size={12}/>
             </div>
             <div className="py-4 font-normal text-2xl text-emerald-500">
               {kpi.pagos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
             </div>
          </div>
          <div className="bg-white border text-center pt-0 overflow-hidden shadow-sm flex flex-col border-t-4 border-gray-200 border-t-navy-900 rounded-sm">
             <div className="bg-[#111827] text-white text-xs font-bold py-1.5 flex justify-between px-3">
               <span>Total</span>
             </div>
             <div className="py-4 font-normal text-2xl text-gray-800">
               {kpi.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
             </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="bg-[#f9fafb] border-b border-gray-200 font-bold text-gray-800">
                <tr>
                  <th className="py-3 px-4 border-r border-gray-200">Descrição</th>
                  <th className="py-3 px-4 border-r border-gray-200">Entidade</th>
                  <th className="py-3 px-4 border-r border-gray-200">Pagamento</th>
                  <th className="py-3 px-4 border-r border-gray-200">Data</th>
                  <th className="py-3 px-4 border-r border-gray-200">NF-e</th>
                  <th className="py-3 px-4 border-r border-gray-200 text-center">Situação</th>
                  <th className="py-3 px-4 border-r border-gray-200">Valor</th>
                  <th className="py-3 px-4 text-center w-36">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resultList.map((e, index) => (
                  <tr key={e.id} className={`${index % 2===0 ? 'bg-white' : 'bg-[#f8f9fa]'} hover:bg-blue-50/40 transition-colors group`}>
                    <td className="py-3 px-4 border-r border-gray-100 flex items-center gap-1.5 font-medium text-gray-700">
                      {e.descricao}
                      {e.anexo_url && <span className="text-gray-400" title="Possui anexos"><FileText size={12}/></span>}
                    </td>
                    <td className="py-3 px-4 border-r border-gray-100">
                      <div className="flex flex-col">
                        <a href="#" className="font-semibold text-[#0066cc] hover:underline uppercase text-[11px] truncate max-w-[180px]" title={e.fornecedor || 'Não informado'}>
                          {e.fornecedor || '--'}
                        </a>
                        <span className="text-[10px] text-gray-500 uppercase italic truncate max-w-[180px]">{(e.plano_contas || 'Geral')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 border-r border-gray-100 text-gray-600">
                      {e.forma_pagamento || '--'}
                    </td>
                    <td className="py-3 px-4 border-r border-gray-100 text-gray-600 font-medium">
                      {e.data_vencimento ? e.data_vencimento.split('-').reverse().join('/') : '--'}
                    </td>
                    <td className="py-3 px-4 border-r border-gray-100">
                      <a href="#" className="text-gray-600 hover:text-navy-600 hover:underline">{e.nfe || '------'}</a>
                    </td>
                    <td className="py-3 px-4 border-r border-gray-100 text-center">
                      {e.situacao === 'pago' ? (
                        <div className="inline-flex bg-[#22c55e] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-sm cursor-pointer hover:opacity-80" onClick={()=>toggleStatus(e)}>PAGO</div>
                      ) : e.data_vencimento < new Date().toISOString().split('T')[0] ? (
                        <div className="inline-flex bg-[#ef4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-sm cursor-pointer hover:opacity-80" onClick={()=>toggleStatus(e)}>VENCIDO</div>
                      ) : (
                        <div className="inline-flex bg-gray-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-sm cursor-pointer hover:opacity-80" onClick={()=>toggleStatus(e)}>PENDENTE</div>
                      )}
                    </td>
                    <td className="py-3 px-4 border-r border-gray-100 text-gray-700 font-semibold tabular-nums">
                      {e.valor_final.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-2 px-3 text-center align-middle h-full">
                      <div className="flex items-center justify-center gap-[2px]">
                        <button className="w-[26px] h-[26px] bg-[#00b4d8] text-white rounded-[3px] flex items-center justify-center hover:bg-[#0096c7] transition-colors" title="Visualizar">
                          <Search size={14} />
                        </button>
                        <button className="w-[26px] h-[26px] bg-[#f59e0b] text-white rounded-[3px] flex items-center justify-center hover:bg-[#d97706] transition-colors" title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(e.id)} className="w-[26px] h-[26px] bg-[#ef4444] text-white rounded-[3px] flex items-center justify-center hover:bg-[#dc2626] transition-colors" title="Excluir">
                          <X size={14} />
                        </button>
                        <div className="relative">
                          <button 
                            onClick={(ev) => { ev.stopPropagation(); setActiveMenuId(activeMenuId === e.id ? null : e.id) }} 
                            className="w-[26px] h-[26px] bg-[#10b981] text-white rounded-[3px] flex items-center justify-center hover:bg-[#059669] transition-colors" title="Mais opções"
                          >
                            <ChevronDown size={14} />
                          </button>
                          
                          {/* Dropdown de Ações */}
                          <AnimatePresence>
                            {activeMenuId === e.id && (
                              <motion.div 
                                initial={{ opacity:0, y:-5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-5 }}
                                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-sm shadow-xl w-56 py-1 z-40 text-left"
                                onClick={(ev) => ev.stopPropagation()}
                              >
                                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-600 font-medium flex items-center gap-2">
                                  <RotateCcw size={14} className="text-gray-400"/> Cancelar confirmação
                                </button>
                                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-600 font-medium flex items-center gap-2">
                                  <Printer size={14} className="text-gray-400"/> Imprimir recibo
                                </button>
                                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-600 font-medium flex items-center gap-2">
                                  <Copy size={14} className="text-gray-400"/> Duplicar pagamento
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {resultList.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 font-bold text-gray-400">Nenhum registro encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-[#f8f9fa] border-t border-gray-200 text-xs text-gray-500 font-medium flex justify-between">
            <span>Listando {resultList.length} registros</span>
            <div className="flex gap-2">
              <button disabled className="px-2 py-1 bg-white border rounded opacity-50 cursor-not-allowed">Anterior</button>
              <button disabled className="px-2 py-1 bg-white border rounded opacity-50 cursor-not-allowed">Próxima</button>
            </div>
          </div>
        </div>
      </div>

       {/* Modal Nova Despesa (Original Preservado Esteticamente) */}
       {modalType && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-50 rounded shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-[#111827] px-5 py-4 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Plus size={18}/> Adicionar pagamento</h2>
              <button onClick={() => setModalType(false)} className="text-gray-300 hover:text-white transition-colors"><X size={20}/></button>
            </div>

            <div className="bg-white px-5 flex gap-8 border-b border-gray-200 text-sm text-gray-600">
              <button onClick={() => setTab(0)} className={`py-3 font-semibold border-b-2 transition-colors ${tab === 0 ? 'border-navy-600 text-navy-900' : 'border-transparent hover:text-gray-900'}`}>Lançamento financeiro</button>
              <button onClick={() => setTab(1)} className={`py-3 font-semibold border-b-2 transition-colors ${tab === 1 ? 'border-navy-600 text-navy-900' : 'border-transparent hover:text-gray-900'}`}>Outras informações</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-[#f8f9fa]">
              {tab === 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white border border-gray-200 p-5 shadow-sm rounded-sm">
                    <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição *</label>
                        <input className="input" placeholder="Ex: Compra de materiais" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Vencimento *</label>
                        <input type="date" className="input" value={form.vencimento} onChange={e => setForm({...form, vencimento: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Forma de pagamento</label>
                        <select className="input" value={form.formaPagamento} onChange={e => setForm({...form, formaPagamento: e.target.value})}>
                          <option>Boleto Bancário</option><option>PIX</option><option>Cartão Crédito</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Fornecedor</label>
                        <input className="input" placeholder="Razão social ou apelido" value={form.fornecedor} onChange={e => setForm({...form, fornecedor: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Conta Quitada?</label>
                        <select className="input" value={form.quitado} onChange={e => setForm({...form, quitado: e.target.value})}>
                          <option>Não</option><option>Sim</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 shadow-sm rounded-sm flex flex-col">
                    <div className="p-5 flex-1 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Valor Original (R$) *</label>
                        <input type="number" className="input text-right text-lg font-bold text-gray-800" placeholder="0,00" value={form.valorBruto} onChange={e => setForm({...form, valorBruto: e.target.value})} />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1 text-red-600">Juros (+)</label>
                          <input type="number" className="input text-right" placeholder="0,00" value={form.juros} onChange={e => setForm({...form, juros: e.target.value})} />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-700 mb-1 text-green-600">Desconto (-)</label>
                          <input type="number" className="input text-right" placeholder="0,00" value={form.desconto} onChange={e => setForm({...form, desconto: e.target.value})} />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-100 border-t border-gray-200 p-4 text-center">
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Valor Final Líquido</span>
                      <span className="text-navy-900 font-black text-2xl">R$ {((parseFloat(form.valorBruto)||0) + (parseFloat(form.juros)||0) - (parseFloat(form.desconto)||0)).toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                    </div>
                  </div>
                </div>
              )}
              {tab === 1 && (
                <div className="bg-white border border-gray-200 p-5 shadow-sm rounded-sm">
                  <p className="text-xs text-gray-400 mb-4">Informações complementares e central de custo.</p>
                  {/* Simplificando outros inputs */}
                  <textarea className="input h-32" placeholder="Observações..." value={form.obs} onChange={e=>setForm({...form, obs:e.target.value})}></textarea>
                </div>
              )}
            </div>

            <div className="bg-white border-t border-gray-200 p-4 flex justify-between items-center">
              <button onClick={() => setModalType(false)} className="px-5 py-2 rounded text-sm text-gray-600 font-bold hover:bg-gray-100">Cancelar</button>
              <button onClick={handleSaveNovo} className="bg-[#10b981] hover:bg-emerald-600 text-white font-bold px-6 py-2 rounded text-sm shadow-md transition-colors">
                Salvar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
