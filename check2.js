import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY = 'sb_publishable_S3BR6xih1XutmQEKDoa02A_9kQQ816t'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  const fewHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, cliente, produto, etapa')
    .eq('store_id', 'lar-e-vida')
    .eq('etapa', 'Recebido')
    
  const ids = pedidos.map(p => p.id)
  
  const { data: hist } = await supabase
    .from('pedidos_historico')
    .select('*')
    .in('pedido_id', ids)
    .gte('alterado_em', fewHoursAgo)
    .order('alterado_em', { ascending: false })
    
  console.log('Recent history for these 11 items:')
  console.log(hist)
}

run()
