import { useState, useEffect } from 'react'
import { Printer, Download, Filter, FileText } from 'lucide-react'
import { getEntries } from '../../services/dbLocal'

export default function Dre() {
  const [data, setData] = useState({
    receitaBruta: 0,
    deducoes: 0,
    receitaLiquida: 0,
    cmv: 0,
    lucroBruto: 0,
    despesasOperacionais: 0,
    lucroLiquido: 0
  })

  useEffect(() => {
    // Cálculo em cima do banco mockado cruzado
    const entries = getEntries().filter(e => e.status === 'pago') // DRE de regime de caixa para simplificar aqui
    
    // Categorias Mockadas (Mapeamento Simulado do Plano de Contas)
    const receitaBruta = entries.filter(e => e.tipo === 'recebimento' && (e.categoria.includes('Venda') || e.categoria.includes('Receita'))).reduce((a,b) => a+b.valor, 0)
    const deducoes = entries.filter(e => e.tipo === 'pagamento' && e.categoria.includes('Imposto')).reduce((a,b) => a+b.valor, 0)
    
    const receitaLiquida = receitaBruta - deducoes
    
    const cmv = entries.filter(e => e.tipo === 'pagamento' && e.categoria.includes('Fornecedor')).reduce((a,b) => a+b.valor, 0)
    const lucroBruto = receitaLiquida - cmv
    
    const despesasOperacionais = entries.filter(e => e.tipo === 'pagamento' && !e.categoria.includes('Fornecedor') && !e.categoria.includes('Imposto')).reduce((a,b) => a+b.valor, 0)
    
    const lucroLiquido = lucroBruto - despesasOperacionais

    setData({
      receitaBruta, deducoes, receitaLiquida, cmv, lucroBruto, despesasOperacionais, lucroLiquido
    })
  }, [])

  const fmt = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const pct = (val: number, base: number) => base ? `${((val / base) * 100).toFixed(1)}%` : '0%'

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="border-b border-gray-100 px-6 py-5 flex items-center justify-between shrink-0 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">DRE Gerencial</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-medium tracking-wider">Demonstração do Resultado do Exercício</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Filter size={14} /> Período: Outubro 26</button>
          <button className="btn-secondary"><Download size={14} /> Exportar</button>
          <button className="btn-secondary"><Printer size={14} /> Imprimir</button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto w-full max-w-4xl mx-auto">
        <div className="card text-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <FileText size={16} className="text-navy-600" />
            <span className="font-bold text-gray-700">Competência Analítica — Consolidado</span>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-2/3">Estrutura DRE</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Valor R$</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest w-24">AV %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              
              <tr className="hover:bg-gray-50 text-blue-900">
                <td className="py-3 px-4 font-bold">1. RECEITA OPERACIONAL BRUTA</td>
                <td className="py-3 px-4 text-right font-bold">{fmt(data.receitaBruta)}</td>
                <td className="py-3 px-4 text-right text-xs text-gray-400">100.0%</td>
              </tr>
              
              <tr className="hover:bg-gray-50 text-red-700">
                <td className="py-2 px-4 pl-8 text-xs">(-) Deduções e Impostos sobre Venda</td>
                <td className="py-2 px-4 text-right text-xs">{fmt(data.deducoes)}</td>
                <td className="py-2 px-4 text-right text-[11px] text-gray-400">{pct(data.deducoes, data.receitaBruta)}</td>
              </tr>
              
              <tr className="hover:bg-gray-50 text-blue-900 bg-blue-50/30">
                <td className="py-3 px-4 font-bold">2. RECEITA OPERACIONAL LÍQUIDA</td>
                <td className="py-3 px-4 text-right font-bold">{fmt(data.receitaLiquida)}</td>
                <td className="py-3 px-4 text-right text-[11px] text-gray-400 font-bold">{pct(data.receitaLiquida, data.receitaBruta)}</td>
              </tr>

              <tr className="hover:bg-gray-50 text-red-700">
                <td className="py-2 px-4 pl-8 text-xs">(-) Custos (CMV / CPV / Fornecedores)</td>
                <td className="py-2 px-4 text-right text-xs">{fmt(data.cmv)}</td>
                <td className="py-2 px-4 text-right text-[11px] text-gray-400">{pct(data.cmv, data.receitaBruta)}</td>
              </tr>

              <tr className="hover:bg-gray-50 text-gray-900 bg-gray-50">
                <td className="py-3 px-4 font-bold">3. RESULTADO BRUTO (LUCRO BRUTO)</td>
                <td className="py-3 px-4 text-right font-bold">{fmt(data.lucroBruto)}</td>
                <td className="py-3 px-4 text-right text-[11px] text-gray-400 font-bold">{pct(data.lucroBruto, data.receitaBruta)}</td>
              </tr>

              <tr className="hover:bg-gray-50 text-red-700">
                <td className="py-2 px-4 pl-8 text-xs">(-) Despesas Operacionais (Folha, Ferramentas, Manutenção)</td>
                <td className="py-2 px-4 text-right text-xs">{fmt(data.despesasOperacionais)}</td>
                <td className="py-2 px-4 text-right text-[11px] text-gray-400">{pct(data.despesasOperacionais, data.receitaBruta)}</td>
              </tr>

              <tr className={`hover:bg-gray-50 font-black text-lg ${data.lucroLiquido >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                <td className="py-4 px-4 uppercase tracking-widest">= RESULTADO LÍQUIDO DO EXERCÍCIO</td>
                <td className="py-4 px-4 text-right">{fmt(data.lucroLiquido)}</td>
                <td className="py-4 px-4 text-right text-sm text-gray-600 bg-transparent">{pct(data.lucroLiquido, data.receitaBruta)}</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
