/**
 * magazord.ts
 * Integração com a API Magazord via proxy Vite (resolve CORS same-origin).
 *
 * Auth: BasicAuth — configurar no .env:
 *   VITE_MAGAZORD_BASE_URL=https://casalinda.magazord.com.br
 *   VITE_MAGAZORD_USER=usuario-api
 *   VITE_MAGAZORD_PASS=senha-api
 *
 * Em dev, todas as chamadas vão para /magazord-api/** e o Vite proxy injeta
 * o header Authorization server-side, evitando CORS.
 *
 * Em produção (build estático), as credenciais NÃO podem ser expostas no
 * browser — usar um Edge Function / backend como intermediário.
 */

// ─── Env vars ──────────────────────────────────────────────────────────────────

const MAGAZORD_USER = import.meta.env.VITE_MAGAZORD_USER as string | undefined
const MAGAZORD_PASS = import.meta.env.VITE_MAGAZORD_PASS as string | undefined

// Em dev o proxy do Vite cuida do auth; em prod apontaria para um backend próprio.
const PROXY_BASE = '/magazord-api/v2'

export function isMagazordConfigured(): boolean {
  // Em produção na Vercel, as credenciais estão seguras na Edge Function, não no frontend.
  // Assumimos que está configurado e deixamos a request falhar se não estiver.
  if (import.meta.env.PROD) return true
  
  return !!(
    MAGAZORD_USER &&
    MAGAZORD_PASS &&
    !MAGAZORD_USER.includes('seu-usuario') &&
    !MAGAZORD_PASS.includes('sua-senha')
  )
}

/** Estado de configuração para exibir no Settings */
export type MagazordStatus = 'configured' | 'missing' | 'error'
let _lastStatus: MagazordStatus = isMagazordConfigured() ? 'configured' : 'missing'
export const getMagazordStatus = () => _lastStatus

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MagazordOrderItem {
  id: number
  sku: string
  nome: string
  quantidade: number
  preco_unitario: number
  preco_total: number
  personalizado?: {
    moldura?: string
    tamanho?: string
    formato?: string
    acabamento?: string
    obs?: string
  }
}

export interface MagazordOrderDelivery {
  nome: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  frete: number
  transportadora: string
  prazo_entrega: string   // ISO date
  codigo_rastreio?: string
}

export interface MagazordOrder {
  id: number                        // ID interno Magazord
  numero: string                    // Ex.: "MG-00823"
  data_pedido: string               // ISO datetime
  situacao: number                  // código numérico da situação (ver spec)
  status: string                    // label legível derivado
  cliente: {
    nome: string
    email: string
    cpf?: string
    telefone?: string
  }
  itens: MagazordOrderItem[]
  entrega: MagazordOrderDelivery
  valor_total: number
  observacao?: string
  origem: 'site' | 'marketplace' | 'balcao'
  canal: string                     // "Site", "Mercado Livre", "Shopee", …
  [key: string]: any                // Fallback para propriedades adicionais da API V2
}

export interface MagazordOrdersResponse {
  status: string
  data: {
    items: MagazordOrder[]
    page_count: number
    page: number
    limit: number
    total: number
    total_pages: number
    has_more: boolean
  }
}

// ─── Situações numéricas → label ───────────────────────────────────────────────

const SITUACAO_LABEL: Record<number, string> = {
  1: 'Aguardando Pagamento',
  2: 'Cancelado Pagamento',
  3: 'Em Análise Pagamento',
  4: 'Aprovado',
  5: 'Aprovado e Integrado',
  6: 'Nota Fiscal Emitida',
  7: 'Transporte',
  8: 'Entregue',
  23: 'Faturamento Iniciado',
}

function situacaoLabel(code: number): string {
  return SITUACAO_LABEL[code] ?? `Situação ${code}`
}

// ─── Mock data (fallback quando não configurado) ───────────────────────────────

