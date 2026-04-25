import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface CreditCard {
  id: string
  name: string // "Itaú Master", "Nubank PJ"
  network: string
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
  attachmentUrl?: string
}

export async function getCards(): Promise<CreditCard[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase.from('fin_cartoes' as any).select('*').order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((d: any) => ({
    id: d.id,
    name: d.name,
    network: d.network,
    last4: d.last4,
    limit: parseFloat(d.limit_value),
    color: d.color
  }))
}

export async function saveCard(card: Omit<CreditCard, 'id'> & { id?: string }): Promise<void> {
  if (!isSupabaseConfigured()) return

  if (!card.id || card.id.length < 10) {
     // Create new
     await supabase.from('fin_cartoes' as any).insert({
       name: card.name, network: card.network, last4: card.last4, limit_value: card.limit, color: card.color
     })
  } else {
     // Update
     await supabase.from('fin_cartoes' as any).update({
       name: card.name, network: card.network, last4: card.last4, limit_value: card.limit, color: card.color
     }).eq('id', card.id)
  }
}

export async function deleteCard(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  await supabase.from('fin_cartoes' as any).delete().eq('id', id)
}

export async function getCardExpenses(): Promise<CardExpense[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase.from('fin_cartoes_despesas' as any).select('*').order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map((d: any) => ({
    id: d.id,
    cardId: d.card_id,
    description: d.description,
    value: parseFloat(d.value),
    installments: d.installments,
    installmentValue: parseFloat(d.installment_value),
    currentInstallment: d.current_installment,
    responsible: d.responsible as any,
    date: d.date,
    invoiceMonth: d.invoice_month,
    attachmentUrl: d.attachment_url
  }))
}

/**
 * Adiciona um gasto. Se for parcelado, gera N registros de CardExpense alocados nas faturas seguintes.
 */
export async function addCardExpense(
  payload: Omit<CardExpense, 'id' | 'installmentValue' | 'currentInstallment' | 'invoiceMonth'> & { firstInvoiceMonth: string }
): Promise<void> {
  if (!isSupabaseConfigured()) return

  const parsedValue = payload.value
  const numInst = payload.installments || 1
  const vlrParc = parsedValue / numInst
  const [startY, startM] = payload.firstInvoiceMonth.split('-').map(Number)

  const groupId = Date.now().toString()
  const inserts = []

  for (let i = 0; i < numInst; i++) {
    // Calculando YYYY-MM para as parcelas
    let newM = startM + i
    let newY = startY
    while (newM > 12) {
      newM -= 12
      newY += 1
    }
    const invMonth = `${newY}-${newM.toString().padStart(2, '0')}`

    inserts.push({
      group_id: groupId,
      card_id: payload.cardId,
      description: payload.description,
      value: parsedValue,
      installments: numInst,
      installment_value: vlrParc,
      current_installment: i + 1,
      responsible: payload.responsible,
      date: payload.date,
      invoice_month: invMonth,
      attachment_url: payload.attachmentUrl || null
    })
  }

  const { error } = await supabase.from('fin_cartoes_despesas' as any).insert(inserts)
  if (error) console.error('Erro ao adicionar despesas:', error)
}

export async function deleteSingleExpense(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  await supabase.from('fin_cartoes_despesas' as any).delete().eq('id', id)
}
