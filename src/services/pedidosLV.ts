/**
 * services/pedidosLV.ts
 * CRUD de pedidos da loja Lar e Vida via Supabase.
 * Usa a mesma tabela `pedidos` com filtro por store_id = 'lar-e-vida'.
 * 
 * NOTA: Para ativar o isolamento por loja, execute a migration SQL abaixo no Supabase:
 *   ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS store_id TEXT DEFAULT 'casa-linda';
 *   UPDATE pedidos SET store_id = 'casa-linda' WHERE store_id IS NULL;
 * 
 * Enquanto a migration não for aplicada, os pedidos LV ficam como store_id = 'lar-e-vida'.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Pedido       = Database['public']['Tables']['pedidos']['Row']
type PedidoInsert = Database['public']['Tables']['pedidos']['Insert']
type PedidoUpdate = Database['public']['Tables']['pedidos']['Update']

const STORE_ID = 'lar-e-vida'

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchPedidosLV(): Promise<Pedido[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('store_id' as any, STORE_ID)
    .order('created_at', { ascending: false })

  if (error) {
    // Fallback: se a coluna store_id ainda não existir, retorna vazio
    console.warn('[pedidosLV] fetchPedidosLV — store_id column may not exist yet:', error.message)
    return []
  }
  return data ?? []
}

export async function fetchPedidosLVByEtapa(etapa: string): Promise<Pedido[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('store_id' as any, STORE_ID)
    .eq('etapa', etapa)
    .order('prazo_entrega', { ascending: true })

  if (error) { console.error('[pedidosLV] fetchByEtapa:', error.message); return [] }
  return data ?? []
}

// ─── Insert ───────────────────────────────────────────────────────────────────

export async function createPedidoLV(pedido: PedidoInsert): Promise<Pedido | null> {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase
    .from('pedidos')
    .insert({ ...pedido, store_id: STORE_ID } as any)
    .select()
    .single()

  if (error) { console.error('[pedidosLV] createPedidoLV:', error.message); return null }
  return data
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePedidoLV(id: string, updates: PedidoUpdate): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase
    .from('pedidos')
    .update(updates)
    .eq('id', id)
    .eq('store_id' as any, STORE_ID)

  if (error) { console.error('[pedidosLV] updatePedidoLV:', error.message); return false }
  return true
}

export async function movePedidoLVEtapa(id: string, etapa: string): Promise<boolean> {
  return updatePedidoLV(id, { etapa })
}

export async function despacharPedidoLV(
  id: string,
  transportadora: string,
  rastreio: string,
): Promise<boolean> {
  return updatePedidoLV(id, {
    etapa: 'Despachados',
    transportadora,
    rastreio,
    data_despacho: new Date().toISOString(),
  })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletePedidoLV(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase
    .from('pedidos')
    .delete()
    .eq('id', id)
    .eq('store_id' as any, STORE_ID)
  if (error) { console.error('[pedidosLV] deletePedidoLV:', error.message); return false }
  return true
}

// ─── Histórico de edição ──────────────────────────────────────────────────────

export interface HistoricoEntry {
  id: string
  pedido_id: string
  campo: string
  valor_anterior: string | null
  valor_novo: string | null
  alterado_em: string
}

export async function fetchHistoricoLV(pedidoId: string): Promise<HistoricoEntry[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('pedidos_historico' as any)
    .select('*')
    .eq('pedido_id', pedidoId)
    .order('alterado_em', { ascending: false })
  if (error) { console.warn('[pedidosLV] fetchHistoricoLV:', error.message); return [] }
  return (data ?? []) as unknown as HistoricoEntry[]
}

export async function logHistoricoLV(
  pedidoId: string,
  changes: Array<{ campo: string; valorAnterior?: string | null; valorNovo?: string | null }>,
): Promise<void> {
  if (!isSupabaseConfigured() || changes.length === 0) return
  const rows = changes.map(c => ({
    pedido_id: pedidoId,
    campo: c.campo,
    valor_anterior: c.valorAnterior ?? null,
    valor_novo: c.valorNovo ?? null,
  }))
  const { error } = await supabase.from('pedidos_historico' as any).insert(rows)
  if (error) console.warn('[pedidosLV] logHistoricoLV:', error.message)
}

// ─── Real-time subscription ───────────────────────────────────────────────────

export function subscribePedidosLV(callback: (pedidos: Pedido[]) => void) {
  if (!isSupabaseConfigured()) return { unsubscribe: () => {} }

  const channel = supabase
    .channel('pedidos-lv-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, async () => {
      const pedidos = await fetchPedidosLV()
      callback(pedidos)
    })
    .subscribe()

  return {
    unsubscribe: () => supabase.removeChannel(channel),
  }
}