export const MOCK_MAGAZORD_ORDERS: MagazordOrder[] = [
  {
    id: 8830, numero: 'MG-00830',
    data_pedido: new Date().toISOString(),
    situacao: 5, status: 'Aprovado e Integrado',
    origem: 'site', canal: 'Site',
    cliente: { nome: 'Beatriz Carvalho', email: 'beatriz@email.com', telefone: '(11) 98765-4321' },
    itens: [{
      id: 1, sku: 'CL-CANVAS-001', nome: 'Canvas Personalizado 1 Tela', quantidade: 1,
      preco_unitario: 890, preco_total: 890,
      personalizado: { moldura: 'Caixa Preta', tamanho: '115×75 cm', formato: '1 Tela', acabamento: 'Com Vidro' },
    }],
    entrega: {
      nome: 'Beatriz Carvalho', logradouro: 'Rua Haddock Lobo', numero: '595', bairro: 'Jardins',
      cidade: 'São Paulo', uf: 'SP', cep: '01414-002', frete: 45,
      transportadora: 'JadLog', prazo_entrega: '2026-04-20T00:00:00',
    },
    valor_total: 935, observacao: 'Foto enviada por e-mail. Urgente.',
  },
  {
    id: 8831, numero: 'MG-00831',
    data_pedido: new Date(Date.now() - 3_600_000).toISOString(),
    situacao: 5, status: 'Aprovado e Integrado',
    origem: 'marketplace', canal: 'Mercado Livre',
    cliente: { nome: 'Thiago Mendes', email: 'thiago.m@email.com', telefone: '(21) 99988-7766' },
    itens: [{
      id: 2, sku: 'CL-TRIPTICO-001', nome: 'Tríptico Personalizado 3 Telas', quantidade: 1,
      preco_unitario: 1450, preco_total: 1450,
      personalizado: { moldura: 'Flutuante Preta', tamanho: '90×50 cm cada', formato: '3 Telas', acabamento: 'Sem Vidro' },
    }],
    entrega: {
      nome: 'Thiago Mendes', logradouro: 'Av. Atlântica', numero: '1702', bairro: 'Copacabana',
      cidade: 'Rio de Janeiro', uf: 'RJ', cep: '22021-001', frete: 78,
      transportadora: 'Total Express', prazo_entrega: '2026-04-18T00:00:00',
    },
    valor_total: 1528,
  },
  {
    id: 8832, numero: 'MG-00832',
    data_pedido: new Date(Date.now() - 7_200_000).toISOString(),
    situacao: 5, status: 'Aprovado e Integrado',
    origem: 'marketplace', canal: 'Shopee',
    cliente: { nome: 'Larissa Fonseca', email: 'larissa.f@email.com', telefone: '(31) 97777-5544' },
    itens: [{
      id: 3, sku: 'CL-QUADRO-001', nome: 'Quadro Moldura 1 Tela Quadrado', quantidade: 2,
      preco_unitario: 620, preco_total: 1240,
      personalizado: { moldura: 'Roma Moderna', tamanho: '85×85 cm', formato: '1 Tela Quadrado', acabamento: 'Com Vidro' },
    }],
    entrega: {
      nome: 'Larissa Fonseca', logradouro: 'Rua da Bahia', numero: '1148', bairro: 'Lourdes',
      cidade: 'Belo Horizonte', uf: 'MG', cep: '30160-011', frete: 62,
      transportadora: 'Loggi', prazo_entrega: '2026-04-22T00:00:00',
    },
    valor_total: 1302,
  },
]

// ─── Internal fetch helper ─────────────────────────────────────────────────────

async function mzFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${PROXY_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    _lastStatus = 'error'
    throw new Error(`[Magazord] ${res.status} ${res.statusText} — ${text}`)
  }

  _lastStatus = 'configured'
  return res.json() as Promise<T>
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Busca pedidos que precisam ser produzidos (situações 4, 5, 6, 7 e 23).
 * Inclui situação 7 (Transporte) pois ao faturar na Magazord o pedido vai
 * direto para "Em Transporte" antes mesmo de ser produzido.
 * A deduplicação no kanban garante que pedidos já confirmados não duplicam.
 * Retorna mock se as credenciais não estiverem configuradas.
 */
export async function fetchPendingOrders(): Promise<MagazordOrder[]> {
  if (!isMagazordConfigured()) {
    await new Promise(r => setTimeout(r, 500))
    return MOCK_MAGAZORD_ORDERS
  }

  try {
    // Janela de 60 dias — garante que nenhum pedido recente seja perdido ("pedido batido")
    // O Supabase é o source of truth; a API do Magazord só injeta pedidos ainda não conhecidos.
    const d = new Date()
    d.setDate(d.getDate() - 60)
    const dataInicial = d.toISOString().split('T')[0]

    // Fazer apenas uma chamada e filtrar os status do lado do cliente
    // (a API ignora o parâmetro ?situacao se mal formatado, causando requisições idênticas)
    const json = await mzFetch<MagazordOrdersResponse>(
      `/site/pedido?dataPedidoInicial=${dataInicial}&limit=100&order=id&orderDirection=desc`
    )
    
    // 4=Aprovado, 5=Aprovado e Integrado, 6=Nota Fiscal Emitida,
    // 7=Transporte (faturado antes da produção), 23=Faturamento Iniciado
    const allowedSituations = [4, 5, 6, 7, 23]
    const items = json?.data?.items ?? []
    
    const results: MagazordOrder[] = items
      // V2 API may use 'pedidoSituacao' or 'situacao' depending on the endpoint version
      .filter(o => allowedSituations.includes(o.pedidoSituacao ?? o.situacao ?? 0))
      .map(o => ({
        ...o,
        status: situacaoLabel(o.pedidoSituacao ?? o.situacao ?? 0),
      }))
    return results
  } catch (err) {
    console.error('[Magazord] fetchPendingOrders falhou:', err)
    _lastStatus = 'error'
    return []
  }
}

