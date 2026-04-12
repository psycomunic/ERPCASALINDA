import { useState } from 'react'
import { useLayout } from '../contexts/LayoutContext'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, AlertTriangle, Clock,
  ShoppingCart, UserPlus, Receipt, ArrowRight, Download, X,
  Check, ChevronDown
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'

const cashflow: any[] = []

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`

const PERIODOS = ['Últimos 7 Dias', 'Últimos 30 Dias', 'Este Mês', 'Trimestre', 'Ano']

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

export default function Dashboard() {
  const { activeTab } = useLayout()
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState('Últimos 30 Dias')
  const [showPeriodo, setShowPeriodo] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

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
          { label: 'FATURAMENTO MENSAL',     value: 'R$ 0',      tag: '-',       tagColor: 'text-gray-500 bg-gray-100',  icon: TrendingUp,    iconColor: 'text-gray-400',   onClick: () => navigate('/financial') },
          { label: 'QUADROS PRODUZIDOS HOJE',value: '0',         tag: 'Meta: 20',tagColor: 'text-gray-500 bg-gray-100',  icon: ShoppingCart,  iconColor: 'text-gray-400',   onClick: () => navigate('/production') },
          { label: 'PEDIDOS ATRASADOS',      value: '0',         tag: 'Atenção', tagColor: 'text-gray-500 bg-gray-100',  icon: AlertTriangle, iconColor: 'text-gray-400',   onClick: () => navigate('/production') },
          { label: 'TICKET MÉDIO',           value: 'R$ 0',      tag: '-',       tagColor: 'text-gray-500 bg-gray-100',  icon: TrendingDown,  iconColor: 'text-gray-400',   onClick: () => navigate('/financial') },
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
            <p className="font-bold text-base">Capacidade de Produção em 85%</p>
            <div className="mt-3 bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2 w-[85%]" />
            </div>
            <p className="text-xs text-blue-200 mt-2">22 pedidos em andamento</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
