import { useState, useEffect } from 'react'
import { useLayout } from '../contexts/LayoutContext'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, AlertTriangle, Clock,
  ShoppingCart, UserPlus, Receipt, ArrowRight, Download, X,
  Check, ChevronDown, Truck
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'
import { fetchPedidos, updatePedido } from '../services/pedidos'
import { fetchOrdersForFreightAnalysis, fetchOrdersForKPIs, enrichOrdersWithCarriers, fetchOrderByCodigo, magazordDetailedToOrder } from '../magazord'

const cashflow: any[] = []

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PERIODOS = ['Últimos 7 Dias', 'Últimos 30 Dias', 'Este Mês', 'Trimestre', 'Ano']

// Colors for carrier bars
const CARRIER_COLORS = [
  '#3b82f6', '#7c3aed', '#059669', '#d97706',
  '#dc2626', '#0891b2', '#9333ea', '#65a30d',
]

interface CarrierStats {
  nome: string
  totalFrete: number
  totalPedidos: number
  totalVolumes: number
  totalValorPedidos: number
  qtdComFrete: number
  percFreteMedio: number   // avg (frete/valor) per order
}

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

function ComingSoon({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
      <Clock size={32} className="text-gray-300" />
      <p className="font-medium">{label ?? 'Em construção'}</p>
      <p className="text-xs">Esta seção estará disponível em breve.</p>
    </div>
  )
}

// ── Freight analytics component ───────────────────────────────────────────────

/**
 * Re-sincroniza pedidos do Supabase que ainda não têm transportadora/frete.
 * Busca o detalhe de cada um na Magazord e atualiza o banco.
 */
async function syncMissingFreightData(): Promise<{ updated: number; failed: number }> {
  const pedidos = await fetchPedidos()
  const missing = pedidos.filter(p => !p.transportadora || !p.frete)
  console.log(`[SyncFreight] ${missing.length} pedidos sem transportadora/frete`)

  let updated = 0, failed = 0
  const CONCURRENCY = 5

  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (pedido) => {
      try {
        const detail = await fetchOrderByCodigo(pedido.numero)
        if (!detail) { failed++; return }

        const rich = magazordDetailedToOrder(detail)
        const toUpdate: any = {}
        if (rich.transportadora && !pedido.transportadora) toUpdate.transportadora = rich.transportadora
        if (rich.frete && rich.frete > 0 && !pedido.frete) toUpdate.frete = rich.frete

        if (Object.keys(toUpdate).length > 0) {
          const ok = await updatePedido(pedido.id, toUpdate)
          if (ok) { updated++; console.log(`[SyncFreight] OK ${pedido.numero}: trans=${rich.transportadora} frete=${rich.frete}`) }
          else failed++
        }
      } catch (err) {
        console.warn(`[SyncFreight] Falha ${pedido.numero}:`, err)
        failed++
      }
    }))
  }

  return { updated, failed }
}

// ── Freight period options ─────────────────────────────────────────────────────
type FreightPeriodo = 'Este Mês' | '7 Dias' | '15 Dias' | '30 Dias' | '90 Dias' | 'Personalizado'
const FREIGHT_PERIODOS: FreightPeriodo[] = ['Este Mês', '7 Dias', '15 Dias', '30 Dias', '90 Dias', 'Personalizado']

