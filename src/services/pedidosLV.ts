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
    .neq('arquivado' as any, true)   // exclui apenas explicitamente arquivados
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

export async function updatePedidoLV(id: string, updates: PedidoUpdate | Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase
    .from('pedidos')
    .update(updates as PedidoUpdate)
    .eq('id', id)
    .eq('store_id' as any, STORE_ID)

  if (error) { console.error('[pedidosLV] updatePedidoLV:', error.message); return false }
  return true
}

export async function movePedidoLVEtapa(id: string, etapa: string, fromEtapa?: string): Promise<boolean> {
  const ok = await updatePedidoLV(id, { etapa })
  if (ok && fromEtapa) {
    await logHistoricoLV(id, [{ campo: 'etapa', valorAnterior: fromEtapa, valorNovo: etapa }])
  }
  return ok
}

export async function movePedidosLVEtapa(ids: string[], etapa: string, fromEtapa?: string): Promise<boolean> {
  if (!isSupabaseConfigured() || ids.length === 0) return false

  const { error } = await supabase
    .from('pedidos')
    .update({ etapa } as any)
    .in('id', ids)
    .eq('store_id' as any, STORE_ID)

  if (error) { console.error('[pedidosLV] movePedidosLVEtapa:', error.message); return false }
  
  if (fromEtapa) {
    for (const id of ids) {
      await logHistoricoLV(id, [{ campo: 'etapa', valorAnterior: fromEtapa, valorNovo: etapa }])
    }
  }
  return true
}

export async function despacharPedidoLV(
  id: string,
  transportadora: string,
  rastreio: string,
  fromEtapa?: string
): Promise<boolean> {
  const ok = await updatePedidoLV(id, {
    etapa: 'Despachados',
    transportadora,
    rastreio,
    data_despacho: new Date().toISOString(),
  })
  
  if (ok) {
    const changes: any[] = [{ campo: 'transportadora', valorAnterior: null, valorNovo: transportadora }]
    if (fromEtapa) changes.push({ campo: 'etapa', valorAnterior: fromEtapa, valorNovo: 'Despachados' })
    if (rastreio) changes.push({ campo: 'rastreio', valorAnterior: null, valorNovo: rastreio })
    await logHistoricoLV(id, changes)
  }
  return ok
}

// ─── Upload de imagem (Supabase Storage) ─────────────────────────────────────
//
// PRÉ-REQUISITO: criar o bucket "produtos" no Supabase Dashboard
//   Storage → New Bucket → Name: produtos → Public bucket: ON → Save
//
export async function uploadFotoLV(file: File | Blob): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const ext   = (file.type.split('/')[1] ?? 'jpg').split('+')[0]
  const path  = `lar-e-vida/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('produtos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) {
    console.error('[pedidosLV] uploadFotoLV:', error.message)
    return null
  }

  const { data } = supabase.storage.from('produtos').getPublicUrl(path)
  return data.publicUrl
}

// ─── Upload de Confirmação do Fornecedor ──────────────────────────────────────
//
// PRÉ-REQUISITO: criar bucket "confirmacoes-fornecedor" no Supabase Dashboard
//   Storage → New Bucket → Name: confirmacoes-fornecedor → Public: ON → Save
//
export async function uploadConfirmacaoFornecedor(file: File | Blob): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const ext  = (file.type.split('/')[1] ?? 'pdf').split('+')[0]
  const path = `lar-e-vida/confirmacoes/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('confirmacoes-fornecedor')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) {
    // Fallback: tenta usar o bucket 'produtos' caso o bucket específico não exista
    const fallbackPath = `lar-e-vida/confirmacoes/${Date.now()}.${ext}`
    const { error: e2 } = await supabase.storage
      .from('produtos')
      .upload(fallbackPath, file, { upsert: true, contentType: file.type })
    if (e2) { console.error('[pedidosLV] uploadConfirmacaoFornecedor:', e2.message); return null }
    const { data: d2 } = supabase.storage.from('produtos').getPublicUrl(fallbackPath)
    return d2.publicUrl
  }

  const { data } = supabase.storage.from('confirmacoes-fornecedor').getPublicUrl(path)
  return data.publicUrl
}

// ─── Helpers de Estoque ───────────────────────────────────────────────────────

export async function marcarEntradaEstoque(id: string, localizacao: string): Promise<boolean> {
  return updatePedidoLV(id, {
    etapa: 'Em Prateleira',
    localizacao_prateleira: localizacao || null,
    data_entrada_estoque: new Date().toISOString(),
  } as any)
}

export async function marcarDisponivelSite(id: string): Promise<boolean> {
  return updatePedidoLV(id, {
    etapa: 'Disponível no Site',
    disponivel_site: true,
    data_publicacao_site: new Date().toISOString(),
  } as any)
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

  let timeout: NodeJS.Timeout
  const channel = supabase
    .channel('pedidos-lv-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
      clearTimeout(timeout)
      // Debounce de 1500ms: garante que o movePedidoLVEtapa já concluiu
      // antes de o realtime sobrescrever o board com o estado do banco.
      timeout = setTimeout(async () => {
        const pedidos = await fetchPedidosLV()
        callback(pedidos)
      }, 1500)
    })
    .subscribe()

  return {
    unsubscribe: () => {
      clearTimeout(timeout)
      supabase.removeChannel(channel)
    },
  }
}
