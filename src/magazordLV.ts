/**
 * magazordLV.ts
 * Integração Magazord para a loja Lar e Vida.
 * Espelha a estrutura de magazord.ts mas aponta para /magazord-lv-api (proxy
 * Vite → larevida.painel.magazord.com.br).
 *
 * Env vars:
 *   VITE_MAGAZORD_LV_BASE_URL=https://larevida.painel.magazord.com.br
 *   VITE_MAGAZORD_LV_USER=<usuário-api>   (deixar em branco → usa creds da CL)
 *   VITE_MAGAZORD_LV_PASS=<senha-api>
 */

// ─── Re-export dos tipos compartilhados ───────────────────────────────────────
export type {
  MagazordOrder,
  MagazordOrderItem,
  MagazordOrderDelivery,
  MagazordOrdersResponse,
  FreightOrderData
} from './magazord'

import type { MagazordOrder, MagazordOrdersResponse, FreightOrderData } from './magazord'

const _enrichDB: Record<string, Partial<FreightOrderData>> = (() => {
  try { return JSON.parse(localStorage.getItem('erp_lv_freight_enrich_db') || '{}') } catch { return {} }
})()
function saveEnrichDB() {
  try { localStorage.setItem('erp_lv_freight_enrich_db', JSON.stringify(_enrichDB)) } catch {}
}

const extractUF = (o: any): string | undefined => {
  if (!o) return undefined
  let val = o.estadoSigla || o.uf || o.entrega?.uf || o.entrega?.estadoSigla || o.endereco?.uf || o.endereco?.estadoSigla || o.cliente?.uf || o.cliente?.estadoSigla || o.destinatario?.uf || o.destinatario?.estadoSigla || o.estado
  
  if (!val) {
    const addr = String(o.endereco || o.enderecoEntrega || o.logradouro || o.entrega?.logradouro || o.entrega?.endereco || o.entrega?.cidade || '')
    const m = addr.match(/(?:\/|\-|\s|^)([A-Z]{2})(?:\s|\-|$|,)/i)
    if (m) val = m[1].toUpperCase()
  }

  if (typeof val === 'string') {
    const v = val.trim().toUpperCase()
    if (v.length === 2) return v
    
    const stateNamesMap: Record<string, string> = {
      'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPA': 'AP', 'AMAZONAS': 'AM',
      'BAHIA': 'BA', 'CEARA': 'CE', 'DISTRITO FEDERAL': 'DF',
      'ESPIRITO SANTO': 'ES', 'GOIAS': 'GO', 'MARANHAO': 'MA', 'MATO GROSSO': 'MT',
      'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG', 'PARA': 'PA', 'PARAIBA': 'PB',
      'PARANA': 'PR', 'PERNAMBUCO': 'PE', 'PIAUI': 'PI', 'RIO DE JANEIRO': 'RJ',
      'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS', 'RONDONIA': 'RO',
      'RORAIMA': 'RR', 'SANTA CATARINA': 'SC', 'SAO PAULO': 'SP', 'SERGIPE': 'SE', 'TOCANTINS': 'TO'
    }
    return stateNamesMap[v] || undefined
  }
  return undefined
}

// ─── Proxy base (dev) ─────────────────────────────────────────────────────────
const LV_PROXY_BASE = '/magazord-lv-api/v2'

// ─── Env vars (só para verificação de config; auth real é feito no proxy) ─────
const LV_USER = import.meta.env.VITE_MAGAZORD_LV_USER as string | undefined
const LV_PASS = import.meta.env.VITE_MAGAZORD_LV_PASS as string | undefined
// Fallback: usa creds da Casa Linda se LV estiver vazio
const CL_USER = import.meta.env.VITE_MAGAZORD_USER as string | undefined
const CL_PASS = import.meta.env.VITE_MAGAZORD_PASS as string | undefined

const effectiveUser = LV_USER || CL_USER
const effectivePass = LV_PASS || CL_PASS

