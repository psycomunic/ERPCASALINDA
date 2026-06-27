import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Download, Plus, Filter, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  X, Check, Sofa, Package, AlertTriangle,
  Edit2, Trash2, Search, History, Upload, Image as ImageIcon,
  DollarSign, MapPin, Tag, Ruler, Palette,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  fetchOutrosLV, fetchMovsLV, registrarMovLV,
  updateMinimoItem, createItemLV, updateItemLV, deleteItemLV,
} from '../../services/estoqueLV'
import type { OutroItemLV, MovimentacaoLV } from '../../services/estoqueLV'
import {
  fetchCatalogoTapetes, createTapeteCatalogo, updateTapeteCatalogo,
  deleteTapeteCatalogo, registrarMovTapete, uploadFotoTapete,
} from '../../services/catalogoTapetesLV'
import type { TapeteCatalogo, TapeteCreateInput } from '../../services/catalogoTapetesLV'
import { syncEstoqueTellaioFromMagazord } from '../../services/estoqueTellaio'
import { upsertTapetesFromSync } from '../../services/estoqueLV'
import { isSupabaseConfigured } from '../../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'tapetes' | 'outros' | 'historico'

const STATUS_BADGE: Record<string, string> = {
  NORMAL: 'badge-normal',
  'CRÍTICO': 'badge-critico',
  'ATENÇÃO': 'badge-atencao',
}

const OUTROS_CATEGORIAS = ['Quadro', 'Cama/Mesa/Banho', 'Almofada', 'Vaso/Decoração', 'Outro']
const OUTROS_UNIDADES   = ['un', 'm²', 'cx', 'kit', 'par', 'peça', 'rolo']
const LINHAS_TAPETE     = ['RIOS', 'LAGOS', 'OUTRO'] as const
const MATERIAIS         = ['Polipropileno', 'Viscose', 'Lã', 'Bambu', 'Algodão', 'Sintético', 'Misto', 'Outro']
const ORIGENS           = ['Nacional', 'Importado', 'Turquia', 'Bélgica', 'China', 'Índia']

const EMPTY_FORM: TapeteCreateInput = {
  codigo: '', ean: '', nome: '', colecao: '', linha: 'RIOS',
  tamanho: '', largura_cm: undefined, comprimento_cm: undefined,
  desenho: '', cor_predominante: '', material: '', origem: 'Nacional',
  fornecedor: 'Tellaio', codigo_fornecedor: '', preco_custo: undefined,
  preco_venda: undefined, quantidade: 0, quantidade_minima: 2,
  localizacao: '', obs: '',
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number | null | undefined) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'NORMAL' | 'CRÍTICO' | 'ATENÇÃO' }) {
  const cls = status === 'CRÍTICO'
    ? 'bg-red-100 text-red-700 border-red-200'
    : status === 'ATENÇÃO'
    ? 'bg-orange-100 text-orange-700 border-orange-200'
    : 'bg-green-100 text-green-700 border-green-200'
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  )
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

// ─── Photo Upload Zone ────────────────────────────────────────────────────────

