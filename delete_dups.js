import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5amRldHZ1enFwanpoZG1kenhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjIxMTgsImV4cCI6MjA5MTU5ODExOH0.96OUu75ky42zh5jKV9bi5mThcVw3p4PSCoDmm6WCTTg'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  let allData = []
  let page = 0
  
  while (true) {
    const { data, error } = await supabase.from('pedidos')
      .select('id, numero, etapa, created_at, updated_at')
      .range(page * 1000, (page + 1) * 1000 - 1)
      
    if (error) { console.error(error); return }
    if (data.length === 0) break
    allData = allData.concat(data)
    page++
  }
  
  console.log(`Buscados ${allData.length} pedidos.`)
  
  const map = {}
  allData.forEach(r => {
    if (!map[r.numero]) map[r.numero] = []
    map[r.numero].push(r)
  })
  
  let deletedCount = 0
  for (const num in map) {
    if (map[num].length > 1) {
      map[num].sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
      const toDelete = map[num].slice(0, map[num].length - 1)
      
      for (const d of toDelete) {
        console.log(`Deletando duplicata: ${d.id} (etapa: ${d.etapa}) do pedido ${num}`)
        const { error: delErr } = await supabase.from('pedidos').delete().eq('id', d.id)
        if (delErr) console.error(delErr)
        else deletedCount++
      }
    }
  }
  console.log(`Concluido! Deletadas ${deletedCount} duplicatas.`)
}

run()
