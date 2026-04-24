import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Connecting to Realtime for table: pedidos...')
const channel = supabase
  .channel('test-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, (payload) => {
    console.log('Received realtime event!', payload.eventType, payload.new?.id)
  })
  .subscribe()

setTimeout(async () => {
  console.log('triggering test update...')
  const { data } = await supabase.from('pedidos').select('id, etapa').limit(1).single()
  if (data) {
    await supabase.from('pedidos').update({ etapa: data.etapa }).eq('id', data.id)
    console.log('test update sent.')
  }
}, 2000)

setTimeout(() => {
  console.log('Timeout. Exiting.')
  process.exit(0)
}, 8000)
