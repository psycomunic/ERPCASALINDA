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

const STORAGE_KEY = 'erp_financeiro_db'

function getInitial(): FinEntry[] {
  const isMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  return [
    { id: '1', tipo: 'recebimento', categoria: 'Vendas Produto', descricao: 'Repasse Magazord', valor: 45000, dataVencimento: `${isMonth}-05`, dataPagamento: `${isMonth}-05`, status: 'pago', fornecedor_cliente: 'Magazord Pagamentos' },
    { id: '2', tipo: 'pagamento', categoria: 'Fornecedores (Madeira)', descricao: 'Madeireira Silva', valor: 12500.5, dataVencimento: `${isMonth}-08`, status: 'pendente', fornecedor_cliente: 'Silva Madeiras LTDA' },
    { id: '3', tipo: 'pagamento', categoria: 'Impostos (DAS)', descricao: 'Simples Nacional', valor: 3200, dataVencimento: `${isMonth}-20`, status: 'pendente', fornecedor_cliente: 'Receita Federal' },
    { id: '4', tipo: 'recebimento', categoria: 'Vendas Loja', descricao: 'Venda Fechada Shopee', valor: 8900, dataVencimento: `${isMonth}-10`, status: 'pendente', fornecedor_cliente: 'Shopee' },
    { id: '5', tipo: 'pagamento', categoria: 'Folha Pagamento', descricao: 'Salários Outubro', valor: 18000, dataVencimento: `${isMonth}-05`, dataPagamento: `${isMonth}-05`, status: 'pago', fornecedor_cliente: 'Funcionários' }
  ]
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
