import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Grid, Maximize2, Layers, Star, Check, X,
  ChevronDown, Square, Columns, Layout, Package
} from 'lucide-react'

// ─── Catalog Data ──────────────────────────────────────────────────────────────

export const MOLDURA_CATEGORIAS = [
  {
    categoria: 'Sem Moldura',
    cor: '#6b7280',
    modelos: [
      { id: 'sem-moldura', nome: 'Sem Moldura (Borda Infinita)', emoji: '⬜' },
    ],
  },
  {
    categoria: 'Caixa',
    cor: '#78716c',
    modelos: [
      { id: 'caixa-preta',   nome: 'Caixa Preta',   emoji: '⬛', cor: '#111' },
      { id: 'caixa-branca',  nome: 'Caixa Branca',  emoji: '⬜', cor: '#f5f5f5' },
      { id: 'caixa-dourada', nome: 'Caixa Dourada', emoji: '🟨', cor: '#c49a2c' },
      { id: 'caixa-madeira', nome: 'Caixa Madeira', emoji: '🟫', cor: '#7c3f1e' },
    ],
  },
  {
    categoria: 'Flutuante / Canaleta',
    cor: '#2563eb',
    modelos: [
      { id: 'flutuante-preta',   nome: 'Flutuante Preta',   emoji: '⬛', cor: '#111' },
      { id: 'flutuante-branca',  nome: 'Flutuante Branca',  emoji: '⬜', cor: '#f5f5f5' },
      { id: 'flutuante-dourada', nome: 'Flutuante Dourada', emoji: '🟨', cor: '#c49a2c' },
      { id: 'flutuante-madeira', nome: 'Flutuante Madeira', emoji: '🟫', cor: '#7c3f1e' },
    ],
  },
  {
    categoria: 'Côncava',
    cor: '#7c3aed',
    modelos: [
      { id: 'concava-preta',   nome: 'Côncava Preta',   emoji: '⬛', cor: '#111' },
      { id: 'concava-branca',  nome: 'Côncava Branca',  emoji: '⬜', cor: '#f5f5f5' },
      { id: 'concava-dourada', nome: 'Côncava Dourada', emoji: '🟨', cor: '#c49a2c' },
      { id: 'concava-madeira', nome: 'Côncava Madeira', emoji: '🟫', cor: '#7c3f1e' },
    ],
  },
  {
    categoria: 'Inox',
    cor: '#64748b',
    modelos: [
      { id: 'inox', nome: 'Inox', emoji: '🔳', cor: '#9ca3af' },
    ],
  },
  {
    categoria: 'Premium — Clássicas',
    cor: '#b45309',
    modelos: [
      { id: 'trono-de-ouro',    nome: 'Trono de Ouro',    emoji: '✨', cor: '#b8860b' },
      { id: 'majestade-negra',  nome: 'Majestade Negra',  emoji: '✨', cor: '#1a1a2e' },
      { id: 'galeria-imperial', nome: 'Galeria Imperial', emoji: '✨', cor: '#c49a2c' },
    ],
  },
  {
    categoria: 'Premium — Luxo',
    cor: '#92400e',
    modelos: [
      { id: 'roma-moderna',      nome: 'Roma Moderna',       emoji: '👑', cor: '#c49a2c' },
      { id: 'palaciana',         nome: 'Palaciana',          emoji: '👑', cor: '#d4a017' },
      { id: 'realce-imperial',   nome: 'Realce Imperial',    emoji: '👑', cor: '#9ca3af' },
      { id: 'imperial-prata-ouro',nome: 'Imperial Prata e Ouro', emoji: '👑', cor: '#b8860b' },
      { id: 'barroco-imperial',  nome: 'Barroco Imperial',  emoji: '👑', cor: '#c8952c' },
    ],
  },
]

export const FORMATOS = [
  {
    id: '1-tela-quadrado',
    nome: '1 Tela Quadrado',
    telas: 1,
    icone: 'quadrado',
    tamanhos: ['85×85 cm', '115×115 cm', '145×145 cm'],
  },
  {
    id: '1-tela',
    nome: '1 Tela',
    telas: 1,
    icone: 'retrato',
    tamanhos: ['85×55 cm', '115×75 cm', '145×95 cm', '175×100 cm'],
  },
  {
    id: '2-telas',
    nome: '2 Telas',
    telas: 2,
    icone: 'duplo',
    tamanhos: ['55×35 cm cada', '85×55 cm cada', '115×75 cm cada', '145×95 cm cada', '175×95 cm cada'],
  },
  {
    id: '3-telas',
    nome: '3 Telas',
    telas: 3,
    icone: 'triplo',
    tamanhos: ['40×20 cm cada', '55×30 cm cada', '70×40 cm cada', '90×50 cm cada', '120×70 cm cada'],
  },
]

