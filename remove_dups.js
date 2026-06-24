import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5amRldHZ1enFwanpoZG1kenhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjIxMTgsImV4cCI6MjA5MTU5ODExOH0.96OUu75ky42zh5jKV9bi5mThcVw3p4PSCoDmm6WCTTg'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const STAGES = [
  'Novos Pedidos', 'Impressão', 'Corte Moldura', 'Entelamento + Vidro',
  'Acabamento', 'Revisão', 'Embalagem', 'Prontos para Envio', 'Despachados'
]

async function removeDups() {
  const { data, error } = await supabase.from('pedidos').select('id, numero, etapa, created_at')
  if (error) { console.error(error); return }
  
  const map = {}
  data.forEach(r => {
    if (!map[r.numero]) map[r.numero] = []
    map[r.numero].push(r)
  })
  
  const toDelete = []
  
  for (const num in map) {
    if (map[num].length > 1) {
      console.log(`Pedido ${num} duplicado ${map[num].length} vezes. Resolvendo...`)
      
      // Ordena para manter o que está na etapa mais avançada, ou o mais recente se for mesma etapa
      const sorted = map[num].sort((a, b) => {
        const idxA = STAGES.indexOf(a.etapa)
        const idxB = STAGES.indexOf(b.etapa)
        if (idxA !== idxB) return idxB - idxA // maior etapa primeiro
        return new Date(b.created_at) - new Date(a.created_at) // mais recente primeiro
      })
      
      const keep = sorted[0]
      const drops = sorted.slice(1)
      
      drops.forEach(d => {
        console.log(`  Deletando duplicata: ${d.id} (etapa: ${d.etapa})`)
        toDelete.push(d.id)
      })
    }
  }
  
  if (toDelete.length > 0) {
    console.log(`Deletando ${toDelete.length} linhas duplicadas...`)
    // Deleta em chunks de 50
    for (let i = 0; i < toDelete.length; i += 50) {
      const chunk = toDelete.slice(i, i + 50)
      const { error: delErr } = await supabase.from('pedidos').delete().in('id', chunk)
      if (delErr) {
        console.error('Erro ao deletar:', delErr)
      } else {
        console.log(`Deletados ${chunk.length} com sucesso.`)
      }
    }
  } else {
    console.log("Nenhuma duplicata encontrada!")
  }
}

removeDups()
