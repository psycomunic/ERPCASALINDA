import { useState } from 'react'
import { Inbox, UploadCloud, CheckCircle, ArrowRight, FileText, Banknote } from 'lucide-react'
import { getEntries } from '../../services/dbLocal'

export default function Conciliation() {
  const [extratoAberto, setExtratoAberto] = useState(false)
  const pendentesERP = getEntries().filter(e => e.status !== 'pago')

  // Falso extrato de banco OFX parseado
  const mockExtrato = [
    { id: 1, data: '05/10/2026', desc: 'PIX RECEBIDO SHOPEE', val: 8900.0, conciliado: false },
    { id: 2, data: '05/10/2026', desc: 'PAG DEBITO: FOLHA', val: -18000.0, conciliado: true },
    { id: 3, data: '06/10/2026', desc: 'TED RECEBIDO TRAY', val: 15400.0, conciliado: false },
    { id: 4, data: '08/10/2026', desc: 'PAG BOLETO MADEIRA', val: -12500.5, conciliado: false },
  ]

  const [matches, setMatches] = useState<number[]>([2])

  const toggleMatch = (id: number) => {
    setMatches(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="border-b border-gray-100 px-6 py-5 shrink-0 bg-white flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Conciliação Bancária</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-medium tracking-wider">Conta Corrente: Itaú PJ Principal</p>
        </div>
        <button onClick={() => setExtratoAberto(true)} className="btn-primary"><UploadCloud size={14} /> Importar OFX</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LADO ESQUERDO: EXTRATO DO BANCO */}
        <div className="w-1/2 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-100 font-bold text-gray-700 text-sm flex items-center gap-2">
            <Banknote size={16} className="text-blue-600" /> Extrato Bancário (Ofx)
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {!extratoAberto ? (
               <div className="flex flex-col items-center justify-center h-full text-center p-8">
                 <div className="w-16 h-16 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-300 mb-4">
                   <Inbox size={24} />
                 </div>
                 <p className="text-sm font-bold text-gray-600">Nenhum extrato importado</p>
                 <p className="text-xs text-gray-400 max-w-xs mt-2">Faça o upload do seu arquivo .OFX exportado do banco para realizar o cruzamento.</p>
                 <button onClick={() => setExtratoAberto(true)} className="mt-4 text-xs font-bold text-navy-600 underline">Simular Importação</button>
               </div>
            ) : (
               mockExtrato.map(ex => (
                 <div key={ex.id} 
                      onClick={() => toggleMatch(ex.id)}
                      className={`card p-3 cursor-pointer border-2 transition-all flex items-center ${matches.includes(ex.id) ? 'border-green-500 bg-green-50' : 'border-transparent hover:border-blue-300'}`}>
                   <div className="flex-1">
                     <p className="text-[10px] text-gray-400 font-bold">{ex.data}</p>
                     <p className="text-xs font-bold text-gray-900">{ex.desc}</p>
                   </div>
                   <p className={`font-black tracking-tight ${ex.val > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                     {ex.val > 0 ? '+' : '-'} R$ {Math.abs(ex.val).toLocaleString('pt-BR', {minimumFractionDigits:2})}
                   </p>
                   {matches.includes(ex.id) && <CheckCircle size={14} className="ml-3 text-green-500" />}
                 </div>
               ))
            )}
          </div>
        </div>

        {/* LADO DIREITO: ERP */}
        <div className="w-1/2 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white font-bold text-gray-700 text-sm flex items-center gap-2">
            <FileText size={16} className="text-navy-600" /> Sistema (A Receber / A Pagar)
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {pendentesERP.length === 0 ? (
               <p className="text-center text-xs text-gray-400 mt-10">Tudo limpo! Não há lançamentos pendentes no sistema.</p>
            ) : pendentesERP.map(p => (
               <div key={p.id} className="border border-gray-200 rounded-xl p-3 flex group hover:border-gray-300 transition-colors">
                 <div className="w-8 flex items-center justify-center shrink-0">
                   <div className="w-4 h-4 rounded border-2 border-gray-300 group-hover:border-navy-500" />
                 </div>
                 <div className="flex-1">
                   <p className="text-[10px] text-gray-400 font-bold uppercase">{p.tipo} — Venc. {p.dataVencimento.split('-').reverse().join('/')}</p>
                   <p className="text-xs font-bold text-gray-900">{p.fornecedor_cliente}</p>
                 </div>
                 <p className={`font-black pt-2 ${p.tipo === 'recebimento' ? 'text-blue-600' : 'text-red-600'}`}>
                     R$ {p.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                 </p>
               </div>
            ))}
          </div>
        </div>
      </div>
{/* 
      <div className="bg-navy-900 text-white p-4 flex justify-between items-center text-sm font-bold shrink-0">
        <p>1 match efetuado de R$ 18.000,00</p>
        <button className="bg-white text-navy-900 px-4 py-2 rounded-lg text-xs flex items-center gap-2"><CheckCircle size={14} /> Efetivar Conciliação (1)</button>
      </div> */}
    </div>
  )
}
