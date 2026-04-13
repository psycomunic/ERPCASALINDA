/**
 * dbLocal.ts
 * Simulador de persistência local para conectar os novos módulos financeiros transversalmente,
 * permitindo que Contas a Pagar/Receber afetem diretamente o DRE e Fluxo de Caixa.
 */

export interface FinEntry {
  id: string
  tipo: 'pagamento' | 'recebimento'
  categoria: string
  descricao: string
  valor: number
  dataVencimento: string
  dataPagamento?: string
  status: 'pendente' | 'pago' | 'atrasado'
  fornecedor_cliente: string
  anexoUrl?: string
}

const STORAGE_KEY = 'erp_financeiro_db_v2'

function getInitial(): FinEntry[] {
  return []
}

export function getEntries(): FinEntry[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) return JSON.parse(saved)
  const ini = getInitial()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ini))
  return ini
}

export function saveEntry(entry: FinEntry) {
  const all = getEntries()
  const exists = all.findIndex(e => e.id === entry.id)
  if (exists >= 0) all[exists] = entry
  else all.push(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function deleteEntry(id: string) {
  const all = getEntries()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter(e => e.id !== id)))
}