// ─── Mapeamento situação Magazord → etapa do kanban ──────────────────────────

export interface MagazordHistoricoOrder {
  numero:          string
  magazordId?:     number
  cliente:         string
  produto:         string
  canal?:          string
  etapa:           string
  arquivado:       boolean
  valor?:          number
  frete?:          number
  transportadora?: string
  prazoEntrega?:   string
  endereco?:       string
  moldura?:        string
  acabamento?:     string
  obs?:            string
  situacao:        number
}

function situacaoToEtapa(situacao: number): { etapa: string; arquivado: boolean } | null {
  switch (situacao) {
    case 4:  return { etapa: 'Novos Pedidos',      arquivado: false }
    case 5:  return { etapa: 'Impressão',           arquivado: false }
    case 23: return { etapa: 'Impressão',           arquivado: false }
    case 6:  return { etapa: 'Prontos para Envio',  arquivado: false }
    case 7:  return { etapa: 'Despachados',         arquivado: false }
    case 8:  return { etapa: 'Despachados',         arquivado: true  } // Entregue → arquiva
    case 1:  return { etapa: 'Novos Pedidos',       arquivado: false } // Aguardando Pagamento
    case 3:  return { etapa: 'Novos Pedidos',       arquivado: false } // Em Análise
    case 2:  return null // Cancelado — ignora
    default: return { etapa: 'Novos Pedidos',       arquivado: false }
  }
}

/**
 * Importação histórica completa — busca TODOS os pedidos do Magazord paginando
 * desde `dataInicio` (padrão: 3 anos atrás). Chama `onProgress` a cada lote.
 * Use apenas como ação admin única; retorna array de MagazordHistoricoOrder
 * pronto para upsert no Supabase.
 */
export async function fetchAllMagazordOrders(
  onProgress: (info: { fetched: number; total: number | null; page: number }) => void,
  dataInicio = '2022-01-01',
): Promise<MagazordHistoricoOrder[]> {
  if (!isMagazordConfigured()) return []

  const PAGE_SIZE = 100
  const allOrders: MagazordHistoricoOrder[] = []
  let page = 1
  let totalFromApi: number | null = null

  while (true) {
    try {
      const json = await mzFetch<MagazordOrdersResponse>(
        `/site/pedido?dataPedidoInicial=${dataInicio}&limit=${PAGE_SIZE}&page=${page}&order=id&orderDirection=desc`
      )
      const items = (json?.data?.items ?? []) as any[]
      if (page === 1) totalFromApi = json?.data?.total ?? null

      for (const o of items) {
        const situacao = o.pedidoSituacao ?? o.situacao ?? 0
        const mapped = situacaoToEtapa(situacao)
        if (!mapped) continue // pula cancelados

        const e = o.entrega ?? {}
        const enderecoList = [o.logradouro, o.numero, o.complemento, o.bairro,
          o.cidadeNome && o.estadoSigla ? `${o.cidadeNome}/${o.estadoSigla}` : undefined, o.cep
        ].filter(Boolean)

        allOrders.push({
          numero:          String(o.codigo || o.id),
          magazordId:      o.id,
          cliente:         o.pessoaNome || o.cliente?.nome || 'Cliente não informado',
          produto:         o.itens?.[0]?.nome || o.arrayPedidoItem?.[0]?.nome || 'Consulte o Painel Mz.',
          canal:           o.canal,
          etapa:           mapped.etapa,
          arquivado:       mapped.arquivado,
          valor:           parseFloat(String(o.valorTotal || 0)) || undefined,
          frete:           parseFloat(String(o.valorFreteTransportadora || o.valorFrete || o.pedidoValorFrete || e.frete || 0)) || undefined,
          transportadora:  o.transportadoraNome || e.transportadora || undefined,
          prazoEntrega:    o.pedidoPrazoEntregaCliente || o.pedidoDataPrevistaEntrega || e.prazo_entrega || undefined,
          endereco:        enderecoList.length > 0 ? enderecoList.join(', ') : (e.logradouro ? [e.logradouro, e.numero, e.bairro, `${e.cidade}/${e.uf}`, e.cep].filter(Boolean).join(', ') : undefined),
          moldura:         undefined,
          acabamento:      undefined,
          obs:             o.observacao || undefined,
          situacao,
        })
      }

      onProgress({ fetched: allOrders.length, total: totalFromApi, page })

      // Para quando não há mais páginas
      if (items.length < PAGE_SIZE || page >= 50) break
      page++

      // Pequena pausa entre páginas para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      console.error(`[Magazord] fetchAllMagazordOrders page ${page} falhou:`, err)
      break
    }
  }

  return allOrders
}

