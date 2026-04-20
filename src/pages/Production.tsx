import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Clock, CheckCircle, Upload, Eye, X, Check, User, Package,
  AlertTriangle, Truck, MapPin, Calendar, Send, ClipboardList,
  RefreshCw, ShoppingBag, ArrowRight, Wifi, WifiOff, Store, Database
} from 'lucide-react'
import { CARRIERS_BY_TYPE, CARRIER_NAMES } from '../carriers'
import { fetchPendingOrders, fetchOrderByCodigo, updateOrderSituacao, magazordToOrder, magazordDetailedToOrder } from '../magazord'
import {
  fetchPedidos, createPedido, updatePedido, despacharPedido, movePedidoEtapa
} from '../services/pedidos'
import { isSupabaseConfigured } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

// Exported so magazord.ts can reference it
export interface ProductionOrder {
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
  rastreio?: string
  dataDespacho?: string
  prazoEntrega?: string
  valor?: number
  frete?: number
  imagemUrl?: string
  fromMagazord?: boolean
  itens?: {
    produto: string
    quantidade?: number
    tamanho?: string
    formato?: string
    moldura?: string
    acabamento?: string
    imagemUrl?: string
  }[]
  // Revisão de qualidade
  revisaoStatus?: 'aprovado' | 'reprovado'
  revisaoRevisor?: string
  revisaoMotivo?: string
  revisaoAreas?: string[]
  revisaoFotoUrl?: string
}

type Order = ProductionOrder

type KanbanStage = 'Novos Pedidos' | 'Impressão' | 'Corte Moldura' | 'Entelamento + Vidro' | 'Acabamento' | 'Revisão' | 'Embalagem'
type DeliveryStage = 'Prontos para Envio' | 'Despachados'
type Stage = KanbanStage | DeliveryStage

const KANBAN_STAGES: KanbanStage[] = ['Novos Pedidos', 'Impressão', 'Corte Moldura', 'Entelamento + Vidro', 'Acabamento', 'Revisão', 'Embalagem']
const ALL_STAGES: Stage[] = [...KANBAN_STAGES, 'Prontos para Envio', 'Despachados']

const ETAPAS_RETORNO: KanbanStage[] = ['Impressão', 'Corte Moldura', 'Entelamento + Vidro', 'Acabamento']

const STAGE_DOT: Record<Stage, string> = {
  'Novos Pedidos':       'bg-violet-500',
  'Impressão':           'bg-blue-500',
  'Corte Moldura':       'bg-orange-500',
  'Entelamento + Vidro': 'bg-green-500',
  'Acabamento':          'bg-purple-500',
  'Revisão':             'bg-rose-500',
  'Embalagem':           'bg-gray-400',
  'Prontos para Envio':  'bg-yellow-500',
  'Despachados':         'bg-emerald-500',
}

const STAGE_BG: Partial<Record<Stage, string>> = {
  'Novos Pedidos':      'bg-violet-50 border border-violet-200',
  'Prontos para Envio': 'bg-yellow-50 border border-yellow-200',
  'Despachados':        'bg-emerald-50 border border-emerald-200',
}

const CANAL_ICON: Record<string, string> = {
  'Site': '🌐', 'Mercado Livre': '🛒', 'Shopee': '🟠', 'Amazon': '📦',
  'Magazine Luiza': '🔵', 'balcao': '🏪',
}

// ─── Sample data (non-Magazord orders already in production) ──────────────────

const INITIAL: Record<Stage, Order[]> = {
  'Novos Pedidos': [],
  'Impressão': [],
  'Corte Moldura': [],
  'Entelamento + Vidro': [],
  'Acabamento': [],
  'Revisão': [],
  'Embalagem': [],
  'Prontos para Envio': [],
  'Despachados': [],
}

const MATERIAIS = ['PAPEL MATTE PREMIUM', 'CANVAS LONA', 'PVC VINÍLICO', 'PAPEL BRILHO', 'TECIDO LINHO']
const CLIENTES  = ['Mariana S. Oliveira', 'Ricardo Augusto', 'Fernanda Lima', 'João Pedro Santos', 'Carla Mendes', 'Ana Paula Ramos', 'Carlos Henrique']

// ─── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(prazo?: string): number | null {
  if (!prazo) return null
  const [d, m, y] = prazo.split('/').map(Number)
  if (!d || !m || !y) return null
  const diff = new Date(y, m - 1, d).getTime() - new Date().setHours(0,0,0,0)
  return Math.ceil(diff / 86400000)
}

// Safe date parsers that never return "Invalid Date"
function safeDate(raw: string | null | undefined, suffix = ''): string {
  if (!raw) return ''
  const d = new Date(raw + suffix)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR')
}
function safeTime(raw: string | null | undefined): string {
  if (!raw) return ''
  const d = new Date(raw.replace(' ', 'T'))
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function PrazoTag({ prazo }: { prazo?: string }) {
  const days = daysUntil(prazo)
  if (days === null) return null
  if (days < 0)  return <span className="badge badge-critico text-[10px]">VENCIDO {Math.abs(days)}d atrás</span>
  if (days === 0) return <span className="badge bg-orange-100 text-orange-700 text-[10px]">VENCE HOJE</span>
  if (days <= 2)  return <span className="badge bg-yellow-100 text-yellow-700 text-[10px]">{days}d restante{days > 1 ? 's' : ''}</span>
  return <span className="badge badge-normal text-[10px]">{days}d p/ entrega</span>
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm"
    >
      <Check size={16} className="text-green-400 shrink-0" />
      {msg}
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white"><X size={14} /></button>
    </motion.div>
  )
}

// ─── Magazord Order Card ───────────────────────────────────────────────────────

