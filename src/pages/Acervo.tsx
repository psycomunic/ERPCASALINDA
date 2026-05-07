import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Check, RefreshCw, Search, Frame, AlertTriangle, Trash2, Camera } from 'lucide-react'
import {
  fetchAcervoDisponivel, deleteAcervoItem,
  marcarComoVendido, uploadFotoAcervo, matchesPCP,
  type AcervoQuadro, type AcervoInsert
} from '../services/acervo'
import { supabase } from '../lib/supabase'
import { getFrameImage } from '../lib/frameImages'
import { fetchPedidos } from '../services/pedidos'

// ─── Constants (sincronizados com o Catálogo) ─────────────────────────────────

const CATEGORIAS = [
  'Artistas Famosos', 'Aquarela e Pinceladas', 'Árvores', 'Cidades e Turismo',
  'Leões', 'Infantil', 'Mosaico', 'Queridinhos dos Arquitetos', 'Natureza',
  'Pop Arte', 'Street Arte', 'Veículos', 'Profissões', 'Abstratos', 'Animais',
  'Business', 'Florais', 'Cultura Africana', 'Minimalista', 'Motivacionais',
  'Mulheres', 'Personalizados', 'Religiosos', 'Paisagens', 'Praia e Mar'
]

// Todos os tamanhos do catálogo, agrupados por formato
const TAMANHOS_GRUPOS = [
  {
    grupo: '1 Tela — Quadrado',
    tamanhos: ['85×85 cm', '115×115 cm', '145×145 cm'],
  },
  {
    grupo: '1 Tela — Retrato',
    tamanhos: ['85×55 cm', '115×75 cm', '145×95 cm', '175×100 cm'],
  },
  {
    grupo: '2 Telas',
    tamanhos: ['55×35 cm cada', '85×55 cm cada', '115×75 cm cada', '145×95 cm cada', '175×95 cm cada'],
  },
  {
    grupo: '3 Telas',
    tamanhos: ['40×20 cm cada', '55×30 cm cada', '70×40 cm cada', '90×50 cm cada', '120×70 cm cada'],
  },
]

// Todas as molduras do catálogo — com cor e emoji para o swatch visual
const MOLDURAS_GRUPOS = [
  {
    grupo: 'Sem Moldura',
    modelos: [
      { nome: 'Sem Moldura (Borda Infinita)', emoji: '⬜', cor: '#e5e7eb' },
    ],
  },
  {
    grupo: 'Caixa',
    modelos: [
      { nome: 'Caixa Preta',   emoji: '⬛', cor: '#111111' },
      { nome: 'Caixa Branca',  emoji: '⬜', cor: '#f5f5f5' },
      { nome: 'Caixa Dourada', emoji: '🟨', cor: '#c49a2c' },
      { nome: 'Caixa Madeira', emoji: '🟫', cor: '#7c3f1e' },
    ],
  },
  {
    grupo: 'Flutuante / Canaleta',
    modelos: [
      { nome: 'Flutuante Preta',   emoji: '⬛', cor: '#111111' },
      { nome: 'Flutuante Branca',  emoji: '⬜', cor: '#f5f5f5' },
      { nome: 'Flutuante Dourada', emoji: '🟨', cor: '#c49a2c' },
      { nome: 'Flutuante Madeira', emoji: '🟫', cor: '#7c3f1e' },
    ],
  },
  {
    grupo: 'Côncava',
    modelos: [
      { nome: 'Côncava Preta',   emoji: '⬛', cor: '#111111' },
      { nome: 'Côncava Branca',  emoji: '⬜', cor: '#f5f5f5' },
      { nome: 'Côncava Dourada', emoji: '🟨', cor: '#c49a2c' },
      { nome: 'Côncava Madeira', emoji: '🟫', cor: '#7c3f1e' },
    ],
  },
  {
    grupo: 'Inox',
    modelos: [
      { nome: 'Inox', emoji: '🔳', cor: '#9ca3af' },
    ],
  },
  {
    grupo: 'Premium — Clássicas',
    modelos: [
      { nome: 'Trono de Ouro',    emoji: '✨', cor: '#b8860b' },
      { nome: 'Majestade Negra',  emoji: '✨', cor: '#1a1a2e' },
      { nome: 'Galeria Imperial', emoji: '✨', cor: '#c49a2c' },
    ],
  },
  {
    grupo: 'Premium — Luxo',
    modelos: [
      { nome: 'Roma Moderna',          emoji: '👑', cor: '#c49a2c' },
      { nome: 'Palaciana',             emoji: '👑', cor: '#d4a017' },
      { nome: 'Realce Imperial',       emoji: '👑', cor: '#9ca3af' },
      { nome: 'Imperial Prata e Ouro', emoji: '👑', cor: '#b8860b' },
      { nome: 'Barroco Imperial',      emoji: '👑', cor: '#c8952c' },
    ],
  },
]

