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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { fetchPedidos } from '../services/pedidos'
import { fetchPendingOrders, magazordToOrder } from '../magazord'
import { isSupabaseConfigured } from '../lib/supabase'

const cashflow: any[] = []

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`
const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

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

function FreightByCarrier({ periodo }: { periodo: string }) {
  const [stats, setStats] = useState<CarrierStats[]>([])
  const [loading, setLoading] = useState(true)
  const [totalFreteGeral, setTotalFreteGeral] = useState(0)
  const [totalPedidosValor, setTotalPedidosValor] = useState(0)

  useEffect(() => {
    Promise.all([
      fetchPedidos().catch(() => []), 
      fetchPendingOrders().catch(() => [])
    ]).then(([pedidosSupa, pedidosMag]) => {
      
      // Mesclar live data do Magazord para injetar nomes e fretes "ausentes" localmente
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

      const map = new Map<string, { frete: number; valor: number; count: number; comFrete: number }>()
      const today = new Date()

      combined.forEach(p => {
        const d = new Date(p.created_at || p.data || new Date())
        let keep = false

        if (periodo === 'Últimos 7 Dias') {
          keep = (today.getTime() - d.getTime()) <= 7 * 86400000
        } else if (periodo === 'Últimos 30 Dias') {
          keep = (today.getTime() - d.getTime()) <= 30 * 86400000
        } else if (periodo === 'Este Mês') {
          keep = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
        } else if (periodo === 'Trimestre') {
          const currentQuarter = Math.floor(today.getMonth() / 3)
          const dQuarter = Math.floor(d.getMonth() / 3)
          keep = currentQuarter === dQuarter && d.getFullYear() === today.getFullYear()
        } else if (periodo === 'Ano') {
          keep = d.getFullYear() === today.getFullYear()
        } else {
          keep = true
        }

        if (!keep) return

        let trans = typeof p.transportadora === 'string' ? p.transportadora : 'Sem transportadora'
        if (trans.trim() === '') trans = 'Sem transportadora'
        
        const frete = parseFloat(p.frete as any) || 0
        const valor = parseFloat(p.valor as any) || 0

        if (!map.has(trans)) map.set(trans, { frete: 0, valor: 0, count: 0, comFrete: 0 })
        const cur = map.get(trans)!
        cur.count++
        cur.valor += valor
        if (frete > 0) { cur.frete += frete; cur.comFrete++ }
      })

      let totalF = 0, totalV = 0
      const result: CarrierStats[] = []

      map.forEach((v, nome) => {
        totalF += v.frete
        totalV += v.valor
        const percFreteMedio = v.valor > 0 ? (v.frete / v.valor) * 100 : 0
        result.push({
          nome,
          totalFrete: v.frete,
          totalPedidos: v.count,
          totalValorPedidos: v.valor,
          qtdComFrete: v.comFrete,
          percFreteMedio,
        })
      })

      result.sort((a, b) => b.totalFrete - a.totalFrete)
      setStats(result)
      setTotalFreteGeral(totalF)
      setTotalPedidosValor(totalV)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [periodo])

  return (
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Truck size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Inteligência de Fretes ({periodo})</h2>
              <p className="text-xs text-gray-400">Proporção do custo de frete sobre os pedidos faturados. Avalie as transportadoras mais caras.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Gasto c/ Fretes</p>
              <p className="text-lg font-black text-navy-600">{fmt(totalFreteGeral)}</p>
            </div>
            <div className="text-right bg-gray-50 px-4 py-1.5 rounded-xl border border-gray-100 hidden md:block">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Margem Comprometida</p>
              <p className={`text-lg font-black ${
                 (totalFreteGeral / (totalPedidosValor || 1)) * 100 > 15 ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {totalPedidosValor > 0 ? ((totalFreteGeral / totalPedidosValor) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Buscando inteligência de fretes...</div>
        ) : stats.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Nenhum custo de frete computado para este período.</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
             {/* Chart View */}
             <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Proporção Custo Bruto (R$)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nome" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Gasto (R$)']} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none' }} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="totalFrete" radius={[0, 6, 6, 0]}>
                      {stats.slice(0, 6).map((_, i) => <Cell key={i} fill={CARRIER_COLORS[i % CARRIER_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>

             {/* Ranking List */}
             <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Ranking: Taxa de Frete (Risco)</p>
                <div className="space-y-3">
                   {stats.slice(0, 7).map((s, i) => {
                      const risco = s.percFreteMedio
                      const color = CARRIER_COLORS[i % CARRIER_COLORS.length]
                      const badgeClass = risco >= 20 ? 'bg-red-50 text-red-600 border border-red-100' : risco >= 10 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      
                      return (
                         <div key={s.nome} className="group">
                            <div className="flex items-center justify-between mb-1.5">
                               <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                                  <span className="text-xs font-bold text-gray-700">{s.nome}</span>
                                  <span className="text-[10px] text-gray-400 hidden sm:inline">({s.totalPedidos} volumes)</span>
                               </div>
                               <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-mono text-gray-500">Gasto R$ {s.totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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

  useEffect(() => {
    fetchPedidos().then(pedidos => {
      const now = new Date()
      
      // Filtros para "Este Mês"
      let fat = 0
      let qtdProd = 0
      let totalPedMes = 0
      let atrasados = 0
      let andamento = 0

      for (const p of pedidos) {
        // Pedidos em andamento
        const isFinished = p.etapa === 'Prontos para Envio' || p.etapa === 'Despachados'
        if (!isFinished) andamento++
        
        if (p.status === 'Atrasado') atrasados++
        
        const dt = new Date(p.created_at)
        if (dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()) {
          fat += (p.valor || 0)
          totalPedMes++
          if (isFinished) {
            qtdProd += ((p as any).quantidade || 1)
          }
        }
      }

      setFaturamentoMensal(fat)
      setPedidosAtrasados(atrasados)
      setQuadrosProduzidos(qtdProd)
      setTicketMedio(totalPedMes > 0 ? fat / totalPedMes : 0)
      
      setPedidosAndamento(andamento)
      // Assume a max capacity of 50 orders in pipeline for 100% visualization
      setCapacidade(Math.min(Math.round((andamento / 50) * 100), 100))
    })
  }, [])

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Executivo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bem-vindo à central de inteligência da Casa Linda.</p>
        </div>
        <div className="flex gap-2 relative">
          <div className="relative">
            <button
              onClick={() => setShowPeriodo(v => !v)}
              className="btn-secondary"
            >
              <Clock size={14} /> {periodo} <ChevronDown size={12} />
            </button>
            <AnimatePresence>
              {showPeriodo && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-max overflow-hidden"
                >
                  {PERIODOS.map(p => (
                    <button key={p} onClick={() => { setPeriodo(p); setShowPeriodo(false) }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${periodo === p ? 'text-navy-900 font-semibold' : 'text-gray-700'}`}
                    >
                      {p}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="btn-secondary" onClick={handleExportar}>
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'FATURAMENTO MENSAL',     value: fmt(faturamentoMensal),      tag: 'Este mês',       tagColor: 'text-emerald-700 bg-emerald-100',  icon: TrendingUp,    iconColor: 'text-emerald-500',   onClick: () => navigate('/financial') },
          { label: 'QUADROS PRODUZIDOS(MÊS)',value: String(quadrosProduzidos),   tag: 'Concluídos',tagColor: 'text-blue-700 bg-blue-100',  icon: ShoppingCart,  iconColor: 'text-blue-500',   onClick: () => navigate('/production') },
          { label: 'PEDIDOS ATRASADOS',      value: String(pedidosAtrasados),         tag: pedidosAtrasados > 0 ? 'Atenção' : 'Aprovado', tagColor: pedidosAtrasados > 0 ? 'text-red-700 bg-red-100' : 'text-emerald-700 bg-emerald-100',  icon: AlertTriangle, iconColor: pedidosAtrasados > 0 ? 'text-red-500' : 'text-emerald-500',   onClick: () => navigate('/production') },
          { label: 'TICKET MÉDIO (MÊS)',     value: fmt(ticketMedio),      tag: 'Por pedido',       tagColor: 'text-purple-700 bg-purple-100',  icon: TrendingDown,  iconColor: 'text-purple-500',   onClick: () => navigate('/financial') },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="stat cursor-pointer hover:shadow-lg transition-shadow"
            onClick={k.onClick}
          >
            <div className="flex items-center justify-between">
              <k.icon size={18} className={k.iconColor} />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${k.tagColor}`}>{k.tag}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{k.value}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Fluxo de Caixa</h2>
              <p className="text-xs text-gray-400">Entradas vs Saídas — {periodo}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />ENTRADAS</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-800 inline-block" />SAÍDAS</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cashflow} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="semana" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [fmt(v)]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Bar dataKey="entradas" name="Entradas" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas"   name="Saídas"   fill="#991b1b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Atalhos Rápidos</p>
            <p className="text-xs text-gray-400 -mt-2 mb-3">Ações administrativas frequentes</p>
            {[
              { label: 'Novo Pedido',        sub: 'LANÇA VENDA MANUAL',          icon: ShoppingCart, to: '/production' },
              { label: 'Cadastrar Parceiro', sub: 'NOVOS FORNECEDORES/ARTISTAS', icon: UserPlus,     to: '/partners'   },
              { label: 'Lançar Despesa',     sub: 'CUSTOS FIXOS E VARIÁVEIS',    icon: Receipt,      to: '/financial'  },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-navy-900/20 hover:bg-gray-50 transition-all mb-2 group"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-900 transition-colors shrink-0">
                  <a.icon size={16} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{a.label}</p>
                  <p className="text-[10px] text-gray-400">{a.sub}</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-900 transition-colors" />
              </button>
            ))}
          </div>

          <div className="bg-navy-900 rounded-xl p-4 text-white">
            <p className="text-xs text-blue-200 font-medium mb-1">STATUS DA FÁBRICA</p>
            <p className="font-bold text-base">Capacidade de Produção em {capacidade}%</p>
            <div className="mt-3 bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2 transition-all duration-1000" style={{ width: `${capacidade}%` }} />
            </div>
            <p className="text-xs text-blue-200 mt-2">{pedidosAndamento} pedidos em andamento</p>
          </div>
        </div>
      </div>

      {/* Freight analytics by carrier */}
      <FreightByCarrier periodo={periodo} />

      <AnimatePresence>
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
