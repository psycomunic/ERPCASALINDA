import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY = 'sb_publishable_S3BR6xih1XutmQEKDoa02A_9kQQ816t'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  const { data, error } = await supabase.from('pedidos').insert({
    numero: 'TEST-001',
    cliente: 'Test Client',
    produto: 'Test Product',
    etapa: 'Impressão',
    status: 'Pendente',
    from_magazord: true
  }).select()
  console.log('Result:', { data, error })
}

run()
