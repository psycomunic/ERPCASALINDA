/**
 * ProductionLV.tsx — Lar e Vida
 * Fluxo de produção/cross-docking idêntico ao da Casa Linda.
 * Etapas adaptadas para tapetes, cortinas e produtos de decoração via fornecedor.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Clock, CheckCircle, Eye, X, Check, User, Package,
  AlertTriangle, Truck, MapPin, Calendar, Send, ClipboardList,
  RefreshCw, ArrowRight, ChevronDown, Sofa, Upload, Trash2,
  Image as ImageIcon, Printer
} from 'lucide-react'
import { CARRIERS_BY_TYPE } from '../../carriers'
import {
  fetchPedidosLV, createPedidoLV, updatePedidoLV, deletePedidoLV,
  despacharPedidoLV, movePedidoLVEtapa, movePedidosLVEtapa,
  uploadFotoLV, uploadConfirmacaoFornecedor,
  marcarEntradaEstoque, marcarDisponivelSite,
  fetchHistoricoLV, logHistoricoLV, subscribePedidosLV
} from '../../services/pedidosLV'
import type { HistoricoEntry } from '../../services/pedidosLV'
import { fetchFornecedorEstoque, compareEstoque } from '../../services/fornecedorLV'
import type { TapeteFornecedor, FornecedorDiff } from '../../services/fornecedorLV'
import {
  fetchPendingOrdersLV, isMagazordLVConfigured, lvSituacaoToKanbanCol,
} from '../../magazordLV'
import type { MagazordOrder } from '../../magazordLV'
import {
  colecoesDaLinha, tamanhosDaColecao, findPreco, findColecao,
} from '../../data/precosTapetesLV'
import type { PrecoTamanho } from '../../data/precosTapetesLV'
import {
  MODELOS_CAMA, findModelo, findVariante,
} from '../../data/camasLV'
import type { DisponibilidadeTamanho } from '../../data/camasLV'
import {
  findCodigoCama, findCodigoTapete, desenhosConhecidosTapete,
  findPrecoCustoCama,
} from '../../data/codigosTellaio'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LVOrder {
  id: string
  cliente: string
  clienteEmail?: string
  clienteTelefone?: string
  produto: string
  sku?: string
  fotoUrl?: string
  nomeFornecedor?: string
  codigoFornecedor?: string
  categoria?: string
  tamanho?: string
  cor?: string
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
  tipoPedido?: 'producao' | 'crossdocking' | 'estoque'
  itensCama?: Array<{ sku: string; descricao: string; qtd: number; valor?: number }>
  conferenciaItens?: Array<{ sku: string; conferido: boolean; qtdConferida: number; obs?: string }>
  imagensDesenho?: Record<string, string>
  desenho?: string
  // ── Campos de Estoque ────────────────────────────────────
  confirmacaoFornecedorUrl?: string
  localizacaoPrateleira?: string
  dataEntradaEstoque?: string
  disponivelSite?: boolean
  dataPublicacaoSite?: string
}

type KanbanStage = 'Novos Pedidos' | 'Pedido ao Fornecedor' | 'Aguardando Chegada' | 'Recebido' | 'Embalagem'
type DeliveryStage = 'Pronto para Envio' | 'Despachados'
type EstoqueStage = 'Em Prateleira' | 'Disponível no Site'
type Stage = KanbanStage | DeliveryStage | EstoqueStage

const KANBAN_STAGES: KanbanStage[] = ['Novos Pedidos', 'Pedido ao Fornecedor', 'Aguardando Chegada', 'Recebido', 'Embalagem']
const ESTOQUE_FLOW: Stage[] = ['Novos Pedidos', 'Pedido ao Fornecedor', 'Aguardando Chegada', 'Recebido', 'Em Prateleira', 'Disponível no Site']
const ALL_STAGES: Stage[] = [...KANBAN_STAGES, 'Pronto para Envio', 'Despachados', 'Em Prateleira', 'Disponível no Site']

const CATEGORIAS_LV = ['Tapete', 'Cortina', 'Almofada', 'Quadro', 'Cama', 'Outros']
const CANAIS = ['Site', 'Mercado Livre', 'Shopee', 'Amazon', 'Magazine Luiza', 'WhatsApp', 'Balcão']

// Fornecedores fixos por categoria (crossdocking)
const FORNECEDOR_SUGERIDO: Record<string, string> = {
  Cama: 'TELLAIO',
}

const STAGE_DOT: Record<Stage, string> = {
  'Novos Pedidos':        'bg-amber-500',
  'Pedido ao Fornecedor': 'bg-blue-500',
  'Aguardando Chegada':   'bg-purple-500',
  'Recebido':             'bg-teal-500',
  'Embalagem':            'bg-gray-500',
  'Pronto para Envio':    'bg-yellow-500',
  'Despachados':          'bg-emerald-500',
  'Em Prateleira':        'bg-cyan-500',
  'Disponível no Site':   'bg-green-500',
}

const STAGE_BG: Partial<Record<Stage, string>> = {
  'Novos Pedidos':      'bg-amber-50 border border-amber-200',
  'Pronto para Envio':  'bg-yellow-50 border border-yellow-200',
  'Despachados':        'bg-emerald-50 border border-emerald-200',
  'Em Prateleira':      'bg-cyan-50 border border-cyan-200',
  'Disponível no Site': 'bg-green-50 border border-green-200',
}

const CANAL_ICON: Record<string, string> = {
  'Site': '🌐', 'Mercado Livre': '🛒', 'Shopee': '🟠', 'Amazon': '📦',
  'Magazine Luiza': '🔵', 'WhatsApp': '💬', 'Balcão': '🏪',
}

const STAGE_ICON: Record<Stage, string> = {
  'Novos Pedidos':        '🛒',
  'Pedido ao Fornecedor': '📋',
  'Aguardando Chegada':   '🕐',
  'Recebido':             '📥',
  'Embalagem':            '📦',
  'Pronto para Envio':    '📦',
  'Despachados':          '🚚',
  'Em Prateleira':        '🗄️',
  'Disponível no Site':   '🌐',
}

const INITIAL: Record<Stage, LVOrder[]> = Object.fromEntries(ALL_STAGES.map(s => [s, []])) as unknown as Record<Stage, LVOrder[]>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(prazo?: string): number | null {
  if (!prazo) return null
  const [d, m, y] = prazo.split('/').map(Number)
  if (!d || !m || !y) return null
  const diff = new Date(y, m - 1, d).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / 86_400_000)
}

function calcStatus(prazo?: string | null): 'Pendente' | 'Atrasado' | 'OK' {
  const d = daysUntil(prazo ?? undefined)
  if (d === null) return 'Pendente'
  return d < 0 ? 'Atrasado' : 'OK'
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

// ─── Photo Zone ───────────────────────────────────────────────────────────────

function PhotoZone({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const zoneRef  = useRef<HTMLDivElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview]     = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleFileUpload = useCallback(async (file: File | Blob) => {
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setUploading(true)
    const url = await uploadFotoLV(file)
    setUploading(false)
    if (url) { setPreview(''); onChange(url) }
    else {
      const r2 = new FileReader()
      r2.onload = e2 => { onChange(e2.target?.result as string); setPreview('') }
      r2.readAsDataURL(file)
    }
  }, [onChange])

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) { const f = item.getAsFile(); if (f) { handleFileUpload(f); return } }
    }
    const text = e.clipboardData?.getData('text')
    if (text && (text.startsWith('http') || text.startsWith('data:'))) onChange(text)
  }, [handleFileUpload, onChange])

  useEffect(() => {
    const el = zoneRef.current; if (!el) return
    el.addEventListener('paste', handlePaste as any)
    return () => el.removeEventListener('paste', handlePaste as any)
  }, [handlePaste])

  const displaySrc = preview || value

  return (
    <>
      <div ref={zoneRef} className="relative" tabIndex={0}>
        {displaySrc ? (
          <div className="relative rounded-xl overflow-hidden border-2 border-amber-300">
            <img src={displaySrc} alt="Produto" className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setIsFullscreen(true)} />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 pointer-events-none">
                <RefreshCw size={22} className="animate-spin text-white" />
                <p className="text-white text-xs font-semibold">Enviando foto...</p>
              </div>
            )}
            {!uploading && (
              <button onClick={(e) => { e.stopPropagation(); onChange(''); setPreview('') }} className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow hover:bg-red-50 transition-colors z-10">
                <X size={14} className="text-red-500" />
              </button>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent py-2 px-3 pointer-events-none">
              <p className="text-white text-[10px] font-semibold">{uploading ? 'Enviando para o servidor...' : 'Foto salva ✓ (Clique para ampliar)'}</p>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full h-32 rounded-xl border-2 border-dashed border-amber-300 flex flex-col items-center justify-center gap-2 text-amber-600 hover:bg-amber-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <span className="text-2xl">📷</span>
            <div className="text-center">
              <p className="text-xs font-semibold">Cole (Ctrl+V) ou clique para selecionar</p>
              <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG — sobe automaticamente</p>
            </div>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
        />
      </div>
      <AnimatePresence>
        {isFullscreen && displaySrc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <button onClick={() => setIsFullscreen(false)} className="absolute top-6 right-6 p-2 text-white bg-black/50 rounded-full hover:bg-white hover:text-black transition-colors">
              <X size={24} />
            </button>
            <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              src={displaySrc} alt="Produto" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain cursor-default"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Confirmação do Fornecedor ────────────────────────────────────────────────

function ConfirmacaoZone({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const isPdf = value.toLowerCase().includes('.pdf') || value.toLowerCase().includes('pdf')

  const handleFile = async (file: File) => {
    setUploading(true)
    const url = await uploadConfirmacaoFornecedor(file)
    setUploading(false)
    if (url) onChange(url)
    else {
      // fallback: base64
      const r = new FileReader()
      r.onload = e => onChange(e.target?.result as string)
      r.readAsDataURL(file)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) { const f = item.getAsFile(); if (f) { handleFile(f); return } }
    }
    const text = e.clipboardData?.getData('text')
    if (text && (text.startsWith('http') || text.startsWith('data:'))) onChange(text)
  }

  if (value) {
    return (
      <div className="border-2 border-emerald-300 rounded-xl overflow-hidden bg-emerald-50">
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-100 border-b border-emerald-200">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600">{isPdf ? '📄' : '🖼️'}</span>
            <span className="text-xs font-bold text-emerald-800">Confirmação anexada ✓</span>
          </div>
          <div className="flex items-center gap-1.5">
            <a href={value} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-semibold text-blue-600 hover:underline px-2 py-1 rounded bg-white border border-blue-200 hover:bg-blue-50 transition-colors">
              Abrir ↗
            </a>
            <button onClick={() => onChange('')} className="text-[10px] font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded bg-white border border-red-200 hover:bg-red-50 transition-colors">
              Remover
            </button>
          </div>
        </div>
        {!isPdf && (
          <img src={value} alt="Confirmação fornecedor" className="w-full max-h-40 object-contain bg-white" />
        )}
        {isPdf && (
          <div className="p-4 flex items-center gap-3">
            <span className="text-3xl">📄</span>
            <div>
              <p className="text-sm font-bold text-emerald-800">PDF salvo com sucesso</p>
              <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Clique para abrir o arquivo</a>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div onPaste={handlePaste}>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="w-full rounded-xl border-2 border-dashed border-blue-300 p-4 flex flex-col items-center gap-2 text-blue-500 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        {uploading ? (
          <><RefreshCw size={20} className="animate-spin text-blue-400" /><p className="text-xs font-semibold">Enviando arquivo...</p></>
        ) : (
          <>
            <span className="text-2xl">📎</span>
            <div className="text-center">
              <p className="text-xs font-bold">Cole (Ctrl+V) ou clique para anexar</p>
              <p className="text-[10px] text-gray-400 mt-0.5">PDF, imagem ou screenshot do email do fornecedor</p>
            </div>
          </>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}

// ─── Print O.S. ───────────────────────────────────────────────────────────────

function printOS(order: LVOrder, stage: Stage) {
  const now = new Date().toLocaleString('pt-BR')
  const stagesChecklist = ALL_STAGES
  const currentIdx = stagesChecklist.indexOf(stage)
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>O.S. #${order.id} — Lar e Vida</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; background: #fff; padding: 24px; font-size: 13px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #d97706; padding-bottom: 14px; margin-bottom: 18px; }
.logo-area h1 { font-size: 20px; font-weight: 800; color: #d97706; }
.logo-area p { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; margin-top: 2px; }
.os-number .num { font-size: 26px; font-weight: 900; color: #d97706; }
.os-number .dt { font-size: 10px; color: #9ca3af; margin-top: 2px; text-align: right; }
.section { margin-bottom: 14px; }
.section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid #e5e7eb; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.field { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; }
.field label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; display: block; margin-bottom: 3px; }
.field span { font-size: 13px; font-weight: 600; color: #111827; }
.checklist { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.check-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 11px; font-weight: 500; color: #374151; }
.check-item.done { background: #d1fae5; border-color: #6ee7b7; color: #065f46; }
.check-item.current { background: #fef3c7; border-color: #fbbf24; color: #92400e; font-weight: 700; }
.check-item .box { width: 14px; height: 14px; border: 2px solid currentColor; border-radius: 3px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.check-item.done .box::after { content: '✓'; font-size: 10px; font-weight: 900; }
.check-item.current .box::after { content: '▶'; font-size: 8px; }
.signature { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; padding-top: 14px; border-top: 1px solid #e5e7eb; }
.sig-box { text-align: center; }
.sig-box .line { border-bottom: 1px solid #374151; height: 36px; margin-bottom: 4px; }
.sig-box .lbl { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
.footer { margin-top: 18px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
@media print { body { padding: 0; } @page { margin: 18mm; size: A4; } }
</style></head><body>
<div class="header">
  <div class="logo-area"><h1>Lar e Vida</h1><p>Ordem de Serviço — Cross-Docking</p></div>
  <div class="os-number"><div class="num">O.S. #${order.id}</div><div class="dt">Emitida em ${now}</div></div>
</div>
<div class="section">
  <div class="section-title">Dados do Pedido</div>
  <div class="grid-3">
    <div class="field" style="background:#fffbeb;border-color:#fcd34d"><label>Cliente</label><span>${order.cliente}</span></div>
    <div class="field"><label>Prazo de Entrega</label><span>${order.prazoEntrega ?? '—'}</span></div>
    <div class="field"><label>Etapa Atual</label><span>${stage}</span></div>
    ${order.canal ? `<div class="field"><label>Canal</label><span>${order.canal}</span></div>` : ''}
    ${order.valor ? `<div class="field"><label>Valor</label><span>R$ ${order.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>` : ''}
    ${order.sku ? `<div class="field"><label>SKU</label><span style="font-family:monospace">${order.sku}</span></div>` : ''}
  </div>
</div>
<div class="section">
  <div class="section-title">Produto</div>
  <div class="grid-2">
    ${order.fotoUrl ? `<div style="grid-column:1"><img src="${order.fotoUrl}" style="width:100%;max-height:140px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" /></div>` : ''}
    <div style="grid-column:${order.fotoUrl ? '2' : '1 / span 2'}">
      <div class="field" style="margin-bottom:8px"><label>Descrição</label><span style="font-size:15px;font-weight:800">${order.produto}</span></div>
      <div class="grid-2">
        ${order.tamanho ? `<div class="field"><label>Tamanho</label><span>${order.tamanho}</span></div>` : ''}
        ${order.cor ? `<div class="field"><label>Cor / Variação</label><span>${order.cor}</span></div>` : ''}
        ${order.quantidade ? `<div class="field" style="background:#e0f2fe;border-color:#bae6fd"><label>Qtd.</label><span style="font-size:16px;font-weight:900;color:#0369a1">${order.quantidade}x</span></div>` : ''}
        ${order.categoria ? `<div class="field"><label>Categoria</label><span>${order.categoria}</span></div>` : ''}
      </div>
    </div>
  </div>
</div>
${order.nomeFornecedor || order.codigoFornecedor ? `
<div class="section">
  <div class="section-title">Fornecedor</div>
  <div class="grid-2">
    ${order.nomeFornecedor ? `<div class="field"><label>Nome no Fornecedor</label><span>${order.nomeFornecedor}</span></div>` : ''}
    ${order.codigoFornecedor ? `<div class="field"><label>Código Fornecedor</label><span style="font-family:monospace">${order.codigoFornecedor}</span></div>` : ''}
  </div>
</div>` : ''}
${order.obs ? `<div class="section"><div class="section-title">Observações</div><div class="field" style="background:#fffbeb;border-color:#fcd34d"><label>Atenção</label><span>${order.obs}</span></div></div>` : ''}
<div class="section">
  <div class="section-title">Fluxo Cross-Docking</div>
  <div class="checklist">
    ${stagesChecklist.map((s, i) => `
      <div class="check-item ${i < currentIdx ? 'done' : i === currentIdx ? 'current' : ''}">
        <div class="box"></div>
        <span>${STAGE_ICON[s as Stage] ?? ''} ${s}</span>
        ${i < currentIdx ? '<span style="margin-left:auto;font-size:10px;color:#059669">Concluído ✓</span>' : i === currentIdx ? '<span style="margin-left:auto;font-size:10px;color:#92400e">EM ANDAMENTO</span>' : ''}
      </div>`).join('')}
  </div>
</div>
<div class="signature">
  <div class="sig-box"><div class="line"></div><div class="lbl">Responsável pelo Recebimento</div></div>
  <div class="sig-box"><div class="line"></div><div class="lbl">Conferência / Aprovação</div></div>
</div>
<div class="footer">Lar e Vida · O.S. #${order.id} · ${now}</div>
<script>window.onload = () => { window.print(); }</script>
</body></html>`
  const w = window.open('', '_blank', 'width=850,height=1100')
  if (w) { w.document.write(html); w.document.close() }
}

// ─── InlineEdit — campo controlado que mantém valor após re-render ──────────────

function InlineEdit({
  value, placeholder, className, onSave
}: {
  value: string | undefined
  placeholder: string
  className: string
  onSave: (v: string) => void
}) {
  const [local, setLocal] = useState(value ?? '')
  useEffect(() => { setLocal(value ?? '') }, [value])
  return (
    <input
      className={className}
      placeholder={placeholder}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onSave(local.trim())}
      onClick={e => e.stopPropagation()}
    />
  )
}

// ─── Print PDF Pedido Único ao Fornecedor ────────────────────────────────────

function printPedidoFornecedor(order: LVOrder) {
  const now = new Date().toLocaleString('pt-BR')
  const fornecedor = order.nomeFornecedor || order.transportadora || '—'

  const fotoHtml = order.fotoUrl
    ? `<img src="${order.fotoUrl}" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;display:block;" />`
    : `<div style="width:100%;height:120px;border-radius:8px;background:#f3f4f6;border:1px dashed #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:36px;">🏠</div>`

  const total = order.valor ? `R$ ${(order.valor * (order.quantidade ?? 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Pedido ao Fornecedor — Lar e Vida #${order.id.slice(-8)}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; background: #fff; padding: 28px; font-size: 13px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #d97706; padding-bottom: 16px; margin-bottom: 20px; }
.logo h1 { font-size: 24px; font-weight: 900; color: #d97706; letter-spacing: -0.5px; }
.logo p { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-top: 2px; }
.meta { text-align: right; }
.meta .num { font-size: 20px; font-weight: 900; color: #1e293b; }
.meta .dt { font-size: 10px; color: #9ca3af; margin-top: 3px; }
.section { margin-bottom: 16px; }
.section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
.supplier-box { background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; }
.supplier-box .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #3b82f6; margin-bottom: 3px; }
.supplier-box .name { font-size: 18px; font-weight: 900; color: #1e40af; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.field { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
.field label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; display: block; margin-bottom: 4px; }
.field span { font-size: 14px; font-weight: 700; color: #111827; }
.field.highlight { background: #fef3c7; border-color: #fde68a; }
.field.blue { background: #eff6ff; border-color: #bfdbfe; }
.field.green { background: #f0fdf4; border-color: #bbf7d0; }
.produto-box { display: grid; grid-template-columns: 200px 1fr; gap: 16px; margin-bottom: 16px; }
.produto-info { display: flex; flex-direction: column; gap: 8px; }
.desenho-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 10px 14px; }
.desenho-box .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #b45309; margin-bottom: 4px; }
.desenho-box .val { font-size: 18px; font-weight: 900; color: #92400e; }
.obs-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 10px 14px; }
.obs-box label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #f97316; display: block; margin-bottom: 4px; }
.obs-box span { font-size: 12px; color: #7c2d12; }
.signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
.sig { text-align: center; }
.sig .line { border-bottom: 1px solid #374151; height: 40px; margin-bottom: 6px; }
.sig .lbl { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
.footer { margin-top: 20px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
.badge { display: inline-block; background: #d97706; color: #fff; font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 99px; text-transform: uppercase; letter-spacing: 1px; vertical-align: middle; margin-left: 8px; }
.status-badge { display: inline-block; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 6px; }
@media print { body { padding: 0; } @page { margin: 16mm; size: A4; } }
</style></head><body>
<div class="header">
  <div class="logo"><h1>Lar e Vida <span class="badge">Tapetes</span></h1><p>Pedido ao Fornecedor</p></div>
  <div class="meta"><div class="num">PED #${order.id.slice(-8)}</div><div class="dt">Emitido em ${now}</div></div>
</div>

<div class="supplier-box">
  <div style="font-size:32px;">🏭</div>
  <div>
    <div class="label">Fornecedor</div>
    <div class="name">${fornecedor}</div>
    ${order.codigoFornecedor ? `<div style="font-size:11px;font-family:monospace;color:#2563eb;margin-top:3px;">Ref: ${order.codigoFornecedor}</div>` : ''}
  </div>
</div>

<div class="section">
  <div class="section-title">Dados do Cliente / Pedido</div>
  <div class="grid-3">
    <div class="field highlight"><label>Cliente</label><span>${order.cliente}</span></div>
    ${order.canal ? `<div class="field"><label>Canal de Venda</label><span>${order.canal}</span></div>` : ''}
    ${order.prazoEntrega ? `<div class="field"><label>Prazo de Entrega</label><span>${order.prazoEntrega}</span></div>` : ''}
    ${order.sku ? `<div class="field"><label>SKU da Loja</label><span style="font-family:monospace;">${order.sku}</span></div>` : ''}
    ${order.valor ? `<div class="field green"><label>Valor do Pedido</label><span style="color:#059669;">${total}</span></div>` : ''}
  </div>
</div>

<div class="section">
  <div class="section-title">Produto</div>
  <div class="produto-box">
    <div>${fotoHtml}</div>
    <div class="produto-info">
      <div class="field" style="background:#fff;border-color:#d97706;"><label>Descrição do Produto</label><span style="font-size:16px;font-weight:900;">${order.produto}</span></div>
      <div class="grid-2">
        ${order.categoria ? `<div class="field"><label>Categoria</label><span>${order.categoria}</span></div>` : ''}
        ${order.tamanho ? `<div class="field blue"><label>Tamanho</label><span style="color:#1d4ed8;">${order.tamanho}</span></div>` : ''}
        ${order.cor ? `<div class="field"><label>Cor / Desenho</label><span>${order.cor}</span></div>` : ''}
        <div class="field" style="background:#e0f2fe;border-color:#bae6fd;"><label>Quantidade</label><span style="font-size:20px;font-weight:900;color:#0369a1;">${order.quantidade ?? 1}x</span></div>
      </div>
      ${order.desenho ? `
      <div class="desenho-box">
        <div class="label">🎨 Desenho / Padrão</div>
        <div class="val">${order.desenho}</div>
      </div>` : ''}
    </div>
  </div>
</div>

${order.obs ? `
<div class="section">
  <div class="section-title">Observações</div>
  <div class="obs-box"><label>⚠ Atenção</label><span>${order.obs}</span></div>
</div>` : ''}

<div class="section">
  <div class="section-title">Status do Pedido</div>
  <div style="display:flex;align-items:center;gap:10px;">
    <span class="status-badge">✅ Pedido Enviado ao Fornecedor</span>
    <span style="font-size:11px;color:#9ca3af;">Emitido em ${now}</span>
  </div>
</div>

<div class="signatures">
  <div class="sig"><div class="line"></div><div class="lbl">Comprador / Responsável</div></div>
  <div class="sig"><div class="line"></div><div class="lbl">Aprovação Gerência</div></div>
  <div class="sig"><div class="line"></div><div class="lbl">Confirmação Fornecedor</div></div>
</div>
<div class="footer">Lar e Vida Decorações · PED #${order.id.slice(-8)} · Gerado em ${now}</div>
<script>window.onload = () => { window.print(); }</script>
</body></html>`

  const w = window.open('', '_blank', 'width=900,height=1200')
  if (w) { w.document.write(html); w.document.close() }
}

// ─── Print PDF Fornecedor (Tapetes) ───────────────────────────────────────────

function printFornecedorPDF(orders: LVOrder[]) {
  const now = new Date().toLocaleString('pt-BR')
  const pedidoNum = orders[0]?.id?.slice(-8) ?? '000000'
  const fornecedor = orders[0]?.nomeFornecedor || orders[0]?.transportadora || '—'

  // Separa tapetes (cards individuais) de camas (cards com itensCama)
  const tapeteOrders = orders.filter(o => o.categoria !== 'Cama')
  const camaOrders = orders.filter(o => o.categoria === 'Cama')

  const tapeteRows = tapeteOrders.map(o => {
    const foto = o.fotoUrl
      ? `<img src="${o.fotoUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" />`
      : `<div style="width:64px;height:64px;border-radius:6px;background:#f3f4f6;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:22px;">🏠</div>`
    const total = o.valor ? `R$ ${(o.valor * (o.quantidade ?? 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
    return `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;text-align:center;">${foto}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
          <div style="font-size:13px;font-weight:700;color:#111827;">${o.produto}</div>
          ${o.nomeFornecedor ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;">Ref: ${o.nomeFornecedor}</div>` : ''}
          ${o.codigoFornecedor ? `<div style="font-size:10px;font-family:monospace;color:#2563eb;">${o.codigoFornecedor}</div>` : ''}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;text-align:center;">
          <span style="font-size:12px;font-weight:600;color:#374151;">${o.cor || '—'}</span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;text-align:center;">
          <span style="font-size:12px;font-weight:700;color:#b45309;background:#fffbeb;padding:3px 8px;border-radius:6px;border:1px solid #fde68a;white-space:nowrap;display:inline-block;">${o.tamanho || '—'}</span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;text-align:center;">
          <span style="font-size:16px;font-weight:900;color:#111827;">${o.quantidade ?? 1}</span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;text-align:center;">
          ${o.valor ? `<div style="font-size:11px;color:#6b7280;">Unit: R$ ${o.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>` : ''}
          <div style="font-size:12px;font-weight:700;color:#059669;">${total}</div>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;text-align:center;">
          ${o.obs ? `<div style="font-size:10px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:4px 6px;">${o.obs}</div>` : '<span style="color:#d1d5db;font-size:11px;">—</span>'}
        </td>
      </tr>`
  }).join('')

  // Bloco de camas: cada cama vira uma sub-tabela com seus SKUs
  const camaBlocks = camaOrders.map(o => {
    const foto = o.fotoUrl
      ? `<img src="${o.fotoUrl}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid #bfdbfe;" />`
      : `<div style="width:56px;height:56px;border-radius:6px;background:#eff6ff;border:1px solid #bfdbfe;display:flex;align-items:center;justify-content:center;font-size:22px;">🛏️</div>`
    const skus = o.itensCama ?? []
    const totalUnid = skus.reduce((s, i) => s + i.qtd, 0)
    // Subtotal por SKU (qtd × valor); soma só quando o SKU tem valor próprio.
    // Fallback no valor do CamaItem (o.valor) quando o SKU não tiver preço gravado.
    const subtotalSkus = skus.reduce(
      (sum, i) => sum + (typeof i.valor === 'number' ? i.valor : (o.valor ?? 0)) * i.qtd,
      0,
    )
    const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    const skuRows = skus.map(s => {
      const v = typeof s.valor === 'number' ? s.valor : o.valor
      const sub = typeof v === 'number' ? v * s.qtd : null
      return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eff6ff;font-family:monospace;font-size:11px;color:#1e40af;">${s.sku}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eff6ff;font-size:11px;color:#374151;">${s.descricao || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eff6ff;text-align:center;font-size:12px;font-weight:700;color:#111827;">${s.qtd}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eff6ff;text-align:right;font-size:11px;font-family:monospace;color:${typeof v === 'number' ? '#374151' : '#d1d5db'};">${typeof v === 'number' ? `R$ ${fmt(v)}` : '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eff6ff;text-align:right;font-size:11px;font-family:monospace;font-weight:700;color:${sub != null ? '#059669' : '#d1d5db'};">${sub != null ? `R$ ${fmt(sub)}` : '—'}</td>
      </tr>`
    }).join('')
    return `
      <div style="margin-top:18px;border:2px solid #bfdbfe;border-radius:10px;overflow:hidden;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#eff6ff;border-bottom:1px solid #bfdbfe;">
          ${foto}
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:900;color:#1e40af;">${o.produto}</div>
            <div style="font-size:10px;color:#3b82f6;margin-top:2px;">${skus.length} SKUs · ${totalUnid} unid.${subtotalSkus > 0 ? ` · R$ ${fmt(subtotalSkus)}` : ''}</div>
          </div>
        </div>
        ${skus.length > 0 ? `
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#1e293b;color:#fff;">
                <th style="padding:8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">SKU</th>
                <th style="padding:8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Descrição</th>
                <th style="padding:8px;text-align:center;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;width:50px;">Qtd</th>
                <th style="padding:8px;text-align:right;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;width:80px;">Unit.</th>
                <th style="padding:8px;text-align:right;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;width:90px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${skuRows}</tbody>
            ${subtotalSkus > 0 ? `<tfoot><tr style="background:#f9fafb;"><td colspan="4" style="padding:8px;text-align:right;font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:1px;">Total</td><td style="padding:8px;text-align:right;font-size:13px;font-weight:900;color:#059669;font-family:monospace;">R$ ${fmt(subtotalSkus)}</td></tr></tfoot>` : ''}
          </table>` : ''}
      </div>`
  }).join('')

  // Total geral: pra camas soma valor por SKU (com fallback no valor do CamaItem),
  // pra demais usa quantidade × valor único do item.
  const totalGeral = orders.reduce((sum, o) => {
    if (o.itensCama && o.itensCama.length > 0) {
      return sum + o.itensCama.reduce(
        (s, i) => s + (typeof i.valor === 'number' ? i.valor : (o.valor ?? 0)) * i.qtd,
        0,
      )
    }
    return sum + (o.valor ?? 0) * (o.quantidade ?? 1)
  }, 0)
  const totalItens = orders.reduce((sum, o) => sum + (o.quantidade ?? 1), 0)

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Pedido ao Fornecedor — Lar e Vida</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; background: #fff; padding: 28px; font-size: 13px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #d97706; padding-bottom: 16px; margin-bottom: 20px; }
.logo h1 { font-size: 24px; font-weight: 900; color: #d97706; letter-spacing: -0.5px; }
.logo p { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-top: 2px; }
.meta { text-align: right; }
.meta .num { font-size: 20px; font-weight: 900; color: #1e293b; }
.meta .dt { font-size: 10px; color: #9ca3af; margin-top: 3px; }
.info-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
.info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
.info-box label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; display: block; margin-bottom: 4px; }
.info-box span { font-size: 13px; font-weight: 700; color: #111827; }
.supplier-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
.supplier-box .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #3b82f6; margin-bottom: 3px; }
.supplier-box .name { font-size: 16px; font-weight: 900; color: #1e40af; }
table { width: 100%; border-collapse: collapse; }
thead th { background: #1e293b; color: #fff; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 10px 8px; text-align: center; }
thead th:nth-child(2) { text-align: left; }
tbody tr:nth-child(even) { background: #f9fafb; }
.totals { margin-top: 0; border-top: 2px solid #e5e7eb; }
.totals td { padding: 12px 8px; font-size: 12px; }
.totals .sum-label { font-weight: 700; color: #374151; text-align: right; }
.totals .sum-val { font-weight: 900; color: #059669; font-size: 15px; text-align: center; }
.signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
.sig { text-align: center; }
.sig .line { border-bottom: 1px solid #374151; height: 40px; margin-bottom: 6px; }
.sig .lbl { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
.footer { margin-top: 20px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
.badge-tapete { display: inline-block; background: #d97706; color: #fff; font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 99px; text-transform: uppercase; letter-spacing: 1px; vertical-align: middle; margin-left: 8px; }
@media print { body { padding: 0; } @page { margin: 16mm; size: A4; } }
</style></head><body>
<div class="header">
  <div class="logo"><h1>Lar e Vida ${camaOrders.length > 0 && tapeteOrders.length > 0 ? '<span class="badge-tapete">Tapetes + Camas</span>' : camaOrders.length > 0 ? '<span class="badge-tapete" style="background:#1e40af;">Camas</span>' : '<span class="badge-tapete">Tapetes</span>'}</h1><p>Pedido ao Fornecedor</p></div>
  <div class="meta"><div class="num">PED #${pedidoNum}</div><div class="dt">Emitido em ${now}</div></div>
</div>

<div class="supplier-box">
  <div style="font-size:28px;">🏭</div>
  <div>
    <div class="label">Fornecedor</div>
    <div class="name">${fornecedor}</div>
  </div>
</div>

<div class="info-strip">
  <div class="info-box"><label>Total de Itens</label><span>${tapeteOrders.length > 0 ? `${tapeteOrders.length} tap.` : ''}${tapeteOrders.length > 0 && camaOrders.length > 0 ? ' + ' : ''}${camaOrders.length > 0 ? `${camaOrders.length} col.` : ''}</span></div>
  <div class="info-box"><label>Quantidade Total</label><span>${totalItens} unid.</span></div>
  <div class="info-box"><label>Data do Pedido</label><span>${new Date().toLocaleDateString('pt-BR')}</span></div>
  <div class="info-box" style="${totalGeral > 0 ? 'background:#f0fdf4;border-color:#bbf7d0;' : ''}">
    <label>Valor Total</label>
    <span style="color:#059669;">${totalGeral > 0 ? 'R$ ' + totalGeral.toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—'}</span>
  </div>
</div>

${tapeteOrders.length > 0 ? `
<h2 style="font-size:13px;font-weight:900;color:#b45309;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">🏠 Tapetes (${tapeteOrders.length})</h2>
<table>
  <thead>
    <tr>
      <th style="width:80px;">Foto</th>
      <th style="text-align:left;">Nome / Ref. Fornecedor</th>
      <th>Desenho / Cor</th>
      <th>Tamanho</th>
      <th>Qtd.</th>
      <th>Valor</th>
      <th>Obs.</th>
    </tr>
  </thead>
  <tbody>${tapeteRows}</tbody>
</table>` : ''}

${camaOrders.length > 0 ? `
<h2 style="font-size:13px;font-weight:900;color:#1e40af;text-transform:uppercase;letter-spacing:2px;margin-top:24px;margin-bottom:8px;">🛏️ Camas (${camaOrders.length})</h2>
${camaBlocks}` : ''}

${totalGeral > 0 ? `<div style="margin-top:18px;padding:12px 16px;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
  <span style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:1.5px;">Total Geral · ${totalItens} unid.</span>
  <span style="font-size:18px;font-weight:900;color:#059669;">R$ ${totalGeral.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
</div>` : ''}

<div class="signatures">
  <div class="sig"><div class="line"></div><div class="lbl">Comprador / Responsável</div></div>
  <div class="sig"><div class="line"></div><div class="lbl">Aprovação Gerência</div></div>
  <div class="sig"><div class="line"></div><div class="lbl">Confirmação Fornecedor</div></div>
</div>
<div class="footer">Lar e Vida Decorações · Pedido gerado em ${now}</div>
<script>window.onload = () => { window.print(); }</script>
</body></html>`

  const w = window.open('', '_blank', 'width=900,height=1200')
  if (w) { w.document.write(html); w.document.close() }
}

// ─── Conferência de Recebimento (Cama / Crossdocking) ────────────────────────

function inferDesenho(sku: string): string {
  // Extrai o grupo de desenho do SKU — formato: 000302.003.023
  // Os últimos 3 dígitos mapeiam para grupos: D01 = 023/025/026, D02 = 027/029/030, etc.
  // Alternativa: detectar pelo nome da descrição se houver padrão 'D01' ou 'D02'
  // Aqui usamos range dos últimos dígitos como heurística
  const parts = sku.split('.')
  const last = parseInt(parts[parts.length - 1] ?? '0', 10)
  if (last >= 23 && last <= 26) return 'D01'
  if (last >= 27 && last <= 30) return 'D02'
  if (last >= 31 && last <= 34) return 'D03'
  if (last >= 35 && last <= 38) return 'D04'
  return `G${last}` // fallback
}

function ConferenciaTab({ order, onSave }: {
  order: LVOrder
  onSave: (conf: LVOrder['conferenciaItens'], imgs: LVOrder['imagensDesenho']) => void
}) {
  const itens = order.itensCama ?? []

  // Estado dos checks: {sku -> {conferido, qtdConferida, obs}}
  const [checks, setChecks] = useState<Record<string, { conferido: boolean; qtdConferida: number; obs: string }>>(() => {
    const initial: Record<string, { conferido: boolean; qtdConferida: number; obs: string }> = {}
    const existingConf = order.conferenciaItens ?? []
    itens.forEach(item => {
      const found = existingConf.find(c => c.sku === item.sku)
      initial[item.sku] = {
        conferido: found?.conferido ?? false,
        qtdConferida: found?.qtdConferida ?? item.qtd,
        obs: found?.obs ?? '',
      }
    })
    return initial
  })

  // Imagens por grupo de desenho
  const desenhos = [...new Set(itens.map(i => inferDesenho(i.sku)))].sort()
  const [imagens, setImagens] = useState<Record<string, string>>(order.imagensDesenho ?? {})
  const [expandedSku, setExpandedSku] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const totalItens = itens.length
  const conferidos = Object.values(checks).filter(c => c.conferido).length
  const progresso = totalItens === 0 ? 0 : Math.round((conferidos / totalItens) * 100)

  const toggleCheck = (sku: string) => {
    setChecks(prev => ({
      ...prev,
      [sku]: { ...prev[sku], conferido: !prev[sku].conferido }
    }))
  }

  const handleImageUpload = async (desenho: string, file: File) => {
    const { uploadFotoLV } = await import('../../services/pedidosLV')
    const url = await uploadFotoLV(file)
    if (url) setImagens(prev => ({ ...prev, [desenho]: url }))
  }

  const handleSave = async () => {
    setSaving(true)
    const conf: LVOrder['conferenciaItens'] = itens.map(item => ({
      sku: item.sku,
      conferido: checks[item.sku]?.conferido ?? false,
      qtdConferida: checks[item.sku]?.qtdConferida ?? item.qtd,
      obs: checks[item.sku]?.obs ?? '',
    }))
    await onSave(conf, imagens)
    setSaving(false)
  }

  const marcarTodos = () => {
    setChecks(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(sku => { next[sku] = { ...next[sku], conferido: true } })
      return next
    })
  }

  if (itens.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-4xl mb-3">📦</p>
        <p className="text-sm font-semibold text-gray-500">Nenhum item de cama registrado neste pedido.</p>
        <p className="text-xs text-gray-400 mt-1">A aba de conferência é usada para pedidos da linha Cama (TELLAIO).</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Barra de progresso */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">📋 Conferência de Recebimento</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">{conferidos}/{totalItens} conferidos</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              progresso === 100 ? 'bg-emerald-100 text-emerald-700' :
              progresso > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
            }`}>{progresso}%</span>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progresso}%`,
              background: progresso === 100 ? '#10b981' : 'linear-gradient(90deg, #b45309, #d97706)'
            }}
          />
        </div>
        {progresso < 100 && (
          <button onClick={marcarTodos} className="mt-2 text-[11px] font-semibold text-amber-700 hover:text-amber-900 transition-colors">
            ✓ Marcar todos como conferidos
          </button>
        )}
      </div>

      {/* Fotos por desenho */}
      {desenhos.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🖼️ Fotos por Coleção/Desenho</p>
          <div className="grid grid-cols-2 gap-2">
            {desenhos.map(des => (
              <div key={des} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-gray-50 px-2 py-1.5 flex items-center justify-between border-b border-gray-100">
                  <span className="text-[10px] font-black text-gray-700 uppercase">{des}</span>
                  <button
                    onClick={() => fileRefs.current[des]?.click()}
                    className="flex items-center gap-1 text-[9px] text-amber-600 font-semibold hover:text-amber-800 transition-colors"
                  >
                    <ImageIcon size={10} /> Foto
                  </button>
                  <input
                    ref={el => { fileRefs.current[des] = el }}
                    type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(des, f) }}
                  />
                </div>
                {imagens[des] ? (
                  <div className="relative group">
                    <img src={imagens[des]} alt={`Desenho ${des}`} className="w-full h-24 object-cover" />
                    <button
                      onClick={() => setImagens(prev => { const n = {...prev}; delete n[des]; return n })}
                      className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} className="text-red-500" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRefs.current[des]?.click()}
                    className="h-16 flex flex-col items-center justify-center gap-1 text-gray-300 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <ImageIcon size={18} />
                    <span className="text-[9px]">Adicionar foto</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de SKUs para conferência */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📦 Itens para Conferir</p>
        <div className="space-y-1.5">
          {itens.map(item => {
            const c = checks[item.sku] ?? { conferido: false, qtdConferida: item.qtd, obs: '' }
            const isExpanded = expandedSku === item.sku
            const desenho = inferDesenho(item.sku)
            const hasImg = !!imagens[desenho]
            return (
              <div
                key={item.sku}
                className={`border rounded-xl overflow-hidden transition-all ${
                  c.conferido ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer"
                  onClick={() => setExpandedSku(isExpanded ? null : item.sku)}
                >
                  {/* Checkbox */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleCheck(item.sku) }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all ${
                      c.conferido ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white hover:border-emerald-400'
                    }`}
                  >
                    {c.conferido && <Check size={11} className="text-white" strokeWidth={3} />}
                  </button>

                  {/* Miniatura do desenho */}
                  {hasImg ? (
                    <img src={imagens[desenho]} alt={desenho} className="w-7 h-7 rounded object-cover shrink-0 border border-gray-200" />
                  ) : (
                    <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center shrink-0">
                      <span className="text-[7px] font-black text-gray-400">{desenho}</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-mono text-gray-400 leading-none">{item.sku}</p>
                    <p className={`text-xs font-semibold leading-tight truncate ${
                      c.conferido ? 'text-emerald-700 line-through opacity-60' : 'text-gray-800'
                    }`}>
                      {item.descricao}
                    </p>
                  </div>

                  {/* Qtd esperada vs conferida */}
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-black ${
                      c.qtdConferida === item.qtd ? 'text-gray-700' :
                      c.qtdConferida < item.qtd ? 'text-red-600' : 'text-orange-500'
                    }`}>{c.qtdConferida}x</span>
                    <p className="text-[8px] text-gray-400">esp: {item.qtd}x</p>
                  </div>

                  <ChevronDown size={12} className={`text-gray-400 shrink-0 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`} />
                </div>

                {/* Expandido: qtd conferida + obs */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-gray-100"
                    >
                      <div className="px-3 py-2 space-y-2 bg-gray-50/50">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-gray-500 font-semibold shrink-0">Qtd recebida:</label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={e => { e.stopPropagation(); setChecks(p => ({ ...p, [item.sku]: { ...p[item.sku], qtdConferida: Math.max(0, (p[item.sku]?.qtdConferida ?? item.qtd) - 1) } })) }}
                              className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-xs font-bold"
                            >−</button>
                            <span className={`w-8 text-center text-sm font-black ${
                              c.qtdConferida < item.qtd ? 'text-red-600' : 'text-gray-800'
                            }`}>{c.qtdConferida}</span>
                            <button
                              onClick={e => { e.stopPropagation(); setChecks(p => ({ ...p, [item.sku]: { ...p[item.sku], qtdConferida: (p[item.sku]?.qtdConferida ?? item.qtd) + 1 } })) }}
                              className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-xs font-bold"
                            >+</button>
                          </div>
                          {c.qtdConferida !== item.qtd && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              c.qtdConferida < item.qtd ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                            }`}>
                              {c.qtdConferida < item.qtd ? `⚠ Faltam ${item.qtd - c.qtdConferida}` : `+${c.qtdConferida - item.qtd} extra`}
                            </span>
                          )}
                        </div>
                        <input
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                          placeholder="Observação (opcional — ex: embalagem amassada)"
                          value={c.obs}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setChecks(p => ({ ...p, [item.sku]: { ...p[item.sku], obs: e.target.value } }))}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* Resumo */}
      {progresso === 100 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle size={18} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Conferência completa!</p>
            <p className="text-[11px] text-emerald-600">Todos os {totalItens} itens foram conferidos. Salve para registrar.</p>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition-opacity disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
      >
        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
        Salvar Conferência
      </button>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  cliente: 'Cliente', clienteEmail: 'E-mail', clienteTelefone: 'Telefone',
  produto: 'Produto (site)', nome_fornecedor: 'Nome no Fornecedor',
  codigo_fornecedor: 'Código Fornecedor', sku: 'SKU',
  categoria: 'Categoria', tamanho: 'Tamanho', cor: 'Cor',
  quantidade: 'Quantidade', canal: 'Canal', valor: 'Valor',
  frete: 'Frete', endereco: 'Endereço', prazo_entrega: 'Prazo de Entrega',
  transportadora: 'Fornecedor / Transportadora', obs: 'Observações',
  foto_url: 'Foto do Produto',
}

function DetailModal({ order: initialOrder, stage, onClose, onConclude, onUpdate, onDelete }: {
  order: LVOrder; stage: Stage
  onClose: () => void; onConclude: () => void
  onUpdate: (updates: Partial<LVOrder>) => Promise<void>
  onDelete: () => void
}) {
  const hasConferencia = (initialOrder.itensCama?.length ?? 0) > 0
  const showConferenciaTab = hasConferencia && stage === 'Recebido'

  const [tab, setTab] = useState<'detalhes' | 'conferencia' | 'editar' | 'historico'>(
    showConferenciaTab ? 'conferencia' : 'detalhes'
  )
  const [historico, setHistorico] = useState<HistoricoEntry[]>([])
  const [loadingH, setLoadingH] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentFoto, setCurrentFoto] = useState(initialOrder.fotoUrl ?? '')

  const [edit, setEdit] = useState({
    cliente: initialOrder.cliente,
    clienteEmail: initialOrder.clienteEmail ?? '',
    clienteTelefone: initialOrder.clienteTelefone ?? '',
    produto: initialOrder.produto,
    nomeFornecedor: initialOrder.nomeFornecedor ?? '',
    codigoFornecedor: initialOrder.codigoFornecedor ?? '',
    sku: initialOrder.sku ?? '',
    fotoUrl: initialOrder.fotoUrl ?? '',
    categoria: initialOrder.categoria ?? CATEGORIAS_LV[0],
    tamanho: initialOrder.tamanho ?? '',
    cor: initialOrder.cor ?? '',
    quantidade: initialOrder.quantidade ?? 1,
    canal: initialOrder.canal ?? 'Site',
    valor: initialOrder.valor ? String(initialOrder.valor) : '',
    frete: initialOrder.frete ? String(initialOrder.frete) : '',
    endereco: initialOrder.endereco ?? '',
    prazoEntrega: initialOrder.prazoEntrega ?? '',
    transportadora: initialOrder.transportadora ?? '',
    obs: initialOrder.obs ?? '',
  })
  const setE = (field: string, val: any) => setEdit(p => ({ ...p, [field]: val }))

  const handleFotoChange = useCallback(async (url: string) => {
    setCurrentFoto(url)
    setE('fotoUrl', url)
    await onUpdate({ fotoUrl: url || undefined })
    if (url) {
      await logHistoricoLV(initialOrder.id, [{
        campo: 'foto_url',
        valorAnterior: initialOrder.fotoUrl ? '[foto anterior]' : null,
        valorNovo: '[foto atualizada]',
      }])
    }
  }, [onUpdate, initialOrder.id, initialOrder.fotoUrl])

  const loadHistorico = useCallback(async () => {
    setLoadingH(true)
    const h = await fetchHistoricoLV(initialOrder.id)
    setHistorico(h)
    setLoadingH(false)
  }, [initialOrder.id])

  useEffect(() => { if (tab === 'historico') loadHistorico() }, [tab, loadHistorico])

  const handleSaveEdit = async () => {
    setSaving(true)
    const mapping = [
      { campo: 'cliente',           oldVal: initialOrder.cliente,                    newVal: edit.cliente },
      { campo: 'clienteEmail',      oldVal: initialOrder.clienteEmail ?? null,       newVal: edit.clienteEmail || null },
      { campo: 'clienteTelefone',   oldVal: initialOrder.clienteTelefone ?? null,    newVal: edit.clienteTelefone || null },
      { campo: 'produto',           oldVal: initialOrder.produto,                    newVal: edit.produto },
      { campo: 'nome_fornecedor',   oldVal: initialOrder.nomeFornecedor ?? null,     newVal: edit.nomeFornecedor || null },
      { campo: 'codigo_fornecedor', oldVal: initialOrder.codigoFornecedor ?? null,   newVal: edit.codigoFornecedor || null },
      { campo: 'sku',               oldVal: initialOrder.sku ?? null,                newVal: edit.sku || null },
      { campo: 'categoria',         oldVal: initialOrder.categoria ?? null,          newVal: edit.categoria || null },
      { campo: 'tamanho',           oldVal: initialOrder.tamanho ?? null,            newVal: edit.tamanho || null },
      { campo: 'cor',               oldVal: initialOrder.cor ?? null,                newVal: edit.cor || null },
      { campo: 'quantidade',        oldVal: String(initialOrder.quantidade ?? 1),    newVal: String(edit.quantidade) },
      { campo: 'canal',             oldVal: initialOrder.canal ?? null,              newVal: edit.canal || null },
      { campo: 'valor',             oldVal: initialOrder.valor ? String(initialOrder.valor) : null, newVal: edit.valor || null },
      { campo: 'frete',             oldVal: initialOrder.frete ? String(initialOrder.frete) : null, newVal: edit.frete || null },
      { campo: 'endereco',          oldVal: initialOrder.endereco ?? null,           newVal: edit.endereco || null },
      { campo: 'prazo_entrega',     oldVal: initialOrder.prazoEntrega ?? null,       newVal: edit.prazoEntrega || null },
      { campo: 'transportadora',    oldVal: initialOrder.transportadora ?? null,     newVal: edit.transportadora || null },
      { campo: 'obs',               oldVal: initialOrder.obs ?? null,                newVal: edit.obs || null },
    ]
    const changes = mapping.filter(m => m.oldVal !== m.newVal).map(m => ({ campo: m.campo, valorAnterior: m.oldVal, valorNovo: m.newVal }))
    if (changes.length === 0) { setSaving(false); setTab('detalhes'); return }

    await onUpdate({
      cliente: edit.cliente, clienteEmail: edit.clienteEmail || undefined,
      clienteTelefone: edit.clienteTelefone || undefined,
      produto: edit.produto, nomeFornecedor: edit.nomeFornecedor || undefined,
      codigoFornecedor: edit.codigoFornecedor || undefined, sku: edit.sku || undefined,
      fotoUrl: edit.fotoUrl || undefined, categoria: edit.categoria,
      tamanho: edit.tamanho || undefined, cor: edit.cor || undefined,
      quantidade: edit.quantidade, canal: edit.canal,
      valor: edit.valor ? parseFloat(edit.valor) : undefined,
      frete: edit.frete ? parseFloat(edit.frete) : undefined,
      endereco: edit.endereco || undefined,
      prazoEntrega: edit.prazoEntrega || undefined,
      transportadora: edit.transportadora || undefined,
      obs: edit.obs || undefined,
    })
    await logHistoricoLV(initialOrder.id, changes)
    setSaving(false)
    setTab('detalhes')
  }

  const days = daysUntil(initialOrder.prazoEntrega)
  const prazoColor = days === null ? '' : days < 0 ? 'text-red-600' : days === 0 ? 'text-orange-500' : days <= 2 ? 'text-yellow-600' : 'text-emerald-600'
  const isDelivery = stage === 'Pronto para Envio' || stage === 'Despachados'

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0 border-l-4 shrink-0" style={{ borderLeftColor: '#d97706' }}>
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
              <Sofa size={16} style={{ color: '#d97706' }} />
              Pedido #{initialOrder.id.slice(-8)}
              {initialOrder.canal && (
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {CANAL_ICON[initialOrder.canal] ?? '🛒'} {initialOrder.canal}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Etapa: <strong className="text-gray-700">{stage}</strong></p>
          </div>
          <div className="flex items-center gap-2">
            {initialOrder.categoria === 'Tapete' && (
              <button
                onClick={() => printFornecedorPDF([initialOrder])}
                title="PDF para Fornecedor"
                className="p-1.5 border border-blue-200 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-all text-[10px] font-bold flex items-center gap-1 px-2"
              >
                🏠 PDF
              </button>
            )}
            <button onClick={() => printOS(initialOrder, stage)} title="Imprimir O.S."
              className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 mt-3 shrink-0 overflow-x-auto scrollbar-hide">
          {showConferenciaTab && (
            <button onClick={() => setTab('conferencia')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === 'conferencia' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              ✅ Conferência
            </button>
          )}
          <button onClick={() => setTab('detalhes')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'detalhes' ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Detalhes
          </button>
          <button onClick={() => setTab('editar')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'editar' ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            ✏️ Editar
          </button>
          <button onClick={() => setTab('historico')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'historico' ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            📜 Histórico
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── Tab: Conferência ─── */}
          {tab === 'conferencia' && (
            <ConferenciaTab
              order={initialOrder}
              onSave={async (conf, imgs) => {
                await onUpdate({ conferenciaItens: conf, imagensDesenho: imgs } as any)
              }}
            />
          )}

          {tab === 'detalhes' && (
            <div className="p-5 space-y-4">
              {/* Cliente */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mb-1 flex items-center gap-1.5"><User size={10} /> Cliente</p>
                <p className="text-sm font-bold text-gray-900">{initialOrder.cliente}</p>
                {initialOrder.clienteEmail && <p className="text-[11px] text-amber-700/80 mt-0.5">✉ {initialOrder.clienteEmail}</p>}
                {initialOrder.clienteTelefone && <p className="text-[11px] text-amber-700/80">📞 {initialOrder.clienteTelefone}</p>}
              </div>

              {/* Produto */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">🛋️ Produto</p>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {initialOrder.categoria && <span className="text-[9px] bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded shadow-sm">{initialOrder.categoria}</span>}
                    {initialOrder.sku && <span className="font-mono text-[9px] bg-gray-900 text-white px-1.5 py-0.5 rounded shadow-sm">SKU: {initialOrder.sku}</span>}
                    {initialOrder.tamanho && <span className="text-[9px] border border-amber-300 text-amber-700 px-1.5 py-0.5 rounded bg-amber-50 shadow-sm">{initialOrder.tamanho}</span>}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-[15px] font-bold text-gray-900 leading-tight mb-3">{initialOrder.produto}</p>
                  <div className="mb-4">
                    <PhotoZone value={currentFoto} onChange={handleFotoChange} />
                  </div>
                  {initialOrder.nomeFornecedor && <p className="text-[11px] text-blue-600 font-medium">Fornecedor: {initialOrder.nomeFornecedor}</p>}
                  {initialOrder.codigoFornecedor && <p className="text-[10px] font-mono text-blue-500 mb-2">COD: {initialOrder.codigoFornecedor}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {initialOrder.cor && (
                      <div className="bg-gray-50 border border-gray-100 rounded-lg p-2">
                        <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Cor</p>
                        <p className="text-xs font-semibold text-gray-700 truncate">{initialOrder.cor}</p>
                      </div>
                    )}
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-2">
                      <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Qtd</p>
                      <p className="text-sm font-black text-gray-900">{initialOrder.quantidade || 1}x</p>
                    </div>
                  </div>

                  {/* Lista de itens de cama (crossdocking) */}
                  {initialOrder.itensCama && initialOrder.itensCama.length > 0 && (
                    <div className="mt-3 border border-blue-100 rounded-xl overflow-hidden">
                      <div className="bg-blue-50 px-3 py-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">🛏️ Itens do Pedido — {initialOrder.itensCama.length} SKUs</p>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {initialOrder.itensCama.reduce((acc, i) => acc + i.qtd, 0)} unid.
                        </span>
                      </div>
                      <div className="divide-y divide-blue-50 max-h-48 overflow-y-auto">
                        {initialOrder.itensCama.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between px-3 py-1.5 bg-white hover:bg-blue-50/40 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-mono text-gray-400">{item.sku}</p>
                              <p className="text-[11px] font-semibold text-gray-700 leading-tight truncate">{item.descricao}</p>
                            </div>
                            <span className="ml-2 shrink-0 bg-blue-100 text-blue-700 text-[10px] font-black px-1.5 py-0.5 rounded">{item.qtd}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Financeiro */}
              {(initialOrder.valor || initialOrder.frete) && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">💰 Financeiro</p>
                  <div className="grid grid-cols-2 gap-2">
                    {initialOrder.valor && (
                      <div className="rounded-xl p-3 text-center text-white" style={{ background: 'linear-gradient(135deg, #92400e, #b45309)' }}>
                        <p className="text-[9px] font-bold uppercase mb-1" style={{ color: '#fde68a' }}>Valor Total</p>
                        <p className="text-sm font-black">R$ {initialOrder.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    {initialOrder.frete !== undefined && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                        <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Frete</p>
                        <p className="text-sm font-bold text-gray-800">R$ {initialOrder.frete?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Prazo */}
              {initialOrder.prazoEntrega && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                  <Calendar size={24} className={prazoColor || 'text-gray-300'} />
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Prazo de Entrega</p>
                    <p className="text-base font-black text-gray-900">{initialOrder.prazoEntrega}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${prazoColor}`}>
                      {days === null ? '—' : days < 0 ? `VENCIDO há ${Math.abs(days)} dia(s)` : days === 0 ? 'VENCE HOJE' : `${days} dias restantes`}
                    </p>
                  </div>
                </div>
              )}

              {/* Entrega */}
              {(initialOrder.endereco || initialOrder.transportadora || initialOrder.rastreio || isDelivery) && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">🚚 Entrega</p>
                  {initialOrder.endereco && (
                    <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                      <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      <div><p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Endereço</p><p className="text-xs font-semibold text-gray-800">{initialOrder.endereco}</p></div>
                    </div>
                  )}
                  {initialOrder.transportadora && (
                    <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                      <Truck size={14} className="text-gray-400" />
                      <div><p className="text-[9px] text-gray-400 font-bold uppercase">Transportadora</p><p className="text-xs font-semibold text-gray-800">{initialOrder.transportadora}</p></div>
                    </div>
                  )}
                  {initialOrder.rastreio && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <p className="text-[9px] text-blue-400 font-bold uppercase mb-1">Código de Rastreio</p>
                      <p className="text-xs font-bold font-mono text-blue-700">{initialOrder.rastreio}</p>
                    </div>
                  )}
                  {initialOrder.dataDespacho && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <div><p className="text-[9px] text-emerald-600 font-bold uppercase">Despachado em</p><p className="text-xs font-semibold text-gray-800">{initialOrder.dataDespacho}</p></div>
                    </div>
                  )}
                </div>
              )}

              {/* Obs */}
              {initialOrder.obs && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mb-1 flex items-center gap-1"><AlertTriangle size={10} /> Observação</p>
                  <p className="text-sm text-gray-800">{initialOrder.obs}</p>
                </div>
              )}

              {/* Fluxo */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">⚙ Fluxo Cross-Docking</p>
                <div className="relative">
                  <div className="absolute left-[17px] top-4 bottom-4 w-px bg-gray-200" />
                  <div className="space-y-1.5">
                    {ALL_STAGES.map((s, i) => {
                      const currentIdx = ALL_STAGES.indexOf(stage)
                      const isDone = i < currentIdx; const isCurrent = i === currentIdx
                      return (
                        <div key={s} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all relative ${isDone ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : isCurrent ? 'bg-amber-50 border-2 border-amber-300 text-amber-800 font-bold shadow-sm' : 'bg-white border border-gray-100 text-gray-400'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black z-10 ${isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'text-white' : 'bg-gray-100 border-2 border-gray-200 text-gray-400'}`} style={isCurrent ? { background: '#b45309' } : {}}>
                            {isDone ? '✓' : isCurrent ? '▶' : i + 1}
                          </div>
                          <span className="flex-1">{STAGE_ICON[s]} {s}</span>
                          {isDone && <span className="text-[10px] text-emerald-500 font-semibold">Concluído ✓</span>}
                          {isCurrent && <span className="text-[10px] font-bold" style={{ color: '#b45309' }}>EM ANDAMENTO</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: Editar ─── */}
          {tab === 'editar' && (
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📷 Foto do Produto</p>
                <PhotoZone value={edit.fotoUrl} onChange={v => setE('fotoUrl', v)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-500 mb-1 block">SKU</label><input className="input font-mono" value={edit.sku} onChange={e => setE('sku', e.target.value)} /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Tamanho</label><input className="input" value={edit.tamanho} onChange={e => setE('tamanho', e.target.value)} /></div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">👤 Cliente</p>
                <input className="input mb-2" placeholder="Nome *" value={edit.cliente} onChange={e => setE('cliente', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="E-mail" value={edit.clienteEmail} onChange={e => setE('clienteEmail', e.target.value)} />
                  <input className="input" placeholder="Telefone" value={edit.clienteTelefone} onChange={e => setE('clienteTelefone', e.target.value)} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🛒 Produto no Site</p>
                <input className="input mb-2" placeholder="Nome no site *" value={edit.produto} onChange={e => setE('produto', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                    <select className="input" value={edit.categoria} onChange={e => setE('categoria', e.target.value)}>
                      {CATEGORIAS_LV.map(c => <option key={c}>{c}</option>)}
                    </select></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Canal</label>
                    <select className="input" value={edit.canal} onChange={e => setE('canal', e.target.value)}>
                      {CANAIS.map(c => <option key={c}>{c}</option>)}
                    </select></div>
                </div>
                <input className="input mt-2" placeholder="Cor / Variação *" value={edit.cor} onChange={e => setE('cor', e.target.value)} />
              </div>
              <div className="border border-blue-100 rounded-xl p-3 space-y-2" style={{ background: '#eff6ff' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#1d4ed8' }}>🏭 Fornecedor</p>
                <input className="input" placeholder="Nome no fornecedor" value={edit.nomeFornecedor} onChange={e => setE('nomeFornecedor', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input font-mono" placeholder="Código fornecedor" value={edit.codigoFornecedor} onChange={e => setE('codigoFornecedor', e.target.value)} />
                  <input className="input" placeholder="Nome do fornecedor" value={edit.transportadora} onChange={e => setE('transportadora', e.target.value)} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">💰 Valores</p>
                <div className="grid grid-cols-3 gap-2">
                  <input className="input" type="number" min={1} placeholder="Qtd" value={edit.quantidade} onChange={e => setE('quantidade', parseInt(e.target.value) || 1)} />
                  <input className="input" placeholder="Valor (R$)" value={edit.valor} onChange={e => setE('valor', e.target.value)} />
                  <input className="input" placeholder="Frete (R$)" value={edit.frete} onChange={e => setE('frete', e.target.value)} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🚚 Entrega ao Cliente</p>
                <input className="input mb-2" placeholder="Endereço" value={edit.endereco} onChange={e => setE('endereco', e.target.value)} />
                <input className="input" placeholder="Prazo de entrega (dd/mm/aaaa)" value={edit.prazoEntrega} onChange={e => setE('prazoEntrega', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Observações</label>
                <textarea className="input resize-none" rows={2} value={edit.obs} onChange={e => setE('obs', e.target.value)} />
              </div>
            </div>
          )}

          {/* ─── Tab: Histórico ─── */}
          {tab === 'historico' && (
            <div className="p-5">
              {loadingH ? (
                <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-amber-500" /></div>
              ) : historico.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">📜</p>
                  <p className="text-sm font-semibold text-gray-500">Nenhuma edição registrada</p>
                  <p className="text-xs mt-1">As alterações feitas aparecerão aqui</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.map(h => (
                    <div key={h.id} className="border border-gray-100 rounded-xl p-3 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{FIELD_LABELS[h.campo] ?? h.campo}</span>
                        <span className="text-[10px] text-gray-400">{new Date(h.alterado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2"><p className="text-[9px] text-red-400 font-bold uppercase mb-0.5">Antes</p><p className="text-red-700 font-medium break-all">{h.valor_anterior ?? '—'}</p></div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2"><p className="text-[9px] text-emerald-500 font-bold uppercase mb-0.5">Depois</p><p className="text-emerald-700 font-medium break-all">{h.valor_novo ?? '—'}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-100 shrink-0 bg-white">
          {tab === 'editar' ? (
            <>
              <button onClick={() => setTab('detalhes')} className="btn-secondary flex-1 justify-center text-sm">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={saving || !edit.cliente.trim() || !edit.produto.trim() || !edit.cor.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: edit.cliente.trim() && edit.produto.trim() && edit.cor.trim() ? 'linear-gradient(135deg, #b45309, #d97706)' : '' }}
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                Salvar Alterações
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { if (window.confirm('Excluir este pedido permanentemente?')) { onDelete(); onClose() } }}
                className="p-2 border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                title="Excluir pedido"
              >
                <Trash2 size={15} />
              </button>
              <button onClick={onClose} className="btn-secondary flex-1 justify-center text-sm">Fechar</button>
              {stage !== 'Despachados' && (
                <button onClick={() => { onConclude(); onClose() }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white text-sm font-semibold"
                  style={{ background: stage === 'Pronto para Envio' ? '#059669' : 'linear-gradient(135deg, #b45309, #d97706)' }}
                >
                  {stage === 'Pronto para Envio' ? <><Send size={14} /> Confirmar Despacho</> : <><ArrowRight size={14} /> Avançar Etapa</>}
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── New Order Modal ──────────────────────────────────────────────────────────

function NewOrderModal({ onClose, onSave }: { onClose: () => void; onSave: (o: Omit<LVOrder, 'id' | 'data' | 'hora' | 'status'>) => Promise<boolean> }) {
  const [form, setForm] = useState({
    cliente: '', clienteEmail: '', clienteTelefone: '',
    produto: '', nomeFornecedor: '', codigoFornecedor: '', sku: '',
    fotoUrl: '', categoria: CATEGORIAS_LV[0], tamanho: '', cor: '',
    quantidade: 1, canal: 'Site', obs: '', endereco: '',
    transportadora: '', prazoEntrega: '', valor: '', frete: '',
  })
  const set = (field: string, val: any) => {
    // Auto-preenche fornecedor quando a categoria tem um fornecedor padrão
    if (field === 'categoria') {
      const fornecedorSugerido = FORNECEDOR_SUGERIDO[val as string] ?? ''
      setForm(p => ({ ...p, categoria: val, nomeFornecedor: fornecedorSugerido || p.nomeFornecedor }))
    } else {
      setForm(p => ({ ...p, [field]: val }))
    }
  }

  const handleSave = async () => {
    if (!form.cliente.trim() || !form.produto.trim()) return
    const ok = await onSave({
      cliente: form.cliente, clienteEmail: form.clienteEmail || undefined,
      clienteTelefone: form.clienteTelefone || undefined,
      produto: form.produto, nomeFornecedor: form.nomeFornecedor || undefined,
      codigoFornecedor: form.codigoFornecedor || undefined, sku: form.sku || undefined,
      fotoUrl: form.fotoUrl || undefined, categoria: form.categoria,
      tamanho: form.tamanho || undefined, cor: form.cor || undefined,
      quantidade: form.quantidade, canal: form.canal,
      obs: form.obs || undefined, endereco: form.endereco || undefined,
      transportadora: form.transportadora || undefined,
      prazoEntrega: form.prazoEntrega || undefined,
      valor: form.valor ? parseFloat(form.valor) : undefined,
      frete: form.frete ? parseFloat(form.frete) : undefined,
    })
    if (ok) onClose()
  }

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}><Plus size={16} className="text-white" /></div>
            <div><h3 className="font-bold text-gray-900">Novo Pedido — Lar e Vida</h3><p className="text-xs text-gray-400">Preencha os dados do pedido</p></div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📷 Foto do Produto</p>
            <PhotoZone value={form.fotoUrl} onChange={v => set('fotoUrl', v)} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"># SKU / Código</p>
            <div className="grid grid-cols-2 gap-2">
              <input className="input font-mono" placeholder="SKU da loja (ex: TAP-001)" value={form.sku} onChange={e => set('sku', e.target.value)} />
              <input className="input" placeholder="Tamanho (ex: 140x200cm)" value={form.tamanho} onChange={e => set('tamanho', e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">👤 Cliente</p>
            <input className="input mb-2" placeholder="Nome do cliente *" value={form.cliente} onChange={e => set('cliente', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="E-mail" value={form.clienteEmail} onChange={e => set('clienteEmail', e.target.value)} />
              <input className="input" placeholder="Telefone" value={form.clienteTelefone} onChange={e => set('clienteTelefone', e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🛒 Produto no Site / Marketplace</p>
            <input className="input mb-2" placeholder="Nome do produto como aparece no site *" value={form.produto} onChange={e => set('produto', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                <select className="input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>{CATEGORIAS_LV.map(c => <option key={c}>{c}</option>)}</select>
              </div>
              <div><label className="text-xs text-gray-500 mb-1 block">Canal de venda</label>
                <select className="input" value={form.canal} onChange={e => set('canal', e.target.value)}>{CANAIS.map(c => <option key={c}>{c}</option>)}</select>
              </div>
            </div>
            <input className="input mt-2" placeholder="Cor / Variação *" value={form.cor} onChange={e => set('cor', e.target.value)} />
          </div>
          <div className="border border-blue-100 rounded-xl p-3 space-y-2" style={{ background: '#eff6ff' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#1d4ed8' }}>🏭 Produto no Fornecedor (Cross-Docking)</p>
            <input className="input" placeholder="Nome do produto no fornecedor" value={form.nomeFornecedor} onChange={e => set('nomeFornecedor', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input font-mono" placeholder="Código do fornecedor" value={form.codigoFornecedor} onChange={e => set('codigoFornecedor', e.target.value)} />
              <input className="input" placeholder="Nome do fornecedor" value={form.transportadora} onChange={e => set('transportadora', e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">💰 Valores</p>
            <div className="grid grid-cols-3 gap-2">
              <input className="input" placeholder="Qtd." type="number" min={1} value={form.quantidade} onChange={e => set('quantidade', parseInt(e.target.value) || 1)} />
              <input className="input" placeholder="Valor (R$)" value={form.valor} onChange={e => set('valor', e.target.value)} />
              <input className="input" placeholder="Frete (R$)" value={form.frete} onChange={e => set('frete', e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🚚 Entrega ao Cliente</p>
            <input className="input mb-2" placeholder="Endereço de entrega" value={form.endereco} onChange={e => set('endereco', e.target.value)} />
            <input className="input" placeholder="Prazo de entrega ao cliente (dd/mm/aaaa) *" value={form.prazoEntrega} onChange={e => set('prazoEntrega', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Observações</label>
            <textarea className="input resize-none" rows={2} placeholder="Observações do cliente..." value={form.obs} onChange={e => set('obs', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 p-4 pt-3 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={handleSave} disabled={!form.cliente.trim() || !form.produto.trim() || !form.cor.trim() || !form.prazoEntrega.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold transition-colors disabled:opacity-50"
            style={{ background: form.cliente.trim() && form.produto.trim() && form.cor.trim() && form.prazoEntrega.trim() ? 'linear-gradient(135deg, #b45309, #d97706)' : '' }}
          >
            <Check size={16} /> Salvar Pedido
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Tapete Order Modal ───────────────────────────────────────────────────────

// Tamanhos de fallback (quando nenhuma coleção foi escolhida)
const TAMANHOS_RAPIDOS = [
  '1,00 × 1,50', '1,40 × 2,00',
  '2,00 × 2,50', '2,40 × 3,00',
  '2,50 × 3,50', '3,00 × 4,00',
  '3,00 × 5,00', '3,50 × 4,50',
]
// Coleções derivadas do catálogo Tellaio (src/data/precosTapetesLV.ts)
const COLECOES_RIOS = colecoesDaLinha('RIOS')
const COLECOES_LAGOS = colecoesDaLinha('LAGOS')
const COLECOES_TODAS = [...COLECOES_RIOS, ...COLECOES_LAGOS]

// ─── Tapete Item (sub-form for one rug) ──────────────────────────────────────

interface TapeteItem {
  uid: string
  produto: string
  tamanho: string
  cor: string                 // coleção (ex: 'NAKURU')
  desenho: string             // ex: '03' (zfill 2) — usado pra montar SKU Tellaio
  sku: string                 // código Tellaio (ex: '000218.006.002') — auto-fill
  fotoUrl: string
  quantidade: number
  valor: string
  customTamanho: boolean
  collapsed: boolean
}

function newTapeteItem(): TapeteItem {
  return {
    uid: Math.random().toString(36).slice(2),
    produto: '', tamanho: '', cor: '', desenho: '', sku: '', fotoUrl: '',
    quantidade: 1, valor: '', customTamanho: false, collapsed: false,
  }
}

function TapeteItemCard({
  item, index, total,
  onUpdate, onRemove, estoqueFornecedor,
}: {
  item: TapeteItem; index: number; total: number
  onUpdate: (uid: string, patch: Partial<TapeteItem>) => void
  onRemove: (uid: string) => void
  estoqueFornecedor: TapeteFornecedor[]
}) {
  const set = (k: keyof TapeteItem, v: any) => onUpdate(item.uid, { [k]: v })
  const subtotal = item.valor && parseFloat(item.valor) > 0
    ? parseFloat(item.valor) * item.quantidade
    : null

  const hasContent = item.produto.trim() || item.tamanho || item.cor || item.fotoUrl

  // ── Integração com catálogo Tellaio ──
  const colecaoInfo = findColecao(item.cor)
  const availableSizes: PrecoTamanho[] = colecaoInfo?.tamanhos ?? []
  const currentPreco = findPreco(item.cor, item.tamanho)

  // Auto-fill do valor quando (coleção + tamanho válidos, não-custom)
  useEffect(() => {
    if (item.customTamanho) return
    if (!currentPreco) return
    const expected = currentPreco.valor.toFixed(2)
    if (item.valor !== expected) {
      onUpdate(item.uid, { valor: expected })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.cor, item.tamanho, item.customTamanho])

  // Auto-fill do SKU Tellaio quando coleção + tamanho + desenho casarem com o catálogo
  const codTellaio = (!item.customTamanho && item.cor && item.tamanho && item.desenho)
    ? findCodigoTapete(item.cor, item.tamanho, item.desenho)
    : null
  useEffect(() => {
    if (codTellaio && item.sku !== codTellaio.codigo) {
      onUpdate(item.uid, { sku: codTellaio.codigo })
    } else if (!codTellaio && item.sku && (!item.cor || !item.tamanho || !item.desenho)) {
      // limpa SKU se a combinação ficou incompleta (evita SKU desatualizado)
      onUpdate(item.uid, { sku: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.cor, item.tamanho, item.desenho, item.customTamanho])

  // Desenhos conhecidos (vistos em NF) pra mostrar como sugestões
  const desenhosSugeridos = item.cor ? desenhosConhecidosTapete(item.cor) : []

  // Badge de restrição de desenho
  const restricaoBadge = currentPreco?.desenhos
    ? `Só desenho ${currentPreco.desenhos.join(' ou ')}`
    : currentPreco?.desenhosExcluidos
      ? `Não faz desenho ${currentPreco.desenhosExcluidos.join(' ou ')}`
      : null

  return (
    <div className="border-2 border-amber-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Card Header — always visible */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer select-none hover:bg-amber-50/60 transition-colors"
        onClick={() => set('collapsed', !item.collapsed)}
      >
        {/* Miniatura */}
        {item.fotoUrl ? (
          <img src={item.fotoUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-amber-200 shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-amber-50 border-2 border-dashed border-amber-200 flex items-center justify-center text-base shrink-0">🏠</div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest leading-none mb-0.5">
            Tapete {index + 1} {total > 1 ? `de ${total}` : ''}
          </p>
          <p className={`text-sm font-semibold leading-tight truncate ${hasContent ? 'text-gray-900' : 'text-gray-400 italic'}`}>
            {item.produto || 'Sem nome ainda...'}
          </p>
          {(item.tamanho || item.cor) && (
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">
              {[item.tamanho, item.cor].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {subtotal !== null && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {item.quantidade}x
          </span>
          {total > 1 && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onRemove(item.uid) }}
              className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
              title="Remover este tapete"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-200 ${item.collapsed ? '' : 'rotate-180'}`}
          />
        </div>
      </div>

      {/* Card Body — collapsible */}
      <AnimatePresence initial={false}>
        {!item.collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-4 border-t border-amber-100 bg-amber-50/30">

              {/* Foto */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📷 Foto / Miniatura</p>
                <PhotoZone value={item.fotoUrl} onChange={v => set('fotoUrl', v)} />
              </div>

              {/* Nome */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">🏠 Nome do Tapete *</p>
                <input
                  className="input"
                  placeholder="Ex: Tapete Egípcio Lumière Luxo"
                  value={item.produto}
                  onChange={e => set('produto', e.target.value)}
                />
              </div>

              {/* Tamanho */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📐 Tamanho</p>
                  {colecaoInfo && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                      Catálogo {colecaoInfo.linha} · {availableSizes.length} tamanho{availableSizes.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(availableSizes.length > 0
                    ? availableSizes.map(t => t.tamanho)
                    : TAMANHOS_RAPIDOS
                  ).map(t => {
                    const precoT = availableSizes.find(s => s.tamanho === t)
                    const isSelected = item.tamanho === t && !item.customTamanho
                    return (
                      <button key={t} type="button"
                        onClick={() => { set('tamanho', t); set('customTamanho', false) }}
                        title={precoT ? `R$ ${precoT.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'text-white border-amber-600'
                            : 'border-gray-200 text-gray-600 bg-white hover:border-amber-300 hover:text-amber-700'
                        }`}
                        style={isSelected ? { background: 'linear-gradient(135deg, #b45309, #d97706)' } : {}}
                      >
                        {t}
                        {precoT?.desenhos && (
                          <span className={`text-[8px] font-bold px-1 rounded ${isSelected ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                            D{precoT.desenhos.join('/')}
                          </span>
                        )}
                        {precoT?.desenhosExcluidos && (
                          <span className={`text-[8px] font-bold px-1 rounded ${isSelected ? 'bg-white/20' : 'bg-red-100 text-red-700'}`}>
                            ✕D{precoT.desenhosExcluidos.join('/')}
                          </span>
                        )}
                      </button>
                    )
                  })}
                  <button type="button"
                    onClick={() => { set('customTamanho', true); set('tamanho', '') }}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                      item.customTamanho
                        ? 'text-white border-amber-600'
                        : 'border-dashed border-gray-300 text-gray-400 hover:border-amber-300 hover:text-amber-600'
                    }`}
                    style={item.customTamanho ? { background: 'linear-gradient(135deg, #b45309, #d97706)' } : {}}
                  >+ Outro</button>
                </div>
                {item.customTamanho && (
                  <input
                    className="input"
                    placeholder="Ex: 1,20 × 1,70m"
                    value={item.tamanho}
                    onChange={e => set('tamanho', e.target.value)}
                    autoFocus
                  />
                )}
                {restricaoBadge && (
                  <p className="text-[10px] font-semibold mt-1 text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
                    ⚠️ {restricaoBadge}
                  </p>
                )}
                {currentPreco && !item.customTamanho && (
                  <p className="text-[10px] text-emerald-700 mt-1.5 flex items-center gap-1">
                    <span className="font-bold">✓ Preço Tellaio:</span>
                    <span className="font-mono font-bold">R$ {currentPreco.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-gray-400">— preenchido automaticamente</span>
                  </p>
                )}
              </div>

              {/* Coleção / Desenho */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">🎨 Coleção (Desenho) *</p>
                  {colecaoInfo && (
                    <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full font-mono">
                      R$ {colecaoInfo.m2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/m²
                    </span>
                  )}
                </div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">— Linha RIOS</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COLECOES_RIOS.map(d => (
                    <button key={d} type="button"
                      onClick={() => set('cor', item.cor === d ? '' : d)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                        item.cor === d
                          ? 'text-white border-amber-600'
                          : 'border-gray-200 text-gray-600 bg-white hover:border-amber-300 hover:text-amber-700'
                      }`}
                      style={item.cor === d ? { background: 'linear-gradient(135deg, #b45309, #d97706)' } : {}}
                    >{d}</button>
                  ))}
                </div>
                {COLECOES_LAGOS.length > 0 && (
                  <>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 mt-2">— Linha LAGOS</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COLECOES_LAGOS.map(d => (
                        <button key={d} type="button"
                          onClick={() => set('cor', item.cor === d ? '' : d)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                            item.cor === d
                              ? 'text-white border-blue-600'
                              : 'border-gray-200 text-gray-600 bg-white hover:border-blue-300 hover:text-blue-700'
                          }`}
                          style={item.cor === d ? { background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' } : {}}
                        >{d}</button>
                      ))}
                    </div>
                  </>
                )}
                <input
                  className="input mt-1"
                  placeholder="Ou digite o nome da coleção manualmente..."
                  value={item.cor}
                  onChange={e => set('cor', e.target.value)}
                />
              </div>

              {/* Desenho + SKU Tellaio */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">🖼️ Desenho</p>
                <div className="flex items-center gap-2">
                  <input
                    className="input w-20 font-mono text-center"
                    placeholder="03"
                    value={item.desenho}
                    onChange={e => {
                      // normaliza pra zfill 2 (ex: "3" → "03"); aceita vazio
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 3)
                      set('desenho', raw ? raw.padStart(2, '0') : '')
                    }}
                  />
                  {desenhosSugeridos.length > 0 && (
                    <div className="flex flex-wrap gap-1 flex-1">
                      {desenhosSugeridos.map(d => (
                        <button key={d} type="button"
                          onClick={() => set('desenho', item.desenho === d ? '' : d)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                            item.desenho === d
                              ? 'bg-amber-100 border-amber-400 text-amber-800'
                              : 'border-gray-200 text-gray-500 bg-white hover:border-amber-300 hover:text-amber-700'
                          }`}
                        >D{d}</button>
                      ))}
                    </div>
                  )}
                </div>
                {item.cor && desenhosSugeridos.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Nenhum desenho cadastrado pra {item.cor} — digite o número manualmente.
                  </p>
                )}
                {codTellaio && (
                  <p className="text-[10px] text-emerald-700 mt-1.5 flex items-center gap-1.5">
                    <span className="font-bold">✓ Código Tellaio:</span>
                    <span className="font-mono font-bold">{codTellaio.codigo}</span>
                    {codTellaio.ean && (
                      <span className="text-gray-400 font-mono">· EAN {codTellaio.ean}</span>
                    )}
                  </p>
                )}
                {!codTellaio && item.cor && item.tamanho && item.desenho && !item.customTamanho && (
                  <p className="text-[10px] text-amber-600 mt-1.5">
                    ⚠️ Combinação ainda não cadastrada — SKU ficará vazio.
                  </p>
                )}
              </div>

              {/* Quantidade e valor */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">💰 Quantidade e Valor</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Quantidade</label>
                    <div className="flex items-center gap-1">
                      <button type="button"
                        onClick={() => set('quantidade', Math.max(1, item.quantidade - 1))}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg"
                      >−</button>
                      <span className="flex-1 text-center text-lg font-black text-gray-900">{item.quantidade}</span>
                      <button type="button"
                        onClick={() => set('quantidade', item.quantidade + 1)}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg"
                      >+</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Preço unitário (R$)</label>
                    <input
                      className="input"
                      placeholder="0,00"
                      value={item.valor}
                      onChange={e => set('valor', e.target.value)}
                      type="number" min={0} step={0.01}
                    />
                  </div>
                </div>
                {subtotal !== null && (
                  <div className="mt-2 text-right text-xs text-gray-500">
                    Subtotal: <span className="font-bold text-emerald-600">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Cama Item (sub-form for one bed collection) ─────────────────────────────

interface CamaSkuRow {
  uid: string
  variante: string       // nome da variante no catálogo (ex: "Des. 1 - Branco") OU texto livre
  tamanho: string        // tamanho específico (ex: "Queen")
  sku: string            // SKU livre (opcional) — auto-fill com código Tellaio
  qtd: number
  valor?: number         // R$ unitário — auto-fill com preço de custo Tellaio
}

interface CamaItem {
  uid: string
  produto: string        // Nome do modelo (do catálogo ou texto livre)
  modeloLivre: boolean   // true = produto não veio do catálogo
  descricao: string      // Subtítulo opcional
  fotoUrl: string
  valor: string          // Preço unitário (opcional)
  itens: CamaSkuRow[]    // Lista estruturada de itens
  collapsed: boolean
}

function newCamaItem(): CamaItem {
  return {
    uid: Math.random().toString(36).slice(2),
    produto: '', modeloLivre: false, descricao: '', fotoUrl: '',
    valor: '', itens: [], collapsed: false,
  }
}

function newCamaSkuRow(): CamaSkuRow {
  return {
    uid: Math.random().toString(36).slice(2),
    variante: '', tamanho: '', sku: '', qtd: 1,
  }
}

// Serializa rows estruturados em { sku, descricao, qtd, valor } para gravar em itensCama
function camaRowsToSkus(
  modelo: string, rows: CamaSkuRow[],
): Array<{ sku: string; descricao: string; qtd: number; valor?: number }> {
  return rows
    .filter(r => r.qtd > 0 && (r.variante.trim() || r.tamanho.trim() || r.sku.trim()))
    .map(r => ({
      sku: r.sku.trim(),
      descricao: [modelo, r.variante, r.tamanho].map(s => s.trim()).filter(Boolean).join(' · '),
      qtd: r.qtd,
      ...(typeof r.valor === 'number' ? { valor: r.valor } : {}),
    }))
}

function CamaItemCard({
  item, index, total,
  onUpdate, onRemove,
}: {
  item: CamaItem; index: number; total: number
  onUpdate: (uid: string, patch: Partial<CamaItem>) => void
  onRemove: (uid: string) => void
}) {
  const set = (k: keyof CamaItem, v: any) => onUpdate(item.uid, { [k]: v })

  const modelo = !item.modeloLivre ? findModelo(item.produto) : undefined
  const totalUnid = item.itens.reduce((s, r) => s + (r.qtd > 0 ? r.qtd : 0), 0)
  const subtotal = item.valor && parseFloat(item.valor) > 0 && totalUnid > 0
    ? parseFloat(item.valor) * totalUnid
    : null
  const itensValidos = item.itens.filter(r => r.variante.trim() || r.tamanho.trim() || r.sku.trim())
  const hasContent = item.produto.trim() || item.descricao.trim() || item.fotoUrl || itensValidos.length > 0

  // Row helpers
  const updateRow = (uid: string, patch: Partial<CamaSkuRow>) => {
    set('itens', item.itens.map(r => r.uid === uid ? { ...r, ...patch } : r))
  }
  const removeRow = (uid: string) => {
    set('itens', item.itens.filter(r => r.uid !== uid))
  }
  const addRow = () => {
    set('itens', [...item.itens, newCamaSkuRow()])
  }

  return (
    <div className="border-2 border-blue-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Card Header — always visible */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer select-none hover:bg-blue-50/60 transition-colors"
        onClick={() => set('collapsed', !item.collapsed)}
      >
        {item.fotoUrl ? (
          <img src={item.fotoUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-blue-200 shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center text-base shrink-0">🛏️</div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-0.5">
            Cama {index + 1} {total > 1 ? `de ${total}` : ''}
          </p>
          <p className={`text-sm font-semibold leading-tight truncate ${hasContent ? 'text-gray-900' : 'text-gray-400 italic'}`}>
            {item.produto || 'Sem nome ainda...'}
          </p>
          {(item.descricao || itensValidos.length > 0) && (
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">
              {[item.descricao, itensValidos.length > 0 ? `${itensValidos.length} itens` : ''].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {subtotal !== null && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          {totalUnid > 0 && (
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {totalUnid}x
            </span>
          )}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRemove(item.uid) }}
            className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
            title="Remover esta cama"
          >
            <X size={14} />
          </button>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-200 ${item.collapsed ? '' : 'rotate-180'}`}
          />
        </div>
      </div>

      {/* Card Body — collapsible */}
      <AnimatePresence initial={false}>
        {!item.collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-4 border-t border-blue-100 bg-blue-50/30">

              {/* Foto */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📷 Foto / Miniatura</p>
                <PhotoZone value={item.fotoUrl} onChange={v => set('fotoUrl', v)} />
              </div>

              {/* Modelo */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">🛏️ Modelo *</p>
                {!item.modeloLivre ? (
                  <select
                    className="input"
                    value={item.produto}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '__OUTRO__') {
                        onUpdate(item.uid, { modeloLivre: true, produto: '', itens: [] })
                      } else {
                        onUpdate(item.uid, { produto: v, itens: [] })
                      }
                    }}
                  >
                    <option value="">Selecione um modelo do catálogo Tellaio…</option>
                    {MODELOS_CAMA.map(m => (
                      <option key={m.nome} value={m.nome}>{m.nome}</option>
                    ))}
                    <option value="__OUTRO__">Outro (texto livre)</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Ex: Coleção BAMBU"
                      value={item.produto}
                      onChange={e => set('produto', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdate(item.uid, { modeloLivre: false, produto: '', itens: [] })}
                      className="text-[11px] text-blue-600 hover:underline px-2"
                    >
                      ↩ Catálogo
                    </button>
                  </div>
                )}
              </div>

              {/* Descrição */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">📝 Descrição (opcional)</p>
                <input
                  className="input"
                  placeholder="Notas, sub-categoria, etc."
                  value={item.descricao}
                  onChange={e => set('descricao', e.target.value)}
                />
              </div>

              {/* Itens do pedido */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📦 Itens do Pedido</p>
                  {itensValidos.length > 0 && (
                    <span className="text-[10px] text-blue-600 font-semibold">
                      {itensValidos.length} item{itensValidos.length !== 1 ? 's' : ''} · {totalUnid} unid.
                    </span>
                  )}
                </div>

                {item.itens.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic py-2">
                    Nenhum item ainda. Adicione abaixo.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {item.itens.map((row, idx) => (
                      <CamaSkuRowEditor
                        key={row.uid}
                        row={row}
                        idx={idx}
                        modelo={modelo}
                        modeloLivre={item.modeloLivre}
                        onUpdate={updateRow}
                        onRemove={removeRow}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={addRow}
                  disabled={!item.modeloLivre && !modelo}
                  className="mt-2 w-full text-xs font-semibold py-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  + Adicionar item
                </button>
                {!item.modeloLivre && !modelo && (
                  <p className="text-[10px] text-gray-400 mt-1">Selecione um modelo primeiro.</p>
                )}
              </div>

              {/* Valor */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">💰 Preço Unitário (R$)</p>
                <input
                  className="input"
                  placeholder="0,00"
                  value={item.valor}
                  onChange={e => set('valor', e.target.value)}
                  type="number" min={0} step={0.01}
                />
                {subtotal !== null && (
                  <div className="mt-2 text-right text-xs text-gray-500">
                    Subtotal: <span className="font-bold text-emerald-600">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Cama SKU Row Editor ──────────────────────────────────────────────────────

function CamaSkuRowEditor({
  row, idx, modelo, modeloLivre, onUpdate, onRemove,
}: {
  row: CamaSkuRow
  idx: number
  modelo: ReturnType<typeof findModelo>
  modeloLivre: boolean
  onUpdate: (uid: string, patch: Partial<CamaSkuRow>) => void
  onRemove: (uid: string) => void
}) {
  const set = (k: keyof CamaSkuRow, v: any) => onUpdate(row.uid, { [k]: v })
  const variante = modelo ? findVariante(modelo.nome, row.variante) : undefined
  const tamanhoInfo: DisponibilidadeTamanho | undefined =
    variante?.tamanhos.find(t => t.tamanho === row.tamanho)

  // Auto-fill SKU (código Tellaio) e Valor (preço de custo c/ IPI) quando
  // modelo+variante+tamanho casarem com o catálogo (src/data/codigosTellaio.ts).
  useEffect(() => {
    if (modeloLivre || !modelo) return
    if (!row.variante || !row.tamanho) return
    const cod = findCodigoCama(modelo.nome, row.variante, row.tamanho)
    if (!cod) return
    const patch: Partial<CamaSkuRow> = {}
    if (row.sku !== cod.codigo) patch.sku = cod.codigo
    if (cod.precoCusto != null && row.valor !== cod.precoCusto) patch.valor = cod.precoCusto
    if (Object.keys(patch).length > 0) onUpdate(row.uid, patch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.variante, row.tamanho, modelo?.nome, modeloLivre])
  const precoCusto = (!modeloLivre && modelo && row.variante && row.tamanho)
    ? findPrecoCustoCama(modelo.nome, row.variante, row.tamanho)
    : null

  return (
    <div className="bg-white border border-blue-100 rounded-lg p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0">#{idx + 1}</span>
        {/* Variante */}
        {modeloLivre || !modelo ? (
          <input
            className="input flex-1 text-xs h-8"
            placeholder="Variante (ex: Branco)"
            value={row.variante}
            onChange={e => set('variante', e.target.value)}
          />
        ) : (
          <select
            className="input flex-1 text-xs h-8"
            value={row.variante}
            onChange={e => onUpdate(row.uid, { variante: e.target.value, tamanho: '' })}
          >
            <option value="">Variante…</option>
            {modelo.variantes.map(v => (
              <option key={v.nome} value={v.nome}>{v.nome}</option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => onRemove(row.uid)}
          className="p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 shrink-0"
          title="Remover item"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 pl-6">
        {/* Tamanho */}
        {modeloLivre || !variante ? (
          <input
            className="input flex-1 text-xs h-8"
            placeholder="Tamanho"
            value={row.tamanho}
            onChange={e => set('tamanho', e.target.value)}
          />
        ) : (
          <select
            className="input flex-1 text-xs h-8"
            value={row.tamanho}
            onChange={e => set('tamanho', e.target.value)}
          >
            <option value="">Tamanho…</option>
            {variante.tamanhos.map(t => (
              <option key={t.tamanho} value={t.tamanho}>
                {t.tamanho}{!t.disponivel ? ` (indisponível${t.previsao ? ` — prev. ${t.previsao}` : ''})` : ''}
              </option>
            ))}
          </select>
        )}
        {/* SKU */}
        <input
          className="input w-32 text-xs h-8 font-mono"
          placeholder="SKU (opcional)"
          value={row.sku}
          onChange={e => set('sku', e.target.value)}
        />
        {/* Qtd */}
        <input
          className="input w-14 text-xs h-8 text-center"
          type="number" min={1} step={1}
          value={row.qtd}
          onChange={e => set('qtd', Math.max(1, parseInt(e.target.value, 10) || 1))}
        />
      </div>

      {/* Valor unitário + subtotal */}
      <div className="flex items-center gap-1.5 pl-6">
        <span className="text-[10px] text-gray-400 font-semibold w-12 shrink-0">R$ unit.</span>
        <input
          className="input flex-1 text-xs h-8 font-mono"
          type="number" min={0} step={0.01}
          placeholder="0,00"
          value={typeof row.valor === 'number' ? row.valor : ''}
          onChange={e => {
            const v = e.target.value
            set('valor', v === '' ? undefined : parseFloat(v))
          }}
        />
        {typeof row.valor === 'number' && row.valor > 0 && (
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded font-mono font-bold whitespace-nowrap">
            = R$ {(row.valor * row.qtd).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>
      {precoCusto != null && row.valor !== precoCusto && (
        <p className="text-[10px] text-blue-600 pl-6">
          💡 Preço Tellaio: R$ {precoCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          <button
            type="button"
            onClick={() => set('valor', precoCusto)}
            className="ml-2 text-blue-700 underline hover:no-underline"
          >usar este</button>
        </p>
      )}

      {tamanhoInfo && !tamanhoInfo.disponivel && (
        <p className="text-[10px] text-amber-600 font-semibold pl-6">
          ⚠️ Indisponível{tamanhoInfo.previsao ? ` — previsão ${tamanhoInfo.previsao}` : ''}
        </p>
      )}
    </div>
  )
}

// ─── Tapete Order Modal ───────────────────────────────────────────────────────

function TapeteOrderModal({ onClose, onSave, estoqueFornecedor }: {
  onClose: () => void
  onSave: (o: Omit<LVOrder, 'id' | 'data' | 'hora' | 'status'>) => Promise<boolean>
  estoqueFornecedor: TapeteFornecedor[]
}) {
  // ── Estado: listas de itens no pedido ──
  const [tapetes, setTapetes] = useState<TapeteItem[]>([newTapeteItem()])
  const [camas, setCamas] = useState<CamaItem[]>([])
  const [tipoDestino, setTipoDestino] = useState<'cliente' | 'estoque'>('cliente')

  // Campos globais (fornecedor + obs aplicam-se a todos)
  const [fornecedor, setFornecedor] = useState('')
  const [nomeFornecedor, setNomeFornecedor] = useState('')
  const [codigoFornecedor, setCodigoFornecedor] = useState('')
  const [obs, setObs] = useState('')
  const [confirmacaoUrl, setConfirmacaoUrl] = useState('')
  const [prazoEntregaGlobal, setPrazoEntregaGlobal] = useState('')

  // ── Tapetes ──
  const updateItem = (uid: string, patch: Partial<TapeteItem>) =>
    setTapetes(prev => prev.map(t => t.uid === uid ? { ...t, ...patch } : t))

  const removeItem = (uid: string) =>
    setTapetes(prev => prev.filter(t => t.uid !== uid))

  const addItem = () => {
    setTapetes(prev => [...prev.map(t => ({ ...t, collapsed: true })), newTapeteItem()])
  }

  // ── Camas ──
  const updateCama = (uid: string, patch: Partial<CamaItem>) =>
    setCamas(prev => prev.map(c => c.uid === uid ? { ...c, ...patch } : c))

  const removeCama = (uid: string) =>
    setCamas(prev => prev.filter(c => c.uid !== uid))

  const addCama = () => {
    setCamas(prev => [...prev.map(c => ({ ...c, collapsed: true })), newCamaItem()])
    setTapetes(prev => prev.map(t => ({ ...t, collapsed: true })))
  }

  // ── Totais ──
  const totalTapetes = tapetes.reduce((sum, t) => {
    const v = t.valor ? parseFloat(t.valor) : 0
    return sum + v * t.quantidade
  }, 0)
  const totalCamas = camas.reduce((sum, c) => {
    const v = c.valor ? parseFloat(c.valor) : 0
    const unid = c.itens.reduce((s, r) => s + (r.qtd > 0 ? r.qtd : 0), 0)
    return sum + v * unid
  }, 0)
  const totalGeral = totalTapetes + totalCamas

  const validTapetes = tapetes.filter(t => t.produto.trim().length > 0 && t.cor.trim().length > 0)
  const validCamas = camas.filter(c => c.produto.trim().length > 0)
  const totalCards = validTapetes.length + validCamas.length
  const canSave = totalCards > 0 && (tipoDestino === 'estoque' || prazoEntregaGlobal.trim().length > 0)

  // Converte TapeteItem → LVOrder
  const tapeteToOrder = (t: TapeteItem): Omit<LVOrder, 'id' | 'data' | 'hora' | 'status'> => ({
    cliente: tipoDestino === 'estoque' ? 'COMPRA ESTOQUE' : 'PEDIDO FORNECEDOR',
    produto: t.produto || '(sem nome)',
    categoria: 'Tapete',
    sku: t.sku || undefined,
    tamanho: t.tamanho || undefined,
    cor: t.cor || undefined,
    desenho: t.desenho || undefined,
    fotoUrl: t.fotoUrl || undefined,
    nomeFornecedor: nomeFornecedor || undefined,
    codigoFornecedor: codigoFornecedor || undefined,
    quantidade: t.quantidade,
    valor: t.valor ? parseFloat(t.valor) : undefined,
    obs: obs || undefined,
    transportadora: fornecedor || undefined,
    canal: 'WhatsApp',
    tipoPedido: tipoDestino === 'estoque' ? 'estoque' : 'crossdocking',
    confirmacaoFornecedorUrl: confirmacaoUrl || undefined,
    prazoEntrega: tipoDestino === 'cliente' ? prazoEntregaGlobal || undefined : undefined,
  })

  // Converte CamaItem → LVOrder (com itensCama populado)
  const camaToOrder = (c: CamaItem): Omit<LVOrder, 'id' | 'data' | 'hora' | 'status'> => {
    const skus = camaRowsToSkus(c.produto, c.itens)
    const totalUnid = skus.reduce((s, i) => s + i.qtd, 0) || 1
    const produto = c.descricao
      ? `${c.produto} — ${c.descricao} (${skus.length} itens)`
      : `${c.produto} (${skus.length} itens)`
    return {
      cliente: tipoDestino === 'estoque' ? 'COMPRA ESTOQUE' : 'PEDIDO FORNECEDOR',
      produto: produto || '(sem nome)',
      categoria: 'Cama',
      fotoUrl: c.fotoUrl || undefined,
      nomeFornecedor: nomeFornecedor || 'TELLAIO',
      codigoFornecedor: codigoFornecedor || undefined,
      quantidade: totalUnid,
      valor: c.valor ? parseFloat(c.valor) : undefined,
      obs: obs || undefined,
      transportadora: fornecedor || undefined,
      canal: 'WhatsApp',
      tipoPedido: tipoDestino === 'estoque' ? 'estoque' : 'crossdocking',
      confirmacaoFornecedorUrl: confirmacaoUrl || undefined,
      prazoEntrega: tipoDestino === 'cliente' ? prazoEntregaGlobal || undefined : undefined,
      itensCama: skus.length > 0 ? skus : undefined,
    }
  }

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 580, maxHeight: '94vh', overflowY: 'auto' }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>📦</div>
            <div>
              <h3 className="font-bold text-gray-900">Pedido ao Fornecedor</h3>
              <p className="text-xs text-gray-400">
                {validTapetes.length > 0 && `${validTapetes.length} tapete${validTapetes.length !== 1 ? 's' : ''}`}
                {validTapetes.length > 0 && validCamas.length > 0 && ' · '}
                {validCamas.length > 0 && `${validCamas.length} cama${validCamas.length !== 1 ? 's' : ''}`}
                {totalCards === 0 && 'Sem itens'}
                {' · '}{tipoDestino === 'estoque' ? 'Para Estoque' : 'Para Cliente'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Toggle: Destino do pedido */}
          <div className="rounded-xl overflow-hidden border border-gray-200 flex">
            <button type="button" onClick={() => setTipoDestino('cliente')}
              className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${tipoDestino === 'cliente' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              style={tipoDestino === 'cliente' ? { background: 'linear-gradient(135deg, #b45309, #d97706)' } : {}}
            >🛒 Para Cliente</button>
            <button type="button" onClick={() => setTipoDestino('estoque')}
              className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-l border-gray-200 transition-all ${tipoDestino === 'estoque' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              style={tipoDestino === 'estoque' ? { background: 'linear-gradient(135deg, #0369a1, #0ea5e9)' } : {}}
            >🗄️ Para Estoque</button>
          </div>

          {/* Confirmação do fornecedor — só para estoque */}
          {tipoDestino === 'estoque' && (
            <div className="rounded-xl border border-blue-200 p-3 space-y-2" style={{ background: '#f0f9ff' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#0369a1' }}>📎 Confirmação do Fornecedor</p>
              <p className="text-[10px] text-blue-500">Anexe o PDF ou print do email de confirmação recebido</p>
              <ConfirmacaoZone value={confirmacaoUrl} onChange={setConfirmacaoUrl} />
            </div>
          )}

          {/* Fornecedor global */}
          <div className="border border-blue-100 rounded-xl p-3 space-y-2" style={{ background: '#eff6ff' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#1d4ed8' }}>🏭 Dados do Fornecedor</p>
            <input className="input" placeholder="Nome do fornecedor (ex: Tapetes Egípcio Ltda)" value={fornecedor} onChange={e => setFornecedor(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Nome/ref no fornecedor" value={nomeFornecedor} onChange={e => setNomeFornecedor(e.target.value)} />
              <input className="input font-mono" placeholder="Código (SKU fornecedor)" value={codigoFornecedor} onChange={e => setCodigoFornecedor(e.target.value)} />
            </div>
          </div>

          {/* Entrega ao Cliente (só para cliente) */}
          {tipoDestino === 'cliente' && (
            <div className="border border-amber-100 rounded-xl p-3 space-y-2" style={{ background: '#fffbeb' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#d97706' }}>🚚 Entrega ao Cliente</p>
              <input className="input" placeholder="Prazo de entrega ao cliente (dd/mm/aaaa) *" value={prazoEntregaGlobal} onChange={e => setPrazoEntregaGlobal(e.target.value)} />
            </div>
          )}

          {/* ── Lista de Tapetes ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                🏠 Tapetes do Pedido
              </p>
              <span className="text-[10px] text-gray-400">{tapetes.length} item{tapetes.length !== 1 ? 's' : ''}</span>
            </div>

            {tapetes.length > 0 ? (
              <div className="space-y-3">
                {tapetes.map((item, idx) => (
                  <TapeteItemCard
                    key={item.uid}
                    item={item}
                    index={idx}
                    total={tapetes.length}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                    estoqueFornecedor={estoqueFornecedor}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 italic py-2">Nenhum tapete adicionado.</p>
            )}

            {/* Botão Adicionar Tapete */}
            <button
              type="button"
              onClick={addItem}
              className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-amber-300 text-amber-600 text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors"
            >
              <Plus size={14} /> Adicionar {tapetes.length > 0 ? 'Outro' : ''} Tapete
            </button>
          </div>

          {/* ── Lista de Camas ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                🛏️ Camas do Pedido
              </p>
              <span className="text-[10px] text-gray-400">{camas.length} item{camas.length !== 1 ? 's' : ''}</span>
            </div>

            {camas.length > 0 ? (
              <div className="space-y-3">
                {camas.map((item, idx) => (
                  <CamaItemCard
                    key={item.uid}
                    item={item}
                    index={idx}
                    total={camas.length}
                    onUpdate={updateCama}
                    onRemove={removeCama}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 italic py-2">Nenhuma cama adicionada.</p>
            )}

            <button
              type="button"
              onClick={addCama}
              className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
            >
              <Plus size={14} /> Adicionar {camas.length > 0 ? 'Outra' : ''} Cama
            </button>
          </div>

          {/* Obs global */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Observações para o fornecedor</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Ex: Urgente — entregar até 10/06. Embalagem reforçada."
              value={obs}
              onChange={e => setObs(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 space-y-2">
          {/* Resumo total */}
          {totalGeral > 0 && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              <span className="text-xs font-bold text-amber-700">
                {totalCards} card{totalCards !== 1 ? 's' : ''} no kanban
              </span>
              <span className="text-sm font-black text-emerald-600">
                Total: R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {/* Print button — só imprime tapetes (PDF atual é específico para tapetes) */}
          {validTapetes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const previewOrders = validTapetes
                  .map(t => ({ ...tapeteToOrder(t), id: 'PREV', data: '', hora: '', status: 'Pendente' as const }))
                printFornecedorPDF(previewOrders)
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Imprimir PDF Tapetes ({validTapetes.length})
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button
              disabled={!canSave}
              onClick={async () => {
                let allOk = true
                for (const t of validTapetes) {
                  const ok = await onSave(tapeteToOrder(t))
                  if (!ok) { allOk = false; break }
                }
                if (allOk) {
                  for (const c of validCamas) {
                    const ok = await onSave(camaToOrder(c))
                    if (!ok) { allOk = false; break }
                  }
                }
                if (allOk) onClose()
                // Se houve erro, mantém o modal aberto pro user não perder o que digitou
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold transition-colors disabled:opacity-50"
              style={{ background: canSave ? 'linear-gradient(135deg, #b45309, #d97706)' : '' }}
            >
              <Check size={16} />
              {totalCards > 1 ? `Salvar ${totalCards} Itens` : 'Salvar no Kanban'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Ready Modal ──────────────────────────────────────────────────────────────

function ReadyModal({ order, onClose, onConfirm }: {
  order: LVOrder; onClose: () => void
  onConfirm: (endereco: string, transportadora: string, prazo: string) => void
}) {
  const toInputDate = (s?: string) => {
    if (!s) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const p = s.split('/'); if (p.length === 3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`
    return ''
  }
  const [endereco, setEndereco] = useState(order.endereco ?? '')
  const [trans, setTrans]       = useState(order.transportadora ?? '')
  const [prazo, setPrazo]       = useState(toInputDate(order.prazoEntrega))

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div><h3 className="font-bold text-gray-900 flex items-center gap-2"><ClipboardList size={16} className="text-yellow-600" /> Pronto para Envio</h3>
            <p className="text-xs text-gray-500 mt-0.5">Pedido #{order.id} — {order.cliente}</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 flex gap-2 items-start">
            <Package size={14} className="text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">Preencha os dados de entrega. O pedido ficará em <strong>Pronto para Envio</strong> aguardando coleta ou despacho.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Endereço de Entrega</label>
            <input className="input" placeholder="Rua, Nº — Bairro, Cidade, UF" value={endereco} onChange={e => setEndereco(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Transportadora</label>
              <select className="input" value={trans} onChange={e => setTrans(e.target.value)}>
                <option value="">Selecione...</option>
                {CARRIERS_BY_TYPE.map(g => (
                  <optgroup key={g.tipo} label={g.tipo}>{g.items.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}</optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prazo de Entrega</label>
              <input className="input" type="date" value={prazo} onChange={e => setPrazo(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button onClick={() => { onConfirm(endereco, trans, prazo); onClose() }} className="btn-primary flex-1 justify-center" style={{ background: '#d97706' }}>
              <ClipboardList size={14} /> Marcar como Pronto
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Dispatch Modal ───────────────────────────────────────────────────────────

function DispatchModal({ order, onClose, onConfirm }: {
  order: LVOrder; onClose: () => void
  onConfirm: (transportadora: string, rastreio: string) => void
}) {
  const [trans, setTrans]     = useState(order.transportadora ?? '')
  const [rastreio, setRastreio] = useState(order.rastreio ?? '')

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 420 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div><h3 className="font-bold text-gray-900 flex items-center gap-2"><Send size={16} className="text-emerald-600" /> Confirmar Despacho</h3>
            <p className="text-xs text-gray-500 mt-0.5">Pedido #{order.id} — {order.cliente}</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2 items-start">
            <Truck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800">Ao confirmar, o pedido será movido para <strong>Despachados</strong> e a data/hora será registrada automaticamente.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Transportadora *</label>
            <select className="input" value={trans} onChange={e => setTrans(e.target.value)}>
              <option value="">Selecione...</option>
              {CARRIERS_BY_TYPE.map(g => (
                <optgroup key={g.tipo} label={g.tipo}>{g.items.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}</optgroup>
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

// ─── Delivery Card ────────────────────────────────────────────────────────────

function DeliveryCard({ order, stage, onView, onDispatch, onUndo, onDragStart, onDragEnd }: {
  order: LVOrder; stage: DeliveryStage
  onView: () => void; onDispatch?: () => void; onUndo?: () => void
  onDragStart: () => void; onDragEnd: () => void
}) {
  const days = daysUntil(order.prazoEntrega)
  const isLate = days !== null && days < 0
  return (
    <motion.div layout className={`bg-white rounded-xl border shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${isLate ? 'border-red-200' : 'border-gray-200'}`}
      draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#b45309' }}>#{order.id.slice(-8)}</span>
        <PrazoTag prazo={order.prazoEntrega} />
      </div>
      {order.fotoUrl && <img src={order.fotoUrl} alt="Produto" className="w-full h-20 object-cover rounded-lg border border-gray-100 mb-2" />}
      <p className="text-sm font-semibold text-gray-800 leading-tight">{order.cliente}</p>
      <p className="text-xs text-gray-500 mt-0.5 mb-2 line-clamp-1">{order.produto}</p>
      {order.tamanho && <span className="text-[9px] border border-amber-300 text-amber-700 px-1.5 py-0.5 rounded bg-amber-50 inline-block mb-2">{order.tamanho}</span>}
      <div className="space-y-1 mb-3">
        {order.endereco && <div className="flex items-start gap-1.5 text-xs text-gray-500"><MapPin size={11} className="text-gray-400 shrink-0 mt-0.5" /><span className="line-clamp-1">{order.endereco}</span></div>}
        {order.transportadora && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Truck size={11} className="text-gray-400 shrink-0" /><span>{order.transportadora}</span></div>}
        {order.prazoEntrega && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Calendar size={11} className="text-gray-400 shrink-0" /><span>Prazo: {order.prazoEntrega}</span></div>}
        {order.rastreio && <div className="flex items-center gap-1.5 text-xs"><span className="text-gray-400">📦</span><span className="font-mono text-blue-600 text-[11px]">{order.rastreio}</span></div>}
        {order.dataDespacho && <div className="flex items-center gap-1.5 text-xs text-emerald-600"><Check size={10} className="shrink-0" /><span>Despachado: {order.dataDespacho}</span></div>}
      </div>
      <div className="flex gap-1.5">
        {stage === 'Pronto para Envio' && onDispatch && (
          <button onClick={onDispatch} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg text-white transition-colors" style={{ background: '#059669' }}>
            <Send size={12} /> Despachar
          </button>
        )}
        {stage === 'Despachados' && (
          <button onClick={onUndo} className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all">
            <ArrowRight size={11} className="rotate-180" /> Desfazer
          </button>
        )}
        <button onClick={onView} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-amber-700 transition-colors" title="Ver detalhes">
          <Eye size={13} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Carrier Accordion ────────────────────────────────────────────────────────

function CarrierAccordion({ carrier, orders, stage, critical, setDragging, setDetail, setDispatchModal, undoDispatch, dispatchAll }: any) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="mb-4 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <Truck size={14} className="text-gray-400 shrink-0" />
        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide flex-1 truncate">{carrier}</span>
        <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">{orders.length}</span>
        {critical > 0 && stage === 'Pronto para Envio' && (
          <span className="text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <AlertTriangle size={8} /> {critical}
          </span>
        )}
        {stage === 'Pronto para Envio' && orders.length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); dispatchAll(carrier, orders) }}
            className="ml-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
          >
            <Send size={10} /> Despachar Todos
          </button>
        )}
        <ChevronDown size={14} className={`text-gray-400 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-gray-50/50">
            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-gray-100 mt-1">
              {orders.map((order: any) => (
                <DeliveryCard key={order.id} order={order} stage={stage}
                  onDragStart={() => setDragging({ order, from: stage })}
                  onDragEnd={() => setDragging(null)}
                  onView={() => setDetail({ order, stage })}
                  onDispatch={stage === 'Pronto para Envio' ? () => setDispatchModal(order) : undefined}
                  onUndo={stage === 'Despachados' ? () => undoDispatch(order) : undefined}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type ViewMode = 'kanban' | 'delivery' | 'estoque'

export default function ProductionLV() {
  const [board, setBoard]               = useState<Record<Stage, LVOrder[]>>(INITIAL)
  const [dragging, setDragging]         = useState<{ order: LVOrder; from: Stage } | null>(null)
  const [newModal, setNewModal]         = useState(false)
  const [tapeteModal, setTapeteModal]   = useState(false)
  const [detail, setDetail]             = useState<{ order: LVOrder; stage: Stage } | null>(null)
  const [readyModal, setReadyModal]     = useState<LVOrder | null>(null)
  const [dispatchModal, setDispatchModal] = useState<LVOrder | null>(null)
  const [toast, setToast]               = useState<string | null>(null)
  const [filter, setFilter]             = useState<'todos' | 'atrasado' | 'pendente'>('todos')
  const [view, setView]                 = useState<ViewMode>('kanban')
  const [estoqueFilter, setEstoqueFilter] = useState<string>('Todos')
  const [tapeteLinha, setTapeteLinha]   = useState<'Todas' | 'Rios' | 'Lagos'>('Todas')
  const [tapeteTamanho, setTapeteTamanho] = useState<string>('Todos')
  const [estoqueFornecedor, setEstoqueFornecedor] = useState<TapeteFornecedor[]>([])
  const [fornecedorDiff, setFornecedorDiff] = useState<FornecedorDiff | null>(null)
  const [loading, setLoading]           = useState(false)
  const nextId = useRef(1)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const handlePrintEstoque = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    let html = '<html><head><title>Relatório de Estoque</title><style>body { font-family: sans-serif; padding: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; } h2 { color: #333; margin-top: 30px; }</style></head><body>';
    html += '<h1>Relatório de Estoque (Lar e Vida)</h1>';
    html += '<p>Data: ' + new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR') + '</p>';
    
    const prateleira = board['Em Prateleira'];
    const transito = [...board['Pedido ao Fornecedor'], ...board['Aguardando Chegada'], ...board['Novos Pedidos'].filter(o => o.tipoPedido === 'estoque')];
    
    html += '<h2>Em Prateleira (' + prateleira.length + ')</h2>';
    if(prateleira.length === 0) html += '<p>Nenhum item em prateleira.</p>';
    else {
      html += '<table><tr><th>Produto</th><th>Categoria</th><th>Tamanho</th></tr>';
      prateleira.forEach(o => html += '<tr><td>' + o.produto + '</td><td>' + (o.categoria || '-') + '</td><td>' + (o.tamanho || '-') + '</td></tr>');
      html += '</table>';
    }

    html += '<h2>Em Trânsito (' + transito.length + ')</h2>';
    if(transito.length === 0) html += '<p>Nenhum item em trânsito.</p>';
    else {
      html += '<table><tr><th>Produto</th><th>Categoria</th><th>Tamanho</th><th>Etapa</th></tr>';
      transito.forEach(o => {
        let etapa = 'Novos Pedidos';
        if (board['Pedido ao Fornecedor'].some(x => x.id === o.id)) etapa = 'Pedido ao Fornecedor';
        if (board['Aguardando Chegada'].some(x => x.id === o.id)) etapa = 'Aguardando Chegada';
        html += '<tr><td>' + o.produto + '</td><td>' + (o.categoria || '-') + '</td><td>' + (o.tamanho || '-') + '</td><td>' + etapa + '</td></tr>'
      });
      html += '</table>';
    }
    
    html += '<h2>Sugestões de Reposição</h2><p>As sugestões são baseadas na análise entre estoque real e histórico de vendas recentes.</p>';

    html += '</body></html>';
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  }

  const handleAutoProcess = async () => {
    if(!window.confirm('Iniciar processamento automático? Isso irá cruzar Novos Pedidos de clientes com o que está Em Prateleira.')) return;
    
    const nextBoard = { ...board }
    Object.keys(nextBoard).forEach(k => nextBoard[k as Stage] = [...board[k as Stage]])
    
    let processados = 0;
    let semEstoque = 0;
    
    const novosClientes = [...nextBoard['Novos Pedidos']].filter(o => o.tipoPedido !== 'estoque')
    
    for (const pedido of novosClientes) {
      const pNome = pedido.produto.toLowerCase()
      const pTam = pedido.tamanho || ''
      const matchIndex = nextBoard['Em Prateleira'].findIndex(o => {
          const mNome = o.produto.toLowerCase();
          const matchesName = mNome.includes(pNome) || pNome.includes(mNome);
          const matchesTam = pTam ? o.tamanho === pTam : true;
          return matchesName && matchesTam;
      })
      
      if (matchIndex >= 0) {
        const matchedItem = nextBoard['Em Prateleira'].splice(matchIndex, 1)[0]
        nextBoard['Novos Pedidos'] = nextBoard['Novos Pedidos'].filter(o => o.id !== pedido.id)
        nextBoard['Embalagem'] = [{...pedido, status: 'OK' as const, obs: (pedido.obs || '') + '\\n[AUTO] Estoque baixado: ' + matchedItem.id}, ...nextBoard['Embalagem']]
        
        if (matchedItem.id && !matchedItem.id.startsWith('mzlv-')) await deletePedidoLV(matchedItem.id)
        if (pedido.id && !pedido.id.startsWith('mzlv-')) await movePedidoLVEtapa(pedido.id, 'Embalagem')
        
        processados++
      } else {
        nextBoard['Novos Pedidos'] = nextBoard['Novos Pedidos'].filter(o => o.id !== pedido.id)
        nextBoard['Pedido ao Fornecedor'] = [{...pedido, status: 'Pendente' as const, obs: (pedido.obs || '') + '\\n[AUTO] Falta Estoque, enviado ao Fornecedor'}, ...nextBoard['Pedido ao Fornecedor']]
        
        if (pedido.id && !pedido.id.startsWith('mzlv-')) await movePedidoLVEtapa(pedido.id, 'Pedido ao Fornecedor')
        
        semEstoque++
      }
    }
    
    setBoard(nextBoard)
    showToast(`✅ ${processados} pedidos tiveram baixa automática no estoque! ${semEstoque} sem estoque foram para fornecedor.`)
  }

  const loadOrders = useCallback(() => {
    setLoading(true)
    fetchPedidosLV().then(res => {
      processFetchedRowsLV(res)
      setLoading(false)
    })
  }, [])

  // ── Load from Supabase ──
  const processFetchedRowsLV = useCallback((pedidos: any[]) => {
    const newCols: Record<Stage, LVOrder[]> = Object.fromEntries(ALL_STAGES.map(s => [s, []])) as unknown as Record<Stage, LVOrder[]>

    const seen = new Set<string>()
    const sortedPedidos = [...pedidos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    let maxNum = 0
    sortedPedidos.forEach((p: any) => {
      const numStr = String(p.numero)
      if (seen.has(numStr)) return
      seen.add(numStr)
      // Compute next sequential number from existing LV-XXXXXX numbers
      const match = (p.numero ?? '').match(/LV-(\d+)/)
      if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10))

      // Map to a valid stage, fallback to 'Novos Pedidos'
      let stage = (p.etapa as Stage)
      if (!ALL_STAGES.includes(stage)) stage = 'Novos Pedidos'

      const dateStr = new Date(p.created_at).toLocaleDateString('pt-BR')
      const timeStr = new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      newCols[stage].push({
        id: p.id,
        cliente: p.cliente,
        clienteEmail: p.cliente_email || undefined,
        clienteTelefone: p.cliente_telefone || undefined,
        produto: p.produto,
        categoria: p.categoria || undefined,
        tamanho: p.tamanho || undefined,
        cor: p.cor || undefined,
        quantidade: p.quantidade || undefined,
        sku: p.sku || undefined,
        fotoUrl: p.foto_url || undefined,
        nomeFornecedor: p.nome_fornecedor || undefined,
        codigoFornecedor: p.codigo_fornecedor || undefined,
        canal: p.canal || undefined,
        data: dateStr,
        hora: timeStr,
        status: calcStatus(p.prazo_entrega),
        obs: p.obs || undefined,
        endereco: p.endereco || undefined,
        transportadora: p.transportadora || undefined,
        rastreio: p.rastreio || undefined,
        dataDespacho: p.data_despacho ? new Date(p.data_despacho).toLocaleDateString('pt-BR') : undefined,
        prazoEntrega: p.prazo_entrega || undefined,
        valor: p.valor || undefined,
        frete: p.frete || undefined,
        tipoPedido: (p as any).tipo_pedido || 'producao',
        itensCama: (p as any).itens_cama ? (p as any).itens_cama as LVOrder['itensCama'] : undefined,
        conferenciaItens: (p as any).conferencia_cama ? (p as any).conferencia_cama as LVOrder['conferenciaItens'] : undefined,
        imagensDesenho: (p as any).imagens_desenho ? (p as any).imagens_desenho as LVOrder['imagensDesenho'] : undefined,
        desenho: (p as any).desenho || undefined,
        // Campos de estoque
        confirmacaoFornecedorUrl: (p as any).confirmacao_fornecedor_url || undefined,
        localizacaoPrateleira: (p as any).localizacao_prateleira || undefined,
        dataEntradaEstoque: (p as any).data_entrada_estoque ? new Date((p as any).data_entrada_estoque).toLocaleDateString('pt-BR') : undefined,
        disponivelSite: (p as any).disponivel_site ?? false,
        dataPublicacaoSite: (p as any).data_publicacao_site ? new Date((p as any).data_publicacao_site).toLocaleDateString('pt-BR') : undefined,
      })
    })

    // Set nextId to one above the highest LV number found
    nextId.current = maxNum + 1

    setBoard(newCols)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadOrders()
    
    // Sincroniza Estoque do Fornecedor em segundo plano
    fetchFornecedorEstoque().then(data => {
      setEstoqueFornecedor(data)
      const cachedStr = localStorage.getItem('fornecedor_estoque_lv')
      const cached = cachedStr ? JSON.parse(cachedStr) : []
      const diff = compareEstoque(cached, data)
      
      if (diff.novosDisponiveis.length > 0 || diff.novosIndisponiveis.length > 0 || diff.novosPrevisao.length > 0) {
        setFornecedorDiff(diff)
      } else if (cached.length === 0 && data.length > 0) {
        localStorage.setItem('fornecedor_estoque_lv', JSON.stringify(data))
      }
    })

    const sub = subscribePedidosLV(processFetchedRowsLV as any)
    return () => sub.unsubscribe()
  }, [processFetchedRowsLV, loadOrders])

  // ── Magazord LV sync ────────────────────────────────────────────────────────
  const [mzLVStatus, setMzLVStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')

  const syncMagazordLV = useCallback(async () => {
    if (!isMagazordLVConfigured()) return
    setMzLVStatus('syncing')
    try {
      const mzOrders = await fetchPendingOrdersLV(5)
      if (mzOrders.length === 0) { setMzLVStatus('ok'); return }

      setBoard(prev => {
        // Collect all existing IDs from_magazord (stored in sku as 'MZ-{id}')
        const existingMzIds = new Set<string>()
        ALL_STAGES.forEach(st => {
          prev[st].forEach(o => {
            if (o.sku?.startsWith('MZ-')) existingMzIds.add(o.sku)
          })
        })

        const next = { ...prev }
        ALL_STAGES.forEach(st => { next[st] = [...prev[st]] })

        mzOrders.forEach((mz: MagazordOrder) => {
          const mzKey = `MZ-${mz.id}`
          if (existingMzIds.has(mzKey)) return   // já existe no board

          const situacao = mz.pedidoSituacao ?? mz.situacao ?? 0
          const targetCol = lvSituacaoToKanbanCol(situacao) as Stage
          if (!ALL_STAGES.includes(targetCol)) return

          const firstItem = mz.itens?.[0]
          
          // ─── Lógica para Prazo de Entrega ───
          const rawPrazo = (mz.entrega as any)?.data_limite_entrega || mz.entrega?.prazo_entrega || (mz as any).data_previsao_entrega
          let prazoFormatted: string | undefined = undefined
          if (rawPrazo) {
            const matchDate = rawPrazo.match(/^(\d{4})-(\d{2})-(\d{2})/)
            if (matchDate) {
              prazoFormatted = `${matchDate[3]}/${matchDate[2]}/${matchDate[1]}`
            } else {
              prazoFormatted = new Date(rawPrazo).toLocaleDateString('pt-BR')
            }
          }

          // ─── Lógica para Cor/Desenho do Tapete ───
          const itemSku = firstItem?.sku || ''
          let corFormatted: string | undefined = undefined
          const matchDS = itemSku.match(/([A-Z]+)-DS([\d-]+)/i)
          if (matchDS) {
            corFormatted = `${matchDS[1]} DESENHO ${matchDS[2]}`.toUpperCase()
          }

          const now = new Date()
          const order: LVOrder = {
            id: `mzlv-${mz.id}`,
            cliente: mz.cliente?.nome ?? 'Cliente Magazord',
            clienteEmail: mz.cliente?.email,
            clienteTelefone: mz.cliente?.telefone,
            produto: firstItem?.nome ?? 'Produto Magazord',
            sku: mzKey,
            desenho: corFormatted,
            canal: mz.canal ?? 'Magazord',
            categoria: 'Tapete',
            quantidade: firstItem?.quantidade ?? 1,
            valor: mz.valor_total,
            frete: mz.entrega?.frete,
            transportadora: mz.entrega?.transportadora,
            prazoEntrega: prazoFormatted,
            endereco: mz.entrega
              ? `${mz.entrega.logradouro}, ${mz.entrega.numero} — ${mz.entrega.bairro}, ${mz.entrega.cidade}/${mz.entrega.uf}`
              : undefined,
            obs: mz.observacao,
            data: new Date(mz.data_pedido).toLocaleDateString('pt-BR'),
            hora: new Date(mz.data_pedido).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: calcStatus(prazoFormatted),
            tipoPedido: 'crossdocking',
          }

          next[targetCol] = [order, ...next[targetCol]]
        })

        return next
      })
      setMzLVStatus('ok')
    } catch {
      setMzLVStatus('error')
    }
  }, [])

  // Sync on mount + every 5 min
  useEffect(() => {
    syncMagazordLV()
    const interval = setInterval(syncMagazordLV, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [syncMagazordLV])

  // ── New order ──
  const handleNewOrder = async (data: Omit<LVOrder, 'id' | 'data' | 'hora' | 'status'>): Promise<boolean> => {
    const num = String(nextId.current++).padStart(6, '0')
    const inserted = await createPedidoLV({
      numero: `LV-${num}`,
      cliente: data.cliente,
      cliente_email: data.clienteEmail || null,
      cliente_telefone: data.clienteTelefone || null,
      produto: data.produto,
      canal: data.canal || null,
      obs: data.obs || null,
      endereco: data.endereco || null,
      transportadora: data.transportadora || null,
      prazo_entrega: data.prazoEntrega || null,
      valor: data.valor || null,
      frete: data.frete || null,
      etapa: 'Novos Pedidos',
      status: calcStatus(data.prazoEntrega),
      from_magazord: false,
      sku: data.sku || null,
      foto_url: data.fotoUrl || null,
      nome_fornecedor: data.nomeFornecedor || null,
      codigo_fornecedor: data.codigoFornecedor || null,
      tamanho: data.tamanho || null,
      cor: data.cor || null,
      desenho: data.desenho || null,
      categoria: data.categoria || null,
      quantidade: data.quantidade || null,
      // Campos específicos de crossdocking/estoque/cama:
      tipo_pedido: data.tipoPedido || null,
      confirmacao_fornecedor_url: data.confirmacaoFornecedorUrl || null,
      itens_cama: data.itensCama ?? null,
    } as any)
    if (inserted) {
      await loadOrders()
      showToast('Pedido adicionado com sucesso!')
      return true
    }
    showToast('❌ Erro ao salvar pedido — abra o Console (F12) e me mostre o erro do Supabase')
    return false
  }

  // ── Update order ──
  const handleUpdate = async (updates: Partial<LVOrder>) => {
    if (!detail) return
    const { id } = detail.order
    const payload: Record<string, unknown> = {}
    if ('cliente' in updates) payload.cliente = updates.cliente
    if ('clienteEmail' in updates) payload.cliente_email = updates.clienteEmail || null
    if ('clienteTelefone' in updates) payload.cliente_telefone = updates.clienteTelefone || null
    if ('produto' in updates) payload.produto = updates.produto
    if ('canal' in updates) payload.canal = updates.canal || null
    if ('obs' in updates) payload.obs = updates.obs || null
    if ('endereco' in updates) payload.endereco = updates.endereco || null
    if ('transportadora' in updates) payload.transportadora = updates.transportadora || null
    if ('prazoEntrega' in updates) payload.prazo_entrega = updates.prazoEntrega || null
    if ('valor' in updates) payload.valor = updates.valor || null
    if ('frete' in updates) payload.frete = updates.frete || null
    if ('sku' in updates) payload.sku = updates.sku || null
    if ('fotoUrl' in updates) payload.foto_url = updates.fotoUrl || null
    if ('nomeFornecedor' in updates) payload.nome_fornecedor = updates.nomeFornecedor || null
    if ('codigoFornecedor' in updates) payload.codigo_fornecedor = updates.codigoFornecedor || null
    if ('categoria' in updates) payload.categoria = updates.categoria || null
    if ('tamanho' in updates) payload.tamanho = updates.tamanho || null
    if ('cor' in updates) payload.cor = updates.cor || null
    if ('quantidade' in updates) payload.quantidade = updates.quantidade || null
    if ('conferenciaItens' in updates) (payload as any).conferencia_cama = updates.conferenciaItens ?? null
    if ('imagensDesenho' in updates) (payload as any).imagens_desenho = updates.imagensDesenho ?? null
    if ('desenho' in updates) (payload as any).desenho = updates.desenho || null
    // campos de estoque
    if ('confirmacaoFornecedorUrl' in updates) (payload as any).confirmacao_fornecedor_url = updates.confirmacaoFornecedorUrl || null
    if ('localizacaoPrateleira' in updates) (payload as any).localizacao_prateleira = updates.localizacaoPrateleira || null
    if ('disponivelSite' in updates) (payload as any).disponivel_site = updates.disponivelSite ?? false

    const success = await updatePedidoLV(id, payload)
    if (success) { await loadOrders(); showToast('Pedido atualizado!') }
    else alert('Erro ao salvar no banco de dados. Verifique a configuração do Supabase.')
  }

  // ── Delete order ──
  const handleDelete = async (id: string, stage: Stage) => {
    const ok = await deletePedidoLV(id)
    if (ok) {
      setBoard(prev => ({ ...prev, [stage]: prev[stage].filter(o => o.id !== id) }))
      showToast('Pedido excluído.')
    } else {
      alert('Erro ao excluir o pedido.')
    }
  }

  // ── Advance stage ──
  const conclude = (stage: Stage, id: string) => {
    const order = board[stage].find(o => o.id === id)!
    // Estoque: ao concluir Recebido, vai para Em Prateleira (e não Embalagem)
    if (stage === 'Recebido' && order.tipoPedido === 'estoque') {
      setBoard(prev => ({
        ...prev,
        'Recebido': prev['Recebido'].filter(o => o.id !== id),
        'Em Prateleira': [...prev['Em Prateleira'], { ...order, status: 'OK' as const }],
      }))
      marcarEntradaEstoque(id, order.localizacaoPrateleira || '')
      showToast('Tapete movido para "Em Prateleira"!')
      return
    }
    if (stage === 'Embalagem') { setReadyModal(order); return }
    if (stage === 'Pronto para Envio') { setDispatchModal(order); return }
    if (stage === 'Em Prateleira') {
      setBoard(prev => ({
        ...prev,
        'Em Prateleira': prev['Em Prateleira'].filter(o => o.id !== id),
        'Disponível no Site': [...prev['Disponível no Site'], { ...order, disponivelSite: true, status: 'OK' as const }],
      }))
      marcarDisponivelSite(id)
      showToast('Tapete marcado como "Disponível no Site"!')
      return
    }
    // Pedidos de estoque não avançam além de 'Disponível no Site'
    if (stage === 'Disponível no Site') { showToast('Tapete já está disponível no site! ✓'); return }
    const idx = ALL_STAGES.indexOf(stage)
    const next = ALL_STAGES[idx + 1]
    setBoard(prev => ({
      ...prev,
      [stage]: prev[stage].filter(o => o.id !== id),
      [next]: [...prev[next], { ...order, status: 'OK' as const }],
    }))
    movePedidoLVEtapa(id, next as string)
    showToast(`Pedido movido para "${next}"!`)
  }

  // ── Mark ready ──
  const markReady = (order: LVOrder, endereco: string, transportadora: string, prazoEntrega: string) => {
    const prazoFmt = prazoEntrega ? new Date(prazoEntrega).toLocaleDateString('pt-BR') : order.prazoEntrega
    setBoard(prev => ({
      ...prev,
      'Embalagem': prev['Embalagem'].filter(o => o.id !== order.id),
      'Pronto para Envio': [{ ...order, status: 'OK' as const, endereco, transportadora, prazoEntrega: prazoFmt }, ...prev['Pronto para Envio']],
    }))
    updatePedidoLV(order.id, { etapa: 'Pronto para Envio', endereco: endereco || null, transportadora: transportadora || null, prazo_entrega: prazoEntrega || null })
    setReadyModal(null)
    showToast(`Pedido #${order.id.slice(-8)} está Pronto para Envio!`)
  }

  // ── Dispatch ──
  const dispatch = (order: LVOrder, transportadora: string, rastreio: string) => {
    const now = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    setBoard(prev => ({
      ...prev,
      'Pronto para Envio': prev['Pronto para Envio'].filter(o => o.id !== order.id),
      'Despachados': [{ ...order, transportadora, rastreio, dataDespacho: now, status: 'OK' as const }, ...prev['Despachados']],
    }))
    setDispatchModal(null)
    despacharPedidoLV(order.id, transportadora, rastreio)
    showToast(`Pedido #${order.id.slice(-8)} despachado com sucesso!`)
  }

  const dispatchAll = async (carrier: string, carrierOrders: LVOrder[]) => {
    if (!window.confirm(`Tem certeza que deseja despachar todos os ${carrierOrders.length} pedidos de "${carrier}"?`)) return
    const now = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const ids = new Set(carrierOrders.map(o => o.id))
    const dispatched = carrierOrders.map(o => ({ ...o, transportadora: carrier, dataDespacho: now, status: 'OK' as const, rastreio: o.rastreio || '' }))
    setBoard(prev => ({
      ...prev,
      'Pronto para Envio': prev['Pronto para Envio'].filter(o => !ids.has(o.id)),
      'Despachados': [...dispatched, ...prev['Despachados']],
    }))
    carrierOrders.forEach(order => despacharPedidoLV(order.id, carrier, order.rastreio || ''))
    showToast(`${carrierOrders.length} pedidos de ${carrier} despachados!`)
  }

  const undoDispatch = (order: LVOrder) => {
    setBoard(prev => ({
      ...prev,
      'Despachados': prev['Despachados'].filter(o => o.id !== order.id),
      'Pronto para Envio': [{ ...order, dataDespacho: undefined, status: 'OK' as const }, ...prev['Pronto para Envio']],
    }))
    movePedidoLVEtapa(order.id, 'Pronto para Envio')
    showToast(`Pedido #${order.id.slice(-8)} revertido para Pronto para Envio`)
  }

  // ── Drag & drop ──
  const onDrop = (to: Stage, e?: React.DragEvent) => {
    e?.stopPropagation()
    if (!dragging || dragging.from === to) return
    const orderId = dragging.order.id
    setBoard(prev => {
      if (prev[to].some(o => o.id === orderId)) return prev
      return {
        ...prev,
        [dragging.from]: prev[dragging.from].filter(o => o.id !== orderId),
        [to]: [...prev[to], dragging.order],
      }
    })
    movePedidoLVEtapa(orderId, to as string)
    showToast(`Pedido movido para ${to}`)
    setDragging(null)
  }

  const filterOrders = (orders: LVOrder[]) => {
    let list = orders
    if (filter === 'atrasado') list = list.filter(o => o.status === 'Atrasado')
    if (filter === 'pendente') list = list.filter(o => o.status === 'Pendente')
    
    return [...list].sort((a, b) => {
      // Atrasados primeiro
      if (a.status === 'Atrasado' && b.status !== 'Atrasado') return -1
      if (b.status === 'Atrasado' && a.status !== 'Atrasado') return 1

      const dA = daysUntil(a.prazoEntrega)
      const dB = daysUntil(b.prazoEntrega)
      
      // Com prazo antes de sem prazo
      if (dA !== null && dB === null) return -1
      if (dA === null && dB !== null) return 1
      if (dA === null && dB === null) return 0
      
      // Menor prazo primeiro
      return dA! - dB!
    })
  }

  const totalKanban  = KANBAN_STAGES.flatMap(s => board[s]).length
  const totalProntos = board['Pronto para Envio'].length
  const totalDespach = board['Despachados'].length

  // ── Render ──
  return (
    <div className="p-4 md:p-6 flex flex-col h-full bg-gray-50/50" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {/* Header Compacto Mobile */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4 mb-3 md:mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">Lar e Vida — Cross-Docking</h1>
            <p className="text-[11px] md:text-sm text-gray-500 mt-0.5 leading-tight">
              {view === 'kanban'
                ? `Kanban — ${totalKanban} em andamento`
                : `Expedição — ${totalProntos} prontos`}
            </p>
          </div>
        </div>

        {/* Controles de Interface */}
        <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:justify-end md:overflow-visible">
          {loading && <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[11px]"><RefreshCw size={10} className="animate-spin" /> Carregando...</div>}

          {/* View toggle */}
          <div className="flex shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-white">
            <button onClick={() => setView('kanban')} className={`px-2 md:px-3 py-1.5 text-[11px] md:text-xs font-medium transition-colors flex items-center gap-1.5 ${view === 'kanban' ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`} style={view === 'kanban' ? { background: '#b45309' } : {}}>
              <ClipboardList size={13} className="hidden sm:inline-block" /> Produção
            </button>
            <button onClick={() => setView('delivery')} className={`px-2 md:px-3 py-1.5 text-[11px] md:text-xs font-medium transition-colors flex items-center gap-1.5 relative ${view === 'delivery' ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`} style={view === 'delivery' ? { background: '#b45309' } : {}}>
              <Truck size={13} className="hidden sm:inline-block" /> Expedição
              {totalProntos > 0 && (
                <span className={`ml-0.5 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full text-[8.5px] md:text-[9px] font-bold flex items-center justify-center ${view === 'delivery' ? 'bg-yellow-400 text-gray-900' : 'bg-yellow-500 text-white'}`}>{totalProntos}</span>
              )}
            </button>
            <button onClick={() => setView('estoque')} className={`px-2 md:px-3 py-1.5 text-[11px] md:text-xs font-medium transition-colors flex items-center gap-1.5 relative ${view === 'estoque' ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`} style={view === 'estoque' ? { background: '#0369a1' } : {}}>
              🗄️ Estoque
              {(() => { const n = (board['Em Prateleira']?.length ?? 0) + (board['Disponível no Site']?.length ?? 0); return n > 0 ? <span className={`ml-0.5 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full text-[8.5px] md:text-[9px] font-bold flex items-center justify-center ${view === 'estoque' ? 'bg-cyan-300 text-gray-900' : 'bg-cyan-500 text-white'}`}>{n}</span> : null })()}
            </button>
          </div>

          {view === 'kanban' && (
            <div className="flex shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-white">
              {(['todos', 'atrasado', 'pendente'] as const).map((v) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`px-2 md:px-3 py-1.5 text-[11px] md:text-xs font-medium transition-colors ${filter === v ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  style={filter === v ? { background: '#b45309' } : {}}
                >
                  {v === 'todos' ? 'Todos' : v === 'atrasado' ? 'Atrasado' : 'Pendente'}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => loadOrders()} className="p-1.5 md:px-2 md:py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 shrink-0" title="Recarregar">
            <RefreshCw size={14} className={`hidden md:inline-block ${loading ? 'animate-spin' : ''}`} />
            <RefreshCw size={13} className={`md:hidden ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Magazord LV status */}
          {isMagazordLVConfigured() && (
            <button
              onClick={() => syncMagazordLV()}
              title="Sincronizar pedidos Magazord Lar e Vida"
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all shrink-0 ${
                mzLVStatus === 'syncing'
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : mzLVStatus === 'error'
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <RefreshCw size={11} className={mzLVStatus === 'syncing' ? 'animate-spin' : ''} />
              {mzLVStatus === 'syncing' ? 'Sincronizando...' : mzLVStatus === 'error' ? 'Erro MZ' : 'Magazord LV'}
            </button>
          )}

          <button onClick={handleAutoProcess} className="hidden md:inline-flex btn-primary shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' }}>
            <RefreshCw size={15} /> Processar Fila
          </button>
          <button onClick={() => setNewModal(true)} className="hidden md:inline-flex btn-primary shrink-0" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
            <Plus size={15} /> Novo Pedido
          </button>
          <button onClick={() => setTapeteModal(true)} className="hidden md:inline-flex btn-primary shrink-0" style={{ background: 'linear-gradient(135deg, #0369a1, #0ea5e9)' }}>
            📦 Pedido Fornecedor
          </button>
        </div>
      </div>


      {/* ── KANBAN VIEW ── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {KANBAN_STAGES.map(stage => {
            const isNew = stage === 'Novos Pedidos'
            const allOrders = board[stage]           // todos, sem filtro
            const orders = filterOrders(allOrders)   // filtrados para exibição
            return (
              <div key={stage}
                className={`flex-shrink-0 w-80 md:w-64 max-w-[85vw] snap-center md:snap-align-none rounded-xl flex flex-col transition-all border shadow-sm ${isNew ? 'bg-amber-50/80 border-amber-200' : `bg-gray-100/80 border-gray-200 ${dragging && dragging.from !== stage ? 'ring-2 ring-amber-200 ring-offset-1' : ''}`}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(stage, e)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STAGE_DOT[stage]}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider flex-1 ${isNew ? 'text-amber-700' : 'text-gray-600'}`}>{stage}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isNew ? 'bg-amber-200 text-amber-800' : 'bg-white text-gray-400'}`}>{allOrders.length}</span>
                </div>

                {/* Botão Imprimir Todos — apenas em Novos Pedidos quando há pedidos */}
                {isNew && allOrders.length > 0 && (
                  <div className="px-2 pb-2">
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Imprimir pedido agrupado com ${allOrders.length} item(ns) e mover todos para "Aguardando Chegada"?`)) return
                        printFornecedorPDF(allOrders)
                        setBoard(prev => {
                          const existingIds = new Set(prev['Aguardando Chegada'].map(o => o.id))
                          const toAdd = allOrders.filter(o => !existingIds.has(o.id)).map(o => ({ ...o, status: 'OK' as const }))
                          return {
                            ...prev,
                            'Novos Pedidos': prev['Novos Pedidos'].filter(o => !ids.has(o.id)),
                            'Aguardando Chegada': [
                              ...toAdd,
                              ...prev['Aguardando Chegada'],
                            ],
                          }
                        })
                        await movePedidosLVEtapa(allOrders.map(o => o.id), 'Aguardando Chegada')
                        showToast(`${allOrders.length} pedido(s) impressos e movidos para "Aguardando Chegada"!`)
                      }}
                      className="w-full flex items-center justify-center gap-1.5 text-white text-[11px] font-bold py-1.5 rounded-lg transition-all hover:opacity-90 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #0369a1, #0ea5e9)' }}
                    >
                      <Printer size={12} /> Imprimir Todos ({allOrders.length})
                    </button>
                  </div>
                )}

                <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto">
                  {orders.map(order => (
                    <motion.div key={order.id} layout
                      className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={() => setDragging({ order, from: stage })}
                      onDragEnd={() => setDragging(null)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white text-[10px]" style={{ background: '#b45309' }}>
                          #{order.id.slice(-8)}
                        </span>
                        {order.status === 'Atrasado' || (daysUntil(order.prazoEntrega) ?? 99) <= 2 ? (
                          <div className="animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)] rounded-full">
                            <PrazoTag prazo={order.prazoEntrega} />
                          </div>
                        ) : (
                          <PrazoTag prazo={order.prazoEntrega} />
                        )}
                      </div>

                      {/* Foto miniatura */}
                      {order.fotoUrl && (
                        <div className="w-full h-20 rounded-lg overflow-hidden border border-gray-100 mb-2">
                          <img src={order.fotoUrl} alt="Produto" className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Tags */}
                      <div className="flex items-center gap-1 flex-wrap mb-1.5">
                        {order.categoria && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{order.categoria}</span>}
                        {order.tamanho && <span className="text-[9px] border border-amber-300 text-amber-700 px-1.5 py-0.5 rounded bg-amber-50">{order.tamanho}</span>}
                        {order.desenho && <span className="text-[9px] border border-amber-400 text-amber-800 px-1.5 py-0.5 rounded bg-amber-100 font-semibold">{order.desenho}</span>}
                        {order.canal && <span className="text-[9px] text-gray-500">{CANAL_ICON[order.canal]}</span>}
                      </div>

                      <p className="text-sm font-semibold text-gray-800 leading-tight">{order.cliente}</p>
                      <p className="text-xs text-gray-500 mt-0.5 mb-2 line-clamp-2">{order.produto}</p>

                      {order.status === 'Atrasado' && (
                        <span className="badge badge-critico text-[10px] mb-2 flex items-center gap-1 w-fit"><AlertTriangle size={9} />Atrasado</span>
                      )}

                      {/* InlineEdit Prazo de Entrega para todos */}
                      <div className="mt-2 mb-1">
                        <InlineEdit
                          value={order.prazoEntrega}
                          placeholder="📅 Prazo (dd/mm/aaaa)"
                          className="w-full text-xs border border-gray-200 bg-gray-50 rounded-lg px-2 py-1.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400 font-medium"
                          onSave={async v => {
                            if (v === (order.prazoEntrega ?? '')) return
                            setBoard(prev => ({
                              ...prev,
                              [stage]: prev[stage].map(o => o.id === order.id ? { ...o, prazoEntrega: v || undefined, status: calcStatus(v || null) } : o)
                            }))
                            await updatePedidoLV(order.id, { prazo_entrega: v || null } as any)
                          }}
                        />
                      </div>

                      {/* Campos Tamanho e Desenho — apenas para Tapete */}
                      {order.categoria === 'Tapete' && (
                        <div className="mt-2 mb-1 flex flex-col gap-1.5">
                          <InlineEdit
                            value={order.tamanho}
                            placeholder="📏 Tamanho (ex: 2,50m x 3,50m)"
                            className="w-full text-xs border border-blue-200 bg-blue-50 rounded-lg px-2 py-1.5 text-blue-900 placeholder-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium"
                            onSave={async v => {
                              if (v === (order.tamanho ?? '')) return
                              setBoard(prev => ({
                                ...prev,
                                [stage]: prev[stage].map(o => o.id === order.id ? { ...o, tamanho: v || undefined } : o)
                              }))
                              await updatePedidoLV(order.id, { tamanho: v || null } as any)
                            }}
                          />
                          <InlineEdit
                            value={order.desenho}
                            placeholder="🎨 Desenho (ex: Desenho 01)"
                            className="w-full text-xs border border-amber-200 bg-amber-50 rounded-lg px-2 py-1.5 text-amber-900 placeholder-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400 font-medium"
                            onSave={async v => {
                              if (v === (order.desenho ?? '')) return
                              setBoard(prev => ({
                                ...prev,
                                [stage]: prev[stage].map(o => o.id === order.id ? { ...o, desenho: v || undefined } : o)
                              }))
                              await updatePedidoLV(order.id, { desenho: v || null } as any)
                            }}
                          />
                        </div>
                      )}

                      <div className="flex gap-1.5 mt-2">
                        {/* Botão especial para Novos Pedidos: Imprimir e avançar para Aguardando Chegada */}
                        {stage === 'Novos Pedidos' ? (
                          <button
                            onClick={async () => {
                              printPedidoFornecedor(order)
                              // Aguarda o banco salvar ANTES de atualizar o board local
                              await movePedidoLVEtapa(order.id, 'Aguardando Chegada')
                              setBoard(prev => ({
                                ...prev,
                                'Novos Pedidos': prev['Novos Pedidos'].filter(o => o.id !== order.id),
                                'Aguardando Chegada': [...prev['Aguardando Chegada'], { ...order, status: 'OK' as const }],
                              }))
                              showToast(`Pedido #${order.id.slice(-8)} enviado ao fornecedor e movido para "Aguardando Chegada"!`)
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                            style={{ background: 'linear-gradient(135deg, #0369a1, #0ea5e9)' }}
                          >
                            <Printer size={13} /> Imprimir Pedido
                          </button>
                        ) : (
                          <button onClick={() => conclude(stage, order.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                            style={{ background: stage === 'Embalagem' ? '#d97706' : '#b45309' }}
                          >
                            {stage === 'Embalagem'
                              ? <><ClipboardList size={13} /> Pronto p/ Envio</>
                              : <><CheckCircle size={13} /> Avançar Etapa</>}
                          </button>
                        )}
                        <button onClick={() => setDetail({ order, stage })}
                          className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-amber-700 transition-colors" title="Ver detalhes"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  {orders.length === 0 && (
                    <div className={`h-24 flex flex-col items-center justify-center text-xs border-2 border-dashed rounded-lg ${isNew ? 'border-amber-200 text-amber-300' : 'border-gray-300 text-gray-400'}`}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.stopPropagation(); onDrop(stage, e) }}
                    >
                      {dragging ? 'Soltar aqui' : 'Vazio'}
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
          {(['Pronto para Envio', 'Despachados'] as DeliveryStage[]).map(stage => (
            <div key={stage}
              className={`flex-shrink-0 w-80 rounded-xl flex flex-col ${STAGE_BG[stage] ?? 'bg-gray-100'}`}
              onDragOver={e => e.preventDefault()}
              onDrop={e => onDrop(stage, e)}
            >
              <div className="flex items-center gap-2 px-3 py-3">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STAGE_DOT[stage]}`} />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex-1">{stage}</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${stage === 'Pronto para Envio' ? 'bg-yellow-200 text-yellow-800' : 'bg-emerald-100 text-emerald-700'}`}>
                  {board[stage].length}
                </span>
              </div>

              {stage === 'Pronto para Envio' && board[stage].length > 0 && (
                <div className="mx-3 mb-2 bg-yellow-100 border border-yellow-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-yellow-600 shrink-0" />
                  <p className="text-xs text-yellow-800 font-medium">{board[stage].filter(o => (daysUntil(o.prazoEntrega) ?? 99) <= 1).length} pedido(s) com prazo crítico hoje/amanhã</p>
                </div>
              )}
              {stage === 'Despachados' && board[stage].length > 0 && (
                <div className="mx-3 mb-2 bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Truck size={13} className="text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-800 font-medium">{board[stage].length} em trânsito · {board[stage].filter(o => (daysUntil(o.prazoEntrega) ?? 99) < 0).length} com prazo vencido</p>
                </div>
              )}

              <div className="flex-1 px-3 pb-3 overflow-y-auto">
                {board[stage].length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-gray-400 text-xs border-2 border-dashed rounded-xl mt-2"
                    style={{ borderColor: stage === 'Pronto para Envio' ? '#fde68a' : '#6ee7b7' }}
                  >
                    {stage === 'Pronto para Envio'
                      ? <><ClipboardList size={20} className="text-yellow-300 mb-2" />Nenhum pedido pronto ainda</>
                      : <><Truck size={20} className="text-emerald-200 mb-2" />Nenhum pedido despachado</>}
                  </div>
                ) : (() => {
                    const groups: Record<string, LVOrder[]> = {}
                    for (const order of board[stage]) {
                      const key = order.transportadora?.trim() || 'Sem transportadora'
                      if (!groups[key]) groups[key] = []
                      groups[key].push(order)
                    }
                    const sorted = Object.entries(groups).sort(([a, ao], [b, bo]) => {
                      if (a === 'Sem transportadora') return 1
                      if (b === 'Sem transportadora') return -1
                      return bo.length - ao.length
                    })
                    return sorted.map(([carrier, orders]) => {
                      const critical = orders.filter(o => (daysUntil(o.prazoEntrega) ?? 99) <= 1).length
                      return (
                        <CarrierAccordion key={carrier} carrier={carrier} orders={orders} stage={stage} critical={critical}
                          setDragging={setDragging} setDetail={setDetail} setDispatchModal={setDispatchModal}
                          undoDispatch={undoDispatch} dispatchAll={dispatchAll}
                        />
                      )
                    })
                  })()
                }
              </div>
            </div>
          ))}

          {/* Sidebar stats */}
          <div className="flex-shrink-0 w-72 space-y-3">
            <div className="card p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resumo de Expedição</p>
              {[
                { label: 'Em andamento',         value: totalKanban,  color: 'text-amber-600', dot: 'bg-amber-500' },
                { label: 'Prontos para envio',   value: totalProntos, color: 'text-yellow-600', dot: 'bg-yellow-500' },
                { label: 'Despachados',          value: totalDespach, color: 'text-emerald-600', dot: 'bg-emerald-500' },
                { label: 'Prazo crítico',
                  value: [...board['Pronto para Envio'], ...board['Despachados']].filter(o => (daysUntil(o.prazoEntrega) ?? 99) <= 1).length,
                  color: 'text-red-600', dot: 'bg-red-500' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-600"><span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}</div>
                  <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
            <div className="card p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Próximos Prazos</p>
              <div className="space-y-2">
                {[...board['Pronto para Envio'], ...board['Despachados']]
                  .filter(o => o.prazoEntrega)
                  .sort((a, b) => (daysUntil(a.prazoEntrega) ?? 999) - (daysUntil(b.prazoEntrega) ?? 999))
                  .slice(0, 5)
                  .map(o => (
                    <div key={o.id} className="flex items-center justify-between">
                      <div className="min-w-0"><p className="text-xs font-medium text-gray-700 truncate">#{o.id.slice(-8)} — {o.cliente}</p><p className="text-[10px] text-gray-400">{o.prazoEntrega}</p></div>
                      <PrazoTag prazo={o.prazoEntrega} />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ESTOQUE VIEW ── */}
      {view === 'estoque' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Ações Estoque */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex gap-2">
              {['Todos', 'Tapete', 'Cama', 'Cortina', 'Almofada', 'Quadro'].map(f => (
                <button key={f} onClick={() => setEstoqueFilter(f)} className={`px-3 py-1 rounded-full text-xs font-semibold border ${estoqueFilter === f ? 'bg-cyan-600 text-white border-cyan-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={handlePrintEstoque} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900 transition-colors">
              <Printer size={14} /> Imprimir Relatório
            </button>
          </div>
          
          {estoqueFilter === 'Tapete' && (
            <div className="flex flex-col gap-2 px-4 pb-2 border-b border-gray-100 bg-white">
              <div className="flex gap-2 items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase w-14">Linha:</span>
                {['Todas', 'Rios', 'Lagos'].map(l => (
                  <button key={l} onClick={() => setTapeteLinha(l as any)} className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${tapeteLinha === l ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-[10px] font-bold text-gray-500 uppercase w-14">Tamanho:</span>
                {['Todos', '1,00 x 1,50', '1,40 x 2,00', '2,00 x 2,50', '2,40 x 3,00', '2,50 x 3,50', '3,00 x 4,00', '3,00 x 5,00', '3,50 x 4,50', 'Outro'].map(t => (
                  <button key={t} onClick={() => setTapeteTamanho(t)} className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${tapeteTamanho === t ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3 px-4 pt-3 pb-2">
            {[
              { label: 'Em Trânsito', value: (board['Novos Pedidos'].filter(o => o.tipoPedido === 'estoque').length + board['Pedido ao Fornecedor'].filter(o => o.tipoPedido === 'estoque').length + board['Aguardando Chegada'].filter(o => o.tipoPedido === 'estoque').length), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
              { label: 'Em Prateleira', value: board['Em Prateleira'].length, color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200', dot: 'bg-cyan-500' },
              { label: 'No Site', value: board['Disponível no Site'].length, color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}>
                <div className="flex items-center gap-2 mb-1"><span className={`w-2 h-2 rounded-full ${s.dot}`} /><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</span></div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Kanban estoque */}
          <div className="flex gap-4 overflow-x-auto flex-1 px-4 pb-4">
            {(ESTOQUE_FLOW as Stage[]).map(stage => {
              const orders = board[stage].filter(o => {
                if (o.tipoPedido !== 'estoque') return false;
                if (estoqueFilter === 'Todos') return true;
                
                if (estoqueFilter === 'Tapete') {
                  const isTapete = o.produto.toLowerCase().includes('tapete') || o.categoria === 'Tapete';
                  if (!isTapete) return false;
                  
                  if (tapeteLinha === 'Rios' && !colecoesDaLinha('RIOS').some(c => o.produto.toUpperCase().includes(c.toUpperCase()))) return false;
                  if (tapeteLinha === 'Lagos' && !colecoesDaLinha('LAGOS').some(c => o.produto.toUpperCase().includes(c.toUpperCase()))) return false;
                  
                  if (tapeteTamanho !== 'Todos') {
                    if (tapeteTamanho === 'Outro') {
                      const known = ['1,00 x 1,50', '1,40 x 2,00', '2,00 x 2,50', '2,40 x 3,00', '2,50 x 3,50', '3,00 x 4,00', '3,00 x 5,00', '3,50 x 4,50'];
                      if (known.includes(o.tamanho || '')) return false;
                    } else {
                      if (o.tamanho !== tapeteTamanho) return false;
                    }
                  }
                  return true;
                }
                
                if (estoqueFilter === 'Cama') return o.produto.toLowerCase().includes('cama') || o.produto.toLowerCase().includes('edredom') || o.categoria === 'Cama';
                return o.categoria === estoqueFilter || o.produto.toLowerCase().includes(estoqueFilter.toLowerCase());
              })
              const isEstoqueOnly = stage === 'Em Prateleira' || stage === 'Disponível no Site'
              return (
                <div key={stage} className={`flex-shrink-0 w-72 rounded-xl flex flex-col ${STAGE_BG[stage] ?? 'bg-gray-100 border border-gray-200'}`}>
                  <div className="flex items-center gap-2 px-3 py-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STAGE_DOT[stage]}`} />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex-1">{stage}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isEstoqueOnly ? 'bg-cyan-100 text-cyan-800' : 'bg-gray-200 text-gray-700'}`}>{orders.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                    {orders.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                        <span className="text-3xl mb-1">{STAGE_ICON[stage]}</span>
                        <p className="text-[10px]">Nenhum tapete aqui</p>
                      </div>
                    )}
                    {orders.map(order => (
                      <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setDetail({ order, stage })}
                      >
                        {order.fotoUrl && <img src={order.fotoUrl} alt="" className="w-full h-20 object-cover" />}
                        <div className="p-2.5">
                          <p className="text-xs font-bold text-gray-900 truncate">{order.produto}</p>
                          {order.cor && <p className="text-[10px] text-blue-600 font-semibold">{order.cor}</p>}
                          {order.tamanho && <span className="inline-block mt-1 text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">{order.tamanho}</span>}
                          {order.transportadora && <p className="text-[10px] text-gray-500 mt-1">🏭 {order.transportadora}</p>}
                          {/* Localização */}
                          {order.localizacaoPrateleira && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-md px-1.5 py-0.5">
                              🗄️ {order.localizacaoPrateleira}
                            </div>
                          )}
                          {/* Confirmação do fornecedor */}
                          {order.confirmacaoFornecedorUrl && (
                            <a href={order.confirmacaoFornecedorUrl} target="_blank" rel="noopener noreferrer"
                              className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                              onClick={e => e.stopPropagation()}
                            >📎 Confirmação</a>
                          )}
                          {/* Badge "No Site" */}
                          {order.disponivelSite && (
                            <div className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                              🌐 No Site
                            </div>
                          )}
                          {/* Action button */}
                          {stage !== 'Disponível no Site' && (
                            <button onClick={e => { e.stopPropagation(); conclude(stage, order.id) }}
                              className="mt-2 w-full text-[10px] font-bold text-white py-1.5 rounded-lg transition-colors"
                              style={{ background: 'linear-gradient(135deg, #0369a1, #0ea5e9)' }}
                            >Avançar →</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setNewModal(true)}
        className="fixed bottom-6 right-6 w-12 h-12 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-20"
        style={{ background: '#b45309' }} title="Novo Pedido"
      >
        <Plus size={22} />
      </button>

      <AnimatePresence>
        {fornecedorDiff && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="bg-indigo-600 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Atenção: Estoque Atualizado</h3>
                  <p className="text-indigo-100 text-sm">O fornecedor alterou a planilha de tapetes.</p>
                </div>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                {fornecedorDiff.novosIndisponiveis.length > 0 && (
                  <div>
                    <h4 className="font-bold text-red-600 flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-red-500"/> Saíram de Linha / Indisponíveis:</h4>
                    <ul className="space-y-1">
                      {fornecedorDiff.novosIndisponiveis.map(t => (
                        <li key={t.colecao+t.desenho+t.tamanho} className="text-sm bg-red-50 text-red-800 px-3 py-1.5 rounded-lg border border-red-100">
                          <strong>{t.colecao}</strong> (Des {t.desenho}) - {t.tamanho}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fornecedorDiff.novosPrevisao.length > 0 && (
                  <div>
                    <h4 className="font-bold text-yellow-600 flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-yellow-500"/> Entraram em Previsão:</h4>
                    <ul className="space-y-1">
                      {fornecedorDiff.novosPrevisao.map(t => (
                        <li key={t.colecao+t.desenho+t.tamanho} className="text-sm bg-yellow-50 text-yellow-800 px-3 py-1.5 rounded-lg border border-yellow-100">
                          <strong>{t.colecao}</strong> (Des {t.desenho}) - {t.tamanho}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fornecedorDiff.novosDisponiveis.length > 0 && (
                  <div>
                    <h4 className="font-bold text-green-600 flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-green-500"/> Voltaram para Estoque:</h4>
                    <ul className="space-y-1">
                      {fornecedorDiff.novosDisponiveis.map(t => (
                        <li key={t.colecao+t.desenho+t.tamanho} className="text-sm bg-green-50 text-green-800 px-3 py-1.5 rounded-lg border border-green-100">
                          <strong>{t.colecao}</strong> (Des {t.desenho}) - {t.tamanho}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button onClick={() => {
                  localStorage.setItem('fornecedor_estoque_lv', JSON.stringify(estoqueFornecedor))
                  setFornecedorDiff(null)
                }} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
                  Ciente, fechar aviso
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {newModal && <NewOrderModal onClose={() => setNewModal(false)} onSave={handleNewOrder} />}
        {tapeteModal && <TapeteOrderModal onClose={() => setTapeteModal(false)} onSave={handleNewOrder} estoqueFornecedor={estoqueFornecedor} />}
        {detail && (
          <DetailModal
            order={detail.order} stage={detail.stage}
            onClose={() => setDetail(null)}
            onConclude={() => conclude(detail.stage, detail.order.id)}
            onUpdate={handleUpdate}
            onDelete={() => handleDelete(detail.order.id, detail.stage)}
          />
        )}
        {readyModal && (
          <ReadyModal order={readyModal} onClose={() => setReadyModal(null)}
            onConfirm={(end, tr, prazo) => markReady(readyModal, end, tr, prazo)}
          />
        )}
        {dispatchModal && (
          <DispatchModal order={dispatchModal} onClose={() => setDispatchModal(null)}
            onConfirm={(tr, rastreio) => dispatch(dispatchModal, tr, rastreio)}
          />
        )}
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
