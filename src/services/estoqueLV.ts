/**
 * services/estoqueLV.ts
 *
 * Serviço de estoque dedicado à loja Lar e Vida.
 *
 * Estratégia de isolamento na tabela compartilhada `estoque_itens`:
 *   • Tapetes Tellaio → categoria = 'Tapete', fornecedor = 'Tellaio'
 *   • Outros produtos  → fornecedor = 'Lar e Vida'
 *
 * As quantidades são gerenciadas pelo trigger do banco que escuta
 * inserções em `estoque_movimentacoes`.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { CODIGOS_TAPETES } from '../data/codigosTellaio'
import { findColecao, findPreco } from '../data/precosTapetesLV'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TapeteEstoque {
  id: string
  codigo: string          // ex: '000218.006.002'
  ean: string | null
  colecao: string
  tamanho: string
  desenho: string
  linha: 'RIOS' | 'LAGOS'
  atual: number
  minimo: number
  status: 'NORMAL' | 'CRÍTICO' | 'ATENÇÃO'
  precoCusto: number | null
  valorEstoque: number | null
}

export interface OutroItemLV {
  id: string
  codigo: string | null
  nome: string
  categoria: string
  unidade: string
  atual: number
  minimo: number
  status: 'NORMAL' | 'CRÍTICO' | 'ATENÇÃO'
}

export interface MovimentacaoLV {
  id: string
  item_id: string
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  motivo: string | null
  usuario: string | null
  created_at: string
  item_nome?: string
  item_categoria?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcStatus(atual: number, minimo: number): 'NORMAL' | 'CRÍTICO' | 'ATENÇÃO' {
  if (atual < minimo) return 'CRÍTICO'
  if (atual < minimo * 1.5) return 'ATENÇÃO'
  return 'NORMAL'
}

function enrichTapete(item: {
  id: string
  codigo: string | null
  nome: string
  quantidade: number
  quantidade_minima: number
}): TapeteEstoque {
  const codigo = item.codigo || ''
  const tellaio = CODIGOS_TAPETES.find(t => t.codigo === codigo)

  const colecao = tellaio?.colecao || item.nome.split(' ')[0] || 'Desconhecido'
  const tamanho = tellaio?.tamanho || ''
  const desenho = tellaio?.desenho || ''
  const ean = tellaio?.ean || null

  const colInfo = findColecao(colecao)
  const linha: 'RIOS' | 'LAGOS' = (colInfo?.linha as 'RIOS' | 'LAGOS') || 'RIOS'

  const precoInfo = tamanho ? findPreco(colecao, tamanho) : null
  const precoCusto = precoInfo?.valor ?? null

  const atual = item.quantidade
  const minimo = item.quantidade_minima

  return {
    id: item.id,
    codigo,
    ean,
    colecao,
    tamanho,
    desenho,
    linha,
    atual,
    minimo,
    status: calcStatus(atual, minimo),
    precoCusto,
    valorEstoque: precoCusto !== null ? precoCusto * atual : null,
  }
}

// ─── Tapetes ─────────────────────────────────────────────────────────────────

/**
 * Busca todos os tapetes da Lar e Vida no Supabase.
 * Enriquece com dados do catálogo Tellaio (linha, preço de custo, EAN).
 */
export async function fetchTapetesLV(): Promise<TapeteEstoque[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('estoque_itens')
    .select('*')
    .eq('categoria', 'Tapete')
    .eq('fornecedor', 'Tellaio')
    .order('nome')

  if (error) {
    console.error('[estoqueLV] fetchTapetesLV:', error.message)
    return []
  }

  return (data ?? []).map(enrichTapete)
}

/**
 * Recebe os itens da sincronização Magazord e os persiste no Supabase.
 * - Cria novos registros para tapetes ainda não cadastrados.
 * - Atualiza a quantidade via movimentação de 'ajuste' para existentes.
 */
export async function upsertTapetesFromSync(items: Array<{
  ref: string    // código Tellaio, ex: '000218.006.002'
  nome: string   // ex: 'NAKURU 3,00 × 4,00 (Des. 02)'
  atual: number
  minimo: number
}>): Promise<{ sucesso: number; falhas: number }> {
  if (!isSupabaseConfigured()) return { sucesso: 0, falhas: items.length }

  // Busca todos os tapetes já cadastrados de uma vez (evita N+1)
  const { data: existentes } = await supabase
    .from('estoque_itens')
    .select('id, codigo, quantidade')
    .eq('categoria', 'Tapete')
    .eq('fornecedor', 'Tellaio')

  const existMap = new Map((existentes ?? []).map(e => [e.codigo, e]))

  let sucesso = 0
  let falhas = 0

  // Processa em lotes de 5 para não sobrecarregar
  const BATCH = 5
  for (let i = 0; i < items.length; i += BATCH) {
    const lote = items.slice(i, i + BATCH)
    await Promise.all(lote.map(async (t) => {
      const exist = existMap.get(t.ref)

      if (exist) {
        // Atualiza via movimentação de ajuste (trigger atualiza a quantidade)
        const { error } = await supabase.from('estoque_movimentacoes').insert({
          item_id: exist.id,
          tipo: 'ajuste',
          quantidade: t.atual,
          motivo: 'Sincronização automática Magazord',
          usuario: 'Sistema',
        })
        if (error) { falhas++; return }
        sucesso++
      } else {
        // Cria novo tapete com a quantidade inicial
        const { error } = await supabase.from('estoque_itens').insert({
          codigo: t.ref,
          nome: t.nome,
          categoria: 'Tapete',
          unidade: 'un',
          quantidade: t.atual,
          quantidade_minima: t.minimo || 2,
          fornecedor: 'Tellaio',
          codigo_fornecedor: CODIGOS_TAPETES.find(ct => ct.codigo === t.ref)?.ean ?? null,
        })
        if (error) { falhas++; return }
        sucesso++
      }
    }))
  }

  return { sucesso, falhas }
}

