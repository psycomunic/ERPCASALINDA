/**
 * services/pedidos.ts
 * CRUD completo de pedidos via Supabase, com fallback para mock data.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Pedido       = Database['public']['Tables']['pedidos']['Row']
type PedidoInsert = Database['public']['Tables']['pedidos']['Insert']
type PedidoUpdate = Database['public']['Tables']['pedidos']['Update']

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchPedidos(): Promise<Pedido[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.error('[pedidos] fetchPedidos:', error.message); return [] }
  return data ?? []
}

export async function fetchPedidosByEtapa(etapa: string): Promise<Pedido[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('etapa', etapa)
    .order('prazo_entrega', { ascending: true })

  if (error) { console.error('[pedidos] fetchPedidosByEtapa:', error.message); return [] }
  return data ?? []
}

// ─── Insert ───────────────────────────────────────────────────────────────────

export async function createPedido(pedido: PedidoInsert): Promise<Pedido | null> {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase
    .from('pedidos')
    .insert(pedido)
    .select()
    .single()

  if (error) { console.error('[pedidos] createPedido:', error.message); return null }
  return data
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePedido(id: string, updates: PedidoUpdate): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase
    .from('pedidos')
    .update(updates)
    .eq('id', id)

  if (error) { console.error('[pedidos] updatePedido:', error.message); return false }
  return true
}

export async function movePedidoEtapa(id: string, etapa: string): Promise<boolean> {
  return updatePedido(id, { etapa })
}

export async function despacharPedido(
  id: string,
  transportadora: string,
  rastreio: string,
): Promise<boolean> {
  return updatePedido(id, {
    etapa: 'Despachados',
    transportadora,
    rastreio,
    data_despacho: new Date().toISOString(),
  })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletePedido(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('pedidos').delete().eq('id', id)
  if (error) { console.error('[pedidos] deletePedido:', error.message); return false }
  return true
}

// ─── Real-time subscription ───────────────────────────────────────────────────

export function subscribePedidos(callback: (pedidos: Pedido[]) => void) {
  if (!isSupabaseConfigured()) return { unsubscribe: () => {} }

  const channel = supabase
    .channel('pedidos-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, async () => {
      const pedidos = await fetchPedidos()
      callback(pedidos)
    })
    .subscribe()

  return {
    unsubscribe: () => supabase.removeChannel(channel),
  }
}
