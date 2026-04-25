import { useState, useEffect, useMemo } from 'react'
import { Plus, CreditCard as CardIcon, Calendar, Info, Trash2, ArrowRight } from 'lucide-react'
import { getCards, saveCard, deleteCard, getCardExpenses, addCardExpense, CreditCard, CardExpense, deleteSingleExpense } from '../../services/dbCards'

const RESPONSAVEIS = ['Mário', 'Johnatan', 'Empresa']

export default function Cards() {
  const [cards, setCards] = useState<CreditCard[]>([])
  const [expenses, setExpenses] = useState<CardExpense[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  
  // Modals
  const [showAddCard, setShowAddCard] = useState(false)
  const [showAddExp, setShowAddExp] = useState(false)

  // Add Card Form
  const [cardForm, setCardForm] = useState({ name: '', network: 'mastercard', last4: '', limit: '', color: '#1d4ed8' })

  // Add Expense Form
  const [expForm, setExpForm] = useState({
    cardId: '', description: '', value: '', installments: 1, isInstallment: false,
    responsible: 'Empresa', date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadData()
    const now = new Date()
    setSelectedMonth(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`)
  }, [])

  const loadData = () => {
    setCards(getCards())
    setExpenses(getCardExpenses())
  }

  const handleSaveCard = () => {
    if (!cardForm.name || !cardForm.last4 || !cardForm.limit) return
    saveCard({
       id: Date.now().toString(),
       name: cardForm.name,
       network: cardForm.network as any,
       last4: cardForm.last4,
       limit: parseFloat(cardForm.limit),
       color: cardForm.color
    })
    setShowAddCard(false)
    setCardForm({ name: '', network: 'mastercard', last4: '', limit: '', color: '#1d4ed8' })
    loadData()
  }

  const handleDeleteCard = (id: string) => {
    if(!window.confirm('Excluir este cartão permanentemente?')) return
    deleteCard(id)
    loadData()
  }

  const handleSaveExp = () => {
    if (!expForm.cardId || !expForm.description || !expForm.value) return
    const now = new Date(expForm.date + 'T12:00:00')
    const startInv = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`

    addCardExpense({
      cardId: expForm.cardId,
      description: expForm.description,
      value: parseFloat(expForm.value),
      installments: expForm.isInstallment ? Number(expForm.installments) : 1,
      responsible: expForm.responsible as any,
      date: expForm.date,
      firstInvoiceMonth: startInv
    })
    setShowAddExp(false)
    setExpForm({
      cardId: cards[0]?.id || '', description: '', value: '', installments: 1, isInstallment: false,
      responsible: 'Empresa', date: new Date().toISOString().split('T')[0]
    })
    loadData()
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.invoiceMonth === selectedMonth)
  }, [expenses, selectedMonth])

  const totalInvoice = filteredExpenses.reduce((acc, curr) => acc + curr.installmentValue, 0)

  // Get months array for dropdown (from this year and next year)
  const availableMonths = useMemo(() => {
    const list = []
    const now = new Date()
    for(let i = -2; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
        list.push(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`)
    }
    return list
  }, [])

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <div className="p-6 border-b border-gray-100 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CardIcon className="text-navy-600" /> Gestão de Cartões
          </h1>
          <p className="text-sm text-gray-500 mt-1">Acompanhe limites, gastos e faturas dos cartões corporativos.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddCard(true)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">
            Adicionar Cartão
          </button>
          <button onClick={() => setShowAddExp(true)} className="px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 transition-colors flex items-center gap-2 shadow-sm">
            <Plus size={16} /> Lançar Gasto
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Cards Portfolio */}
        <div className="w-full md:w-80 flex-shrink-0 space-y-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest pl-1">Meus Cartões</h2>
          
          <div className="space-y-4">
            {cards.map(card => {
               // Calculate consumed limit for this card across ALL future and current expenses (simplification: summing all unpaid, but for now we just sum all its expenses generally or show visually)
               const cardExps = expenses.filter(e => e.cardId === card.id)
               const localConsumido = cardExps.reduce((acc, curr) => acc + curr.installmentValue, 0)
               const disponivel = card.limit - localConsumido

               return (
                  <div key={card.id} className="relative rounded-2xl p-5 shadow-lg shadow-gray-200/50 flex flex-col justify-between overflow-hidden group min-h-[180px]" style={{ backgroundColor: card.color }}>
                     <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                     <div className="relative z-10 flex justify-between items-start text-white">
                        <span className="font-semibold tracking-wide text-white/90 drop-shadow-sm">{card.name}</span>
                        <button onClick={() => handleDeleteCard(card.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded">
                           <Trash2 size={14} className="text-white/80" />
                        </button>
                     </div>
                     <div className="relative z-10 mt-6">
                        <div className="text-white/70 font-mono text-sm tracking-widest">**** **** **** {card.last4}</div>
                     </div>
                     <div className="relative z-10 mt-6 flex justify-between items-end">
                        <div>
                           <div className="text-white/60 text-[10px] font-bold uppercase mb-0.5">Limite Disponível</div>
                           <div className="text-white font-bold text-lg">R$ {disponivel.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                        </div>
                        <div className="text-white/80 font-bold uppercase text-[10px] bg-white/10 px-2 py-1 rounded backdrop-blur-md">
                           {card.network}
                        </div>
                     </div>
                  </div>
               )
            })}

            {cards.length === 0 && (
               <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center text-gray-400">
                 <CardIcon size={32} className="mb-2 opacity-50" />
                 <p className="text-sm font-medium">Nenhum cartão cadastrado</p>
               </div>
            )}
          </div>
        </div>

        {/* Right Column: Invoice Timeline */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h2 className="text-lg font-black text-gray-900 border-l-4 border-navy-500 pl-3">Fatura do Mês</h2>
                 <p className="text-xs text-gray-500 ml-4 border-l-4 border-transparent mt-1">Lançamentos e parcelamentos atuantes.</p>
              </div>
              <div className="flex items-center gap-3">
                 <select 
                    className="border-gray-200 rounded-lg text-sm font-medium py-1.5 focus:ring-navy-500 focus:border-navy-500"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                 >
                    {availableMonths.map(m => (
                       <option key={m} value={m}>{m.split('-')[1]}/{m.split('-')[0]}</option>
                    ))}
                 </select>
              </div>
           </div>

           <div className="bg-gray-50 rounded-xl p-4 mb-6 flex justify-between items-center border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                 <Calendar className="text-gray-400" size={18} />
                 <span className="text-sm font-semibold">Total Projetado p/ Fatura</span>
              </div>
              <span className="text-2xl font-black text-navy-700">
                 R$ {totalInvoice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
           </div>

           <div className="flex-1 overflow-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                     <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3">Cartão</th>
                        <th className="px-4 py-3 text-center">Parcela</th>
                        <th className="px-4 py-3 text-center">Responsável</th>
                        <th className="px-4 py-3 text-right">Valor Mês</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {filteredExpenses.length === 0 ? (
                        <tr>
                           <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                              Nenhum gasto alocado na fatura deste mês.
                           </td>
                        </tr>
                     ) : filteredExpenses.map(e => {
                        const cardAssoc = cards.find(c => c.id === e.cardId)
                        return (
                           <tr key={e.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-500 font-medium">
                                 {e.date.split('-').reverse().join('/')}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-900">
                                 {e.description}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                 <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cardAssoc?.color || '#ccc' }} />
                                    {cardAssoc?.name || 'Desconhecido'}
                                 </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                 {e.installments > 1 ? (
                                    <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-[10px] font-bold">
                                       {e.currentInstallment} / {e.installments}
                                    </span>
                                 ) : (
                                    <span className="text-gray-400 text-xs">À Vista</span>
                                 )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                 <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${e.responsible === 'Empresa' ? 'bg-gray-100 text-gray-700 border-gray-200' : e.responsible === 'Mário' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                    {e.responsible}
                                 </span>
                              </td>
                              <td className="px-4 py-3 text-right font-black text-gray-900">
                                 R$ {e.installmentValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                 <button onClick={() => {if(confirm('Apagar esta parcela específica da fatura?')) { deleteSingleExpense(e.id); loadData() }}} className="ml-2 text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={13} className="inline" />
                                 </button>
                              </td>
                           </tr>
                        )
                     })}
                  </tbody>
              </table>
           </div>
        </div>

      </div>

      {/* --- ADD CARD MODAL --- */}
      {showAddCard && (
         <div className="fixed inset-0 z-[100] flex justify-end bg-navy-900/40 backdrop-blur-sm cursor-auto">
           <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col cursor-auto animate-slide-in-right">
             <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
               <h3 className="font-bold text-gray-900 flex items-center gap-2">Novo Cartão</h3>
               <button onClick={() => setShowAddCard(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                 <ArrowRight size={20} />
               </button>
             </div>
             <div className="p-6 overflow-y-auto flex-1 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Apelido (Nome)</label>
                  <input type="text" value={cardForm.name} onChange={e => setCardForm({...cardForm, name: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm focus:ring-navy-500 focus:border-navy-500" placeholder="ex: Itaú PJ" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-700 mb-1">Bandeira</label>
                     <select value={cardForm.network} onChange={e => setCardForm({...cardForm, network: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm focus:ring-navy-500 focus:border-navy-500">
                        <option value="mastercard">Mastercard</option>
                        <option value="visa">Visa</option>
                        <option value="amex">Amex</option>
                        <option value="elo">Elo</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-700 mb-1">Final (4 digitos)</label>
                     <input type="text" maxLength={4} value={cardForm.last4} onChange={e => setCardForm({...cardForm, last4: e.target.value.replace(/\D/g, '')})} className="w-full border-gray-300 rounded-lg text-sm focus:ring-navy-500 focus:border-navy-500" placeholder="0000" />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Limite Total do Cartão</label>
                  <input type="number" value={cardForm.limit} onChange={e => setCardForm({...cardForm, limit: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm focus:ring-navy-500 focus:border-navy-500" placeholder="0.00" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cor do Cartão</label>
                  <input type="color" value={cardForm.color} onChange={e => setCardForm({...cardForm, color: e.target.value})} className="w-full h-10 p-1 border border-gray-300 rounded-lg" />
               </div>
             </div>
             <div className="p-6 border-t border-gray-100 bg-gray-50/50">
               <button onClick={handleSaveCard} className="w-full py-3 bg-navy-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-navy-700 transition">Salvar Cartão</button>
             </div>
           </div>
         </div>
      )}

      {/* --- ADD EXPENSE MODAL --- */}
      {showAddExp && (
         <div className="fixed inset-0 z-[100] flex justify-end bg-navy-900/40 backdrop-blur-sm cursor-auto">
           <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col cursor-auto animate-slide-in-right">
             <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
               <h3 className="font-bold text-gray-900 flex items-center gap-2">Lançar Compra</h3>
               <button onClick={() => setShowAddExp(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                 <ArrowRight size={20} />
               </button>
             </div>
             <div className="p-6 overflow-y-auto flex-1 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cartão de Crédito</label>
                  <select value={expForm.cardId} onChange={e => setExpForm({...expForm, cardId: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm focus:ring-navy-500 focus:border-navy-500">
                     <option value="" disabled>Selecione um cartão...</option>
                     {cards.map(c => <option key={c.id} value={c.id}>{c.name} (Final {c.last4})</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Descrição</label>
                  <input type="text" value={expForm.description} onChange={e => setExpForm({...expForm, description: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm focus:ring-navy-500 focus:border-navy-500" placeholder="Ex: Passagem Rio x SP" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Valor Total</label>
                  <input type="number" value={expForm.value} onChange={e => setExpForm({...expForm, value: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm focus:ring-navy-500 focus:border-navy-500" placeholder="0.00" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-700 mb-1">Tipo Lançamento</label>
                     <select value={expForm.isInstallment ? 'true' : 'false'} onChange={e => setExpForm({...expForm, isInstallment: e.target.value === 'true'})} className="w-full border-gray-300 rounded-lg text-sm focus:ring-navy-500 focus:border-navy-500">
                        <option value="false">À Vista (1x)</option>
                        <option value="true">Parcelado</option>
                     </select>
                  </div>
                  {expForm.isInstallment && (
                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Qtd Parcelas</label>
                        <input type="number" min="2" max="24" value={expForm.installments} onChange={e => setExpForm({...expForm, installments: parseInt(e.target.value)})} className="w-full border-gray-300 rounded-lg text-sm focus:ring-navy-500 focus:border-navy-500" />
                     </div>
                  )}
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-700 mb-1">Data da Compra</label>
                     <input type="date" value={expForm.date} onChange={e => setExpForm({...expForm, date: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm focus:ring-navy-500 focus:border-navy-500" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-700 mb-1">Responsável CC</label>
                     <select value={expForm.responsible} onChange={e => setExpForm({...expForm, responsible: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm focus:ring-navy-500 focus:border-navy-500">
                        <option value="Empresa">Empresa</option>
                        <option value="Mário">Mário</option>
                        <option value="Johnatan">Johnatan</option>
                     </select>
                  </div>
               </div>

               {expForm.isInstallment && expForm.value && expForm.installments > 1 && (
                  <div className="mt-4 bg-navy-50 text-navy-700 p-3 rounded-lg border border-navy-100 flex items-start gap-2 text-xs font-medium">
                     <Info size={14} className="shrink-0 mt-0.5" />
                     <p>O valor total será fragmentado em {expForm.installments} parcelas de <strong>R$ {(parseFloat(expForm.value)/expForm.installments).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong> projetadas a partir da fatura de {expForm.date.split('-').slice(0,2).reverse().join('/')}.</p>
                  </div>
               )}
             </div>
             <div className="p-6 border-t border-gray-100 bg-gray-50/50">
               <button onClick={handleSaveExp} className="w-full py-3 bg-navy-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-navy-700 transition">Confirmar Lançamento</button>
             </div>
           </div>
         </div>
      )}
    </div>
  )
}