/**
 * Atualiza o estoque mínimo de um item (tapete ou outro produto).
 */
export async function updateMinimoItem(id: string, minimo: number): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase
    .from('estoque_itens')
    .update({ quantidade_minima: minimo })
    .eq('id', id)

  if (error) { console.error('[estoqueLV] updateMinimoItem:', error.message); return false }
  return true
}

// ─── Outros Produtos LV ───────────────────────────────────────────────────────

/**
 * Busca os produtos não-tapete da Lar e Vida no Supabase.
 */
export async function fetchOutrosLV(): Promise<OutroItemLV[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('estoque_itens')
    .select('*')
    .eq('fornecedor', 'Lar e Vida')
    .order('nome')

  if (error) { console.error('[estoqueLV] fetchOutrosLV:', error.message); return [] }

  return (data ?? []).map(item => ({
    id: item.id,
    codigo: item.codigo,
    nome: item.nome,
    categoria: item.categoria || 'Outro',
    unidade: item.unidade || 'un',
    atual: item.quantidade,
    minimo: item.quantidade_minima,
    status: calcStatus(item.quantidade, item.quantidade_minima),
  }))
}

export async function createItemLV(item: {
  nome: string
  categoria: string
  unidade: string
  minimo: number
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('estoque_itens').insert({
    nome: item.nome,
    categoria: item.categoria,
    unidade: item.unidade,
    quantidade: 0,
    quantidade_minima: item.minimo,
    fornecedor: 'Lar e Vida',
  })

  if (error) { console.error('[estoqueLV] createItemLV:', error.message); return false }
  return true
}

export async function updateItemLV(id: string, updates: {
  nome?: string
  categoria?: string
  unidade?: string
  minimo?: number
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('estoque_itens').update({
    nome: updates.nome,
    categoria: updates.categoria,
    unidade: updates.unidade,
    quantidade_minima: updates.minimo,
  }).eq('id', id)

  if (error) { console.error('[estoqueLV] updateItemLV:', error.message); return false }
  return true
}

export async function deleteItemLV(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('estoque_itens').delete().eq('id', id)
  if (error) { console.error('[estoqueLV] deleteItemLV:', error.message); return false }
  return true
}

// ─── Movimentações ────────────────────────────────────────────────────────────

/**
 * Registra uma movimentação de estoque para itens LV.
 * O trigger no banco atualiza `estoque_itens.quantidade` automaticamente.
 */
export async function registrarMovLV(mov: {
  item_id: string
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  motivo?: string
  usuario?: string
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('estoque_movimentacoes').insert({
    item_id: mov.item_id,
    tipo: mov.tipo,
    quantidade: mov.quantidade,
    motivo: mov.motivo ?? null,
    usuario: mov.usuario ?? 'Sistema',
  })

  if (error) { console.error('[estoqueLV] registrarMovLV:', error.message); return false }
  return true
}

/**
 * Busca o log de movimentações dos itens LV (tapetes + outros).
 * Filtra por item_id se fornecido.
 */
export async function fetchMovsLV(itemId?: string): Promise<MovimentacaoLV[]> {
  if (!isSupabaseConfigured()) return []

  // Busca IDs de todos os itens LV
  const { data: lvItems } = await supabase
    .from('estoque_itens')
    .select('id, nome, categoria')
    .or('categoria.eq.Tapete,fornecedor.eq.Lar e Vida')

  if (!lvItems?.length) return []

  const lvIds = lvItems.map(i => i.id)
  const itemMap: Record<string, { nome: string; categoria: string | null }> = {}
  for (const i of lvItems) itemMap[i.id] = { nome: i.nome, categoria: i.categoria }

  let query = supabase
    .from('estoque_movimentacoes')
    .select('*')
    .in('item_id', lvIds)
    .order('created_at', { ascending: false })
    .limit(500)

  if (itemId) query = query.eq('item_id', itemId)

  const { data, error } = await query
  if (error) { console.error('[estoqueLV] fetchMovsLV:', error.message); return [] }

  return (data ?? []).map(m => ({
    ...m,
    item_nome: itemMap[m.item_id]?.nome,
    item_categoria: itemMap[m.item_id]?.categoria ?? undefined,
  }))
}
