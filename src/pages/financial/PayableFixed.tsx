import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Search, Search as SearchIcon, X, ChevronDown, List as ListIcon,
  Home, ChevronRight, Edit3, Edit2, Trash2, ArrowRightLeft, 
  User, CheckCircle, FileText, Send
} from 'lucide-react'
import { Link } from 'react-router-dom'

// ======== MOCK DATA ========
type ContaFixa = {
  id: string
  codigo: string
  descricao: string
  entidade: string
  planoContas: string
  formaPagamento: string
  gerarPagamento: string
  repetirPor: string
  qtdVezes: string
  vencimento: string
  dataCompetencia: string
  valor: number
  juros: number
  desconto: number
  situacao: string
  loja: string
  criadoPor: string
  criadoEm: string
  modificadoEm: string
}

const mockData: ContaFixa[] = [
  {
    id: '1', codigo: '21',
    descricao: 'DIARISTA CASA JHONATHAN', entidade: 'JONATHAN MARQUES ANTUNES',
    planoContas: 'DESPESAS JONATHAN', formaPagamento: 'PIX',
    gerarPagamento: 'Uma semana antes do vencimento', repetirPor: '7 days', qtdVezes: '-',
    vencimento: '04/05/2026', dataCompetencia: '01/08/2025',
    valor: 600, juros: 0, desconto: 0, situacao: 'Em aberto',
    loja: 'CASA LINDA',
    criadoPor: 'ALESSANDRA', criadoEm: '01/08/2025 10:44:22', modificadoEm: '17/03/2026 11:15:20'
  },
  {
    id: '2', codigo: '22',
    descricao: 'LUZ CASA LINDA', entidade: 'CELESC',
    planoContas: 'Energia elétrica + água', formaPagamento: 'Boleto Bancário',
    gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '04/06/2026', dataCompetencia: '01/05/2026',
    valor: 2197.20, juros: 0, desconto: 0, situacao: 'Em aberto',
    loja: 'CASA LINDA',
    criadoPor: 'ALESSANDRA', criadoEm: '01/05/2025 10:00:00', modificadoEm: '-'
  },
  {
    id: '3', codigo: '23',
    descricao: 'CONTABILIDADE CASA LINDA', entidade: 'CONTEG CONTABILIDADE LTDA',
    planoContas: 'Contabilidade', formaPagamento: 'Boleto Bancário',
    gerarPagamento: '1 mês antes do vencimento', repetirPor: 'Mensal', qtdVezes: '-',
    vencimento: '10/06/2026', dataCompetencia: '01/05/2026',
    valor: 3530.00, juros: 0, desconto: 0, situacao: 'Em aberto',
    loja: 'CASA LINDA',
    criadoPor: 'ALESSANDRA', criadoEm: '01/05/2025 10:00:00', modificadoEm: '-'
  }
]

