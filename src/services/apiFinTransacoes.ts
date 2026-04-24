import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Transacao = Database['public']['Tables']['fin_transacoes']['Row']
type TransacaoInsert = Database['public']['Tables']['fin_transacoes']['Insert']
type TransacaoUpdate = Database['public']['Tables']['fin_transacoes']['Update']

export interface FinFilters {
  tipo?: 'despesa' | 'receita'
  loja?: string
  situacao?: string
  planoContas?: string
  fornecedor?: string
  dataInicio?: string
  dataFim?: string
  contaBancaria?: string
}

export async function fetchTransacoes(f: FinFilters = {}): Promise<Transacao[]> {
  if (!isSupabaseConfigured()) return []

  let query = supabase.from('fin_transacoes').select('*').order('data_vencimento', { ascending: false })

  if (f.tipo) query = query.eq('tipo', f.tipo)
  if (f.loja && f.loja !== 'Todas') query = query.eq('loja', f.loja)
  if (f.situacao && f.situacao !== 'Todas') query = query.eq('situacao', f.situacao.toLowerCase() as any)
  if (f.planoContas && f.planoContas !== 'Todos') query = query.eq('plano_contas', f.planoContas)
  if (f.fornecedor) query = query.ilike('fornecedor', `%${f.fornecedor}%`)
  if (f.dataInicio) query = query.gte('data_vencimento', f.dataInicio)
  if (f.dataFim) query = query.lte('data_vencimento', f.dataFim)
  if (f.contaBancaria && f.contaBancaria !== 'Todas') query = query.eq('conta_bancaria', f.contaBancaria)

  const { data, error } = await query

  if (error) {
    console.error('[apiFinTransacoes] fetchTransacoes:', error.message)
    return []
  }

  return data ?? []
}

export async function createTransacao(t: TransacaoInsert): Promise<Transacao | null> {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase
    .from('fin_transacoes')
    .insert(t)
    .select()
    .single()

  if (error) {
    console.error('[apiFinTransacoes] createTransacao:', error.message)
    return null
  }
  return data
}

export async function updateTransacao(id: string, updates: TransacaoUpdate): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase
    .from('fin_transacoes')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('[apiFinTransacoes] updateTransacao:', error.message)
    return false
  }
  return true
}

export async function deleteTransacao(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('fin_transacoes').delete().eq('id', id)
  if (error) {
    console.error('[apiFinTransacoes] deleteTransacao:', error.message)
    return false
  }
  return true
}
