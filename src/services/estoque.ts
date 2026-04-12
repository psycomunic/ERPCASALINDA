/**
 * services/estoque.ts
 * Itens e movimentações de estoque via Supabase.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type EstoqueItem       = Database['public']['Tables']['estoque_itens']['Row']
type EstoqueItemInsert = Database['public']['Tables']['estoque_itens']['Insert']
type EstoqueItemUpdate = Database['public']['Tables']['estoque_itens']['Update']
type Movimentacao      = Database['public']['Tables']['estoque_movimentacoes']['Row']
type MovimentacaoInsert = Database['public']['Tables']['estoque_movimentacoes']['Insert']

// ─── Itens ────────────────────────────────────────────────────────────────────

export async function fetchItens(): Promise<EstoqueItem[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('estoque_itens')
    .select('*')
    .order('nome')

  if (error) { console.error('[estoque] fetchItens:', error.message); return [] }
  return data ?? []
}

export async function fetchItensCriticos(): Promise<EstoqueItem[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('estoque_itens')
    .select('*')
    .filter('quantidade', 'lte', 'quantidade_minima')

  if (error) { console.error('[estoque] fetchItensCriticos:', error.message); return [] }
  return data ?? []
}

export async function createItem(item: EstoqueItemInsert): Promise<EstoqueItem | null> {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase
    .from('estoque_itens')
    .insert(item)
    .select()
    .single()

  if (error) { console.error('[estoque] createItem:', error.message); return null }
  return data
}

export async function updateItem(id: string, updates: EstoqueItemUpdate): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('estoque_itens').update(updates).eq('id', id)
  if (error) { console.error('[estoque] updateItem:', error.message); return false }
  return true
}

export async function deleteItem(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('estoque_itens').delete().eq('id', id)
  if (error) { console.error('[estoque] deleteItem:', error.message); return false }
  return true
}

// ─── Movimentações ────────────────────────────────────────────────────────────

export async function fetchMovimentacoes(itemId?: string): Promise<Movimentacao[]> {
  if (!isSupabaseConfigured()) return []

  let query = supabase
    .from('estoque_movimentacoes')
    .select('*, estoque_itens(nome, unidade)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (itemId) query = query.eq('item_id', itemId)

  const { data, error } = await query
  if (error) { console.error('[estoque] fetchMovimentacoes:', error.message); return [] }
  return (data ?? []) as Movimentacao[]
}

export async function registrarMovimentacao(mov: MovimentacaoInsert): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('estoque_movimentacoes').insert(mov)
  if (error) { console.error('[estoque] registrarMovimentacao:', error.message); return false }
  return true
  // O trigger no banco atualiza a quantidade automaticamente
}
