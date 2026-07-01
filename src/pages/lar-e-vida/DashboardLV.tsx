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
import { fetchOrdersForKPIsLV, enrichOrdersWithCarriersLV } from '../../magazordLV'
import BrazilMap from '../../components/BrazilMap'
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

const STATE_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
}

export default function DashboardLV() {
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState('Este Mês')
  const [showPeriodo, setShowPeriodo] = useState(false)

  // Data states
  const [pedidosAtrasados, setPedidosAtrasados] = useState(0)
  const [pedidosAndamento, setPedidosAndamento] = useState(0)
  const [capacidade, setCapacidade] = useState(0)

  // Magazord LV Data
  const [mzOrders, setMzOrders] = useState<FreightOrderData[]>([])
  const [loadingMz, setLoadingMz] = useState(true)
  const [enriching, setEnriching] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState(0)

  // Map state
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [metricType, setMetricType] = useState<'faturamento' | 'pedidos' | 'freteMedio' | 'freteTotal' | 'margemComprometida'>('faturamento')

  // Product Category Filter
  const [categoryFilter, setCategoryFilter] = useState('Todas')
  
  const [allOrdersDB, setAllOrdersDB] = useState<any[]>([])
  const [catalogo, setCatalogo] = useState<any[]>([])

  useEffect(() => {
    // 0. Carrega catalogo
    import('../../services/catalogoTapetesLV').then(m => m.fetchCatalogoLV()).then(setCatalogo).catch(() => {})
    // 1. Carrega dados do Kanban (Produção local)
    fetchPedidosLV().then(pedidos => {
      let atrasados = 0, andamento = 0

      for (const p of pedidos) {
        const isFinished = p.etapa === 'Prontos para Envio' || p.etapa === 'Despachados'
        if (!isFinished) andamento++
        if (p.status === 'Atrasado') atrasados++
      }

      setPedidosAtrasados(atrasados)
      setPedidosAndamento(andamento)
      setCapacidade(Math.min(Math.round((andamento / 30) * 100), 100))
      setAllOrdersDB(pedidos)
    }).catch(() => {})

    // 2. Carrega dados do Magazord para os gráficos
    fetchOrdersForKPIsLV(90).then(orders => {
      setMzOrders(orders)
      setLoadingMz(false)

      const needsEnrich = orders.filter(o => o.transportadora === 'Sem transportadora' || o.frete === 0 || !o.fullyEnriched || !o.uf)
      if (needsEnrich.length > 0) {
        setEnriching(true)
        let done = 0
        enrichOrdersWithCarriersLV(orders, (enriched) => {
          done += 12
          setEnrichProgress(Math.min(100, Math.round((done / needsEnrich.length) * 100)))
          setMzOrders(enriched)
        }).then((finalEnriched) => {
          setEnriching(false)
          setEnrichProgress(100)
        }).catch(() => setEnriching(false))
      }
    })
  }, [])

  // ─── Process Analytics ────────────────────────────────────────────────────────
  
  // Filter mzOrders based on periodo
  const now = new Date()
  let filteredOrders = mzOrders

  if (periodo === 'Hoje') {
    filteredOrders = mzOrders.filter(o => new Date(o.data).toDateString() === now.toDateString())
  } else if (periodo === 'Últimos 7 Dias') {
    const d = new Date(); d.setDate(d.getDate() - 7)
    filteredOrders = mzOrders.filter(o => new Date(o.data) >= d)
  } else if (periodo === 'Últimos 30 Dias') {
    const d = new Date(); d.setDate(d.getDate() - 30)
    filteredOrders = mzOrders.filter(o => new Date(o.data) >= d)
  } else if (periodo === 'Este Mês') {
    filteredOrders = mzOrders.filter(o => {
      const d = new Date(o.data)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
  } else if (periodo === 'Trimestre') {
    const d = new Date(); d.setMonth(d.getMonth() - 3)
    filteredOrders = mzOrders.filter(o => new Date(o.data) >= d)
  } else if (periodo === 'Ano') {
    filteredOrders = mzOrders.filter(o => new Date(o.data).getFullYear() === now.getFullYear())
  }

  // Calculate KPIs
  let fatMz = 0
  filteredOrders.forEach(o => fatMz += o.valor)
  const totalMzCount = filteredOrders.length
  const currentTicketMedio = totalMzCount > 0 ? fatMz / totalMzCount : 0

  // Channels
  const channelsMap = new Map<string, { valor: number, pedidos: number }>()
  filteredOrders.forEach(o => {
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
  const productsMap = new Map<string, { value: number, sku?: string, fotoUrl?: string, tamanho?: string }>()
  const categoriesSet = new Set<string>()

  const getProductCategory = (name: string) => {
    const n = name.toUpperCase()
    if (n.includes('KIT COBRE LEITO') || n.includes('COBRE LEITO')) return 'Cobre Leitos'
    if (n.includes('JOGO DE CAMA') || n.includes('LENÇOL') || n.includes('LENCÓL') || n.includes('LENCOL')) return 'Cama e Lençóis'
    if (n.includes('CORTINA')) return 'Cortinas'
    if (n.includes('TAPETE')) return 'Tapetes'
    if (n.includes('TOALHA')) return 'Banho e Toalhas'
    if (n.includes('CAPA')) return 'Capas Diversas'
    if (n.includes('EDREDOM')) return 'Edredons'
    if (n.includes('MANTA') || n.includes('COBERTOR')) return 'Cobertores e Mantas'
    if (n.includes('TRAVESSEIRO') || n.includes('FRONHA') || n.includes('ALMOFADA')) return 'Travesseiros e Almofadas'
    if (n.startsWith('KIT')) return 'Kits Diversos'
    return 'Outros'
  }

  filteredOrders.forEach(o => {
    (o.produtos || []).forEach(p => {
      const cat = getProductCategory(p.nome)
      categoriesSet.add(cat)
      
      if (categoryFilter === 'Todas' || categoryFilter === cat) {
        let sku = p.sku
        let fotoUrl = p.fotoUrl
        let tamanho = p.tamanho

        // Fallback para allOrdersDB
        if (!fotoUrl || !sku) {
          const dbMatch = allOrdersDB.find((dbOrder: any) => dbOrder.produto && dbOrder.produto.trim().toLowerCase() === p.nome.trim().toLowerCase())
          if (dbMatch) {
            if (!sku && dbMatch.sku) sku = dbMatch.sku
            if (!fotoUrl && dbMatch.foto_url) fotoUrl = dbMatch.foto_url
            if (!tamanho && dbMatch.tamanho) tamanho = dbMatch.tamanho
          }
        }

        // Fallback para Catalogo
        if (!fotoUrl || !sku) {
          const catMatch = catalogo.find((c: any) => p.nome.toLowerCase().includes(c.nome.toLowerCase()))
          if (catMatch) {
            if (!sku && catMatch.codigo) sku = catMatch.codigo
            if (!fotoUrl && catMatch.foto_url) fotoUrl = catMatch.foto_url
            if (!tamanho && catMatch.tamanho) tamanho = catMatch.tamanho
          }
        }

        const cur = productsMap.get(p.nome) || { value: 0, sku, fotoUrl, tamanho }
        cur.value += p.qtd
        if (!cur.sku && sku) cur.sku = sku
        if (!cur.fotoUrl && fotoUrl) cur.fotoUrl = fotoUrl
        if (!cur.tamanho && tamanho) cur.tamanho = tamanho
        productsMap.set(p.nome, cur)
      }
    })
  })
  
  const uniqueCategories = Array.from(categoriesSet).sort()

  const topProducts = Array.from(productsMap.entries())
    .map(([name, data]) => ({ name, value: data.value, sku: data.sku, fotoUrl: data.fotoUrl, tamanho: data.tamanho }))
    .sort((a,b) => b.value - a.value)
    .slice(0, 20)

  // Calculate Map Metrics
  const stateMetricsMap = new Map<string, { faturamento: number; freteTotal: number; pedidos: number }>()
  Object.keys(STATE_NAMES).forEach(uf => {
    stateMetricsMap.set(uf, { faturamento: 0, freteTotal: 0, pedidos: 0 })
  })
  
  filteredOrders.forEach(o => {
    if (!o.uf || !stateMetricsMap.has(o.uf)) return
    const s = stateMetricsMap.get(o.uf)!
    s.faturamento += o.valor || 0
    s.freteTotal += o.frete || 0
    s.pedidos += 1
  })

  const stateMetrics: Record<string, { uf: string; name: string; faturamento: number; freteTotal: number; pedidos: number; freteMedio: number; margemComprometida: number; lucroLíquido: number }> = {}
  stateMetricsMap.forEach((data, uf) => {
    stateMetrics[uf] = {
      uf,
      name: STATE_NAMES[uf as keyof typeof STATE_NAMES] || uf,
      faturamento: data.faturamento,
      freteTotal: data.freteTotal,
      pedidos: data.pedidos,
      freteMedio: data.pedidos > 0 ? data.freteTotal / data.pedidos : 0,
      margemComprometida: data.faturamento > 0 ? (data.freteTotal / data.faturamento) * 100 : 0,
      lucroLíquido: data.faturamento - data.freteTotal
    }
  })

  // Se houver UF filtrada, aplicamos no channelStats e topProducts (Opcional, mas não faremos pra não complicar, mantemos simples)
  // Ou podemos aplicar se selectedState estiver setado. Para simplificar, vou manter como os KPIs gerais e o map lado a lado.

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

        {/* Top Header com Progresso de Enriquecimento se existir */}
        {enriching && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-4 py-2 rounded-xl mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="font-medium">Atualizando localizações e frete dos pedidos Magazord...</span>
            </div>
            <span className="font-bold">{enrichProgress}%</span>
          </div>
        )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: `FATURAMENTO (${periodo.toUpperCase()})`,   value: fmt(fatMz),              tag: 'Magazord',    tagColor: 'text-amber-700 bg-amber-100',   icon: TrendingUp,    iconBg: '#fef3c7', iconColor: '#d97706',  onClick: () => navigate('/lar-e-vida/financial') },
          { label: `PEDIDOS (${periodo.toUpperCase()})`,       value: String(totalMzCount),    tag: 'Magazord',    tagColor: 'text-stone-700 bg-stone-100',   icon: ShoppingCart,  iconBg: '#f5f5f4', iconColor: '#78716c',  onClick: () => navigate('/lar-e-vida/production') },
          { label: `TICKET MÉDIO (${periodo.toUpperCase()})`,  value: fmt(currentTicketMedio), tag: 'Magazord',    tagColor: 'text-orange-700 bg-orange-100', icon: TrendingUp,    iconBg: '#ffedd5', iconColor: '#ea580c',  onClick: () => navigate('/lar-e-vida/financial') },
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
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                <Package size={20} className="text-orange-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-lg">Top Produtos Vendidos</h2>
                <p className="text-xs text-gray-400">Inteligência baseada em requisições Magazord.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs font-semibold bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-800 cursor-pointer"
              >
                <option value="Todas">Todas as Categorias</option>
                {uniqueCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          
          {loadingMz ? (
            <div className="py-12 text-center text-sm text-gray-400">Carregando...</div>
          ) : (
            <div className="overflow-y-auto max-h-[500px] mt-4 pr-1">
              <div className="flex flex-col gap-3">
                {topProducts.map((p, idx) => {
                  const maxVal = topProducts[0]?.value || 1
                  const pct = Math.min(100, Math.round((p.value / maxVal) * 100))
                  return (
                    <div key={idx} className="flex flex-col gap-1.5 bg-gray-50 rounded-lg p-2.5 border border-gray-100 hover:border-orange-200 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {p.fotoUrl ? (
                            <img src={p.fotoUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={20} className="text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-bold text-gray-800 leading-tight mb-1">{p.name}</h3>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {p.sku && (
                              <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-semibold tracking-tight border border-orange-200">
                                SKU: {p.sku}
                              </span>
                            )}
                            {p.tamanho && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                {p.tamanho}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="text-sm font-black text-orange-600">{p.value}</span>
                          <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">vendas</span>
                        </div>
                      </div>
                      
                      {/* Bar */}
                      <div className="mt-1 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 rounded-full" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Map / Faturamento por Estado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-4">
            <h2 className="font-bold text-gray-800 text-lg">Faturamento por Estado</h2>
            <div className="flex items-center gap-2">
              <select
                value={metricType}
                onChange={(e) => setMetricType(e.target.value as any)}
                className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 cursor-pointer"
              >
                <option value="faturamento">Faturamento (R$)</option>
                <option value="pedidos">Número de Pedidos</option>
              </select>
            </div>
          </div>
          <div className="w-full flex-1 min-h-[300px]">
            <BrazilMap
              stateMetrics={stateMetrics}
              metricType={metricType}
              selectedState={selectedState}
              onSelectState={setSelectedState}
            />
          </div>
          <div className="w-full text-center mt-3 text-[10px] text-gray-400 font-medium">
            {selectedState ? (
              <span>Filtrado por: <strong className="text-blue-600">{STATE_NAMES[selectedState]} ({selectedState})</strong>.</span>
            ) : (
              <span>Passe o mouse para detalhes. Clique para selecionar.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
