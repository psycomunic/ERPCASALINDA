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

/**
 * Comprime e redimensiona a imagem antes do upload.
 * Limita a largura/altura máxima a 1200px e qualidade JPEG a 85%.
 * Isso reduz fotos de celular de 5-12MB para ~150-300KB, tornando o
 * carregamento do acervo muito mais rápido.
 */
export function comprimirImagem(file: File, maxDim = 1200, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const ratio = Math.min(1, maxDim / Math.max(width, height))
      const w = Math.round(width  * ratio)
      const h = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('canvas.toBlob falhou')),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem')) }
    img.src = url
  })
}

export async function uploadFotoAcervo(file: File | Blob): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  
  try {
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const path = `acervo/${filename}`
    
    // O arquivo já chegou comprimido pelo chamador (comprimirImagem)
    const { error } = await supabase.storage
      .from('pedidos-fotos')
      .upload(path, file as Blob, { upsert: true, contentType: 'image/jpeg' })

    if (error) {
      console.error('[acervo] Erro no upload no Storage:', error.message)
      return null
    }

    const { data } = supabase.storage.from('pedidos-fotos').getPublicUrl(path)
    return data.publicUrl
  } catch (err: any) {
    console.error('[acervo] Erro inesperado no uploadFotoAcervo:', err)
    return null
  }
}

// ─── Match com PCP ────────────────────────────────────────────────────────────

/**
 * Extrai o código de arte de um título de produto (ex: "V3035", "V1034").
 * O código é o identificador único da estampa/arte e fica no final do título.
 */
function extractArtCode(s: string): string | null {
  // Busca padrões como V3035, V1034, T001, etc. (letra + dígitos, 3-6 dígitos)
  const match = s.match(/\b([A-Z]\d{3,6})\b/i)
  return match ? match[1].toUpperCase() : null
}

/**
 * Dado o título de um pedido do PCP e um quadro do acervo,
 * retorna true SOMENTE se ambos tiverem o mesmo código de arte (ex: V3035).
 * Se nenhum dos dois tiver código, cai no fallback de palavras (mínimo 3 palavras).
 */
export function matchesPCP(produtoPCP: string, quadroAcervo: string): boolean {
  const codePCP    = extractArtCode(produtoPCP)
  const codeAcervo = extractArtCode(quadroAcervo)

  // Se o acervo tem um código, só dá match se o PCP tiver o mesmo
  if (codeAcervo) {
    return codePCP === codeAcervo
  }

  // Fallback: sem código, exige 3+ palavras relevantes em comum (mais restritivo)
  const STOP_WORDS = new Set(['de', 'da', 'do', 'e', 'em', 'com', 'para', 'por', 'um', 'uma', 'o', 'a', 'os', 'as', 'quadro', 'moldura', 'tela', 'canvas'])
  const normalize  = (s: string) =>
    s.toLowerCase()
     .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
     .replace(/[^a-z0-9\s]/g, '')
     .split(/\s+/)
     .filter(w => w.length > 2 && !STOP_WORDS.has(w))

  const wordsPCP    = new Set(normalize(produtoPCP))
  const wordsAcervo = normalize(quadroAcervo)
  return wordsAcervo.filter(w => wordsPCP.has(w)).length >= 3
}