export function isMagazordLVConfigured(): boolean {
  if (import.meta.env.PROD) return true
  return !!(
    effectiveUser &&
    effectivePass &&
    !effectiveUser.includes('seu-usuario') &&
    !effectivePass.includes('sua-senha')
  )
}

// ─── Status de configuração ───────────────────────────────────────────────────
export type MagazordLVStatus = 'configured' | 'missing' | 'error'
let _lvStatus: MagazordLVStatus = isMagazordLVConfigured() ? 'configured' : 'missing'
export const getMagazordLVStatus = () => _lvStatus

// ─── Situações → label (completo) ────────────────────────────────────────────
export const LV_SITUACAO_LABEL: Record<number, string> = {
  1:  'Aguardando Pagamento',
  2:  'Cancelado',
  3:  'Em Análise',
  4:  'Aprovado',
  5:  'Aprovado e Integrado',
  6:  'Nota Fiscal Emitida',
  7:  'Em Transporte',
  8:  'Entregue',
  23: 'Faturamento Iniciado',
}

export function lvSituacaoLabel(code: number): string {
  return LV_SITUACAO_LABEL[code] ?? `Situação ${code}`
}

// Mapeamento situação → coluna do Kanban LV
export function lvSituacaoToKanbanCol(situacao: number): string {
  switch (situacao) {
    case 4:
    case 5:
    case 23: return 'Novos Pedidos'
    case 6:  return 'Em Produção'      // Nota Fiscal = já entrou em produção
    case 7:  return 'Prontos para Envio'
    case 8:  return 'Enviados'
    default: return 'Novos Pedidos'
  }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
async function lvFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${LV_PROXY_BASE}${path}`
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
    _lvStatus = 'error'
    throw new Error(`[MagazordLV] ${res.status} ${res.statusText} — ${text}`)
  }

  _lvStatus = 'configured'
  return res.json() as Promise<T>
}

// ─── Situações a sincronizar (todas relevantes) ───────────────────────────────
// 4=Aprovado 5=Aprovado+Integrado 6=NF Emitida 7=Em Transporte 23=Faturando
const ALLOWED_SITUATIONS = [4, 5, 6, 7, 23]

// ─── fetchProductStockLV ──────────────────────────────────────────────────────
export async function fetchProductStockLV(referencia: string): Promise<number | null> {
  if (!isMagazordLVConfigured()) return null
  try {
    let json = await lvFetch<{ data: any; status: string }>(`/site/produto?referencia=${encodeURIComponent(referencia)}&limit=1`)
    let items = json?.data?.items || []
    if (items.length === 0) {
      json = await lvFetch<{ data: any; status: string }>(`/site/produto?codigo=${encodeURIComponent(referencia)}&limit=1`)
      items = json?.data?.items || []
      if (items.length === 0) return null
    }
    const p = items[0]
    
    // Tenta extrair de campos comuns da Magazord
    if (typeof p.estoqueAtual === 'number') return p.estoqueAtual
    if (typeof p.quantidadeEstoque === 'number') return p.quantidadeEstoque
    if (typeof p.estoque === 'number') return p.estoque
    if (typeof p.saldoDisponivel === 'number') return p.saldoDisponivel
    if (p.estoque && typeof p.estoque.disponivel === 'number') return p.estoque.disponivel
    if (p.estoque && typeof p.estoque.atual === 'number') return p.estoque.atual
    return 0
  } catch (err) {
    console.error(`[MagazordLV] Erro ao buscar estoque da ref ${referencia}:`, err)
    return null
  }
}

// ─── fetchPendingOrdersLV ─────────────────────────────────────────────────────
/**
 * Busca pedidos ativos na Lar e Vida Magazord.
 * Retorna array vazio (sem mock) caso não configurado — o Kanban LV é
 * primariamente manual; o Magazord é enriquecimento.
 */
export async function fetchPendingOrdersLV(dias = 5): Promise<MagazordOrder[]> {
  if (!isMagazordLVConfigured()) return []

  try {
    const d = new Date()
    d.setDate(d.getDate() - dias)
    const dataInicial = d.toISOString().split('T')[0]

    const json = await lvFetch<MagazordOrdersResponse>(
      `/site/pedido?dataPedidoInicial=${dataInicial}&limit=100&order=id&orderDirection=desc`
    )

    const items = json?.data?.items ?? []
    return items
      .filter(o => ALLOWED_SITUATIONS.includes(o.pedidoSituacao ?? o.situacao ?? 0))
      .map(o => ({
        ...o,
        status: lvSituacaoLabel(o.pedidoSituacao ?? o.situacao ?? 0),
      }))
  } catch (err) {
    console.error('[MagazordLV] fetchPendingOrdersLV falhou:', err)
    _lvStatus = 'error'
    return []
  }
}

// ─── fetchAllOrdersLV ────────────────────────────────────────────────────────
/**
 * Busca TODOS os status — útil para analytics, histórico e dashboards.
 */
export async function fetchAllOrdersLV(dias = 30): Promise<MagazordOrder[]> {
  if (!isMagazordLVConfigured()) return []

  try {
    const d = new Date()
    d.setDate(d.getDate() - dias)
    const dataInicial = d.toISOString().split('T')[0]

    const json = await lvFetch<MagazordOrdersResponse>(
      `/site/pedido?dataPedidoInicial=${dataInicial}&limit=100&order=id&orderDirection=desc`
    )

    const items = json?.data?.items ?? []
    return items.map(o => ({
      ...o,
      status: lvSituacaoLabel(o.pedidoSituacao ?? o.situacao ?? 0),
    }))
  } catch (err) {
    console.error('[MagazordLV] fetchAllOrdersLV falhou:', err)
    return []
  }
}

// ─── fetchOrderLVById ─────────────────────────────────────────────────────────
export async function fetchOrderLVById(id: number | string): Promise<MagazordOrder | null> {
  if (!isMagazordLVConfigured()) return null
  try {
    const json = await lvFetch<{ status: string; data: MagazordOrder }>(`/site/pedido/${id}`)
    const o = json?.data
    if (!o) return null
    return { ...o, status: lvSituacaoLabel(o.pedidoSituacao ?? o.situacao ?? 0) }
  } catch (err) {
    console.error('[MagazordLV] fetchOrderLVById falhou:', err)
    return null
  }
}

// ─── magazordDetailedToLVOrder ──────────────────────────────────────────────
export function magazordDetailedToLVOrder(data: any): any {
  if (!data) return {}

  const rastreio = data.arrayPedidoRastreio?.[0] || {}
  const item = rastreio.pedidoItem?.[0] || {}

  const enderecoList = [
    data.logradouro, data.numero, data.complemento,
    data.bairro, data.cidadeNome && data.estadoSigla ? `${data.cidadeNome}/${data.estadoSigla}` : undefined,
    data.cep
  ].filter(Boolean)

  const freteStr = rastreio.valorFreteTransportadora || rastreio.valorFrete || data.valorFrete || "0"
  const freteValue = parseFloat(freteStr)

  const safeDateStr = (raw?: string | null, suffix = '') => {
    if (!raw) return undefined
    const d = new Date((raw + suffix).replace(' ', 'T'))
    return isNaN(d.getTime()) ? undefined : d.toLocaleDateString('pt-BR')
  }

  const derivacao = item.produtoDerivacaoNome || ''
  const tamanho = derivacao.includes('x') ? derivacao.match(/\d+(?:,\d+)?\s*(?:m|cm)?\s*x\s*\d+(?:,\d+)?\s*(?:m|cm)?/i)?.[0] || derivacao : undefined

  let desenho: string | undefined = undefined
  const itemSku = item.produtoSku || item.codigoItem || ''
  const matchDS = itemSku.match(/([A-Z]+)-DS([\d-]+)/i)
  if (matchDS) {
    desenho = `${matchDS[1]} DESENHO ${matchDS[2]}`.toUpperCase()
  }

  return {
    clienteEmail: data.pessoaEmail || undefined,
    clienteTelefone: data.pessoaContato || undefined,
    produto: item.produtoTitulo || undefined,
    tamanho: tamanho,
    desenho: desenho,
    quantidade: item.quantidade || undefined,
    frete: !isNaN(freteValue) ? freteValue : undefined,
    prazoEntrega: safeDateStr(rastreio.dataLimiteEntregaCliente, 'T12:00:00'),
    endereco: enderecoList.length > 0 ? enderecoList.join(', ') : undefined,
    transportadora: rastreio.transportadoraNome || undefined,
    fotoUrl: data.lojaUrlImagem && item.midiaPath && item.midiaName
      ? `${data.lojaUrlImagem}/${item.midiaPath}${item.midiaName}`
      : undefined,
  }
}


// ─── updateOrderSituationLV ───────────────────────────────────────────────────
/**
 * Atualiza a situação de um pedido na Lar e Vida Magazord.
 * Situações possíveis: 4 Aprovado · 5 Integrado · 6 NF · 7 Transporte · 8 Entregue
 */
export async function updateOrderSituationLV(
  orderId: number | string,
  situacao: number,
): Promise<boolean> {
  if (!isMagazordLVConfigured()) return false
  try {
    await lvFetch(`/site/pedido/${orderId}/situacao`, {
      method: 'PUT',
      body: JSON.stringify({ situacao }),
    })
    return true
  } catch (err) {
    console.error('[MagazordLV] updateOrderSituationLV falhou:', err)
    return false
  }
}

// ─── Analytics Helpers ────────────────────────────────────────────────────────

const extractTransportadora = (o: any) => (o.transportadoraNome || o.entrega?.transportadora || 'Sem transportadora').trim()
const extractFrete = (o: any) => parseFloat(String(o.valorFreteTransportadora || o.valorFrete || o.pedidoValorFrete || o.entrega?.frete || 0)) || 0

export const MOCK_MAGAZORD_ORDERS_LV: MagazordOrder[] = [
  {
    id: 9901, numero: 'MGLV-0001',
    data_pedido: new Date().toISOString(),
    situacao: 5, status: 'Aprovado e Integrado',
    origem: 'site', canal: 'Site',
    cliente: { nome: 'Ana Souza', email: 'ana@email.com' },
    itens: [{
      id: 101, sku: 'LV-TAP-001', nome: 'Tapete Belga Geométrico 200x250cm', quantidade: 1,
      preco_unitario: 450, preco_total: 450,
    }],
    entrega: {
      nome: 'Ana Souza', logradouro: 'Rua A', numero: '10', bairro: 'Centro',
      cidade: 'São Paulo', uf: 'SP', cep: '01001-000', frete: 35,
      transportadora: 'JadLog', prazo_entrega: new Date(Date.now() + 172800000).toISOString(),
    },
    valor_total: 485,
  },
  {
    id: 9902, numero: 'MGLV-0002',
    data_pedido: new Date(Date.now() - 86400000).toISOString(),
    situacao: 7, status: 'Em Transporte',
    origem: 'marketplace', canal: 'Mercado Livre',
    cliente: { nome: 'Carlos Dias', email: 'carlos@email.com' },
    itens: [{
      id: 102, sku: 'LV-CAMA-001', nome: 'Jogo de Cama King 400 Fios', quantidade: 1,
      preco_unitario: 290, preco_total: 290,
    }],
    entrega: {
      nome: 'Carlos Dias', logradouro: 'Av B', numero: '20', bairro: 'Sul',
      cidade: 'Rio de Janeiro', uf: 'RJ', cep: '20000-000', frete: 45,
      transportadora: 'Total Express', prazo_entrega: new Date(Date.now() - 86400000).toISOString(),
    },
    valor_total: 335,
  },
  {
    id: 9903, numero: 'MGLV-0003',
    data_pedido: new Date(Date.now() - 172800000).toISOString(),
    situacao: 5, status: 'Aprovado e Integrado',
    origem: 'marketplace', canal: 'Shopee',
    cliente: { nome: 'Larissa Lima', email: 'larissa@email.com' },
    itens: [{
      id: 103, sku: 'LV-ALM-001', nome: 'Kit 4 Almofadas Veludo Mostarda', quantidade: 1,
      preco_unitario: 120, preco_total: 120,
    }],
    entrega: {
      nome: 'Larissa Lima', logradouro: 'Av C', numero: '30', bairro: 'Leste',
      cidade: 'Belo Horizonte', uf: 'MG', cep: '30000-000', frete: 25,
      transportadora: 'Loggi', prazo_entrega: new Date(Date.now() + 259200000).toISOString(),
    },
    valor_total: 145,
  }
]

export async function fetchOrdersForKPIsLV(dias = 90): Promise<FreightOrderData[]> {
  if (!isMagazordLVConfigured()) {
    // Return mock mapped to FreightOrderData shape
    return MOCK_MAGAZORD_ORDERS_LV.map(o => ({
      codigo: String(o.codigo || o.id),
      transportadora: o.entrega?.transportadora || 'Sem transportadora',
      frete: o.entrega?.frete || 0,
      valor: o.valor_total || 0,
      data: o.data_pedido || new Date().toISOString(),
      situacao: o.situacao,
      quantidade: o.itens?.reduce((acc, i) => acc + i.quantidade, 0) || 1,
      produtos: o.itens?.map(i => ({ nome: i.nome, qtd: i.quantidade })) || [],
      canal: o.canal || 'Site',
      uf: o.entrega?.uf,
    }))
  }

  try {
    const d = new Date()
    d.setDate(d.getDate() - dias)
    const dataInicial = d.toISOString().split('T')[0]
    const allowedSituations = new Set([4, 5, 6, 7, 8, 23])
    
    const PAGE_SIZE = 100
    const allItems: any[] = []
    let page = 1

    while (true) {
      const json = await lvFetch<MagazordOrdersResponse>(
        `/site/pedido?dataPedidoInicial=${dataInicial}&limit=${PAGE_SIZE}&page=${page}&order=id&orderDirection=desc`
      )
      const items = (json?.data?.items ?? []) as any[]
      allItems.push(...items)
      if (items.length < PAGE_SIZE || page >= 20) break // max 20 pages (2000 orders)
      page++
    }
    
    const filtered = allItems.filter(o => allowedSituations.has(o.pedidoSituacao ?? o.situacao ?? -1))
    
    return filtered.map(o => {
      const baseCodigo = String(o.codigo || o.id)
      const cachedDetail = _enrichDB[baseCodigo]

      const itemsArr = o.itens || o.arrayPedidoItem || o.pedidoItem || []
      const produtos = itemsArr.map((i: any) => {
        const nome = `${i.nome || i.produtoNome || ''} ${i.produtoDerivacaoNome || ''}`.trim()
        const sku = i.sku || i.codigo || undefined
        const fotoUrl = i.foto_url || i.produtoImagemUrl || i.imagemUrl || undefined
        let tamanho = i.tamanho || undefined
        if (!tamanho && nome) {
          const tMatch = nome.match(/(\d+,\d+m?\s*[xX]\s*\d+,\d+m?|\d{2,3}\s*[xX]\s*\d{2,3})/i)
          if (tMatch) tamanho = tMatch[0]
        }
        return {
          nome,
          qtd: Number(i.quantidade) || 1,
          sku,
          fotoUrl,
          tamanho
        }
      })

      return {
        codigo: baseCodigo,
        transportadora: cachedDetail?.transportadora || (o.transportadoraNome || o.entrega?.transportadora || 'Sem transportadora').trim(),
        frete: cachedDetail?.frete !== undefined ? cachedDetail.frete : (parseFloat(String(o.valorFreteTransportadora || o.valorFrete || o.pedidoValorFrete || o.entrega?.frete || 0)) || 0),
        valor: parseFloat(String(o.valorTotal || 0)) || 0,
        data: o.dataHora || o.data_pedido || new Date().toISOString(),
        situacao: o.pedidoSituacao ?? o.situacao,
        quantidade: cachedDetail?.quantidade || produtos.reduce((acc: number, p: any) => acc + p.qtd, 0) || 1,
        produtos: cachedDetail?.produtos || produtos,
        fullyEnriched: !!cachedDetail?.fullyEnriched,
        canal: o.lojaDoMarketplaceNome || o.canal || o.canalNome || o.lojaIntegracaoNome || 'Site',
        uf: cachedDetail?.uf || extractUF(o) || undefined,
      }
    })
  } catch (err) {
    console.error('[MagazordLV] fetchOrdersForKPIsLV falhou:', err)
    return []
  }
}

export async function enrichOrdersWithCarriersLV(
  orders: FreightOrderData[],
  onProgress: (enriched: FreightOrderData[]) => void,
  concurrency = 12
): Promise<FreightOrderData[]> {
  const result = orders.map(o => ({ ...o }))
  const byCode = new Map(result.map(o => [o.codigo, o]))

  const needsDetail = orders.filter(o => o.transportadora === 'Sem transportadora' || o.frete === 0 || !o.fullyEnriched || !o.uf || (o.produtos && o.produtos.length > 0 && !o.produtos[0].sku))
  console.log(`[FreightLV] Enriquecendo ${needsDetail.length} de ${orders.length} pedidos...`)

  for (let i = 0; i < needsDetail.length; i += concurrency) {
    const batch = needsDetail.slice(i, i + concurrency)
    await Promise.all(batch.map(async (order) => {
      try {
        const detail = await lvFetch<{ status: string; data: any }>(`/site/pedido/${order.codigo}`)
        const data = detail?.data
        if (!data) return
        const rastreio = (data.arrayPedidoRastreio ?? [])[0] ?? {}
        const trans = (rastreio.transportadoraNome || data.transportadoraNome || '').trim()
        const frete = parseFloat(String(rastreio.valorFreteTransportadora || rastreio.valorFrete || data.valorFrete || 0)) || 0
        const entry = byCode.get(order.codigo)
        if (entry) {
          if (trans) entry.transportadora = trans
          if (frete > 0) entry.frete = frete
          const itemsArr = rastreio.pedidoItem || data.arrayPedidoItem || data.pedidoItem || []
          const qtd = itemsArr.reduce((sum: number, it: any) => sum + (Number(it.quantidade) || 1), 0)
          if (qtd > 0) entry.quantidade = qtd
          
          const stateCode = extractUF(data) || order.uf || 'N/A'
          entry.uf = stateCode

          if (!entry.produtos || entry.produtos.length === 0 || !entry.produtos[0]?.sku) {
            entry.produtos = itemsArr.map((i: any) => {
              const baseName = i.nome || i.produtoNome || ''
              const derivacao = i.produtoDerivacaoNome || i.produtoDerivacao || ''
              const nomeFinal = `${baseName} ${derivacao}`.trim()
              const qtd = Number(i.quantidade) || 1
              const sku = i.sku || i.codigo || i.produtoCodigo || undefined
              const fotoUrl = i.foto_url || i.produtoImagemUrl || i.imagemUrl || undefined
              let tamanho = i.tamanho || undefined
              if (!tamanho && nomeFinal) {
                const tMatch = nomeFinal.match(/(\d+,\d+m?\s*[xX]\s*\d+,\d+m?|\d{2,3}\s*[xX]\s*\d{2,3})/i)
                if (tMatch) tamanho = tMatch[0]
              }
              return nomeFinal ? { nome: nomeFinal, qtd, sku, fotoUrl, tamanho } : null
            }).filter(Boolean) as any[]
          }
          entry.fullyEnriched = true
          
          _enrichDB[entry.codigo] = { 
            transportadora: entry.transportadora, 
            frete: entry.frete, 
            quantidade: entry.quantidade, 
            produtos: entry.produtos,
            fullyEnriched: true,
            uf: entry.uf,
          }
        }
      } catch { /* ignora */ }
    }))
    saveEnrichDB()
    onProgress([...result])
  }

  return result
}