/**
 * Busca um pedido pelo Código Ex.: '0012604724740'
 */
export async function fetchOrderByCodigo(codigo: string): Promise<any | null> {
  if (!isMagazordConfigured()) {
    return MOCK_MAGAZORD_ORDERS.find(o => o.numero === codigo || String(o.id) === codigo) ?? null
  }
  try {
    const json = await mzFetch<{ status: string; data: any }>(`/site/pedido/${codigo}`)
    const o = json?.data
    if (!o) return null
    return o
  } catch (err) {
    console.error('[Magazord] fetchOrderByCodigo falhou:', err)
    return null
  }
}

// ─── Shape for freight analytics ──────────────────────────────────────────────

export interface FreightOrderData {
  codigo: string
  transportadora: string
  frete: number
  valor: number
  data: string
  situacao?: number  // 4=Aprovado, 7=Transporte/Faturado, etc.
  quantidade?: number // Quantos itens há no pedido
  produtos?: {nome: string, qtd: number}[] // ARRAY de nomes de produtos (para extração de Analytics)
  fullyEnriched?: boolean // Marca se já passamos pela Fase 2 para extrair produtos precisos
}

const extractTransportadora = (o: any) => (o.transportadoraNome || o.entrega?.transportadora || 'Sem transportadora').trim()
const extractFrete = (o: any) => parseFloat(String(o.valorFreteTransportadora || o.valorFrete || o.pedidoValorFrete || o.entrega?.frete || 0)) || 0

