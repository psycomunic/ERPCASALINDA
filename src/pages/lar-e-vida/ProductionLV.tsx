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
  RefreshCw, ArrowRight, ChevronDown, Sofa, Upload
} from 'lucide-react'
import { CARRIERS_BY_TYPE } from '../../carriers'
import {
  fetchPedidosLV, createPedidoLV, updatePedidoLV,
  despacharPedidoLV, movePedidoLVEtapa,
  uploadFotoLV, fetchHistoricoLV, logHistoricoLV,
} from '../../services/pedidosLV'
import type { HistoricoEntry } from '../../services/pedidosLV'

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
}

type KanbanStage = 'Novos Pedidos' | 'Pedido ao Fornecedor' | 'Aguardando Chegada' | 'Recebido' | 'Embalagem'
type DeliveryStage = 'Pronto para Envio' | 'Despachados'
type Stage = KanbanStage | DeliveryStage

const KANBAN_STAGES: KanbanStage[] = ['Novos Pedidos', 'Pedido ao Fornecedor', 'Aguardando Chegada', 'Recebido', 'Embalagem']
const ALL_STAGES: Stage[] = [...KANBAN_STAGES, 'Pronto para Envio', 'Despachados']

const CATEGORIAS_LV = ['Tapete', 'Cortina', 'Almofada', 'Quadro', 'Outros']
const CANAIS = ['Site', 'Mercado Livre', 'Shopee', 'Amazon', 'Magazine Luiza', 'WhatsApp', 'Balcão']

const STAGE_DOT: Record<Stage, string> = {
  'Novos Pedidos':        'bg-amber-500',
  'Pedido ao Fornecedor': 'bg-blue-500',
  'Aguardando Chegada':   'bg-purple-500',
  'Recebido':             'bg-teal-500',
  'Embalagem':            'bg-gray-500',
  'Pronto para Envio':    'bg-yellow-500',
  'Despachados':          'bg-emerald-500',
}

