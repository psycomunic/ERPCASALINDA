import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, CheckCircle, X, Check, User, Package,
  AlertTriangle, Truck, MapPin, Calendar, Send, ClipboardList,
  RefreshCw, ArrowRight, Sofa, Eye, Hash, Image
} from 'lucide-react'
import { CARRIERS_BY_TYPE, CARRIER_NAMES } from '../../carriers'
import {
  fetchPedidosLV, createPedidoLV, updatePedidoLV,
  despacharPedidoLV, movePedidoLVEtapa,
  fetchHistoricoLV, logHistoricoLV, type HistoricoEntry,
  uploadFotoLV,
} from '../../services/pedidosLV'
import { isSupabaseConfigured } from '../../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id: string
  cliente: string
  clienteEmail?: string
  clienteTelefone?: string
  produto: string           // nome no site/marketplace
  nomeFornecedor?: string   // nome do produto no fornecedor
  codigoFornecedor?: string // código interno do fornecedor
  sku?: string              // SKU da loja
  fotoUrl?: string          // URL ou base64 da foto do produto
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

type KanbanStage = 'Novos Pedidos' | 'Pedido ao Fornecedor' | 'Aguardando Chegada' | 'Recebido' | 'Impressão' | 'Corte Moldura' | 'Entelamento + Vidro' | 'Acabamento' | 'Embalagem'
type DeliveryStage = 'Pronto para Envio' | 'Despachados'
type Stage = KanbanStage | DeliveryStage

const CROSS_STAGES: KanbanStage[] = ['Novos Pedidos', 'Pedido ao Fornecedor', 'Aguardando Chegada', 'Recebido']
const QUADROS_STAGES: KanbanStage[] = ['Novos Pedidos', 'Impressão', 'Corte Moldura', 'Entelamento + Vidro', 'Acabamento', 'Embalagem']

const ALL_STAGES: Stage[] = [...Array.from(new Set([...CROSS_STAGES, ...QUADROS_STAGES])), 'Pronto para Envio', 'Despachados']

const STAGE_DOT: Record<Stage, string> = {
  'Novos Pedidos':        'bg-amber-500',
  'Pedido ao Fornecedor': 'bg-blue-500',
  'Aguardando Chegada':   'bg-orange-500',
  'Recebido':             'bg-green-500',
  'Impressão':           'bg-blue-500',
  'Corte Moldura':       'bg-orange-500',
  'Entelamento + Vidro': 'bg-green-500',
  'Acabamento':          'bg-purple-500',
  'Embalagem':           'bg-gray-400',
  'Pronto para Envio':    'bg-yellow-500',
  'Despachados':          'bg-emerald-500',
}

const STAGE_BG: Partial<Record<Stage, string>> = {
  'Novos Pedidos':        'bg-amber-50 border border-amber-200',
  'Pedido ao Fornecedor': 'bg-blue-50 border border-blue-200',
  'Aguardando Chegada':   'bg-orange-50 border border-orange-200',
  'Recebido':             'bg-green-50 border border-green-200',
  'Impressão':           'bg-blue-50 border border-blue-200',
  'Corte Moldura':       'bg-orange-50 border border-orange-200',
  'Entelamento + Vidro': 'bg-green-50 border border-green-200',
  'Acabamento':          'bg-purple-50 border border-purple-200',
  'Embalagem':           'bg-gray-50 border border-gray-200',
  'Pronto para Envio':    'bg-yellow-50 border border-yellow-200',
  'Despachados':          'bg-emerald-50 border border-emerald-200',
}

const CATEGORIAS_LV = ['Quadro', 'Espelho', 'Tapete', 'Jogo de Cama', 'Jogo de Colcha', 'Itens de Decoração', 'Cortina', 'Travesseiro', 'Edredom', 'Pillowtop', 'Outro']
const CANAIS = ['Site', 'Mercado Livre', 'Shopee', 'Amazon', 'Magazine Luiza', 'Balcão']
const CANAL_ICON: Record<string, string> = {
  'Site': '🌐', 'Mercado Livre': '🛒', 'Shopee': '🟠', 'Amazon': '📦',
  'Magazine Luiza': '🔵', 'Balcão': '🏪',
}