function PhotoUpload({
  current, onUpload, uploading,
}: { current: string | null; onUpload: (f: File) => void; uploading: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const handle = (file: File) => {
    if (!file.type.startsWith('image/')) return
    onUpload(file)
  }

  return (
    <div
      className={`relative w-full h-48 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
        drag ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-gray-50 hover:border-amber-300 hover:bg-amber-50/30'
      }`}
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handle(f) }}
    >
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }} />

      {uploading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-amber-600 font-medium">Enviando imagem...</p>
        </div>
      ) : current ? (
        <>
          <img src={current} alt="Foto do tapete" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1.5 text-white text-xs font-semibold">
              <Upload size={14} /> Trocar foto
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
            <ImageIcon size={24} className="text-gray-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Clique ou arraste uma foto</p>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG ou WebP — máx. 5MB</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tapete Card ──────────────────────────────────────────────────────────────

function TapeteCard({
  tapete,
  onEdit,
  onEntrada,
  onSaida,
}: {
  tapete: TapeteCatalogo
  onEdit: () => void
  onEntrada: () => void
  onSaida: () => void
}) {
  const linhaColor = tapete.linha === 'LAGOS'
    ? 'bg-blue-50 text-blue-700 border-blue-100'
    : tapete.linha === 'OUTRO'
    ? 'bg-purple-50 text-purple-700 border-purple-100'
    : 'bg-green-50 text-green-700 border-green-100'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-amber-200 transition-all group"
    >
      {/* Photo */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {tapete.foto_url ? (
          <img src={tapete.foto_url} alt={tapete.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-50 to-orange-50">
            <Sofa size={32} className="text-amber-200" />
            <p className="text-[10px] text-amber-300 font-medium">Sem foto</p>
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={tapete.status} />
        </div>
        {/* Linha badge */}
        {tapete.linha && (
          <div className="absolute top-2 left-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${linhaColor}`}>
              {tapete.linha}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        {tapete.colecao && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">{tapete.colecao}</p>
        )}
        <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{tapete.nome}</h3>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tapete.tamanho && (
            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md font-medium">{tapete.tamanho}</span>
          )}
          {tapete.desenho && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{tapete.desenho}</span>
          )}
          {tapete.cor_predominante && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{tapete.cor_predominante}</span>
          )}
        </div>

        {/* Stock bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400 font-medium">ESTOQUE</span>
            <span className={`text-sm font-bold ${
              tapete.status === 'CRÍTICO' ? 'text-red-600' : tapete.status === 'ATENÇÃO' ? 'text-orange-500' : 'text-gray-800'
            }`}>{tapete.quantidade} un</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                tapete.status === 'CRÍTICO' ? 'bg-red-400' : tapete.status === 'ATENÇÃO' ? 'bg-orange-400' : 'bg-green-400'
              }`}
              style={{ width: `${Math.min(100, (tapete.quantidade / Math.max(tapete.quantidade_minima * 2, 1)) * 100)}%` }}
            />
          </div>
          <p className="text-[9px] text-gray-400 mt-0.5">Mín: {tapete.quantidade_minima} un</p>
        </div>

        {/* Price */}
        {(tapete.preco_custo || tapete.preco_venda) && (
          <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex gap-3">
            {tapete.preco_custo && (
              <div>
                <p className="text-[9px] text-gray-400 uppercase">Custo</p>
                <p className="text-xs font-bold text-gray-700">{fmtBRL(tapete.preco_custo)}</p>
              </div>
            )}
            {tapete.preco_venda && (
              <div>
                <p className="text-[9px] text-gray-400 uppercase">Venda</p>
                <p className="text-xs font-bold text-amber-700">{fmtBRL(tapete.preco_venda)}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex gap-1.5">
          <button
            onClick={onEntrada}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-100"
          >
            <ArrowUpCircle size={11} /> Entrada
          </button>
          <button
            onClick={onSaida}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
          >
            <ArrowDownCircle size={11} /> Saída
          </button>
          <button
            onClick={onEdit}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-50 text-gray-600 hover:bg-amber-50 hover:text-amber-700 transition-colors border border-gray-100"
            title="Editar tapete"
          >
            <Edit2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InventoryLV() {
  const { profile } = useAuth()
  const userLabel = profile?.nome || profile?.email || 'Sistema'
  const isSupabase = isSupabaseConfigured()

  // ── Global ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState<Tab>('tapetes')
  const [toast, setToast]           = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  // ── Tapetes State ────────────────────────────────────────────────────────────
  const [tapetes, setTapetes]               = useState<TapeteCatalogo[]>([])
  const [loadingTapetes, setLoadingTapetes] = useState(true)
  const [isSyncing, setIsSyncing]           = useState(false)

  // Filters
  const [filterLinha, setFilterLinha]           = useState<'TODOS' | 'RIOS' | 'LAGOS' | 'OUTRO'>('TODOS')
  const [filterColecao, setFilterColecao]       = useState('TODAS')
  const [filterStatusTapete, setFilterStatusTapete] = useState('TODOS')
  const [searchTapete, setSearchTapete]         = useState('')

  // Create / Edit tapete modal
  const [modalTapete, setModalTapete]   = useState<'novo' | 'editar' | null>(null)
  const [editingTapete, setEditingTapete] = useState<TapeteCatalogo | null>(null)
  const [tapeteForm, setTapeteForm]     = useState<TapeteCreateInput>({ ...EMPTY_FORM })
  const [fotoPreview, setFotoPreview]   = useState<string | null>(null)
  const [fotoFile, setFotoFile]         = useState<File | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [savingTapete, setSavingTapete] = useState(false)

  // Mov tapete modal (entrada / saída)
  const [movModal, setMovModal]   = useState<{ tapete: TapeteCatalogo; tipo: 'entrada' | 'saida' | 'ajuste' } | null>(null)
  const [movForm, setMovForm]     = useState({ quantidade: '', nf: '', motivo: '' })
  const [savingMov, setSavingMov] = useState(false)

  // Confirm delete tapete
  const [confirmDeleteTapete, setConfirmDeleteTapete] = useState<TapeteCatalogo | null>(null)

  // ── Outros State ─────────────────────────────────────────────────────────────
  const [outros, setOutros]               = useState<OutroItemLV[]>([])
  const [loadingOutros, setLoadingOutros] = useState(false)

  const [modalNovoOutro, setModalNovoOutro]         = useState(false)
  const [modalEntradaOutro, setModalEntradaOutro]   = useState(false)
  const [formNovoOutro, setFormNovoOutro]           = useState({ nome: '', categoria: OUTROS_CATEGORIAS[0], unidade: 'un', minimo: '' })
  const [formEntradaOutro, setFormEntradaOutro]     = useState({ itemId: '', quantidade: '', nf: '', obs: '' })

  const [editOutro, setEditOutro]         = useState<OutroItemLV | null>(null)
  const [formEditOutro, setFormEditOutro] = useState({ nome: '', categoria: '', unidade: '', atual: '', minimo: '' })
  const [confirmDeleteOutro, setConfirmDeleteOutro] = useState<OutroItemLV | null>(null)

  // ── Histórico State ───────────────────────────────────────────────────────────
  const [movs, setMovs]               = useState<MovimentacaoLV[]>([])
  const [loadingMovs, setLoadingMovs] = useState(false)
  const [filterMovTipo, setFilterMovTipo] = useState('TODOS')

  // ── Load Functions ────────────────────────────────────────────────────────────

  const loadTapetes = useCallback(async () => {
    setLoadingTapetes(true)
    const data = await fetchCatalogoTapetes()
    setTapetes(data)
    setLoadingTapetes(false)
  }, [])

  const loadOutros = async () => {
    setLoadingOutros(true)
    const data = await fetchOutrosLV()
    setOutros(data)
    setLoadingOutros(false)
  }

  const loadMovs = async () => {
    setLoadingMovs(true)
    const data = await fetchMovsLV()
    setMovs(data)
    setLoadingMovs(false)
  }

  useEffect(() => { loadTapetes(); loadOutros() }, [loadTapetes])
  useEffect(() => { if (activeTab === 'historico' && movs.length === 0) loadMovs() }, [activeTab])

  // ── Tapetes Handlers ──────────────────────────────────────────────────────────

  const handleSyncMagazord = async () => {
    setIsSyncing(true)
    showToast('Sincronizando com Magazord...')
    try {
      const result = await syncEstoqueTellaioFromMagazord()
      if (result.itens.length > 0) {
        const { sucesso, falhas } = await upsertTapetesFromSync(
          result.itens.map(i => ({ ref: i.ref, nome: i.nome, atual: i.atual, minimo: i.minimo }))
        )
        await loadTapetes()
        showToast(`Sync concluído! ${sucesso} tapetes atualizados${falhas > 0 ? `, ${falhas} falhas` : ''}.`)
      } else {
        showToast(`Magazord: sem itens retornados (${result.falhas} falhas de API).`)
      }
    } catch {
      showToast('Erro ao sincronizar com Magazord.')
    } finally {
      setIsSyncing(false)
    }
  }

  const openNovoTapete = () => {
    setEditingTapete(null)
    setTapeteForm({ ...EMPTY_FORM })
    setFotoPreview(null)
    setFotoFile(null)
    setModalTapete('novo')
  }

  const openEditTapete = (t: TapeteCatalogo) => {
    setEditingTapete(t)
    setTapeteForm({
      codigo: t.codigo ?? '', ean: t.ean ?? '', nome: t.nome,
      colecao: t.colecao ?? '', linha: t.linha ?? 'RIOS',
      tamanho: t.tamanho ?? '', largura_cm: t.largura_cm ?? undefined,
      comprimento_cm: t.comprimento_cm ?? undefined, desenho: t.desenho ?? '',
      cor_predominante: t.cor_predominante ?? '', material: t.material ?? '',
      origem: t.origem ?? 'Nacional', fornecedor: t.fornecedor ?? 'Tellaio',
      codigo_fornecedor: t.codigo_fornecedor ?? '',
      preco_custo: t.preco_custo ?? undefined, preco_venda: t.preco_venda ?? undefined,
      quantidade: t.quantidade, quantidade_minima: t.quantidade_minima,
      localizacao: t.localizacao ?? '', obs: t.obs ?? '',
      foto_url: t.foto_url ?? undefined,
    })
    setFotoPreview(t.foto_url ?? null)
    setFotoFile(null)
    setModalTapete('editar')
  }

  const handleFotoUpload = async (file: File) => {
    setFotoPreview(URL.createObjectURL(file))
    setFotoFile(file)
  }

  const handleSaveTapete = async () => {
    if (!tapeteForm.nome.trim()) return showToast('Nome é obrigatório.')
    setSavingTapete(true)
    try {
      let foto_url = tapeteForm.foto_url ?? editingTapete?.foto_url ?? undefined
      if (fotoFile) {
        setUploadingFoto(true)
        const url = await uploadFotoTapete(fotoFile)
        setUploadingFoto(false)
        if (url) foto_url = url
      }

      const payload = { ...tapeteForm, foto_url }

      if (modalTapete === 'editar' && editingTapete) {
        const ok = await updateTapeteCatalogo(editingTapete.id, payload)
        if (ok) {
          showToast('Tapete atualizado com sucesso!')
          setModalTapete(null)
          await loadTapetes()
        } else showToast('Erro ao atualizar tapete.')
      } else {
        const created = await createTapeteCatalogo(payload)
        if (created) {
          showToast('Tapete cadastrado com sucesso!')
          setModalTapete(null)
          await loadTapetes()
        } else showToast('Erro ao cadastrar tapete.')
      }
    } finally {
      setSavingTapete(false)
    }
  }

  const handleDeleteTapete = async () => {
    if (!confirmDeleteTapete) return
    const ok = await deleteTapeteCatalogo(confirmDeleteTapete.id)
    if (ok) {
      setConfirmDeleteTapete(null)
      setModalTapete(null)
      await loadTapetes()
      showToast(`"${confirmDeleteTapete.nome}" excluído.`)
    } else showToast('Erro ao excluir tapete.')
  }

  const openMovModal = (tapete: TapeteCatalogo, tipo: 'entrada' | 'saida' | 'ajuste') => {
    setMovModal({ tapete, tipo })
    setMovForm({ quantidade: '', nf: '', motivo: '' })
  }

  const handleSaveMov = async () => {
    if (!movModal) return
    const qtd = Number(movForm.quantidade)
    if (!qtd || qtd <= 0) return showToast('Informe uma quantidade válida.')
    setSavingMov(true)
    const ok = await registrarMovTapete({
      tapete_id: movModal.tapete.id,
      tipo: movModal.tipo,
      quantidade: qtd,
      nf: movForm.nf || undefined,
      motivo: movForm.motivo || (movModal.tipo === 'entrada' ? 'Entrada de estoque' : movModal.tipo === 'saida' ? 'Saída de estoque' : 'Ajuste manual'),
      usuario: userLabel,
    })
    setSavingMov(false)
    if (ok) {
      setMovModal(null)
      await loadTapetes()
      showToast(`${movModal.tipo === 'entrada' ? 'Entrada' : movModal.tipo === 'saida' ? 'Saída' : 'Ajuste'} registrado!`)
    } else showToast('Erro ao registrar movimentação.')
  }

  const handleExportTapetes = () => {
    const rows = [
      'Nome,Coleção,Linha,Tamanho,Desenho,Cor,Material,Código,EAN,Fornecedor,Custo (R$),Venda (R$),Qtd,Mín,Status,Localização',
      ...tapetes.map(t =>
        `"${t.nome}","${t.colecao ?? ''}","${t.linha ?? ''}","${t.tamanho ?? ''}","${t.desenho ?? ''}","${t.cor_predominante ?? ''}","${t.material ?? ''}","${t.codigo ?? ''}","${t.ean ?? ''}","${t.fornecedor}",${t.preco_custo ?? ''},${t.preco_venda ?? ''},${t.quantidade},${t.quantidade_minima},"${t.status}","${t.localizacao ?? ''}"`
      ),
    ].join('\n')
    const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'catalogo-tapetes-lv.csv'; a.click()
    URL.revokeObjectURL(url)
    showToast('CSV exportado!')
  }

  // ── Outros Handlers ───────────────────────────────────────────────────────────

  const handleCreateOutro = async () => {
    if (!formNovoOutro.nome.trim()) return showToast('Nome é obrigatório.')
    const ok = await createItemLV({ nome: formNovoOutro.nome.trim(), categoria: formNovoOutro.categoria, unidade: formNovoOutro.unidade, minimo: Number(formNovoOutro.minimo) || 0 })
    if (ok) { setModalNovoOutro(false); setFormNovoOutro({ nome: '', categoria: OUTROS_CATEGORIAS[0], unidade: 'un', minimo: '' }); await loadOutros(); showToast('Produto cadastrado com sucesso!') }
    else showToast('Erro ao cadastrar produto.')
  }

  const handleEntradaOutro = async () => {
    const qty = parseFloat(formEntradaOutro.quantidade)
    if (!formEntradaOutro.itemId || isNaN(qty) || qty <= 0) return
    const motivo = ['Entrada de estoque', formEntradaOutro.nf ? `NF ${formEntradaOutro.nf}` : '', formEntradaOutro.obs].filter(Boolean).join(' — ')
    const ok = await registrarMovLV({ item_id: formEntradaOutro.itemId, tipo: 'entrada', quantidade: qty, motivo, usuario: userLabel })
    if (ok) { setModalEntradaOutro(false); setFormEntradaOutro({ itemId: '', quantidade: '', nf: '', obs: '' }); await loadOutros(); showToast('Entrada registrada com sucesso!') }
    else showToast('Erro ao registrar entrada.')
  }

  const handleOpenEditOutro = (item: OutroItemLV) => {
    setEditOutro(item)
    setFormEditOutro({ nome: item.nome, categoria: item.categoria, unidade: item.unidade, atual: String(item.atual), minimo: String(item.minimo) })
  }

  const handleSaveEditOutro = async () => {
    if (!editOutro || !formEditOutro.nome.trim()) return
    const novaQty = Number(formEditOutro.atual)
    let ok = true
    if (novaQty !== editOutro.atual) ok = await registrarMovLV({ item_id: editOutro.id, tipo: 'ajuste', quantidade: novaQty, motivo: 'Ajuste manual', usuario: userLabel })
    if (ok) ok = await updateItemLV(editOutro.id, { nome: formEditOutro.nome.trim(), categoria: formEditOutro.categoria, unidade: formEditOutro.unidade, minimo: Number(formEditOutro.minimo) || 0 })
    setEditOutro(null)
    if (ok) { await loadOutros(); showToast('Produto atualizado com sucesso!') }
    else showToast('Erro ao atualizar produto.')
  }

  const handleDeleteOutro = async () => {
    if (!confirmDeleteOutro) return
    const ok = await deleteItemLV(confirmDeleteOutro.id)
    if (ok) { setConfirmDeleteOutro(null); setEditOutro(null); await loadOutros(); showToast(`"${confirmDeleteOutro.nome}" excluído.`) }
    else showToast('Erro ao excluir produto.')
  }

  // ── Computed ──────────────────────────────────────────────────────────────────

  const colecoesList = useMemo(() => {
    const set = new Set(tapetes.map(t => t.colecao).filter(Boolean) as string[])
    return ['TODAS', ...Array.from(set).sort()]
  }, [tapetes])

  const filteredTapetes = useMemo(() =>
    tapetes.filter(t => {
      if (filterLinha !== 'TODOS' && t.linha !== filterLinha) return false
      if (filterColecao !== 'TODAS' && t.colecao !== filterColecao) return false
      if (filterStatusTapete !== 'TODOS' && t.status !== filterStatusTapete) return false
      if (searchTapete) {
        const q = searchTapete.toLowerCase()
        return (
          t.nome.toLowerCase().includes(q) ||
          (t.colecao ?? '').toLowerCase().includes(q) ||
          (t.codigo ?? '').toLowerCase().includes(q) ||
          (t.ean ?? '').toLowerCase().includes(q) ||
          (t.desenho ?? '').toLowerCase().includes(q) ||
          (t.cor_predominante ?? '').toLowerCase().includes(q)
        )
      }
      return true
    }), [tapetes, filterLinha, filterColecao, filterStatusTapete, searchTapete])

  const criticosTapetes  = tapetes.filter(t => t.status === 'CRÍTICO').length
  const criticosOutros   = outros.filter(o => o.status === 'CRÍTICO').length
  const valorTotalEstoque = tapetes.reduce((s, t) => s + (t.valor_estoque ?? 0), 0)
  const hasFilters = filterLinha !== 'TODOS' || filterColecao !== 'TODAS' || filterStatusTapete !== 'TODOS' || searchTapete !== ''

  // ── Field helper ──────────────────────────────────────────────────────────────
  const setField = (key: keyof TapeteCreateInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value
    setTapeteForm(f => ({ ...f, [key]: val }))
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
            <Sofa size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Almoxarifado — Lar e Vida</h1>
            <p className="text-sm text-gray-500 mt-0.5">Catálogo de tapetes, decoração e linha cama/mesa/banho.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeTab === 'tapetes' && (
            <>
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                onClick={openNovoTapete}
                disabled={!isSupabase}
              >
                <Plus size={14} /> Novo Tapete
              </button>
              <button className="btn-secondary" onClick={handleSyncMagazord} disabled={isSyncing || !isSupabase}>
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Sincronizando...' : 'Sync Magazord'}
              </button>
              <button className="btn-secondary" onClick={handleExportTapetes} disabled={tapetes.length === 0}>
                <Download size={14} /> CSV
              </button>
            </>
          )}
          {activeTab === 'outros' && (
            <>
              <button className="btn-secondary" onClick={() => { setFormEntradaOutro({ itemId: outros[0]?.id || '', quantidade: '', nf: '', obs: '' }); setModalEntradaOutro(true) }} disabled={outros.length === 0 || !isSupabase}>
                <ArrowUpCircle size={14} /> Entrada
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }} onClick={() => setModalNovoOutro(true)} disabled={!isSupabase}>
                <Plus size={14} /> Novo Produto
              </button>
            </>
          )}
          {activeTab === 'historico' && (
            <button className="btn-secondary" onClick={loadMovs}><RefreshCw size={14} /> Atualizar</button>
          )}
        </div>
      </div>

      {/* ── Supabase Warning ── */}
      {!isSupabase && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Supabase não configurado</p>
            <p className="text-xs text-amber-600 mt-0.5">Configure as variáveis de ambiente para persistência dos dados.</p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {([
            { key: 'tapetes',   label: '🪞 Tapetes',        badge: criticosTapetes },
            { key: 'outros',    label: '📦 Outros Produtos', badge: criticosOutros },
            { key: 'historico', label: '📋 Histórico',       badge: 0 },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-600">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: TAPETES
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'tapetes' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
                  <Package size={16} style={{ color: '#d97706' }} />
                </div>
                <span className="badge badge-normal text-[11px]">CADASTROS</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{tapetes.length}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Tapetes no Catálogo</p>
            </div>
            <div className="stat cursor-pointer" onClick={() => setFilterStatusTapete(filterStatusTapete === 'CRÍTICO' ? 'TODOS' : 'CRÍTICO')}>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">⚠</div>
                <span className="badge badge-critico text-[11px]">CRÍTICO</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-2">{criticosTapetes.toString().padStart(2, '0')} un</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Abaixo do Estoque Mínimo</p>
            </div>
            <div className="stat">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
                  <span className="text-sm font-bold" style={{ color: '#d97706' }}>R$</span>
                </div>
                <span className="badge badge-normal text-[11px]">VALOR</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{fmtBRL(valorTotalEstoque)}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Valor Total em Estoque</p>
            </div>
          </div>

          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[160px] max-w-xs">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  className="bg-transparent outline-none text-sm flex-1 text-gray-700 placeholder-gray-400"
                  placeholder="Buscar nome, coleção, código, cor..."
                  value={searchTapete}
                  onChange={e => setSearchTapete(e.target.value)}
                />
                {searchTapete && <button onClick={() => setSearchTapete('')} className="text-gray-300 hover:text-gray-500"><X size={12} /></button>}
              </div>

              <div className="flex gap-1">
                {(['TODOS', 'RIOS', 'LAGOS', 'OUTRO'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setFilterLinha(l)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterLinha === l ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    style={filterLinha === l ? { background: 'linear-gradient(135deg, #b45309, #d97706)' } : {}}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <select className="input text-xs py-1.5" value={filterColecao} style={{ width: 'auto', minWidth: '150px' }} onChange={e => setFilterColecao(e.target.value)}>
                {colecoesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select className="input text-xs py-1.5" value={filterStatusTapete} style={{ width: 'auto', minWidth: '120px' }} onChange={e => setFilterStatusTapete(e.target.value)}>
                {['TODOS', 'NORMAL', 'ATENÇÃO', 'CRÍTICO'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {hasFilters && (
                <button onClick={() => { setFilterLinha('TODOS'); setFilterColecao('TODAS'); setFilterStatusTapete('TODOS'); setSearchTapete('') }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
                  <X size={12} /> Limpar
                </button>
              )}
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                Catálogo de Tapetes
                <span className="text-gray-400 font-normal text-xs">
                  ({filteredTapetes.length} de {tapetes.length})
                </span>
              </p>
              <button className="btn-ghost text-xs" onClick={loadTapetes}>
                <RefreshCw size={12} /> Atualizar
              </button>
            </div>

            {loadingTapetes ? (
              <div className="flex items-center justify-center py-20 gap-3">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Carregando catálogo...</span>
              </div>
            ) : tapetes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                  <Sofa size={36} style={{ color: '#d97706' }} />
                </div>
                <p className="text-base font-bold text-gray-700 mb-1">Nenhum tapete cadastrado</p>
                <p className="text-sm text-gray-400 max-w-xs mb-6">
                  Cadastre tapetes manualmente com foto, dimensões, preços e controle de estoque.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-xl text-white"
                    style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                    onClick={openNovoTapete}
                    disabled={!isSupabase}
                  >
                    <Plus size={14} /> Cadastrar Tapete
                  </button>
                  <button className="btn-secondary" onClick={handleSyncMagazord} disabled={isSyncing || !isSupabase}>
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'Sincronizando...' : 'Importar do Magazord'}
                  </button>
                </div>
              </div>
            ) : filteredTapetes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <Search size={28} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-500 font-medium">Nenhum tapete encontrado com esses filtros.</p>
                <button onClick={() => { setFilterLinha('TODOS'); setFilterColecao('TODAS'); setFilterStatusTapete('TODOS'); setSearchTapete('') }} className="mt-3 text-xs text-amber-600 hover:underline font-semibold">
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="p-4">
                <AnimatePresence mode="popLayout">
                  <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {filteredTapetes.map(t => (
                      <TapeteCard
                        key={t.id}
                        tapete={t}
                        onEdit={() => openEditTapete(t)}
                        onEntrada={() => openMovModal(t, 'entrada')}
                        onSaida={() => openMovModal(t, 'saida')}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: OUTROS PRODUTOS
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'outros' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat">
              <div className="flex items-center justify-between"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}><Package size={16} style={{ color: '#d97706' }} /></div><span className="badge badge-normal text-[11px]">TOTAL</span></div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{outros.length}</p><p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Produtos Cadastrados</p>
            </div>
            <div className="stat">
              <div className="flex items-center justify-between"><div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">⚠</div><span className="badge badge-critico text-[11px]">CRÍTICO</span></div>
              <p className="text-2xl font-bold text-red-600 mt-2">{criticosOutros.toString().padStart(2, '0')} Itens</p><p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Abaixo do Mínimo</p>
            </div>
            <div className="stat">
              <div className="flex items-center justify-between"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}><span style={{ color: '#d97706' }}>📋</span></div><span className="badge badge-normal text-[11px]">CATEGORIAS</span></div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{OUTROS_CATEGORIAS.length}</p><p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Linhas de Produto</p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="font-semibold text-gray-800 text-sm flex items-center gap-2"><Filter size={14} className="text-gray-400" /> Produtos — Decoração e Utilidades</p>
              <button className="btn-ghost text-xs" onClick={loadOutros}><RefreshCw size={12} /> Atualizar</button>
            </div>

            {loadingOutros ? (
              <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : outros.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#fef3c7' }}><Package size={28} style={{ color: '#d97706' }} /></div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Nenhum produto cadastrado</p>
                <p className="text-xs text-gray-400 max-w-xs mb-5">Cadastre quadros, itens de cama/mesa/banho, almofadas e outros produtos decorativos.</p>
                <button className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }} onClick={() => setModalNovoOutro(true)} disabled={!isSupabase}>
                  <Plus size={14} /> Cadastrar Produto
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="th">Produto</th><th className="th">Categoria</th><th className="th">Unidade</th>
                      <th className="th text-center">Atual</th><th className="th text-center">Mínimo</th><th className="th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outros.map(item => (
                      <tr key={item.id} className="tr cursor-pointer hover:bg-amber-50/30 group" onClick={() => handleOpenEditOutro(item)}>
                        <td className="td"><p className="font-medium text-gray-800">{item.nome}</p>{item.codigo && <p className="text-[11px] text-gray-400">{item.codigo}</p>}</td>
                        <td className="td"><span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{item.categoria}</span></td>
                        <td className="td text-gray-500 text-xs">{item.unidade}</td>
                        <td className={`td text-center font-bold ${item.status === 'CRÍTICO' ? 'text-red-600' : item.status === 'ATENÇÃO' ? 'text-orange-500' : 'text-gray-900'}`}>{item.atual}</td>
                        <td className="td text-center text-gray-500">{item.minimo}</td>
                        <td className="td"><span className={`badge ${STATUS_BADGE[item.status]}`}>{item.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: HISTÓRICO
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'historico' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <History size={14} className="text-gray-400" /> Log de Movimentações
              {movs.length > 0 && <span className="text-xs text-gray-400 font-normal">({movs.length} registros)</span>}
            </p>
            <select className="input text-xs py-1.5" value={filterMovTipo} onChange={e => setFilterMovTipo(e.target.value)} style={{ width: 'auto', minWidth: '120px' }}>
              <option value="TODOS">Todos os tipos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
              <option value="ajuste">Ajustes</option>
            </select>
          </div>

          {loadingMovs ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Carregando histórico...</span>
            </div>
          ) : movs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History size={32} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Nenhuma movimentação registrada.</p>
              <button className="mt-3 text-xs text-amber-600 hover:underline" onClick={loadMovs}>Tentar novamente</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {movs.filter(m => filterMovTipo === 'TODOS' || m.tipo === filterMovTipo).map(m => (
                <div key={m.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition-colors">
                  <div className="mt-0.5 shrink-0">
                    {m.tipo === 'entrada' ? <ArrowUpCircle size={18} className="text-green-500" /> : m.tipo === 'saida' ? <ArrowDownCircle size={18} className="text-red-500" /> : <RefreshCw size={18} className="text-amber-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'saida' ? 'Saída' : 'Ajuste'} · {m.quantidade} un</p>
                      {m.item_categoria && <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-100">{m.item_categoria}</span>}
                    </div>
                    {m.item_nome && <p className="text-xs text-gray-600 mt-0.5">{m.item_nome}</p>}
                    {m.motivo && <p className="text-xs text-gray-400 mt-0.5 italic">{m.motivo}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-gray-400">{fmtDate(m.created_at)}</p>
                    {m.usuario && m.usuario !== 'Sistema' && <p className="text-[10px] text-gray-300 mt-0.5">{m.usuario}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>

        {/* ── Modal: Novo / Editar Tapete ── */}
        {modalTapete && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalTapete(null)}>
            <motion.div
              className="modal"
              style={{ maxWidth: 680, maxHeight: '92vh', overflowY: 'auto' }}
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
                    <Sofa size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{modalTapete === 'novo' ? 'Cadastrar Novo Tapete' : 'Editar Tapete'}</h3>
                    <p className="text-xs text-gray-500">Preencha os dados para identificação e controle de estoque</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {modalTapete === 'editar' && editingTapete && (
                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg" onClick={() => setConfirmDeleteTapete(editingTapete)}>
                      <Trash2 size={12} /> Excluir
                    </button>
                  )}
                  <button onClick={() => setModalTapete(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Foto */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-amber-600" /> Foto do Produto
                  </label>
                  <PhotoUpload
                    current={fotoPreview}
                    onUpload={handleFotoUpload}
                    uploading={uploadingFoto}
                  />
                </div>

                {/* Identificação */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Tag size={12} /> Identificação
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Nome Comercial <span className="text-red-500">*</span></label>
                      <input className="input" placeholder="Ex: Tapete Egípcio Kalahari" value={tapeteForm.nome} onChange={setField('nome')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Coleção</label>
                      <input className="input" placeholder="Ex: NAKURU, MOJAVE, KALAHARI" value={tapeteForm.colecao ?? ''} onChange={setField('colecao')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Linha</label>
                      <select className="input" value={tapeteForm.linha ?? 'RIOS'} onChange={setField('linha')}>
                        {LINHAS_TAPETE.map(l => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Código Interno</label>
                      <input className="input font-mono text-sm" placeholder="Ex: 000218.006.002" value={tapeteForm.codigo ?? ''} onChange={setField('codigo')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">EAN / Código de Barras</label>
                      <input className="input font-mono text-sm" placeholder="EAN-13" value={tapeteForm.ean ?? ''} onChange={setField('ean')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Desenho / Ref.</label>
                      <input className="input" placeholder="Ex: DS-02, Desenho 04" value={tapeteForm.desenho ?? ''} onChange={setField('desenho')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1"><Palette size={11} /> Cor Predominante</label>
                      <input className="input" placeholder="Ex: Bege, Cinza, Terracota" value={tapeteForm.cor_predominante ?? ''} onChange={setField('cor_predominante')} />
                    </div>
                  </div>
                </div>

                {/* Dimensões */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Ruler size={12} /> Dimensões & Material
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Tamanho (texto)</label>
                      <input className="input" placeholder="Ex: 2,00m x 3,00m" value={tapeteForm.tamanho ?? ''} onChange={setField('tamanho')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Largura (cm)</label>
                      <input type="number" min="0" step="0.5" className="input" placeholder="200" value={tapeteForm.largura_cm ?? ''} onChange={setField('largura_cm')} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Comprimento (cm)</label>
                      <input type="number" min="0" step="0.5" className="input" placeholder="300" value={tapeteForm.comprimento_cm ?? ''} onChange={setField('comprimento_cm')} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Material</label>
                      <select className="input" value={tapeteForm.material ?? ''} onChange={setField('material')}>
                        <option value="">Selecionar...</option>
                        {MATERIAIS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Origem</label>
                      <select className="input" value={tapeteForm.origem ?? 'Nacional'} onChange={setField('origem')}>
                        {ORIGENS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fornecedor & Preços */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <DollarSign size={12} /> Fornecedor & Preços
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Fornecedor</label>
                      <input className="input" placeholder="Ex: Tellaio, Tapecenter" value={tapeteForm.fornecedor ?? 'Tellaio'} onChange={setField('fornecedor')} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Cód. do Fornecedor</label>
                      <input className="input font-mono text-sm" placeholder="Referência no fornecedor" value={tapeteForm.codigo_fornecedor ?? ''} onChange={setField('codigo_fornecedor')} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Preço de Custo (R$)</label>
                      <input type="number" min="0" step="0.01" className="input" placeholder="0,00" value={tapeteForm.preco_custo ?? ''} onChange={setField('preco_custo')} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Preço de Venda (R$)</label>
                      <input type="number" min="0" step="0.01" className="input" placeholder="0,00" value={tapeteForm.preco_venda ?? ''} onChange={setField('preco_venda')} />
                    </div>
                  </div>
                </div>

                {/* Estoque */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MapPin size={12} /> Estoque & Localização
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Qtd. Inicial</label>
                      <input type="number" min="0" className="input font-bold text-lg" value={tapeteForm.quantidade ?? 0} onChange={setField('quantidade')} />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Qtd. Mínima (alerta)</label>
                      <input type="number" min="0" className="input" value={tapeteForm.quantidade_minima ?? 2} onChange={setField('quantidade_minima')} />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Localização Física</label>
                      <input className="input" placeholder="Ex: Prateleira A3, Depósito 2" value={tapeteForm.localizacao ?? ''} onChange={setField('localizacao')} />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
                  <textarea className="input h-20 resize-none" placeholder="Notas adicionais sobre o produto..." value={tapeteForm.obs ?? ''} onChange={setField('obs')} />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50/50 sticky bottom-0">
                <button onClick={() => setModalTapete(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button
                  onClick={handleSaveTapete}
                  disabled={savingTapete || !tapeteForm.nome.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                >
                  {savingTapete ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</> : <><Check size={14} /> {modalTapete === 'novo' ? 'Cadastrar Tapete' : 'Salvar Alterações'}</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Modal: Entrada / Saída Tapete ── */}
        {movModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMovModal(null)}>
            <motion.div className="modal" style={{ maxWidth: 440 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {movModal.tipo === 'entrada'
                    ? <ArrowUpCircle size={20} className="text-green-500" />
                    : <ArrowDownCircle size={20} className="text-red-500" />}
                  <div>
                    <h3 className="font-bold text-gray-900">{movModal.tipo === 'entrada' ? 'Entrada de Estoque' : 'Saída de Estoque'}</h3>
                    <p className="text-xs text-gray-500 truncate max-w-[220px]">{movModal.tapete.nome}</p>
                  </div>
                </div>
                <button onClick={() => setMovModal(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                {/* Mini preview */}
                {movModal.tapete.foto_url && (
                  <div className="h-24 rounded-xl overflow-hidden bg-gray-100">
                    <img src={movModal.tapete.foto_url} alt={movModal.tapete.nome} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 text-sm">
                  <span className="text-gray-500">Estoque atual:</span>
                  <span className={`font-bold ${movModal.tapete.status === 'CRÍTICO' ? 'text-red-600' : 'text-gray-800'}`}>{movModal.tapete.quantidade} un</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantidade <span className="text-red-500">*</span></label>
                  <input type="number" min="1" className="input font-bold text-lg" placeholder="0" value={movForm.quantidade} onChange={e => setMovForm(f => ({ ...f, quantidade: e.target.value }))} />
                  {movModal.tipo === 'saida' && Number(movForm.quantidade) > movModal.tapete.quantidade && (
                    <p className="text-xs text-red-500 mt-1">⚠ Quantidade maior que o estoque atual</p>
                  )}
                </div>
                {movModal.tipo === 'entrada' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nota Fiscal</label>
                    <input className="input" placeholder="NF 0000" value={movForm.nf} onChange={e => setMovForm(f => ({ ...f, nf: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo / Observação</label>
                  <input className="input" placeholder={movModal.tipo === 'entrada' ? 'Ex: Recebimento de fornecedor' : 'Ex: Venda, devolução...'} value={movForm.motivo} onChange={e => setMovForm(f => ({ ...f, motivo: e.target.value }))} />
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setMovModal(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button
                    onClick={handleSaveMov}
                    disabled={savingMov || !movForm.quantidade}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold disabled:opacity-50"
                    style={{ background: movModal.tipo === 'entrada' ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #dc2626, #ef4444)' }}
                  >
                    {savingMov ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : movModal.tipo === 'entrada' ? <><ArrowUpCircle size={14} /> Registrar Entrada</> : <><ArrowDownCircle size={14} /> Registrar Saída</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Confirm Delete Tapete ── */}
        {confirmDeleteTapete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmDeleteTapete(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-600" /></div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Excluir Tapete?</h3>
                <p className="text-sm font-medium text-gray-700 text-center mb-4">"{confirmDeleteTapete.nome}"</p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex gap-2">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Esta ação é <strong>irreversível</strong>. O tapete e seu histórico de movimentações serão removidos permanentemente.</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50" onClick={() => setConfirmDeleteTapete(null)}>Cancelar</button>
                  <button className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-colors" onClick={handleDeleteTapete}>
                    <Trash2 size={14} /> Sim, excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Novo Produto Outro ── */}
        {modalNovoOutro && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalNovoOutro(false)}>
            <motion.div className="modal" style={{ maxWidth: 460 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}><Plus size={14} className="text-white" /></div><div><h3 className="font-bold text-gray-900">Novo Produto</h3><p className="text-xs text-gray-500">Decoração, cama/mesa/banho etc.</p></div></div>
                <button onClick={() => setModalNovoOutro(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Produto <span className="text-red-500">*</span></label><input className="input" placeholder="Ex: Almofada Decorativa 45×45cm" value={formNovoOutro.nome} onChange={e => setFormNovoOutro(f => ({ ...f, nome: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label><select className="input" value={formNovoOutro.categoria} onChange={e => setFormNovoOutro(f => ({ ...f, categoria: e.target.value }))}>{OUTROS_CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Unidade</label><select className="input" value={formNovoOutro.unidade} onChange={e => setFormNovoOutro(f => ({ ...f, unidade: e.target.value }))}>{OUTROS_UNIDADES.map(u => <option key={u}>{u}</option>)}</select></div>
                </div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Estoque Mínimo</label><input type="number" min="0" className="input" placeholder="0" value={formNovoOutro.minimo} onChange={e => setFormNovoOutro(f => ({ ...f, minimo: e.target.value }))} /></div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setModalNovoOutro(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button onClick={handleCreateOutro} disabled={!formNovoOutro.nome.trim()} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}><Check size={14} /> Cadastrar</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Entrada Outro ── */}
        {modalEntradaOutro && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalEntradaOutro(false)}>
            <motion.div className="modal" style={{ maxWidth: 460 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div><h3 className="font-bold text-gray-900">Entrada de Estoque</h3><p className="text-xs text-gray-500 mt-0.5">Registre a chegada de produtos ao almoxarifado.</p></div>
                <button onClick={() => setModalEntradaOutro(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div><label className="block text-xs text-gray-500 mb-1">Produto <span className="text-red-500">*</span></label><select className="input" value={formEntradaOutro.itemId} onChange={e => setFormEntradaOutro(f => ({ ...f, itemId: e.target.value }))}><option value="">Selecionar produto...</option>{outros.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Quantidade <span className="text-red-500">*</span></label><input type="number" min="1" className="input" placeholder="0" value={formEntradaOutro.quantidade} onChange={e => setFormEntradaOutro(f => ({ ...f, quantidade: e.target.value }))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Nota Fiscal</label><input className="input" placeholder="NF 0000" value={formEntradaOutro.nf} onChange={e => setFormEntradaOutro(f => ({ ...f, nf: e.target.value }))} /></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Observações</label><textarea className="input h-16 resize-none" placeholder="Fornecedor, observações..." value={formEntradaOutro.obs} onChange={e => setFormEntradaOutro(f => ({ ...f, obs: e.target.value }))} /></div>
                <div className="flex gap-3">
                  <button onClick={() => setModalEntradaOutro(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button onClick={handleEntradaOutro} disabled={!formEntradaOutro.itemId || !formEntradaOutro.quantidade} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}><Check size={14} /> Registrar Entrada</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Edit Outro ── */}
        {editOutro && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditOutro(null)}>
            <motion.div className="modal" style={{ maxWidth: 480 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div className="flex items-center gap-3"><Edit2 size={18} className="text-amber-700" /><div><h3 className="font-bold text-gray-900">Editar Produto</h3><p className="text-xs text-gray-500">{editOutro.nome}</p></div></div>
                <button onClick={() => setEditOutro(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Nome <span className="text-red-500">*</span></label><input type="text" className="input" value={formEditOutro.nome} onChange={e => setFormEditOutro(f => ({ ...f, nome: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label><select className="input" value={formEditOutro.categoria} onChange={e => setFormEditOutro(f => ({ ...f, categoria: e.target.value }))}>{OUTROS_CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Unidade</label><select className="input" value={formEditOutro.unidade} onChange={e => setFormEditOutro(f => ({ ...f, unidade: e.target.value }))}>{OUTROS_UNIDADES.map(u => <option key={u}>{u}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Estoque Atual</label><input type="number" min="0" className="input bg-white font-bold" value={formEditOutro.atual} onChange={e => setFormEditOutro(f => ({ ...f, atual: e.target.value }))} /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Estoque Mínimo</label><input type="number" min="0" className="input bg-white" value={formEditOutro.minimo} onChange={e => setFormEditOutro(f => ({ ...f, minimo: e.target.value }))} /></div>
                </div>
              </div>
              <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 text-sm font-semibold mr-auto transition-colors" onClick={() => editOutro && setConfirmDeleteOutro(editOutro)}><Trash2 size={14} /> Excluir</button>
                <button className="btn-secondary" onClick={() => setEditOutro(null)}>Cancelar</button>
                <button className="btn-primary" onClick={handleSaveEditOutro}>Salvar</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Confirm Delete Outro ── */}
        {confirmDeleteOutro && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmDeleteOutro(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-600" /></div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Excluir Produto?</h3>
                <p className="text-sm font-medium text-gray-700 text-center mb-4">"{confirmDeleteOutro.nome}"</p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex gap-2"><AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" /><p className="text-xs text-amber-700">Esta ação é <strong>irreversível</strong>. O produto e seu histórico serão removidos permanentemente.</p></div>
                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50" onClick={() => setConfirmDeleteOutro(null)}>Cancelar</button>
                  <button className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-colors" onClick={handleDeleteOutro}><Trash2 size={14} /> Sim, excluir</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