const STAGE_BG: Partial<Record<Stage, string>> = {
  'Novos Pedidos':     'bg-amber-50 border border-amber-200',
  'Pronto para Envio': 'bg-yellow-50 border border-yellow-200',
  'Despachados':       'bg-emerald-50 border border-emerald-200',
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

function DetailModal({ order: initialOrder, stage, onClose, onConclude, onUpdate }: {
  order: LVOrder; stage: Stage
  onClose: () => void; onConclude: () => void
  onUpdate: (updates: Partial<LVOrder>) => Promise<void>
}) {
  const [tab, setTab] = useState<'detalhes' | 'editar' | 'historico'>('detalhes')
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
        <div className="flex border-b border-gray-100 px-5 mt-3 shrink-0">
          {(['detalhes', 'editar', 'historico'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors capitalize ${tab === t ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {t === 'detalhes' ? 'Detalhes' : t === 'editar' ? '✏️ Editar' : '📜 Histórico'}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── Tab: Detalhes ─── */}
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
                <input className="input mt-2" placeholder="Cor / Variação" value={edit.cor} onChange={e => setE('cor', e.target.value)} />
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
              <button onClick={handleSaveEdit} disabled={saving || !edit.cliente.trim() || !edit.produto.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                Salvar Alterações
              </button>
            </>
          ) : (
            <>
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

function NewOrderModal({ onClose, onSave }: { onClose: () => void; onSave: (o: Omit<LVOrder, 'id' | 'data' | 'hora' | 'status'>) => void }) {
  const [form, setForm] = useState({
    cliente: '', clienteEmail: '', clienteTelefone: '',
    produto: '', nomeFornecedor: '', codigoFornecedor: '', sku: '',
    fotoUrl: '', categoria: CATEGORIAS_LV[0], tamanho: '', cor: '',
    quantidade: 1, canal: 'Site', obs: '', endereco: '',
    transportadora: '', prazoEntrega: '', valor: '', frete: '',
  })
  const set = (field: string, val: any) => setForm(p => ({ ...p, [field]: val }))

  const handleSave = () => {
    if (!form.cliente.trim() || !form.produto.trim()) return
    onSave({
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
            <input className="input mt-2" placeholder="Cor / Variação" value={form.cor} onChange={e => set('cor', e.target.value)} />
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
            <input className="input" placeholder="Prazo de entrega ao cliente (dd/mm/aaaa)" value={form.prazoEntrega} onChange={e => set('prazoEntrega', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Observações</label>
            <textarea className="input resize-none" rows={2} placeholder="Observações do cliente..." value={form.obs} onChange={e => set('obs', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 p-4 pt-3 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={handleSave} disabled={!form.cliente.trim() || !form.produto.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold transition-colors disabled:opacity-50"
            style={{ background: form.cliente.trim() && form.produto.trim() ? 'linear-gradient(135deg, #b45309, #d97706)' : '' }}
          >
            <Check size={16} /> Salvar Pedido
          </button>
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

type ViewMode = 'kanban' | 'delivery'

export default function ProductionLV() {
  const [board, setBoard]               = useState<Record<Stage, LVOrder[]>>(INITIAL)
  const [dragging, setDragging]         = useState<{ order: LVOrder; from: Stage } | null>(null)
  const [newModal, setNewModal]         = useState(false)
  const [detail, setDetail]             = useState<{ order: LVOrder; stage: Stage } | null>(null)
  const [readyModal, setReadyModal]     = useState<LVOrder | null>(null)
  const [dispatchModal, setDispatchModal] = useState<LVOrder | null>(null)
  const [toast, setToast]               = useState<string | null>(null)
  const [filter, setFilter]             = useState<'todos' | 'atrasado' | 'pendente'>('todos')
  const [view, setView]                 = useState<ViewMode>('kanban')
  const [loading, setLoading]           = useState(false)
  const nextId = useRef(1)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  // ── Load from Supabase ──
  const loadOrders = useCallback(async () => {
    setLoading(true)
    const pedidos = await fetchPedidosLV()
    const newCols: Record<Stage, LVOrder[]> = Object.fromEntries(ALL_STAGES.map(s => [s, []])) as unknown as Record<Stage, LVOrder[]>

    pedidos.forEach(p => {
      const stage = (p.etapa as Stage) || 'Novos Pedidos'
      if (!ALL_STAGES.includes(stage)) return
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
      })
      nextId.current = Math.max(nextId.current, 1)
    })

    setBoard(newCols)
    setLoading(false)
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  // ── New order ──
  const handleNewOrder = async (data: Omit<LVOrder, 'id' | 'data' | 'hora' | 'status'>) => {
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
      categoria: data.categoria || null,
      quantidade: data.quantidade || null,
    })
    if (inserted) { await loadOrders(); showToast('Pedido adicionado com sucesso!') }
    setNewModal(false)
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

    const success = await updatePedidoLV(id, payload)
    if (success) { await loadOrders(); showToast('Pedido atualizado!') }
    else alert('Erro ao salvar no banco de dados. Verifique a configuração do Supabase.')
  }

  // ── Advance stage ──
  const conclude = (stage: Stage, id: string) => {
    const order = board[stage].find(o => o.id === id)!
    if (stage === 'Embalagem') { setReadyModal(order); return }
    if (stage === 'Pronto para Envio') { setDispatchModal(order); return }
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
    if (filter === 'atrasado') return orders.filter(o => o.status === 'Atrasado')
    if (filter === 'pendente') return orders.filter(o => o.status === 'Pendente')
    return orders
  }

  const totalKanban  = KANBAN_STAGES.flatMap(s => board[s]).length
  const totalProntos = board['Pronto para Envio'].length
  const totalDespach = board['Despachados'].length

  // ── Render ──
  return (
    <div className="p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lar e Vida — Cross-Docking</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {view === 'kanban'
              ? `Kanban — ${totalKanban} em andamento`
              : `Expedição — ${totalProntos} prontos · ${totalDespach} despachados`}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-start md:justify-end">
          {loading && <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[11px]"><RefreshCw size={10} className="animate-spin" /> Carregando...</div>}

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${view === 'kanban' ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`} style={view === 'kanban' ? { background: '#b45309' } : {}}>
              <ClipboardList size={13} /> Produção
            </button>
            <button onClick={() => setView('delivery')} className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 relative ${view === 'delivery' ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`} style={view === 'delivery' ? { background: '#b45309' } : {}}>
              <Truck size={13} /> Expedição
              {totalProntos > 0 && (
                <span className={`ml-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${view === 'delivery' ? 'bg-yellow-400 text-gray-900' : 'bg-yellow-500 text-white'}`}>{totalProntos}</span>
              )}
            </button>
          </div>

          {view === 'kanban' && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
              {(['todos', 'atrasado', 'pendente'] as const).map((v) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === v ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  style={filter === v ? { background: '#b45309' } : {}}
                >
                  {v === 'todos' ? 'Todos' : v === 'atrasado' ? 'Atrasados' : 'Pendentes'}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => loadOrders()} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500" title="Recarregar">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setNewModal(true)} className="btn-primary" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
            <Plus size={15} /> Novo Pedido
          </button>
        </div>
      </div>

      {/* ── KANBAN VIEW ── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {KANBAN_STAGES.map(stage => {
            const isNew = stage === 'Novos Pedidos'
            const orders = filterOrders(board[stage])
            return (
              <div key={stage}
                className={`flex-shrink-0 w-64 rounded-xl flex flex-col transition-all ${isNew ? 'bg-amber-50 border-2 border-amber-200' : `bg-gray-100 ${dragging && dragging.from !== stage ? 'ring-2 ring-amber-200 ring-offset-1' : ''}`}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(stage, e)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STAGE_DOT[stage]}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider flex-1 ${isNew ? 'text-amber-700' : 'text-gray-600'}`}>{stage}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isNew ? 'bg-amber-200 text-amber-800' : 'bg-white text-gray-400'}`}>{orders.length}</span>
                </div>

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
                        <PrazoTag prazo={order.prazoEntrega} />
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
                        {order.canal && <span className="text-[9px] text-gray-500">{CANAL_ICON[order.canal]}</span>}
                      </div>

                      <p className="text-sm font-semibold text-gray-800 leading-tight">{order.cliente}</p>
                      <p className="text-xs text-gray-500 mt-0.5 mb-2 line-clamp-2">{order.produto}</p>

                      {order.status === 'Atrasado' && (
                        <span className="badge badge-critico text-[10px] mb-2 flex items-center gap-1 w-fit"><AlertTriangle size={9} />Atrasado</span>
                      )}

                      <div className="flex gap-1.5 mt-2">
                        <button onClick={() => conclude(stage, order.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                          style={{ background: stage === 'Embalagem' ? '#d97706' : '#b45309' }}
                        >
                          {stage === 'Embalagem'
                            ? <><ClipboardList size={13} /> Pronto p/ Envio</>
                            : <><CheckCircle size={13} /> Avançar Etapa</>}
                        </button>
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

      {/* FAB */}
      <button onClick={() => setNewModal(true)}
        className="fixed bottom-6 right-6 w-12 h-12 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-20"
        style={{ background: '#b45309' }} title="Novo Pedido"
      >
        <Plus size={22} />
      </button>

      <AnimatePresence>
        {newModal && <NewOrderModal onClose={() => setNewModal(false)} onSave={handleNewOrder} />}
        {detail && (
          <DetailModal
            order={detail.order} stage={detail.stage}
            onClose={() => setDetail(null)}
            onConclude={() => conclude(detail.stage, detail.order.id)}
            onUpdate={handleUpdate}
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
