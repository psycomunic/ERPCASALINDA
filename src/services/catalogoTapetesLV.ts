/**
 * services/catalogoTapetesLV.ts
 *
 * CRUD completo para o catálogo de tapetes da Lar e Vida.
 * Tabela: catalogo_tapetes_lv + catalogo_tapetes_lv_movs
 * Storage: bucket "tapetes-lv" para fotos dos produtos.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TapeteCatalogo {
  id: string
  codigo: string | null
  ean: string | null
  nome: string
  colecao: string | null
  linha: 'RIOS' | 'LAGOS' | 'OUTRO' | null
  tamanho: string | null
  largura_cm: number | null
  comprimento_cm: number | null
  desenho: string | null
  cor_predominante: string | null
  material: string | null
  origem: string | null
  fornecedor: string
  codigo_fornecedor: string | null
  preco_custo: number | null
  preco_venda: number | null
  quantidade: number
  quantidade_minima: number
  localizacao: string | null
  foto_url: string | null
  obs: string | null
  ativo: boolean
  created_at: string
  updated_at: string
  // computed
  status: 'NORMAL' | 'CRÍTICO' | 'ATENÇÃO'
  valor_estoque: number | null
}

export interface MovTapeteCatalogo {
  id: string
  tapete_id: string
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  motivo: string | null
  nf: string | null
  usuario: string | null
  created_at: string
  tapete_nome?: string
}

export type TapeteCreateInput = {
  codigo?: string
  ean?: string
  nome: string
  colecao?: string
  linha?: 'RIOS' | 'LAGOS' | 'OUTRO'
  tamanho?: string
  largura_cm?: number
  comprimento_cm?: number
  desenho?: string
  cor_predominante?: string
  material?: string
  origem?: string
  fornecedor?: string
  codigo_fornecedor?: string
  preco_custo?: number
  preco_venda?: number
  quantidade?: number
  quantidade_minima?: number
  localizacao?: string
  foto_url?: string
  obs?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcStatus(atual: number, minimo: number): 'NORMAL' | 'CRÍTICO' | 'ATENÇÃO' {
  if (atual < minimo) return 'CRÍTICO'
  if (atual < minimo * 1.5) return 'ATENÇÃO'
  return 'NORMAL'
}

function mapRow(row: any): TapeteCatalogo {
  const qtd = row.quantidade ?? 0
  const min = row.quantidade_minima ?? 2
  const preco = row.preco_custo ?? null
  return {
    id: row.id,
    codigo: row.codigo ?? null,
    ean: row.ean ?? null,
    nome: row.nome,
    colecao: row.colecao ?? null,
    linha: row.linha ?? null,
    tamanho: row.tamanho ?? null,
    largura_cm: row.largura_cm ?? null,
    comprimento_cm: row.comprimento_cm ?? null,
    desenho: row.desenho ?? null,
    cor_predominante: row.cor_predominante ?? null,
    material: row.material ?? null,
    origem: row.origem ?? null,
    fornecedor: row.fornecedor ?? 'Tellaio',
    codigo_fornecedor: row.codigo_fornecedor ?? null,
    preco_custo: preco,
    preco_venda: row.preco_venda ?? null,
    quantidade: qtd,
    quantidade_minima: min,
    localizacao: row.localizacao ?? null,
    foto_url: row.foto_url ?? null,
    obs: row.obs ?? null,
    ativo: row.ativo ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
    status: calcStatus(qtd, min),
    valor_estoque: preco !== null ? preco * qtd : null,
  }
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchCatalogoTapetes(opts?: {
  linha?: string
  colecao?: string
  status?: string
  search?: string
  somenteAtivos?: boolean
}): Promise<TapeteCatalogo[]> {
  if (!isSupabaseConfigured()) return []

  let query = supabase
    .from('catalogo_tapetes_lv' as any)
    .select('*')
    .order('nome', { ascending: true })

  if (opts?.somenteAtivos !== false) query = query.eq('ativo', true)
  if (opts?.linha && opts.linha !== 'TODOS') query = query.eq('linha', opts.linha)
  if (opts?.colecao && opts.colecao !== 'TODAS') query = query.ilike('colecao', opts.colecao)

  const { data, error } = await query
  if (error) {
    console.error('[catalogoTapetesLV] fetchCatalogoTapetes:', error.message)
    return []
  }

  let result = (data ?? []).map(mapRow)

  // Filtros client-side para status e search
  if (opts?.status && opts.status !== 'TODOS') {
    result = result.filter(t => t.status === opts.status)
  }
  if (opts?.search) {
    const q = opts.search.toLowerCase()
    result = result.filter(t =>
      t.nome.toLowerCase().includes(q) ||
      (t.colecao ?? '').toLowerCase().includes(q) ||
      (t.codigo ?? '').toLowerCase().includes(q) ||
      (t.ean ?? '').toLowerCase().includes(q) ||
      (t.desenho ?? '').toLowerCase().includes(q) ||
      (t.cor_predominante ?? '').toLowerCase().includes(q)
    )
  }

  return result
}

export async function fetchTapeteById(id: string): Promise<TapeteCatalogo | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('catalogo_tapetes_lv' as any)
    .select('*')
    .eq('id', id)
    .single()
  if (error) { console.error('[catalogoTapetesLV] fetchById:', error.message); return null }
  return mapRow(data)
}

// ─── Create / Update / Delete ─────────────────────────────────────────────────

export async function createTapeteCatalogo(input: TapeteCreateInput): Promise<TapeteCatalogo | null> {
  if (!isSupabaseConfigured()) return null

  const qtdInicial = input.quantidade ?? 0

  const { data, error } = await supabase
    .from('catalogo_tapetes_lv' as any)
    .insert({
      codigo:           input.codigo || null,
      ean:              input.ean || null,
      nome:             input.nome,
      colecao:          input.colecao || null,
      linha:            input.linha || null,
      tamanho:          input.tamanho || null,
      largura_cm:       input.largura_cm ?? null,
      comprimento_cm:   input.comprimento_cm ?? null,
      desenho:          input.desenho || null,
      cor_predominante: input.cor_predominante || null,
      material:         input.material || null,
      origem:           input.origem || 'Nacional',
      fornecedor:       input.fornecedor || 'Tellaio',
      codigo_fornecedor: input.codigo_fornecedor || null,
      preco_custo:      input.preco_custo ?? null,
      preco_venda:      input.preco_venda ?? null,
      quantidade:       qtdInicial,
      quantidade_minima: input.quantidade_minima ?? 2,
      localizacao:      input.localizacao || null,
      foto_url:         input.foto_url || null,
      obs:              input.obs || null,
    })
    .select()
    .single()

  if (error) { console.error('[catalogoTapetesLV] create:', error.message); return null }
  return mapRow(data)
}

export async function updateTapeteCatalogo(id: string, input: Partial<TapeteCreateInput>): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const payload: Record<string, unknown> = {}
  if ('codigo'           in input) payload.codigo           = input.codigo || null
  if ('ean'              in input) payload.ean              = input.ean || null
  if ('nome'             in input) payload.nome             = input.nome
  if ('colecao'          in input) payload.colecao          = input.colecao || null
  if ('linha'            in input) payload.linha            = input.linha || null
  if ('tamanho'          in input) payload.tamanho          = input.tamanho || null
  if ('largura_cm'       in input) payload.largura_cm       = input.largura_cm ?? null
  if ('comprimento_cm'   in input) payload.comprimento_cm   = input.comprimento_cm ?? null
  if ('desenho'          in input) payload.desenho          = input.desenho || null
  if ('cor_predominante' in input) payload.cor_predominante = input.cor_predominante || null
  if ('material'         in input) payload.material         = input.material || null
  if ('origem'           in input) payload.origem           = input.origem || null
  if ('fornecedor'       in input) payload.fornecedor       = input.fornecedor || 'Tellaio'
  if ('codigo_fornecedor' in input) payload.codigo_fornecedor = input.codigo_fornecedor || null
  if ('preco_custo'      in input) payload.preco_custo      = input.preco_custo ?? null
  if ('preco_venda'      in input) payload.preco_venda      = input.preco_venda ?? null
  if ('quantidade_minima' in input) payload.quantidade_minima = input.quantidade_minima ?? 2
  if ('localizacao'      in input) payload.localizacao      = input.localizacao || null
  if ('foto_url'         in input) payload.foto_url         = input.foto_url || null
  if ('obs'              in input) payload.obs              = input.obs || null

  const { error } = await supabase
    .from('catalogo_tapetes_lv' as any)
    .update(payload)
    .eq('id', id)

  if (error) { console.error('[catalogoTapetesLV] update:', error.message); return false }
  return true
}

export async function deleteTapeteCatalogo(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase
    .from('catalogo_tapetes_lv' as any)
    .delete()
    .eq('id', id)
  if (error) { console.error('[catalogoTapetesLV] delete:', error.message); return false }
  return true
}

// ─── Movimentações ────────────────────────────────────────────────────────────

export async function registrarMovTapete(opts: {
  tapete_id: string
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  motivo?: string
  nf?: string
  usuario?: string
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase
    .from('catalogo_tapetes_lv_movs' as any)
    .insert({
      tapete_id: opts.tapete_id,
      tipo:      opts.tipo,
      quantidade: opts.quantidade,
      motivo:    opts.motivo ?? null,
      nf:        opts.nf ?? null,
      usuario:   opts.usuario ?? 'Sistema',
    })

  if (error) { console.error('[catalogoTapetesLV] registrarMov:', error.message); return false }
  return true
}

export async function fetchMovsTapete(tapeteId?: string): Promise<MovTapeteCatalogo[]> {
  if (!isSupabaseConfigured()) return []

  let query = supabase
    .from('catalogo_tapetes_lv_movs' as any)
    .select('*, catalogo_tapetes_lv(nome)')
    .order('created_at', { ascending: false })
    .limit(300)

  if (tapeteId) query = query.eq('tapete_id', tapeteId)

  const { data, error } = await query
  if (error) { console.error('[catalogoTapetesLV] fetchMovs:', error.message); return [] }

  return (data ?? []).map((m: any) => ({
    id: m.id,
    tapete_id: m.tapete_id,
    tipo: m.tipo,
    quantidade: m.quantidade,
    motivo: m.motivo ?? null,
    nf: m.nf ?? null,
    usuario: m.usuario ?? null,
    created_at: m.created_at,
    tapete_nome: m.catalogo_tapetes_lv?.nome,
  }))
}

// ─── Upload de Foto ───────────────────────────────────────────────────────────

export async function uploadFotoTapete(file: File): Promise<string | null> {
  if (!isSupabaseConfigured()) return null

  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `tapetes-lv/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('tapetes-lv')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) {
    // Fallback: tenta bucket 'produtos' caso 'tapetes-lv' ainda não exista
    const fallbackPath = `lar-e-vida/tapetes/${Date.now()}.${ext}`
    const { error: e2 } = await supabase.storage
      .from('produtos')
      .upload(fallbackPath, file, { upsert: true, contentType: file.type })
    if (e2) { console.error('[catalogoTapetesLV] uploadFoto:', e2.message); return null }
    const { data: d2 } = supabase.storage.from('produtos').getPublicUrl(fallbackPath)
    return d2.publicUrl
  }

  const { data } = supabase.storage.from('tapetes-lv').getPublicUrl(path)
  return data.publicUrl
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

/** Lista de coleções únicas existentes no catálogo */
export async function fetchColecoesDisponiveis(): Promise<string[]> {
  if (!isSupabaseConfigured()) return []
  const { data } = await supabase
    .from('catalogo_tapetes_lv' as any)
    .select('colecao')
    .eq('ativo', true)
    .not('colecao', 'is', null)
  const set = new Set<string>((data ?? []).map((r: any) => r.colecao).filter(Boolean))
  return Array.from(set).sort()
}
