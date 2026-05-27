import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY = 'sb_publishable_S3BR6xih1XutmQEKDoa02A_9kQQ816t'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  console.log('Voltando pedidos tapetes (Lar e Vida) de "Aguardando Chegada" para "Novos Pedidos"...')
  
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, etapa, produto')
    .eq('store_id', 'lar-e-vida')
    .eq('etapa', 'Aguardando Chegada')

  if (error) {
    console.error('Erro ao buscar pedidos:', error)
    return
  }

  console.log(`Encontrados ${data.length} pedidos.`)

  for (const p of data) {
    const { error: updErr } = await supabase
      .from('pedidos')
      .update({ etapa: 'Novos Pedidos' })
      .eq('id', p.id)
    
    if (updErr) {
      console.error(`Erro no pedido ${p.id}:`, updErr)
    } else {
      console.log(`Pedido ${p.id} (${p.produto}) revertido para Novos Pedidos.`)
    }
  }

  console.log('Reversão concluída.')
}

run()
