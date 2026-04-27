#!/usr/bin/env python3
import sys

TARGET = 'src/pages/Production.tsx'

NEW_MODAL = r'''// ─── New Order Modal ──────────────────────────────────────────────────────────

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
'''

with open(TARGET, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find start: line 1282 (0-indexed: 1281) = "// ─── New Order Modal"
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if '// ─── New Order Modal' in line and start_idx is None:
        start_idx = i
    if '// ─── Delivery Card' in line and start_idx is not None:
        end_idx = i
        break

if start_idx is None or end_idx is None:
    print(f'ERROR: Could not find boundaries. start={start_idx} end={end_idx}')
    sys.exit(1)

print(f'Replacing lines {start_idx+1}–{end_idx} ({end_idx - start_idx} lines)')

new_lines = lines[:start_idx] + [NEW_MODAL + '\n'] + lines[end_idx:]

with open(TARGET, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('DONE. Total lines:', len(new_lines))