// ─── Cache simples (5 min) para evitar chamadas duplas no mesmo carregamento ──
const _freightCache = new Map<string, { data: FreightOrderData[]; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

// Banco de Enriquecimento Permanente (Salvar em LocalStorage para que o detalhe fase 2 nunca despareça)
const _enrichDB: Record<string, Partial<FreightOrderData>> = (() => {
  try { return JSON.parse(localStorage.getItem('erp_freight_enrich_db') || '{}') } catch { return {} }
})()
function saveEnrichDB() {
  try { localStorage.setItem('erp_freight_enrich_db', JSON.stringify(_enrichDB)) } catch {}
}

function getCached(key: string): FreightOrderData[] | null {
  const c = _freightCache.get(key)
  if (!c) return null
  if (Date.now() - c.ts > CACHE_TTL) { _freightCache.delete(key); return null }
  return c.data
}
export function updateFreightCache(key: string, data: FreightOrderData[]) {
  _freightCache.set(key, { data, ts: Date.now() })
}

/**
 * Versão RÁPIDA — só usa o endpoint de lista (sem chamadas individuais).
 * Ideal para KPIs do Dashboard onde frete exato não é necessário.
 */
export async function fetchOrdersForKPIs(dias = 90): Promise<FreightOrderData[]> {
  const key = `kpis-v4-${dias}`
  const cached = getCached(key)
  if (cached) return cached

  if (!isMagazordConfigured()) return []

  try {
    const d = new Date()
    d.setDate(d.getDate() - dias)
    const dataInicial = d.toISOString().split('T')[0]
    const allowedSituations = new Set([4, 5, 6, 7, 8, 23])
    const PAGE_SIZE = 100
    const allItems: any[] = []
    let page = 1

    while (true) {
      const json = await mzFetch<MagazordOrdersResponse>(
        `/site/pedido?dataPedidoInicial=${dataInicial}&limit=${PAGE_SIZE}&page=${page}&order=id&orderDirection=desc`
      )
      const items = (json?.data?.items ?? []) as any[]
      allItems.push(...items)
      if (items.length < PAGE_SIZE || page >= 20) break
      page++
    }

    const filtered = allItems.filter(o => allowedSituations.has(o.pedidoSituacao ?? o.situacao ?? -1))
    const toProcess = filtered.length > 0 ? filtered : allItems

    const result: FreightOrderData[] = toProcess.map((o: any) => {
      const baseCodigo = String(o.codigo || o.id)
      const cachedDetail = _enrichDB[baseCodigo]

      const itemsArr = o.itens || o.arrayPedidoItem || o.pedidoItem || []
      const calcProdutos = itemsArr.map((i: any) => {
        const baseName = i.nome || i.produtoNome || ''
        const derivacao = i.produtoDerivacaoNome || i.produtoDerivacao || ''
        const nomeFinal = `${baseName} ${derivacao}`.trim()
        const qtd = Number(i.quantidade) || 1
        return nomeFinal ? { nome: nomeFinal, qtd } : null
      }).filter(Boolean) as {nome: string, qtd: number}[]

      // Se temos no DB Permanente, damos override nas info da Fase 1 usando o Enriquecido
      return {
        codigo: baseCodigo,
        transportadora: cachedDetail?.transportadora || extractTransportadora(o),
        frete: cachedDetail?.frete !== undefined ? cachedDetail.frete : extractFrete(o),
        valor: parseFloat(String(o.valorTotal || 0)) || 0,
        data: o.dataHora || o.data_pedido || new Date().toISOString(),
        situacao: o.pedidoSituacao ?? o.situacao,
        quantidade: cachedDetail?.quantidade || undefined,
        produtos: cachedDetail?.produtos || calcProdutos,
        fullyEnriched: cachedDetail?.fullyEnriched || false
      }
    })

    updateFreightCache(key, result)
    return result
  } catch (err) {
    console.error('[Magazord] fetchOrdersForKPIs falhou:', err)
    return []
  }
}


/**
 * Busca TODOS os pedidos paginados (fase 1 — rápida, sem detalhe).
 * Retorna imediatamente para preencher KPIs e contagens.
 */
export async function fetchOrdersForFreightAnalysis(dias = 90): Promise<FreightOrderData[]> {
  const key = `freight-${dias}`
  const cached = getCached(key)
  if (cached) return cached

  if (!isMagazordConfigured()) {
    return MOCK_MAGAZORD_ORDERS.map(o => ({
      codigo: String((o as any).codigo || o.id),
      transportadora: o.entrega?.transportadora || 'Sem transportadora',
      frete: o.entrega?.frete || 0,
      valor: o.valor_total || 0,
      data: o.data_pedido || new Date().toISOString(),
    }))
  }

  try {
    const phase1 = await _fetchAllOrdersPhase1(dias)
    updateFreightCache(key, phase1)
    return phase1
  } catch (err) {
    console.error('[Magazord] fetchOrdersForFreightAnalysis falhou:', err)
    return []
  }
}

/**
 * Enriquece TODOS os pedidos com transportadora/frete via detalhe individual.
 * Chama onProgress após cada lote para atualizar a UI em tempo real.
 * Invalida o cache ao final para que a próxima visita use os dados completos.
 */
export async function enrichOrdersWithCarriers(
  orders: FreightOrderData[],
  onProgress: (enriched: FreightOrderData[]) => void,
  concurrency = 12
): Promise<FreightOrderData[]> {
  // Copia mutável para ir enriquecendo
  const result = orders.map(o => ({ ...o }))
  const byCode = new Map(result.map(o => [o.codigo, o]))

  const needsDetail = orders.filter(o => o.transportadora === 'Sem transportadora' || o.frete === 0 || !o.fullyEnriched)
  console.log(`[Freight] Enriquecendo ${needsDetail.length} de ${orders.length} pedidos...`)

  for (let i = 0; i < needsDetail.length; i += concurrency) {
    const batch = needsDetail.slice(i, i + concurrency)
    await Promise.all(batch.map(async (order) => {
      try {
        const detail = await mzFetch<{ status: string; data: any }>(`/site/pedido/${order.codigo}`)
        const data = detail?.data
        if (!data) return
        const rastreio = (data.arrayPedidoRastreio ?? [])[0] ?? {}
        const trans = (rastreio.transportadoraNome || data.transportadoraNome || '').trim()
        const frete = parseFloat(String(rastreio.valorFreteTransportadora || rastreio.valorFrete || data.valorFrete || 0)) || 0
        const entry = byCode.get(order.codigo)
        if (entry) {
          if (trans) entry.transportadora = trans
          if (frete > 0) entry.frete = frete
          // Extrair a quantidade real de quadros/itens (volumes)
          const itemsArr = rastreio.pedidoItem || data.arrayPedidoItem || data.pedidoItem || []
          const qtd = itemsArr.reduce((sum: number, it: any) => sum + (Number(it.quantidade) || 1), 0)
          if (qtd > 0) entry.quantidade = qtd
          
          // Se não tinhamos produtos ou se o detalhe tem mais garantia sobre os nomes, salvamos
          if (!entry.produtos || entry.produtos.length === 0) {
            entry.produtos = itemsArr.map((i: any) => {
              const baseName = i.nome || i.produtoNome || ''
              const derivacao = i.produtoDerivacaoNome || i.produtoDerivacao || ''
              const nomeFinal = `${baseName} ${derivacao}`.trim()
              const qtd = Number(i.quantidade) || 1
              return nomeFinal ? { nome: nomeFinal, qtd } : null
            }).filter(Boolean) as {nome: string, qtd: number}[]
          }
          // Marca como totalmente extraido
          entry.fullyEnriched = true
          
          // Persistence fallback pra agilizar os futuros refreshes de cache F5
          _enrichDB[entry.codigo] = { 
            transportadora: entry.transportadora, 
            frete: entry.frete, 
            quantidade: entry.quantidade, 
            produtos: entry.produtos,
            fullyEnriched: true
          }
        }
      } catch { /* ignora */ }
    }))
    saveEnrichDB()
    // Notifica UI com snapshot atual após cada lote
    onProgress([...result])
    console.log(`[Freight] Lote ${Math.ceil((i + concurrency) / concurrency)}: ${Math.min(i + concurrency, needsDetail.length)}/${needsDetail.length} enriquecidos`)
  }

  // Salva resultado completo no cache
  const key = `freight-${orders.length}`
  _freightCache.set(`freight-90`, { data: result, ts: Date.now() })

  return result
}

/** Função interna — busca lista paginada sem detalhe */
async function _fetchAllOrdersPhase1(dias: number): Promise<FreightOrderData[]> {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  const dataInicial = d.toISOString().split('T')[0]
  const allowedSituations = new Set([4, 5, 6, 7, 8, 23])

  const PAGE_SIZE = 100
  const allItems: any[] = []
  let page = 1

  while (true) {
    const json = await mzFetch<MagazordOrdersResponse>(
      `/site/pedido?dataPedidoInicial=${dataInicial}&limit=${PAGE_SIZE}&page=${page}&order=id&orderDirection=desc`
    )
    const items = (json?.data?.items ?? []) as any[]
    allItems.push(...items)
    console.log(`[Freight] Pag. ${page}: ${items.length} pedidos (total: ${allItems.length})`)
    if (items.length < PAGE_SIZE || page >= 20) break
    page++
  }

  const filtered = allItems.filter(o => allowedSituations.has(o.pedidoSituacao ?? o.situacao ?? -1))
  const toProcess = filtered.length > 0 ? filtered : allItems

  return toProcess.map((o: any) => ({
    codigo: String(o.codigo || o.id),
    transportadora: extractTransportadora(o),
    frete: extractFrete(o),
    valor: parseFloat(String(o.valorTotal || 0)) || 0,
    data: o.dataHora || o.data_pedido || new Date().toISOString(),
    situacao: o.pedidoSituacao ?? o.situacao,
    quantidade: 1, // Phase 1 assume 1 volume, Phase 2 vai corrigir com o número real
    produtos: (o.itens || o.arrayPedidoItem || o.pedidoItem || []).map((i: any) => i.nome || i.produtoNome || '').filter(Boolean)
  }))
}

/**
 * Atualiza a situação do pedido na Magazord.
 * situacaoCode: 5=Aprovado e Integrado, 7=Transporte, 8=Entregue
 */
export async function updateOrderSituacao(
  orderId: number,
  situacaoCode: number,
  extra?: { codigoRastreio?: string; transportadora?: string }
): Promise<boolean> {
  if (!isMagazordConfigured()) {
    await new Promise(r => setTimeout(r, 300))
    console.info('[Magazord Mock] updateOrderSituacao', orderId, situacaoCode, extra)
    return true
  }

  try {
    await mzFetch(`/pedido/${orderId}/situacao`, {
      method: 'PUT',
      body: JSON.stringify({
        situacao: situacaoCode,
        ...(extra?.codigoRastreio ? { codigoRastreio: extra.codigoRastreio } : {}),
        ...(extra?.transportadora  ? { transportadora: extra.transportadora   } : {}),
      }),
    })
    return true
  } catch (err) {
    console.error('[Magazord] updateOrderSituacao falhou:', err)
    return false
  }
}

/**
 * Testa a conexão com a API. Retorna true se OK.
 */
export async function testMagazordConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isMagazordConfigured()) {
    return { ok: false, message: 'Credenciais não configuradas.' }
  }
  try {
    await mzFetch('/pedido?limit=1')
    _lastStatus = 'configured'
    return { ok: true, message: 'Conexão estabelecida com sucesso!' }
  } catch (err) {
    _lastStatus = 'error'
    return { ok: false, message: String(err) }
  }
}

