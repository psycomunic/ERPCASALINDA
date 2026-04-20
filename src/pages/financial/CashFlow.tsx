import { useState, useEffect } from 'react'
import { Filter, Download, LineChart as ChartIcon, BarChart3 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getEntries } from '../../services/dbLocal'

export default function CashFlow() {
  const [data, setData] = useState<{date: string, entradas: number, saidas: number, saldo: number}[]>([])
  const [totals, setTotals] = useState({ e: 0, s: 0, sal: 0 })

  useEffect(() => {
    const entries = getEntries()
    // Group by Date
    const grouped: Record<string, { e: number, s: number }> = {}
    
    entries.forEach(entry => {
      // Use dataPagamento if paid, else dataVencimento
      const targetDate = (entry.status === 'pago' ? entry.dataPagamento : entry.dataVencimento) || entry.dataVencimento
      if (!grouped[targetDate]) grouped[targetDate] = { e: 0, s: 0 }
      if (entry.tipo === 'recebimento') grouped[targetDate].e += entry.valor
      else grouped[targetDate].s += entry.valor
    })

    const sortedDates = Object.keys(grouped).sort()
    let accum = 0
    let te = 0, ts = 0
    
    const chartData = sortedDates.map(date => {
      const g = grouped[date]
      te += g.e
      ts += g.s
      accum += (g.e - g.s)
      return {
        date: date.split('-').reverse().slice(0, 2).join('/'),
        entradas: g.e,
        saidas: g.s,
        saldo: accum
      }
    })

    setData(chartData)
    setTotals({ e: te, s: ts, sal: accum })
  }, [])

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="border-b border-gray-100 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Fluxo de Caixa</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-medium tracking-wider">Projeção e Realizado (Diário)</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Filter size={14} /> Filtros Rápidos</button>
          <button className="btn-secondary"><Download size={14} /> Relatório PDF</button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto w-full max-w-5xl mx-auto space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Entradas (Período)</p>
            <p className="text-2xl font-black text-emerald-600">{fmt(totals.e)}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Saídas (Período)</p>
            <p className="text-2xl font-black text-red-600">{fmt(totals.s)}</p>
          </div>
          <div className="card p-5 border-l-4 border-l-navy-600">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Resultado (Caixa)</p>
            <p className={`text-2xl font-black ${totals.sal >= 0 ? 'text-navy-900' : 'text-red-600'}`}>{fmt(totals.sal)}</p>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-6 flex items-center gap-2"><BarChart3 size={16} className="text-navy-600" /> Gráfico de Movimentação Financeira</h3>
          
          <div className="h-72 w-full">
            {data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">Não há dados suficientes para gerar o gráfico neste período.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dx={-10} tickFormatter={v => `R$${(v/1000)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                  />
                  <Area type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEntradas)" />
                  <Area type="monotone" dataKey="saidas" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSaidas)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card overflow-x-auto w-full">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4 text-right">Entradas</th>
                <th className="py-3 px-4 text-right">Saídas</th>
                <th className="py-3 px-4 text-right">Saldo do Dia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((d, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-bold text-gray-700">{d.date}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-medium">+ {d.entradas.toLocaleString('pt-BR')}</td>
                  <td className="py-3 px-4 text-right text-red-600 font-medium">- {d.saidas.toLocaleString('pt-BR')}</td>
                  <td className="py-3 px-4 text-right font-black text-gray-900">{d.saldo.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
