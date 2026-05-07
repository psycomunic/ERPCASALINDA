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

/** Comprime a imagem para evitar payloads gigantes e erro "Load failed" na API */
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 800
        let w = img.width
        let h = img.height
        if (w > h && w > MAX_DIM) { h *= MAX_DIM / w; w = MAX_DIM }
        else if (h > MAX_DIM) { w *= MAX_DIM / h; h = MAX_DIM }
        canvas.width = Math.round(w)
        canvas.height = Math.round(h)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        }
        // Qualidade 0.6 reduz bastante o tamanho sem perder muita qualidade
        resolve(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.onerror = () => reject(new Error('Erro ao carregar imagem para compressão'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

/** Converte Data URL de volta para File/Blob para upload no Storage */
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) { u8arr[n] = bstr.charCodeAt(n) }
  return new File([u8arr], filename, { type: mime })
}

export async function uploadFotoAcervo(file: File): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  
  try {
    // 1. Comprime a imagem primeiro
    const compressedBase64 = await compressImage(file)
    const ext = 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const path = `acervo/${filename}`
    
    // 2. Tenta fazer upload do arquivo comprimido
    const fileToUpload = dataURLtoFile(compressedBase64, filename)
    const { error } = await supabase.storage
      .from('pedidos-fotos')
      .upload(path, fileToUpload, { upsert: true })

    // 3. Se sucesso no Storage, retorna URL pública
    if (!error) {
      const { data } = supabase.storage.from('pedidos-fotos').getPublicUrl(path)
      return data.publicUrl
    }

    // 4. Se o Storage falhar (ex: bucket inexistente/RLS bloqueado), faz o FALLBACK para Base64
    console.warn('[acervo] Storage falhou, usando fallback em Base64 comprimido:', error.message)
    return compressedBase64

  } catch (err: any) {
    console.error('[acervo] Erro no uploadFotoAcervo:', err)
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
