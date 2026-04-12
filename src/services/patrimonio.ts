/**
 * services/patrimonio.ts
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Ativo       = Database['public']['Tables']['patrimonio']['Row']
type AtivoInsert = Database['public']['Tables']['patrimonio']['Insert']
type AtivoUpdate = Database['public']['Tables']['patrimonio']['Update']

export async function fetchPatrimonio(): Promise<Ativo[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase.from('patrimonio').select('*').order('nome')
  if (error) { console.error('[patrimonio]', error.message); return [] }
  return data ?? []
}

export async function createAtivo(ativo: AtivoInsert): Promise<Ativo | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase.from('patrimonio').insert(ativo).select().single()
  if (error) { console.error('[patrimonio]', error.message); return null }
  return data
}

export async function updateAtivo(id: string, updates: AtivoUpdate): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('patrimonio').update(updates).eq('id', id)
  if (error) { console.error('[patrimonio]', error.message); return false }
  return true
}

export async function deleteAtivo(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('patrimonio').delete().eq('id', id)
  if (error) { console.error('[patrimonio]', error.message); return false }
  return true
}

/**
 * services/parceiros.ts
 */
export {}
