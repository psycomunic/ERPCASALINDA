import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY = 'sb_publishable_S3BR6xih1XutmQEKDoa02A_9kQQ816t'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  const idsToRevert = [
    'e343c5b8-0279-49aa-b9c6-948c7da49570',
    'e89b3b52-ca6f-4683-a1ba-e30ba7c9a4c8',
    'fae9c38a-dcd1-4ed2-833c-dd811068e540',
    'd6693189-7f6e-404c-9c94-aefd96dfbd67'
  ]
  
  for (const id of idsToRevert) {
    const { error } = await supabase.from('pedidos').update({ etapa: 'Aguardando Chegada' }).eq('id', id)
    if (error) {
      console.error(`Error reverting ${id}:`, error)
    } else {
      console.log(`Reverted tapete ${id} to Aguardando Chegada`)
    }
  }
}

run()
