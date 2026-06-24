import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Clock, CheckCircle, Upload, Eye, X, Check, User, Package,
  AlertTriangle, Truck, MapPin, Calendar, Send, ClipboardList,
  RefreshCw, ShoppingBag, ArrowRight, Wifi, WifiOff, Store, Database, ChevronDown,
  Search, Trash2, Frame
} from 'lucide-react'
import { CARRIERS_BY_TYPE, CARRIER_NAMES } from '../carriers'
import { fetchPendingOrders, fetchOrderByCodigo, updateOrderSituacao, magazordToOrder, magazordDetailedToOrder, fetchAllMagazordOrders } from '../magazord'
import {
  fetchPedidos, createPedido, updatePedido, despacharPedido, movePedidoEtapa, movePedidosEtapa, subscribePedidos, deletePedido,
  upsertPedidosMagazord, fetchPedidosHistorico
} from '../services/pedidos'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { deductInventoryForProduction } from '../services/estoque'
import { getFrameImage } from '../lib/frameImages'
import { fetchAcervoDisponivel, matchesPCP, type AcervoQuadro } from '../services/acervo'

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
  notaFiscal?: string          // número da NF emitida
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
  // Expedição extras
  volumes?: number
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

const LOJAS_OPCOES = ['Casa Linda', 'Lar e Vida']
const FORMATOS_OPCOES = ['1 Tela Quadrado', '1 Tela', '2 Telas', '3 Telas']
const TAMANHOS_OPCOES = [
  'Livre/Outro',
  '85x85 cm', '115x115 cm', '145x145 cm',
  '85x55 cm', '115x75 cm', '145x95 cm', '175x100 cm',
  '55x35 cm cada (2 Telas)', '85x55 cm cada (2 Telas)', '115x75 cm cada (2 Telas)', '145x95 cm cada (2 Telas)', '175x95 cm cada (2 Telas)',
  '40x20 cm cada (3 Telas)', '55x30 cm cada (3 Telas)', '70x40 cm cada (3 Telas)', '90x50 cm cada (3 Telas)', '120x70 cm cada (3 Telas)'
]
const MOLDURAS_OPCOES = [
  'Sem Moldura (Borda Infinita)',
  'Caixa Preta', 'Caixa Branca', 'Caixa Dourada', 'Caixa Madeira',
  'Flutuante Preta', 'Flutuante Branca', 'Flutuante Dourada', 'Flutuante Madeira',
  'Côncava Preta', 'Côncava Branca', 'Côncava Dourada', 'Côncava Madeira',
  'Inox',
  'Trono de Ouro', 'Majestade Negra', 'Galeria Imperial',
  'Roma Moderna', 'Palaciana', 'Realce Imperial', 'Imperial Prata e Ouro', 'Barroco Imperial'
]
const ACABAMENTOS_OPCOES = ['Sem Vidro', 'Com Vidro']

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
  order, onView, onConfirm, onDelete, dragging, onDragStart, onDragEnd
}: {
  order: Order; onView: () => void; onConfirm: () => void; onDelete: () => void
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
      <p className="text-xs text-gray-500 mt-0.5 mb-1">{order.produto}</p>
      {(order.quantidade ?? 1) > 1 && (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-2">
          🖼️ {order.quantidade} quadros
        </span>
      )}

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
        <button
          onClick={onDelete}
          className="p-1.5 border border-red-100 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
          title="Excluir pedido"
        >
          <Trash2 size={13} />
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

function DetailModal({ order: initialOrder, stage, onClose, onConclude, onDelete, onMoveTo }: {
  order: Order; stage: Stage; onClose: () => void; onConclude: () => void; onDelete: () => void
  onMoveTo: (targetStage: Stage) => void
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

  const [fullImage, setFullImage] = useState<string | null>(null)

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
              {order.notaFiscal ? (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ClipboardList size={9} /> NF {order.notaFiscal}
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ClipboardList size={9} /> Sem NF
                </span>
              )}
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
                <img onClick={() => setFullImage(order.imagemUrl!)} src={order.imagemUrl} alt="Produto" className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform" />
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
              {(() => {
                // 1) Se há itens individuais salvos, usa diretamente
                if (order.itens && order.itens.length > 0) return order.itens
                // 2) Detecta padrão "X quadros — item1, item2, ..." gerado ao salvar manualmente
                const multiMatch = order.produto?.match(/^\d+ quadros? — (.+)$/)
                if (multiMatch) {
                  const nomes = multiMatch[1].split(', ')
                  return nomes.map(nome => ({
                    produto: nome.trim(),
                    quantidade: 1,
                    tamanho: order.tamanho,
                    formato: order.formato,
                    moldura: order.moldura,
                    acabamento: order.acabamento,
                    imagemUrl: undefined as string | undefined,
                  }))
                }
                // 3) Pedido com item único
                return [order]
              })().map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Item header */}
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex gap-3">
                    {/* Imagem */}
                    <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.imagemUrl || order.imagemUrl ? (
                         <img onClick={() => setFullImage(item.imagemUrl || order.imagemUrl!)} src={item.imagemUrl || order.imagemUrl} alt="Produto" className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform" />
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
        <div className="flex flex-col gap-2 p-4 pt-3 border-t border-gray-100 sticky bottom-0 bg-white">

          {/* Mover para qualquer etapa */}
          {stage !== 'Despachados' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 shrink-0">
                <ArrowRight size={13} className="text-gray-400" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Mover para</span>
              </div>
              <select
                className="flex-1 text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-2 bg-gray-50 text-gray-700 hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer"
                defaultValue=""
                onChange={e => {
                  if (!e.target.value) return
                  onMoveTo(e.target.value as Stage)
                  onClose()
                }}
              >
                <option value="" disabled>Selecionar etapa…</option>
                {(['Novos Pedidos','Impressão','Corte Moldura','Entelamento + Vidro','Acabamento','Revisão','Embalagem','Prontos para Envio','Despachados'] as Stage[])
                  .filter(s => s !== stage)
                  .map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
              </select>
            </div>
          )}

          {/* Botões de ação principais */}
          <div className="flex gap-2">
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
        </div>
      </motion.div>

      {/* ── FULLSCREEN IMAGE ZOOM ── */}
      <AnimatePresence>
        {fullImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[999] bg-black/90 flex flex-col items-center justify-center p-4 md:p-8 backdrop-blur-md cursor-zoom-out"
            onClick={(e) => { e.stopPropagation(); setFullImage(null); }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setFullImage(null); }}
              className="absolute top-6 right-6 text-white/70 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              title="Fechar"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.2 }}
              src={fullImage}
              alt="Zoom"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
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

  const [customReviewers, setCustomReviewers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('erp_reviewers')
      return saved ? JSON.parse(saved) : ['Marcelo', 'Isac']
    } catch {
      return ['Marcelo', 'Isac']
    }
  })
  const [newRevisor, setNewRevisor] = useState('')

  const handleAddRevisor = () => {
    if (!newRevisor.trim()) return
    const name = newRevisor.trim()
    if (!customReviewers.includes(name)) {
      const updated = [...customReviewers, name]
      setCustomReviewers(updated)
      localStorage.setItem('erp_reviewers', JSON.stringify(updated))
    }
    setRevisor(name)
    setNewRevisor('')
  }

  const toggleArea = (a: string) =>
    setAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setFotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const [validationError, setValidationError] = useState('')

  const canConfirm = !!revisor
  // Motivo é opcional — basta ter revisor e ao menos uma área selecionada
  const canReject  = !!revisor && areas.length > 0

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
            <div className="flex flex-wrap gap-2 mb-2">
              {customReviewers.map(name => (
                <button
                  key={name}
                  onClick={() => setRevisor(name)}
                  className={`flex-1 py-2.5 px-2 min-w-[80px] rounded-xl text-sm font-bold border-2 transition-all ${
                    revisor === name
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                className="input flex-1 text-sm py-2"
                placeholder="Novo revisor..."
                value={newRevisor}
                onChange={e => setNewRevisor(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddRevisor()
                }}
              />
              <button
                onClick={handleAddRevisor}
                className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-200"
              >
                Adicionar
              </button>
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
          <div className="space-y-2">
            {validationError && (
              <p className="text-xs text-rose-600 font-medium text-center">{validationError}</p>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
              {decision === 'aprovado' && (
                <button
                  onClick={() => {
                    if (!canConfirm) { setValidationError('Selecione o revisor.'); return }
                    onApprove(revisor); onClose()
                  }}
                  className={`btn-primary flex-1 justify-center ${!canConfirm ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ background: '#059669' }}
                >
                  <Check size={14} /> Aprovar → Embalagem
                </button>
              )}
              {decision === 'reprovado' && (
                <button
                  onClick={() => {
                    if (!revisor)         { setValidationError('Selecione o revisor.'); return }
                    if (areas.length === 0) { setValidationError('Selecione ao menos uma área com problema.'); return }
                    onReject(revisor, etapaRetorno, areas, motivo, fotoPreview)
                    onClose()
                  }}
                  className={`btn-primary flex-1 justify-center ${!canReject ? 'opacity-60' : ''}`}
                  style={{ background: '#e11d48' }}
                >
                  <X size={14} /> Registrar Reprovação
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Ready Modal ──────────────────────────────────────────────────────────────

function ReadyModal({ order, onClose, onConfirm }: {
  order: Order; onClose: () => void
  onConfirm: (endereco: string, transportadora: string, prazo: string, volumes: number) => void
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
  const [volumes, setVolumes]   = useState(order.volumes || order.quantidade || 1)
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Transportadora</label>
              <select className="input font-semibold" value={trans} onChange={e => setTrans(e.target.value)} disabled={fetching}>
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
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Qtd Volumes (Caixas) <span className="text-red-500">*</span></label>
              <input 
                className="input border-yellow-300 bg-yellow-50 focus:border-yellow-500 focus:ring-yellow-200" 
                type="number" min="1" max="50" step="1"
                value={volumes} onChange={e => setVolumes(parseInt(e.target.value) || 1)} disabled={fetching} 
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button
              onClick={() => { onConfirm(endereco, trans, prazo, volumes); onClose() }}
              className="btn-primary flex-1 justify-center"
              style={{ background: '#d97706' }}
              disabled={fetching || volumes < 1}
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
  // ─ Header fields (shared across all items) ─
  const [loja,        setLoja]        = useState(LOJAS_OPCOES[0])
  const [cliente,     setCliente]     = useState('')
  const [data,        setData]        = useState('')
  const [prazoEntrega,setPrazo]       = useState('')
  const [obs,         setObs]         = useState('')

  // ─ Items (one per unique quadro) ─
  type ItemForm = {
    id: number
    produto: string
    tamanho: string
    formato: string
    material: string
    moldura: string
    acabamento: string
    quantidade: number
    imagemUrl: string
    fotoPreview: string
  }

  const newItem = (): ItemForm => ({
    id: Date.now() + Math.random(),
    produto: '',
    tamanho: TAMANHOS_OPCOES[2],
    formato: FORMATOS_OPCOES[0],
    material: MATERIAIS[0],
    moldura: MOLDURAS_OPCOES[1],
    acabamento: ACABAMENTOS_OPCOES[0],
    quantidade: 1,
    imagemUrl: '',
    fotoPreview: '',
  })

  const [items, setItems] = useState<ItemForm[]>(() => {
    const i = newItem()
    return [i]
  })
  const [expanded, setExpanded] = useState<number>(() => items[0].id)

  const updateItem = (id: number, patch: Partial<ItemForm>) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))

  const addItem = () => {
    const ni = newItem()
    setItems(prev => [...prev, ni])
    setExpanded(ni.id)
  }

  const removeItem = (id: number) => {
    setItems(prev => {
      const next = prev.filter(it => it.id !== id)
      if (next.length === 0) return prev
      if (expanded === id) setExpanded(next[next.length - 1].id)
      return next
    })
  }

  const handleFoto = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => updateItem(id, { fotoPreview: ev.target?.result as string, imagemUrl: ev.target?.result as string })
    reader.readAsDataURL(file)
  }

  const totalQuadros = items.reduce((s, it) => s + it.quantidade, 0)
  const canSave = cliente.trim() !== '' && items.every(it => it.produto.trim() !== '')

  const save = () => {
    if (!canSave) return
    const id = String(Math.floor(800 + Math.random() * 200))
    const firstItem = items[0]
    onSave({
      id,
      cliente,
      produto: items.length === 1
        ? firstItem.produto
        : `${items.length} quadros — ${items.map(it => it.produto).join(', ')}`,
      material:   firstItem.material,
      tamanho:    firstItem.tamanho,
      formato:    firstItem.formato,
      moldura:    firstItem.moldura,
      acabamento: firstItem.acabamento,
      quantidade: totalQuadros,
      imagemUrl:  firstItem.fotoPreview || undefined,
      canal:      loja,
      data:       data || 'Hoje',
      hora:       '',
      prazoEntrega: prazoEntrega || undefined,
      status:     'Pendente',
      obs:        obs || undefined,
      itens: items.map(it => ({
        produto:    it.produto,
        quantidade: it.quantidade,
        tamanho:    it.tamanho,
        formato:    it.formato,
        moldura:    it.moldura,
        acabamento: it.acabamento,
        imagemUrl:  it.fotoPreview || undefined,
      })),
    })
    onClose()
  }

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: '640px' }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              Novo Pedido de Produção
              <span className="inline-flex items-center gap-1 bg-navy-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {totalQuadros} quadro{totalQuadros !== 1 ? 's' : ''}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Adicione quantos quadros diferentes precisar no mesmo pedido.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* ── Dados do pedido ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Loja de Origem *</label>
              <select className="input font-semibold text-navy-800" value={loja} onChange={e => setLoja(e.target.value)}>
                {LOJAS_OPCOES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Cliente *</label>
              <input className="input" list="clientes-list-nm" placeholder="Nome do cliente" value={cliente} onChange={e => setCliente(e.target.value)} />
              <datalist id="clientes-list-nm">{CLIENTES.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prev. Produção</label>
              <input className="input" type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prazo de Entrega</label>
              <input className="input" type="date" value={prazoEntrega} onChange={e => setPrazo(e.target.value)} />
            </div>
          </div>

          {/* ── Divisor ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Quadros do Pedido</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Lista de itens ── */}
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className={`border rounded-xl overflow-hidden transition-all ${expanded === item.id ? 'border-blue-300 shadow-sm' : 'border-gray-200'}`}>
                {/* Accordion header */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${expanded === item.id ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                  onClick={() => setExpanded(expanded === item.id ? -1 : item.id)}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${expanded === item.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {item.produto ? item.produto : <span className="text-gray-400 font-normal italic">Quadro sem nome</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{item.tamanho} · {item.moldura}</p>
                  </div>
                  {item.fotoPreview && (
                    <img src={item.fotoPreview} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-200 shrink-0" />
                  )}
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                    {item.quantidade}x
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeItem(item.id) }}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      title="Remover quadro"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform duration-200 ${expanded === item.id ? 'rotate-180' : ''}`} />
                </div>

                {/* Accordion body */}
                <AnimatePresence>
                  {expanded === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3 border-t border-gray-100 bg-white">
                        {/* Nome do produto */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Produto / Descrição *</label>
                          <input
                            className="input"
                            placeholder="Ex: Canvas Skyline NY 120×80"
                            value={item.produto}
                            onChange={e => updateItem(item.id, { produto: e.target.value })}
                          />
                        </div>

                        {/* Tamanho + Formato */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Formato</label>
                            <select className="input" value={item.formato} onChange={e => updateItem(item.id, { formato: e.target.value })}>
                              {FORMATOS_OPCOES.map(o => <option key={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Tamanho (cm)</label>
                            <select className="input" value={item.tamanho} onChange={e => updateItem(item.id, { tamanho: e.target.value })}>
                              <option value="">Livre/Outro</option>
                              {TAMANHOS_OPCOES.map(o => <option key={o}>{o}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Material + Moldura */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Material Impressão</label>
                            <select className="input" value={item.material} onChange={e => updateItem(item.id, { material: e.target.value })}>
                              {MATERIAIS.map(m => <option key={m}>{m}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1">Moldura</label>
                              <select className="input" value={item.moldura} onChange={e => updateItem(item.id, { moldura: e.target.value })}>
                                {MOLDURAS_OPCOES.map(o => <option key={o}>{o}</option>)}
                              </select>
                            </div>
                            {item.moldura && getFrameImage(item.moldura) && (
                              <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-gray-200 mb-0.5">
                                <img src={getFrameImage(item.moldura)!} alt={item.moldura} className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Acabamento + Qtd */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Acabamento Frontal</label>
                            <select className="input" value={item.acabamento} onChange={e => updateItem(item.id, { acabamento: e.target.value })}>
                              {ACABAMENTOS_OPCOES.map(o => <option key={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Qtd deste quadro</label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { quantidade: Math.max(1, item.quantidade - 1) })}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 font-bold hover:bg-gray-50 transition-all disabled:opacity-30"
                                disabled={item.quantidade <= 1}
                              >−</button>
                              <input
                                className="input text-center font-bold px-1"
                                style={{ width: '3rem' }}
                                type="number" min="1" max="99"
                                value={item.quantidade}
                                onChange={e => updateItem(item.id, { quantidade: Math.max(1, parseInt(e.target.value) || 1) })}
                              />
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { quantidade: Math.min(99, item.quantidade + 1) })}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 font-bold hover:bg-gray-50 transition-all"
                              >+</button>
                            </div>
                          </div>
                        </div>

                        {/* Foto */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Foto do Quadro (opcional)</label>
                          {item.fotoPreview ? (
                            <div className="relative w-fit">
                              <img src={item.fotoPreview} alt="" className="h-28 w-auto rounded-xl border border-gray-200 object-cover" />
                              <button
                                type="button"
                                onClick={() => updateItem(item.id, { fotoPreview: '', imagemUrl: '' })}
                                className="absolute top-1.5 right-1.5 bg-white border border-gray-200 rounded-full p-0.5 hover:bg-red-50 hover:border-red-300 transition-colors"
                              >
                                <X size={11} className="text-gray-500" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                              <Upload size={16} className="text-gray-400 mb-1" />
                              <span className="text-xs text-gray-400">Clique para adicionar foto</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleFoto(item.id, e)} />
                            </label>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Botão adicionar quadro */}
          <button
            type="button"
            onClick={addItem}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
          >
            <Plus size={15} /> Adicionar outro quadro
          </button>

          {/* Observações */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Observações do Pedido</label>
            <textarea className="input h-16 resize-none" placeholder="Detalhes adicionais..." value={obs} onChange={e => setObs(e.target.value)} />
          </div>

          {/* Resumo quando tem mais de 1 item */}
          {items.length > 1 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-700 mb-1.5">Resumo do Pedido</p>
              <div className="space-y-1">
                {items.map((it, i) => (
                  <div key={it.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="font-semibold truncate flex-1">{it.produto || '—'}</span>
                    <span className="text-gray-400 shrink-0 text-[10px]">{it.tamanho}</span>
                    <span className="font-bold text-amber-700 shrink-0">{it.quantidade}x</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-800">
                <span>Total</span>
                <span>{totalQuadros} quadro{totalQuadros !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button
              onClick={save}
              disabled={!canSave}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Salvar e Baixar Estoque
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Delivery Card ─────────────────────────────────────────────────────────────

function CopyNumber({ num, label }: { num: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(num).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <div className="flex items-center gap-2 mb-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
      {label && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">{label}</span>}
      <span className="font-mono text-base font-black text-gray-800 tracking-tight flex-1 select-all">{num}</span>
      <button
        onClick={copy}
        title={`Copiar ${label ?? 'número'}`}
        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
          copied
            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
            : 'bg-white border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
        }`}
      >
        {copied ? (
          <>✓ Copiado</>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            Copiar
          </>
        )}
      </button>
    </div>
  )
}

function DeliveryCard({
  order, stage, onView, onDispatch, onUndo, onDragStart, onDragEnd, onChangeCarrier
}: {
  order: Order; stage: DeliveryStage
  onView: () => void; onDispatch?: () => void; onUndo?: () => void
  onDragStart: () => void; onDragEnd: () => void
  onChangeCarrier?: (newCarrier: string) => void
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
      {/* NF grande com copiar */}
      {order.notaFiscal
        ? <CopyNumber num={order.notaFiscal} label="NF" />
        : (
          <div className="flex items-center gap-1.5 mb-2 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-2.5 py-1.5">
            <ClipboardList size={11} className="text-gray-300 shrink-0" />
            <span className="text-xs text-gray-300 italic">NF ainda não emitida</span>
          </div>
        )
      }

      <p className="text-sm font-semibold text-gray-800 leading-tight">{order.cliente}</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-2">{order.produto}</p>
      <div className="space-y-1 mb-3">
        {order.endereco && (
          <div className="flex items-start gap-1.5 text-xs text-gray-500">
            <MapPin size={11} className="text-gray-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{order.endereco}</span>
          </div>
        )}
        {order.transportadora ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 relative">
            <Truck size={11} className="text-gray-400 shrink-0" />
            
            {onChangeCarrier && stage === 'Prontos para Envio' ? (
              <label 
                className="flex-1 flex items-center gap-1.5 cursor-pointer hover:bg-blue-50 px-1 -ml-1 rounded transition-colors group py-0.5"
                title="Alterar Transportadora"
              >
                <span className="text-gray-600 font-semibold group-hover:text-blue-600 transition-colors">{order.transportadora}</span>
                <span className="text-[9px] font-bold text-blue-500 bg-blue-100 px-1 border border-blue-200 rounded uppercase tracking-wider shadow-sm opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  Alterar
                </span>
                
                <select 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={order.transportadora}
                  onChange={(e) => onChangeCarrier(e.target.value)}
                >
                  <option value="" disabled>Alterar Transportadora...</option>
                  {CARRIERS_BY_TYPE.map(g => (
                    <optgroup key={g.tipo} label={g.tipo}>
                      {g.items.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            ) : (
              <span className="flex-1">{order.transportadora}</span>
            )}
          </div>
        ) : (
          onChangeCarrier && stage === 'Prontos para Envio' && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Truck size={11} className="text-gray-400 shrink-0" />
              <label className="cursor-pointer text-blue-600 hover:underline">
                Definir transportadora
                <select 
                  className="absolute w-0 h-0 opacity-0"
                  value=""
                  onChange={(e) => onChangeCarrier(e.target.value)}
                >
                  <option value="" disabled>Selecionar...</option>
                  {CARRIERS_BY_TYPE.map(g => (
                    <optgroup key={g.tipo} label={g.tipo}>
                      {g.items.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
          )
        )}
        {order.prazoEntrega && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={11} className="text-gray-400 shrink-0" />
            <span>Prazo: {order.prazoEntrega}</span>
          </div>
        )}
        {Boolean(order.volumes) && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded w-fit border border-amber-100">
            <Package size={11} className="text-amber-500 shrink-0" />
            <span>{order.volumes} {order.volumes === 1 ? 'Cx/Volume' : 'Cxs/Volumes'}</span>
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
          <button
            onClick={onUndo}
            title="Desfazer despacho"
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
          >
            <ArrowRight size={11} className="rotate-180" /> Desfazer
          </button>
        )}
        <button onClick={onView} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-navy-900 transition-colors" title="Ver detalhes">
          <Eye size={13} />
        </button>
      </div>
    </motion.div>
  )
}

function CarrierAccordion({ carrier, orders, stage, critical, setDragging, setDetail, setDispatchModal, undoDispatch, dispatchAll, onChangeCarrier }: any) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="mb-4 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div 
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Truck size={14} className="text-gray-400 shrink-0" />
        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide flex-1 truncate">
          {carrier}
        </span>
        <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">
          {orders.length}
        </span>
        {critical > 0 && stage === 'Prontos para Envio' && (
          <span className="text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <AlertTriangle size={8} /> {critical}
          </span>
        )}
        {stage === 'Prontos para Envio' && orders.length > 0 && (
          <button 
            onClick={(e) => { e.stopPropagation(); dispatchAll(carrier, orders); }}
            title="Despachar todos os pedidos desta transportadora"
            className="ml-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
          >
            <Send size={10} /> Despachar Todos
          </button>
        )}
        <ChevronDown size={14} className={`text-gray-400 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180':''}`} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-gray-50/50">
            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-gray-100 mt-1">
              {orders.map((order: any) => (
                <DeliveryCard
                  key={order.id}
                  order={order}
                  stage={stage}
                  onDragStart={() => setDragging({ order, from: stage })}
                  onDragEnd={() => setDragging(null)}
                  onView={() => setDetail({ order, stage })}
                  onDispatch={stage === 'Prontos para Envio' ? () => setDispatchModal(order) : undefined}
                  onUndo={stage === 'Despachados' ? () => undoDispatch(order) : undefined}
                  onChangeCarrier={onChangeCarrier ? (newCarrier) => onChangeCarrier(order.id, newCarrier, stage) : undefined}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Search Modal ─────────────────────────────────────────────────────────────

// Helper: converte qualquer valor para string minúscula sem crashar
function safeStr(v: unknown): string {
  if (v == null) return ''
  return String(v).toLowerCase()
}

function SearchModal({ board, onClose, onView }: {
  board: Record<Stage, Order[]>
  onClose: () => void
  onView: (order: Order, stage: Stage) => void
}) {
  const [tab, setTab]     = useState<'kanban' | 'historico'>('kanban')
  const [query, setQuery] = useState('')
  const [hCliente, setHCliente]   = useState('')
  const [hNumero, setHNumero]     = useState('')
  const [hMes, setHMes]           = useState('')   // YYYY-MM
  const [hResults, setHResults]   = useState<any[]>([])
  const [hLoading, setHLoading]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const q = query.trim().toLowerCase()

  // ── Kanban search ──────────────────────────────────────────────────────────
  let allOrders: { order: Order; stage: Stage }[] = []
  try {
    allOrders = ALL_STAGES.flatMap(stage =>
      (board[stage] ?? []).filter(o => o != null).map(order => ({ order, stage }))
    )
  } catch { allOrders = [] }

  let results: { order: Order; stage: Stage }[] = []
  try {
    results = q.length < 1 ? [] : allOrders.filter(({ order }) =>
      safeStr(order.id).includes(q) ||
      safeStr(order.notaFiscal).includes(q) ||
      safeStr(order.cliente).includes(q) ||
      safeStr(order.produto).includes(q) ||
      (order.itens ?? []).some(it => safeStr(it?.produto).includes(q))
    )
  } catch { results = [] }

  // ── Histórico search ───────────────────────────────────────────────────────
  const buscarHistorico = async () => {
    if (!hCliente && !hNumero && !hMes) return
    setHLoading(true)
    const filtros: any = {}
    if (hCliente) filtros.cliente = hCliente
    if (hNumero)  filtros.numero  = hNumero
    if (hMes) {
      filtros.dataInicio = `${hMes}-01`
      const [y, m] = hMes.split('-').map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      filtros.dataFim = `${hMes}-${String(lastDay).padStart(2, '0')}`
    }
    const rows = await fetchPedidosHistorico(filtros)
    setHResults(rows)
    setHLoading(false)
  }

  const STAGE_COLOR: Partial<Record<Stage, string>> = {
    'Novos Pedidos':       'bg-violet-100 text-violet-700',
    'Impressão':           'bg-blue-100 text-blue-700',
    'Corte Moldura':       'bg-orange-100 text-orange-700',
    'Entelamento + Vidro': 'bg-green-100 text-green-700',
    'Acabamento':          'bg-purple-100 text-purple-700',
    'Revisão':             'bg-rose-100 text-rose-700',
    'Embalagem':           'bg-gray-100 text-gray-700',
    'Prontos para Envio':  'bg-yellow-100 text-yellow-700',
    'Despachados':         'bg-emerald-100 text-emerald-700',
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal"
        style={{ maxWidth: 580, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['kanban', 'historico'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                tab === t
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'kanban' ? '📋 Kanban (ativo)' : '📦 Histórico'}
            </button>
          ))}
        </div>

        {tab === 'kanban' ? (
          <>
            {/* Kanban search input */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar por NF, nº do pedido, cliente ou produto…"
                  className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 pl-1">
                Pesquisa em todas as etapas — produção e expedição
              </p>
            </div>

            {/* Kanban results */}
            <div className="overflow-y-auto flex-1">
              {q.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                  <Search size={32} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">Digite para buscar pedidos</p>
                  <p className="text-xs mt-1 opacity-70">NF · Nº do pedido · Cliente · Produto</p>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                  <Package size={32} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum pedido encontrado no kanban</p>
                  <p className="text-xs mt-1 opacity-70">Tente buscar na aba Histórico</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  <p className="px-5 py-2 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                    {results.length} resultado{results.length !== 1 ? 's' : ''}
                  </p>
                  {results.map(({ order, stage }) => (
                    <div
                      key={`${order.id}-${stage}`}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group cursor-pointer"
                      onClick={() => { onView(order, stage); onClose() }}
                    >
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${STAGE_DOT[stage] ?? 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">#{order.id}</span>
                          {order.notaFiscal && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <ClipboardList size={8} /> NF {order.notaFiscal}
                            </span>
                          )}
                          {order.fromMagazord && (
                            <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">MAGAZORD</span>
                          )}
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STAGE_COLOR[stage] ?? 'bg-gray-100 text-gray-600'}`}>
                            {stage}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{order.cliente}</p>
                        <p className="text-[11px] text-gray-500 truncate">{order.produto}</p>
                        {order.prazoEntrega && (
                          <p className="text-[10px] text-gray-400 mt-0.5">Prazo: {order.prazoEntrega}</p>
                        )}
                      </div>
                      <button className="shrink-0 p-1.5 rounded-lg border border-gray-200 text-gray-400 group-hover:text-navy-900 group-hover:border-blue-200 group-hover:bg-blue-50 transition-all">
                        <Eye size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Histórico filters */}
            <div className="p-4 border-b border-gray-100 flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-blue-400 transition-all">
                  <User size={13} className="text-gray-400 shrink-0" />
                  <input
                    value={hCliente}
                    onChange={e => setHCliente(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && buscarHistorico()}
                    placeholder="Nome do cliente"
                    className="flex-1 bg-transparent text-xs text-gray-800 outline-none placeholder-gray-400"
                  />
                </div>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-blue-400 transition-all" style={{ width: 160 }}>
                  <Search size={13} className="text-gray-400 shrink-0" />
                  <input
                    value={hNumero}
                    onChange={e => setHNumero(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && buscarHistorico()}
                    placeholder="Nº pedido"
                    className="flex-1 bg-transparent text-xs text-gray-800 outline-none placeholder-gray-400"
                  />
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-blue-400 transition-all flex-1">
                  <Calendar size={13} className="text-gray-400 shrink-0" />
                  <input
                    type="month"
                    value={hMes}
                    onChange={e => setHMes(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-gray-800 outline-none"
                  />
                </div>
                <button
                  onClick={buscarHistorico}
                  disabled={hLoading || (!hCliente && !hNumero && !hMes)}
                  className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
                >
                  {hLoading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                  Buscar
                </button>
              </div>
              <p className="text-[11px] text-gray-400 pl-1">Busca em todos os pedidos salvos no banco, incluindo entregues</p>
            </div>

            {/* Histórico results */}
            <div className="overflow-y-auto flex-1">
              {hLoading ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                  <RefreshCw size={28} className="mb-3 opacity-30 animate-spin" />
                  <p className="text-sm font-medium">Buscando no histórico…</p>
                </div>
              ) : hResults.length === 0 && !hLoading ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                  <Package size={32} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">
                    {hCliente || hNumero || hMes ? 'Nenhum pedido encontrado' : 'Use os filtros acima para buscar'}
                  </p>
                  <p className="text-xs mt-1 opacity-70">Cliente · Nº do pedido · Mês</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  <p className="px-5 py-2 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                    {hResults.length} resultado{hResults.length !== 1 ? 's' : ''} no histórico
                  </p>
                  {hResults.map(row => (
                    <div key={row.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${STAGE_DOT[row.etapa as Stage] ?? 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">#{row.numero}</span>
                          {row.arquivado && (
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Arquivado</span>
                          )}
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STAGE_COLOR[row.etapa as Stage] ?? 'bg-gray-100 text-gray-600'}`}>
                            {row.etapa}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{row.cliente}</p>
                        <p className="text-[11px] text-gray-500 truncate">{row.produto}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(row.created_at).toLocaleDateString('pt-BR')}
                          {row.valor ? ` · R$ ${Number(row.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
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
  const [searchModal, setSearchModal] = useState(false)
  const [filter, setFilter]         = useState<'todos' | 'atrasado' | 'pendente'>('todos')
  const [view, setView]             = useState<ViewMode>('kanban')
  const [dbLoading, setDbLoading]   = useState(false)
  const [dbConnected, setDbConnected] = useState(false)

  // Maps display-id → Supabase UUID (needed for syncing mutations)
  const dbIdMap = useRef<Map<string, string>>(new Map())
  const pendingCreates = useRef<Set<string>>(new Set())
  const enrichCache = useRef<Record<string, any>>(
    (() => {
      try { return JSON.parse(localStorage.getItem('erp_enrich_cache') || '{}') }
      catch { return {} }
    })()
  )

  // ── Magazord sync state ──
  const [syncing, setSyncing]       = useState(false)
  const [lastSync, setLastSync]     = useState<Date | null>(null)
  const [syncError, setSyncError]   = useState(false)

  // ── Importação histórica ──
  const [importing, setImporting]   = useState(false)
  const [importProgress, setImportProgress] = useState<{ fetched: number; total: number | null; page: number } | null>(null)
  const [importResult, setImportResult] = useState<{ inseridos: number; erros: number } | null>(null)

  // ── Acervo do salão: quadros disponíveis para cross-sell com PCP ──
  const [acervoQuadros, setAcervoQuadros] = useState<AcervoQuadro[]>([])
  useEffect(() => {
    fetchAcervoDisponivel().then(setAcervoQuadros).catch(() => {})
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const processFetchedRows = useCallback((rows: any[]) => {
    if (rows.length === 0) { setDbLoading(false); setDbConnected(true); return }

    const grouped: Record<Stage, Order[]> = {
      'Novos Pedidos': [], 'Impressão': [], 'Corte Moldura': [],
      'Entelamento + Vidro': [], 'Acabamento': [], 'Revisão': [], 'Embalagem': [],
      'Prontos para Envio': [], 'Despachados': [],
    }

    const seen = new Set<string>()
    const sortedRows = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    sortedRows.forEach(r => {
      const numStr = String(r.numero)
      if (seen.has(numStr)) return
      seen.add(numStr)
      const etapa = r.etapa as Stage
      if (!(etapa in grouped)) return
      const order: Order = {
        id: String(r.numero),
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
        volumes: r.volumes ?? undefined,

        // Injeta dados enriquecidos salvos em cache para evitar recarregamento
        ...(enrichCache.current[r.numero] || {})
      }
      dbIdMap.current.set(r.numero, r.id)
      grouped[etapa].push(order)
    })

    setBoard(prev => {
      // Build dbIds ONLY from orders that are actually mapped to valid stages in grouped
      const validDbIds = new Set<string>()
      for (const stage of Object.keys(grouped) as Stage[]) {
        grouped[stage].forEach(o => validDbIds.add(String(o.id)))
      }

      // Preserve orders that exist locally but haven't been written to DB yet
      // (e.g. orders just moved to "Prontos para Envio" via markReady before the
      //  real-time subscription fires from an unrelated UPDATE event)
      const localOnlyOrders: Record<Stage, Order[]> = {
        'Novos Pedidos': [], 'Impressão': [], 'Corte Moldura': [],
        'Entelamento + Vidro': [], 'Acabamento': [], 'Revisão': [], 'Embalagem': [],
        'Prontos para Envio': [], 'Despachados': [],
      }
      for (const stage of Object.keys(prev) as Stage[]) {
        localOnlyOrders[stage] = prev[stage].filter(o => !validDbIds.has(String(o.id)))
      }

      // Merge: DB data first, then append local-only orders that aren't in DB yet
      const merged: Record<Stage, Order[]> = { ...grouped }
      for (const stage of Object.keys(localOnlyOrders) as Stage[]) {
        if (localOnlyOrders[stage].length > 0) {
          merged[stage] = [...localOnlyOrders[stage], ...grouped[stage]]
        }
      }

      return merged
    })

    setDbConnected(true)
    setDbLoading(false)
  }, [])

  // ── Supabase: load pedidos on mount & subscribe to changes ──
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    setDbLoading(true)
    
    // Initial load
    fetchPedidos().then(processFetchedRows).catch(() => {
      // Fallback local storage
      const saved = localStorage.getItem('erp_board_backup')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setBoard({ ...INITIAL, ...parsed })
        } catch { /* ignore */ }
      }
      setDbLoading(false)
    })

    // Real-time subscription
    const sub = subscribePedidos(processFetchedRows)
    return () => sub.unsubscribe()
  }, [processFetchedRows])


  // Helper: get UUID for a display-id order
  const getDbId = (displayId: string) => dbIdMap.current.get(displayId)

  // ── Delete order ──
  const deleteOrder = useCallback(async (order: Order, stage: Stage) => {
    const label = order.fromMagazord ? `Magazord #${order.id}` : `Pedido #${order.id}`
    const msg = order.fromMagazord
      ? `Excluir ${label} do kanban? O pedido continuará na Magazord mas será removido desta visão.`
      : `Excluir o ${label} permanentemente? Esta ação não pode ser desfeita.`
    if (!window.confirm(msg)) return

    // Remove do board local
    setBoard(prev => {
      const updated = { ...prev }
      ;(Object.keys(updated) as Stage[]).forEach(s => {
        updated[s] = updated[s].filter(o => o.id !== order.id)
      })
      return updated
    })

    // Remove do Supabase (só pedidos que foram persistidos)
    const dbId = getDbId(order.id)
    if (dbId) {
      await deletePedido(dbId)
    }

    showToast(`${label} removido do painel`)
  }, [getDbId])

  // ── Magazord sync ──
  const syncMagazord = useCallback(async (silent = false) => {
    setSyncing(true)
    setSyncError(false)
    try {
      const orders = await fetchPendingOrders()
      const converted = orders.map(magazordToOrder)

      setBoard(prev => {
        const allExistingIds  = new Set(Object.values(prev).flat().map(o => o.id))
        // Deduplicação dupla: por id (codigo Mz.) e por magazordId (id numérico).
        // Isso evita race condition onde o syncMagazord termina ANTES do Supabase
        // carregar os pedidos já confirmados — sem essa segunda chave, o pedido
        // apareceria em "Novos Pedidos" E em outra etapa do kanban simultaneamente.
        const allMagazordIds  = new Set(
          Object.values(prev).flat()
            .map(o => o.magazordId)
            .filter((id): id is number => id != null)
        )
        const newOrders = converted.filter(o =>
          !allExistingIds.has(o.id) &&
          !(o.magazordId != null && allMagazordIds.has(o.magazordId))
        )
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

  // Auto-sync on mount — aguarda o Supabase terminar de carregar para que a
  // deduplicação por magazordId tenha os pedidos já confirmados disponíveis.
  // Isso elimina a race condition onde o board está vazio e o pedido passa pelo filtro.
  const dbLoadedRef = useRef(false)
  useEffect(() => {
    if (dbLoading) return // ainda carregando do Supabase, aguarda
    if (!dbLoadedRef.current) {
      // Primeira vez que dbLoading vira false → roda o sync inicial
      dbLoadedRef.current = true
      syncMagazord(true)
    }
    const interval = setInterval(() => syncMagazord(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [dbLoading, syncMagazord])

  // ── Background enrichment (imagem + NF) ──
  // Busca dados detalhados da Magazord para cards sem imagem OU sem número de NF
  useEffect(() => {
    const productionStages: KanbanStage[] = ['Impressão', 'Corte Moldura', 'Entelamento + Vidro', 'Acabamento', 'Revisão', 'Embalagem']
    const needsEnrich = productionStages
      .flatMap(s => board[s])
      .filter(o => o.fromMagazord && (!o.imagemUrl || !o.notaFiscal) && o.id)

    if (needsEnrich.length === 0) return

    // Enriquecer em série com delay para não sobrecarregar a API
    let cancelled = false
    ;(async () => {
      for (const order of needsEnrich) {
        if (cancelled) break
        try {
          const detail = await fetchOrderByCodigo(order.id)
          if (!detail || cancelled) continue
          const rich = magazordDetailedToOrder(detail)
          const imgUrl  = (rich as any).imagemUrl as string | undefined
          const imgItens = (rich as any).itens as Order['itens'] | undefined
          // Salva no cache persistente para as futuras atualizações do Supabase Realtime não apagarem
          const newCacheData = {
            imagemUrl:    imgUrl ?? enrichCache.current[order.id]?.imagemUrl,
            itens:        imgItens ?? enrichCache.current[order.id]?.itens,
            produto:      rich.produto && rich.produto !== order.produto ? rich.produto : undefined,
            prazoEntrega: rich.prazoEntrega ?? enrichCache.current[order.id]?.prazoEntrega,
            notaFiscal:   (rich as any).notaFiscal ?? enrichCache.current[order.id]?.notaFiscal,
          }
          // Limpa undefineds
          Object.keys(newCacheData).forEach(key => newCacheData[key as keyof typeof newCacheData] === undefined && delete newCacheData[key as keyof typeof newCacheData]);

          enrichCache.current[order.id] = { ...(enrichCache.current[order.id] || {}), ...newCacheData }
          localStorage.setItem('erp_enrich_cache', JSON.stringify(enrichCache.current))

          // Atualiza o card no board independente de qual etapa está
          setBoard(prev => {
            const updated = { ...prev }
            for (const stage of productionStages) {
              updated[stage] = prev[stage].map(o =>
                o.id === order.id
                  ? { ...o, ...newCacheData, produto: newCacheData.produto ?? o.produto }
                  : o
              )
            }
            return updated
          })
        } catch { /* silencia */ }
        // Pequena pausa entre requisições
        await new Promise(r => setTimeout(r, 300))
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    board['Impressão'].length,
    board['Corte Moldura'].length,
    board['Entelamento + Vidro'].length,
    board['Acabamento'].length,
    board['Revisão'].length,
    board['Embalagem'].length,
    lastSync, // re-run when Magazord syncs (every 5 min)
  ])

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
    
    // Supabase sync
    const dbId = getDbId(orderId)
    if (dbId) {
      movePedidoEtapa(dbId, to as string)
    }

    showToast(`Pedido #${dragging.order.id} movido para ${to}`)
    setDragging(null)
  }

  // ── Confirm Magazord order → Impressão ──
  const confirmToProducao = async (order: Order) => {
    if (order.magazordId) await updateOrderSituacao(order.magazordId, 5)

    // Buscar dados detalhados sempre — traz imagemUrl, itens, transportadora, frete reais
    let enriched: Partial<Order> = {}
    try {
      const detail = await fetchOrderByCodigo(order.id)
      if (detail) {
        const rich = magazordDetailedToOrder(detail)
        enriched = {
          transportadora: rich.transportadora ?? order.transportadora,
          frete:          (rich.frete != null && rich.frete > 0) ? rich.frete : order.frete,
          produto:        rich.produto ?? order.produto,
          tamanho:        rich.tamanho ?? order.tamanho,
          prazoEntrega:   rich.prazoEntrega ?? order.prazoEntrega,
          endereco:       rich.endereco ?? order.endereco,
          imagemUrl:      (rich as any).imagemUrl ?? order.imagemUrl,
          itens:          (rich as any).itens ?? order.itens,
          notaFiscal:     (rich as any).notaFiscal ?? order.notaFiscal,
        }
      }
    } catch { /* silencia erros de detalhe */ }

    const enrichedOrder: Order = { ...order, ...enriched, status: 'Pendente' as const, fromMagazord: true }

    setBoard(prev => ({
      ...prev,
      'Novos Pedidos': prev['Novos Pedidos'].filter(o => o.id !== order.id),
      'Impressão': prev['Impressão'].some(o => o.id === order.id)
        ? prev['Impressão']
        : [enrichedOrder, ...prev['Impressão']],
    }))

    // Supabase sync
    const dbId = getDbId(order.id)
    if (dbId) {
      updatePedido(dbId, { etapa: 'Impressão', frete: enriched.frete, transportadora: enriched.transportadora })
    } else if (isSupabaseConfigured()) {
      const created = await createPedido({
        numero:         order.id,
        magazord_id:    order.magazordId,
        cliente:        order.cliente,
        produto:        enrichedOrder.produto,
        moldura:        order.moldura,
        acabamento:     order.acabamento,
        canal:          order.canal,
        etapa:          'Impressão',
        status:         'Pendente',
        prazo_entrega:  enrichedOrder.prazoEntrega
          ? enrichedOrder.prazoEntrega.split('/').reverse().join('-')
          : undefined,
        valor:          order.valor,
        frete:          enrichedOrder.frete,
        obs:            order.obs,
        endereco:       enrichedOrder.endereco,
        transportadora: enrichedOrder.transportadora,
        from_magazord:  true,
      })
      if (created) dbIdMap.current.set(order.id, created.id)
    }
    showToast(`Pedido #${order.id} confirmado e enviado para Impressão!`)
  }

  const moveAllToNext = async (stage: KanbanStage) => {
    const orders = board[stage]
    if (!orders || orders.length === 0) return

    const stageIdx = ALL_STAGES.indexOf(stage)
    const nextStage = ALL_STAGES[stageIdx + 1]

    if (stage === 'Novos Pedidos') {
      for (const order of orders) {
        await confirmToProducao(order)
      }
      showToast(`✅ ${orders.length} pedidos enviados para Impressão!`)
      return
    }

    if (stage === 'Embalagem') {
      const updatedOrders = orders.map(order => {
        const trans = order.transportadora || CARRIER_NAMES[0]
        const vols = order.volumes || order.quantidade || 1
        
        const dbId = getDbId(order.id)
        if (dbId) updatePedido(dbId, { 
          etapa: 'Prontos para Envio', 
          status: 'OK',
          transportadora: trans,
          volumes: vols
        })
        if (order.magazordId) updateOrderSituacao(order.magazordId, 6)

        return { ...order, status: 'OK' as const, transportadora: trans, volumes: vols, dataDespacho: undefined }
      })

      setBoard(prev => {
        const existingIds = new Set(prev['Prontos para Envio'].map(o => o.id))
        const toAdd = updatedOrders.filter(o => !existingIds.has(o.id))
        return {
          ...prev,
          'Embalagem': [],
          'Prontos para Envio': [...toAdd, ...prev['Prontos para Envio']]
        }
      })
      showToast(`✅ ${orders.length} pedidos enviados para Prontos para Envio com transportadora e volumes padrão!`)
      return
    }

    if (stage === 'Revisão') {
      let lastRevisor = 'Aprovação Rápida'
      try {
        const saved = localStorage.getItem('erp_reviewers')
        if (saved) {
          const arr = JSON.parse(saved)
          if (arr.length > 0) lastRevisor = arr[0]
        }
      } catch {}

      const updatedOrders = orders.map(order => {
        const dbId = getDbId(order.id)
        const newObs = [order.obs, `[REVISÃO APROVADA DIRETO] Revisor: ${lastRevisor}`].filter(Boolean).join('\n---\n')
        if (dbId) {
          updatePedido(dbId, {
            etapa: 'Embalagem',
            status: 'OK',
            obs: newObs
          })
        }
        return { ...order, status: 'OK' as const, revisaoStatus: 'aprovado' as const, revisaoRevisor: lastRevisor, obs: newObs }
      })

      setBoard(prev => {
        const existingIds = new Set(prev['Embalagem'].map(o => o.id))
        const toAdd = updatedOrders.filter(o => !existingIds.has(o.id))
        return {
          ...prev,
          'Revisão': [],
          'Embalagem': [...toAdd, ...prev['Embalagem']]
        }
      })
      showToast(`✅ ${orders.length} pedidos aprovados diretamente!`)
      return
    }

    if (!nextStage) return

    setBoard(prev => {
      const existingIds = new Set(prev[nextStage as keyof typeof prev].map(o => o.id))
      const toAdd = orders.filter(o => !existingIds.has(o.id)).map(o => ({ ...o, status: 'OK' as const }))
      return {
        ...prev,
        [stage]: [],
        [nextStage as keyof typeof prev]: [...toAdd, ...prev[nextStage as keyof typeof prev]]
      }
    })

    const dbIds = orders.map(order => getDbId(order.id)).filter(Boolean) as string[]
    if (dbIds.length > 0) movePedidosEtapa(dbIds, nextStage as Stage)

    showToast(`✅ ${orders.length} pedidos movidos para ${nextStage}!`)
  }

  const handleDirectApprove = (order: Order) => {
    let lastRevisor = 'Aprovação Rápida'
    try {
      const saved = localStorage.getItem('erp_reviewers')
      if (saved) {
        const arr = JSON.parse(saved)
        if (arr.length > 0) lastRevisor = arr[0]
      }
    } catch {}

    setBoard(prev => ({
      ...prev,
      'Revisão': prev['Revisão'].filter(o => o.id !== order.id),
      'Embalagem': [...prev['Embalagem'], { ...order, status: 'OK' as const, revisaoStatus: 'aprovado' as const, revisaoRevisor: lastRevisor }],
    }))
    const dbId = getDbId(order.id)
    const newObs = [order.obs, `[REVISÃO APROVADA DIRETO] Revisor: ${lastRevisor}`].filter(Boolean).join('\n---\n')
    if (dbId) {
      updatePedido(dbId, {
        etapa: 'Embalagem',
        status: 'OK',
        obs: newObs
      })
    }
    showToast(`✅ Pedido #${order.id} aprovado diretamente!`)
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
      [next]:  [...prev[next], { ...order, status: 'OK' as const }],
    }))
    // Supabase sync
    const dbId = getDbId(id)
    if (dbId) movePedidoEtapa(dbId, next as string)
    showToast(`Pedido #${id} avançou para ${next}`)
  }

  // ── Move direto para qualquer etapa (via seletor no modal de detalhes) ──
  const moveToStage = useCallback(async (order: Order, fromStage: Stage, toStage: Stage) => {
    // Se o destino é Novos Pedidos e o pedido é Magazord, usa o fluxo de confirmação
    if (toStage === 'Novos Pedidos' && !order.fromMagazord) {
      setBoard(prev => ({
        ...prev,
        [fromStage]: prev[fromStage].filter(o => o.id !== order.id),
        'Novos Pedidos': [{ ...order, status: 'Pendente' as const }, ...prev['Novos Pedidos']],
      }))
      const dbId = getDbId(order.id)
      if (dbId) movePedidoEtapa(dbId, 'Novos Pedidos')
      showToast(`Pedido #${order.id} retornou para Novos Pedidos`)
      return
    }

    setBoard(prev => ({
      ...prev,
      [fromStage]: prev[fromStage].filter(o => o.id !== order.id),
      [toStage]: [{ ...order, status: 'Pendente' as const }, ...prev[toStage]],
    }))

    const dbId = getDbId(order.id)
    if (dbId) {
      movePedidoEtapa(dbId, toStage as string)
    } else if (isSupabaseConfigured() && order.fromMagazord) {
      // Pedido Magazord ainda não persistido — cria no banco com a etapa destino
      const created = await createPedido({
        numero:         order.id,
        magazord_id:    order.magazordId,
        cliente:        order.cliente,
        produto:        order.produto,
        moldura:        order.moldura,
        acabamento:     order.acabamento,
        canal:          order.canal,
        etapa:          toStage,
        status:         'Pendente',
        prazo_entrega:  order.prazoEntrega
          ? order.prazoEntrega.split('/').reverse().join('-')
          : undefined,
        valor:          order.valor,
        frete:          order.frete,
        obs:            order.obs,
        endereco:       order.endereco,
        transportadora: order.transportadora,
        from_magazord:  true,
      })
      if (created) dbIdMap.current.set(order.id, created.id)
    }
    showToast(`Pedido #${order.id} movido para ${toStage}`)
  }, [getDbId, dbIdMap])

  // ── Importação histórica completa do Magazord → Supabase ──────────────────
  const importarHistorico = useCallback(async () => {
    if (importing) return
    setImporting(true)
    setImportResult(null)
    setImportProgress({ fetched: 0, total: null, page: 1 })

    try {
      const orders = await fetchAllMagazordOrders(prog => setImportProgress(prog))

      const payload = orders.map(o => ({
        numero:          o.numero,
        magazord_id:     o.magazordId,
        cliente:         o.cliente,
        produto:         o.produto,
        canal:           o.canal,
        etapa:           o.etapa,
        status:          'Pendente' as const,
        prazo_entrega:   o.prazoEntrega,
        valor:           o.valor,
        frete:           o.frete,
        obs:             o.obs,
        endereco:        o.endereco,
        transportadora:  o.transportadora,
        from_magazord:   true,
        arquivado:       o.arquivado,
        store_id:        'casa-linda',
      }))

      const result = await upsertPedidosMagazord(payload)
      setImportResult(result)
      showToast(`Importação concluída: ${result.inseridos} pedidos salvos!`)

      // Recarrega o kanban para refletir novos pedidos não-arquivados
      fetchPedidos().then(processFetchedRows)
    } catch (err) {
      console.error('[Production] importarHistorico falhou:', err)
      showToast('Erro durante a importação histórica.')
    } finally {
      setImporting(false)
    }
  }, [importing, processFetchedRows])

  // Persist board to local storage on every update as a safe fallback
  useEffect(() => {
    localStorage.setItem('erp_board_backup', JSON.stringify(board))
  }, [board])

  const markReady = (order: Order, endereco: string, transportadora: string, prazoEntrega: string, volumes: number) => {
    const prazoFmt = prazoEntrega
      ? new Date(prazoEntrega).toLocaleDateString('pt-BR')
      : order.prazoEntrega
    setBoard(prev => ({
      ...prev,
      'Embalagem': prev['Embalagem'].filter(o => o.id !== order.id),
      'Prontos para Envio': [{ ...order, status: 'OK' as const, endereco, transportadora, prazoEntrega: prazoFmt, volumes }, ...prev['Prontos para Envio']],
    }))
    // Supabase sync
    const dbId = getDbId(order.id)
    if (dbId) updatePedido(dbId, { etapa: 'Prontos para Envio', endereco, transportadora,
      prazo_entrega: prazoEntrega || undefined, volumes })
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
        'Embalagem': [...prev['Embalagem'], { ...order, status: 'OK' as const, revisaoStatus: 'aprovado' as const, revisaoRevisor: revisor }],
      }))
      const dbId = getDbId(order.id)
      if (dbId) updatePedido(dbId, {
        etapa: 'Embalagem',
        obs: [order.obs, `[REVISÃO APROVADA] Revisor: ${revisor}`].filter(Boolean).join('\n---\n'),
      })
      showToast(`✅ Pedido #${order.id} aprovado na revisão!`)
    } else {
      const destino = extra?.etapaRetorno ?? 'Impressão'
      const areas   = extra?.areas ?? []
      const motivo  = extra?.motivo ?? ''
      const fotoUrl = extra?.fotoUrl

      setBoard(prev => ({
        ...prev,
        'Revisão': prev['Revisão'].filter(o => o.id !== order.id),
        [destino]: [...prev[destino], {
          ...order,
          status: 'Pendente' as const,
          revisaoStatus: 'reprovado' as const,
          revisaoRevisor: revisor,
          revisaoMotivo:  motivo,
          revisaoAreas:   areas,
          revisaoFotoUrl: fotoUrl,
        }],
      }))

      const dbId = getDbId(order.id)
      if (dbId) {
        // Persiste texto de revisão no campo obs (sem foto — base64 é muito grande para texto SQL)
        const obsRevisao = [
          order.obs,
          `[REPROVADO] Revisor: ${revisor}`,
          areas.length > 0 ? `Áreas: ${areas.join(', ')}` : null,
          motivo ? `Motivo: ${motivo}` : null,
        ].filter(Boolean).join('\n')
        updatePedido(dbId, { etapa: destino, status: 'Pendente', obs: obsRevisao })
      }

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
      'Despachados': [{ ...order, transportadora, rastreio, dataDespacho: now, status: 'OK' as const }, ...prev['Despachados']],
    }))
    setDispatchModal(null)
    if (order.magazordId) updateOrderSituacao(order.magazordId, 7, { codigoRastreio: rastreio, transportadora })
    // Supabase sync
    const dbId = getDbId(order.id)
    if (dbId) despacharPedido(dbId, transportadora, rastreio)
    showToast(`Pedido #${order.id} despachado com sucesso!`)
  }
  const dispatchAll = async (carrier: string, carrierOrders: Order[]) => {
    if (!window.confirm(`Tem certeza que deseja despachar todos os ${carrierOrders.length} pedidos da transportadora "${carrier}"?`)) return
    
    const now = new Date().toLocaleDateString('pt-BR') + ' às ' +
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    const ids = new Set(carrierOrders.map(o => o.id))
    const dispatched = carrierOrders.map(o => ({
      ...o,
      transportadora: carrier,
      dataDespacho: now,
      status: 'OK' as const,
      rastreio: o.rastreio || ''
    }))

    setBoard(prev => ({
      ...prev,
      'Prontos para Envio': prev['Prontos para Envio'].filter(o => !ids.has(o.id)),
      'Despachados': [...dispatched, ...prev['Despachados']],
    }))

    carrierOrders.forEach(order => {
      const rastreio = order.rastreio || ''
      if (order.magazordId) updateOrderSituacao(order.magazordId, 7, { codigoRastreio: rastreio, transportadora: carrier })
      const dbId = getDbId(order.id)
      if (dbId) despacharPedido(dbId, carrier, rastreio)
    })

    showToast(`${carrierOrders.length} pedidos de ${carrier} despachados!`)
  }

  const undoDispatch = (order: Order) => {
    setBoard(prev => ({
      ...prev,
      'Despachados': prev['Despachados'].filter(o => o.id !== order.id),
      'Prontos para Envio': [{ ...order, dataDespacho: undefined, status: 'OK' as const }, ...prev['Prontos para Envio']],
    }))
    if (order.magazordId) updateOrderSituacao(order.magazordId, 6)
    const dbId = getDbId(order.id)
    if (dbId) movePedidoEtapa(dbId, 'Prontos para Envio')
    showToast(`Pedido #${order.id} revertido para Prontos para Envio`)
  }

  const changeCarrier = async (orderId: string, newCarrier: string, stage: Stage) => {
    const dbId = getDbId(orderId)
    if (dbId) {
      await updatePedido(dbId, { transportadora: newCarrier })
    }
    setBoard(prev => {
      const updated = prev[stage].map(o => o.id === orderId ? { ...o, transportadora: newCarrier } : o)
      return { ...prev, [stage]: updated }
    })
    showToast(`Transportadora alterada para ${newCarrier}`)
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
        tamanho:       order.tamanho,
        categoria:     order.formato, // guardando o "formato" (1 Tela, 3 Telas)
        quantidade:    order.quantidade,
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
      
      // Efetua a baixa real e automática no almoxarifado DB
      await deductInventoryForProduction(
        order.id,
        profile?.nome || profile?.email || 'Sistema',
        order.tamanho || null,
        order.moldura || null,
        order.acabamento || null,
        order.quantidade || 1
      )
    }

    // ── Persistir itens individuais no enrichCache (localStorage) ──────────────
    // O Supabase não armazena o array de itens individuais. Para que os quadros
    // separados sejam restaurados após reload, salvamos os itens no enrichCache
    // (localStorage), que é injetado de volta ao construir o board via processFetchedRows.
    if ((order.itens && order.itens.length > 0) || order.imagemUrl) {
      const cacheEntry: Record<string, any> = {}
      if (order.itens && order.itens.length > 0) cacheEntry.itens = order.itens
      if (order.imagemUrl) cacheEntry.imagemUrl = order.imagemUrl
      enrichCache.current[order.id] = { ...(enrichCache.current[order.id] || {}), ...cacheEntry }
      localStorage.setItem('erp_enrich_cache', JSON.stringify(enrichCache.current))
    }

    showToast(`Pedido #${order.id} adicionado ao Kanban!`)
  }

  const filterOrders = (orders: Order[]) => {
    if (filter === 'atrasado') return orders.filter(o => o.status === 'Atrasado')
    if (filter === 'pendente') return orders.filter(o => o.status === 'Pendente')
    return orders
  }

  const { profile } = useAuth()

  // Permissão especial: só 'impressao' e 'admin' avançam pedidos da etapa Impressão
  const canConcludeImpressao = profile?.role === 'impressao' || profile?.role === 'admin'
  const isAdmin = profile?.role === 'admin'

  const novosCount  = board['Novos Pedidos'].length
  const totalKanban = KANBAN_STAGES.flatMap(s => board[s]).length
  const totalProntos = board['Prontos para Envio'].length
  const totalDespach = board['Despachados'].length

  return (
    <div className="p-4 md:p-6 flex flex-col h-full bg-gray-50/50" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {/* Header Compacto Mobile */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4 mb-3 md:mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">Produção PCP</h1>
            <p className="text-[11px] md:text-sm text-gray-500 mt-0.5 leading-tight">
              {view === 'kanban'
                ? `Kanban — ${totalKanban} em produção`
                : `Expedição — ${totalProntos} prontos`}
            </p>
          </div>
        </div>
        
        {/* Controles de Interface */}
        <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:justify-end md:overflow-visible">
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
          <div className="flex shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-white">
            <button onClick={() => setView('kanban')} className={`px-2 md:px-3 py-1.5 text-[11px] md:text-xs font-medium transition-colors flex items-center gap-1.5 ${view === 'kanban' ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <ClipboardList size={13} className="hidden sm:inline-block" /> Produção
            </button>
            <button onClick={() => setView('delivery')} className={`px-2 md:px-3 py-1.5 text-[11px] md:text-xs font-medium transition-colors flex items-center gap-1.5 relative ${view === 'delivery' ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Truck size={13} className="hidden sm:inline-block" /> Expedição
              {totalProntos > 0 && (
                <span className={`ml-0.5 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full text-[8.5px] md:text-[9px] font-bold flex items-center justify-center ${view === 'delivery' ? 'bg-yellow-400 text-gray-900' : 'bg-yellow-500 text-white'}`}>
                  {totalProntos}
                </span>
              )}
            </button>
          </div>

          {view === 'kanban' && (
            <div className="flex shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-white">
              {([['todos', 'Todos'], ['atrasado', 'Atrasado'], ['pendente', 'Pendente']] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`px-2 md:px-3 py-1.5 text-[11px] md:text-xs font-medium transition-colors ${filter === v ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {isAdmin && (
            <button
              onClick={importarHistorico}
              disabled={importing}
              title="Importar todo o histórico do Magazord para o banco (ação admin)"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
            >
              <Database size={13} className={importing ? 'animate-spin' : ''} />
              {importing ? 'Importando…' : 'Importar Histórico'}
            </button>
          )}

          <button onClick={() => setNewModal(true)} className="hidden md:inline-flex btn-primary shrink-0"><Plus size={15} /> Novo Pedido</button>
        </div>
      </div>

      {/* ── KANBAN VIEW ── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {KANBAN_STAGES.map(stage => {
            const isNewOrders = stage === 'Novos Pedidos'
            const orders = isNewOrders ? board[stage] : filterOrders(board[stage])

            return (
              <div
                key={stage}
                className={`flex-shrink-0 w-80 md:w-64 max-w-[85vw] snap-center md:snap-align-none rounded-xl flex flex-col transition-all border shadow-sm ${
                  isNewOrders
                    ? 'bg-violet-50/80 border-violet-200'
                    : `bg-gray-100/80 border-gray-200 ${dragging && dragging.from !== stage ? 'ring-2 ring-blue-200 ring-offset-1' : ''}`
                }`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(stage, e)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100/50">
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
                {/* Send all button */}
                {orders.length > 0 && (
                  <div className="px-3 pb-2 pt-2">
                    <button
                      onClick={() => moveAllToNext(stage)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-gray-200/50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold uppercase transition-colors"
                      title={`Mover todos para a próxima etapa`}
                    >
                      <ArrowRight size={12} />
                      Mover todos
                    </button>
                  </div>
                )}

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
                          onDelete={() => deleteOrder(order, stage)}
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
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${order.fromMagazord ? 'bg-violet-600' : 'bg-navy-900'}`}>
                              #{order.id}
                              {order.fromMagazord && <span className="ml-1 text-[9px] opacity-80">MG</span>}
                            </span>
                            {order.notaFiscal ? (
                              <span className="inline-flex items-center gap-0.5 bg-amber-50 border border-amber-300 text-amber-700 rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                                <ClipboardList size={9} /> NF {order.notaFiscal}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 bg-gray-50 border border-gray-200 text-gray-500 rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                                <ClipboardList size={9} /> Sem NF
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            {order.status === 'Atrasado'
                              ? <span className="badge badge-critico flex items-center gap-1"><AlertTriangle size={9} />Atrasado</span>
                              : order.prazoEntrega
                              ? <PrazoTag prazo={order.prazoEntrega} />
                              : order.data
                              ? <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{order.data} {order.hora}</span>
                              : null}
                            {order.canal && (
                              <span className="text-[10px] text-violet-600 font-medium">{CANAL_ICON[order.canal]} {order.canal}</span>
                            )}
                          </div>

                          <p className="text-sm font-semibold text-gray-800 leading-tight">{order.cliente}</p>
                          <p className="text-xs text-gray-500 mt-0.5 mb-1">{order.produto}</p>
                          {(order.quantidade ?? 1) > 1 && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-2">
                              🖼️ {order.quantidade} quadros
                            </span>
                          )}

                          {/* ── Miniaturas das imagens ── */}
                          {(() => {
                            // Coleta todas as imagens disponíveis: itens primeiro, fallback no pedido
                            const imgs: string[] = []
                            if (order.itens && order.itens.length > 0) {
                              order.itens.forEach(it => { if (it.imagemUrl) imgs.push(it.imagemUrl) })
                            }
                            if (imgs.length === 0 && order.imagemUrl) imgs.push(order.imagemUrl)
                            if (imgs.length === 0) return null
                            const visible = imgs.slice(0, 4)
                            const extra   = imgs.length - visible.length
                            return (
                              <div className="flex gap-1 mb-2">
                                {visible.map((src, i) => (
                                  <div key={i} className="w-11 h-11 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-50">
                                    <img src={src} alt={`item ${i + 1}`} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                                {extra > 0 && (
                                  <div className="w-11 h-11 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-gray-500">+{extra}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {order.moldura && <span className="badge badge-gray text-[10px] mb-1">{order.moldura}</span>}
                          {order.material && !order.moldura && <span className="badge badge-gray text-[10px] mb-2">{order.material}</span>}

                          {/* Badge acervo: quadro disponível no salão */}
                          {(() => {
                            const acervoMatch = acervoQuadros.find(q => matchesPCP(order.produto, q.produto))
                            if (!acervoMatch) return null
                            return (
                              <div className="mb-2 flex flex-col gap-0.5 bg-emerald-500 text-white rounded-lg px-2.5 py-1.5 shadow-sm">
                                <div className="flex items-center gap-1.5">
                                  <Frame size={11} className="shrink-0" />
                                  <span className="text-[11px] font-black tracking-wide">QUADRO NO SALÃO</span>
                                </div>
                                <span className="text-[10px] font-medium opacity-90 leading-tight line-clamp-2 pl-0.5">{acervoMatch.produto}</span>
                              </div>
                            )
                          })()}
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
                            {/* Botão de concluir — Impressão exige role impressao ou admin */}
                            {stage === 'Impressão' && !canConcludeImpressao ? (
                              <div
                                className="flex-1 flex items-center justify-center gap-1.5 text-gray-400 text-xs font-semibold py-1.5 rounded-lg bg-gray-100 border border-gray-200 cursor-not-allowed select-none"
                                title="Somente o operador de Impressão ou Admin pode concluir esta etapa"
                              >
                                🔒 Restrito
                              </div>
                            ) : stage === 'Revisão' ? (
                              <div className="flex w-full gap-1 flex-1">
                                <button
                                  onClick={() => conclude(stage, order.id)}
                                  className="flex-1 flex items-center justify-center gap-1 text-white text-[10px] font-semibold py-1.5 rounded-lg transition-colors bg-rose-600 hover:bg-rose-700"
                                  title="Iniciar Revisão (Abre modal)"
                                >
                                  <CheckCircle size={11} /> Revisar
                                </button>
                                <button
                                  onClick={() => handleDirectApprove(order)}
                                  className="flex-1 flex items-center justify-center gap-1 text-white text-[10px] font-semibold py-1.5 rounded-lg transition-colors bg-emerald-500 hover:bg-emerald-600"
                                  title="Aprovar Diretamente"
                                >
                                  <Check size={11} /> Aprovar Direto
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => conclude(stage, order.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors`}
                                style={
                                  stage === 'Embalagem' ? { background: '#d97706' } :
                                  stage === 'Impressão' ? { background: '#2563eb' } :
                                  { background: '#1e3a8a' }
                                }
                              >
                                {stage === 'Embalagem'
                                  ? <><ClipboardList size={13} /> Pronto p/ Envio</>
                                  : <><CheckCircle size={13} /> OK / CONCLUÍDO</>}
                              </button>
                            )}
                            {stage === 'Embalagem' && (
                              <button onClick={() => showToast('Upload de comprovante — funcionalidade em breve')} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-navy-900 transition-colors" title="Upload comprovante">
                                <Upload size={13} />
                              </button>
                            )}
                            <button onClick={() => setDetail({ order, stage })} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-navy-900 transition-colors" title="Ver detalhes">
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => deleteOrder(order, stage)}
                              className="p-1.5 border border-red-100 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                              title="Excluir pedido"
                            >
                              <Trash2 size={13} />
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

              <div className="flex-1 px-3 pb-3 overflow-y-auto">
                {board[stage].length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-gray-400 text-xs border-2 border-dashed rounded-xl mt-2"
                    style={{ borderColor: stage === 'Prontos para Envio' ? '#fde68a' : '#6ee7b7' }}>
                    {stage === 'Prontos para Envio'
                      ? <><ClipboardList size={20} className="text-yellow-300 mb-2" />Nenhum pedido pronto ainda</>
                      : <><Truck size={20} className="text-emerald-200 mb-2" />Nenhum pedido despachado</>}
                  </div>
                ) : (() => {
                  // Agrupar por transportadora
                  const groups: Record<string, Order[]> = {}
                  for (const order of board[stage]) {
                    const key = order.transportadora?.trim() || 'Sem transportadora'
                    if (!groups[key]) groups[key] = []
                    groups[key].push(order)
                  }
                  // Ordenar: transportadoras com mais pedidos primeiro, "Sem transportadora" por último
                  const sorted = Object.entries(groups).sort(([a, ao], [b, bo]) => {
                    if (a === 'Sem transportadora') return 1
                    if (b === 'Sem transportadora') return -1
                    return bo.length - ao.length
                  })
                  return sorted.map(([carrier, orders]) => {
                    const critical = orders.filter(o => (daysUntil(o.prazoEntrega) ?? 99) <= 1).length
                    return (
                      <CarrierAccordion
                        key={carrier}
                        carrier={carrier}
                        orders={orders}
                        stage={stage}
                        critical={critical}
                        setDragging={setDragging}
                        setDetail={setDetail}
                        setDispatchModal={setDispatchModal}
                        undoDispatch={undoDispatch}
                        dispatchAll={dispatchAll}
                        onChangeCarrier={changeCarrier}
                      />
                    )
                  })
                })()}
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

      {/* FABs */}
      {/* Search FAB */}
      <motion.button
        onClick={() => setSearchModal(true)}
        className="fixed bottom-6 right-24 z-20 flex items-center gap-2 bg-white border-2 border-blue-200 text-blue-700 font-semibold text-sm px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all"
        title="Buscar Pedido"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        <Search size={17} />
        <span className="hidden sm:inline">Buscar Pedido</span>
      </motion.button>

      {/* New Order FAB */}
      <motion.button
        onClick={() => setNewModal(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-navy-900 hover:bg-blue-900 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-20"
        title="Novo Pedido"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus size={22} />
      </motion.button>

      <AnimatePresence>
        {/* Modal de progresso da importação histórica */}
        {importing && importProgress && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <motion.div
              className="modal"
              style={{ maxWidth: 400 }}
              initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Database size={22} className="text-blue-600 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Importando Histórico do Magazord</h3>
                <p className="text-sm text-gray-500 mb-4">Não feche esta janela. Buscando pedidos da API…</p>

                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: importProgress.total
                        ? `${Math.min(100, (importProgress.fetched / importProgress.total) * 100)}%`
                        : '60%'
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {importProgress.fetched} pedidos lidos
                  {importProgress.total ? ` de ~${importProgress.total}` : ''} · Pág. {importProgress.page}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal de resultado da importação */}
        {!importing && importResult && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => setImportResult(null)}
          >
            <motion.div
              className="modal"
              style={{ maxWidth: 380 }}
              initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={22} className="text-green-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Importação Concluída!</h3>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold text-gray-900">{importResult.inseridos}</span> pedidos salvos no banco
                </p>
                {importResult.erros > 0 && (
                  <p className="text-xs text-red-500">{importResult.erros} com erro</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  O kanban foi atualizado. Pedidos entregues ficam no Histórico.
                </p>
                <button
                  onClick={() => setImportResult(null)}
                  className="mt-4 btn-primary w-full justify-center"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {searchModal && (
          <SearchModal
            board={board}
            onClose={() => setSearchModal(false)}
            onView={(order, stage) => { setDetail({ order, stage }); setSearchModal(false) }}
          />
        )}
        {newModal && <NewOrderModal onClose={() => setNewModal(false)} onSave={addOrder} />}
        {detail && (
          <DetailModal
            order={detail.order}
            stage={detail.stage}
            onClose={() => setDetail(null)}
            onConclude={() => conclude(detail.stage, detail.order.id)}
            onDelete={() => { deleteOrder(detail.order, detail.stage); setDetail(null) }}
            onMoveTo={(targetStage) => moveToStage(detail.order, detail.stage, targetStage)}
          />
        )}
        {readyModal && (
          <ReadyModal
            order={readyModal}
            onClose={() => setReadyModal(null)}
            onConfirm={(end, tr, prazo, vol) => markReady(readyModal, end, tr, prazo, vol)}
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