export const ACABAMENTOS = [
  { id: 'sem-vidro', nome: 'Sem Vidro', preco: 0,   descricao: 'Acabamento padrão, sem proteção de vidro.' },
  { id: 'com-vidro', nome: 'Com Vidro', preco: 250, descricao: 'Vidro temperado de proteção UV. Adiciona brilho e durabilidade.' },
]

// Flat list of all molduras for use in selects
export const ALL_MOLDURAS = MOLDURA_CATEGORIAS.flatMap(c =>
  c.modelos.map(m => ({ ...m, categoria: c.categoria }))
)

// ─── Format SVGs ──────────────────────────────────────────────────────────────

function FormatoSVG({ tipo, size = 40 }: { tipo: string; size?: number }) {
  const s = size
  if (tipo === 'quadrado')
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <rect x="8" y="8" width="24" height="24" rx="2" stroke="#1e3a8a" strokeWidth="2.5" fill="#e0e7ff" />
      </svg>
    )
  if (tipo === 'retrato')
    return (
      <svg width={s * 0.7} height={s} viewBox="0 0 28 40" fill="none">
        <rect x="4" y="4" width="20" height="32" rx="2" stroke="#1e3a8a" strokeWidth="2.5" fill="#e0e7ff" />
      </svg>
    )
  if (tipo === 'duplo')
    return (
      <svg width={s} height={s * 0.7} viewBox="0 0 50 35" fill="none">
        <rect x="2" y="3" width="20" height="29" rx="2" stroke="#1e3a8a" strokeWidth="2.5" fill="#e0e7ff" />
        <rect x="28" y="3" width="20" height="29" rx="2" stroke="#1e3a8a" strokeWidth="2.5" fill="#e0e7ff" />
      </svg>
    )
  // triplo
  return (
    <svg width={s * 1.2} height={s * 0.7} viewBox="0 0 60 35" fill="none">
      <rect x="2"  y="3" width="16" height="29" rx="2" stroke="#1e3a8a" strokeWidth="2.5" fill="#e0e7ff" />
      <rect x="22" y="3" width="16" height="29" rx="2" stroke="#1e3a8a" strokeWidth="2.5" fill="#e0e7ff" />
      <rect x="42" y="3" width="16" height="29" rx="2" stroke="#1e3a8a" strokeWidth="2.5" fill="#e0e7ff" />
    </svg>
  )
}

// ─── Frame Swatch ─────────────────────────────────────────────────────────────

