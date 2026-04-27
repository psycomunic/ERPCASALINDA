/**
 * services/estoque.ts
 * Itens e movimentações de estoque via Supabase.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type EstoqueItem       = Database['public']['Tables']['estoque_itens']['Row']
type EstoqueItemInsert = Database['public']['Tables']['estoque_itens']['Insert']
type EstoqueItemUpdate = Database['public']['Tables']['estoque_itens']['Update']
type Movimentacao      = Database['public']['Tables']['estoque_movimentacoes']['Row']
type MovimentacaoInsert = Database['public']['Tables']['estoque_movimentacoes']['Insert']

// ─── Itens ────────────────────────────────────────────────────────────────────

export async function fetchItens(): Promise<EstoqueItem[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('estoque_itens')
    .select('*')
    .order('nome')

  if (error) { console.error('[estoque] fetchItens:', error.message); return [] }
  return data ?? []
}

export async function fetchItensCriticos(): Promise<EstoqueItem[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('estoque_itens')
    .select('*')
    .filter('quantidade', 'lte', 'quantidade_minima')

  if (error) { console.error('[estoque] fetchItensCriticos:', error.message); return [] }
  return data ?? []
}

export async function createItem(item: EstoqueItemInsert): Promise<EstoqueItem | null> {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase
    .from('estoque_itens')
    .insert(item)
    .select()
    .single()

  if (error) { console.error('[estoque] createItem:', error.message); return null }
  return data
}

export async function updateItem(id: string, updates: EstoqueItemUpdate): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('estoque_itens').update(updates).eq('id', id)
  if (error) { console.error('[estoque] updateItem:', error.message); return false }
  return true
}

export async function deleteItem(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('estoque_itens').delete().eq('id', id)
  if (error) { console.error('[estoque] deleteItem:', error.message); return false }
  return true
}

// ─── Movimentações ────────────────────────────────────────────────────────────

export async function fetchMovimentacoes(itemId?: string): Promise<Movimentacao[]> {
  if (!isSupabaseConfigured()) return []

  let query = supabase
    .from('estoque_movimentacoes')
    .select('*, estoque_itens(nome, unidade)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (itemId) query = query.eq('item_id', itemId)

  const { data, error } = await query
  if (error) { console.error('[estoque] fetchMovimentacoes:', error.message); return [] }
  return (data ?? []) as Movimentacao[]
}

export async function registrarMovimentacao(mov: MovimentacaoInsert): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('estoque_movimentacoes').insert(mov)
  if (error) { console.error('[estoque] registrarMovimentacao:', error.message); return false }
  return true
  // O trigger no banco atualiza a quantidade automaticamente
}

export async function deductInventoryForProduction(
  orderId: string, 
  userLabel: string | null,
  tamanho: string | null, 
  moldura: string | null, 
  acabamento: string | null, 
  quantidade: number = 1
) {
  if (!isSupabaseConfigured() || !tamanho) return

  const items = await fetchItens()

  // Parsing do tamanho (ex: "115x75")
  const regex = /(\d+)[xX×](\d+)/
  const match = tamanho.match(regex)
  
  if (match) {
    const w = parseInt(match[1], 10)
    const h = parseInt(match[2], 10)
    
    // Identificar multiplicador de telas
    let multiplicador = 1
    if (tamanho.toLowerCase().includes('2 telas')) multiplicador = 2
    else if (tamanho.toLowerCase().includes('3 telas')) multiplicador = 3
    else if (tamanho.toLowerCase().includes('4 telas')) multiplicador = 4
    else if (tamanho.toLowerCase().includes('5 telas')) multiplicador = 5
    
    // 1) Descontar Moldura
    // Se a moldura for diferente de "Sem Moldura" e tiver algum nome de cor
    if (moldura && moldura !== 'Sem Moldura (Borda Infinita)') {
      const perimetroLinear = ((w + h) * 2) / 100 // Metros lineares por unidade de tela
      const quantidadeTotalMoldura = perimetroLinear * multiplicador * quantidade
      
      // Procura o item correspondente à moldura. (ex: "Moldura Caixa Preta" ou "Moldura Trono de Ouro")
      let buscaMoldura = moldura.toLowerCase().trim()
      
      // Ajuste para facilitar o match na base de dados
      // Remove termos desnecessários ou mapeia para termos conhecidos
      buscaMoldura = buscaMoldura.replace('caixa ', '').replace('flutuante ', '').replace('côncava ', '')
      
      const itemMoldura = items.find(i => 
        (i.nome.toLowerCase().includes('moldura') || i.categoria?.toLowerCase() === 'moldura') && 
        i.nome.toLowerCase().includes(buscaMoldura)
      )

      if (itemMoldura) {
        await registrarMovimentacao({
          item_id: itemMoldura.id,
          tipo: 'saida',
          quantidade: quantidadeTotalMoldura,
          motivo: `Produção #${orderId} - Moldura ${moldura} (${multiplicador}x ${w}x${h})`,
          pedido_id: orderId,
          usuario: userLabel || 'Sistema'
        })
      }
    }

    // 2) Descontar Vidro (se Acabamento tiver Vidro)
    if (acabamento && (acabamento.toLowerCase().includes('vidro') || acabamento.toLowerCase().includes('acrílico')) && acabamento !== 'Sem Vidro') {
      const tipoMaterial = acabamento.toLowerCase().includes('vidro') ? 'vidro' : 'acrílico'
      
      // Procura o item correspondente ao vidro/acrílico daquela medida (usando apenas LxA Ex: "Vidro 115x75")
      const itemVidro = items.find(i => 
        i.nome.toLowerCase().includes(tipoMaterial) && 
        i.nome.toLowerCase().includes(`${w}x${h}`)
      )

      if (itemVidro) {
        // Multiplica a quantidade de quadros pela quantidade de telas (multiplicador)
        const totalVidro = quantidade * multiplicador
        await registrarMovimentacao({
          item_id: itemVidro.id,
          tipo: 'saida',
          quantidade: totalVidro,
          motivo: `Produção #${orderId} - ${acabamento} (${multiplicador}x ${w}x${h})`,
          pedido_id: orderId,
          usuario: userLabel || 'Sistema'
        })
      }
    }
  }
}
