/**
 * services/acervo.ts
 * CRUD para a tabela acervo_quadros — quadros prontos disponíveis no salão.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AcervoQuadro {
  id: string
  produto: string
  tamanho?: string | null
  moldura?: string | null
  acabamento?: string | null
  categoria?: string | null
  foto_url?: string | null
  obs?: string | null
  origem?: string | null
  status: 'disponivel' | 'vendido'
  created_at: string
  updated_at: string
}

export type AcervoInsert = Omit<AcervoQuadro, 'id' | 'created_at' | 'updated_at'>
export type AcervoUpdate = Partial<AcervoInsert>

// ─── Fetch ────────────────────────────────────────────────────────────────────

/** Retorna apenas quadros disponíveis (status = 'disponivel') */
export async function fetchAcervoDisponivel(): Promise<AcervoQuadro[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('acervo_quadros')
    .select('*')
    .eq('status', 'disponivel')
    .order('created_at', { ascending: false })
  if (error) { console.error('[acervo] fetchAcervoDisponivel:', error.message); return [] }
  return (data ?? []) as AcervoQuadro[]
}

/** Retorna TODOS os quadros (incluindo vendidos) — para histórico */
export async function fetchAcervoTodos(): Promise<AcervoQuadro[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('acervo_quadros')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('[acervo] fetchAcervoTodos:', error.message); return [] }
  return (data ?? []) as AcervoQuadro[]
}

// ─── Insert ───────────────────────────────────────────────────────────────────

export async function createAcervoItem(item: AcervoInsert): Promise<AcervoQuadro | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('acervo_quadros')
    .insert(item)
    .select()
    .single()
  if (error) { console.error('[acervo] createAcervoItem:', error.message); return null }
  return data as AcervoQuadro
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateAcervoItem(id: string, updates: AcervoUpdate): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase
    .from('acervo_quadros')
    .update(updates)
    .eq('id', id)
  if (error) { console.error('[acervo] updateAcervoItem:', error.message); return false }
  return true
}

/** Marca um quadro como vendido — ele sai do acervo ativo */
export async function marcarComoVendido(id: string): Promise<boolean> {
  return updateAcervoItem(id, { status: 'vendido' })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteAcervoItem(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('acervo_quadros').delete().eq('id', id)
  if (error) { console.error('[acervo] deleteAcervoItem:', error.message); return false }
  return true
}

// ─── Upload de Foto ───────────────────────────────────────────────────────────

export async function uploadFotoAcervo(file: File): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `acervo/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('pedidos-fotos')
    .upload(path, file, { upsert: true })
  if (error) { console.error('[acervo] uploadFotoAcervo:', error.message); return null }
  const { data } = supabase.storage.from('pedidos-fotos').getPublicUrl(path)
  return data.publicUrl
}

// ─── Match com PCP ────────────────────────────────────────────────────────────

/**
 * Dado o título de um pedido do PCP e um quadro do acervo,
 * retorna true se houver pelo menos 2 palavras relevantes em comum.
 */
export function matchesPCP(produtoPCP: string, quadroAcervo: string): boolean {
  const STOP_WORDS = new Set(['de', 'da', 'do', 'e', 'em', 'com', 'para', 'por', 'um', 'uma', 'o', 'a', 'os', 'as'])
  const normalize = (s: string) =>
    s.toLowerCase()
     .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
     .replace(/[^a-z0-9\s]/g, '')
     .split(/\s+/)
     .filter(w => w.length > 2 && !STOP_WORDS.has(w))

  const wordsPCP    = new Set(normalize(produtoPCP))
  const wordsAcervo = normalize(quadroAcervo)
  const matches     = wordsAcervo.filter(w => wordsPCP.has(w))
  return matches.length >= 2
}
