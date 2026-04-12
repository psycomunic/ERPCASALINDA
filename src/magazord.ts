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
 * Busca pedidos aprovados/em-produção (situações 4, 5 e 23).
 * Retorna mock se as credenciais não estiverem configuradas.
 */
export async function fetchPendingOrders(): Promise<MagazordOrder[]> {
  if (!isMagazordConfigured()) {
    await new Promise(r => setTimeout(r, 500))
    return MOCK_MAGAZORD_ORDERS
  }

  try {
    // Filtrar os últimos 3 dias para garantir performance e evitar timeouts
    const d = new Date()
    d.setDate(d.getDate() - 3)
    const dataInicial = d.toISOString().split('T')[0]

    // Fazer apenas uma chamada e filtrar os status do lado do cliente
    // (a API ignora o parâmetro ?situacao se mal formatado, causando requisições idênticas)
    const json = await mzFetch<MagazordOrdersResponse>(
      `/site/pedido?dataPedidoInicial=${dataInicial}&limit=100&order=id&orderDirection=desc`
    )
    
    // 4=Aprovado (Pago), 5=Aprovado Integrado, 23=Faturamento Iniciado
    const allowedSituations = [4, 5, 23]
    const items = json?.data?.items ?? []
    
    const results: MagazordOrder[] = items
      .filter(o => allowedSituations.includes(o.pedidoSituacao ?? 0))
      .map(o => ({
        ...o,
        status: situacaoLabel(o.pedidoSituacao ?? 0),
      }))
    return results
  } catch (err) {
    console.error('[Magazord] fetchPendingOrders falhou:', err)
    _lastStatus = 'error'
    return []
  }
}

/**
 * Busca um pedido pelo ID.
 */
export async function fetchOrderById(id: number): Promise<MagazordOrder | null> {
  if (!isMagazordConfigured()) {
    return MOCK_MAGAZORD_ORDERS.find(o => o.id === id) ?? null
  }
  try {
    const json = await mzFetch<{ status: string; data: MagazordOrder }>(`/pedido/${id}`)
    const o = json?.data
    if (!o) return null
    return { ...o, status: situacaoLabel(o.situacao) }
  } catch (err) {
    console.error('[Magazord] fetchOrderById falhou:', err)
    return null
  }
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
  produto: string
  material?: string
  moldura?: string
  acabamento?: string
  canal?: string
  data: string
  hora: string
  status: 'Pendente' | 'Atrasado' | 'OK'
  obs?: string
  endereco?: string
  transportadora?: string
  prazoEntrega?: string
  valor?: number
  fromMagazord?: boolean
}

/**
 * Converte um pedido Magazord para o shape interno do ERP Kanban.
 */
export function magazordToOrder(order: MagazordOrder): ERPOrder {
  const item = order.itens[0]
  const prazo = order.entrega.prazo_entrega
    ? new Date(order.entrega.prazo_entrega).toLocaleDateString('pt-BR')
    : undefined

  // Calcula atraso: se o prazo já passou, marca como Atrasado
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const dtPrazo = order.entrega.prazo_entrega ? new Date(order.entrega.prazo_entrega) : null
  const isAtrasado = dtPrazo ? dtPrazo < hoje : false

  return {
    id: order.numero,
    magazordId: order.id,
    cliente: order.cliente.nome,
    produto: item?.nome ?? '—',
    material: item?.personalizado?.tamanho
      ? `${item.personalizado.formato ?? ''} · ${item.personalizado.tamanho}`.trim()
      : undefined,
    moldura: item?.personalizado?.moldura,
    acabamento: item?.personalizado?.acabamento,
    canal: order.canal,
    data: new Date(order.data_pedido).toLocaleDateString('pt-BR'),
    hora: new Date(order.data_pedido).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    status: isAtrasado ? 'Atrasado' : 'Pendente',
    prazoEntrega: prazo,
    valor: order.valor_total,
    obs: order.observacao,
    endereco: [
      order.entrega.logradouro, order.entrega.numero,
      order.entrega.bairro, order.entrega.cidade, order.entrega.uf,
    ].filter(Boolean).join(', '),
    transportadora: order.entrega.transportadora,
    fromMagazord: true,
  }
}
