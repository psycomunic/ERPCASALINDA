import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const SUPABASE_URL  = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5amRldHZ1enFwanpoZG1kenhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjIxMTgsImV4cCI6MjA5MTU5ODExOH0.96OUu75ky42zh5jKV9bi5mThcVw3p4PSCoDmm6WCTTg'

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
