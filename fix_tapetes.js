import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY = 'sb_publishable_S3BR6xih1XutmQEKDoa02A_9kQQ816t'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  const ids = [
    '41bf2f12-8314-49c5-a9e7-a94f9831c12a',
    '7212beb4-5bdc-41ab-96e2-e27e81e5f910',
    '0604bb1b-e53f-485c-9e69-a244689450cd',
    '502920de-a764-4e60-8df6-fccd88c17ec2',
    '1b8bf246-b1ab-4aa5-b1eb-f54ef7047bdd',
    'eeaa32b1-f618-4a21-a55d-de7460525f11',
    'fdb7aae0-322b-4248-986c-75c00b9b8e7b',
    'f7c9edeb-8bd2-4a2d-a35f-7de301d02e14',
    'd6693189-7f6e-404c-9c94-aefd96dfbd67',
    'e4f6321d-80eb-4688-8a23-396a63b0b84e'
  ]

  const { data, error } = await supabase
    .from('pedidos')
    .select('id, created_at, produto')
    .in('id', ids)

  if (error) {
    console.error('Erro:', error)
    return
  }

  const agora = new Date()
  agora.setHours(agora.getHours() - 1) // 1 hora atrás

  for (const p of data) {
    const criacao = new Date(p.created_at)
    
    // Se foi criado antes de 1 hora atrás, não foi "feito agora a pouco"
    if (criacao < agora) {
      const { error: updErr } = await supabase
        .from('pedidos')
        .update({ etapa: 'Aguardando Chegada' })
        .eq('id', p.id)
      
      console.log(`Pedido antigo revertido de volta p/ Aguardando Chegada: ${p.id} (${p.produto})`)
    } else {
      console.log(`Pedido recente MANTIDO em Novos Pedidos: ${p.id} (${p.produto})`)
    }
  }

  console.log('Correção concluída.')
}

run()
