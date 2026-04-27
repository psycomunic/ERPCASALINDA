import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchItens, fetchMovimentacoes, registrarMovimentacao, createItem, updateItem } from '../services/estoque'
import { fetchPedidos } from '../services/pedidos'
import { useAuth } from '../contexts/AuthContext'
import {
  Download, Plus, Filter, RefreshCw, ArrowUpCircle, ArrowDownCircle, Lightbulb,
  X, Check, ChevronDown, PackagePlus, Printer, Edit2
} from 'lucide-react'
import { getFrameImage } from '../lib/frameImages'

interface Item {
  id: string
  ref: string
  nome: string
  unidade: string
  atual: number
  minimo: number
  status: 'NORMAL' | 'CRÍTICO' | 'ATENÇÃO'
  img: string | null
  categoria?: string | null
}

type Movement = { tipo: 'saida' | 'entrada' | 'ajuste'; desc: string; sub: string; time: string }


const STATUS_BADGE: Record<string, string> = { NORMAL: 'badge-normal', CRÍTICO: 'badge-critico', ATENÇÃO: 'badge-atencao' }

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

export default function Inventory() {
  const { profile } = useAuth()
  const [items, setItems]         = useState<Item[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [stats, setStats]         = useState({ tamanhos: {} as any, molduras: {} as any, vidro: { com: 0, sem: 0 } })
  const [modal, setModal]         = useState(false)
  const [showAll, setShowAll]     = useState(false)
  const [toast, setToast]         = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [showFilter, setShowFilter]     = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('MOLDURA')
  const [form, setForm] = useState({ materialId: '', quantidade: '', nf: '', fornecedor: '', obs: '' })

  const [modalNovo, setModalNovo] = useState(false)
  const [formNovo, setFormNovo] = useState({ nome: '', categoria: 'Embalagem', unidade: 'un', minimo: '' as number | string })

  const [modalEdit, setModalEdit] = useState<{ id: string, name: string } | null>(null)
  const [formEdit, setFormEdit] = useState({ nome: '', categoria: '', unidade: '', atual: 0 as number | string, minimo: 0 as number | string })

  const loadData = async () => {
    const rawItens = await fetchItens()
    const mappedItens: Item[] = rawItens.map(i => {
      const atual = i.quantidade || 0
      const min = i.quantidade_minima || 0
      const status = atual < min ? 'CRÍTICO' : atual < (min * 1.5) ? 'ATENÇÃO' : 'NORMAL'
      return {
        id: i.id, ref: i.codigo || i.id.substring(0, 6).toUpperCase(),
        nome: i.nome, unidade: i.unidade || 'un', atual, minimo: min, status,
        img: getFrameImage(i.nome),
        categoria: i.categoria
      }
    })
    setItems(mappedItens)
    if (mappedItens.length > 0 && !form.materialId) {
      setForm(prev => ({ ...prev, materialId: mappedItens[0].id }))
    }

    const rawMovs = await fetchMovimentacoes()
    const mappedMovs: Movement[] = rawMovs.map(m => {
      const dataStr = new Date(m.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      const itemData = (m as any).estoque_itens as any
      const nome = itemData?.nome || 'Item Desconhecido'
      const un = itemData?.unidade || 'un'
      const desc = `${m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'saida' ? 'Saída' : 'Ajuste'} de ${m.quantidade} ${un} de ${nome}`
      const sub = m.motivo || 'Sem observações'
      return { tipo: m.tipo as any, desc, sub, time: dataStr }
    })
    setMovements(mappedMovs)

    // Agregações de Produção (Mês Atual baseando-se nos pedidos puxados)
    const pedidos = await fetchPedidos()
    const currMonth = new Date().getMonth()
    const aggTam: Record<string, number> = {}
    const aggMold: Record<string, number> = {}
    let comVidro = 0, semVidro = 0

    pedidos.forEach((p: any) => {
      const d = new Date(p.created_at)
      if (d.getMonth() === currMonth) {
        // quantidade
        const qtd = p.quantidade || 1
        
        // Tamanho
        const tam = p.tamanho || 'Outro'
        aggTam[tam] = (aggTam[tam] || 0) + qtd
        
        // Moldura
        const mold = p.moldura || 'N/A'
        aggMold[mold] = (aggMold[mold] || 0) + qtd
        
        // Vidro
        const aba = (p.acabamento || '').toLowerCase()
        if (aba.includes('vidro') || aba.includes('acrílico')) {
          if (aba.includes('sem vidro')) semVidro += qtd
          else comVidro += qtd
        } else {
          semVidro += qtd // fallback "sem vidro"
        }
      }
    })
    setStats({ tamanhos: aggTam, molduras: aggMold, vidro: { com: comVidro, sem: semVidro } })
  }

  useEffect(() => { loadData() }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
  const criticos = items.filter(i => i.status === 'CRÍTICO').length
  const totalMolduras = items.filter(i => i.nome.toLowerCase().includes('moldura') || i.nome.toLowerCase().includes('caixa') || i.nome.toLowerCase().includes('flutuante') || i.nome.toLowerCase().includes('imperial') || i.nome.toLowerCase().includes('trono') || i.nome.toLowerCase().includes('majestade') || i.nome.toLowerCase().includes('roma') || i.nome.toLowerCase().includes('côncava')).reduce((acc, i) => acc + i.atual, 0)
  const totalItems = items.length

  const filteredItems = filterStatus === 'TODOS' ? items : items.filter(i => i.status === filterStatus)

  // Agrupar itens por categoria para facilitar a visualização
  const groupedItems = filteredItems.reduce((acc, item) => {
    // Normalizing category strings (uppercase, trim) for robust grouping
    const cat = (item.categoria || 'OUTROS').toUpperCase().trim()
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, typeof filteredItems>)

  const categoriesList = Object.keys(groupedItems).sort()
  const displayCategories = ['TODAS', ...categoriesList]
  
  // If active category is set but not 'TODAS', we only render that group
  const renderedGroups = activeCategory === 'TODAS'
    ? Object.keys(groupedItems).sort()
    : groupedItems[activeCategory] ? [activeCategory] : []

  const handleExportar = () => {
    const csv = ['Ref,Nome,Unidade,Atual,Mínimo,Status',
      ...items.map(i => `"${i.ref}","${i.nome}","${i.unidade}","${i.atual}","${i.minimo}","${i.status}"`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'inventario.csv'; a.click()
    URL.revokeObjectURL(url)
    showToast('Inventário exportado!')
  }

  const handleAtualizar = async () => {
    await loadData()
    showToast('Inventário sincronizado com sucesso!')
  }

  const handleRegistrarEntrada = async () => {
    const qty = parseFloat(form.quantidade)
    if (!form.quantidade || isNaN(qty) || !form.materialId) return
    
    let motivo = form.obs || ''
    if (form.nf) motivo += ` (NF ${form.nf})`
    if (form.fornecedor) motivo += ` - Fornecedor: ${form.fornecedor}`

    const success = await registrarMovimentacao({
      item_id: form.materialId,
      tipo: 'entrada',
      quantidade: qty,
      motivo: motivo.trim() || 'Entrada manual avulsa',
      usuario: profile?.nome || profile?.email || 'Sistema'
    })

    if (success) {
      await loadData()
      setModal(false)
      setForm({ materialId: items[0]?.id || '', quantidade: '', nf: '', fornecedor: '', obs: '' })
      showToast('Entrada de insumo registrada com sucesso!')
    } else {
      showToast('Erro ao registrar entrada.')
    }
  }

  const handleCreate = async () => {
    if (!formNovo.nome) return showToast('O nome é obrigatório.')
    const newItem = await createItem({
      nome: formNovo.nome.trim(),
      categoria: formNovo.categoria,
      unidade: formNovo.unidade,
      quantidade: 0,
      quantidade_minima: Number(formNovo.minimo) || 0
    })
    
    if (newItem) {
      setModalNovo(false)
      loadData()
      showToast('Novo insumo cadastrado com sucesso!')
      setFormNovo({ nome: '', categoria: 'Embalagem', unidade: 'un', minimo: '' })
    } else {
      showToast('Erro ao cadastrar novo insumo.')
    }
  }

  const handleRowClick = (item: Item) => {
    setFormEdit({
      nome: item.nome,
      categoria: item.categoria || 'Outros',
      unidade: item.unidade,
      atual: item.atual,
      minimo: item.minimo
    })
    setModalEdit({ id: item.id, name: item.nome })
  }

  const handleSaveEdit = async () => {
    if (!modalEdit || !formEdit.nome) return

    const originalItem = items.find(i => i.id === modalEdit.id)
    if (!originalItem) return

    // Verifica se houve mudança na quantidade atual
    const newAtual = Number(formEdit.atual) || 0
    if (newAtual !== originalItem.atual) {
      // Registrar movimento de 'ajuste'
      const successMovimento = await registrarMovimentacao({
        item_id: modalEdit.id,
        tipo: 'ajuste',
        quantidade: newAtual,
        motivo: 'Ajuste manual de estoque',
        usuario: profile?.nome || profile?.email || 'Sistema'
      })
      if (!successMovimento) {
        return showToast('Erro ao ajustar a quantidade em estoque.')
      }
    }

    // Atualiza metadados do item
    const successUpdate = await updateItem(modalEdit.id, {
      nome: formEdit.nome.trim(),
      categoria: formEdit.categoria,
      unidade: formEdit.unidade,
      quantidade_minima: Number(formEdit.minimo) || 0
    })

    if (successUpdate) {
      setModalEdit(null)
      loadData() // Recarrega para refletir a edição e trigger de ajuste
      showToast('Insumo atualizado com sucesso!')
    } else {
      showToast('Erro ao atualizar insumo.')
    }
  }

  const handlePrint = () => {
    const printContent = document.getElementById('print-report')
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.open()
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir Relatório - Casa Linda</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { background: white !important; color: black; font-family: sans-serif; }
            table { page-break-inside: auto; }
            tr    { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          </style>
          <script>
            // Força a impressão somente APÓS o tailwind processar as classes
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 600);
            };
          </script>
        </head>
        <body class="bg-white">
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const visibleMovements = showAll ? movements : movements.slice(0, 3)

  return (
    <>
    <div className="p-6 space-y-5 print:hidden" onClick={() => setShowFilter(false)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Almoxarifado</h1>
          <p className="text-sm text-gray-500 mt-0.5">Controle de insumos, matérias-primas e gestão de estoque mínimo para a linha de produção Casa Linda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={handlePrint}>
            <Printer size={14} className="text-gray-600" /> Imprimir Relatório
          </button>
          <button className="btn-secondary" onClick={handleExportar}><Download size={14} /> Exportar</button>
          <button onClick={() => setModalNovo(true)} className="btn-secondary text-navy-900 border-navy-900/20 hover:bg-blue-50/50">
            <PackagePlus size={14} /> Novo Insumo
          </button>
          <button onClick={() => setModal(true)} className="btn-primary"><Plus size={14} /> Entrada de Reabastecimento</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">⬡</div>
            <span className="badge badge-normal text-[11px]">GERAL</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totalMolduras.toLocaleString('pt-BR')}m</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total de Molduras em Estoque</p>
        </div>
        <div className="stat cursor-pointer" onClick={() => setFilterStatus('CRÍTICO')}>
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm">⚠</div>
            <span className="badge badge-critico text-[11px]">CRÍTICO</span>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{criticos.toString().padStart(2, '0')} Itens</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Abaixo do Estoque Mínimo</p>
        </div>
        <div className="stat">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600 text-sm">📋</div>
            <span className="badge badge-pendente text-[11px]">CADASTRO</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{totalItems}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Insumos Registrados</p>
        </div>
      </div>

      {/* Analytics Panel */}
      <div className="card p-5 mt-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Filter size={16} className="text-blue-500" />
          Estatísticas de Produção (Mês Atual)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tamanhos */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2">Tamanhos mais produzidos</h3>
            <div className="space-y-2">
              {Object.entries(stats.tamanhos).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0, 5).map(([tam, val]) => (
                <div key={tam} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 font-medium">{tam}</span>
                  <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{String(val)} un</span>
                </div>
              ))}
              {Object.keys(stats.tamanhos).length === 0 && <p className="text-xs text-gray-400 italic">Sem dados neste mês</p>}
            </div>
          </div>
          {/* Molduras */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2">Cores de Moldura</h3>
            <div className="space-y-2">
              {Object.entries(stats.molduras).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0, 5).map(([mold, val]) => (
                <div key={mold} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 font-medium">{mold}</span>
                  <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{String(val)} un</span>
                </div>
              ))}
              {Object.keys(stats.molduras).length === 0 && <p className="text-xs text-gray-400 italic">Sem dados neste mês</p>}
            </div>
          </div>
          {/* Acabamento */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2">Acabamento com Vidro</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Com Vidro/Acrílico</p>
                <p className="text-2xl font-black text-gray-900">{stats.vidro.com}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Sem Vidro</p>
                <p className="text-2xl font-black text-gray-400">{stats.vidro.sem}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
        {/* Table */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Filter size={14} className="text-gray-400" /> Inventário de Insumos
              </p>
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setShowFilter(v => !v) }}
                  className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50"
                >
                  {filterStatus} <ChevronDown size={10} />
                </button>
                <AnimatePresence>
                  {showFilter && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-max">
                      {['TODOS', 'NORMAL', 'ATENÇÃO', 'CRÍTICO'].map(s => (
                        <button key={s} onClick={e => { e.stopPropagation(); setFilterStatus(s); setShowFilter(false) }}
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${filterStatus === s ? 'font-bold text-navy-900' : 'text-gray-700'}`}>
                          {s}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <button className="btn-ghost text-xs" onClick={handleAtualizar}><RefreshCw size={12} /> Atualizar</button>
          </div>
          
          {/* Horizontal Category Tabs */}
          <div className="bg-gray-50 border-b border-gray-200 overflow-x-auto scrollbar-hide w-full">
            <div className="flex px-4 pt-3 pb-0 min-w-max">
              {displayCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    activeCategory === cat
                      ? 'border-navy-900 text-navy-900 bg-blue-50/50 rounded-t-lg'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-t-lg'
                  }`}
                >
                  {cat === 'TODAS' ? '📦 Todas as Categorias' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">Material</th>
                <th className="th">Unidade</th>
                <th className="th">Atual</th>
                <th className="th">Mínimo</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            {renderedGroups.map(cat => (
              <tbody key={cat}>
                <tr>
                  <td colSpan={5} className="bg-gray-100/80 py-2.5 px-5 text-xs font-bold text-navy-900 uppercase tracking-widest border-y border-gray-200">
                    📦 {cat} <span className="text-gray-400 font-medium lowercase ml-1">({groupedItems[cat].length} itens)</span>
                  </td>
                </tr>
                {groupedItems[cat].map(item => (
                  <tr key={item.id} onClick={() => handleRowClick(item)} className="tr cursor-pointer hover:bg-gray-100/80 group">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        {item.img ? (
                          <div className="w-10 h-10 shrink-0 rounded overflow-hidden border border-gray-200">
                            <img src={item.img} alt={item.nome} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 shrink-0 rounded bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gray-300">N/A</span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{item.nome}</p>
                          <p className="text-[11px] text-gray-400">{item.ref}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td text-gray-500 text-xs">{item.unidade}</td>
                    <td className={`td font-bold ${item.status === 'CRÍTICO' ? 'text-red-600' : item.status === 'ATENÇÃO' ? 'text-orange-600' : 'text-gray-900'}`}>
                      {item.atual}
                    </td>
                    <td className="td text-gray-500">{item.minimo}</td>
                    <td className="td"><span className={`badge ${STATUS_BADGE[item.status]}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            ))}
            {filteredItems.length === 0 && (
              <tbody>
                <tr><td colSpan={5} className="td text-center text-gray-400 py-6">Nenhum item encontrado.</td></tr>
              </tbody>
            )}
          </table>
          </div>
        </div>

        {/* Movement Log */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <RefreshCw size={14} className="text-gray-400" /> Log de Movimentação
            </p>
            <button className="text-navy-900 text-xs font-semibold hover:underline" onClick={() => setShowAll(v => !v)}>
              {showAll ? 'VER MENOS' : 'VER TODOS'}
            </button>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {visibleMovements.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {m.tipo === 'entrada' ? <ArrowUpCircle size={16} className="text-green-500" />
                     : m.tipo === 'saida' ? <ArrowDownCircle size={16} className="text-red-500" />
                     : <RefreshCw size={16} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-tight">{m.desc}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{m.sub}</p>
                    <p className="text-[10px] text-gray-300 mt-1 font-medium">{m.time}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2">
            <Lightbulb size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-blue-800 font-semibold">DICA PRO</p>
              <p className="text-xs text-blue-600 mt-0.5">Configure alertas automáticos por e-mail quando insumos atingirem o estoque mínimo.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Entry modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)}>
            <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">Entrada de Insumo</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Registre a chegada de materiais ao almoxarifado.</p>
                </div>
                <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Material *</label>
                  <select className="input" value={form.materialId} onChange={e => setForm(f => ({ ...f, materialId: e.target.value }))}>
                    {items.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantidade *</label>
                    <input className="input" type="number" placeholder="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nota Fiscal</label>
                    <input className="input" placeholder="NF 0000" value={form.nf} onChange={e => setForm(f => ({ ...f, nf: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fornecedor</label>
                  <input className="input" placeholder="Nome do fornecedor" value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Observações</label>
                  <textarea className="input h-16 resize-none" placeholder="Informações adicionais..." value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button onClick={handleRegistrarEntrada} className="btn-primary flex-1 justify-center">Registrar Entrada</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {modalNovo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <PackagePlus size={18} className="text-navy-900" /> Cadastrar Novo Insumo
                </h3>
                <button onClick={() => setModalNovo(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Insumo <span className="text-red-500">*</span></label>
                    <input type="text" className="input" placeholder="Ex: Caixa de Papelão 85x85" value={formNovo.nome} onChange={e => setFormNovo(p => ({ ...p, nome: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
                      <select className="input" value={formNovo.categoria} onChange={e => setFormNovo(p => ({ ...p, categoria: e.target.value }))}>
                        <option>Embalagem</option>
                        <option>Moldura</option>
                        <option>Vidro/Acrílico</option>
                        <option>Papel</option>
                        <option>Cola/Fita</option>
                        <option>Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Unidade</label>
                      <select className="input" value={formNovo.unidade} onChange={e => setFormNovo(p => ({ ...p, unidade: e.target.value }))}>
                        <option value="un">Unidade (un)</option>
                        <option value="m">Metros (m)</option>
                        <option value="m²">Metro Quadrado (m²)</option>
                        <option value="kg">Quilos (kg)</option>
                        <option value="rolo">Rolo</option>
                        <option value="cx">Caixa (cx)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Estoque Mínimo (Alerta)</label>
                    <input type="number" className="input" min="0" placeholder="0" value={formNovo.minimo} onChange={e => setFormNovo(p => ({ ...p, minimo: e.target.value }))} />
                    <p className="text-[10px] text-gray-400 mt-1">O sistema alertará automaticamente se ficar abaixo desse valor.</p>
                  </div>
                </div>
              </div>
              <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button className="btn-secondary" onClick={() => setModalNovo(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleCreate}>Salvar Novo Insumo</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {modalEdit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <Edit2 size={18} className="text-navy-900" />
                  <div>
                    <h3 className="font-bold text-gray-900">Editar Insumo</h3>
                    <p className="text-xs text-gray-500">{modalEdit.name}</p>
                  </div>
                </div>
                <button onClick={() => setModalEdit(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Insumo <span className="text-red-500">*</span></label>
                    <input type="text" className="input" value={formEdit.nome} onChange={e => setFormEdit(p => ({ ...p, nome: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
                      <select className="input" value={formEdit.categoria} onChange={e => setFormEdit(p => ({ ...p, categoria: e.target.value }))}>
                        <option>Embalagem</option>
                        <option>Moldura</option>
                        <option>Vidro/Acrílico</option>
                        <option>Papel</option>
                        <option>Cola/Fita</option>
                        <option>Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Unidade</label>
                      <select className="input" value={formEdit.unidade} onChange={e => setFormEdit(p => ({ ...p, unidade: e.target.value }))}>
                        <option value="un">Unidade (un)</option>
                        <option value="m">Metros (m)</option>
                        <option value="m²">Metro Quadrado (m²)</option>
                        <option value="kg">Quilos (kg)</option>
                        <option value="rolo">Rolo</option>
                        <option value="cx">Caixa (cx)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-4 mt-2 border border-gray-100 bg-gray-50 rounded-xl">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Estoque Atual</label>
                      <input type="number" className="input bg-white font-bold" min="0" value={formEdit.atual} onChange={e => setFormEdit(p => ({ ...p, atual: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Estoque Mínimo</label>
                      <input type="number" className="input bg-white" min="0" value={formEdit.minimo} onChange={e => setFormEdit(p => ({ ...p, minimo: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button className="btn-secondary" onClick={() => setModalEdit(null)}>Cancelar</button>
                <button className="btn-primary" onClick={handleSaveEdit}>Salvar Alterações</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>

    {/* RELATÓRIO P/ IMPRESSÃO (Oculto na tela, extraído via popup) */}
    <div id="print-report" className="hidden">
      
      {/* Premium Document Header */}
      <div className="bg-[#1e3a8a] text-white p-8 rounded-t-2xl flex justify-between items-center shadow-md mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#1e3a8a]">
              <PackagePlus size={24} />
            </div>
            Casa Linda
          </h1>
          <h2 className="text-xl font-medium uppercase tracking-widest text-blue-100 mt-2 opacity-90">Relatório Completo de Inventário</h2>
        </div>
        <div className="text-right bg-white/10 p-4 rounded-xl border border-white/20 backdrop-blur-sm">
          <p className="text-sm font-semibold opacity-90 mb-1">DATA DE EMISSÃO</p>
          <p className="text-xl font-bold">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex justify-between items-center">
          <span className="text-gray-500 font-semibold uppercase text-xs tracking-wider">Total de Insumos</span>
          <span className="text-xl font-black text-[#1e3a8a]">{totalItems} itens</span>
        </div>
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex justify-between items-center">
          <span className="text-red-500 font-semibold uppercase text-xs tracking-wider">Estoque Crítico</span>
          <span className="text-xl font-black text-red-600">{criticos} itens em alerta</span>
        </div>
      </div>

      <div className="space-y-10">
        {Object.keys(groupedItems).sort().map(cat => (
          <div key={cat}>
            <div className="bg-gradient-to-r from-gray-100 to-white px-5 py-3 mb-4 rounded-lg flex justify-between items-center border-l-4 border-[#1e3a8a] break-after-avoid shadow-sm">
              <h3 className="text-lg font-black text-[#1e3a8a] uppercase flex items-center gap-2">
                <span className="text-xl">📦</span> {cat}
              </h3>
              <span className="text-xs font-bold bg-white px-3 py-1 rounded-full text-gray-500 border border-gray-200 shadow-sm">{groupedItems[cat].length} INS.</span>
            </div>
            
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                    <th className="py-3 px-4 text-center font-bold text-xs uppercase tracking-wider w-16">Foto</th>
                    <th className="py-3 px-4 text-left font-bold text-xs uppercase tracking-wider w-24">Cód</th>
                    <th className="py-3 px-4 text-left font-bold text-xs uppercase tracking-wider">Produto/Insumo</th>
                    <th className="py-3 px-4 text-center font-bold text-xs uppercase tracking-wider w-16">UN</th>
                    <th className="py-3 px-4 text-right font-bold text-xs uppercase tracking-wider w-24">Mínimo</th>
                    <th className="py-3 px-4 text-right font-bold text-xs uppercase tracking-wider w-28 bg-blue-50/30">Atual</th>
                    <th className="py-3 px-4 text-center font-bold text-xs uppercase tracking-wider w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupedItems[cat].map(item => (
                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.status === 'CRÍTICO' ? 'bg-red-50/20' : ''}`}>
                      <td className="py-2 px-4 align-middle text-center">
                        {item.img ? (
                          <img src={item.img} className="w-9 h-9 object-cover rounded shadow-sm border border-gray-200 mx-auto" />
                        ) : (
                          <div className="w-9 h-9 bg-gray-100 rounded border border-gray-200 mx-auto flex items-center justify-center text-gray-400 text-[10px]">sem img</div>
                        )}
                      </td>
                      <td className="py-2 px-4 align-middle text-gray-400 text-xs font-mono font-medium">{item.ref}</td>
                      <td className="py-2 px-4 align-middle font-bold text-gray-800">{item.nome}</td>
                      <td className="py-2 px-4 align-middle text-center text-gray-500 font-medium">{item.unidade}</td>
                      <td className="py-2 px-4 align-middle text-right text-gray-400">{item.minimo}</td>
                      <td className={`py-2 px-4 align-middle text-right font-black text-base bg-blue-50/10 ${item.status === 'CRÍTICO' ? 'text-red-600' : 'text-[#1e3a8a]'}`}>
                        {item.atual}
                      </td>
                      <td className="py-2 px-4 align-middle text-center text-[10px] uppercase font-black tracking-wider">
                        {item.status === 'CRÍTICO' 
                          ? <span className="text-red-700 bg-red-100 border border-red-200 px-2 py-1 rounded w-full inline-block">CRÍTICO</span> 
                          : item.status === 'ATENÇÃO' 
                            ? <span className="text-orange-700 bg-orange-100 border border-orange-200 px-2 py-1 rounded w-full inline-block">ATENÇÃO</span> 
                            : <span className="text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded w-full inline-block">NORMAL</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center text-xs text-gray-400 border-t border-gray-200 pt-6 font-medium">
        Casa Linda Decorações - Relatório Gerado pelo ERP Integrado ({new Date().toLocaleString('pt-BR')}) - Impressão Oficial.
      </div>
    </div>
    </>
  )
}
