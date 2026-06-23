import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingUp, AlertTriangle, Clock, ShoppingCart,
  UserPlus, Receipt, ArrowRight, Download, ChevronDown,
  Package, BarChart2, Sofa, Truck
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, LabelList, PieChart, Pie, Legend
} from 'recharts'
import { fetchPedidosLV } from '../../services/pedidosLV'
import { fetchOrdersForKPIsLV } from '../../magazordLV'
import type { FreightOrderData } from '../../magazord'

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const PERIODOS = ['Hoje', 'Últimos 7 Dias', 'Últimos 30 Dias', 'Este Mês', 'Trimestre', 'Ano', 'Personalizado']

// ─── Analytics Helpers ────────────────────────────────────────────────────────

const CHANNEL_META: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  'Site':           { color: '#b45309', bg: '#fffbeb', border: '#fde68a', icon: '🛒' }, // Amber
  'Mercado Livre':  { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '🛍️' },
  'Magazine Luiza': { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: '🛍️' },
  'Shopee':         { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: '🧡' },
  'Amazon':         { color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', icon: '📦' },
  'Loja':           { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: '🏪' },
}

function getChannelMeta(canal: string) {
  const key = Object.keys(CHANNEL_META).find(k => canal.toLowerCase().includes(k.toLowerCase()))
  return key ? CHANNEL_META[key] : { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: '📊' }
}

