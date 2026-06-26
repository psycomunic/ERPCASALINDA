import { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Download, Plus, Filter, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  X, Check, ChevronDown, Sofa, Package, AlertTriangle,
  Edit2, Trash2, Search, History,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  fetchTapetesLV, fetchOutrosLV, fetchMovsLV,
  upsertTapetesFromSync, registrarMovLV, updateMinimoItem,
  createItemLV, updateItemLV, deleteItemLV,
} from '../../services/estoqueLV'
import type { TapeteEstoque, OutroItemLV, MovimentacaoLV } from '../../services/estoqueLV'
import { syncEstoqueTellaioFromMagazord } from '../../services/estoqueTellaio'
import { PRECOS_TAPETES } from '../../data/precosTapetesLV'
import { isSupabaseConfigured } from '../../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'tapetes' | 'outros' | 'historico'

const STATUS_BADGE: Record<string, string> = {
  NORMAL: 'badge-normal',
  CRÍTICO: 'badge-critico',
  ATENÇÃO: 'badge-atencao',
}

const OUTROS_CATEGORIAS = ['Quadro', 'Cama/Mesa/Banho', 'Almofada', 'Vaso/Decoração', 'Outro']
const OUTROS_UNIDADES   = ['un', 'm²', 'cx', 'kit', 'par', 'peça', 'rolo']

