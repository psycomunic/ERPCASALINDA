/**
 * services/financeiro.ts
 * Lançamentos financeiros via Supabase.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Lancamento       = Database['public']['Tables']['financeiro_lancamentos']['Row']
type LancamentoInsert = Database['public']['Tables']['financeiro_lancamentos']['Insert']
type LancamentoUpdate = Database['public']['Tables']['financeiro_lancamentos']['Update']

export interface FetchLancamentosFilter {
  tipo?: 'receita' | 'despesa'
  status?: 'pendente' | 'pago' | 'cancelado'
  dataInicio?: string   // ISO date YYYY-MM-DD
  dataFim?: string
}

export async function fetchLancamentos(filter?: FetchLancamentosFilter): Promise<Lancamento[]> {
  if (!isSupabaseConfigured()) return []

  let query = supabase.from('financeiro_lancamentos').select('*')

  if (filter?.tipo)        query = query.eq('tipo', filter.tipo)
  if (filter?.status)      query = query.eq('status', filter.status)
  if (filter?.dataInicio)  query = query.gte('data', filter.dataInicio)
  if (filter?.dataFim)     query = query.lte('data', filter.dataFim)

  const { data, error } = await query.order('data', { ascending: false })
  if (error) { console.error('[financeiro] fetchLancamentos:', error.message); return [] }
  return data ?? []
}

export async function createLancamento(l: LancamentoInsert): Promise<Lancamento | null> {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase
    .from('financeiro_lancamentos')
    .insert(l)
    .select()
    .single()

  if (error) { console.error('[financeiro] createLancamento:', error.message); return null }
  return data
}

export async function updateLancamento(id: string, updates: LancamentoUpdate): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase
    .from('financeiro_lancamentos')
    .update(updates)
    .eq('id', id)

  if (error) { console.error('[financeiro] updateLancamento:', error.message); return false }
  return true
}

export async function deleteLancamento(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('financeiro_lancamentos').delete().eq('id', id)
  if (error) { console.error('[financeiro] deleteLancamento:', error.message); return false }
  return true
}

/** Resumo financeiro de um período */
export async function getResumoFinanceiro(dataInicio: string, dataFim: string) {
  if (!isSupabaseConfigured()) return { receitas: 0, despesas: 0, saldo: 0 }

  const { data } = await supabase
    .from('financeiro_lancamentos')
    .select('tipo, valor')
    .eq('status', 'pago')
    .gte('data', dataInicio)
    .lte('data', dataFim)

  const receitas  = (data ?? []).filter(l => l.tipo === 'receita').reduce((acc, l) => acc + Number(l.valor), 0)
  const despesas  = (data ?? []).filter(l => l.tipo === 'despesa').reduce((acc, l) => acc + Number(l.valor), 0)
  return { receitas, despesas, saldo: receitas - despesas }
}