function MagazordCard({
  order, onView, onConfirm, dragging, onDragStart, onDragEnd
}: {
  order: Order; onView: () => void; onConfirm: () => void
  dragging: boolean; onDragStart: () => void; onDragEnd: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    setConfirming(true)
    await onConfirm()
    setConfirming(false)
  }

  return (
    <motion.div
      layout
      className="bg-white rounded-xl border-2 border-violet-200 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative overflow-hidden"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Magazord badge strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />

      <div className="flex items-center justify-between mb-2 mt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold bg-violet-600 text-white px-2 py-0.5 rounded">#{order.id}</span>
          {order.canal && (
            <span className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
              <span>{CANAL_ICON[order.canal] ?? '🛒'}</span>
              <span className="text-[10px]">{order.canal}</span>
            </span>
          )}
        </div>
        <PrazoTag prazo={order.prazoEntrega} />
      </div>

      <p className="text-sm font-semibold text-gray-800 leading-tight">{order.cliente}</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-2">{order.produto}</p>

      {/* Product specs */}
      <div className="space-y-1 mb-2">
        {order.material && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Package size={10} className="text-gray-400 shrink-0" />
            <span>{order.material}</span>
          </div>
        )}
        {order.moldura && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="text-gray-400 text-[10px] font-bold">MOLDURA</span>
            <span className="font-medium text-gray-700">{order.moldura}</span>
          </div>
        )}
        {order.acabamento && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="text-gray-400 text-[10px] font-bold">ACABAMENTO</span>
            <span className="font-medium text-gray-700">{order.acabamento}</span>
          </div>
        )}
      </div>

      {order.valor && (
        <p className="text-xs font-bold text-violet-700 mb-2">
          R$ {order.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      )}

      {order.obs && (
        <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-2 text-[11px] text-amber-700">
          ⚠ {order.obs}
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors bg-violet-600 hover:bg-violet-700 disabled:opacity-60"
        >
          {confirming
            ? <RefreshCw size={12} className="animate-spin" />
            : <ArrowRight size={12} />}
          Confirmar → Produção
        </button>
        <button
          onClick={onView}
          className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-navy-900 transition-colors"
          title="Ver detalhes"
        >
          <Eye size={13} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function printOS(order: Order, stage: Stage) {
  const now = new Date().toLocaleString('pt-BR')
  const stagesChecklist = ['Impressão', 'Corte Moldura', 'Entelamento + Vidro', 'Acabamento', 'Embalagem', 'Prontos para Envio', 'Despachados']
  const currentIdx = stagesChecklist.indexOf(stage as string)

  const itemsToRender = order.itens && order.itens.length > 0 ? order.itens : [order]
  const itemsHtml = itemsToRender.map((item: any, idx: number) => `
    <div class="field" style="margin-bottom: 10px; display: flex; gap: 12px; align-items: flex-start; padding: 12px;">
      ${item.imagemUrl || order.imagemUrl ? `
        <img src="${item.imagemUrl || order.imagemUrl}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; flex-shrink: 0;" />
      ` : `
        <div style="width: 70px; height: 70px; border-radius: 4px; border: 1px solid #e5e7eb; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #9ca3af; flex-shrink: 0; text-align: center; padding: 4px;">SEM FOTO</div>
      `}
      <div style="flex: 1;">
        <label style="font-size: 10px; padding-bottom: 2px;">Produto / Descrição</label>
        <span style="font-size: 14px; font-weight: 800; display: block; margin-bottom: 8px;">${item.produto}</span>
        
        <div class="grid-2" style="gap: 8px;">
          ${item.tamanho ? `<div><label>Tamanho</label><span>${item.tamanho}</span></div>` : ''}
          ${item.formato ? `<div><label>Variação / Formato</label><span>${item.formato}</span></div>` : ''}
          ${item.material ? `<div><label>Material</label><span>${item.material}</span></div>` : ''}
          ${item.moldura ? `<div><label>Moldura</label><span>${item.moldura}</span></div>` : ''}
          ${item.acabamento ? `<div><label>Acabamento</label><span>${item.acabamento}</span></div>` : ''}
          <div style="background: #e0e7ff; border: 1px solid #c7d2fe; padding: 4px 8px; border-radius: 4px; display: inline-block;">
            <label style="color: #3730a3; margin-bottom: 0;">Qtd. a Produzir</label>
            <span style="color: #312e81; font-weight: 900; font-size: 16px;">${item.quantidade || order.quantidade || 1}x</span>
          </div>
        </div>
      </div>
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>O.S. Pedido #${order.id} — Casa Linda Decorações</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; background: #fff; padding: 24px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a8a; padding-bottom: 14px; margin-bottom: 18px; }
    .logo-area h1 { font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
    .logo-area p { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; margin-top: 2px; }
    .os-number { text-align: right; }
    .os-number .num { font-size: 26px; font-weight: 900; color: #1e3a8a; }
    .os-number .dt  { font-size: 10px; color: #9ca3af; margin-top: 2px; }
    ${order.fromMagazord ? `.mg-badge { display:inline-block; background:#7c3aed; color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; margin-left:8px; letter-spacing:1px; vertical-align: middle; }` : ''}
    .section { margin-bottom: 14px; }
    .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid #e5e7eb; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .field { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; page-break-inside: avoid; break-inside: avoid; }
    .field label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; display: block; margin-bottom: 3px; }
    .field span { font-size: 13px; font-weight: 600; color: #111827; }
    .field.highlight { background: #eff6ff; border-color: #bfdbfe; }
    .field.obs-field { background: #fffbeb; border-color: #fcd34d; }
    .checklist { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
    .check-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 11px; font-weight: 500; color: #374151; }
    .check-item.done { background: #d1fae5; border-color: #6ee7b7; color: #065f46; }
    .check-item.current { background: #dbeafe; border-color: #93c5fd; color: #1e40af; font-weight: 700; }
    .check-item .box { width: 14px; height: 14px; border: 2px solid currentColor; border-radius: 3px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .check-item.done .box::after { content: '✓'; font-size: 10px; font-weight: 900; }
    .check-item.current .box { background: #1e3a8a; border-color: #1e3a8a; color: #fff; }
    .check-item.current .box::after { content: '▶'; font-size: 8px; color: #fff; }
    .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; padding-top: 14px; border-top: 1px solid #e5e7eb; }
    .sig-box { text-align: center; }
    .sig-box .line { border-bottom: 1px solid #374151; height: 36px; margin-bottom: 4px; }
    .sig-box .lbl { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
    .footer { margin-top: 18px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
    .s-pendente { background: #fef3c7; color: #92400e; }
    .s-ok { background: #d1fae5; color: #065f46; }
    .s-atrasado { background: #fee2e2; color: #991b1b; }
    @media print { body { padding: 0; } @page { margin: 18mm; size: A4; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      <h1>Casa Linda Decorações${order.fromMagazord ? `<span class="mg-badge">MAGAZORD</span>` : ''}</h1>
      <p>Ordem de Serviço — Produção</p>
    </div>
    <div class="os-number">
      <div class="num">O.S. #${order.id}</div>
      <div class="dt">Emitida em ${now}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dados do Pedido</div>
    <div class="grid-3">
      <div class="field highlight">
        <label>Cliente</label>
        <span>${order.cliente}</span>
      </div>
      <div class="field">
        <label>Prazo de Entrega</label>
        <span>${order.prazoEntrega ?? '—'}</span>
      </div>
      <div class="field">
        <label>Etapa Atual</label>
        <span>${stage}</span>
      </div>
      ${order.canal ? `<div class="field"><label>Canal de Venda</label><span>${order.canal}</span></div>` : ''}
      ${order.valor ? `<div class="field"><label>Valor do Pedido</label><span>R$ ${order.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span></div>` : ''}
      <div class="field">
        <label>Status</label>
        <span class="status-badge ${order.status === 'Atrasado' ? 's-atrasado' : order.status === 'OK' ? 's-ok' : 's-pendente'}">
          ${order.status === 'Atrasado' ? 'ATRASADO' : order.status === 'OK' ? 'EM DIA' : 'PENDENTE'}
        </span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Especificação dos Itens</div>
    ${itemsHtml}
  </div>

  ${order.endereco || order.transportadora ? `
  <div class="section">
    <div class="section-title">Entrega</div>
    <div class="grid-2">
      ${order.endereco ? `<div class="field"><label>Endereço de Entrega</label><span>${order.endereco}</span></div>` : ''}
      ${order.transportadora ? `<div class="field"><label>Transportadora</label><span>${order.transportadora}</span></div>` : ''}
      ${order.rastreio ? `<div class="field"><label>Código de Rastreio</label><span style="font-family:monospace">${order.rastreio}</span></div>` : ''}
      ${order.dataDespacho ? `<div class="field"><label>Despachado em</label><span>${order.dataDespacho}</span></div>` : ''}
    </div>
  </div>` : ''}

  ${order.obs ? `
  <div class="section">
    <div class="section-title">Observações do Cliente</div>
    <div class="field obs-field"><label>Atenção</label><span>${order.obs}</span></div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Fluxo de Produção</div>
    <div class="checklist">
      ${stagesChecklist.map((s, i) => `
        <div class="check-item ${i < currentIdx ? 'done' : i === currentIdx ? 'current' : ''}">
          <div class="box"></div>
          <span>${s}</span>
          ${i < currentIdx ? '<span style="margin-left:auto;font-size:10px;color:#059669">Concluído ✓</span>' : i === currentIdx ? '<span style="margin-left:auto;font-size:10px;color:#1e40af">EM ANDAMENTO</span>' : ''}
        </div>
      `).join('')}
    </div>
  </div>

  <div class="signature">
    <div class="sig-box">
      <div class="line"></div>
      <div class="lbl">Responsável pela Produção</div>
    </div>
    <div class="sig-box">
      <div class="line"></div>
      <div class="lbl">Conferência / Aprovação</div>
    </div>
  </div>

  <div class="footer">
    Casa Linda Decorações · O.S. #${order.id} · ${now}
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=850,height=1100')
  if (w) { w.document.write(html); w.document.close() }
}

function DetailModal({ order: initialOrder, stage, onClose, onConclude }: {
  order: Order; stage: Stage; onClose: () => void; onConclude: () => void
}) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const [detailLoading, setDetailLoading] = useState(false)

  // Fetch full Magazord order details when modal opens for a Magazord order
  useEffect(() => {
    if (!initialOrder.fromMagazord || !initialOrder.id) return
    setDetailLoading(true)
    // initialOrder.id is the Magazord "codigo" (e.g. 0012604724740) which the API v2 uses
    fetchOrderByCodigo(initialOrder.id)
      .then(full => {
        if (!full) return
        const enriched = magazordDetailedToOrder(full)
        setOrder(prev => ({
          ...prev,
          produto:        enriched.produto        ?? prev.produto,
          moldura:        enriched.moldura        ?? prev.moldura,
          acabamento:     enriched.acabamento     ?? prev.acabamento,
          tamanho:        enriched.tamanho        ?? prev.tamanho,
          formato:        enriched.formato        ?? prev.formato,
          quantidade:     enriched.quantidade     ?? prev.quantidade,
          material:       enriched.material       ?? prev.material,
          clienteEmail:   enriched.clienteEmail   ?? prev.clienteEmail,
          clienteTelefone:enriched.clienteTelefone?? prev.clienteTelefone,
          frete:          enriched.frete          ?? prev.frete,
          prazoEntrega:   enriched.prazoEntrega   ?? prev.prazoEntrega,
          endereco:       enriched.endereco       ?? prev.endereco,
          imagemUrl:      (enriched as any).imagemUrl      ?? prev.imagemUrl,
          itens:          (enriched as any).itens          ?? prev.itens,
        }))
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [initialOrder.fromMagazord, initialOrder.id])

  const isDelivery = stage === 'Prontos para Envio' || stage === 'Despachados'
  const isMagazord = stage === 'Novos Pedidos'
  const days = daysUntil(order.prazoEntrega)

  // Freight % calculation
  const fretePerc = (order.frete && order.valor && order.valor > 0)
    ? ((order.frete / order.valor) * 100).toFixed(1)
    : null

  // Freight risk color
  const fretePercNum = fretePerc ? parseFloat(fretePerc) : 0
  const freteColor = fretePercNum >= 20
    ? 'text-red-600 bg-red-50 border-red-200'
    : fretePercNum >= 10
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-emerald-700 bg-emerald-50 border-emerald-200'

  // Deadline color
  const prazoColor = days === null ? '' : days < 0 ? 'text-red-600' : days === 0 ? 'text-orange-500' : days <= 2 ? 'text-yellow-600' : 'text-emerald-600'

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal"
        style={{ maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className={`flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10 ${
          isMagazord ? 'border-l-4 border-l-violet-500' : ''
        }`}>
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
              {isMagazord && <Store size={16} className="text-violet-600" />}
              Pedido #{order.id}
              {order.fromMagazord && <span className="text-[10px] font-bold bg-violet-600 text-white px-2 py-0.5 rounded-full">MAGAZORD</span>}
              {order.canal && (
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                  {CANAL_ICON[order.canal] ?? '🛒'} {order.canal}
                </span>
              )}
              {detailLoading && (
                <span className="flex items-center gap-1 text-[10px] text-violet-500 font-semibold animate-pulse">
                  <RefreshCw size={10} className="animate-spin" /> carregando detalhes…
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Etapa atual: <strong className="text-gray-700">{stage}</strong></p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printOS(order, stage)}
              title="Imprimir O.S."
              className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:text-navy-900 hover:bg-blue-50 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* ── PRODUCT IMAGE + CLIENT BLOCK ── */}
          <div className="flex gap-3">
            {/* Product image / visual placeholder */}
            <div className="flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden border border-gray-200 bg-gradient-to-br from-violet-50 to-blue-50 flex items-center justify-center">
              {order.imagemUrl ? (
                <img src={order.imagemUrl} alt="Produto" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <div className="w-10 h-10 rounded-lg bg-white/70 border border-violet-100 flex items-center justify-center mb-1">
                    <Package size={20} className="text-violet-400" />
                  </div>
                  <span className="text-[9px] text-violet-400 font-semibold uppercase tracking-wide leading-tight">Sem imagem</span>
                </div>
              )}
            </div>

            {/* Client + quick stats */}
            <div className="flex-1 min-w-0">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-2">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wide mb-0.5 flex items-center gap-1"><User size={9} /> Cliente</p>
                <p className="text-sm font-bold text-gray-900 truncate">{order.cliente}</p>
                {order.clienteEmail && <p className="text-[11px] text-gray-500 mt-0.5 truncate">✉ {order.clienteEmail}</p>}
                {order.clienteTelefone && <p className="text-[11px] text-gray-500">📞 {order.clienteTelefone}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Pedido em</p>
                  <p className="text-xs font-semibold text-gray-800">{order.data}{order.hora ? ` · ${order.hora}` : ''}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Status</p>
                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    order.status === 'Atrasado' ? 'bg-red-100 text-red-700' :
                    order.status === 'OK' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status === 'Atrasado' ? 'ATRASADO' : order.status === 'OK' ? 'EM DIA' : 'PENDENTE'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── FINANCIAL KPIs ── */}
          {(order.valor || order.frete) && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">💰 Financeiro do Pedido</p>
              <div className="grid grid-cols-3 gap-2">
                {order.valor && (
                  <div className="bg-navy-900 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-blue-200 font-bold uppercase tracking-wide mb-1">Valor Total</p>
                    <p className="text-sm font-black text-white">R$ {order.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                  </div>
                )}
                {order.frete !== undefined && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-1">Frete</p>
                    <p className="text-sm font-bold text-gray-800">R$ {order.frete.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                  </div>
                )}
                {fretePerc && (
                  <div className={`border rounded-xl p-3 text-center ${freteColor}`}>
                    <p className="text-[9px] font-bold uppercase tracking-wide mb-1 opacity-70">Frete / Pedido</p>
                    <p className="text-sm font-black">{fretePerc}%</p>
                    <p className="text-[9px] font-semibold mt-0.5 opacity-60">
                      {fretePercNum >= 20 ? '⚠ Alto' : fretePercNum >= 10 ? '▲ Moderado' : '✓ Baixo'}
                    </p>
                  </div>
                )}
              </div>
              {fretePerc && parseFloat(fretePerc) >= 15 && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700">
                    <strong>Atenção:</strong> o frete representa {fretePerc}% do valor do pedido.
                    Considere revisar a negociação logística com o cliente.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── PRAZO DE ENTREGA ── */}
          {order.prazoEntrega && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📅 Prazo de Entrega</p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                <Calendar size={28} className={prazoColor || 'text-gray-300'} />
                <div className="flex-1">
                  <p className="text-xl font-black text-gray-900">{order.prazoEntrega}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${prazoColor}`}>
                    {days === null ? '—'
                      : days < 0  ? `VENCIDO há ${Math.abs(days)} dia(s)`
                      : days === 0 ? 'VENCE HOJE'
                      : days === 1 ? 'Vence amanhã'
                      : `${days} dias restantes`
                    }
                  </p>
                </div>
                <PrazoTag prazo={order.prazoEntrega} />
              </div>
            </div>
          )}

          {/* ── ESPECIFICAÇÃO DOS ITENS (PRODUCT DETAILS) ── */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">🖼 Especificação dos Itens</p>
            
            <div className="space-y-4">
              {(order.itens && order.itens.length > 0 ? order.itens : [order]).map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Item header */}
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex gap-3">
                    {/* Imagem */}
                    <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.imagemUrl || order.imagemUrl ? (
                         <img src={item.imagemUrl || order.imagemUrl} alt="Produto" className="w-full h-full object-cover" />
                      ) : (
                         <div className="flex flex-col items-center opacity-40">
                           <Package size={14} className="text-violet-500 mb-0.5" />
                         </div>
                      )}
                    </div>
                    {/* Descrição */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Produto / Descrição</p>
                      <p className="text-xs font-bold text-gray-900 leading-tight">{item.produto}</p>
                    </div>
                  </div>

                  {/* Detalhes grid */}
                  <div className="p-3 grid grid-cols-2 gap-2">
                    {item.tamanho && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                        <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider mb-0.5">Tamanho</p>
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{item.tamanho}</p>
                      </div>
                    )}
                    {item.formato && item.formato !== item.tamanho && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                        <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider mb-0.5">Formato / Variação</p>
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{item.formato}</p>
                      </div>
                    )}
                    {/* Fallbacks for non-Magazord data */}
                    {(item as any).material && (
                       <div className="bg-white border border-gray-200 rounded-xl p-2.5">
                         <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Material</p>
                         <p className="text-xs font-semibold text-gray-800">{(item as any).material}</p>
                       </div>
                    )}
                    {(item as any).moldura && (
                       <div className="bg-violet-50 border border-violet-200 rounded-xl p-2.5">
                         <p className="text-[9px] text-violet-500 font-bold uppercase tracking-wider mb-0.5">Moldura</p>
                         <p className="text-xs font-semibold text-gray-800">{(item as any).moldura}</p>
                       </div>
                    )}
                    {(item as any).acabamento && (
                       <div className="bg-violet-50 border border-violet-200 rounded-xl p-2.5">
                         <p className="text-[9px] text-violet-500 font-bold uppercase tracking-wider mb-0.5">Acabamento</p>
                         <p className="text-xs font-semibold text-gray-800">{(item as any).acabamento}</p>
                       </div>
                    )}
                    {/* Quantidade */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Quantidade</p>
                      <p className="text-sm font-black text-gray-900">{item.quantidade || 1}x</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── DELIVERY / ENTREGA ── */}
          {(order.endereco || order.transportadora || order.rastreio || isDelivery) && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🚚 Entrega</p>
              <div className="space-y-2">
                {order.endereco && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                    <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Endereço de Entrega</p>
                      <p className="text-xs font-semibold text-gray-800">{order.endereco}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {order.transportadora && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-1 flex items-center gap-1"><Truck size={9} /> Transportadora</p>
                      <p className="text-xs font-semibold text-gray-800">{order.transportadora}</p>
                    </div>
                  )}
                  {order.rastreio && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wide mb-1">Código Rastreio</p>
                      <p className="text-xs font-bold font-mono text-blue-700">{order.rastreio}</p>
                    </div>
                  )}
                </div>
                {order.dataDespacho && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wide">Despachado em</p>
                      <p className="text-xs font-semibold text-gray-800">{order.dataDespacho}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PRODUCTION FLOW ── */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">⚙ Fluxo de Produção</p>
            <div className="relative">
              {/* vertical line */}
              <div className="absolute left-[17px] top-4 bottom-4 w-px bg-gray-200" />
              <div className="space-y-1.5">
                {['Novos Pedidos','Impressão','Corte Moldura','Entelamento + Vidro','Acabamento','Revisão','Embalagem','Prontos para Envio','Despachados'].map((s, i, arr) => {
                  const currentIdx = arr.indexOf(stage as string)
                  const isDone    = i < currentIdx
                  const isCurrent = i === currentIdx
                  return (
                    <div key={s} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all relative ${
                      isDone    ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' :
                      isCurrent ? 'bg-blue-50 border-2 border-blue-300 text-blue-800 font-bold shadow-sm' :
                                  'bg-white border border-gray-100 text-gray-400'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black z-10 ${
                        isDone    ? 'bg-emerald-500 text-white' :
                        isCurrent ? 'bg-blue-600 text-white' :
                                    'bg-gray-100 border-2 border-gray-200 text-gray-400'
                      }`}>
                        {isDone ? '✓' : isCurrent ? '▶' : i + 1}
                      </div>
                      <span className="flex-1">{s}</span>
                      {isDone    && <span className="text-[10px] text-emerald-500 font-semibold">Concluído ✓</span>}
                      {isCurrent && <span className="text-[10px] text-blue-600 font-bold">EM ANDAMENTO</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── OBSERVATIONS ── */}
          {order.obs && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1"><AlertTriangle size={10} /> Observação do Cliente</p>
              <p className="text-sm text-gray-800 leading-relaxed">{order.obs}</p>
            </div>
          )}

        </div>

        {/* ── STICKY FOOTER BUTTONS ── */}
        <div className="flex gap-2 p-4 pt-3 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center text-sm">Fechar</button>
          <button
            onClick={() => printOS(order, stage)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir O.S.
          </button>
          {stage !== 'Despachados' && (
            <button
              onClick={() => { onConclude(); onClose() }}
              className="btn-primary flex-1 justify-center text-sm"
              style={isMagazord ? { background: '#7c3aed' } : stage === 'Prontos para Envio' ? { background: '#059669' } : {}}
            >
              {isMagazord ? <><ArrowRight size={14} /> Confirmar → Produção</> :
               stage === 'Prontos para Envio' ? <><Send size={14} /> Confirmar Despacho</> :
               <><CheckCircle size={14} /> Concluir Etapa</>}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Dispatch Modal ───────────────────────────────────────────────────────────

function DispatchModal({ order, onClose, onConfirm }: {
  order: Order; onClose: () => void
  onConfirm: (transportadora: string, rastreio: string) => void
}) {
  const [trans, setTrans]   = useState(order.transportadora ?? CARRIER_NAMES[0])
  const [rastreio, setRastreio] = useState(order.rastreio ?? '')

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><Send size={16} className="text-emerald-600" /> Confirmar Despacho</h3>
            <p className="text-xs text-gray-500 mt-0.5">Pedido #{order.id} — {order.cliente}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2 items-start">
            <Truck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800">Ao confirmar, o pedido será movido para <strong>Despachados</strong> e a data/hora de despacho será registrada automaticamente.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Transportadora *</label>
            <select className="input" value={trans} onChange={e => setTrans(e.target.value)}>
              {CARRIERS_BY_TYPE.map(g => (
                <optgroup key={g.tipo} label={g.tipo}>
                  {g.items.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Código de Rastreamento</label>
            <input className="input font-mono" placeholder="Ex: BR123456789BR" value={rastreio} onChange={e => setRastreio(e.target.value)} />
            <p className="text-[11px] text-gray-400 mt-1">Opcional. O cliente poderá acompanhar o pedido pelo código.</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button onClick={() => { onConfirm(trans, rastreio); onClose() }} className="btn-primary flex-1 justify-center" style={{ background: '#059669' }}>
              <Send size={14} /> Confirmar Despacho
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

const AREAS_REVISAO = ['Impressão', 'Entelamento', 'Vidro', 'Moldura', 'Acabamento'] as const

function ReviewModal({ order, onClose, onApprove, onReject }: {
  order: Order
  onClose: () => void
  onApprove: (revisor: string) => void
  onReject: (revisor: string, etapaRetorno: KanbanStage, areas: string[], motivo: string, fotoUrl?: string) => void
}) {
  const [revisor, setRevisor]         = useState('')
  const [decision, setDecision]       = useState<'aprovado' | 'reprovado' | null>(null)
  const [areas, setAreas]             = useState<string[]>([])
  const [motivo, setMotivo]           = useState('')
  const [etapaRetorno, setEtapaRetorno] = useState<KanbanStage>(ETAPAS_RETORNO[0])
  const [fotoPreview, setFotoPreview] = useState<string | undefined>(undefined)

  const toggleArea = (a: string) =>
    setAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setFotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const canConfirm = !!revisor
  const canReject  = !!revisor && areas.length > 0 && !!motivo

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 520 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle size={16} className="text-rose-500" /> Revisão de Qualidade
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Pedido #{order.id} — {order.cliente}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Revisor */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Revisor *</label>
            <div className="flex gap-2">
              {['Marcelo', 'Isac'].map(name => (
                <button
                  key={name}
                  onClick={() => setRevisor(name)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                    revisor === name
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Decisão */}
          {revisor && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Resultado da Revisão *</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setDecision('aprovado')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                    decision === 'aprovado'
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-emerald-300'
                  }`}
                >
                  <Check size={16} /> Aprovado
                </button>
                <button
                  onClick={() => setDecision('reprovado')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                    decision === 'reprovado'
                      ? 'border-rose-500 bg-rose-500 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-rose-300'
                  }`}
                >
                  <X size={16} /> Reprovado
                </button>
              </div>
            </div>
          )}

          {/* Formulário de reprovação */}
          {decision === 'reprovado' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="h-px bg-rose-100" />

              {/* Áreas afetadas */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Área(s) com Problema *</label>
                <div className="flex flex-wrap gap-2">
                  {AREAS_REVISAO.map(area => (
                    <button
                      key={area}
                      onClick={() => toggleArea(area)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        areas.includes(area)
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : 'border-gray-300 text-gray-600 hover:border-rose-300'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Motivo da Reprovação *</label>
                <textarea
                  className="input h-20 resize-none"
                  placeholder="Descreva o defeito encontrado..."
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                />
              </div>

              {/* Etapa de retorno */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Retornar para a Etapa</label>
                <select className="input" value={etapaRetorno} onChange={e => setEtapaRetorno(e.target.value as KanbanStage)}>
                  {ETAPAS_RETORNO.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              {/* Foto do defeito */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Foto do Defeito (opcional)</label>
                {fotoPreview ? (
                  <div className="relative">
                    <img src={fotoPreview} alt="Defeito" className="w-full h-40 object-cover rounded-xl border border-rose-200" />
                    <button
                      onClick={() => setFotoPreview(undefined)}
                      className="absolute top-2 right-2 bg-white border border-gray-200 rounded-full p-1 hover:bg-red-50"
                    >
                      <X size={12} className="text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-rose-300 hover:bg-rose-50 transition-all">
                    <Upload size={18} className="text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">Clique para adicionar foto</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                  </label>
                )}
              </div>
            </motion.div>
          )}

          {/* Footer actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            {decision === 'aprovado' && (
              <button
                onClick={() => { if (canConfirm) { onApprove(revisor); onClose() } }}
                disabled={!canConfirm}
                className="btn-primary flex-1 justify-center"
                style={{ background: '#059669' }}
              >
                <Check size={14} /> Aprovar → Embalagem
              </button>
            )}
            {decision === 'reprovado' && (
              <button
                onClick={() => { if (canReject) { onReject(revisor, etapaRetorno, areas, motivo, fotoPreview); onClose() } }}
                disabled={!canReject}
                className="btn-primary flex-1 justify-center"
                style={{ background: '#e11d48' }}
              >
                <X size={14} /> Registrar Reprovação
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Ready Modal ──────────────────────────────────────────────────────────────

function ReadyModal({ order, onClose, onConfirm }: {
  order: Order; onClose: () => void
  onConfirm: (endereco: string, transportadora: string, prazo: string) => void
}) {
  // Convert prazoEntrega "dd/mm/yyyy" → "yyyy-mm-dd" for the date input
  const toInputDate = (dateStr?: string) => {
    if (!dateStr) return ''
    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    // Convert "dd/mm/yyyy"
    const parts = dateStr.split('/')
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
    return ''
  }

  const [endereco, setEndereco] = useState(order.endereco ?? '')
  const [trans, setTrans]       = useState(order.transportadora ?? CARRIER_NAMES[0])
  const [prazo, setPrazo]       = useState(toInputDate(order.prazoEntrega))
  const [fetching, setFetching] = useState(false)
  const [fetched, setFetched]   = useState(false)

  // Auto-fetch Magazord detailed data when modal opens
  useEffect(() => {
    // Only fetch if it's a Magazord order and we're missing any key field
    const needsFetch = order.fromMagazord && (!order.endereco || !order.transportadora || !order.prazoEntrega)
    if (!needsFetch || fetched) return

    setFetching(true)
    fetchOrderByCodigo(order.id).then(data => {
      if (!data) return
      const rich = magazordDetailedToOrder(data)

      if (rich.endereco && !endereco)     setEndereco(rich.endereco)
      if (rich.transportadora && (!trans || trans === CARRIER_NAMES[0])) {
        setTrans(rich.transportadora)
      }
      if (rich.prazoEntrega && !prazo)    setPrazo(toInputDate(rich.prazoEntrega))
      setFetched(true)
    }).catch(() => {
      /* silencia erros */
    }).finally(() => setFetching(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><ClipboardList size={16} className="text-yellow-600" /> Pronto para Envio</h3>
            <p className="text-xs text-gray-500 mt-0.5">Pedido #{order.id} — {order.cliente}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 flex gap-2 items-start">
            <Package size={14} className="text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">Preencha os dados de entrega. O pedido ficará em <strong>Prontos para Envio</strong> aguardando coleta ou despacho.</p>
          </div>

          {/* Loading indicator while fetching Magazord data */}
          {fetching && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
              <RefreshCw size={13} className="text-blue-500 animate-spin shrink-0" />
              <p className="text-xs text-blue-700">Buscando dados do pedido na Magazord…</p>
            </div>
          )}
          {fetched && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
              <Check size={13} className="text-emerald-500 shrink-0" />
              <p className="text-xs text-emerald-700">Dados preenchidos automaticamente com base no pedido do cliente.</p>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">Endereço de Entrega</label>
            <input
              className="input"
              placeholder={fetching ? 'Buscando endereço…' : 'Rua, Nº — Bairro, Cidade, UF'}
              value={endereco}
              onChange={e => setEndereco(e.target.value)}
              disabled={fetching}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Transportadora</label>
              <select className="input" value={trans} onChange={e => setTrans(e.target.value)} disabled={fetching}>
                {CARRIERS_BY_TYPE.map(g => (
                  <optgroup key={g.tipo} label={g.tipo}>
                    {g.items.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prazo de Entrega</label>
              <input className="input" type="date" value={prazo} onChange={e => setPrazo(e.target.value)} disabled={fetching} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button
              onClick={() => { onConfirm(endereco, trans, prazo); onClose() }}
              className="btn-primary flex-1 justify-center"
              style={{ background: '#d97706' }}
              disabled={fetching}
            >
              <ClipboardList size={14} /> Marcar como Pronto
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── New Order Modal ──────────────────────────────────────────────────────────

function NewOrderModal({ onClose, onSave }: { onClose: () => void; onSave: (o: Order) => void }) {
  const [form, setForm] = useState({ cliente: '', produto: '', material: MATERIAIS[0], data: '', hora: '', prazoEntrega: '', obs: '' })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const save = () => {
    if (!form.cliente || !form.produto) return
    const id = String(Math.floor(800 + Math.random() * 200))
    onSave({ id, cliente: form.cliente, produto: form.produto, material: form.material,
             data: form.data || 'Hoje', hora: form.hora, prazoEntrega: form.prazoEntrega || undefined,
             status: 'Pendente', obs: form.obs })
    onClose()
  }

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900">Novo Pedido de Produção</h3>
            <p className="text-xs text-gray-500 mt-0.5">Preencha os dados para incluir no Kanban.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cliente *</label>
            <input className="input" list="clientes-list" placeholder="Nome do cliente" value={form.cliente} onChange={f('cliente')} />
            <datalist id="clientes-list">{CLIENTES.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Produto / Descrição *</label>
            <input className="input" placeholder="Ex: Canvas Skyline NY 120×80" value={form.produto} onChange={f('produto')} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Material</label>
            <select className="input" value={form.material} onChange={f('material')}>
              {MATERIAIS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prev. Produção</label>
              <input className="input" type="date" value={form.data} onChange={f('data')} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prazo de Entrega</label>
              <input className="input" type="date" value={form.prazoEntrega} onChange={f('prazoEntrega')} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Observações</label>
            <textarea className="input h-16 resize-none" placeholder="Detalhes adicionais..." value={form.obs} onChange={f('obs')} />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button onClick={save} className="btn-primary flex-1 justify-center">
              <Plus size={14} /> Incluir no Kanban
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Delivery Card ─────────────────────────────────────────────────────────────

function DeliveryCard({
  order, stage, onView, onDispatch, onDragStart, onDragEnd
}: {
  order: Order; stage: DeliveryStage
  onView: () => void; onDispatch?: () => void
  onDragStart: () => void; onDragEnd: () => void
}) {
  const days = daysUntil(order.prazoEntrega)
  const isLate = days !== null && days < 0

  return (
    <motion.div
      layout
      className={`bg-white rounded-xl border shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${isLate ? 'border-red-200' : 'border-gray-200'}`}
      draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold bg-navy-900 text-white px-2 py-0.5 rounded">#{order.id}</span>
        <PrazoTag prazo={order.prazoEntrega} />
      </div>
      <p className="text-sm font-semibold text-gray-800 leading-tight">{order.cliente}</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-2">{order.produto}</p>
      <div className="space-y-1 mb-3">
        {order.endereco && (
          <div className="flex items-start gap-1.5 text-xs text-gray-500">
            <MapPin size={11} className="text-gray-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{order.endereco}</span>
          </div>
        )}
        {order.transportadora && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Truck size={11} className="text-gray-400 shrink-0" />
            <span>{order.transportadora}</span>
          </div>
        )}
        {order.prazoEntrega && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={11} className="text-gray-400 shrink-0" />
            <span>Prazo: {order.prazoEntrega}</span>
          </div>
        )}
        {order.rastreio && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400">📦</span>
            <span className="font-mono text-blue-600 text-[11px]">{order.rastreio}</span>
          </div>
        )}
        {order.dataDespacho && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <Check size={10} className="shrink-0" />
            <span>Despachado: {order.dataDespacho}</span>
          </div>
        )}
      </div>
      <div className="flex gap-1.5">
        {stage === 'Prontos para Envio' && onDispatch && (
          <button onClick={onDispatch} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-colors text-white" style={{ background: '#059669' }}>
            <Send size={12} /> Despachar
          </button>
        )}
        {stage === 'Despachados' && (
          <div className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg bg-emerald-50 text-emerald-700">
            <Check size={12} /> Entregue
          </div>
        )}
        <button onClick={onView} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-navy-900 transition-colors" title="Ver detalhes">
          <Eye size={13} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type ViewMode = 'kanban' | 'delivery'

export default function Production() {
  const [board, setBoard]           = useState(INITIAL)
  const [dragging, setDragging]     = useState<{ order: Order; from: Stage } | null>(null)
  const [newModal, setNewModal]     = useState(false)
  const [detail, setDetail]         = useState<{ order: Order; stage: Stage } | null>(null)
  const [readyModal, setReadyModal] = useState<Order | null>(null)
  const [dispatchModal, setDispatchModal] = useState<Order | null>(null)
  const [reviewModal, setReviewModal] = useState<Order | null>(null)
  const [toast, setToast]           = useState<string | null>(null)
  const [filter, setFilter]         = useState<'todos' | 'atrasado' | 'pendente'>('todos')
  const [view, setView]             = useState<ViewMode>('kanban')
  const [dbLoading, setDbLoading]   = useState(false)
  const [dbConnected, setDbConnected] = useState(false)

  // Maps display-id → Supabase UUID (needed for syncing mutations)
  const dbIdMap = useRef<Map<string, string>>(new Map())

  // ── Magazord sync state ──
  const [syncing, setSyncing]       = useState(false)
  const [lastSync, setLastSync]     = useState<Date | null>(null)
  const [syncError, setSyncError]   = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  // ── Supabase: load pedidos on mount ──
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    setDbLoading(true)
    fetchPedidos().then(rows => {
      if (rows.length === 0) { setDbLoading(false); setDbConnected(true); return }

      const grouped: Record<Stage, Order[]> = {
        'Novos Pedidos': [], 'Impressão': [], 'Corte Moldura': [],
        'Entelamento + Vidro': [], 'Acabamento': [], 'Revisão': [], 'Embalagem': [],
        'Prontos para Envio': [], 'Despachados': [],
      }

      rows.forEach(r => {
        const etapa = r.etapa as Stage
        if (!(etapa in grouped)) return
        const order: Order = {
          id: r.numero,
          magazordId: r.magazord_id ?? undefined,
          cliente: r.cliente,
          produto: r.produto,
          material: r.material ?? undefined,
          moldura: r.moldura ?? undefined,
          acabamento: r.acabamento ?? undefined,
          canal: r.canal ?? undefined,
          data: safeDate(r.data_prevista) || (r.from_magazord ? 'Pedido Mz.' : 'Hoje'),
          hora: safeTime(r.hora_prevista ? r.hora_prevista : null),
          status: r.status,
          prazoEntrega: safeDate(r.prazo_entrega, 'T12:00:00') || undefined,
          valor: r.valor ?? undefined,
          frete: r.frete ?? undefined,
          obs: r.obs ?? undefined,
          endereco: r.endereco ?? undefined,
          transportadora: r.transportadora ?? undefined,
          rastreio: r.rastreio ?? undefined,
          dataDespacho: r.data_despacho
            ? (safeDate(r.data_despacho) + ' ' + safeTime(r.data_despacho)).trim() || undefined
            : undefined,
          fromMagazord: r.from_magazord,
        }
        // Track UUID for mutations
        dbIdMap.current.set(r.numero, r.id)
        grouped[etapa].push(order)
      })

      setBoard(grouped)
      setDbConnected(true)
      setDbLoading(false)
    }).catch(() => {
      // Fallback local storage
      const saved = localStorage.getItem('erp_board_backup')
      if (saved) setBoard(JSON.parse(saved))
      setDbLoading(false)
    })
  }, [])

  // Helper: get UUID for a display-id order
  const getDbId = (displayId: string) => dbIdMap.current.get(displayId)

  // ── Magazord sync ──
  const syncMagazord = useCallback(async (silent = false) => {
    setSyncing(true)
    setSyncError(false)
    try {
      const orders = await fetchPendingOrders()
      const converted = orders.map(magazordToOrder)

      setBoard(prev => {
        const allExistingIds = new Set(Object.values(prev).flat().map(o => o.id))
        const newOrders = converted.filter(o => !allExistingIds.has(o.id))
        if (newOrders.length === 0) return prev
        return { ...prev, 'Novos Pedidos': [...newOrders, ...prev['Novos Pedidos']] }
      })

      setLastSync(new Date())
      if (!silent) showToast(`Magazord sincronizado — ${converted.length} pedido(s) encontrado(s)`)
    } catch {
      setSyncError(true)
      showToast('Erro ao conectar com a Magazord. Verifique as credenciais.')
    } finally {
      setSyncing(false)
    }
  }, [])

  // Auto-sync on mount
  useEffect(() => {
    syncMagazord(true)
    const interval = setInterval(() => syncMagazord(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [syncMagazord])

  // ── Drag & drop ──
  const onDrop = (to: Stage, e?: React.DragEvent) => {
    e?.stopPropagation()
    if (!dragging || dragging.from === to) return
    const orderId = dragging.order.id
    setBoard(prev => {
      // Guard: avoid duplicating if already present in target
      if (prev[to].some(o => o.id === orderId)) return prev
      return {
        ...prev,
        [dragging.from]: prev[dragging.from].filter(o => o.id !== orderId),
        [to]: [...prev[to], dragging.order],
      }
    })
    showToast(`Pedido #${dragging.order.id} movido para ${to}`)
    setDragging(null)
  }

  // ── Confirm Magazord order → Impressão ──
  const confirmToProducao = async (order: Order) => {
    if (order.magazordId) await updateOrderSituacao(order.magazordId, 5) // 5 = Aprovado e Integrado (Produção)
    setBoard(prev => ({
      ...prev,
      'Novos Pedidos': prev['Novos Pedidos'].filter(o => o.id !== order.id),
      'Impressão': prev['Impressão'].some(o => o.id === order.id) 
        ? prev['Impressão'] 
        : [{ ...order, status: 'Pendente', fromMagazord: true }, ...prev['Impressão']],
    }))
    // Supabase: move to Impressão (or create if not persisted yet)
    const dbId = getDbId(order.id)
    if (dbId) {
      updatePedido(dbId, { etapa: 'Impressão', frete: order.frete })
    } else if (isSupabaseConfigured()) {
      // Enriquecer com dados detalhados (transportadora + frete real) antes de persistir
      let enrichedTrans = order.transportadora
      let enrichedFrete = order.frete
      try {
        const detail = await fetchOrderByCodigo(order.id)
        if (detail) {
          const rich = magazordDetailedToOrder(detail)
          if (rich.transportadora) enrichedTrans = rich.transportadora
          if (rich.frete != null && rich.frete > 0) enrichedFrete = rich.frete
        }
      } catch { /* silencia erros de detalhe */ }

      const created = await createPedido({
        numero:         order.id,
        magazord_id:    order.magazordId,
        cliente:        order.cliente,
        produto:        order.produto,
        moldura:        order.moldura,
        acabamento:     order.acabamento,
        canal:          order.canal,
        etapa:          'Impressão',
        status:         'Pendente',
        prazo_entrega:  order.prazoEntrega
          ? order.prazoEntrega.split('/').reverse().join('-')
          : undefined,
        valor:          order.valor,
        frete:          enrichedFrete,
        obs:            order.obs,
        endereco:       order.endereco,
        transportadora: enrichedTrans,
        from_magazord:  true,
      })
      if (created) dbIdMap.current.set(order.id, created.id)
    }
    showToast(`Pedido #${order.id} confirmado e enviado para Impressão!`)
  }

  // ── Advance kanban ──
  const conclude = (stage: Stage, id: string) => {
    const order = board[stage].find(o => o.id === id)!
    if (stage === 'Novos Pedidos') { confirmToProducao(order); return }
    if (stage === 'Embalagem')     { setReadyModal(order); return }
    if (stage === 'Revisão')       { setReviewModal(order); return }
    const stageIdx = ALL_STAGES.indexOf(stage as KanbanStage)
    const next = ALL_STAGES[stageIdx + 1]
    setBoard(prev => ({
      ...prev,
      [stage]: prev[stage].filter(o => o.id !== id),
      [next]:  [...prev[next], { ...order, status: 'OK' }],
    }))
    // Supabase sync
    const dbId = getDbId(id)
    if (dbId) movePedidoEtapa(dbId, next as string)
    showToast(`Pedido #${id} avançou para ${next}`)
  }

  // Persist board to local storage on every update as a safe fallback
  useEffect(() => {
    localStorage.setItem('erp_board_backup', JSON.stringify(board))
  }, [board])

  const markReady = (order: Order, endereco: string, transportadora: string, prazoEntrega: string) => {
    const prazoFmt = prazoEntrega
      ? new Date(prazoEntrega).toLocaleDateString('pt-BR')
      : order.prazoEntrega
    setBoard(prev => ({
      ...prev,
      'Embalagem': prev['Embalagem'].filter(o => o.id !== order.id),
      'Prontos para Envio': [{ ...order, status: 'OK', endereco, transportadora, prazoEntrega: prazoFmt }, ...prev['Prontos para Envio']],
    }))
    // Supabase sync
    const dbId = getDbId(order.id)
    if (dbId) updatePedido(dbId, { etapa: 'Prontos para Envio', endereco, transportadora,
      prazo_entrega: prazoEntrega || undefined })
    setReadyModal(null)
    showToast(`Pedido #${order.id} está Pronto para Envio!`)
  }

  const handleReview = (
    order: Order,
    revisor: string,
    tipo: 'aprovado' | 'reprovado',
    extra?: { etapaRetorno?: KanbanStage; areas?: string[]; motivo?: string; fotoUrl?: string }
  ) => {
    if (tipo === 'aprovado') {
      setBoard(prev => ({
        ...prev,
        'Revisão': prev['Revisão'].filter(o => o.id !== order.id),
        'Embalagem': [...prev['Embalagem'], { ...order, status: 'OK', revisaoStatus: 'aprovado', revisaoRevisor: revisor }],
      }))
      const dbId = getDbId(order.id)
      if (dbId) movePedidoEtapa(dbId, 'Embalagem')
      showToast(`✅ Pedido #${order.id} aprovado na revisão!`)
    } else {
      const destino = extra?.etapaRetorno ?? 'Impressão'
      setBoard(prev => ({
        ...prev,
        'Revisão': prev['Revisão'].filter(o => o.id !== order.id),
        [destino]: [...prev[destino], {
          ...order,
          status: 'Pendente',
          revisaoStatus: 'reprovado',
          revisaoRevisor: revisor,
          revisaoMotivo:  extra?.motivo,
          revisaoAreas:   extra?.areas,
          revisaoFotoUrl: extra?.fotoUrl,
        }],
      }))
      const dbId = getDbId(order.id)
      if (dbId) movePedidoEtapa(dbId, destino)
      showToast(`❌ Pedido #${order.id} reprovado — retornando para ${destino}`)
    }
    setReviewModal(null)
  }

  const dispatch = (order: Order, transportadora: string, rastreio: string) => {
    const now = new Date().toLocaleDateString('pt-BR') + ' às ' +
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    setBoard(prev => ({
      ...prev,
      'Prontos para Envio': prev['Prontos para Envio'].filter(o => o.id !== order.id),
      'Despachados': [{ ...order, transportadora, rastreio, dataDespacho: now, status: 'OK' }, ...prev['Despachados']],
    }))
    setDispatchModal(null)
    if (order.magazordId) updateOrderSituacao(order.magazordId, 7, { codigoRastreio: rastreio, transportadora })
    // Supabase sync
    const dbId = getDbId(order.id)
    if (dbId) despacharPedido(dbId, transportadora, rastreio)
    showToast(`Pedido #${order.id} despachado com sucesso!`)
  }

  const addOrder = async (order: Order) => {
    setBoard(prev => ({ ...prev, 'Impressão': [order, ...prev['Impressão']] }))
    // Supabase: persist the new order
    if (isSupabaseConfigured()) {
      const created = await createPedido({
        numero:        order.id,
        cliente:       order.cliente,
        produto:       order.produto,
        material:      order.material,
        moldura:       order.moldura,
        acabamento:    order.acabamento,
        canal:         order.canal,
        etapa:         'Impressão',
        status:        order.status,
        prazo_entrega: order.prazoEntrega
          ? order.prazoEntrega.split('/').reverse().join('-')
          : undefined,
        valor:         order.valor,
        frete:         order.frete,
        obs:           order.obs,
        from_magazord: false,
      })
      if (created) dbIdMap.current.set(order.id, created.id)
    }
    showToast(`Pedido #${order.id} adicionado ao Kanban!`)
  }

  const filterOrders = (orders: Order[]) => {
    if (filter === 'atrasado') return orders.filter(o => o.status === 'Atrasado')
    if (filter === 'pendente') return orders.filter(o => o.status === 'Pendente')
    return orders
  }

  const novosCount  = board['Novos Pedidos'].length
  const totalKanban = KANBAN_STAGES.flatMap(s => board[s]).length
  const totalProntos = board['Prontos para Envio'].length
  const totalDespach = board['Despachados'].length

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produção PCP</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {view === 'kanban'
              ? `Kanban — ${totalKanban} em produção · ${novosCount} aguardando confirmação`
              : `Expedição — ${totalProntos} prontos · ${totalDespach} despachados`}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          {/* Supabase DB status */}
          {isSupabaseConfigured() && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              dbLoading ? 'bg-blue-50 border-blue-200 text-blue-600' :
              dbConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <Database size={10} className={dbLoading ? 'animate-pulse' : ''} />
              {dbLoading ? 'Carregando...' : dbConnected ? 'Supabase ✓' : 'DB offline'}
            </div>
          )}
          {/* Magazord sync status */}
          <div className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white">
            {syncing ? (
              <><RefreshCw size={12} className="animate-spin text-violet-500" /><span className="text-gray-500">Sincronizando...</span></>
            ) : syncError ? (
              <><WifiOff size={12} className="text-red-500" /><span className="text-red-500">Magazord offline</span></>
            ) : (
              <><Wifi size={12} className="text-green-500" /><span className="text-gray-500">Magazord · {lastSync ? lastSync.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '—'}</span></>
            )}
            <button onClick={() => syncMagazord()} disabled={syncing} className="ml-1 text-violet-600 hover:text-violet-800 disabled:opacity-40">
              <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${view === 'kanban' ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <ClipboardList size={13} /> Produção
            </button>
            <button onClick={() => setView('delivery')} className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 relative ${view === 'delivery' ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Truck size={13} /> Expedição
              {totalProntos > 0 && (
                <span className={`ml-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${view === 'delivery' ? 'bg-yellow-400 text-gray-900' : 'bg-yellow-500 text-white'}`}>
                  {totalProntos}
                </span>
              )}
            </button>
          </div>

          {view === 'kanban' && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
              {([['todos', 'Todos'], ['atrasado', 'Atrasados'], ['pendente', 'Pendentes']] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === v ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setNewModal(true)} className="btn-primary"><Plus size={15} /> Novo Pedido</button>
        </div>
      </div>

      {/* ── KANBAN VIEW ── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {KANBAN_STAGES.map(stage => {
            const isNewOrders = stage === 'Novos Pedidos'
            const orders = isNewOrders ? board[stage] : filterOrders(board[stage])

            return (
              <div
                key={stage}
                className={`flex-shrink-0 w-64 rounded-xl flex flex-col transition-all ${
                  isNewOrders
                    ? 'bg-violet-50 border-2 border-violet-200'
                    : `bg-gray-100 ${dragging && dragging.from !== stage ? 'ring-2 ring-blue-200 ring-offset-1' : ''}`
                }`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(stage, e)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STAGE_DOT[stage]}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider flex-1 ${isNewOrders ? 'text-violet-700' : 'text-gray-600'}`}>
                    {stage}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isNewOrders
                      ? 'bg-violet-200 text-violet-800'
                      : 'bg-white text-gray-400'
                  }`}>
                    {orders.length}
                  </span>
                </div>

                {/* Magazord badge for "Novos Pedidos" */}
                {isNewOrders && (
                  <div className="mx-2 mb-2 flex items-center gap-1.5 bg-white border border-violet-200 rounded-lg px-2 py-1">
                    <ShoppingBag size={11} className="text-violet-500" />
                    <span className="text-[11px] text-violet-600 font-medium">Integração Magazord</span>
                    {syncing && <RefreshCw size={10} className="text-violet-400 ml-auto animate-spin" />}
                  </div>
                )}

                <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto">
                  {isNewOrders
                    ? orders.map(order => (
                        <MagazordCard
                          key={order.id}
                          order={order}
                          dragging={dragging?.order.id === order.id}
                          onDragStart={() => setDragging({ order, from: stage })}
                          onDragEnd={() => setDragging(null)}
                          onView={() => setDetail({ order, stage })}
                          onConfirm={() => confirmToProducao(order)}
                        />
                      ))
                    : orders.map(order => (
                        <motion.div
                          key={order.id}
                          layout
                          className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                          draggable
                          onDragStart={() => setDragging({ order, from: stage })}
                          onDragEnd={() => setDragging(null)}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${order.fromMagazord ? 'bg-violet-600' : 'bg-navy-900'}`}>
                              #{order.id}
                              {order.fromMagazord && <span className="ml-1 text-[9px] opacity-80">MG</span>}
                            </span>
                            {order.status === 'Atrasado'
                              ? <span className="badge badge-critico flex items-center gap-1"><AlertTriangle size={9} />Atrasado</span>
                              : order.prazoEntrega
                              ? <PrazoTag prazo={order.prazoEntrega} />
                              : order.data
                              ? <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{order.data} {order.hora}</span>
                              : null}
                          </div>
                          {order.canal && (
                            <span className="text-[10px] text-violet-600 font-medium">{CANAL_ICON[order.canal]} {order.canal}</span>
                          )}
                          <p className="text-sm font-semibold text-gray-800 leading-tight">{order.cliente}</p>
                          <p className="text-xs text-gray-500 mt-0.5 mb-2">{order.produto}</p>
                          {order.moldura && <span className="badge badge-gray text-[10px] mb-1">{order.moldura}</span>}
                          {order.material && !order.moldura && <span className="badge badge-gray text-[10px] mb-2">{order.material}</span>}
                          {/* Badge de reprovação */}
                          {order.revisaoStatus === 'reprovado' && (
                            <div className="mb-2 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1.5">
                              <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mb-0.5">
                                ❌ Reprovado por {order.revisaoRevisor}
                              </p>
                              {order.revisaoAreas && (
                                <p className="text-[10px] text-rose-500">{order.revisaoAreas.join(', ')}</p>
                              )}
                              {order.revisaoMotivo && (
                                <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-2">{order.revisaoMotivo}</p>
                              )}
                            </div>
                          )}
                          <div className="flex gap-1.5 mt-2">
                            <button
                              onClick={() => conclude(stage, order.id)}
                              className={`flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors`}
                              style={
                                stage === 'Embalagem' ? { background: '#d97706' } :
                                stage === 'Revisão'   ? { background: '#e11d48' } :
                                { background: '#1e3a8a' }
                              }
                            >
                              {stage === 'Embalagem'
                                ? <><ClipboardList size={13} /> Pronto p/ Envio</>
                                : stage === 'Revisão'
                                ? <><CheckCircle size={13} /> Iniciar Revisão</>
                                : <><CheckCircle size={13} /> OK / CONCLUÍDO</>}
                            </button>
                            {stage === 'Embalagem' && (
                              <button onClick={() => showToast('Upload de comprovante — funcionalidade em breve')} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-navy-900 transition-colors" title="Upload comprovante">
                                <Upload size={13} />
                              </button>
                            )}
                            <button onClick={() => setDetail({ order, stage })} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-navy-900 transition-colors" title="Ver detalhes">
                              <Eye size={13} />
                            </button>
                          </div>
                        </motion.div>
                      ))}

                  {orders.length === 0 && (
                    <div
                      className={`h-24 flex flex-col items-center justify-center text-xs border-2 border-dashed rounded-lg ${
                        isNewOrders ? 'border-violet-200 text-violet-300' : 'border-gray-300 text-gray-400'
                      }`}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.stopPropagation(); onDrop(stage, e) }}
                    >
                      {isNewOrders
                        ? <><ShoppingBag size={18} className="mb-1" />Aguardando Magazord</>
                        : dragging ? 'Soltar aqui' : 'Vazio'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── DELIVERY VIEW ── */}
      {view === 'delivery' && (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {(['Prontos para Envio', 'Despachados'] as DeliveryStage[]).map(stage => (
            <div
              key={stage}
              className={`flex-shrink-0 w-80 rounded-xl flex flex-col ${STAGE_BG[stage] ?? 'bg-gray-100'}`}
              onDragOver={e => e.preventDefault()}
              onDrop={e => onDrop(stage, e)}
            >
              <div className="flex items-center gap-2 px-3 py-3">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STAGE_DOT[stage]}`} />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex-1">{stage}</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${stage === 'Prontos para Envio' ? 'bg-yellow-200 text-yellow-800' : 'bg-emerald-100 text-emerald-700'}`}>
                  {board[stage].length}
                </span>
              </div>

              {stage === 'Prontos para Envio' && board[stage].length > 0 && (
                <div className="mx-3 mb-2 bg-yellow-100 border border-yellow-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-yellow-600 shrink-0" />
                  <p className="text-xs text-yellow-800 font-medium">
                    {board[stage].filter(o => (daysUntil(o.prazoEntrega) ?? 99) <= 1).length} pedido(s) com prazo crítico hoje/amanhã
                  </p>
                </div>
              )}
              {stage === 'Despachados' && board[stage].length > 0 && (
                <div className="mx-3 mb-2 bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Truck size={13} className="text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-800 font-medium">
                    {board[stage].length} em trânsito · {board[stage].filter(o => (daysUntil(o.prazoEntrega) ?? 99) < 0).length} com prazo vencido
                  </p>
                </div>
              )}

              <div className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto">
                {board[stage].map(order => (
                  <DeliveryCard
                    key={order.id}
                    order={order}
                    stage={stage}
                    onDragStart={() => setDragging({ order, from: stage })}
                    onDragEnd={() => setDragging(null)}
                    onView={() => setDetail({ order, stage })}
                    onDispatch={stage === 'Prontos para Envio' ? () => setDispatchModal(order) : undefined}
                  />
                ))}
                {board[stage].length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center text-gray-400 text-xs border-2 border-dashed rounded-xl"
                    style={{ borderColor: stage === 'Prontos para Envio' ? '#fde68a' : '#6ee7b7' }}>
                    {stage === 'Prontos para Envio'
                      ? <><ClipboardList size={20} className="text-yellow-300 mb-2" />Nenhum pedido pronto ainda</>
                      : <><Truck size={20} className="text-emerald-200 mb-2" />Nenhum pedido despachado</>}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Stats sidebar */}
          <div className="flex-shrink-0 w-72 space-y-3">
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resumo de Expedição</p>
              {[
                { label: 'Novos (Magazord)', value: novosCount,    color: 'text-violet-600', dot: 'bg-violet-500' },
                { label: 'Em produção',      value: totalKanban - novosCount, color: 'text-blue-600', dot: 'bg-blue-500' },
                { label: 'Prontos para envio', value: totalProntos, color: 'text-yellow-600', dot: 'bg-yellow-500' },
                { label: 'Despachados',      value: totalDespach,  color: 'text-emerald-600', dot: 'bg-emerald-500' },
                { label: 'Prazo crítico',
                  value: [...board['Prontos para Envio'], ...board['Despachados']].filter(o => (daysUntil(o.prazoEntrega) ?? 99) <= 1).length,
                  color: 'text-red-600', dot: 'bg-red-500' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    {s.label}
                  </div>
                  <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>

            <div className="card p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Próximos Prazos</p>
              <div className="space-y-2">
                {[...board['Prontos para Envio'], ...board['Despachados']]
                  .filter(o => o.prazoEntrega)
                  .sort((a, b) => (daysUntil(a.prazoEntrega) ?? 999) - (daysUntil(b.prazoEntrega) ?? 999))
                  .slice(0, 5)
                  .map(o => (
                    <div key={o.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">#{o.id} — {o.cliente}</p>
                        <p className="text-[10px] text-gray-400">{o.prazoEntrega}</p>
                      </div>
                      <PrazoTag prazo={o.prazoEntrega} />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setNewModal(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-navy-900 hover:bg-blue-900 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-20"
        title="Novo Pedido"
      >
        <Plus size={22} />
      </button>

      <AnimatePresence>
        {newModal && <NewOrderModal onClose={() => setNewModal(false)} onSave={addOrder} />}
        {detail && (
          <DetailModal
            order={detail.order}
            stage={detail.stage}
            onClose={() => setDetail(null)}
            onConclude={() => conclude(detail.stage, detail.order.id)}
          />
        )}
        {readyModal && (
          <ReadyModal
            order={readyModal}
            onClose={() => setReadyModal(null)}
            onConfirm={(end, tr, prazo) => markReady(readyModal, end, tr, prazo)}
          />
        )}
        {dispatchModal && (
          <DispatchModal
            order={dispatchModal}
            onClose={() => setDispatchModal(null)}
            onConfirm={(tr, rastreio) => dispatch(dispatchModal, tr, rastreio)}
          />
        )}
        {reviewModal && (
          <ReviewModal
            order={reviewModal}
            onClose={() => setReviewModal(null)}
            onApprove={(revisor) => handleReview(reviewModal, revisor, 'aprovado')}
            onReject={(revisor, etapaRetorno, areas, motivo, fotoUrl) =>
              handleReview(reviewModal, revisor, 'reprovado', { etapaRetorno, areas, motivo, fotoUrl })
            }
          />
        )}
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
