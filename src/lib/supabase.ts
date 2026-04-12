import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const SUPABASE_URL  = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY  = 'sb_publishable_S3BR6xih1XutmQEKDoa02A_9kQQ816t'

const configured = !!(
  SUPABASE_URL &&
  SUPABASE_KEY &&
  !SUPABASE_KEY.includes('COLE_AQUI')
)

if (configured) {
  console.info('[Supabase] ✅ Conectado —', SUPABASE_URL)
} else {
  console.warn('[Supabase] ⚠️ Variáveis não configuradas — operando com dados mock.')
}

export const supabase = createClient<Database>(
  SUPABASE_URL  ?? 'https://placeholder.supabase.co',
  SUPABASE_KEY  ?? 'placeholder',
)

/** Retorna true se o Supabase está configurado e pronto */
export const isSupabaseConfigured = () => configured
