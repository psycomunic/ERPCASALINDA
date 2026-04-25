export interface CreditCard {
  id: string
  name: string // "Itaú Master", "Nubank PJ"
  network: 'mastercard' | 'visa' | 'amex' | 'elo'
  last4: string
  limit: number
  color: string
}

export interface CardExpense {
  id: string
  cardId: string
  description: string
  value: number // valor total da compra
  installments: number
  installmentValue: number
  currentInstallment: number // 1 de 3, 2 de 3, etc. Para uma compra originária, isso representa a parcela
  responsible: 'Mário' | 'Johnatan' | 'Empresa'
  date: string // Data da compra YYYY-MM-DD
  invoiceMonth: string // YYYY-MM correspondente à fatura em que vai aparecer
}

const CARDS_KEY = 'erp_cards_v1'
const EXPENSES_KEY = 'erp_card_expenses_v1'

export function getCards(): CreditCard[] {
  const data = localStorage.getItem(CARDS_KEY)
  if (!data) return [
    { id: '1', name: 'Itaú Empresa', network: 'mastercard', last4: '5432', limit: 30000, color: '#1d4ed8' },
    { id: '2', name: 'Nubank PJ', network: 'mastercard', last4: '8812', limit: 10000, color: '#9333ea' }
  ]
  return JSON.parse(data)
}

export function saveCard(card: CreditCard) {
  const cards = getCards()
  const exists = cards.findIndex(c => c.id === card.id)
  if (exists > -1) cards[exists] = card
  else cards.push(card)
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards))
}

export function deleteCard(id: string) {
  const cards = getCards().filter(c => c.id !== id)
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards))
  // Opcional: remover despesas orfãs
}

export function getCardExpenses(): CardExpense[] {
  const data = localStorage.getItem(EXPENSES_KEY)
  if (!data) return []
  return JSON.parse(data)
}

/**
 * Adiciona um gasto. Se for parcelado, gera N registros de CardExpense alocados nas faturas seguintes.
 */
export function addCardExpense(
  payload: Omit<CardExpense, 'id' | 'installmentValue' | 'currentInstallment' | 'invoiceMonth'> & { firstInvoiceMonth: string } // firstInvoiceMonth: YYYY-MM
) {
  const expList = getCardExpenses()
  const parsedValue = payload.value
  const numInst = payload.installments || 1
  const vlrParc = parsedValue / numInst
  const [startY, startM] = payload.firstInvoiceMonth.split('-').map(Number)

  const groupId = Date.now().toString()

  for (let i = 0; i < numInst; i++) {
    // Calculando YYYY-MM para as parcelas
    let newM = startM + i
    let newY = startY
    while (newM > 12) {
      newM -= 12
      newY += 1
    }
    const invMonth = `${newY}-${newM.toString().padStart(2, '0')}`

    const expenseEntry: CardExpense = {
      id: `${groupId}-${i + 1}`,
      cardId: payload.cardId,
      description: payload.description,
      value: parsedValue,
      installments: numInst,
      installmentValue: vlrParc,
      currentInstallment: i + 1,
      responsible: payload.responsible,
      date: payload.date,
      invoiceMonth: invMonth,
    }
    expList.push(expenseEntry)
  }

  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expList))
}

export function deleteExpenseGroup(baseIdPrefix: string) {
  // A group prefix is typically id.split('-')[0] + '-'
  const filtered = getCardExpenses().filter(e => !e.id.startsWith(baseIdPrefix))
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(filtered))
}

export function deleteSingleExpense(id: string) {
  const filtered = getCardExpenses().filter(e => e.id !== id)
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(filtered))
}
