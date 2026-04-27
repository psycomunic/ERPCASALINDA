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

export async function createAtivo(ativo: AtivoInsert): Promise<{ data: Ativo | null, error: string | null }> {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase não configurado' }
  const { data, error } = await supabase.from('patrimonio').insert(ativo).select().single()
  if (error) { 
    console.error('[patrimonio]', error.message); 
    return { data: null, error: error.message }
  }
  return { data, error: null }
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

export type ManutencaoRow = {
  id: string
  ativo: string
  tipo: string
  empresa: string
  obs: string
  status: 'CONCLUÍDO' | 'PENDENTE'
  time: string
  created_at: string
}

export async function fetchManutencoes(): Promise<ManutencaoRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase.from('patrimonio_manutencoes').select('*').order('created_at', { ascending: false })
  if (error) { console.error('[patrimonio_manutencoes]', error.message); return [] }
  return data as ManutencaoRow[]
}

export async function createManutencao(maint: any): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('patrimonio_manutencoes').insert(maint)
  if (error) { console.error('[patrimonio_manutencoes]', error.message); return false }
  return true
}

export async function updateManutencaoStatus(id: string, status: 'CONCLUÍDO' | 'PENDENTE'): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('patrimonio_manutencoes').update({ status }).eq('id', id)
  if (error) { console.error('[patrimonio_manutencoes]', error.message); return false }
  return true
}
