import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Check, RefreshCw, Search, Frame, Trash2, Camera, Edit2, ClipboardList } from 'lucide-react'
import {
  fetchAcervoDisponivel, deleteAcervoItem,
  marcarComoVendido, uploadFotoAcervo, matchesPCP, comprimirImagem,
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
  {
    grupo: '1 Tela — Panorâmico',
    tamanhos: ['100×40 cm', '150×60 cm', '200×80 cm', '230×100 cm'],
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

function QuadroCard({ q, onVendido, onDelete, onEdit, onFotoUpdated }: {
  q: AcervoQuadro
  onVendido: () => void
  onDelete: () => void
  onEdit: () => void
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
    // Reseta o input para garantir que o próximo onChange dispare mesmo
    // que o usuário escolha/tire a mesma foto (bug no iOS)
    if (fileRef.current) fileRef.current.value = ''
    try {
      // Comprime a imagem antes de enviar (iOS fotos chegam em 5-12MB)
      const compressed = await comprimirImagem(file)
      const url = await uploadFotoAcervo(compressed)
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
        {/* Input sem capture fixo — deixa o sistema operacional escolher câmera/galeria */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFotoUpload(f)
          }}
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
              <button onClick={onEdit} className="p-1.5 border border-blue-100 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Edit2 size={13} />
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

function CadastroModal({ quadroToEdit, onClose, onSaved }: { quadroToEdit?: AcervoQuadro | null; onClose: () => void; onSaved: (q: AcervoQuadro, isEdit?: boolean) => void }) {
  const [form, setForm] = useState<AcervoInsert>(quadroToEdit ? { ...quadroToEdit } : EMPTY)
  const [preview, setPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tamanhoCustom, setTamanhoCustom] = useState(false)
  const [molduraCustom, setMolduraCustom] = useState(false)
  // Autocomplete
  const [sugestoes, setSugestoes] = useState<{ nome: string; foto_url?: string }[]>([])
  const [showSug, setShowSug] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof AcervoInsert, v: any) => setForm(p => ({ ...p, [k]: v }))

  // Busca sugestões de produto no histórico de pedidos (Magazord + internos)
  const buscarSugestoes = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setSugestoes([]); setShowSug(false); return }
    debounceRef.current = setTimeout(async () => {
      const qBusca = `%${q.trim()}%`
      const [resP, resA] = await Promise.all([
        supabase.from('pedidos').select('produto').ilike('produto', qBusca).limit(20),
        supabase.from('acervo_quadros').select('produto, foto_url').ilike('produto', qBusca).limit(20)
      ])

      const map = new Map<string, string | undefined>()
      
      // Prioriza acervo para tentar pegar a foto (ignora imagens em Base64 antigas)
      if (resA.data) {
        resA.data.forEach(item => {
          const isValidUrl = item.foto_url && !item.foto_url.startsWith('data:image')
          if (!map.has(item.produto)) {
            map.set(item.produto, isValidUrl ? (item.foto_url || undefined) : undefined)
          } else if (isValidUrl) {
            map.set(item.produto, item.foto_url || undefined)
          }
        })
      }
      
      if (resP.data) {
        resP.data.forEach(item => {
          if (!map.has(item.produto)) map.set(item.produto, undefined)
        })
      }

      const unicos = Array.from(map.entries())
        .map(([nome, foto_url]) => ({ nome, foto_url }))
        .slice(0, 8)
        
      setSugestoes(unicos)
      setShowSug(unicos.length > 0)
    }, 250)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    // Usa ObjectURL para preview instantâneo (evita travamento de memória com Base64 no iOS)
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)
    // Reseta o input para que o iOS dispare onChange na próxima foto
    if (fileRef.current) fileRef.current.value = ''
    // Comprime antes de enviar (fotos de celular chegam em 5-12MB)
    const compressed = await comprimirImagem(file)
    const url = await uploadFotoAcervo(compressed)
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
    
    // Garante que não vamos tentar salvar um Base64 gigante na tabela
    const finalFotoUrl = form.foto_url && form.foto_url.startsWith('data:image') ? null : (form.foto_url || null)

    try {
      if (quadroToEdit) {
        const { error: sbErr } = await supabase
          .from('acervo_quadros')
          .update({
            produto:    form.produto.trim(),
            tamanho:    form.tamanho   || null,
            moldura:    form.moldura   || null,
            acabamento: form.acabamento || null,
            categoria:  form.categoria  || null,
            foto_url:   finalFotoUrl,
            obs:        form.obs        || null,
            origem:     form.origem     || null,
            status:     form.status,
          })
          .eq('id', quadroToEdit.id)
        
        setSaving(false)
        if (sbErr) {
          console.error('[acervo] handleSave edit:', sbErr)
          setError(`Erro ao atualizar: ${sbErr.message}`)
        } else {
          onSaved({ ...quadroToEdit, ...form, produto: form.produto.trim() } as AcervoQuadro, true)
        }
      } else {
        const { data, error: sbErr } = await supabase
          .from('acervo_quadros')
          .insert({
            produto:    form.produto.trim(),
            tamanho:    form.tamanho   || null,
            moldura:    form.moldura   || null,
            acabamento: form.acabamento || null,
            categoria:  form.categoria  || null,
            foto_url:   finalFotoUrl,
            obs:        form.obs        || null,
            origem:     form.origem     || null,
            status:     form.status,
          })
          .select()
          .single()
        setSaving(false)
        if (sbErr) {
          console.error('[acervo] handleSave insert:', sbErr)
          setError(`Erro ao salvar: ${sbErr.message}`)
        } else {
          onSaved(data as AcervoQuadro, false)
        }
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
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Frame size={16} className="text-navy-900" /> {quadroToEdit ? 'Editar Quadro' : 'Catalogar Quadro'}</h3>
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
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
                        set('produto', s.nome)
                        if (!form.foto_url && s.foto_url) set('foto_url', s.foto_url)
                        setSugestoes([])
                        setShowSug(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 hover:text-navy-900 transition-colors flex items-center gap-2"
                    >
                      {s.foto_url ? (
                        <img src={s.foto_url} alt="" className="w-8 h-8 rounded object-cover border border-gray-200 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                          <Frame size={14} className="text-gray-400" />
                        </div>
                      )}
                      <span className="truncate">{s.nome}</span>
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
  const [editingQuadro, setEditingQuadro] = useState<AcervoQuadro | null>(null)
  const [toast, setToast]           = useState('')
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [filterTam, setFilterTam]   = useState('')
  // Agrupado por quadro do acervo: cada quadro lista todos os pedidos que batem
  const [pcpMatches, setPcpMatches] = useState<{
    quadro: AcervoQuadro
    pedidos: { numero: string; cliente: string; produto: string; notaFiscal?: string }[]
  }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchAcervoDisponivel()
    setQuadros(data)
    setLoading(false)

    // Cross-match com pedidos do PCP — agrupado por quadro do acervo
    const pedidos = await fetchPedidos()
    const ativos  = pedidos.filter(p => p.etapa !== 'Despachados' && p.etapa !== 'Prontos para Envio')

    const byQuadro = new Map<string, { quadro: AcervoQuadro; pedidos: { numero: string; cliente: string; produto: string; notaFiscal?: string }[] }>()
    ativos.forEach(p => {
      data.forEach(q => {
        if (!matchesPCP(p.produto, q.produto)) return
        if (!byQuadro.has(q.id)) byQuadro.set(q.id, { quadro: q, pedidos: [] })
        byQuadro.get(q.id)!.pedidos.push({
          numero:     (p as any).numero || p.id,
          cliente:    p.cliente,
          produto:    p.produto,
          notaFiscal: (p as any).nota_fiscal || (p as any).notaFiscal || undefined,
        })
      })
    })
    setPcpMatches(Array.from(byQuadro.values()))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaved = (q: AcervoQuadro) => {
    setQuadros(prev => [q, ...prev])
    setShowModal(false)
    setToast('Quadro catalogado com sucesso!')
  }

  const handleVendido = (id: string) => {
    setQuadros(prev => prev.filter(q => q.id !== id))
    setPcpMatches(prev => prev.filter(m => m.quadro.id !== id))
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
        <button onClick={() => { setEditingQuadro(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: '#0f172a' }}>
          <Plus size={16} /> Catalogar Quadro
        </button>
      </div>

      {/* PCP Matches — agrupado por quadro do acervo */}
      {pcpMatches.length > 0 && (
        <div className="rounded-2xl border-2 border-emerald-300 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="bg-emerald-600 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-lg">🎯</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm leading-tight">
                {pcpMatches.length} quadro{pcpMatches.length > 1 ? 's' : ''} do sal\u00e3o podem atender pedidos em produ\u00e7\u00e3o!
              </p>
              <p className="text-emerald-100 text-xs mt-0.5">
                {pcpMatches.reduce((acc, m) => acc + m.pedidos.length, 0)} pedido(s) no PCP com correspond\u00eancia
              </p>
            </div>
          </div>

          {/* Lista de quadros */}
          <div className="bg-emerald-50 divide-y divide-emerald-200">
            {pcpMatches.map(({ quadro: q, pedidos }) => (
              <div key={q.id} className="p-4">
                {/* Quadro header */}
                <div className="flex items-center gap-3 mb-3">
                  {q.foto_url ? (
                    <img src={q.foto_url} alt={q.produto} className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-300 shrink-0 shadow-sm" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center shrink-0">
                      <Frame size={20} className="text-emerald-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm leading-tight truncate">{q.produto}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {q.tamanho && <span className="bg-white border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{q.tamanho}</span>}
                      {q.categoria && <span className="bg-white border border-amber-200 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">{q.categoria}</span>}
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">NO SAL\u00c3O ✓</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-center bg-white border border-emerald-200 rounded-xl px-3 py-1.5">
                    <p className="text-2xl font-black text-emerald-600">{pedidos.length}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">pedido{pedidos.length > 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Lista de pedidos que batem */}
                <div className="space-y-2 ml-1">
                  {pedidos.map((p, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                      <div className="flex flex-col gap-1 shrink-0">
                        <span className="inline-flex items-center gap-1 bg-navy-900 text-white text-[11px] font-black px-2.5 py-1 rounded-lg">
                          #{p.numero}
                        </span>
                        {p.notaFiscal ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                            <ClipboardList size={9} /> NF {p.notaFiscal}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 text-gray-400 text-[10px] font-semibold px-2 py-0.5 rounded-lg">
                            Sem NF
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 leading-tight truncate">{p.cliente}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{p.produto}</p>
                      </div>
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
              <QuadroCard key={q.id} q={q} onVendido={() => handleVendido(q.id)} onDelete={() => handleDelete(q.id)} onEdit={() => { setEditingQuadro(q); setShowModal(true); }} onFotoUpdated={handleFotoUpdated} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && <CadastroModal
          quadroToEdit={editingQuadro}
          onClose={() => { setShowModal(false); setEditingQuadro(null); }}
          onSaved={(novo, isEdit) => {
            if (isEdit) {
              setQuadros(p => p.map(x => x.id === novo.id ? novo : x))
            } else {
              setQuadros(p => [novo, ...p])
            }
            setShowModal(false)
            setEditingQuadro(null)
            setToast(isEdit ? 'Quadro atualizado com sucesso!' : 'Quadro catalogado com sucesso!')
          }}
        />}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      </AnimatePresence>
    </div>
  )
}