const INITIAL: Record<Stage, Order[]> = {
  'Novos Pedidos': [], 'Pedido ao Fornecedor': [], 'Aguardando Chegada': [],
  'Recebido': [], 'Impressão': [], 'Corte Moldura': [], 'Entelamento + Vidro': [],
  'Acabamento': [], 'Embalagem': [], 'Pronto para Envio': [], 'Despachados': [],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(prazo?: string): number | null {
  if (!prazo) return null
  const [d, m, y] = prazo.split('/').map(Number)
  if (!d || !m || !y) return null
  const diff = new Date(y, m - 1, d).getTime() - new Date().setHours(0,0,0,0)
  return Math.ceil(diff / 86400000)
}

/** Calcula status automático baseado no prazo de entrega */
function calcStatus(prazo?: string | null): 'Pendente' | 'Atrasado' | 'OK' {
  if (!prazo) return 'Pendente'
  const days = daysUntil(prazo)
  if (days === null) return 'Pendente'
  if (days < 0) return 'Atrasado'
  return 'Pendente'
}

function PrazoTag({ prazo }: { prazo?: string }) {
  const days = daysUntil(prazo)
  if (days === null) return null
  if (days < 0)  return <span className="badge badge-critico text-[10px]">VENCIDO {Math.abs(days)}d atrás</span>
  if (days === 0) return <span className="badge bg-orange-100 text-orange-700 text-[10px]">VENCE HOJE</span>
  if (days <= 2)  return <span className="badge bg-yellow-100 text-yellow-700 text-[10px]">{days}d restante{days > 1 ? 's' : ''}</span>
  return <span className="badge badge-normal text-[10px]">{days}d p/ entrega</span>
}

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

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onView, dragging, onDragStart, onDragEnd }: {
  order: Order; onView: () => void
  dragging: boolean; onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void
}) {
  return (
    <motion.div
      layout
      className="bg-white rounded-xl border border-amber-100 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative overflow-hidden"
      draggable
      onDragStart={(e: any) => {
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
        onDragStart(e as React.DragEvent)
      }}
      onDragEnd={onDragEnd}
    >
      {/* Foto do produto — destaque visual */}
      {order.fotoUrl ? (
        <div className="relative w-full h-28 overflow-hidden bg-gray-100">
          <img src={order.fotoUrl} alt={order.produto} className="w-full h-full object-cover" />
          {/* Overlay com número do pedido */}
          <div className="absolute top-1.5 left-1.5">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md text-white shadow" style={{ background: '#b45309' }}>#{order.id.slice(-6)}</span>
          </div>
          {order.canal && (
            <div className="absolute top-1.5 right-1.5">
              <span className="text-[10px] bg-white/90 px-1.5 py-0.5 rounded shadow text-gray-600">{CANAL_ICON[order.canal] ?? '🛒'}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #b45309, #d97706)' }} />
      )}

      <div className="p-3">
        {/* Número + canal (quando sem foto) */}
        {!order.fotoUrl && (
          <div className="flex items-center justify-between mb-1.5 mt-0.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#b45309' }}>#{order.id.slice(-6)}</span>
            <div className="flex items-center gap-1">
              {order.canal && <span className="text-[10px] text-gray-500">{CANAL_ICON[order.canal] ?? '🛒'}</span>}
              <PrazoTag prazo={order.prazoEntrega} />
            </div>
          </div>
        )}

        {/* Nome do cliente — destaque */}
        <p className="text-sm font-bold text-gray-900 leading-tight">{order.cliente}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-tight">{order.produto}</p>

        {/* SKU + Tamanho — destaque */}
        {(order.sku || order.tamanho) && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {order.sku && (
              <span className="text-[10px] font-bold bg-gray-900 text-white px-2 py-0.5 rounded font-mono">{order.sku}</span>
            )}
            {order.tamanho && (
              <span className="text-[10px] font-semibold border border-amber-300 text-amber-700 px-1.5 py-0.5 rounded bg-amber-50">{order.tamanho}</span>
            )}
          </div>
        )}

        {/* Código fornecedor */}
        {order.codigoFornecedor && (
          <p className="text-[10px] text-blue-600 font-mono mt-1">COD: {order.codigoFornecedor}</p>
        )}

        {/* Prazo (quando tem foto, aparece aqui) */}
        {order.fotoUrl && <div className="mt-1.5"><PrazoTag prazo={order.prazoEntrega} /></div>}

        {/* Valor */}
        {order.valor && (
          <p className="text-xs font-bold mt-1.5" style={{ color: '#b45309' }}>
            R$ {order.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}

        {order.obs && (
          <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1.5 text-[11px] text-amber-700">
            ⚠ {order.obs}
          </div>
        )}

        <button
          onClick={onView}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg transition-colors border border-amber-200 text-amber-700 hover:bg-amber-50 mt-2"
        >
          <Eye size={11} /> Ver detalhes
        </button>
      </div>
    </motion.div>
  )
}

// ─── Photo Paste Zone ────────────────────────────────────────────────────────

function PhotoZone({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const zoneRef      = React.useRef<HTMLDivElement>(null)
  const fileRef      = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [preview,   setPreview]   = React.useState('') // base64 para feedback imediato
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const handleFileUpload = React.useCallback(async (file: File | Blob) => {
    // 1. Preview local imediato (base64)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // 2. Upload para Supabase Storage
    setUploading(true)
    const url = await uploadFotoLV(file)
    setUploading(false)

    if (url) {
      // Sucesso: usa URL pública (pequena, salva facilmente no banco)
      setPreview('')
      onChange(url)
    } else {
      // Fallback: guarda base64 mesmo (pode falhar se imagem > 1MB)
      const r2 = new FileReader()
      r2.onload = e2 => { onChange(e2.target?.result as string); setPreview('') }
      r2.readAsDataURL(file)
    }
  }, [onChange])

  const handlePaste = React.useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) { handleFileUpload(file); return }
      }
    }
    // Fallback: URL colado como texto
    const text = e.clipboardData?.getData('text')
    if (text && (text.startsWith('http') || text.startsWith('data:'))) onChange(text)
  }, [handleFileUpload, onChange])

  React.useEffect(() => {
    const el = zoneRef.current
    if (!el) return
    el.addEventListener('paste', handlePaste as any)
    return () => el.removeEventListener('paste', handlePaste as any)
  }, [handlePaste])

  const displaySrc = preview || value

  return (
    <>
      <div ref={zoneRef} className="relative" tabIndex={0}>
        {displaySrc ? (
          <div className="relative rounded-xl overflow-hidden border-2 border-amber-300">
            <img 
              src={displaySrc} 
              alt="Produto" 
              className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
              onClick={() => setIsFullscreen(true)}
            />

            {/* Spinner durante upload */}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 pointer-events-none">
                <RefreshCw size={22} className="animate-spin text-white" />
                <p className="text-white text-xs font-semibold">Enviando foto...</p>
              </div>
            )}

            {!uploading && (
              <button
                onClick={(e) => { e.stopPropagation(); onChange(''); setPreview('') }}
                className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow hover:bg-red-50 transition-colors z-10"
              >
                <X size={14} className="text-red-500" />
              </button>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent py-2 px-3 pointer-events-none">
              <p className="text-white text-[10px] font-semibold">
                {uploading ? 'Enviando para o servidor...' : 'Foto salva ✓ (Clique para ampliar)'}
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full h-32 rounded-xl border-2 border-dashed border-amber-300 flex flex-col items-center justify-center gap-2 text-amber-600 hover:bg-amber-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <span className="text-2xl">📷</span>
            <div className="text-center">
              <p className="text-xs font-semibold">Cole (Ctrl+V) ou clique para selecionar</p>
              <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG — sobe automaticamente</p>
            </div>
          </button>
        )}
        <input
          ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
        />
      </div>

      <AnimatePresence>
        {isFullscreen && displaySrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 p-2 text-white bg-black/50 rounded-full hover:bg-white hover:text-black transition-colors"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={displaySrc}
              alt="Produto em detalhes"
              className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── New Order Modal ──────────────────────────────────────────────────────────

function NewOrderModal({ onClose, onSave }: { onClose: () => void; onSave: (o: Omit<Order, 'id' | 'data' | 'hora' | 'status'>) => void }) {
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
      cliente: form.cliente,
      clienteEmail: form.clienteEmail || undefined,
      clienteTelefone: form.clienteTelefone || undefined,
      produto: form.produto,
      nomeFornecedor: form.nomeFornecedor || undefined,
      codigoFornecedor: form.codigoFornecedor || undefined,
      sku: form.sku || undefined,
      fotoUrl: form.fotoUrl || undefined,
      categoria: form.categoria,
      tamanho: form.tamanho || undefined,
      cor: form.cor || undefined,
      quantidade: form.quantidade,
      canal: form.canal,
      obs: form.obs || undefined,
      endereco: form.endereco || undefined,
      transportadora: form.transportadora || undefined,
      prazoEntrega: form.prazoEntrega || undefined,
      valor: form.valor ? parseFloat(form.valor) : undefined,
      frete: form.frete ? parseFloat(form.frete) : undefined,
    })
  }

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal" style={{ maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
              <Plus size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Novo Pedido — Lar e Vida</h3>
              <p className="text-xs text-gray-400">Preencha os dados do pedido</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Foto do produto */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📷 Foto do Produto</p>
            <PhotoZone value={form.fotoUrl} onChange={v => set('fotoUrl', v)} />
          </div>

          {/* SKU */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"># SKU / Código</p>
            <div className="grid grid-cols-2 gap-2">
              <input className="input font-mono" placeholder="SKU da loja (ex: TAP-001)" value={form.sku} onChange={e => set('sku', e.target.value)} />
              <input className="input" placeholder="Tamanho (ex: 140x200cm)" value={form.tamanho} onChange={e => set('tamanho', e.target.value)} />
            </div>
          </div>

          {/* Cliente */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">👤 Cliente</p>
            <div className="grid grid-cols-1 gap-2">
              <input className="input" placeholder="Nome do cliente *" value={form.cliente} onChange={e => set('cliente', e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="E-mail" value={form.clienteEmail} onChange={e => set('clienteEmail', e.target.value)} />
                <input className="input" placeholder="Telefone" value={form.clienteTelefone} onChange={e => set('clienteTelefone', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Produto no Site */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🛒 Produto no Site / Marketplace</p>
            <div className="grid grid-cols-1 gap-2">
              <input className="input" placeholder="Nome do produto como aparece no site *" value={form.produto} onChange={e => set('produto', e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                  <select className="input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                    {CATEGORIAS_LV.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Canal de venda</label>
                  <select className="input" value={form.canal} onChange={e => set('canal', e.target.value)}>
                    {CANAIS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <input className="input" placeholder="Cor / Variação" value={form.cor} onChange={e => set('cor', e.target.value)} />
            </div>
          </div>

          {/* Produto no Fornecedor */}
          <div className="border border-blue-100 rounded-xl p-3 space-y-2" style={{ background: '#eff6ff' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#1d4ed8' }}>🏭 Produto no Fornecedor (Cross-Docking)</p>
            <input className="input" placeholder="Nome do produto no fornecedor (pode ser diferente do site)" value={form.nomeFornecedor} onChange={e => set('nomeFornecedor', e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input font-mono" placeholder="Código do fornecedor" value={form.codigoFornecedor} onChange={e => set('codigoFornecedor', e.target.value)} />
              <input className="input" placeholder="Nome do fornecedor" value={form.transportadora} onChange={e => set('transportadora', e.target.value)} />
            </div>
          </div>

          {/* Venda */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">💰 Valores</p>
            <div className="grid grid-cols-3 gap-2">
              <input className="input" placeholder="Qtd." type="number" min={1} value={form.quantidade} onChange={e => set('quantidade', parseInt(e.target.value) || 1)} />
              <input className="input" placeholder="Valor (R$)" value={form.valor} onChange={e => set('valor', e.target.value)} />
              <input className="input" placeholder="Frete (R$)" value={form.frete} onChange={e => set('frete', e.target.value)} />
            </div>
          </div>

          {/* Entrega ao Cliente */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🚚 Entrega ao Cliente</p>
            <div className="grid grid-cols-1 gap-2">
              <input className="input" placeholder="Endereço de entrega" value={form.endereco} onChange={e => set('endereco', e.target.value)} />
              <input className="input" placeholder="Prazo de entrega ao cliente (dd/mm/aaaa)" value={form.prazoEntrega} onChange={e => set('prazoEntrega', e.target.value)} />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Observações</label>
            <textarea className="input resize-none" rows={2} placeholder="Observações do cliente..." value={form.obs} onChange={e => set('obs', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 p-4 pt-3 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!form.cliente.trim() || !form.produto.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: form.cliente.trim() && form.produto.trim() ? 'linear-gradient(135deg, #b45309, #d97706)' : '' }}
          >
            <Check size={16} /> Salvar Pedido
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

// Field label map for history display
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

function DetailModal({ order, stage, onClose, onConclude, onUpdate }: {
  order: Order; stage: Stage
  onClose: () => void; onConclude: () => void
  onUpdate: (updates: Partial<Order>) => Promise<void>
}) {
  const [tab, setTab] = React.useState<'detalhes' | 'editar' | 'historico'>('detalhes')
  const [historico, setHistorico] = React.useState<HistoricoEntry[]>([])
  const [loadingH, setLoadingH] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  // Foto gerenciada diretamente na aba Detalhes
  const [currentFoto, setCurrentFoto] = React.useState(order.fotoUrl ?? '')

  // Edit form state (initialized from current order)
  const [edit, setEdit] = React.useState({
    cliente: order.cliente,
    clienteEmail: order.clienteEmail ?? '',
    clienteTelefone: order.clienteTelefone ?? '',
    produto: order.produto,
    nomeFornecedor: order.nomeFornecedor ?? '',
    codigoFornecedor: order.codigoFornecedor ?? '',
    sku: order.sku ?? '',
    fotoUrl: order.fotoUrl ?? '',
    categoria: order.categoria ?? CATEGORIAS_LV[0],
    tamanho: order.tamanho ?? '',
    cor: order.cor ?? '',
    quantidade: order.quantidade ?? 1,
    canal: order.canal ?? 'Site',
    valor: order.valor ? String(order.valor) : '',
    frete: order.frete ? String(order.frete) : '',
    endereco: order.endereco ?? '',
    prazoEntrega: order.prazoEntrega ?? '',
    transportadora: order.transportadora ?? '',
    obs: order.obs ?? '',
  })
  const setE = (field: string, val: any) => setEdit(p => ({ ...p, [field]: val }))

  // Salva a foto imediatamente ao fazer upload na aba Detalhes
  const handleFotoChange = React.useCallback(async (url: string) => {
    setCurrentFoto(url)
    setE('fotoUrl', url)
    await onUpdate({ fotoUrl: url || undefined })
    if (url) {
      await logHistoricoLV(order.id, [{
        campo: 'foto_url',
        valorAnterior: order.fotoUrl ? '[foto anterior]' : null,
        valorNovo: '[foto atualizada]',
      }])
    }
  }, [onUpdate, order.id, order.fotoUrl])

  const loadHistorico = React.useCallback(async () => {
    setLoadingH(true)
    const h = await fetchHistoricoLV(order.id)
    setHistorico(h)
    setLoadingH(false)
  }, [order.id])

  React.useEffect(() => {
    if (tab === 'historico') loadHistorico()
  }, [tab, loadHistorico])

  const handleSaveEdit = async () => {
    setSaving(true)
    // Build diff
    const mapping: Array<{ campo: string; oldVal: string | null; newVal: string | null }> = [
      { campo: 'cliente',           oldVal: order.cliente,                    newVal: edit.cliente },
      { campo: 'clienteEmail',      oldVal: order.clienteEmail ?? null,       newVal: edit.clienteEmail || null },
      { campo: 'clienteTelefone',   oldVal: order.clienteTelefone ?? null,    newVal: edit.clienteTelefone || null },
      { campo: 'produto',           oldVal: order.produto,                    newVal: edit.produto },
      { campo: 'nome_fornecedor',   oldVal: order.nomeFornecedor ?? null,     newVal: edit.nomeFornecedor || null },
      { campo: 'codigo_fornecedor', oldVal: order.codigoFornecedor ?? null,   newVal: edit.codigoFornecedor || null },
      { campo: 'sku',               oldVal: order.sku ?? null,                newVal: edit.sku || null },
      { campo: 'categoria',         oldVal: order.categoria ?? null,          newVal: edit.categoria || null },
      { campo: 'tamanho',           oldVal: order.tamanho ?? null,            newVal: edit.tamanho || null },
      { campo: 'cor',               oldVal: order.cor ?? null,                newVal: edit.cor || null },
      { campo: 'quantidade',        oldVal: String(order.quantidade ?? 1),    newVal: String(edit.quantidade) },
      { campo: 'canal',             oldVal: order.canal ?? null,              newVal: edit.canal || null },
      { campo: 'valor',             oldVal: order.valor ? String(order.valor) : null, newVal: edit.valor || null },
      { campo: 'frete',             oldVal: order.frete ? String(order.frete) : null, newVal: edit.frete || null },
      { campo: 'endereco',          oldVal: order.endereco ?? null,           newVal: edit.endereco || null },
      { campo: 'prazo_entrega',     oldVal: order.prazoEntrega ?? null,       newVal: edit.prazoEntrega || null },
      { campo: 'transportadora',    oldVal: order.transportadora ?? null,     newVal: edit.transportadora || null },
      { campo: 'obs',               oldVal: order.obs ?? null,                newVal: edit.obs || null },
      { campo: 'foto_url',          oldVal: order.fotoUrl ? '[foto]' : null,  newVal: edit.fotoUrl ? '[foto]' : null },
    ]
    const changes = mapping
      .filter(m => m.oldVal !== m.newVal)
      .map(m => ({ campo: m.campo, valorAnterior: m.oldVal, valorNovo: m.newVal }))

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
    await logHistoricoLV(order.id, changes)
    setSaving(false)
    setTab('detalhes')
  }

  const days    = daysUntil(order.prazoEntrega)
  const prazoColor = days === null ? '' : days < 0 ? 'text-red-600' : days === 0 ? 'text-orange-500' : days <= 2 ? 'text-yellow-600' : 'text-emerald-600'

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal" style={{ maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0 border-l-4 shrink-0" style={{ borderLeftColor: '#d97706' }}>
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
              <Sofa size={16} style={{ color: '#d97706' }} />
              Pedido #{order.id.slice(-8)}
              {order.canal && (
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {CANAL_ICON[order.canal] ?? '🛒'} {order.canal}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Etapa: <strong className="text-gray-700">{stage}</strong></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 mt-3 shrink-0">
          {(['detalhes', 'editar', 'historico'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors capitalize ${
                tab === t ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
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
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex flex-col">
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mb-1 flex items-center gap-1.5"><User size={10} /> Cliente</p>
                <p className="text-sm font-bold text-gray-900">{order.cliente}</p>
                {order.clienteEmail && <p className="text-[11px] text-amber-700/80 mt-0.5">✉ {order.clienteEmail}</p>}
                {order.clienteTelefone && <p className="text-[11px] text-amber-700/80">📞 {order.clienteTelefone}</p>}
              </div>

              {/* Produto */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">🛋️ Produto</p>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {order.categoria && <span className="text-[9px] bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded shadow-sm">{order.categoria}</span>}
                    {order.sku && <span className="font-mono text-[9px] bg-gray-900 text-white px-1.5 py-0.5 rounded shadow-sm">SKU: {order.sku}</span>}
                    {order.tamanho && <span className="text-[9px] border border-amber-300 text-amber-700 px-1.5 py-0.5 rounded bg-amber-50 shadow-sm">{order.tamanho}</span>}
                  </div>
                </div>
                
                <div className="p-3">
                  <p className="text-[15px] font-bold text-gray-900 leading-tight mb-3">{order.produto}</p>
                  
                  {/* Foto integrada aqui */}
                  <div className="mb-4">
                    <PhotoZone value={currentFoto} onChange={handleFotoChange} />
                  </div>

                  {order.nomeFornecedor && <p className="text-[11px] text-blue-600 font-medium">Fornecedor: {order.nomeFornecedor}</p>}
                  {order.codigoFornecedor && <p className="text-[10px] font-mono text-blue-500 mb-2">COD: {order.codigoFornecedor}</p>}
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {order.cor && (
                      <div className="bg-gray-50 border border-gray-100 rounded-lg p-2">
                        <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Cor</p>
                        <p className="text-xs font-semibold text-gray-700 truncate">{order.cor}</p>
                      </div>
                    )}
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-2">
                      <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Qtd</p>
                      <p className="text-sm font-black text-gray-900">{order.quantidade || 1}x</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prazo */}
              {order.prazoEntrega && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                  <Calendar size={24} className={prazoColor || 'text-gray-300'} />
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Prazo de Entrega ao Cliente</p>
                    <p className="text-base font-black text-gray-900">{order.prazoEntrega}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${prazoColor}`}>
                      {days === null ? '—' : days < 0 ? `VENCIDO há ${Math.abs(days)} dia(s)` : days === 0 ? 'VENCE HOJE' : `${days} dias restantes`}
                    </p>
                  </div>
                </div>
              )}

              {/* Financeiro */}
              {(order.valor || order.frete) && (
                <div className="grid grid-cols-2 gap-2">
                  {order.valor && (
                    <div className="rounded-xl p-3 text-center text-white" style={{ background: 'linear-gradient(135deg, #92400e, #b45309)' }}>
                      <p className="text-[9px] font-bold uppercase mb-1" style={{ color: '#fde68a' }}>Valor Total</p>
                      <p className="text-sm font-black">R$ {order.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  {order.frete !== undefined && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                      <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Frete</p>
                      <p className="text-sm font-bold text-gray-800">R$ {order.frete?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Entrega */}
              {(order.endereco || order.transportadora) && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">🚚 Entrega</p>
                  {order.endereco && (
                    <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                      <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      <div><p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Endereço</p><p className="text-xs font-semibold text-gray-800">{order.endereco}</p></div>
                    </div>
                  )}
                  {order.transportadora && (
                    <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                      <Truck size={14} className="text-gray-400" />
                      <div><p className="text-[9px] text-gray-400 font-bold uppercase">Transportadora / Fornecedor</p><p className="text-xs font-semibold text-gray-800">{order.transportadora}</p></div>
                    </div>
                  )}
                  {order.rastreio && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <p className="text-[9px] text-blue-400 font-bold uppercase mb-1">Código de Rastreio</p>
                      <p className="text-xs font-bold font-mono text-blue-700">{order.rastreio}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Obs */}
              {order.obs && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mb-1 flex items-center gap-1"><AlertTriangle size={10} /> Observação</p>
                  <p className="text-sm text-gray-800">{order.obs}</p>
                </div>
              )}

              {/* Fluxo */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📦 {order.categoria === 'Quadro' ? 'Fluxo de Produção' : 'Fluxo Cross-Docking'}</p>
                <div className="space-y-1.5 relative">
                  <div className="absolute left-[17px] top-4 bottom-4 w-px bg-gray-200" />
                  {(order.categoria === 'Quadro' ? [...QUADROS_STAGES, 'Pronto para Envio', 'Despachados'] : [...CROSS_STAGES, 'Pronto para Envio', 'Despachados']).map((s, i) => {
                    const stageArray = order.categoria === 'Quadro' ? [...QUADROS_STAGES, 'Pronto para Envio', 'Despachados'] : [...CROSS_STAGES, 'Pronto para Envio', 'Despachados']
                    const currentIdx = stageArray.indexOf(stage)
                    const isDone = i < currentIdx; const isCurrent = i === currentIdx
                    const icons: Record<string, string> = { 'Novos Pedidos':'🛒','Pedido ao Fornecedor':'📋','Aguardando Chegada':'🕐','Recebido':'📥', 'Impressão':'🖨️','Corte Moldura':'🪚','Entelamento + Vidro':'🖼️','Acabamento':'✨','Embalagem':'📦', 'Pronto para Envio':'📦','Despachados':'🚚' }
                    return (
                      <div key={s} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all relative ${
                        isDone ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' :
                        isCurrent ? 'bg-amber-50 border-2 border-amber-300 text-amber-800 font-bold shadow-sm' :
                        'bg-white border border-gray-100 text-gray-400'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black z-10 ${
                          isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'text-white' : 'bg-gray-100 border-2 border-gray-200 text-gray-400'
                        }`} style={isCurrent ? { background: '#b45309' } : {}}>
                          {isDone ? '✓' : isCurrent ? '▶' : i + 1}
                        </div>
                        <span className="flex-1">{icons[s] ?? ''} {s}</span>
                        {isDone && <span className="text-[10px] text-emerald-500 font-semibold">Concluído ✓</span>}
                        {isCurrent && <span className="text-[10px] font-bold" style={{ color: '#b45309' }}>EM ANDAMENTO</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: Editar ─── */}
          {tab === 'editar' && (
            <div className="p-5 space-y-4">
              {/* Foto */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📷 Foto do Produto</p>
                <PhotoZone value={edit.fotoUrl} onChange={v => setE('fotoUrl', v)} />
              </div>

              {/* SKU + Tamanho */}
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-500 mb-1 block">SKU</label>
                  <input className="input font-mono" value={edit.sku} onChange={e => setE('sku', e.target.value)} /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Tamanho</label>
                  <input className="input" value={edit.tamanho} onChange={e => setE('tamanho', e.target.value)} /></div>
              </div>

              {/* Cliente */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">👤 Cliente</p>
                <input className="input mb-2" placeholder="Nome *" value={edit.cliente} onChange={e => setE('cliente', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="E-mail" value={edit.clienteEmail} onChange={e => setE('clienteEmail', e.target.value)} />
                  <input className="input" placeholder="Telefone" value={edit.clienteTelefone} onChange={e => setE('clienteTelefone', e.target.value)} />
                </div>
              </div>

              {/* Produto */}
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

              {/* Fornecedor */}
              <div className="border border-blue-100 rounded-xl p-3 space-y-2" style={{ background: '#eff6ff' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#1d4ed8' }}>🏭 Fornecedor</p>
                <input className="input" placeholder="Nome no fornecedor" value={edit.nomeFornecedor} onChange={e => setE('nomeFornecedor', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input font-mono" placeholder="Código fornecedor" value={edit.codigoFornecedor} onChange={e => setE('codigoFornecedor', e.target.value)} />
                  <input className="input" placeholder="Nome do fornecedor" value={edit.transportadora} onChange={e => setE('transportadora', e.target.value)} />
                </div>
              </div>

              {/* Valores */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">💰 Valores</p>
                <div className="grid grid-cols-3 gap-2">
                  <input className="input" type="number" min={1} placeholder="Qtd" value={edit.quantidade} onChange={e => setE('quantidade', parseInt(e.target.value) || 1)} />
                  <input className="input" placeholder="Valor (R$)" value={edit.valor} onChange={e => setE('valor', e.target.value)} />
                  <input className="input" placeholder="Frete (R$)" value={edit.frete} onChange={e => setE('frete', e.target.value)} />
                </div>
              </div>

              {/* Entrega */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🚚 Entrega ao Cliente</p>
                <input className="input mb-2" placeholder="Endereço" value={edit.endereco} onChange={e => setE('endereco', e.target.value)} />
                <input className="input" placeholder="Prazo de entrega (dd/mm/aaaa)" value={edit.prazoEntrega} onChange={e => setE('prazoEntrega', e.target.value)} />
              </div>

              {/* Obs */}
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
                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {FIELD_LABELS[h.campo] ?? h.campo}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(h.alterado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                          <p className="text-[9px] text-red-400 font-bold uppercase mb-0.5">Antes</p>
                          <p className="text-red-700 font-medium break-all">{h.valor_anterior ?? '—'}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                          <p className="text-[9px] text-emerald-500 font-bold uppercase mb-0.5">Depois</p>
                          <p className="text-emerald-700 font-medium break-all">{h.valor_novo ?? '—'}</p>
                        </div>
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
              <button
                onClick={handleSaveEdit}
                disabled={saving || !edit.cliente.trim() || !edit.produto.trim()}
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
                <button
                  onClick={onConclude}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                >
                  <ArrowRight size={14} /> Avançar Etapa
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Dispatch Modal ───────────────────────────────────────────────────────────

function DispatchModal({ order, onClose, onDispatch }: {
  order: Order; onClose: () => void
  onDispatch: (transportadora: string, rastreio: string) => void
}) {
  const [transportadora, setTransportadora] = useState(order.transportadora ?? '')
  const [rastreio, setRastreio] = useState('')

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal" style={{ maxWidth: 420 }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#fef3c7' }}>
              <Send size={14} style={{ color: '#d97706' }} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Despachar Pedido</h3>
              <p className="text-xs text-gray-400">#{order.id} — {order.cliente}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Transportadora</label>
            <select className="input" value={transportadora} onChange={e => setTransportadora(e.target.value)}>
              <option value="">Selecionar...</option>
              {Object.values(CARRIER_NAMES).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Código de Rastreio</label>
            <input className="input font-mono" placeholder="AA000000000BR" value={rastreio} onChange={e => setRastreio(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 p-4 pt-3 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button
            onClick={() => onDispatch(transportadora, rastreio)}
            disabled={!transportadora}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold disabled:opacity-50"
            style={{ background: !transportadora ? '#9ca3af' : 'linear-gradient(135deg, #b45309, #d97706)' }}
          >
            <Send size={14} /> Despachar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductionLV() {
  const [columns, setColumns] = useState<Record<Stage, Order[]>>({
    'Novos Pedidos': [], 'Pedido ao Fornecedor': [], 'Aguardando Chegada': [],
    'Recebido': [], 'Impressão': [], 'Corte Moldura': [], 'Entelamento + Vidro': [],
    'Acabamento': [], 'Embalagem': [], 'Pronto para Envio': [], 'Despachados': [],
  })
  const [baseView, setBaseView] = useState<'geral' | 'cross' | 'quadros'>('geral')
  const [activeStage, setActiveStage] = useState<'kanban' | 'delivery' | 'dispatched'>('kanban')
  const [viewModal, setViewModal] = useState<{ order: Order; stage: Stage } | null>(null)
  const [dispatchModal, setDispatchModal] = useState<Order | null>(null)
  const [newModal, setNewModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Stage | null>(null)
  const nextId = useRef(1)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const loadOrders = useCallback(async () => {
    setLoading(true)
    const pedidos = await fetchPedidosLV()
    // Bug fix: NUNCA use { ...INITIAL } pois é cópia rasa
    const newCols: Record<Stage, Order[]> = {
      'Novos Pedidos': [], 'Pedido ao Fornecedor': [], 'Aguardando Chegada': [],
      'Recebido': [], 'Impressão': [], 'Corte Moldura': [], 'Entelamento + Vidro': [],
      'Acabamento': [], 'Embalagem': [], 'Pronto para Envio': [], 'Despachados': [],
    }

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

    setColumns(newCols)
    setLoading(false)
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])



  const handleNewOrder = async (data: Omit<Order, 'id' | 'data' | 'hora' | 'status'>) => {
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
    if (inserted) {
      await loadOrders()
      showToast('Pedido adicionado com sucesso!')
    }
    setNewModal(false)
  }

  const handleUpdate = async (updates: Partial<Order>) => {
    if (!viewModal) return
    const { id } = viewModal.order

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
    
    if (success) {
      await loadOrders()
      showToast('Pedido atualizado!')
    } else {
      alert('Erro ao salvar no banco de dados. Se estiver enviando uma foto, certifique-se de que o bucket "produtos" foi criado no Supabase, ou a imagem pode ser muito grande (limite de base64).')
    }
  }

  const handleAdvance = async (order: Order, stage: Stage) => {
    const activeStagesArray = isQuadros(order)
      ? [...QUADROS_STAGES, 'Pronto para Envio', 'Despachados']
      : [...CROSS_STAGES, 'Pronto para Envio', 'Despachados']
      
    const idx = activeStagesArray.indexOf(stage)
    if (idx < 0 || idx >= activeStagesArray.length - 1) return

    const next: Stage = activeStagesArray[idx + 1] as Stage
    if (next === 'Despachados') { setDispatchModal(order); return }

    await movePedidoLVEtapa(order.id, next)
    await loadOrders()
    setViewModal(null)
    showToast(`Pedido movido para "${next}"!`)
  }

  const handleDispatch = async (transportadora: string, rastreio: string) => {
    if (!dispatchModal) return
    await despacharPedidoLV(dispatchModal.id, transportadora, rastreio)
    await loadOrders()
    setDispatchModal(null)
    setViewModal(null)
    showToast(`Pedido ${dispatchModal.id} despachado!`)
  }

  // Drag & drop
  const handleDrop = async (e: React.DragEvent, targetStage: Stage) => {
    e.preventDefault()
    const orderId = e.dataTransfer.getData('orderId')
    const fromStage = e.dataTransfer.getData('fromStage') as Stage
    if (!orderId || fromStage === targetStage) { setDragOver(null); return }

    if (targetStage === 'Despachados') {
      const order = getActiveCols()[fromStage]?.find(o => o.id === orderId)
      if (order) setDispatchModal(order)
      setDragOver(null)
      return
    }

    await movePedidoLVEtapa(orderId, targetStage)
    await loadOrders()
    setDragOver(null)
    showToast(`Pedido movido para "${targetStage}"!`)
  }

  const isQuadros = (o: Order) => o.categoria === 'Quadro'

  const columnsCross: Record<Stage, Order[]> = {} as any
  const columnsQuadros: Record<Stage, Order[]> = {} as any
  const allOrdersList: Order[] = []

  ALL_STAGES.forEach(s => {
    columnsCross[s] = []
    columnsQuadros[s] = []
    columns[s].forEach(o => {
      allOrdersList.push(o)
      if (isQuadros(o)) columnsQuadros[s].push(o)
      else columnsCross[s].push(o)
    })
  })

  allOrdersList.sort((a, b) => new Date(b.data + ' ' + b.hora).getTime() - new Date(a.data + ' ' + a.hora).getTime())

  const getActiveCols = () => baseView === 'quadros' ? columnsQuadros : columnsCross
  const getActiveStages = () => baseView === 'quadros' ? QUADROS_STAGES : CROSS_STAGES

  const totalAtivos = getActiveStages().reduce((sum, s) => sum + getActiveCols()[s].length, 0)
  const totalAtrasados = Object.values(getActiveCols()).flat().filter(o => o.status === 'Atrasado').length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 z-10 relative">
        <div className="px-6 pt-6 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center border border-amber-100/50" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
                <Sofa size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Produção PCP</h1>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Gestão e acompanhamento de fluxos</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 shadow-inner w-full md:w-auto justify-center">
              {[
                { id: 'geral', label: 'Visão Geral', icon: <ClipboardList size={14} /> },
                { id: 'cross', label: 'Cross-Docking', icon: <Truck size={14} /> },
                { id: 'quadros', label: 'Fábrica de Quadros', icon: <Package size={14} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setBaseView(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    baseView === tab.id 
                      ? 'bg-white text-amber-700 shadow-sm ring-1 ring-gray-900/5' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {loading && <RefreshCw size={15} className="text-amber-500 animate-spin" />}
              <button onClick={() => loadOrders()} className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm" title="Atualizar">
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => setNewModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 shadow-sm hover:shadow active:scale-95"
                style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
              >
                <Plus size={16} /> Novo Pedido
              </button>
            </div>
          </div>
        </div>

        {/* Kanban specific sub-header (only when not in geral view) */}
        {baseView !== 'geral' && (
          <div className="px-6 pb-4 pt-1 flex items-center justify-between border-t border-gray-100 bg-gray-50/50">
            {/* Stage Toggle */}
            <div className="flex gap-1.5 mt-3">
              {[
                { key: 'kanban',    label: 'Fluxo Kanban' },
                { key: 'delivery',  label: 'Prontos para Envio' },
                { key: 'dispatched',label: 'Despachados' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveStage(tab.key as any)}
                  className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
                    activeStage === tab.key 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-5 text-[13px] font-medium text-gray-500 mt-3">
              {totalAtrasados > 0 && (
                <span className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                  <AlertTriangle size={14} />
                  <strong>{totalAtrasados}</strong> atrasado{totalAtrasados > 1 ? 's' : ''}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                Ativos: <strong className="text-gray-900">{totalAtivos}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                Envio: <strong className="text-gray-900">{getActiveCols()['Pronto para Envio'].length}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                Despachados: <strong className="text-gray-900">{getActiveCols()['Despachados'].length}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Visão Geral (Table) */}
      {!loading && baseView === 'geral' && (
        <div className="flex-1 overflow-y-auto p-5">
           <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
             <table className="w-full text-left">
               <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                 <tr>
                   <th className="px-5 py-4 whitespace-nowrap">Pedido</th>
                   <th className="px-5 py-4 whitespace-nowrap">Cliente</th>
                   <th className="px-5 py-4 whitespace-nowrap">Produto</th>
                   <th className="px-5 py-4 whitespace-nowrap">Categoria</th>
                   <th className="px-5 py-4 whitespace-nowrap">Prazo</th>
                   <th className="px-5 py-4 whitespace-nowrap text-center">Status / Etapa</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {allOrdersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">
                        Nenhum pedido encontrado.
                      </td>
                    </tr>
                 ) : allOrdersList.map(o => {
                    const isQ = isQuadros(o)
                    const etapaStr = o.status === 'OK' ? 'Concluído' : 'Em andamento'
                    return (
                      <tr key={o.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setViewModal({ order: o, stage: o.status === 'OK' ? 'Despachados' : 'Novos Pedidos' })}>
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">#{o.id.slice(-6)}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-sm font-semibold text-gray-900">{o.cliente}</p>
                          <p className="text-[10px] text-gray-500">{o.data}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-800 mb-0.5">{o.produto}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{o.sku || 'Sem SKU'}</p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`text-[10px] uppercase font-bold tracking-wide px-2 py-1 rounded-md ${isQ ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                            {o.categoria || 'Não def.'}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <PrazoTag prazo={o.prazoEntrega} />
                        </td>
                        <td className="px-5 py-4 text-center">
                           <span className={`inline-block w-2.5 h-2.5 rounded-full ${o.status === 'Atrasado' ? 'bg-red-500' : o.status === 'OK' ? 'bg-emerald-500' : 'bg-yellow-500'}`} title={o.status}></span>
                        </td>
                      </tr>
                    )
                 })}
               </tbody>
             </table>
           </div>
        </div>
      )}



      {/* Kanban */}
      {!loading && baseView !== 'geral' && activeStage === 'kanban' && (totalAtivos > 0 || true) && (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-5 h-full min-w-max">
            {getActiveStages().map(stage => (
              <div
                key={stage}
                className={`kanban-col flex flex-col w-64 shrink-0 rounded-2xl overflow-hidden h-full transition-colors ${
                  dragOver === stage ? 'ring-2 ring-amber-400 ring-offset-2' : ''
                } ${STAGE_BG[stage] ?? 'bg-gray-50'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(stage) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, stage)}
              >
                <div className="px-3 py-2.5 border-b border-gray-200 shrink-0 bg-white/80">
                  <div className="flex flex-wrap items-center justify-between gap-4 py-3 bg-white">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <span className={`w-2 h-2 rounded-full ${STAGE_DOT[stage]}`} />
                      <span className="text-xs font-semibold text-gray-700">{stage}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                      {getActiveCols()[stage].length}
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {getActiveCols()[stage].length === 0 ? (
                    <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center m-1 rounded-[14px] border-2 border-dashed border-gray-200/60 bg-white/40">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-white shadow-sm ring-1 ring-gray-900/5 ${STAGE_DOT[stage].replace('bg-', 'text-')}`}>
                        <Package size={18} strokeWidth={2.5} />
                      </div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Coluna Vazia</p>
                    </div>
                  ) : (
                    getActiveCols()[stage].map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onView={() => setViewModal({ order, stage })}
                        dragging={dragging === order.id}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('orderId', order.id)
                          e.dataTransfer.setData('fromStage', stage)
                          setDragging(order.id)
                        }}
                        onDragEnd={() => setDragging(null)}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prontos para Envio */}
      {!loading && baseView !== 'geral' && activeStage === 'delivery' && (
        <div className="flex-1 overflow-y-auto p-5">
          <div
            className={`rounded-2xl overflow-hidden min-h-[200px] transition-colors ${
              dragOver === 'Pronto para Envio' ? 'ring-2 ring-amber-400 ring-offset-2' : ''
            } ${STAGE_BG['Pronto para Envio'] ?? 'bg-yellow-50 border border-yellow-200'}`}
            onDragOver={e => { e.preventDefault(); setDragOver('Pronto para Envio') }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, 'Pronto para Envio')}
          >
            <div className="px-4 py-3 border-b border-yellow-200 bg-white/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm font-semibold text-gray-700">Pronto para Envio</span>
              </div>
              <span className="text-sm font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{getActiveCols()['Pronto para Envio'].length}</span>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {getActiveCols()['Pronto para Envio'].length === 0 ? (
                <div className="col-span-full h-40 flex flex-col items-center justify-center text-center m-1 rounded-[14px] border-2 border-dashed border-gray-200/60 bg-white/40">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-white shadow-sm ring-1 ring-gray-900/5 text-yellow-500">
                    <Truck size={18} strokeWidth={2.5} />
                  </div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nenhum pedido</p>
                </div>
              ) : (
                getActiveCols()['Pronto para Envio'].map(order => (
                  <OrderCard key={order.id} order={order} onView={() => setViewModal({ order, stage: 'Pronto para Envio' })}
                    dragging={false} onDragStart={() => {}} onDragEnd={() => {}} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Despachados */}
      {!loading && baseView !== 'geral' && activeStage === 'dispatched' && (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-2xl overflow-hidden bg-emerald-50 border border-emerald-200 min-h-[200px]">
            <div className="px-4 py-3 border-b border-emerald-200 bg-white/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-gray-700">Despachados</span>
              </div>
              <span className="text-sm font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{getActiveCols()['Despachados'].length}</span>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {getActiveCols()['Despachados'].length === 0 ? (
                <div className="col-span-full h-40 flex flex-col items-center justify-center text-center m-1 rounded-[14px] border-2 border-dashed border-gray-200/60 bg-white/40">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-white shadow-sm ring-1 ring-gray-900/5 text-emerald-500">
                    <CheckCircle size={18} strokeWidth={2.5} />
                  </div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nenhum pedido</p>
                </div>
              ) : (
                getActiveCols()['Despachados'].map(order => (
                  <OrderCard key={order.id} order={order} onView={() => setViewModal({ order, stage: 'Despachados' })}
                    dragging={false} onDragStart={() => {}} onDragEnd={() => {}} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {newModal && <NewOrderModal key="new" onClose={() => setNewModal(false)} onSave={handleNewOrder} />}
        {viewModal && (
          <DetailModal
            key={viewModal.order.id}
            order={viewModal.order}
            stage={viewModal.stage}
            onClose={() => setViewModal(null)}
            onUpdate={handleUpdate}
            onConclude={() => handleAdvance(viewModal.order, viewModal.stage)}
          />
        )}
        {dispatchModal && (
          <DispatchModal
            key="dispatch"
            order={dispatchModal}
            onClose={() => setDispatchModal(null)}
            onDispatch={handleDispatch}
          />
        )}
        {toast && <Toast key="toast" msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
