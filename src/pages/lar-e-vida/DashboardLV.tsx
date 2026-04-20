import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingUp, AlertTriangle, Clock, ShoppingCart,
  UserPlus, Receipt, ArrowRight, Download, ChevronDown,
  Package, BarChart2, Sofa
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { fetchPedidosLV } from '../../services/pedidosLV'

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`
const PERIODOS = ['Últimos 7 Dias', 'Últimos 30 Dias', 'Este Mês', 'Trimestre', 'Ano']

export default function DashboardLV() {
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState('Este Mês')
  const [showPeriodo, setShowPeriodo] = useState(false)

  // KPI States
  const [faturamento, setFaturamento]       = useState(0)
  const [totalPedidos, setTotalPedidos]     = useState(0)
  const [pedidosAtrasados, setPedidosAtrasados] = useState(0)
  const [ticketMedio, setTicketMedio]       = useState(0)
  const [pedidosAndamento, setPedidosAndamento] = useState(0)
  const [capacidade, setCapacidade]         = useState(0)

  useEffect(() => {
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

      setFaturamento(fat)
      setTotalPedidos(total)
      setPedidosAtrasados(atrasados)
      setTicketMedio(total > 0 ? fat / total : 0)
      setPedidosAndamento(andamento)
      setCapacidade(Math.min(Math.round((andamento / 30) * 100), 100))
    }).catch(() => {})
  }, [])

  // Categorias de produto placeholder (vazias — usuário preenche)
  const categorias = [
    { label: 'Tapetes',     count: 0, color: '#b45309' },
    { label: 'Quadros',     count: 0, color: '#92400e' },
    { label: 'Cama/Mesa',   count: 0, color: '#d97706' },
    { label: 'Almofadas',   count: 0, color: '#ca8a04' },
    { label: 'Outros',      count: 0, color: '#a16207' },
  ]

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
          <p className="text-sm text-gray-500">Painel executivo de decoração e utilidades para o lar.</p>
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
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${periodo === p ? 'font-semibold' : 'text-gray-700'}`}
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
          { label: 'FATURAMENTO MENSAL',  value: fmt(faturamento),        tag: 'Este mês',    tagColor: 'text-amber-700 bg-amber-100',   icon: TrendingUp,    iconBg: '#fef3c7', iconColor: '#d97706',  onClick: () => navigate('/lar-e-vida/financial') },
          { label: 'PEDIDOS NO MÊS',      value: String(totalPedidos),    tag: 'Registrados', tagColor: 'text-stone-700 bg-stone-100',   icon: ShoppingCart,  iconBg: '#f5f5f4', iconColor: '#78716c',  onClick: () => navigate('/lar-e-vida/production') },
          { label: 'PEDIDOS ATRASADOS',   value: String(pedidosAtrasados),tag: pedidosAtrasados > 0 ? 'Atenção' : 'OK', tagColor: pedidosAtrasados > 0 ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100', icon: AlertTriangle, iconBg: pedidosAtrasados > 0 ? '#fee2e2' : '#dcfce7', iconColor: pedidosAtrasados > 0 ? '#dc2626' : '#16a34a', onClick: () => navigate('/lar-e-vida/production') },
          { label: 'TICKET MÉDIO (MÊS)',  value: fmt(ticketMedio),        tag: 'Por pedido',  tagColor: 'text-orange-700 bg-orange-100', icon: TrendingUp,    iconBg: '#ffedd5', iconColor: '#ea580c',  onClick: () => navigate('/lar-e-vida/financial') },
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

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Categorias chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Pedidos por Categoria</h2>
              <p className="text-xs text-gray-400">Volume acumulado — {periodo}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-medium">
              <BarChart2 size={12} /> Sem dados ainda
            </div>
          </div>

          {/* Empty state */}
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-3">
              <Package size={28} className="text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Nenhum pedido registrado ainda</p>
            <p className="text-xs text-gray-400 max-w-xs">
              Adicione pedidos manualmente na aba <strong>Produção/PCP</strong> para o gráfico ser preenchido automaticamente.
            </p>
            <button
              onClick={() => navigate('/lar-e-vida/production')}
              className="mt-4 flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <ShoppingCart size={14} /> Ir para Produção
            </button>
          </div>

          {/* Hidden chart — aparece quando tiver dados */}
          <div className="hidden">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categorias} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="count" name="Pedidos" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions + Status */}
        <div className="space-y-3">
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Atalhos Rápidos</p>
            <p className="text-xs text-gray-400 -mt-2 mb-3">Ações frequentes da Lar e Vida</p>
            {[
              { label: 'Novo Pedido',        sub: 'LANÇA VENDA MANUAL',         icon: ShoppingCart, to: '/lar-e-vida/production' },
              { label: 'Cadastrar Parceiro', sub: 'FORNECEDORES / ARTESÃOS',    icon: UserPlus,     to: '/partners' },
              { label: 'Lançar Despesa',     sub: 'CUSTOS FIXOS E VARIÁVEIS',   icon: Receipt,      to: '/lar-e-vida/financial' },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-amber-200 hover:bg-amber-50 transition-all mb-2 group"
              >
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

          {/* Status Card */}
          <div className="rounded-xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #92400e, #b45309)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#fde68a' }}>STATUS DA OPERAÇÃO</p>
            <p className="font-bold text-base">
              {pedidosAndamento === 0 ? 'Nenhum pedido em andamento' : `${capacidade}% da capacidade`}
            </p>
            <div className="mt-3 bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2 transition-all duration-1000" style={{ width: `${capacidade}%` }} />
            </div>
            <p className="text-xs mt-2" style={{ color: '#fde68a' }}>
              {pedidosAndamento} pedido{pedidosAndamento !== 1 ? 's' : ''} em andamento
            </p>
          </div>
        </div>
      </div>

      {/* Categorias rápidas */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
            <Package size={16} style={{ color: '#d97706' }} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Categorias de Produto</h2>
            <p className="text-xs text-gray-400">Distribuição de pedidos por linha de produto</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categorias.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50 transition-all cursor-pointer"
              onClick={() => navigate('/lar-e-vida/production')}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: cat.color + '20' }}>
                <Package size={18} style={{ color: cat.color }} />
              </div>
              <p className="text-xl font-black text-gray-900">{cat.count}</p>
              <p className="text-xs text-gray-500 font-medium text-center mt-0.5">{cat.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">pedidos</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            <strong>Dica:</strong> Adicione pedidos na tela de Produção para que as categorias sejam preenchidas automaticamente.
          </p>
        </div>
      </div>
    </div>
  )
}
