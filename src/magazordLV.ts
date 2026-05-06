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
} from './magazord'

import type { MagazordOrder, MagazordOrdersResponse } from './magazord'

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