// ─── Shape interno do ERP (compatível com Production.tsx) ─────────────────────

interface ERPOrder {
  id: string
  magazordId?: number
  cliente: string
  clienteEmail?: string
  clienteTelefone?: string
  produto: string
  material?: string
  moldura?: string
  acabamento?: string
  tamanho?: string
  formato?: string
  quantidade?: number
  canal?: string
  data: string
  hora: string
  status: 'Pendente' | 'Atrasado' | 'OK'
  obs?: string
  endereco?: string
  transportadora?: string
  prazoEntrega?: string
  valor?: number
  frete?: number
  fromMagazord?: boolean
  notaFiscal?: string
}

/**
 * Converte um pedido Magazord para o shape interno do ERP Kanban.
 */
export function magazordToOrder(order: MagazordOrder): ERPOrder {
  // Safely extract item details (may not be present in list endpoint)
  const item = order.itens?.[0]
  const p = item?.personalizado

  // Build full delivery address string
  const e = order.entrega
  const endereco = e
    ? [e.logradouro, e.numero, e.complemento, e.bairro, `${e.cidade}/${e.uf}`, e.cep]
        .filter(Boolean).join(', ')
    : undefined

  // Product description: use item name if available
  const produto = item?.nome && item.nome !== ''
    ? item.nome
    : 'Consulte o Painel Mz.'

  // Safe date helpers — never produce "Invalid Date" string
  const safeDateStr = (raw?: string | null, suffix = '') => {
    if (!raw) return ''
    const d = new Date((raw + suffix).replace(' ', 'T'))
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
  }
  const safeTimeStr = (raw?: string | null) => {
    if (!raw) return ''
    const d = new Date(raw.replace(' ', 'T'))
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // Resolve which API date field is populated
  const rawDate = order.dataHora || order.data_pedido || null

  return {
    id: String(order.codigo || order.id),

    magazordId: order.id,
    cliente: order.pessoaNome || order.cliente?.nome || 'Cliente não informado',
    clienteEmail: order.cliente?.email,
    clienteTelefone: order.cliente?.telefone,
    produto,
    material: undefined,                      // não disponível na listagem
    moldura: p?.moldura,
    acabamento: p?.acabamento,
    tamanho: p?.tamanho,
    formato: p?.formato,
    quantidade: item?.quantidade,
    canal: order.canal,
    data: safeDateStr(rawDate) || new Date().toLocaleDateString('pt-BR'),
    hora: safeTimeStr(rawDate),
    status: 'Pendente',
    obs: order.observacao || item?.personalizado?.obs,
    endereco,
    transportadora: e?.transportadora || order.transportadoraNome || order.rastreio?.transportadoraNome,
    prazoEntrega:
      safeDateStr(e?.prazo_entrega) ||
      safeDateStr((order as any).pedidoPrazoEntregaCliente, 'T12:00:00') ||
      safeDateStr((order as any).pedidoDataPrevistaEntrega, 'T12:00:00') ||
      safeDateStr((order as any).prazoEntregaCliente, 'T12:00:00') ||
      safeDateStr((order as any).prazo_entrega_cliente, 'T12:00:00') ||
      safeDateStr((order as any).pedidoPrazoEntrega, 'T12:00:00') ||
      undefined,
    valor: order.valorTotal
      ? parseFloat(String(order.valorTotal))
      : order.valor_total || undefined,
    frete: (e?.frete ?? parseFloat(order.valorFrete || order.valor_frete || order.pedidoValorFrete || "0")) || 0,
    fromMagazord: true,
    notaFiscal:
      (order as any).pedidoNotaFiscalNumero ||
      (order as any).notaFiscalNumero ||
      (order as any).numeronf ||
      (order as any).numero_nf ||
      (order as any).notaFiscal ||
      (order as any).arrayPedidoNota?.[0]?.numero ||
      undefined,
  }
}

/**
 * Converte a resposta do endpoint individual (v2/site/pedido/{codigo}) para os detalhes ricos
 */
export function magazordDetailedToOrder(data: any): any {
  if (!data) return {}

  const rastreio = data.arrayPedidoRastreio?.[0] || {}
  const item = rastreio.pedidoItem?.[0] || {}

  const enderecoList = [
    data.logradouro, data.numero, data.complemento,
    data.bairro, data.cidadeNome && data.estadoSigla ? `${data.cidadeNome}/${data.estadoSigla}` : undefined,
    data.cep
  ].filter(Boolean)

  // O custo real do frete para a empresa é o valorFreteTransportadora.
  // Caso não exista, faz fallback para o valorFrete (o que o cliente pagou).
  const freteStr = rastreio.valorFreteTransportadora || rastreio.valorFrete || data.valorFrete || "0"
  const freteValue = parseFloat(freteStr)

  // Safe date parser
  const safeDateStr = (raw?: string | null, suffix = '') => {
    if (!raw) return undefined
    const d = new Date((raw + suffix).replace(' ', 'T'))
    return isNaN(d.getTime()) ? undefined : d.toLocaleDateString('pt-BR')
  }

  // Fallbacks: Try to parse moldura/acabamento from derivacao or leave undefined for user input
  const derivacao = item.produtoDerivacaoNome || ''
  const tamanho = derivacao.includes('x') ? derivacao.match(/\d+x\d+cm/i)?.[0] || derivacao : undefined

  // DEBUG temporário: mostra no console do browser os campos NF retornados pela Magazord
  // eslint-disable-next-line no-console
  console.log('[Magazord NF Debug] arrayPedidoNota:', JSON.stringify(data.arrayPedidoNota))
  // eslint-disable-next-line no-console
  console.log('[Magazord NF Debug] rastreio NF keys:', Object.keys(rastreio).filter(k => /nota|nf|fiscal/i.test(k)))
  // eslint-disable-next-line no-console
  console.log('[Magazord NF Debug] data NF keys:', Object.keys(data).filter(k => /nota|nf|fiscal/i.test(k)))

  const baseOrder = {
    clienteEmail: data.pessoaEmail || undefined,
    clienteTelefone: data.pessoaContato || undefined,
    produto: item.produtoTitulo || undefined,
    tamanho: tamanho,
    formato: derivacao || undefined,
    quantidade: item.quantidade || undefined,
    frete: !isNaN(freteValue) ? freteValue : undefined,
    prazoEntrega: safeDateStr(rastreio.dataLimiteEntregaCliente, 'T12:00:00'),
    endereco: enderecoList.length > 0 ? enderecoList.join(', ') : undefined,
    transportadora: rastreio.transportadoraNome || undefined,
    imagemUrl: data.lojaUrlImagem && item.midiaPath && item.midiaName
      ? `${data.lojaUrlImagem}/${item.midiaPath}${item.midiaName}`
      : undefined,
    itens: (rastreio.pedidoItem || []).map((i: any) => {
      const dev = i.produtoDerivacaoNome || ''
      const tam = dev.includes('x') ? dev.match(/\d+x\d+cm/i)?.[0] || dev : undefined
      return {
        produto: i.produtoTitulo || i.descricao || 'Produto sem nome',
        quantidade: i.quantidade || 1,
        tamanho: tam,
        formato: dev || undefined,
        imagemUrl: data.lojaUrlImagem && i.midiaPath && i.midiaName
          ? `${data.lojaUrlImagem}/${i.midiaPath}${i.midiaName}`
          : undefined
      }
    }),
  }

  // ── Extração Inteligente de Nota Fiscal ──
  // A Magazord V2 varia muito onde coloca a NF (arrayPedidoNota, pedidoNota, notaFiscal, etc).
  // Vamos buscar em todos os lugares possíveis recursivamente.
  let nfEncontrada: string | undefined = undefined;

  const buscarNfNoObjeto = (obj: any): string | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;
    // Chaves mais comuns:
    if (obj.numero && !isNaN(Number(obj.numero))) return String(obj.numero);
    if (obj.notaNumero) return String(obj.notaNumero);
    if (obj.numeroNf) return String(obj.numeroNf);
    if (obj.nNF || obj.nNf) return String(obj.nNF || obj.nNf);
    if (obj.notaFiscalNumero) return String(obj.notaFiscalNumero);
    
    // Tenta dentro de notas
    if (obj.nota_fiscal && obj.nota_fiscal.numero) return String(obj.nota_fiscal.numero);
    if (obj.nota && obj.nota.numero) return String(obj.nota.numero);
    
    return undefined;
  };

  // 1. Tenta nos arrays conhecidos
  const notasArrays = [data.arrayPedidoNota, data.pedidoNota, rastreio.notasFiscais, data.notas];
  for (const arr of notasArrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      const nf = buscarNfNoObjeto(arr[0]);
      if (nf) {
        nfEncontrada = nf;
        break;
      }
    }
  }

  // 2. Se não achou em arrays, tenta direto na raiz pelas chaves explícitas (não por numero genérico)
  if (!nfEncontrada) {
    nfEncontrada = 
      rastreio.pedidoNotaFiscal?.[0]?.numero ||
      rastreio.pedidoNotaFiscal?.[0]?.notaFiscalNumero ||
      data.notaFiscalNumero ||
      data.pedidoNotaFiscalNumero ||
      data.notaFiscal || 
      data.numero_nf || 
      data.numeronf ||
      rastreio.notaFiscalNumero ||
      rastreio.pedidoNotaFiscalNumero;
  }

  // O debug via UI foi removido a pedido do usuário (para parar de poluir a tela com arrays vazios etc)
  return {
    ...baseOrder,
    notaFiscal: nfEncontrada,
  }
}
