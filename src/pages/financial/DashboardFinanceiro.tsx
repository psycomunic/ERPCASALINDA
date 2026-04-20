import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, DollarSign, Filter, Download, Printer, ChevronDown, 
  PieChart as PieChartIcon, Activity, Truck 
} from 'lucide-react'
import { getEntries, FinEntry } from '../../services/dbLocal'
import { fetchPedidos } from '../../services/pedidos'
import { fetchPendingOrders, magazordToOrder } from '../../magazord'
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

  const [filter, setFilter] = useState(filterOptions[3]) // Default to ESTE MÊS
  const [showPeriodo, setShowPeriodo] = useState(false)
  
  const entries = useMemo(() => getEntries(), [])
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchPedidos().catch(() => []), 
      fetchPendingOrders().catch(() => [])
    ]).then(([pedidosSupa, pedidosMag]) => {
      const combined = [...pedidosSupa]
      pedidosMag.forEach(mag => {
         const mapped = magazordToOrder(mag)
         const existing = combined.find(x => String(x.id) === String(mapped.id))
         if (existing) {
             existing.transportadora = existing.transportadora && existing.transportadora !== 'Sem transportadora' 
                ? existing.transportadora 
                : mapped.transportadora
             existing.frete = existing.frete || mapped.frete
         } else {
             combined.push(mapped)
         }
      })
      setPedidos(combined)
      setLoadingPedidos(false)
    }).catch(() => setLoadingPedidos(false))
  }, [])

  // Filtragem Dinâmica por Período
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
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
  }, [entries, filter])

  const entradas = filteredEntries.filter(e => e.tipo === 'recebimento').reduce((a,b) => a + b.valor, 0)
  const saidas = filteredEntries.filter(e => e.tipo === 'pagamento').reduce((a,b) => a + b.valor, 0)
  const saldo = entradas - saidas

  const pdRecebido = filteredEntries.filter(e => e.tipo === 'recebimento' && e.status === 'pago').reduce((a,b) => a+b.valor,0)
  const pdAbertoRec = entradas - pdRecebido
  
  const pdPago = filteredEntries.filter(e => e.tipo === 'pagamento' && e.status === 'pago').reduce((a,b) => a+b.valor,0)
  const pdAbertoPag = saidas - pdPago

  // Grafico de Categorias (Saídas)
  const despesasPorCategoria = useMemo(() => {
    const cats: Record<string, number> = {}
    filteredEntries.filter(e => e.tipo === 'pagamento').forEach(e => {
      cats[e.categoria] = (cats[e.categoria] || 0) + e.valor
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
  }, [filteredEntries])

  // Gráfico Diário
  const chartDaily = useMemo(() => {
    const grouped: Record<string, {e: number, s: number}> = {}
    filteredEntries.forEach(e => {
       const day = e.dataVencimento.split('-').reverse().slice(0, 2).join('/')
       if (!grouped[day]) grouped[day] = { e: 0, s: 0 }
       if (e.tipo === 'recebimento') grouped[day].e += e.valor
       else grouped[day].s += e.valor
    })
    return Object.keys(grouped).sort().map(day => ({
       dia: day, entradas: grouped[day].e, saidas: grouped[day].s
    }))
  }, [filteredEntries])

  // --- ANÁLISE DE FRETE MENSAL ---
  const freightStats = useMemo(() => {
    const map = new Map<string, { frete: number; valor: number; count: number; comFrete: number }>()

    pedidos.forEach(p => {
       // Filter by same period
       const d = new Date(p.created_at || new Date())
       const today = new Date()
       
       let keep = false
       if (filter === 'ESTE ANO') keep = d.getFullYear() === today.getFullYear()
       else if (filter.includes('MÊS PASSADO')) {
           const pastM = today.getMonth() === 0 ? 11 : today.getMonth() - 1
           const pastY = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
           keep = d.getMonth() === pastM && d.getFullYear() === pastY
       } else if (filter.includes('TUDO')) { keep = true }
       else {
           // Fallback default: Este mês
           keep = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
       }

       if (!keep) return

       let trans = typeof p.transportadora === 'string' ? p.transportadora : 'Sem transportadora'
       if (trans.trim() === '') trans = 'Sem transportadora'

       const frete = parseFloat(p.frete) || 0
       const valor = parseFloat(p.valor) || 0

       if (!map.has(trans)) map.set(trans, { frete: 0, valor: 0, count: 0, comFrete: 0 })
       const cur = map.get(trans)!
       cur.count++
       cur.valor += valor
       if (frete > 0) { cur.frete += frete; cur.comFrete++ }
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

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const CARRIER_COLORS = ['#3b82f6', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#9333ea', '#65a30d']
  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#0ea5e9', '#6366f1', '#6b7280']

  return (
    <div className="p-6 space-y-5" onClick={() => setShowPeriodo(false)}>
      
      {/* Filters & Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Visão Financeira</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-medium tracking-wider">Desempenho e Indicadores</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setShowPeriodo(v => !v) }} className="btn-secondary text-xs py-1.5">
              <Filter size={12} /> {filter} <ChevronDown size={11} />
            </button>
            <AnimatePresence>
              {showPeriodo && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-48 overflow-hidden">
                  {filterOptions.map(p => (
                    <button key={p} onClick={() => setFilter(p)}
                      className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${filter === p ? 'font-bold text-navy-900 bg-blue-50' : 'text-gray-700'}`}>
                      {p}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="btn-secondary text-xs py-1.5"><Download size={12} /> Exportar</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="card p-5 border-l-4 border-l-navy-600">
          <div className="flex justify-between items-start">
             <div>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Previsão em Entradas</p>
               <p className="text-2xl font-black text-blue-600">{fmt(entradas)}</p>
             </div>
             <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
               <TrendingUp size={16} />
             </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs font-semibold">
             <span className="text-emerald-600">Recebido: {fmt(pdRecebido)}</span>
             <span className="text-blue-600">Aberto: {fmt(pdAbertoRec)}</span>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-red-500">
          <div className="flex justify-between items-start">
             <div>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Previsão em Saídas</p>
               <p className="text-2xl font-black text-red-600">{fmt(saidas)}</p>
             </div>
             <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
               <TrendingDown size={16} />
             </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs font-semibold">
             <span className="text-gray-500">Pago: {fmt(pdPago)}</span>
             <span className="text-red-500">Aberto: {fmt(pdAbertoPag)}</span>
          </div>
        </div>

        <div className={`card p-5 border-l-4 ${saldo >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <div className="flex justify-between items-start">
             <div>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Resultado (Lucro Bruto)</p>
               <p className={`text-2xl font-black ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(saldo)}</p>
             </div>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${saldo >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
               <DollarSign size={16} />
             </div>
          </div>
          <div className="mt-4 pt-3.5 flex items-center gap-2">
             <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden flex">
                <div style={{ width: Math.max(0, 100 * entradas / (entradas + saidas || 1)) + '%' }} className="bg-emerald-500 h-full border-r border-white"></div>
                <div style={{ width: Math.max(0, 100 * saidas / (entradas + saidas || 1)) + '%' }} className="bg-red-500 h-full"></div>
             </div>
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart (Left 2 cols) */}
        <div className="card p-5 lg:col-span-2 flex flex-col min-h-[350px]">
           <h3 className="font-bold text-gray-800 text-sm mb-6 flex items-center gap-2"><Activity size={16} className="text-navy-600" /> Comparativo Diário (Entradas vs Saídas)</h3>
           <div className="flex-1 w-full">
             {chartDaily.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">Nenhum dado lançado neste período.</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDaily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `R$${v/1000}k`} />
                    <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas" />
                    <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas" />
                  </BarChart>
                </ResponsiveContainer>
             )}
           </div>
        </div>

        {/* Categories Chart (Right 1 col) */}
        <div className="card p-5 flex flex-col min-h-[350px]">
           <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2"><PieChartIcon size={16} className="text-navy-600" /> Maiores Despesas</h3>
           <div className="flex-1 w-full flex items-center justify-center relative">
              {despesasPorCategoria.length === 0 ? (
                 <div className="text-xs text-gray-400">Sem despesas registradas.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={despesasPorCategoria} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {despesasPorCategoria.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
           </div>
           
           {/* Custom Legend */}
           <div className="mt-4 space-y-2 overflow-y-auto max-h-32">
              {despesasPorCategoria.map((cat, i) => (
                 <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                       <span className="font-semibold text-gray-600 truncate max-w-[120px]">{cat.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{fmt(cat.value)}</span>
                 </div>
              ))}
           </div>
        </div>

      </div>

      {/* FREQUÊNCIA DE TRANSPORTADORAS & CUSTO DE FRETE */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Truck size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Inteligência de Fretes no Período</h2>
              <p className="text-xs text-gray-400">Proporção do custo de frete sobre os pedidos faturados. Avalie as transportadoras mais caras.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Gasto c/ Fretes</p>
              <p className="text-lg font-black text-navy-600">{fmt(freightStats.totalFrete)}</p>
            </div>
            <div className="text-right bg-gray-50 px-4 py-1.5 rounded-xl border border-gray-100 hidden md:block">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Margem Comprometida</p>
              <p className={`text-lg font-black ${
                 (freightStats.totalFrete / (freightStats.totalValor || 1)) * 100 > 15 ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {freightStats.totalValor > 0 ? ((freightStats.totalFrete / freightStats.totalValor) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>

        {loadingPedidos ? (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Buscando inteligência de fretes...</div>
        ) : freightStats.stats.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Nenhum custo de frete computado para o período selecionado.</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
             {/* Chart View */}
             <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Proporção Custo Bruto (R$)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={freightStats.stats.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nome" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Gasto (R$)']} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none' }} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="frete" radius={[0, 6, 6, 0]}>
                      {freightStats.stats.slice(0, 6).map((_, i) => <Cell key={i} fill={CARRIER_COLORS[i % CARRIER_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>

             {/* Ranking List */}
             <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Ranking: Taxa de Frete (Risco)</p>
                <div className="space-y-3">
                   {freightStats.stats.slice(0, 7).map((s, i) => {
                      const risco = s.pctMedia
                      const color = CARRIER_COLORS[i % CARRIER_COLORS.length]
                      const badgeClass = risco >= 20 ? 'bg-red-50 text-red-600 border border-red-100' : risco >= 10 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      
                      return (
                         <div key={s.nome} className="group">
                            <div className="flex items-center justify-between mb-1.5">
                               <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                                  <span className="text-xs font-bold text-gray-700">{s.nome}</span>
                                  <span className="text-[10px] text-gray-400 hidden sm:inline">({s.count} volumes)</span>
                               </div>
                               <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-mono text-gray-500">Gasto R$ {s.frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg w-[60px] text-center shadow-sm ${badgeClass}`}>
                                      {risco.toFixed(1)}%
                                  </span>
                               </div>
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
  )
}