function MolduraSwatch({
  id, nome, cor, emoji, selected, onClick
}: {
  id: string; nome: string; cor?: string; emoji: string
  selected: boolean; onClick: () => void
}) {
  const isPremium = id.includes('trono') || id.includes('majestade') || id.includes('galeria') ||
    id.includes('roma') || id.includes('palaciana') || id.includes('realce') || id.includes('imperial') || id.includes('barroco')

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
        selected ? 'border-navy-900 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Frame preview */}
      <div className="w-14 h-14 rounded-lg flex items-center justify-center relative overflow-hidden"
        style={{ background: cor ? cor + '22' : '#f3f4f6', border: `3px solid ${cor ?? '#6b7280'}` }}>
        {isPremium && (
          <span className="absolute top-0.5 right-0.5 text-[8px]">⭐</span>
        )}
        <span className="text-2xl">{emoji}</span>
      </div>
      <p className="text-[11px] font-semibold text-gray-700 leading-tight">{nome}</p>
      {selected && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-navy-900 rounded-full flex items-center justify-center">
          <Check size={9} className="text-white" />
        </span>
      )}
    </motion.button>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'molduras',  label: 'Molduras',         icon: Layers },
  { id: 'formatos',  label: 'Formatos & Tamanhos', icon: Maximize2 },
  { id: 'acabamentos', label: 'Acabamentos',    icon: Star },
  { id: 'combinador', label: 'Configurar Produto', icon: Grid },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Catalogo() {
  const [tab,            setTab]            = useState('molduras')
  const [selectedMoldura, setSelectedMoldura] = useState<string | null>(null)
  const [selectedFormato, setSelectedFormato] = useState<string | null>(null)
  const [selectedTamanho, setSelectedTamanho] = useState<string | null>(null)
  const [selectedAcab,    setSelectedAcab]    = useState<string>('sem-vidro')
  const [filterCat,      setFilterCat]      = useState<string>('Todas')
  const [toast,          setToast]          = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const categorys = ['Todas', ...MOLDURA_CATEGORIAS.map(c => c.categoria)]

  const filteredCats = filterCat === 'Todas'
    ? MOLDURA_CATEGORIAS
    : MOLDURA_CATEGORIAS.filter(c => c.categoria === filterCat)

  const selectedMolduraObj = ALL_MOLDURAS.find(m => m.id === selectedMoldura)
  const selectedFormatoObj = FORMATOS.find(f => f.id === selectedFormato)
  const selectedAcabObj    = ACABAMENTOS.find(a => a.id === selectedAcab)

  const canFinalize = selectedMoldura && selectedFormato && selectedTamanho

  const handleCopiar = () => {
    if (!canFinalize) return
    const text = `${selectedFormatoObj?.nome} · ${selectedTamanho} · ${selectedMolduraObj?.nome} · ${selectedAcabObj?.nome}`
    navigator.clipboard.writeText(text).catch(() => {})
    showToast('Configuração copiada para a área de transferência!')
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de Produtos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Referência completa de molduras, formatos e tamanhos disponíveis. Use o Configurador para montar uma especificação completa.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-navy-900 text-navy-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── MOLDURAS TAB ── */}
      {tab === 'molduras' && (
        <div className="space-y-5">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {categorys.map(c => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  filterCat === c
                    ? 'bg-navy-900 text-white border-navy-900'
                    : 'border-gray-200 text-gray-600 hover:border-navy-900/30'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Catalog */}
          <div className="space-y-6">
            {filteredCats.map(cat => (
              <div key={cat.categoria}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: cat.cor }} />
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{cat.categoria}</h3>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">{cat.modelos.length} modelo{cat.modelos.length > 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 xl:grid-cols-9 gap-2">
                  {cat.modelos.map(m => (
                    <MolduraSwatch
                      key={m.id}
                      {...m}
                      selected={selectedMoldura === m.id}
                      onClick={() => {
                        setSelectedMoldura(m.id)
                        showToast(`Moldura "${m.nome}" selecionada`)
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Selected summary */}
          {selectedMoldura && (
            <div className="card p-4 flex items-center gap-3 bg-blue-50 border border-blue-200">
              <Check size={16} className="text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Moldura selecionada</p>
                <p className="text-xs text-blue-600">{selectedMolduraObj?.nome} · {selectedMolduraObj?.categoria}</p>
              </div>
              <button onClick={() => setTab('combinador')} className="ml-auto btn-primary text-xs py-1.5">
                Configurar Produto →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── FORMATOS TAB ── */}
      {tab === 'formatos' && (
        <div className="space-y-6">
          {/* Format cards */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Layout size={12} /> Formatos disponíveis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {FORMATOS.map(f => (
                <motion.div
                  key={f.id}
                  whileHover={{ scale: 1.02 }}
                  className={`card p-5 cursor-pointer flex flex-col items-center gap-3 border-2 transition-all ${
                    selectedFormato === f.id ? 'border-navy-900 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => { setSelectedFormato(f.id); setSelectedTamanho(null) }}
                >
                  <FormatoSVG tipo={f.icone} size={40} />
                  <div className="text-center">
                    <p className="font-bold text-gray-800 text-sm">{f.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{f.tamanhos.length} tamanhos</p>
                  </div>
                  {selectedFormato === f.id && (
                    <span className="badge badge-ativo text-[10px]">SELECIONADO</span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Size grid for all formats */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Maximize2 size={12} /> Tamanhos por formato
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FORMATOS.map(f => (
                <div key={f.id} className={`card p-4 border-2 ${selectedFormato === f.id ? 'border-navy-900/30 bg-blue-50/50' : 'border-transparent'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <FormatoSVG tipo={f.icone} size={24} />
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{f.nome}</p>
                      <p className="text-[11px] text-gray-400">{f.telas} tela{f.telas > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {f.tamanhos.map(t => (
                      <button
                        key={t}
                        onClick={() => { setSelectedFormato(f.id); setSelectedTamanho(t) }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          selectedFormato === f.id && selectedTamanho === t
                            ? 'bg-navy-900 text-white border-navy-900'
                            : 'border-gray-200 text-gray-600 hover:border-navy-900/30 hover:text-navy-900 bg-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(selectedFormato && selectedTamanho) && (
            <div className="card p-4 flex items-center gap-3 bg-blue-50 border border-blue-200">
              <Check size={16} className="text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Tamanho selecionado</p>
                <p className="text-xs text-blue-600">{selectedFormatoObj?.nome} · {selectedTamanho}</p>
              </div>
              <button onClick={() => setTab('combinador')} className="ml-auto btn-primary text-xs py-1.5">
                Configurar Produto →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ACABAMENTOS TAB ── */}
      {tab === 'acabamentos' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Package size={12} /> Acabamento com vidro
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
            {ACABAMENTOS.map(a => (
              <motion.div
                key={a.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedAcab(a.id)}
                className={`card p-5 cursor-pointer border-2 transition-all ${
                  selectedAcab === a.id ? 'border-navy-900 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                    {a.id === 'sem-vidro' ? '🚫' : '🪟'}
                  </div>
                  {selectedAcab === a.id && (
                    <span className="w-5 h-5 bg-navy-900 rounded-full flex items-center justify-center">
                      <Check size={11} className="text-white" />
                    </span>
                  )}
                </div>
                <p className="font-bold text-gray-800">{a.nome}</p>
                <p className="text-xs text-gray-500 mt-0.5 mb-2">{a.descricao}</p>
                <p className={`text-sm font-bold ${a.preco > 0 ? 'text-navy-900' : 'text-gray-400'}`}>
                  {a.preco > 0 ? `+ R$ ${a.preco.toLocaleString('pt-BR')}` : 'Incluído'}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONFIGURADOR TAB ── */}
      {tab === 'combinador' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Config form */}
          <div className="xl:col-span-2 space-y-5">
            {/* Step 1: Moldura */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
                <span className="w-5 h-5 bg-navy-900 rounded-full text-white text-xs flex items-center justify-center font-bold">1</span>
                Escolha a Moldura
              </h3>
              {/* Category + model selects */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                  <select
                    className="input text-sm"
                    value={MOLDURA_CATEGORIAS.find(c => c.modelos.some(m => m.id === selectedMoldura))?.categoria ?? ''}
                    onChange={e => {
                      const cat = MOLDURA_CATEGORIAS.find(c => c.categoria === e.target.value)
                      if (cat) setSelectedMoldura(cat.modelos[0].id)
                    }}
                  >
                    <option value="">Selecione...</option>
                    {MOLDURA_CATEGORIAS.map(c => <option key={c.categoria}>{c.categoria}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Modelo</label>
                  <select
                    className="input text-sm"
                    value={selectedMoldura ?? ''}
                    onChange={e => setSelectedMoldura(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {MOLDURA_CATEGORIAS
                      .find(c => c.modelos.some(m => m.id === selectedMoldura))
                      ?.modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)
                      ?? MOLDURA_CATEGORIAS.flatMap(c => c.modelos).map(m => <option key={m.id} value={m.id}>{m.nome}</option>)
                    }
                  </select>
                </div>
              </div>
              {/* Quick pick swatches */}
              <div>
                <p className="text-[11px] text-gray-400 mb-2">Ou escolha diretamente:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_MOLDURAS.slice(0, 16).map(m => (
                    <button
                      key={m.id}
                      title={m.nome}
                      onClick={() => setSelectedMoldura(m.id)}
                      className={`w-7 h-7 rounded flex items-center justify-center text-sm border-2 transition-all ${
                        selectedMoldura === m.id ? 'border-navy-900 scale-110 shadow' : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ background: (m as any).cor ? (m as any).cor + '33' : '#f3f4f6', borderColor: selectedMoldura === m.id ? '#1e3a8a' : ((m as any).cor ?? '#e5e7eb') + '88' }}
                    >
                      {m.emoji}
                    </button>
                  ))}
                  {ALL_MOLDURAS.length > 16 && (
                    <button onClick={() => setTab('molduras')} className="w-7 h-7 rounded border-2 border-dashed border-gray-300 text-xs text-gray-400 hover:border-navy-900 hover:text-navy-900">
                      +{ALL_MOLDURAS.length - 16}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Formato */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
                <span className="w-5 h-5 bg-navy-900 rounded-full text-white text-xs flex items-center justify-center font-bold">2</span>
                Escolha o Formato
              </h3>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {FORMATOS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFormato(f.id); setSelectedTamanho(null) }}
                    className={`flex flex-col items-center gap-2 px-2 py-3 rounded-xl border-2 text-center transition-all ${
                      selectedFormato === f.id ? 'border-navy-900 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FormatoSVG tipo={f.icone} size={28} />
                    <p className="text-[11px] font-semibold text-gray-700 leading-tight">{f.nome}</p>
                  </button>
                ))}
              </div>

              {selectedFormato && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Tamanho</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedFormatoObj?.tamanhos.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTamanho(t)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          selectedTamanho === t
                            ? 'bg-navy-900 text-white border-navy-900'
                            : 'border-gray-200 text-gray-600 hover:border-navy-900/40'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Acabamento */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
                <span className="w-5 h-5 bg-navy-900 rounded-full text-white text-xs flex items-center justify-center font-bold">3</span>
                Acabamento com Vidro
              </h3>
              <div className="flex gap-3">
                {ACABAMENTOS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAcab(a.id)}
                    className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      selectedAcab === a.id ? 'border-navy-900 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{a.id === 'sem-vidro' ? '🚫' : '🪟'}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{a.nome}</p>
                      <p className="text-xs text-gray-400">{a.preco > 0 ? `+R$ ${a.preco}` : 'Incluído'}</p>
                    </div>
                    {selectedAcab === a.id && <Check size={14} className="text-navy-900 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary card */}
          <div className="space-y-4">
            <div className="card p-5 sticky top-4 border-2 border-navy-900/10">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Grid size={14} className="text-navy-900" /> Especificação do Produto
              </h3>

              <div className="space-y-3">
                {/* Moldura */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Moldura</p>
                  {selectedMoldura ? (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">{selectedMolduraObj?.nome}</p>
                      <p className="text-[11px] text-gray-400">{selectedMolduraObj?.categoria}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 italic">não selecionado</span>
                  )}
                </div>

                {/* Formato */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Formato</p>
                  {selectedFormato ? (
                    <p className="text-sm font-semibold text-gray-800">{selectedFormatoObj?.nome}</p>
                  ) : (
                    <span className="text-xs text-gray-300 italic">não selecionado</span>
                  )}
                </div>

                {/* Tamanho */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Tamanho</p>
                  {selectedTamanho ? (
                    <p className="text-sm font-semibold text-gray-800">{selectedTamanho}</p>
                  ) : (
                    <span className="text-xs text-gray-300 italic">não selecionado</span>
                  )}
                </div>

                {/* Acabamento */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Vidro</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{selectedAcabObj?.nome}</p>
                    <p className="text-[11px] text-navy-900 font-semibold">
                      {selectedAcabObj?.preco ? `+R$ ${selectedAcabObj.preco}` : 'sem acréscimo'}
                    </p>
                  </div>
                </div>
              </div>

              {canFinalize ? (
                <div className="mt-4 space-y-2">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide mb-1">Especificação completa</p>
                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
                      {selectedFormatoObj?.nome} · {selectedTamanho}<br />
                      {selectedMolduraObj?.nome}<br />
                      {selectedAcabObj?.nome}
                    </p>
                  </div>
                  <button onClick={handleCopiar} className="btn-secondary w-full justify-center text-xs py-2">
                    📋 Copiar especificação
                  </button>
                  <button
                    onClick={() => showToast('Use esta especificação ao criar um novo pedido em Produção!')}
                    className="btn-primary w-full justify-center text-xs py-2"
                  >
                    <Check size={13} /> Usar em Novo Pedido
                  </button>
                </div>
              ) : (
                <div className="mt-4 bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Selecione moldura, formato e tamanho para ver a especificação completa.</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="card p-4 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resumo do Catálogo</p>
              {[
                { label: 'Total de molduras', value: ALL_MOLDURAS.length },
                { label: 'Categorias',        value: MOLDURA_CATEGORIAS.length },
                { label: 'Formatos',          value: FORMATOS.length },
                { label: 'Combinações totais', value: ALL_MOLDURAS.length * FORMATOS.reduce((s,f)=>s+f.tamanhos.length,0) * ACABAMENTOS.length },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">{s.label}</span>
                  <span className="font-bold text-gray-800">{s.value.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm"
          >
            <Check size={16} className="text-green-400 shrink-0" />
            {toast}
            <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-white"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
