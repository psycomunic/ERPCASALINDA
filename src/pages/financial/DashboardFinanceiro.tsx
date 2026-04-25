import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, DollarSign, Filter, Download, ChevronDown, 
  PieChart as PieChartIcon, Activity, Truck, ShieldAlert, ArrowUpRight, ArrowDownRight,
  Layers, CheckCircle2, Clock, Wallet
} from 'lucide-react'
import { getEntries } from '../../services/dbLocal'
import { mockContasFixas } from '../../services/mockContasFixas'
import { fetchOrdersForFreightAnalysis, FreightOrderData } from '../../magazord'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie } from 'recharts'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function DashboardFinanceiro() {
  const currentMonth = new Date().getMonth()
  const filterOptions = [
    'HOJE',
    'PRÓXIMOS 7 DIAS',
    'PRÓXIMOS 15 DIAS',
    `ESTE MÊS (${MESES[currentMonth].toUpperCase()})`,
    `PRÓXIMO MÊS (${MESES[currentMonth === 11 ? 0 : currentMonth + 1].toUpperCase()})`,
    `MÊS PASSADO (${MESES[currentMonth === 0 ? 11 : currentMonth - 1].toUpperCase()})`,
    'ESTE ANO',
    'TUDO'
  ]

  const [filter, setFilter] = useState(filterOptions[3]) // Default: ESTE MÊS
  const [showPeriodo, setShowPeriodo] = useState(false)
  
  const entriesVar = useMemo(() => getEntries(), [])
  const [pedidos, setPedidos] = useState<FreightOrderData[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(true)

  useEffect(() => {
    fetchOrdersForFreightAnalysis(90)
      .then(data => { setPedidos(data); setLoadingPedidos(false) })
      .catch(() => setLoadingPedidos(false))
  }, [])

  // ============================================
  // 1. DATA PREPARATION (Custos Fixos vs Variáveis)
  // ============================================
  
  // Total of fixed costs roughly represents a "Monthly" snapshot since they repeat.
  const totalCustosFixos = useMemo(() => {
    return mockContasFixas.reduce((acc, curr) => acc + curr.valor, 0)
  }, [])

  // Filtragem Dinâmica das despesas e receitas variáveis (do LocalStorage)
  const filteredVarEntries = useMemo(() => {
    return entriesVar.filter(e => {
      const d = new Date(e.dataVencimento + 'T12:00:00')
      const today = new Date()
      today.setHours(12, 0, 0, 0)
      
      const diffTime = d.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (filter === 'HOJE') return diffDays === 0
      if (filter === 'PRÓXIMOS 7 DIAS') return diffDays >= 0 && diffDays <= 7
      if (filter === 'PRÓXIMOS 15 DIAS') return diffDays >= 0 && diffDays <= 15
      if (filter.includes('ESTE MÊS')) return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
      
      if (filter.includes('PRÓXIMO MÊS')) {
         const nextM = today.getMonth() === 11 ? 0 : today.getMonth() + 1
         const nextY = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear()
         return d.getMonth() === nextM && d.getFullYear() === nextY
      }
      if (filter.includes('MÊS PASSADO')) {
         const pastM = today.getMonth() === 0 ? 11 : today.getMonth() - 1
         const pastY = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
         return d.getMonth() === pastM && d.getFullYear() === pastY
      }
      if (filter === 'ESTE ANO') return d.getFullYear() === today.getFullYear()
      return true
    })
  }, [entriesVar, filter])

  const totalVariáveis = filteredVarEntries.filter(e => e.tipo === 'pagamento').reduce((acc, curr) => acc + curr.valor, 0)
  const totalReceitas = filteredVarEntries.filter(e => e.tipo === 'recebimento').reduce((acc, curr) => acc + curr.valor, 0)
  
  // Assumindo que Custos Fixos são devidos no mês corrente:
  const isMesCorrente = filter.includes('ESTE MÊS') || filter === 'ESTE ANO' || filter === 'TUDO'
  const despesasTotaisMensais = (isMesCorrente ? totalCustosFixos : 0) + totalVariáveis
  const balancoProjetado = totalReceitas - despesasTotaisMensais

  // ============================================
  // 2. CHART DATA: Despesas por Categoria (Pie)
  // ============================================
  const despesasPorCategoria = useMemo(() => {
    const cats: Record<string, number> = {}
    
    // Add Fixed Costs
    if (isMesCorrente) {
      mockContasFixas.forEach(e => {
        cats[e.planoContas] = (cats[e.planoContas] || 0) + e.valor
      })
    }
    // Add Variable Costs
    filteredVarEntries.filter(e => e.tipo === 'pagamento').forEach(e => {
      cats[e.categoria] = (cats[e.categoria] || 0) + e.valor
    })

    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8)
  }, [filteredVarEntries, isMesCorrente])

  // ============================================
  // 3. CHART DATA: Evolução Diária (Bar)
  // ============================================
  const chartDaily = useMemo(() => {
    const grouped: Record<string, {e: number, s: number, fixo: number}> = {}
    
    // Distribuir Receitas e Despesas Variáveis
    filteredVarEntries.forEach(e => {
       const day = e.dataVencimento.split('-').reverse().slice(0, 2).join('/')
       if (!grouped[day]) grouped[day] = { e: 0, s: 0, fixo: 0 }
       if (e.tipo === 'recebimento') grouped[day].e += e.valor
       else grouped[day].s += e.valor
    })

    // Distribuir Custos Fixos nas datas (simplificado para o mês corrente)
    if (isMesCorrente) {
      mockContasFixas.forEach(e => {
         const dayMatch = e.vencimento.split('/')[0] + '/' + e.vencimento.split('/')[1]
         if (!grouped[dayMatch]) grouped[dayMatch] = { e: 0, s: 0, fixo: 0 }
         grouped[dayMatch].fixo += e.valor
      })
    }

    return Object.keys(grouped).sort((a,b) => {
        const [d1, m1] = a.split('/').map(Number)
        const [d2, m2] = b.split('/').map(Number)
        if (m1 === m2) return d1 - d2
        return m1 - m2
    }).map(day => ({
       dia: day, 
       entradas: grouped[day].e, 
       saidasVariaveis: grouped[day].s,
       saidasFixas: grouped[day].fixo
    }))
  }, [filteredVarEntries, isMesCorrente])

  // ============================================
  // 4. TOP 5 DESPESAS (Raking List)
  // ============================================
  const topDespesas = useMemo(() => {
    type Dsp = { descricao: string, valor: number, tipo: 'Fixo' | 'Variável', situacao: string }
    const lista: Dsp[] = []
    
    if (isMesCorrente) {
      mockContasFixas.forEach(e => lista.push({ descricao: e.descricao, valor: e.valor, tipo: 'Fixo', situacao: e.situacao }))
    }
    filteredVarEntries.filter(e => e.tipo === 'pagamento').forEach(e => lista.push({ descricao: e.descricao, valor: e.valor, tipo: 'Variável', situacao: e.status === 'pago' ? 'Pago' : 'Em aberto' }))

    return lista.sort((a,b) => b.valor - a.valor).slice(0, 5)
  }, [filteredVarEntries, isMesCorrente])

  // ============================================
  // 5. FREIGHT DATA 
  // ============================================
  const freightStats = useMemo(() => {
    const map = new Map<string, { frete: number; valor: number; count: number }>()
    const today = new Date()

    pedidos.forEach(p => {
       const d = new Date(p.data || new Date())
       let keep = false

       if (filter === 'ESTE ANO') keep = d.getFullYear() === today.getFullYear()
       else if (filter.includes('MÊS PASSADO')) {
           const pastM = today.getMonth() === 0 ? 11 : today.getMonth() - 1
           const pastY = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
           keep = d.getMonth() === pastM && d.getFullYear() === pastY
       } else if (filter === 'TUDO') { keep = true }
       else {
           keep = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
       }

       if (!keep) return

       const trans = p.transportadora?.trim() || 'Sem transportadora'
       const frete = p.frete || 0
       const valor = p.valor || 0

       if (!map.has(trans)) map.set(trans, { frete: 0, valor: 0, count: 0 })
       const cur = map.get(trans)!
       cur.count++
       cur.valor += valor
       cur.frete += frete
    })

    let totalFrete = 0, totalValor = 0
    const statList: any[] = []

    map.forEach((v, nome) => {
       totalFrete += v.frete
       totalValor += v.valor
       const pctMedia = v.valor > 0 ? (v.frete / v.valor) * 100 : 0
       statList.push({ nome, ...v, pctMedia })
    })

    statList.sort((a,b) => b.frete - a.frete)
    return { stats: statList, totalFrete, totalValor }
  }, [pedidos, filter])

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const CARRIER_COLORS = ['#3b82f6', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#9333ea', '#65a30d']
  const COLORS = ['#be123c', '#e11d48', '#f43f5e', '#fb7185', '#0ea5e9', '#38bdf8', '#818cf8', '#6366f1']

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#f8fafb]" onClick={() => setShowPeriodo(false)}>
      
      {/* Filters & Header - Premium Styling */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            Raio-X Financeiro
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">DRE Sintético Mensal e Diagnóstico de Custos</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setShowPeriodo(v => !v) }} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold px-4 py-2.5 rounded-lg shadow-sm text-sm transition-all focus:ring-4 focus:ring-gray-100">
              <Clock size={16} className="text-emerald-600" /> {filter} <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {showPeriodo && (
                <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 w-56 overflow-hidden">
                  <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100">
                    Selecione o período
                  </div>
                  {filterOptions.map(p => (
                    <button key={p} onClick={() => setFilter(p)}
                      className={`w-full text-left px-5 py-3 text-sm hover:bg-blue-50/50 transition-colors ${filter === p ? 'font-bold text-blue-700 bg-blue-50/50 border-l-2 border-l-blue-600' : 'text-gray-600 font-medium'}`}>
                      {p}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ========================================================
          KPIs GLANCE (Premium Glassmorphic Inspired) 
          ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        
        {/* Card 1: Custos Fixos */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100 transition-colors"></div>
          <div className="relative z-10 flex justify-between items-start">
             <div>
               <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 group-hover:text-red-500 transition-colors">Contas Fixas Base</p>
               <p className="text-3xl font-black text-gray-900 mt-2">{fmt(isMesCorrente ? totalCustosFixos : 0)}</p>
               <p className="text-xs font-semibold text-gray-400 mt-2 flex items-center gap-1">
                 <Layers size={14} /> Total de {mockContasFixas.length} contratos
               </p>
             </div>
             <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
               <ShieldAlert size={18} />
             </div>
          </div>
        </div>

        {/* Card 2: Despesas Variáveis */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-50 rounded-full blur-2xl group-hover:bg-orange-100 transition-colors"></div>
          <div className="relative z-10 flex justify-between items-start">
             <div>
               <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 group-hover:text-orange-500 transition-colors">Despesas Variáveis</p>
               <p className="text-3xl font-black text-gray-900 mt-2">{fmt(totalVariáveis)}</p>
               <p className="text-xs font-semibold text-gray-400 mt-2 flex items-center gap-1">
                 <ArrowDownRight size={14} className="text-orange-500" /> Custos de giro
               </p>
             </div>
             <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
               <TrendingDown size={18} />
             </div>
          </div>
        </div>

        {/* Card 3: Receitas Globais */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
          <div className="relative z-10 flex justify-between items-start">
             <div>
               <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">Total Entradas</p>
               <p className="text-3xl font-black text-gray-900 mt-2">{fmt(totalReceitas)}</p>
               <p className="text-xs font-semibold text-gray-400 mt-2 flex items-center gap-1">
                 <ArrowUpRight size={14} className="text-blue-500" /> Vendas & Extratos
               </p>
             </div>
             <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
               <TrendingUp size={18} />
             </div>
          </div>
        </div>

        {/* Card 4: Fluxo Operacional */}
        <div className={`rounded-2xl p-6 border shadow-sm relative overflow-hidden group ${balancoProjetado >= 0 ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-800' : 'bg-gradient-to-br from-red-600 to-red-700 border-red-800'}`}>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex justify-between items-start">
             <div>
               <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest mb-1">Caixa Operacional Líquido</p>
               <p className="text-3xl font-black text-white mt-2">{fmt(balancoProjetado)}</p>
               
               <div className="w-full bg-black/20 rounded-full h-1.5 mt-4 overflow-hidden flex">
                  <div className="bg-white h-full" style={{ width: Math.max(0, (totalReceitas / ((totalReceitas + despesasTotaisMensais) || 1)) * 100) + '%' }}></div>
                  <div className="bg-black/40 h-full" style={{ width: Math.max(0, (despesasTotaisMensais / ((totalReceitas + despesasTotaisMensais) || 1)) * 100) + '%' }}></div>
               </div>
               <div className="flex justify-between mt-1 text-[10px] text-white/60 font-medium">
                  <span>Receitas</span>
                  <span>Despesas</span>
               </div>
             </div>
             <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0 backdrop-blur-sm">
               <Wallet size={18} />
             </div>
          </div>
        </div>

      </div>


      {/* ========================================================
          CHARTS AND VISUALIZATIONS
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        
        {/* Main Chart (Left 2 cols) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2 flex flex-col min-h-[380px]">
           <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <Activity size={18} className="text-emerald-500" />
                 Evolução Financeira Diária
               </h3>
           </div>
           
           <div className="flex-1 w-full">
             {chartDaily.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400 font-medium">Nenhum dado lançado neste período.</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDaily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 600 }} 
                      formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '15px' }} />
                    <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" />
                    <Bar dataKey="saidasFixas" stackId="despesas" fill="#be123c" name="Custos Fixos" />
                    <Bar dataKey="saidasVariaveis" stackId="despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Despesas Variáveis" />
                  </BarChart>
                </ResponsiveContainer>
             )}
           </div>
        </div>

        {/* Categories Chart (Right 1 col) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col min-h-[380px]">
           <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
             <PieChartIcon size={18} className="text-rose-500" />
             Matriz de Custos Totais
           </h3>
           <div className="flex-1 w-full flex items-center justify-center relative">
              {despesasPorCategoria.length === 0 ? (
                 <div className="text-sm text-gray-400 font-medium">Sem despesas registradas.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={despesasPorCategoria} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                      {despesasPorCategoria.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', fontWeight: 600, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
                 <span className="text-[10px] font-bold text-gray-400 uppercase">Total Geral</span>
                 <span className="font-black text-gray-800 text-lg">{fmt(despesasTotaisMensais).replace('R$','')}</span>
              </div>
           </div>
           
           {/* Custom Legend */}
           <div className="mt-4 space-y-2 overflow-y-auto pr-2 max-h-36 scrollbar-thin">
              {despesasPorCategoria.map((cat, i) => (
                 <div key={cat.name} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                       <span className="font-semibold text-gray-600 truncate max-w-[120px]" title={cat.name}>{cat.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{fmt(cat.value)}</span>
                 </div>
              ))}
           </div>
        </div>

      </div>


      {/* ========================================================
          BOTTOM DATA BOARDS (Ranking Despesas + Inteligência Fretes)
          ======================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        
        {/* Raio-X das Maiores Despesas (Left 1 col) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 xl:col-span-1 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-500" />
              Top 5 Maiores Ofensores
            </h3>
          </div>
          
          <div className="flex-1">
            {topDespesas.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400 font-medium">Nenhum custo encontrado.</div>
            ) : (
              <div className="space-y-4">
                {topDespesas.map((d, i) => (
                  <div key={i} className="flex flex-col gap-2 relative">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 text-gray-500 font-bold text-xs flex items-center justify-center shrink-0">
                          {i+1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800 line-clamp-1 break-all pr-2" title={d.descricao}>{d.descricao}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${d.tipo === 'Fixo' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                              {d.tipo}
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold">{d.situacao}</span>
                          </div>
                        </div>
                      </div>
                      <span className="font-black text-gray-900 shrink-0">{fmt(d.valor)}</span>
                    </div>
                    {i !== topDespesas.length - 1 && <div className="h-px bg-gray-100 w-full ml-9"></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button className="mt-6 w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors border border-gray-200">
            Ver todas as contas
          </button>
        </div>


        {/* Inteligência de Fretes (Right 2 cols) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 xl:col-span-2">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                <Truck size={24} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-lg">Inteligência de Fretes</h2>
                <p className="text-[13px] font-medium text-gray-400">Desempenho financeiro das transportadoras no período.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 w-full md:w-auto mt-2 md:mt-0">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Pago</p>
                <p className="text-xl font-black text-indigo-700">{fmt(freightStats.totalFrete)}</p>
              </div>
              <div className="text-right pl-6 border-l border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Margem Comprometida</p>
                <p className={`text-xl font-black ${
                   (freightStats.totalFrete / (freightStats.totalValor || 1)) * 100 > 15 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {freightStats.totalValor > 0 ? ((freightStats.totalFrete / freightStats.totalValor) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>

          {loadingPedidos ? (
            <div className="flex items-center justify-center py-10 text-gray-400 font-medium text-sm">Buscando inteligência de fretes...</div>
          ) : freightStats.stats.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-gray-400 font-medium text-sm">Nenhum custo de frete computado para o período selecionado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Chart View */}
               <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Volume Financeiro Bruto (R$)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={freightStats.stats.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="nome" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Gasto (R$)']} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', fontWeight: 600, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="frete" radius={[0, 6, 6, 0]}>
                        {freightStats.stats.slice(0, 5).map((_, i) => <Cell key={i} fill={CARRIER_COLORS[i % CARRIER_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>

               {/* Ranking List */}
               <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Termômetro de Risco (%)</p>
                  <div className="space-y-4">
                     {freightStats.stats.slice(0, 5).map((s, i) => {
                        const risco = s.pctMedia
                        const color = CARRIER_COLORS[i % CARRIER_COLORS.length]
                        const badgeClass = risco >= 20 ? 'bg-red-50 text-red-600 border border-red-100' : risco >= 10 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        
                        return (
                           <div key={s.nome} className="group">
                              <div className="flex items-center justify-between mb-2">
                                 <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded shadow-sm" style={{ backgroundColor: color }} />
                                    <span className="text-xs font-bold text-gray-700">{s.nome}</span>
                                    <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">({s.count} viag.)</span>
                                 </div>
                                 <span className={`text-[11px] font-black px-2 py-0.5 rounded text-center shadow-sm ${badgeClass}`}>
                                     {risco.toFixed(1)}% tx
                                 </span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                 <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, risco)}%`, backgroundColor: color }} />
                              </div>
                           </div>
                        )
                     })}
                  </div>
               </div>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