export default function PayableFixed() {
  const [viewState, setViewState] = useState<'list' | 'detail'>('list')
  const [activeItem, setActiveItem] = useState<ContaFixa | null>(null)
  
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  const handleView = (item: ContaFixa) => {
    setActiveItem(item)
    setViewState('detail')
  }

  const handleBackToList = () => {
    setActiveItem(null)
    setViewState('list')
  }

  return (
    <div className="flex-1 bg-white min-h-[calc(100vh-64px)] flex flex-col pt-16">
      
      {/* GLOBAL HEADER */}
      <div className="bg-white px-6 py-6 border-b border-gray-200">
        <div className="flex items-center justify-between max-w-[1500px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
              <ArrowRightLeft size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {viewState === 'list' ? 'Contas fixas' : 'Visualizar conta fixa'}
              </h1>
              <div className="flex items-center text-xs text-gray-500 gap-1.5 font-medium uppercase tracking-wide mt-1">
                <Home size={12} className="text-gray-400" /> Início 
                <ChevronRight size={12} className="text-gray-300" /> 
                <Link to="/financeiro/payable" className="hover:text-emerald-600 transition-colors">Contas a pagar</Link> 
                <ChevronRight size={12} className="text-gray-300" /> 
                <span className="text-gray-700 cursor-pointer" onClick={handleBackToList}>Contas fixas</span>
                {viewState === 'detail' && (
                  <><ChevronRight size={12} className="text-gray-300" /> <span className="text-emerald-600">Visualizar</span></>
                )}
              </div>
            </div>
          </div>

          {/* GLOBAL ACTIONS (Only on List) */}
          {viewState === 'list' && (
            <div className="flex gap-3">
              <button className="bg-[#10b981] hover:bg-emerald-600 border border-emerald-500 text-white font-bold px-5 py-2 rounded shadow-sm transition-colors text-sm flex items-center gap-2">
                <Plus size={16} /> Adicionar
              </button>
              <button 
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="bg-[#111827] hover:bg-gray-800 text-white font-bold px-5 py-2 rounded shadow-sm transition-colors text-sm flex items-center gap-2"
              >
                <SearchIcon size={16} /> Busca avançada
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#f4f5f7]">
        <div className="max-w-[1500px] mx-auto pb-20">
          <AnimatePresence mode="wait">
            
            {/* ============================================================== */}
            {/* VIEW MODE: LIST                                                */}
            {/* ============================================================== */}
            {viewState === 'list' && (
              <motion.div 
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                
                {/* ADVANCED SEARCH EXPANDABLE */}
                <AnimatePresence>
                  {showAdvancedSearch && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-6 mb-2">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Loja</label>
                            <select className="input h-[38px] text-sm"><option>CASA LINDA</option></select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Código</label>
                            <input className="input h-[38px] text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plano de contas</label>
                            <select className="input h-[38px] text-sm"><option>Todos</option></select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descrição</label>
                            <input className="input h-[38px] text-sm" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 items-end">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Entidade</label>
                            <select className="input h-[38px] text-sm"><option>Fornecedor</option></select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fornecedor</label>
                            <input className="input h-[38px] text-sm" placeholder="Digite para buscar" />
                          </div>
                          <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valor (Min)</label>
                              <input className="input h-[38px] text-sm" />
                            </div>
                            <span className="text-gray-400 font-medium text-sm translate-y-3">a</span>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valor (Máx)</label>
                              <input className="input h-[38px] text-sm" />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Situação</label>
                            <select className="input h-[38px] text-sm"><option>Todas</option></select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Conta bancária</label>
                            <select className="input h-[38px] text-sm"><option>Todos</option></select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Centro de custo</label>
                            <select className="input h-[38px] text-sm"><option>Todos</option></select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Forma de pagamento</label>
                            <select className="input h-[38px] text-sm"><option>Todos</option></select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">NF-e</label>
                            <input className="input h-[38px] text-sm" />
                          </div>
                        </div>

                        <div className="border-t border-gray-100 pt-5 flex gap-3">
                          <button className="bg-[#10b981] hover:bg-emerald-600 text-white font-bold px-6 py-2 rounded text-sm shadow-sm transition-colors flex items-center gap-2">
                             <SearchIcon size={16}/> Buscar
                          </button>
                          <button className="bg-[#f05a4f] hover:bg-red-600 text-white font-bold px-6 py-2 rounded text-sm shadow-sm transition-colors flex items-center gap-2">
                             <X size={16}/> Limpar
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* INFO BANNER */}
                <div className="bg-[#e0f2f7] border border-[#b8e2ef] p-4 text-[#31708f] text-sm rounded-sm font-medium">
                  As contas fixas são geradas automaticamente pelo sistema e passam a ser visualizadas no contas a pagar de acordo com a configuração feita pelo usuário.
                </div>

                {/* TABLE CONTAINER */}
                <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden flex flex-col">
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f8f9fa] border-b border-gray-200 text-gray-600 uppercase text-[11px] font-bold tracking-wider">
                          <th className="p-4 py-3 min-w-[200px]">Descrição</th>
                          <th className="p-4 py-3 min-w-[180px]">Entidade</th>
                          <th className="p-4 py-3 min-w-[160px]">Plano de contas</th>
                          <th className="p-4 py-3">Pagamento</th>
                          <th className="p-4 py-3 min-w-[180px]">Gerar pagamento</th>
                          <th className="p-4 py-3">Próximo vencimento</th>
                          <th className="p-4 py-3 text-right">Valor</th>
                          <th className="p-4 py-3 text-center">Situação</th>
                          <th className="p-4 py-3">Loja</th>
                          <th className="p-4 py-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {mockData.map(item => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
                            <td className="p-4 font-medium text-gray-800">{item.descricao}</td>
                            <td className="p-4 text-emerald-600 font-medium underline uppercase tracking-tight text-[13px]">{item.entidade}</td>
                            <td className="p-4 text-gray-600">{item.planoContas}</td>
                            <td className="p-4 text-gray-600">{item.formaPagamento}</td>
                            <td className="p-4 text-gray-500 text-[13px]">{item.gerarPagamento}</td>
                            <td className="p-4 text-gray-600 font-medium">{item.vencimento}</td>
                            <td className="p-4 text-right font-medium text-gray-800">{item.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                            <td className="p-4 text-center">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600"><CheckCircle size={14} /></div>
                            </td>
                            <td className="p-4 text-gray-500 uppercase text-[12px] font-semibold">{item.loja}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5 justify-center">
                                <button onClick={() => handleView(item)} className="w-[26px] h-[26px] bg-[#00b5e2] text-white rounded-[3px] flex items-center justify-center hover:bg-[#009bc2] transition-colors shadow-sm" title="Visualizar">
                                  <SearchIcon size={14} />
                                </button>
                                <button className="w-[26px] h-[26px] bg-[#f59e0b] text-white rounded-[3px] flex items-center justify-center hover:bg-[#d97706] transition-colors shadow-sm" title="Editar">
                                  <Edit2 size={14} />
                                </button>
                                <button className="w-[26px] h-[26px] bg-[#ef4444] text-white rounded-[3px] flex items-center justify-center hover:bg-[#dc2626] transition-colors shadow-sm" title="Excluir">
                                  <X size={14} />
                                </button>
                                <div className="relative">
                                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id) }} className="w-[26px] h-[26px] bg-[#10b981] text-white rounded-[3px] flex items-center justify-center hover:bg-[#059669] transition-colors shadow-sm" title="Mais opções">
                                    <ChevronDown size={14} />
                                  </button>
                                  {activeMenuId === item.id && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-sm shadow-xl w-32 py-1 z-40 text-left">
                                      <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-600 font-medium">Pausar</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>

              </motion.div>
            )}

            {/* ============================================================== */}
            {/* VIEW MODE: DETAIL                                              */}
            {/* ============================================================== */}
            {viewState === 'detail' && activeItem && (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                
                {/* Visualizer Header */}
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-800">
                        <ArrowRightLeft className="text-gray-400 rotate-90" />
                        Conta Fixa #{activeItem.codigo}
                      </h2>
                      <span className="bg-[#6E1C44] text-white text-[10px] font-bold px-2 py-0.5 rounded-[3px] uppercase tracking-wider mt-1">
                        {activeItem.situacao}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">Criado em {activeItem.criadoEm.split(' ')[0]} por <span className="uppercase text-gray-500 font-semibold">{activeItem.criadoPor}</span></p>
                  </div>
                  <button className="bg-[#f59e0b] hover:bg-[#df8a04] border border-[#d97706] text-white font-bold px-5 py-2.5 rounded shadow-sm transition-colors text-sm flex items-center gap-2">
                    <Edit3 size={16} /> Editar conta fixa
                  </button>
                </div>

                {/* VISUALIZER GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column (Dados Gerais + Funcionário) */}
                  <div className="lg:col-span-4 flex flex-col gap-6">
                    
                    {/* Block: Dados Gerais */}
                    <div className="bg-white border border-gray-200 rounded shadow-sm">
                      <div className="bg-[#fcfdfd] border-b border-gray-200 px-4 py-3 flex items-center gap-2 text-gray-700 font-bold">
                        <Edit2 size={16} className="text-gray-400" /> Dados gerais
                      </div>
                      <div className="p-5 flex flex-col gap-4">
                        <div className="text-[13px] text-gray-800 space-y-3.5">
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Código:</span> {activeItem.codigo}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Nº boleto:</span> -</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Descrição:</span> {activeItem.descricao}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Valor bruto:</span> {activeItem.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Desconto:</span> {activeItem.desconto.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Juros:</span> {activeItem.juros.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Data do próximo vencimento:</span> {activeItem.vencimento}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Data de competência:</span> {activeItem.dataCompetencia}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Gerar pagamento:</span> {activeItem.gerarPagamento.replace('Uma semana','7 days').replace('1 mês','30 days')}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Repetir esta despesa:</span> {activeItem.repetirPor}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Quantidade de vezes:</span> {activeItem.qtdVezes}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Loja:</span> {activeItem.loja}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Cadastrado por:</span> <span className="underline cursor-pointer">{activeItem.criadoPor}</span></p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Cadastrado em:</span> {activeItem.criadoEm}</p>
                          <p><span className="font-semibold text-gray-500 w-44 inline-block">Modificado em:</span> {activeItem.modificadoEm}</p>
                        </div>
                        <button className="mt-4 w-full bg-[#111827] hover:bg-gray-800 text-white text-sm font-bold py-2.5 rounded transition-colors">
                          Editar detalhes
                        </button>
                      </div>
                    </div>

                    {/* Block: Funcionário */}
                    <div className="bg-white border border-gray-200 rounded shadow-sm">
                      <div className="bg-[#fcfdfd] border-b border-gray-200 px-4 py-3 flex items-center gap-2 text-gray-700 font-bold">
                        <User size={16} className="text-gray-400" /> Funcionário
                      </div>
                      <div className="p-4 text-[13px] text-gray-800">
                         <span className="font-semibold text-gray-500">Nome: </span> 
                         <span className="underline cursor-pointer uppercase">{activeItem.entidade}</span>
                      </div>
                    </div>

                  </div>

                  {/* Right Column (Histórico + Interações) */}
                  <div className="lg:col-span-8 flex flex-col gap-6">
                    
                    {/* Block: Histórico */}
                    <div className="bg-white border border-gray-200 rounded shadow-sm pb-10">
                      <div className="bg-[#fcfdfd] border-b border-gray-200 px-4 py-3 flex items-center gap-2 text-gray-700 font-bold mb-4">
                        <ListIcon size={16} className="text-gray-400" /> Histórico
                      </div>
                      <div className="px-6 py-4">
                        
                        <div className="flex gap-4 relative">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#6E1C44] flex items-center justify-center text-white z-10 shadow-sm">
                            <ArrowRightLeft size={16} />
                          </div>
                          <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200 -mb-10"></div>
                          
                          <div className="flex-1 bg-[#fcfdfd] border border-gray-200 p-4 rounded-sm flex flex-col items-start shadow-sm">
                            <div className="flex justify-between w-full items-start mb-2">
                              <span className="font-bold text-gray-800 uppercase text-xs tracking-wider">{activeItem.criadoPor}</span>
                              <span className="text-gray-400 text-xs font-medium">{activeItem.criadoEm.replace(' ',' - ')}</span>
                            </div>
                            <span className="bg-[#6E1C44] text-white text-[10px] font-bold px-2 py-0.5 rounded-[3px] uppercase tracking-wider ml-auto mt-2 block">
                              Em aberto
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Block: Interações */}
                    <div className="bg-white border border-gray-200 rounded shadow-sm">
                      <div className="bg-[#fcfdfd] border-b border-gray-200 px-4 py-3 flex items-center gap-2 text-gray-700 font-bold mb-4">
                        <FileText size={16} className="text-gray-400" /> Interações
                      </div>
                      <div className="p-6">
                         <div className="flex items-center gap-3 border border-gray-200 rounded-sm p-3 bg-gray-50 focus-within:bg-white focus-within:border-emerald-500 transition-colors">
                           <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"></div>
                           <input type="text" placeholder="Escreva um comentário..." className="w-full bg-transparent focus:outline-none text-sm text-gray-700 h-10" />
                           <button className="text-gray-400 hover:text-emerald-600 transition-colors"><Send size={18}/></button>
                         </div>
                      </div>
                    </div>

                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

    </div>
  )
}