// ─── Utility ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number | null | undefined) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
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
  const [tapetes, setTapetes]               = useState<TapeteEstoque[]>([])
  const [loadingTapetes, setLoadingTapetes] = useState(true)
  const [isSyncing, setIsSyncing]           = useState(false)

  // Filters
  const [filterLinha, setFilterLinha]             = useState<'TODOS' | 'RIOS' | 'LAGOS'>('TODOS')
  const [filterColecao, setFilterColecao]         = useState('TODAS')
  const [filterStatusTapete, setFilterStatusTapete] = useState('TODOS')
  const [searchTapete, setSearchTapete]           = useState('')
  const [showLinhaDropdown, setShowLinhaDropdown] = useState(false)

  // Edit tapete
  const [editTapete, setEditTapete]     = useState<TapeteEstoque | null>(null)
  const [editTapeteForm, setEditTapeteForm] = useState({ atual: '', minimo: '' })

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

  // ── Collections list from catalog ─────────────────────────────────────────────
  const colecoesList = useMemo(() => {
    const set = new Set(PRECOS_TAPETES.map(c => c.nome))
    return ['TODAS', ...Array.from(set).sort()]
  }, [])

  // ── Load Functions ────────────────────────────────────────────────────────────

  const loadTapetes = async () => {
    setLoadingTapetes(true)
    const data = await fetchTapetesLV()
    setTapetes(data)
    setLoadingTapetes(false)
  }

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

  useEffect(() => { loadTapetes(); loadOutros() }, [])
  useEffect(() => { if (activeTab === 'historico' && movs.length === 0) loadMovs() }, [activeTab])

  // ── Tapetes Handlers ──────────────────────────────────────────────────────────

  const handleSyncMagazord = async () => {
    setIsSyncing(true)
    showToast('Sincronizando com Magazord...')
    try {
      const result = await syncEstoqueTellaioFromMagazord()

      if (result.itens.length > 0) {
        const { sucesso, falhas } = await upsertTapetesFromSync(
          result.itens.map(i => ({
            ref: i.ref,
            nome: i.nome,
            atual: i.atual,
            minimo: i.minimo,
          }))
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

  const handleOpenEditTapete = (t: TapeteEstoque) => {
    setEditTapete(t)
    setEditTapeteForm({ atual: String(t.atual), minimo: String(t.minimo) })
  }

  const handleSaveEditTapete = async () => {
    if (!editTapete) return
    const novaQty = Number(editTapeteForm.atual)
    const novoMin = Number(editTapeteForm.minimo)
    let ok = true

    if (novaQty !== editTapete.atual) {
      ok = await registrarMovLV({
        item_id: editTapete.id,
        tipo: 'ajuste',
        quantidade: novaQty,
        motivo: 'Ajuste manual de estoque',
        usuario: userLabel,
      })
    }

    if (ok && novoMin !== editTapete.minimo) {
      ok = await updateMinimoItem(editTapete.id, novoMin)
    }

    setEditTapete(null)
    if (ok) {
      await loadTapetes()
      showToast('Tapete atualizado com sucesso!')
    } else {
      showToast('Erro ao atualizar tapete.')
    }
  }

  const handleExportTapetes = () => {
    const rows = [
      'Código,EAN,Coleção,Tamanho,Desenho,Linha,Atual,Mínimo,Status,Preço Custo (R$),Valor Estoque (R$)',
      ...tapetes.map(t =>
        `"${t.codigo}","${t.ean ?? ''}","${t.colecao}","${t.tamanho}","${t.desenho}","${t.linha}",${t.atual},${t.minimo},"${t.status}",${t.precoCusto ?? ''},${t.valorEstoque ?? ''}`
      ),
    ].join('\n')
    const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'estoque-tapetes-lv.csv'; a.click()
    URL.revokeObjectURL(url)
    showToast('CSV exportado!')
  }

  // ── Outros Handlers ───────────────────────────────────────────────────────────

  const handleCreateOutro = async () => {
    if (!formNovoOutro.nome.trim()) return showToast('Nome é obrigatório.')
    const ok = await createItemLV({
      nome: formNovoOutro.nome.trim(),
      categoria: formNovoOutro.categoria,
      unidade: formNovoOutro.unidade,
      minimo: Number(formNovoOutro.minimo) || 0,
    })
    if (ok) {
      setModalNovoOutro(false)
      setFormNovoOutro({ nome: '', categoria: OUTROS_CATEGORIAS[0], unidade: 'un', minimo: '' })
      await loadOutros()
      showToast('Produto cadastrado com sucesso!')
    } else {
      showToast('Erro ao cadastrar produto.')
    }
  }

  const handleEntradaOutro = async () => {
    const qty = parseFloat(formEntradaOutro.quantidade)
    if (!formEntradaOutro.itemId || isNaN(qty) || qty <= 0) return
    const motivo = [
      'Entrada de estoque',
      formEntradaOutro.nf ? `NF ${formEntradaOutro.nf}` : '',
      formEntradaOutro.obs,
    ].filter(Boolean).join(' — ')

    const ok = await registrarMovLV({
      item_id: formEntradaOutro.itemId,
      tipo: 'entrada',
      quantidade: qty,
      motivo,
      usuario: userLabel,
    })
    if (ok) {
      setModalEntradaOutro(false)
      setFormEntradaOutro({ itemId: '', quantidade: '', nf: '', obs: '' })
      await loadOutros()
      showToast('Entrada registrada com sucesso!')
    } else {
      showToast('Erro ao registrar entrada.')
    }
  }

  const handleOpenEditOutro = (item: OutroItemLV) => {
    setEditOutro(item)
    setFormEditOutro({ nome: item.nome, categoria: item.categoria, unidade: item.unidade, atual: String(item.atual), minimo: String(item.minimo) })
  }

  const handleSaveEditOutro = async () => {
    if (!editOutro || !formEditOutro.nome.trim()) return
    const novaQty = Number(formEditOutro.atual)
    let ok = true

    if (novaQty !== editOutro.atual) {
      ok = await registrarMovLV({ item_id: editOutro.id, tipo: 'ajuste', quantidade: novaQty, motivo: 'Ajuste manual', usuario: userLabel })
    }
    if (ok) {
      ok = await updateItemLV(editOutro.id, {
        nome: formEditOutro.nome.trim(),
        categoria: formEditOutro.categoria,
        unidade: formEditOutro.unidade,
        minimo: Number(formEditOutro.minimo) || 0,
      })
    }
    setEditOutro(null)
    if (ok) { await loadOutros(); showToast('Produto atualizado com sucesso!') }
    else showToast('Erro ao atualizar produto.')
  }

  const handleDeleteOutro = async () => {
    if (!confirmDeleteOutro) return
    const ok = await deleteItemLV(confirmDeleteOutro.id)
    if (ok) {
      setConfirmDeleteOutro(null)
      setEditOutro(null)
      await loadOutros()
      showToast(`"${confirmDeleteOutro.nome}" excluído.`)
    } else {
      showToast('Erro ao excluir produto.')
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────────

  const filteredTapetes = useMemo(() =>
    tapetes.filter(t => {
      if (filterLinha !== 'TODOS' && t.linha !== filterLinha) return false
      if (filterColecao !== 'TODAS' && t.colecao !== filterColecao) return false
      if (filterStatusTapete !== 'TODOS' && t.status !== filterStatusTapete) return false
      if (searchTapete) {
        const q = searchTapete.toLowerCase()
        if (!t.colecao.toLowerCase().includes(q) && !t.tamanho.toLowerCase().includes(q) && !t.codigo.toLowerCase().includes(q)) return false
      }
      return true
    }), [tapetes, filterLinha, filterColecao, filterStatusTapete, searchTapete])

  const groupedTapetes = useMemo(() => {
    const g: Record<string, TapeteEstoque[]> = {}
    for (const t of filteredTapetes) {
      if (!g[t.colecao]) g[t.colecao] = []
      g[t.colecao].push(t)
    }
    return g
  }, [filteredTapetes])

  const criticosTapetes  = tapetes.filter(t => t.status === 'CRÍTICO').length
  const criticosOutros   = outros.filter(o => o.status === 'CRÍTICO').length
  const valorTotalEstoque = tapetes.reduce((s, t) => s + (t.valorEstoque ?? 0), 0)
  const hasFilters = filterLinha !== 'TODOS' || filterColecao !== 'TODAS' || filterStatusTapete !== 'TODOS' || searchTapete !== ''

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5" onClick={() => setShowLinhaDropdown(false)}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
            <Sofa size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estoque — Lar e Vida</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tapetes Tellaio, decoração e linha cama/mesa/banho.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeTab === 'tapetes' && (
            <>
              <button className="btn-secondary" onClick={handleSyncMagazord} disabled={isSyncing || !isSupabase}>
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Sincronizando...' : 'Sync Magazord'}
              </button>
              <button className="btn-secondary" onClick={handleExportTapetes} disabled={tapetes.length === 0}>
                <Download size={14} /> Exportar CSV
              </button>
            </>
          )}
          {activeTab === 'outros' && (
            <>
              <button
                className="btn-secondary"
                onClick={() => { setFormEntradaOutro({ itemId: outros[0]?.id || '', quantidade: '', nf: '', obs: '' }); setModalEntradaOutro(true) }}
                disabled={outros.length === 0 || !isSupabase}
              >
                <ArrowUpCircle size={14} /> Entrada de Estoque
              </button>
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                onClick={() => setModalNovoOutro(true)}
                disabled={!isSupabase}
              >
                <Plus size={14} /> Novo Produto
              </button>
            </>
          )}
          {activeTab === 'historico' && (
            <button className="btn-secondary" onClick={loadMovs}>
              <RefreshCw size={14} /> Atualizar
            </button>
          )}
        </div>
      </div>

      {/* ── Supabase Warning ── */}
      {!isSupabase && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Supabase não configurado</p>
            <p className="text-xs text-amber-600 mt-0.5">Configure as variáveis de ambiente para persistência dos dados e sincronização com Magazord.</p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {([
            { key: 'tapetes',   label: '🪞 Tapetes',           badge: criticosTapetes },
            { key: 'outros',    label: '📦 Outros Produtos',    badge: criticosOutros },
            { key: 'historico', label: '📋 Histórico',          badge: 0 },
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
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-600">
                  {tab.badge}
                </span>
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
                <span className="badge badge-normal text-[11px]">SKUs</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{tapetes.length}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Tapetes Cadastrados</p>
            </div>
            <div className="stat cursor-pointer" onClick={() => setFilterStatusTapete(filterStatusTapete === 'CRÍTICO' ? 'TODOS' : 'CRÍTICO')}>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">⚠</div>
                <span className="badge badge-critico text-[11px]">CRÍTICO</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-2">{criticosTapetes.toString().padStart(2, '0')} SKUs</p>
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
              {/* Search */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[160px] max-w-xs">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  className="bg-transparent outline-none text-sm flex-1 text-gray-700 placeholder-gray-400"
                  placeholder="Buscar coleção ou código..."
                  value={searchTapete}
                  onChange={e => setSearchTapete(e.target.value)}
                />
                {searchTapete && <button onClick={() => setSearchTapete('')} className="text-gray-300 hover:text-gray-500"><X size={12} /></button>}
              </div>

              {/* Linha filter */}
              <div className="flex gap-1">
                {(['TODOS', 'RIOS', 'LAGOS'] as const).map(l => (
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

              {/* Coleção */}
              <select
                className="input text-xs py-1.5"
                value={filterColecao}
                style={{ width: 'auto', minWidth: '150px' }}
                onChange={e => setFilterColecao(e.target.value)}
              >
                {colecoesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Status */}
              <select
                className="input text-xs py-1.5"
                value={filterStatusTapete}
                style={{ width: 'auto', minWidth: '120px' }}
                onChange={e => setFilterStatusTapete(e.target.value)}
              >
                {['TODOS', 'NORMAL', 'ATENÇÃO', 'CRÍTICO'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {hasFilters && (
                <button
                  onClick={() => { setFilterLinha('TODOS'); setFilterColecao('TODAS'); setFilterStatusTapete('TODOS'); setSearchTapete('') }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
                >
                  <X size={12} /> Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                Inventário de Tapetes
                <span className="text-gray-400 font-normal text-xs">
                  ({filteredTapetes.length} de {tapetes.length} SKUs)
                </span>
              </p>
              <button className="btn-ghost text-xs" onClick={loadTapetes}>
                <RefreshCw size={12} /> Atualizar
              </button>
            </div>

            {loadingTapetes ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Carregando tapetes...</span>
              </div>
            ) : tapetes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#fef3c7' }}>
                  <Sofa size={28} style={{ color: '#d97706' }} />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Nenhum tapete cadastrado</p>
                <p className="text-xs text-gray-400 max-w-xs mb-5">
                  Use o botão <strong>Sync Magazord</strong> para importar o estoque atual dos tapetes Tellaio diretamente da API.
                </p>
                <button
                  className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-xl text-white"
                  style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                  onClick={handleSyncMagazord}
                  disabled={isSyncing || !isSupabase}
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Sincronizando...' : 'Importar do Magazord'}
                </button>
              </div>
            ) : filteredTapetes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <Search size={28} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-500 font-medium">Nenhum tapete encontrado com esses filtros.</p>
                <button onClick={() => { setFilterLinha('TODOS'); setFilterColecao('TODAS'); setFilterStatusTapete('TODOS'); setSearchTapete('') }} className="mt-3 text-xs text-amber-600 hover:underline font-semibold">
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[740px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="th">Tapete</th>
                      <th className="th">Linha</th>
                      <th className="th">Tamanho</th>
                      <th className="th text-center">Atual</th>
                      <th className="th text-center">Mínimo</th>
                      <th className="th">Preço Custo</th>
                      <th className="th">Valor Estoque</th>
                      <th className="th">Status</th>
                      <th className="th w-8"></th>
                    </tr>
                  </thead>
                  {Object.entries(groupedTapetes).sort(([a], [b]) => a.localeCompare(b)).map(([colecao, items]) => (
                    <tbody key={colecao}>
                      <tr>
                        <td colSpan={9} className="py-2.5 px-5 text-xs font-bold uppercase tracking-widest border-y" style={{ background: '#fffbeb', color: '#92400e', borderColor: '#fde68a' }}>
                          🪞 {colecao}
                          <span className="font-normal lowercase ml-2 opacity-60">({items.length} SKU{items.length > 1 ? 's' : ''})</span>
                        </td>
                      </tr>
                      {items.map(item => (
                        <tr
                          key={item.id || item.codigo}
                          className="tr cursor-pointer group"
                          style={{ '--hover-bg': '#fffbeb' } as any}
                          onClick={() => handleOpenEditTapete(item)}
                        >
                          <td className="td">
                            <p className="font-semibold text-gray-800">{item.colecao}</p>
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{item.codigo}</p>
                          </td>
                          <td className="td">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.linha === 'LAGOS' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                              {item.linha}
                            </span>
                          </td>
                          <td className="td">
                            <p className="text-sm text-gray-700">{item.tamanho || '—'}</p>
                            {item.desenho && <p className="text-[11px] text-gray-400">Des. {item.desenho}</p>}
                          </td>
                          <td className={`td text-center font-bold text-base ${item.status === 'CRÍTICO' ? 'text-red-600' : item.status === 'ATENÇÃO' ? 'text-orange-500' : 'text-gray-900'}`}>
                            {item.atual}
                          </td>
                          <td className="td text-center text-gray-500 text-sm">{item.minimo}</td>
                          <td className="td text-gray-600 text-sm">{fmtBRL(item.precoCusto)}</td>
                          <td className="td font-semibold text-gray-800 text-sm">{fmtBRL(item.valorEstoque)}</td>
                          <td className="td">
                            <span className={`badge ${STATUS_BADGE[item.status]}`}>{item.status}</span>
                          </td>
                          <td className="td">
                            <button
                              onClick={e => { e.stopPropagation(); handleOpenEditTapete(item) }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-amber-600 transition-all p-1"
                            >
                              <Edit2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
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
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
                  <Package size={16} style={{ color: '#d97706' }} />
                </div>
                <span className="badge badge-normal text-[11px]">TOTAL</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{outros.length}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Produtos Cadastrados</p>
            </div>
            <div className="stat">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">⚠</div>
                <span className="badge badge-critico text-[11px]">CRÍTICO</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-2">{criticosOutros.toString().padStart(2, '0')} Itens</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Abaixo do Mínimo</p>
            </div>
            <div className="stat">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
                  <span style={{ color: '#d97706' }}>📋</span>
                </div>
                <span className="badge badge-normal text-[11px]">CATEGORIAS</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{OUTROS_CATEGORIAS.length}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Linhas de Produto</p>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Filter size={14} className="text-gray-400" /> Produtos — Decoração e Utilidades
              </p>
              <button className="btn-ghost text-xs" onClick={loadOutros}>
                <RefreshCw size={12} /> Atualizar
              </button>
            </div>

            {loadingOutros ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : outros.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#fef3c7' }}>
                  <Package size={28} style={{ color: '#d97706' }} />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Nenhum produto cadastrado</p>
                <p className="text-xs text-gray-400 max-w-xs mb-5">Cadastre quadros, itens de cama/mesa/banho, almofadas e outros produtos decorativos.</p>
                <button
                  className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-xl text-white"
                  style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                  onClick={() => setModalNovoOutro(true)}
                  disabled={!isSupabase}
                >
                  <Plus size={14} /> Cadastrar Produto
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="th">Produto</th>
                      <th className="th">Categoria</th>
                      <th className="th">Unidade</th>
                      <th className="th text-center">Atual</th>
                      <th className="th text-center">Mínimo</th>
                      <th className="th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outros.map(item => (
                      <tr key={item.id} className="tr cursor-pointer hover:bg-amber-50/30 group" onClick={() => handleOpenEditOutro(item)}>
                        <td className="td">
                          <p className="font-medium text-gray-800">{item.nome}</p>
                          {item.codigo && <p className="text-[11px] text-gray-400">{item.codigo}</p>}
                        </td>
                        <td className="td">
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{item.categoria}</span>
                        </td>
                        <td className="td text-gray-500 text-xs">{item.unidade}</td>
                        <td className={`td text-center font-bold ${item.status === 'CRÍTICO' ? 'text-red-600' : item.status === 'ATENÇÃO' ? 'text-orange-500' : 'text-gray-900'}`}>
                          {item.atual}
                        </td>
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
              <History size={14} className="text-gray-400" />
              Log de Movimentações
              {movs.length > 0 && <span className="text-xs text-gray-400 font-normal">({movs.length} registros)</span>}
            </p>
            <select
              className="input text-xs py-1.5"
              value={filterMovTipo}
              onChange={e => setFilterMovTipo(e.target.value)}
              style={{ width: 'auto', minWidth: '120px' }}
            >
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
              {movs
                .filter(m => filterMovTipo === 'TODOS' || m.tipo === filterMovTipo)
                .map(m => (
                  <div key={m.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition-colors">
                    <div className="mt-0.5 shrink-0">
                      {m.tipo === 'entrada'
                        ? <ArrowUpCircle size={18} className="text-green-500" />
                        : m.tipo === 'saida'
                        ? <ArrowDownCircle size={18} className="text-red-500" />
                        : <RefreshCw size={18} className="text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">
                          {m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'saida' ? 'Saída' : 'Ajuste'} · {m.quantidade} un
                        </p>
                        {m.item_categoria && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-100">
                            {m.item_categoria}
                          </span>
                        )}
                      </div>
                      {m.item_nome && <p className="text-xs text-gray-600 mt-0.5">{m.item_nome}</p>}
                      {m.motivo && <p className="text-xs text-gray-400 mt-0.5 italic">{m.motivo}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-gray-400">{fmtDate(m.created_at)}</p>
                      {m.usuario && m.usuario !== 'Sistema' && (
                        <p className="text-[10px] text-gray-300 mt-0.5">{m.usuario}</p>
                      )}
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

        {/* ── Edit Tapete ── */}
        {editTapete && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditTapete(null)}>
            <motion.div className="modal" style={{ maxWidth: 460 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
                    <Sofa size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{editTapete.colecao}</h3>
                    <p className="text-xs text-gray-500">{editTapete.tamanho || 'Tamanho desconhecido'}{editTapete.desenho ? ` · Des. ${editTapete.desenho}` : ''}</p>
                  </div>
                </div>
                <button onClick={() => setEditTapete(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 bg-gray-50 rounded-xl p-3 font-mono">
                  <div><span className="font-sans text-[10px] text-gray-400 block mb-0.5">Código</span>{editTapete.codigo}</div>
                  <div><span className="font-sans text-[10px] text-gray-400 block mb-0.5">EAN</span>{editTapete.ean || '—'}</div>
                  <div><span className="font-sans text-[10px] text-gray-400 block mb-0.5">Linha</span>{editTapete.linha}</div>
                  <div><span className="font-sans text-[10px] text-gray-400 block mb-0.5">Preço Custo</span>{fmtBRL(editTapete.precoCusto)}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 border border-gray-100 bg-gray-50/50 rounded-xl">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Qtd. em Estoque</label>
                    <input
                      type="number" min="0" className="input bg-white font-bold text-lg"
                      value={editTapeteForm.atual}
                      onChange={e => setEditTapeteForm(f => ({ ...f, atual: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Qtd. Mínima</label>
                    <input
                      type="number" min="0" className="input bg-white"
                      value={editTapeteForm.minimo}
                      onChange={e => setEditTapeteForm(f => ({ ...f, minimo: e.target.value }))}
                    />
                  </div>
                </div>
                {editTapete.precoCusto && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3 border border-gray-100 bg-gray-50 text-center">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Preço unitário</p>
                      <p className="font-bold text-gray-800 text-sm">{fmtBRL(editTapete.precoCusto)}</p>
                    </div>
                    <div className="rounded-xl p-3 border border-amber-100 text-center" style={{ background: '#fffbeb' }}>
                      <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-1">Valor estimado</p>
                      <p className="font-bold text-amber-800 text-sm">{fmtBRL(editTapete.precoCusto * (Number(editTapeteForm.atual) || 0))}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setEditTapete(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button
                    onClick={handleSaveEditTapete}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold"
                    style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                  >
                    <Check size={14} /> Salvar Alterações
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
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
                    <Plus size={14} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Novo Produto</h3>
                    <p className="text-xs text-gray-500">Decoração, cama/mesa/banho etc.</p>
                  </div>
                </div>
                <button onClick={() => setModalNovoOutro(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Produto <span className="text-red-500">*</span></label>
                  <input className="input" placeholder="Ex: Almofada Decorativa 45×45cm" value={formNovoOutro.nome} onChange={e => setFormNovoOutro(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
                    <select className="input" value={formNovoOutro.categoria} onChange={e => setFormNovoOutro(f => ({ ...f, categoria: e.target.value }))}>
                      {OUTROS_CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Unidade</label>
                    <select className="input" value={formNovoOutro.unidade} onChange={e => setFormNovoOutro(f => ({ ...f, unidade: e.target.value }))}>
                      {OUTROS_UNIDADES.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Estoque Mínimo (alerta)</label>
                  <input type="number" min="0" className="input" placeholder="0" value={formNovoOutro.minimo} onChange={e => setFormNovoOutro(f => ({ ...f, minimo: e.target.value }))} />
                  <p className="text-[10px] text-gray-400 mt-1">O sistema alertará quando ficar abaixo deste valor.</p>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setModalNovoOutro(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button
                    onClick={handleCreateOutro}
                    disabled={!formNovoOutro.nome.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                  >
                    <Check size={14} /> Cadastrar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Entrada de Estoque Outro ── */}
        {modalEntradaOutro && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalEntradaOutro(false)}>
            <motion.div className="modal" style={{ maxWidth: 460 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">Entrada de Estoque</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Registre a chegada de produtos ao almoxarifado.</p>
                </div>
                <button onClick={() => setModalEntradaOutro(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Produto <span className="text-red-500">*</span></label>
                  <select className="input" value={formEntradaOutro.itemId} onChange={e => setFormEntradaOutro(f => ({ ...f, itemId: e.target.value }))}>
                    <option value="">Selecionar produto...</option>
                    {outros.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantidade <span className="text-red-500">*</span></label>
                    <input type="number" min="1" className="input" placeholder="0" value={formEntradaOutro.quantidade} onChange={e => setFormEntradaOutro(f => ({ ...f, quantidade: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nota Fiscal</label>
                    <input className="input" placeholder="NF 0000" value={formEntradaOutro.nf} onChange={e => setFormEntradaOutro(f => ({ ...f, nf: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Observações</label>
                  <textarea className="input h-16 resize-none" placeholder="Fornecedor, observações..." value={formEntradaOutro.obs} onChange={e => setFormEntradaOutro(f => ({ ...f, obs: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModalEntradaOutro(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button
                    onClick={handleEntradaOutro}
                    disabled={!formEntradaOutro.itemId || !formEntradaOutro.quantidade}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-white font-semibold disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
                  >
                    <Check size={14} /> Registrar Entrada
                  </button>
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
                <div className="flex items-center gap-3">
                  <Edit2 size={18} className="text-amber-700" />
                  <div>
                    <h3 className="font-bold text-gray-900">Editar Produto</h3>
                    <p className="text-xs text-gray-500">{editOutro.nome}</p>
                  </div>
                </div>
                <button onClick={() => setEditOutro(null)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome <span className="text-red-500">*</span></label>
                  <input type="text" className="input" value={formEditOutro.nome} onChange={e => setFormEditOutro(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
                    <select className="input" value={formEditOutro.categoria} onChange={e => setFormEditOutro(f => ({ ...f, categoria: e.target.value }))}>
                      {OUTROS_CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Unidade</label>
                    <select className="input" value={formEditOutro.unidade} onChange={e => setFormEditOutro(f => ({ ...f, unidade: e.target.value }))}>
                      {OUTROS_UNIDADES.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Estoque Atual</label>
                    <input type="number" min="0" className="input bg-white font-bold" value={formEditOutro.atual} onChange={e => setFormEditOutro(f => ({ ...f, atual: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Estoque Mínimo</label>
                    <input type="number" min="0" className="input bg-white" value={formEditOutro.minimo} onChange={e => setFormEditOutro(f => ({ ...f, minimo: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                <button
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 text-sm font-semibold mr-auto transition-colors"
                  onClick={() => editOutro && setConfirmDeleteOutro(editOutro)}
                >
                  <Trash2 size={14} /> Excluir
                </button>
                <button className="btn-secondary" onClick={() => setEditOutro(null)}>Cancelar</button>
                <button className="btn-primary" onClick={handleSaveEditOutro}>Salvar</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Confirm Delete ── */}
        {confirmDeleteOutro && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4"
            onClick={() => setConfirmDeleteOutro(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Excluir Produto?</h3>
                <p className="text-sm font-medium text-gray-700 text-center mb-4">"{confirmDeleteOutro.nome}"</p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex gap-2">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Esta ação é <strong>irreversível</strong>. O produto e seu histórico serão removidos permanentemente.</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50" onClick={() => setConfirmDeleteOutro(null)}>
                    Cancelar
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-colors" onClick={handleDeleteOutro}>
                    <Trash2 size={14} /> Sim, excluir
                  </button>
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
