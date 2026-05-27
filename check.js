import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY = 'sb_publishable_S3BR6xih1XutmQEKDoa02A_9kQQ816t'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  const now = new Date()
  const fewHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  
  console.log('Fetching items in Recebido...')
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('id, cliente, produto, etapa, store_id')
    .eq('store_id', 'lar-e-vida')
    .eq('etapa', 'Recebido')
    
  if (error) {
    console.error('Error fetching:', error)
    return
  }
  
  console.log(`Found ${pedidos.length} items in Recebido.`)
  
  // Try to find recent history
  const { data: hist } = await supabase
    .from('pedidos_historico')
    .select('*')
    .eq('campo', 'etapa')
    .eq('valor_novo', 'Recebido')
    .gte('alterado_em', fewHoursAgo)
    
  if (hist && hist.length > 0) {
    console.log(`Found ${hist.length} recent moves to Recebido:`, hist)
    const toRevert = hist.map(h => h.pedido_id)
    
    // Revert them
    for (const id of toRevert) {
      const p = pedidos.find(x => x.id === id)
      if (p) {
        console.log(`Reverting ${id} - ${p.produto}`)
        await supabase.from('pedidos').update({ etapa: 'Aguardando Chegada' }).eq('id', id)
      }
    }
    console.log('Reversion complete.')
  } else {
    console.log('No recent history found. Let us just revert all 11 Recebidos if needed, or list them:')
    console.log(pedidos.map(p => `${p.id} - ${p.cliente} - ${p.produto}`))
  }
}

run()
