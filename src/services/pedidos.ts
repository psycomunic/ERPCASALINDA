/**
 * services/pedidos.ts
 * CRUD completo de pedidos via Supabase, com fallback para mock data.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Pedido       = Database['public']['Tables']['pedidos']['Row']
type PedidoInsert = Database['public']['Tables']['pedidos']['Insert']
type PedidoUpdate = Database['public']['Tables']['pedidos']['Update']

// ─── Fetch (kanban — apenas pedidos ativos, não arquivados) ───────────────────

export async function fetchPedidos(): Promise<Pedido[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('arquivado', false)
    .eq('store_id', 'casa-linda')
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
    .eq('arquivado', false)
    .order('prazo_entrega', { ascending: true })

  if (error) { console.error('[pedidos] fetchPedidosByEtapa:', error.message); return [] }
  return data ?? []
}

// ─── Histórico (inclui pedidos arquivados para consulta) ─────────────────────

export interface FiltrosHistorico {
  numero?:      string
  cliente?:     string
  dataInicio?:  string   // YYYY-MM-DD
  dataFim?:     string   // YYYY-MM-DD
  etapa?:       string
  limit?:       number
}

export async function fetchPedidosHistorico(filtros: FiltrosHistorico = {}): Promise<Pedido[]> {
  if (!isSupabaseConfigured()) return []

  let query = supabase
    .from('pedidos')
    .select('*')
    .eq('store_id', 'casa-linda')
    .order('created_at', { ascending: false })
    .limit(filtros.limit ?? 200)

  if (filtros.numero)     query = query.eq('numero', filtros.numero)
  if (filtros.cliente)    query = query.ilike('cliente', `%${filtros.cliente}%`)
  if (filtros.etapa)      query = query.eq('etapa', filtros.etapa)
  if (filtros.dataInicio) query = query.gte('created_at', filtros.dataInicio)
  if (filtros.dataFim)    query = query.lte('created_at', filtros.dataFim + 'T23:59:59Z')

  const { data, error } = await query
  if (error) { console.error('[pedidos] fetchPedidosHistorico:', error.message); return [] }
  return data ?? []
}

// ─── Upsert em lote (usado pela importação histórica do Magazord) ─────────────

export interface PedidoUpsert {
  numero:          string
  magazord_id?:    number
  cliente:         string
  produto:         string
  moldura?:        string
  acabamento?:     string
  canal?:          string
  etapa:           string
  status:          'Pendente' | 'OK' | 'Atrasado'
  prazo_entrega?:  string
  valor?:          number
  frete?:          number
  obs?:            string
  endereco?:       string
  transportadora?: string
  from_magazord:   boolean
  arquivado:       boolean
  store_id:        string
}

export async function upsertPedidosMagazord(
  pedidos: PedidoUpsert[],
): Promise<{ inseridos: number; atualizados: number; erros: number }> {
  if (!isSupabaseConfigured() || pedidos.length === 0) return { inseridos: 0, atualizados: 0, erros: 0 }

  const BATCH = 50
  let inseridos = 0, erros = 0

  for (let i = 0; i < pedidos.length; i += BATCH) {
    const batch = pedidos.slice(i, i + BATCH)
    const { error, count } = await supabase
      .from('pedidos')
      .upsert(batch, {
        onConflict:        'numero',
        ignoreDuplicates:  false,   // atualiza se existir
        count:             'exact',
      })
    if (error) {
      console.error('[pedidos] upsertPedidosMagazord batch error:', error.message)
      erros += batch.length
    } else {
      inseridos += count ?? batch.length
    }
  }

  return { inseridos, atualizados: 0, erros }
}

// ─── Arquivar / desarquivar ───────────────────────────────────────────────────

export async function arquivarPedido(id: string): Promise<boolean> {
  return updatePedido(id, { arquivado: true } as any)
}

export async function desarquivarPedido(id: string): Promise<boolean> {
  return updatePedido(id, { arquivado: false } as any)
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