export default function DashboardLV() {
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState('Este Mês')
  const [showPeriodo, setShowPeriodo] = useState(false)

  // Data states
  const [faturamento, setFaturamento] = useState(0)
  const [totalPedidos, setTotalPedidos] = useState(0)
  const [pedidosAtrasados, setPedidosAtrasados] = useState(0)
  const [ticketMedio, setTicketMedio] = useState(0)
  const [pedidosAndamento, setPedidosAndamento] = useState(0)
  const [capacidade, setCapacidade] = useState(0)

  // Magazord LV Data
  const [mzOrders, setMzOrders] = useState<FreightOrderData[]>([])
  const [loadingMz, setLoadingMz] = useState(true)

  useEffect(() => {
    // 1. Carrega dados do Kanban (Produção local)
    fetchPedidosLV().then(pedidos => {
      const now = new Date()
      let fat = 0, total = 0, atrasados = 0, andamento = 0

      for (const p of pedidos) {
        const isFinished = p.etapa === 'Prontos para Envio' || p.etapa === 'Despachados'
        if (!isFinished) andamento++
        if (p.status === 'Atrasado') atrasados++

        const dt = new Date(p.created_at)
        if (dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()) {
          fat += (p.valor || 0)
          total++
        }
      }

      setPedidosAtrasados(atrasados)
      setPedidosAndamento(andamento)
      setCapacidade(Math.min(Math.round((andamento / 30) * 100), 100))
    }).catch(() => {})

    // 2. Carrega dados do Magazord para os gráficos
    fetchOrdersForKPIsLV(90).then(orders => {
      setMzOrders(orders)
      setLoadingMz(false)
      
      // Update general KPIs based on Magazord data for "Este Mês"
      const now = new Date()
      let fatMz = 0, totalMz = 0
      for (const o of orders) {
        const d = new Date(o.data)
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          fatMz += o.valor
          totalMz++
        }
      }
      setFaturamento(fatMz)
      setTotalPedidos(totalMz)
      setTicketMedio(totalMz > 0 ? fatMz / totalMz : 0)
    })
  }, [])

  // ─── Process Analytics ────────────────────────────────────────────────────────
  
  // Channels
  const channelsMap = new Map<string, { valor: number, pedidos: number }>()
  mzOrders.forEach(o => {
    const c = o.canal || 'Site'
    const cur = channelsMap.get(c) || { valor: 0, pedidos: 0 }
    cur.valor += o.valor
    cur.pedidos++
    channelsMap.set(c, cur)
  })
  const channelStats = Array.from(channelsMap.entries())
    .map(([canal, v]) => ({ canal, valor: v.valor, pedidos: v.pedidos, perc: 0 }))
    .sort((a, b) => b.valor - a.valor)
  const totalMz = channelStats.reduce((acc, c) => acc + c.valor, 0)
  channelStats.forEach(c => c.perc = totalMz > 0 ? (c.valor / totalMz) * 100 : 0)

  // Products
  const productsMap = new Map<string, number>()
  mzOrders.forEach(o => {
    (o.produtos || []).forEach(p => {
      productsMap.set(p.nome, (productsMap.get(p.nome) || 0) + p.qtd)
    })
  })
  const topProducts = Array.from(productsMap.entries())
    .map(([name, value]) => ({ name: name.length > 30 ? name.substring(0,30)+'...' : name, value }))
    .sort((a,b) => b.value - a.value)
    .slice(0, 5)

  const handleExportar = () => {
    const csv = 'Relatório vazio — adicione pedidos para exportar dados.'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lar-e-vida-${periodo.replace(/ /g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-5">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
              <Sofa size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard — Lar e Vida</h1>
          </div>
          <p className="text-sm text-gray-500">Painel executivo de Inteligência integrado ao Magazord.</p>
        </div>
        <div className="flex flex-wrap gap-2 relative">
          <div className="relative">
            <button onClick={() => setShowPeriodo(v => !v)} className="btn-secondary">
              <Clock size={14} /> {periodo} <ChevronDown size={12} />
            </button>
            {showPeriodo && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-max overflow-hidden">
                {PERIODOS.map(p => (
                  <button key={p} onClick={() => { setPeriodo(p); setShowPeriodo(false) }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 ${periodo === p ? 'font-semibold' : 'text-gray-700'}`}
                    style={periodo === p ? { color: '#b45309' } : {}}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn-secondary" onClick={handleExportar}>
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'FATURAMENTO (MÊS)',   value: fmt(faturamento),        tag: 'Magazord',    tagColor: 'text-amber-700 bg-amber-100',   icon: TrendingUp,    iconBg: '#fef3c7', iconColor: '#d97706',  onClick: () => navigate('/lar-e-vida/financial') },
          { label: 'PEDIDOS (MÊS)',       value: String(totalPedidos),    tag: 'Magazord',    tagColor: 'text-stone-700 bg-stone-100',   icon: ShoppingCart,  iconBg: '#f5f5f4', iconColor: '#78716c',  onClick: () => navigate('/lar-e-vida/production') },
          { label: 'TICKET MÉDIO (MÊS)',  value: fmt(ticketMedio),        tag: 'Magazord',    tagColor: 'text-orange-700 bg-orange-100', icon: TrendingUp,    iconBg: '#ffedd5', iconColor: '#ea580c',  onClick: () => navigate('/lar-e-vida/financial') },
          { label: 'PEDIDOS ATRASADOS',   value: String(pedidosAtrasados),tag: pedidosAtrasados > 0 ? 'PCP' : 'PCP OK', tagColor: pedidosAtrasados > 0 ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100', icon: AlertTriangle, iconBg: pedidosAtrasados > 0 ? '#fee2e2' : '#dcfce7', iconColor: pedidosAtrasados > 0 ? '#dc2626' : '#16a34a', onClick: () => navigate('/lar-e-vida/production') },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="stat cursor-pointer hover:shadow-lg transition-shadow"
            onClick={k.onClick}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.iconBg }}>
                <k.icon size={18} style={{ color: k.iconColor }} />
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${k.tagColor}`}>{k.tag}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{k.value}</p>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{k.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Sales by Channel - Magazord */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <BarChart2 size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Inteligência de Vendas (Canais)</h2>
              <p className="text-xs text-gray-400">Origem de vendas sincronizado com Magazord.</p>
            </div>
          </div>

          {loadingMz ? (
            <div className="flex items-center justify-center py-12 gap-3 text-gray-400 text-sm">
              <div className="w-5 h-5 rounded-full border-2 border-amber-300 border-t-amber-600 animate-spin" />
              Sincronizando Magazord...
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {channelStats.map(s => {
                const meta = getChannelMeta(s.canal)
                return (
                  <div key={s.canal} className="rounded-xl border p-4 transition-all hover:shadow-sm" style={{ borderColor: meta.border, backgroundColor: meta.bg }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg leading-none">{meta.icon}</span>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{s.canal}</p>
                          <p className="text-[10px] text-gray-500">{s.pedidos} pedidos</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-base" style={{ color: meta.color }}>{fmt(s.valor)}</p>
                        <p className="text-[10px] font-bold text-gray-400">{s.perc.toFixed(1)}% do total</p>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-white rounded-full overflow-hidden" style={{ opacity: 0.7 }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.perc}%`, backgroundColor: meta.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions + Capacity */}
        <div className="space-y-3">
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Atalhos Rápidos</p>
            {[
              { label: 'Produção / PCP', sub: 'KANBAN DE PEDIDOS', icon: ShoppingCart, to: '/lar-e-vida/production' },
              { label: 'Almoxarifado',   sub: 'CONTROLE DE ESTOQUE', icon: Package, to: '/lar-e-vida/inventory' },
              { label: 'Despesas',       sub: 'FINANCEIRO LV', icon: Receipt, to: '/lar-e-vida/financial' },
            ].map(a => (
              <button key={a.label} onClick={() => navigate(a.to)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-amber-200 hover:bg-amber-50 transition-all mb-2 group">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-amber-100 group-hover:text-amber-700 transition-colors shrink-0">
                  <a.icon size={16} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{a.label}</p>
                  <p className="text-[10px] text-gray-400">{a.sub}</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-amber-600 transition-colors" />
              </button>
            ))}
          </div>

          <div className="rounded-xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #92400e, #b45309)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#fde68a' }}>STATUS DA OPERAÇÃO PCP</p>
            <p className="font-bold text-base">{pedidosAndamento === 0 ? 'Nenhum pedido em andamento' : `${capacidade}% da capacidade`}</p>
            <div className="mt-3 bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2 transition-all duration-1000" style={{ width: `${capacidade}%` }} />
            </div>
            <p className="text-xs mt-2" style={{ color: '#fde68a' }}>{pedidosAndamento} pedidos em andamento</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Products */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
              <Package size={20} className="text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Top Produtos Vendidos</h2>
              <p className="text-xs text-gray-400">Inteligência baseada em requisições Magazord.</p>
            </div>
          </div>
          
          {loadingMz ? (
            <div className="py-12 text-center text-sm text-gray-400">Carregando...</div>
          ) : (
            <div className="overflow-hidden mt-4">
              <ResponsiveContainer width="100%" height={Math.max(180, topProducts.length * 38)}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} width={150} />
                  <RechartsTooltip formatter={(v: number) => [v, 'Unidades Vendidas']} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#d97706">
                    <LabelList dataKey="value" position="right" fill="#6b7280" fontSize={11} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Stock Alerts Placeholder */}
        <div className="card p-5 border-l-4 border-red-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Avisos de Estoque</h2>
              <p className="text-xs text-gray-400">Produtos Magazord que precisam de reposição.</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <Package size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Aguardando Credenciais Magazord</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Assim que o seu usuário WS for configurado, os avisos de produtos que estão acabando aparecerão aqui automaticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
