import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY = 'sb_publishable_S3BR6xih1XutmQEKDoa02A_9kQQ816t'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  const etapasProducao = ['Acabamento', 'Revisão', 'Embalagem']
  const isoNow = new Date().toISOString()
  
  console.log('Iniciando migração de pedidos parados...')
  
  // Migração na tabela pedidos principal
  const { data: pedidos, error: errPedidos } = await supabase
    .from('pedidos')
    .select('id, etapa')
    .in('etapa', etapasProducao)
    
  if (errPedidos) {
    console.error('Erro ao buscar pedidos:', errPedidos)
  } else {
    console.log(`Encontrados ${pedidos.length} pedidos na Produção para migrar.`)
    for (const p of pedidos) {
      const { error } = await supabase
        .from('pedidos')
        .update({ 
          etapa: 'Despachados', 
          status: 'OK', 
          data_despacho: isoNow 
        })
        .eq('id', p.id)
      if (error) console.error(`Erro ao atualizar pedido ${p.id}:`, error)
      else console.log(`Pedido ${p.id} movido de ${p.etapa} para Despachados.`)
    }
  }

  console.log('Migração concluída.')
}

run()