function FreightByCarrier({ allOrders, loadingOrders, enriching, enrichProgress }: { allOrders: any[], loadingOrders: boolean, enriching: boolean, enrichProgress: number }) {
  const [fperiodo, setFPeriodo] = useState<FreightPeriodo>('Este Mês')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const [stats, setStats] = useState<CarrierStats[]>([])
  const [totalFreteGeral, setTotalFreteGeral] = useState(0)
  const [totalPedidosValor, setTotalPedidosValor] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  // Recompute stats whenever period or data changes
  useEffect(() => {
    if (loadingOrders) return
    const today = new Date(); today.setHours(23, 59, 59, 999)
    const map = new Map<string, { frete: number; valor: number; count: number; volumes: number; comFrete: number; percSum: number }>()

    allOrders.forEach(p => {
      const d = new Date(p.data || new Date())
      let keep = false
      if (fperiodo === 'Este Mês') {
        keep = d >= new Date(today.getFullYear(), today.getMonth(), 1) && d <= today
      } else if (fperiodo === '7 Dias') {
        const s = new Date(today); s.setDate(s.getDate() - 7); keep = d >= s && d <= today
      } else if (fperiodo === '15 Dias') {
        const s = new Date(today); s.setDate(s.getDate() - 15); keep = d >= s && d <= today
      } else if (fperiodo === '30 Dias') {
        const s = new Date(today); s.setDate(s.getDate() - 30); keep = d >= s && d <= today
      } else if (fperiodo === '90 Dias') {
        const s = new Date(today); s.setDate(s.getDate() - 90); keep = d >= s && d <= today
      } else if (fperiodo === 'Personalizado' && customStart && customEnd) {
        keep = d >= new Date(customStart + 'T00:00:00') && d <= new Date(customEnd + 'T23:59:59')
      }
      if (!keep) return
      const trans = p.transportadora?.trim() || 'Sem transportadora'
      const frete = p.frete || 0
      const valor = p.valor || 0
      if (!map.has(trans)) map.set(trans, { frete: 0, valor: 0, count: 0, volumes: 0, comFrete: 0, percSum: 0 })
      const cur = map.get(trans)!
      cur.count++
      cur.valor += valor
      cur.frete += frete
      cur.volumes += (p.quantidade || 1)
      if (frete > 0 && valor > 0) {
        cur.comFrete++
        cur.percSum += (frete / valor)
      }
    })

    let totalF = 0, totalV = 0
    const result: CarrierStats[] = []
    map.forEach((v, nome) => {
      totalF += v.frete; totalV += v.valor
      const percFreteMedio = v.valor > 0 ? (v.frete / v.valor) * 100 : 0
      result.push({ nome, totalFrete: v.frete, totalPedidos: v.count, totalValorPedidos: v.valor, qtdComFrete: v.count, percFreteMedio, totalVolumes: v.volumes })
    })
    result.sort((a, b) => b.totalFrete - a.totalFrete)
    setStats(result); setTotalFreteGeral(totalF); setTotalPedidosValor(totalV)
  }, [allOrders, fperiodo, customStart, customEnd, loadingOrders])

  const periodoLabel = fperiodo === 'Personalizado' && customStart && customEnd
    ? `${customStart.split('-').reverse().join('/')} → ${customEnd.split('-').reverse().join('/')}`
    : fperiodo

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <Truck size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Inteligência de Fretes</h2>
            <p className="text-xs text-gray-400">Custo de frete por transportadora — <span className="font-semibold text-indigo-500">{periodoLabel}</span></p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Gasto c/ Fretes</p>
            <p className="text-lg font-black text-indigo-600">{fmt(totalFreteGeral)}</p>
          </div>
          <div className="text-right bg-gray-50 px-4 py-1.5 rounded-xl border border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Margem Comprometida</p>
            <p className={`text-lg font-black ${ (totalFreteGeral / (totalPedidosValor || 1)) * 100 > 15 ? 'text-red-600' : 'text-emerald-600'}`}>
              {totalPedidosValor > 0 ? ((totalFreteGeral / totalPedidosValor) * 100).toFixed(1) : '0'}%
            </p>
          </div>
          <button
            onClick={async () => {
              setSyncing(true); setSyncMsg(null)
              const r = await syncMissingFreightData()
              setSyncing(false)
              setSyncMsg(`${r.updated} pedidos atualizados. Recarregue a página.`)
              setTimeout(() => setSyncMsg(null), 6000)
            }}
            disabled={syncing}
            title="Sincronizar fretes e transportadoras ausentes"
            className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 transition disabled:opacity-50 whitespace-nowrap"
          >
            <Truck size={12} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Fretes'}
          </button>
        </div>
      </div>

      {/* ── Filtro de Período ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Período:</span>
        {FREIGHT_PERIODOS.map(p => (
          <button
            key={p}
            onClick={() => setFPeriodo(p)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
              fperiodo === p
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {p === '7 Dias' ? 'Últimos 7 Dias' : p === '15 Dias' ? 'Últimos 15 Dias' : p === '30 Dias' ? 'Últimos 30 Dias' : p === '90 Dias' ? 'Últimos 90 Dias' : p}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {fperiodo === 'Personalizado' && (
        <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <span className="text-xs font-bold text-indigo-600">De:</span>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            className="text-xs border border-indigo-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <span className="text-xs font-bold text-indigo-600">Até:</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            className="text-xs border border-indigo-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          {customStart && customEnd && (
            <span className="text-[10px] text-indigo-500 font-medium">
              {Math.round((new Date(customEnd).getTime() - new Date(customStart).getTime()) / 86400000 + 1)} dias selecionados
            </span>
          )}
        </div>
      )}

      {syncMsg && (
        <div className="text-center text-xs text-indigo-600 font-bold bg-indigo-50 rounded-lg py-2 px-4 mb-4">{syncMsg}</div>
      )}

      {enriching && (
        <div className="mb-4 px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-indigo-500 font-semibold">Identificando transportadoras... {enrichProgress}%</span>
            <span className="text-[10px] text-gray-400">O gráfico atualiza em tempo real</span>
          </div>
          <div className="h-1 w-full bg-indigo-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${enrichProgress}%` }} />
          </div>
        </div>
      )}


      {loadingOrders ? (
        <div className="flex items-center justify-center py-12 gap-3 text-gray-400 text-sm">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
          Carregando dados de fretes...
        </div>
      ) : stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Truck size={28} className="text-gray-200" />
          <p className="text-gray-400 text-sm">Nenhum dado para <strong>{periodoLabel}</strong>.</p>
          <p className="text-xs text-gray-300 text-center max-w-xs">Clique em <strong>"Sincronizar Fretes"</strong> para buscar os dados na Magazord.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="overflow-hidden">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Proporção Custo Bruto (R$)</p>
            <ResponsiveContainer width="100%" height={Math.max(180, stats.slice(0,6).length * 38)}>
              <BarChart data={stats.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nome" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={85} />
                <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Gasto']} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="totalFrete" radius={[0, 6, 6, 0]}>
                  {stats.slice(0, 6).map((_, i) => <Cell key={i} fill={CARRIER_COLORS[i % CARRIER_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Ranking: Taxa de Frete / Risco</p>
            <div className="space-y-3">
              {stats.slice(0, 8).map((s, i) => {
                const risco = s.percFreteMedio
                const color = CARRIER_COLORS[i % CARRIER_COLORS.length]
                const badgeClass = risco >= 20 ? 'bg-red-50 text-red-600 border border-red-100' : risco >= 10 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                return (
                  <div key={s.nome}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-bold text-gray-700 truncate max-w-[110px]">{s.nome}</span>
                        <span className="text-[10px] text-gray-400">({s.totalPedidos} ped. / {s.totalVolumes} vol.)</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-gray-500">R$ {s.totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg w-[58px] text-center ${badgeClass}`}>{risco.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-700" style={{ width: `${Math.min(100, risco * 3)}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { activeTab } = useLayout()
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState('Este Mês')
  const [showPeriodo, setShowPeriodo] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // KPI States
  const [faturamentoMensal, setFaturamentoMensal] = useState(0)
  const [quadrosProduzidos, setQuadrosProduzidos] = useState(0)
  const [pedidosAtrasados, setPedidosAtrasados] = useState(0)
  const [ticketMedio, setTicketMedio] = useState(0)
  
  // Factory Capacity State
  const [pedidosAndamento, setPedidosAndamento] = useState(0)
  const [capacidade, setCapacidade] = useState(0)

  // Shared Order State (to sync Freight progressive fetch with KPIs)
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [enriching, setEnriching] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState(0)

  // Daily Sales Metric
  const [dailySales, setDailySales] = useState<{ date: string; valor: number }[]>([])

  useEffect(() => {
    // Fase 1: Fetch global apenas com lista
    fetchOrdersForKPIs(90).then(orders => {
      setAllOrders(orders)
      setLoadingOrders(false)

      // Fase 2: Enriquece os itens globalmente para corrigir a Qtd (volumes) no KPI também
      const needsEnrich = orders.filter(o => o.transportadora === 'Sem transportadora' || o.frete === 0)
      if (needsEnrich.length === 0) return

      setEnriching(true)
      let done = 0
      enrichOrdersWithCarriers(orders, (enriched) => {
        done += 12
        setEnrichProgress(Math.min(100, Math.round((done / needsEnrich.length) * 100)))
        setAllOrders(enriched)
      }).then(() => {
        setEnriching(false)
        setEnrichProgress(100)
      }).catch(() => setEnriching(false))

    }).catch(() => {
      setLoadingOrders(false)
    })
  }, [])

  // KPI calculations based on allOrders updates
  useEffect(() => {
    if (loadingOrders || allOrders.length === 0) return

    const now = new Date()
    let start = new Date(now.getFullYear(), now.getMonth(), 1)
    let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    if (periodo === 'Últimos 7 Dias') {
      start = new Date(now)
      start.setDate(now.getDate() - 6)
      start.setHours(0,0,0,0)
      end = now
    } else if (periodo === 'Últimos 30 Dias') {
      start = new Date(now)
      start.setDate(now.getDate() - 29)
      start.setHours(0,0,0,0)
      end = now
    } else if (periodo === 'Trimestre') {
      start = new Date(now)
      start.setMonth(now.getMonth() - 2)
      start.setDate(1)
      start.setHours(0,0,0,0)
    } else if (periodo === 'Ano') {
      start = new Date(now)
      start.setMonth(0)
      start.setDate(1)
      start.setHours(0,0,0,0)
    }

    // Pedidos no período (status 4 = Aprovado, 7 = Faturado/Transporte)
    const pedidosFiltrados = allOrders.filter(p => {
      const d = new Date(p.data || new Date())
      return d >= start && d <= end
    })

    const fat = pedidosFiltrados.reduce((acc, p) => acc + (p.valor || 0), 0)
    const totalPed = pedidosFiltrados.length
    const ticket = totalPed > 0 ? fat / totalPed : 0

    // Pedidos em andamento = status 4+5 (ativos no período)
    const andamento = pedidosFiltrados.filter(p => [4, 5].includes(p.situacao ?? 0)).length

    // Quadros Produzidos - Modificado para Volumes de Venda do período
    const faturados = pedidosFiltrados.reduce((acc, p) => acc + (p.quantidade || 1), 0)

    setFaturamentoMensal(fat)
    setTicketMedio(ticket)
    setQuadrosProduzidos(faturados)
    // Usando pedidosAtrasados stte para armazenar o Total de Pedidos daquele bloco
    setPedidosAtrasados(totalPed) 
    setPedidosAndamento(totalPed) 
    
    const cap = totalPed > 0 ? Math.round((andamento / totalPed) * 100) : 0
    setCapacidade(Math.min(cap, 100))

    // Aggregating daily sales for the period
    const salesMap = new Map<string, number>()
    
    // Create an array of dates from start to end (up to 90 days max to avoid long loops on Year view)
    let iterDate = new Date(start)
    let safetyCounter = 0
    while (iterDate <= end && safetyCounter < 366) {
      const dayStr = String(iterDate.getDate()).padStart(2, '0')
      const monthStr = String(iterDate.getMonth() + 1).padStart(2, '0')
      // For short ranges use Day, for long ranges use Day/Month
      const key = (end.getTime() - start.getTime()) > (60 * 24 * 60 * 60 * 1000) ? `${dayStr}/${monthStr}` : dayStr
      if (!salesMap.has(key)) salesMap.set(key, 0)
      iterDate.setDate(iterDate.getDate() + 1)
      safetyCounter++
    }

    pedidosFiltrados.forEach(p => {
      const d = new Date(p.data || new Date())
      const dayStr = String(d.getDate()).padStart(2, '0')
      const monthStr = String(d.getMonth() + 1).padStart(2, '0')
      const key = (end.getTime() - start.getTime()) > (60 * 24 * 60 * 60 * 1000) ? `${dayStr}/${monthStr}` : dayStr
      if (salesMap.has(key)) salesMap.set(key, (salesMap.get(key) || 0) + (p.valor || 0))
    })
    
    const salesArr = Array.from(salesMap.entries()).map(([k, v]) => ({ date: k, valor: v }))
    setDailySales(salesArr)

  }, [allOrders, loadingOrders, periodo])


  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleExportar = () => {
    const csv = [
      'Semana,Entradas,Saídas',
      ...cashflow.map(r => `${r.semana},${r.entradas},${r.saidas}`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fluxo-caixa-${periodo.replace(/ /g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Relatório exportado com sucesso!')
  }

  if (activeTab === 'Relatórios') return (
    <div className="p-6"><div className="card p-6"><ComingSoon label="Relatórios detalhados" /></div></div>
  )
  if (activeTab === 'Analytics') return (
    <div className="p-6"><div className="card p-6"><ComingSoon label="Analytics avançado" /></div></div>
  )

  return (
    <div className="p-6 space-y-5">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Executivo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bem-vindo à central de inteligência da Casa Linda.</p>
        </div>
        <div className="flex flex-wrap gap-2 relative">
          <div className="relative">
            <button
              onClick={() => setShowPeriodo(v => !v)}
              className="bg-white hover:bg-gray-50 border border-gray-200 text-slate-700 text-[13px] font-semibold tracking-wide px-3.5 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2 active:scale-95"
            >
              <Clock size={14} className="text-gray-400" /> {periodo} <ChevronDown size={14} className={`text-gray-400 transition-transform ${showPeriodo ? 'rotate-180':''}`} />
            </button>
            <AnimatePresence>
              {showPeriodo && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] z-20 min-w-max overflow-hidden"
                >
                  <div className="p-1">
                    {PERIODOS.map(p => (
                      <button key={p} onClick={() => { setPeriodo(p); setShowPeriodo(false) }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between group ${periodo === p ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}
                      >
                        {p}
                        {periodo === p && <Check size={14} className="text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="btn-secondary" onClick={handleExportar}>
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards (Clean SaaS Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'FATURAMENTO TOTAL',      value: fmt(faturamentoMensal),      icon: TrendingUp,     onClick: () => navigate('/financial') },
          { label: 'TOTAL DE PEDIDOS',       value: String(pedidosAtrasados),    icon: Receipt,        onClick: () => navigate('/production') },
          { label: 'VOLUMES (QUADROS)',      value: String(quadrosProduzidos),   icon: ShoppingCart,   onClick: () => navigate('/production') },
          { label: 'TICKET MÉDIO',           value: fmt(ticketMedio),            icon: TrendingDown,   onClick: () => navigate('/financial') },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, ease: "easeOut" }}
            className="group cursor-pointer bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 rounded-xl p-5 transition-all duration-200"
            onClick={k.onClick}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{k.label}</p>
              <k.icon size={16} strokeWidth={2.5} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{k.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Desempenho de Vendas</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Faturamento Diário — {periodo}</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-500 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" />Faturamento</span>
            </div>
          </div>
          <div className="flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySales} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={12} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(v: number) => [fmt(v), 'Faturamento']} 
                  labelFormatter={(l) => `Dia ${l}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', padding: '12px', fontWeight: 600, color: '#0f172a' }} 
                  itemStyle={{ color: '#2563eb', padding: '4px 0 0' }}
                />
                <Area type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorValor)" activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              Ações Rápidas
              <ArrowRight size={12} className="text-gray-300" />
            </p>
            {[
              { label: 'Novo Pedido',        sub: 'Lançar venda',        icon: ShoppingCart, to: '/production' },
              { label: 'Cadastrar Parceiro', sub: 'Fornecedores locais', icon: UserPlus,     to: '/partners'   },
              { label: 'Lançar Despesa',     sub: 'Custos operacionais', icon: Receipt,      to: '/financial'  },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all mb-1 group"
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors">
                  <a.icon size={16} strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-slate-900 transition-colors">{a.label}</p>
                  <p className="text-[10px] text-gray-400 font-medium tracking-wide">{a.sub}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Status da Fábrica
            </p>
            <p className="font-extrabold text-2xl tracking-tight text-slate-900 mt-0.5 flex items-baseline gap-2">
              {capacidade}% <span className="text-xs font-semibold text-gray-500 tracking-normal uppercase">Ocupação</span>
            </p>
            
            <div className="mt-4 bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-blue-600 rounded-full h-full transition-all duration-1000 ease-out" 
                style={{ width: `${capacidade}%` }} 
              />
            </div>
            
            <div className="mt-3 flex justify-between items-center text-[11px] font-medium text-gray-500">
              <span>{pedidosAndamento} pedidos em andamento</span>
            </div>
          </div>
        </div>
      </div>

      {/* Freight analytics by carrier */}
      <FreightByCarrier allOrders={allOrders} loadingOrders={loadingOrders} enriching={enriching} enrichProgress={enrichProgress} />

      <AnimatePresence>
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
