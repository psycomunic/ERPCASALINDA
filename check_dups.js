import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5amRldHZ1enFwanpoZG1kenhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjIxMTgsImV4cCI6MjA5MTU5ODExOH0.96OUu75ky42zh5jKV9bi5mThcVw3p4PSCoDmm6WCTTg'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkDups() {
  const { data, error } = await supabase.from('pedidos').select('id, numero, etapa, store_id')
  if (error) { console.error(error); return }
  
  const map = {}
  data.forEach(r => {
    if (!map[r.numero]) map[r.numero] = []
    map[r.numero].push(r)
  })
  
  let hasDups = false
  for (const num in map) {
    if (map[num].length > 1) {
      console.log(`Pedido ${num} duplicado:`)
      map[num].forEach(r => console.log(`  - id: ${r.id} | etapa: ${r.etapa} | store_id: ${r.store_id}`))
      
      // Let's delete the duplicate that is in the older stage (or just keep one)
      hasDups = true
    }
  }
}

checkDups()