const ORIGENS = ['Acervo', 'Gravação', 'Devolução', 'Amostra', 'Exposição']

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm">
      <Check size={16} className="text-green-400 shrink-0" />{msg}
      <button onClick={onClose}><X size={14} className="text-gray-400" /></button>
    </motion.div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function QuadroCard({ q, onVendido, onDelete, onFotoUpdated }: {
  q: AcervoQuadro
  onVendido: () => void
  onDelete: () => void
  onFotoUpdated: (id: string, url: string) => void
}) {
  const [confirmVend, setConfirmVend] = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleVendido = async () => {
    setLoading(true)
    await marcarComoVendido(q.id)
    setLoading(false)
    onVendido()
  }

  const [uploadError, setUploadError] = useState('')

  const handleFotoUpload = async (file: File) => {
    setUploading(true)
    setUploadError('')
    try {
      const url = await uploadFotoAcervo(file)
      if (url) {
        const { error: dbErr } = await supabase
          .from('acervo_quadros')
          .update({ foto_url: url })
          .eq('id', q.id)
        if (dbErr) {
          console.error('[acervo] update foto_url:', dbErr.message)
          setUploadError('Erro ao salvar: ' + dbErr.message)
        } else {
          onFotoUpdated(q.id, url)
        }
      } else {
        setUploadError('Não foi possível processar a imagem.')
      }
    } catch (err: any) {
      console.error('[acervo] handleFotoUpload exception:', err)
      setUploadError('Erro inesperado ao enviar foto.')
    }
    setUploading(false)
  }

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Foto — clicável para adicionar/trocar */}
      <div
        className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden cursor-pointer group"
        onClick={() => fileRef.current?.click()}
        title="Clique para adicionar foto"
      >
        {uploading ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <RefreshCw size={26} className="animate-spin" />
            <p className="text-xs mt-2">Enviando foto...</p>
          </div>
        ) : q.foto_url ? (
          <>
            <img src={q.foto_url} alt={q.produto} className="w-full h-full object-cover" />
            {/* Overlay de troca de foto */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="bg-white/90 rounded-full p-2 shadow">
                <Camera size={16} className="text-navy-900" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 group-hover:text-navy-900 transition-colors">
            <Camera size={28} />
            <p className="text-xs mt-2 font-medium">Toque para adicionar foto</p>
            {uploadError && <p className="text-[10px] text-red-500 mt-1 px-2 text-center">{uploadError}</p>}
          </div>
        )}
        {q.origem && q.origem !== 'Acervo' && (
          <span className="absolute top-2 left-2 bg-navy-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            {q.origem}
          </span>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFotoUpload(f) }}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="font-bold text-gray-900 text-sm leading-tight">{q.produto}</p>
        <div className="flex flex-wrap gap-1.5">
          {q.tamanho   && <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">{q.tamanho}</span>}
          {q.categoria && <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">{q.categoria}</span>}
          {q.moldura   && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">{q.moldura}</span>}
        </div>
        {q.obs && <p className="text-[11px] text-gray-500 italic truncate">{q.obs}</p>}
        <p className="text-[10px] text-gray-400">Entrada: {new Date(q.created_at).toLocaleDateString('pt-BR')}</p>

        {/* Actions */}
        <div className="flex gap-1.5 pt-1">
          {confirmVend ? (
            <div className="flex gap-1 flex-1">
              <button onClick={handleVendido} disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60">
                {loading ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />} Confirmar
              </button>
              <button onClick={() => setConfirmVend(false)} className="px-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          ) : confirmDel ? (
            <div className="flex gap-1 flex-1">
              <button onClick={async () => { await deleteAcervoItem(q.id); onDelete() }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1">
                <Trash2 size={11} /> Excluir
              </button>
              <button onClick={() => setConfirmDel(false)} className="px-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => setConfirmVend(true)}
                className="flex-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold py-1.5 rounded-lg transition-colors">
                ✓ Marcar como Vendido
              </button>
              <button onClick={() => setConfirmDel(true)} className="p-1.5 border border-red-100 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Modal de Cadastro ────────────────────────────────────────────────────────

const EMPTY: AcervoInsert = {
  produto: '', tamanho: '', moldura: '', acabamento: 'Sem Vidro',
  categoria: '', foto_url: '', obs: '', origem: 'Acervo', status: 'disponivel',
}

function CadastroModal({ onClose, onSaved }: { onClose: () => void; onSaved: (q: AcervoQuadro) => void }) {
  const [form, setForm] = useState<AcervoInsert>(EMPTY)
  const [preview, setPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tamanhoCustom, setTamanhoCustom] = useState(false)
  const [molduraCustom, setMolduraCustom] = useState(false)
  // Autocomplete
  const [sugestoes, setSugestoes] = useState<string[]>([])
  const [showSug, setShowSug] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof AcervoInsert, v: any) => setForm(p => ({ ...p, [k]: v }))

  // Busca sugestões de produto no histórico de pedidos (Magazord + internos)
  const buscarSugestoes = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setSugestoes([]); setShowSug(false); return }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('produto')
        .ilike('produto', `%${q.trim()}%`)
        .limit(30)
      if (data) {
        const unicos = [...new Set(data.map(r => r.produto as string))].slice(0, 8)
        setSugestoes(unicos)
        setShowSug(unicos.length > 0)
      }
    }, 250)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    // Usa ObjectURL para preview instantâneo (evita travamento de memória com Base64 no iOS)
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)
    const url = await uploadFotoAcervo(file)
    setUploading(false)
    if (url) {
      set('foto_url', url)
      setPreview('')
      URL.revokeObjectURL(objectUrl) // libera a memória
    }
  }, [])

  const handleSave = async () => {
    if (!form.produto.trim()) { setError('Informe o nome do quadro.'); return }
    setSaving(true)
    setError('')
    try {
      // Insert direto para capturar mensagem de erro real do Supabase
      const { data, error: sbErr } = await supabase
        .from('acervo_quadros')
        .insert({
          produto:    form.produto.trim(),
          tamanho:    form.tamanho   || null,
          moldura:    form.moldura   || null,
          acabamento: form.acabamento || null,
          categoria:  form.categoria  || null,
          foto_url:   form.foto_url   || null,
          obs:        form.obs        || null,
          origem:     form.origem     || null,
          status:     form.status,
        })
        .select()
        .single()
      setSaving(false)
      if (sbErr) {
        console.error('[acervo] handleSave:', sbErr.code, sbErr.message, sbErr.details)
        setError(`Erro ao salvar: ${sbErr.message}`)
      } else {
        onSaved(data as AcervoQuadro)
      }
    } catch (err: any) {
      setSaving(false)
      console.error('[acervo] handleSave exception:', err)
      setError('Erro inesperado. Verifique a conexão e tente novamente.')
    }
  }

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" style={{ maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Frame size={16} className="text-navy-900" /> Catalogar Quadro</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Foto */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">📷 Foto do Quadro</p>
            {preview || form.foto_url ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-navy-900 aspect-square">
                <img src={preview || form.foto_url!} alt="Preview" className="w-full h-full object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <RefreshCw size={22} className="animate-spin text-white" />
                  </div>
                )}
                {!uploading && (
                  <button onClick={() => { set('foto_url', ''); setPreview('') }}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow hover:bg-red-50">
                    <X size={14} className="text-red-500" />
                  </button>
                )}
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-navy-900 hover:text-navy-900 transition-colors">
                <Camera size={28} />
                <p className="text-sm font-semibold text-center px-4">Clique para tirar/selecionar foto</p>
                <p className="text-xs text-gray-400">Comprimida automaticamente</p>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>

          {/* Nome com autocomplete */}
          <div className="relative">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Nome / Descrição *</label>
            <input
              className="input"
              placeholder="Ex: Árvore da Vida em Canvas Texturizado"
              value={form.produto}
              autoComplete="off"
              onChange={e => {
                set('produto', e.target.value)
                buscarSugestoes(e.target.value)
              }}
              onFocus={() => { if (sugestoes.length > 0) setShowSug(true) }}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
            />
            {showSug && (
              <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {sugestoes.map((s, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={() => {
                        set('produto', s)
                        setSugestoes([])
                        setShowSug(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 hover:text-navy-900 transition-colors truncate"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tamanho */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Tamanho</label>
            <div className="space-y-2">
              {TAMANHOS_GRUPOS.map(g => (
                <div key={g.grupo}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{g.grupo}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.tamanhos.map(t => (
                      <button key={t}
                        onClick={() => { setTamanhoCustom(false); set('tamanho', t) }}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          form.tamanho === t && !tamanhoCustom
                            ? 'bg-navy-900 text-white border-navy-900'
                            : 'border-gray-200 text-gray-600 hover:border-navy-900'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setTamanhoCustom(true); set('tamanho', '') }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  tamanhoCustom ? 'bg-navy-900 text-white border-navy-900' : 'border-gray-200 text-gray-600 hover:border-navy-900'
                }`}>
                Outro
              </button>
            </div>
            {tamanhoCustom && (
              <input className="input mt-2" placeholder="Ex: 120×80 cm" value={form.tamanho ?? ''}
                onChange={e => set('tamanho', e.target.value)} />
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Tema / Categoria</label>
            <select className="input" value={form.categoria ?? ''} onChange={e => set('categoria', e.target.value)}>
              <option value="">Selecione...</option>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Moldura — picker visual */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Moldura</label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {MOLDURAS_GRUPOS.map(g => (
                <div key={g.grupo}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{g.grupo}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.modelos.map(m => {
                      const img = getFrameImage(m.nome)
                      const isSelected = form.moldura === m.nome && !molduraCustom
                      return (
                        <button
                          key={m.nome}
                          title={m.nome}
                          onClick={() => { setMolduraCustom(false); set('moldura', m.nome) }}
                          className={`relative flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-navy-900 bg-blue-50 shadow'
                              : 'border-gray-200 hover:border-gray-400 bg-white'
                          }`}
                          style={{ minWidth: 52 }}
                        >
                          <div
                            className="w-9 h-9 rounded flex items-center justify-center overflow-hidden text-base"
                            style={{ background: m.cor + '22', border: `2px solid ${m.cor}66` }}
                          >
                            {img
                              ? <img src={img} alt={m.nome} className="w-full h-full object-cover" />
                              : <span>{m.emoji}</span>
                            }
                          </div>
                          <span className="text-[9px] text-gray-600 leading-tight text-center max-w-[50px] truncate">{m.nome}</span>
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-navy-900 rounded-full flex items-center justify-center">
                              <Check size={8} className="text-white" />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {/* Outro */}
              <button
                onClick={() => { setMolduraCustom(true); set('moldura', '') }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  molduraCustom ? 'bg-navy-900 text-white border-navy-900' : 'border-dashed border-gray-300 text-gray-500 hover:border-navy-900'
                }`}
              >
                + Outro
              </button>
            </div>
            {molduraCustom && (
              <input className="input mt-2" placeholder="Descreva a moldura..." value={form.moldura ?? ''}
                onChange={e => set('moldura', e.target.value)} />
            )}
            {form.moldura && !molduraCustom && (
              <p className="text-xs text-navy-900 font-semibold mt-1.5">✓ {form.moldura}</p>
            )}
          </div>

          {/* Origem + Obs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Origem</label>
              <select className="input" value={form.origem ?? 'Acervo'} onChange={e => set('origem', e.target.value)}>
                {ORIGENS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Acabamento</label>
              <select className="input" value={form.acabamento ?? ''} onChange={e => set('acabamento', e.target.value)}>
                <option value="Sem Vidro">Sem Vidro</option>
                <option value="Com Vidro">Com Vidro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Observações</label>
            <textarea className="input min-h-[64px] resize-none" placeholder="Condições, detalhes extras..." value={form.obs ?? ''} onChange={e => set('obs', e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 transition-opacity"
            style={{ background: '#0f172a' }}>
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Frame size={16} />}
            Salvar no Acervo
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Acervo() {
  const [quadros, setQuadros]       = useState<AcervoQuadro[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [toast, setToast]           = useState('')
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [filterTam, setFilterTam]   = useState('')
  const [pcpMatches, setPcpMatches] = useState<{ pedido: string; quadros: AcervoQuadro[] }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchAcervoDisponivel()
    setQuadros(data)
    setLoading(false)

    // Cross-match with PCP orders
    const pedidos = await fetchPedidos()
    const ativos  = pedidos.filter(p => p.etapa !== 'Despachados' && p.etapa !== 'Prontos para Envio')
    const matches = ativos.flatMap(p => {
      const qs = data.filter(q => matchesPCP(p.produto, q.produto))
      return qs.length > 0 ? [{ pedido: `${p.produto} (Cliente: ${p.cliente})`, quadros: qs }] : []
    })
    setPcpMatches(matches)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaved = (q: AcervoQuadro) => {
    setQuadros(prev => [q, ...prev])
    setShowModal(false)
    setToast('Quadro catalogado com sucesso!')
  }

  const handleVendido = (id: string) => {
    setQuadros(prev => prev.filter(q => q.id !== id))
    setPcpMatches(prev => prev.map(m => ({ ...m, quadros: m.quadros.filter(q => q.id !== id) })).filter(m => m.quadros.length > 0))
    setToast('Quadro marcado como vendido!')
  }

  const handleDelete = (id: string) => {
    setQuadros(prev => prev.filter(q => q.id !== id))
    setToast('Quadro removido do acervo.')
  }

  const handleFotoUpdated = (id: string, url: string) => {
    setQuadros(prev => prev.map(q => q.id === id ? { ...q, foto_url: url } : q))
    setToast('Foto adicionada com sucesso!')
  }

  const filtered = quadros.filter(q => {
    const matchSearch = !search || q.produto.toLowerCase().includes(search.toLowerCase())
    const matchCat    = !filterCat || q.categoria === filterCat
    const matchTam    = !filterTam || q.tamanho === filterTam
    return matchSearch && matchCat && matchTam
  })

  const tamanhosList = [...new Set(quadros.map(q => q.tamanho).filter(Boolean))] as string[]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Frame size={22} className="text-navy-900" /> Acervo de Quadros Prontos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Quadros disponíveis no salão — gravações, devoluções e amostras</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: '#0f172a' }}>
          <Plus size={16} /> Catalogar Quadro
        </button>
      </div>

      {/* PCP Matches */}
      {pcpMatches.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <p className="text-sm font-black text-amber-800">🎯 {pcpMatches.length} pedido(s) em produção têm quadros disponíveis no acervo!</p>
          </div>
          <div className="space-y-2">
            {pcpMatches.map((m, i) => (
              <div key={i} className="bg-white border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-800 mb-2 truncate">📋 {m.pedido}</p>
                <div className="flex flex-wrap gap-2">
                  {m.quadros.map(q => (
                    <div key={q.id} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                      {q.foto_url && <img src={q.foto_url} alt="" className="w-7 h-7 rounded object-cover border border-emerald-200" />}
                      <div>
                        <p className="text-[11px] font-bold text-emerald-800 leading-none">{q.produto}</p>
                        <p className="text-[10px] text-emerald-600">{q.tamanho} · {q.categoria}</p>
                      </div>
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase ml-1">No Salão ✓</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 py-2 text-sm" placeholder="Buscar quadro..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input py-2 text-sm w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Todos os temas</option>
          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input py-2 text-sm w-auto" value={filterTam} onChange={e => setFilterTam(e.target.value)}>
          <option value="">Todos os tamanhos</option>
          {tamanhosList.map(t => <option key={t}>{t}</option>)}
        </select>
        {(search || filterCat || filterTam) && (
          <button onClick={() => { setSearch(''); setFilterCat(''); setFilterTam('') }}
            className="text-xs text-gray-500 hover:text-gray-800 underline">Limpar filtros</button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} quadro(s) disponível(is)</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <RefreshCw size={20} className="animate-spin" />
          <span className="text-sm">Carregando acervo...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Frame size={48} className="text-gray-200 mb-4" />
          <p className="text-gray-500 font-semibold">{quadros.length === 0 ? 'Nenhum quadro no acervo ainda.' : 'Nenhum quadro encontrado com esses filtros.'}</p>
          {quadros.length === 0 && (
            <button onClick={() => setShowModal(true)} className="mt-4 text-sm font-bold text-navy-900 underline">
              + Catalogar o primeiro quadro
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <AnimatePresence>
            {filtered.map(q => (
              <QuadroCard key={q.id} q={q} onVendido={() => handleVendido(q.id)} onDelete={() => handleDelete(q.id)} onFotoUpdated={handleFotoUpdated} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && <CadastroModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      </AnimatePresence>
    </div>
  )
}
