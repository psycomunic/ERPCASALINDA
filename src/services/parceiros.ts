/**
 * services/parceiros.ts
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Parceiro       = Database['public']['Tables']['parceiros']['Row']
type ParceiroInsert = Database['public']['Tables']['parceiros']['Insert']
type ParceiroUpdate = Database['public']['Tables']['parceiros']['Update']

export async function fetchParceiros(tipo?: 'cliente' | 'fornecedor' | 'ambos'): Promise<Parceiro[]> {
  if (!isSupabaseConfigured()) return []
  let q = supabase.from('parceiros').select('*').order('nome')
  if (tipo) q = q.eq('tipo', tipo)
  const { data, error } = await q
  if (error) { console.error('[parceiros]', error.message); return [] }
  return data ?? []
}

export async function createParceiro(p: ParceiroInsert): Promise<Parceiro | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase.from('parceiros').insert(p).select().single()
  if (error) { console.error('[parceiros]', error.message); return null }
  return data
}

export async function updateParceiro(id: string, updates: ParceiroUpdate): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('parceiros').update(updates).eq('id', id)
  if (error) { console.error('[parceiros]', error.message); return false }
  return true
}

export async function deleteParceiro(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('parceiros').delete().eq('id', id)
  if (error) { console.error('[parceiros]', error.message); return false }
  return true
}
