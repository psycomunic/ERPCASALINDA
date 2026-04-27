import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Plus, Search, Wrench, MapPin, X, MoreVertical, Check, Trash2, Edit2, Printer, Map } from 'lucide-react'
import { fetchPatrimonio, createAtivo, updateAtivo, deleteAtivo, fetchManutencoes, createManutencao, ManutencaoRow } from '../services/patrimonio'

interface Asset {
  id: string
  tag: string
  nome: string
  categoria: string
  localizacao: string
  valor: number
  dataAquisicao: string
  status: 'ATIVO' | 'MANUTENÇÃO' | 'INATIVO'
}

const STATUS_BADGE: Record<string, string> = { ATIVO: 'badge-ativo', MANUTENÇÃO: 'badge-manutencao', INATIVO: 'badge-inativo' }
const MAINT_BADGE: Record<string, string>  = { CONCLUÍDO: 'badge-concluido', PENDENTE: 'badge-pendente' }

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

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

function ContextMenu({ onClose, onDelete, onToggleStatus }: { onClose: () => void; onDelete: () => void; onToggleStatus: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="absolute right-8 top-0 bg-white border border-gray-200 rounded-xl shadow-xl z-30 min-w-[180px] overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <button onClick={() => { onToggleStatus(); onClose() }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
        <Edit2 size={14} className="text-blue-600" /> Alterar Status
      </button>
      <button onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100">
        <Trash2 size={14} /> Remover Ativo
      </button>
    </motion.div>
  )
}

export default function Patrimonio() {
  const [assets, setAssets]             = useState<Asset[]>([])
  const [manutencoes, setManutencoes]   = useState<ManutencaoRow[]>([])
  const [search, setSearch]             = useState('')
  const [modal, setModal]               = useState(false)
  const [maintModal, setMaintModal]     = useState(false)
  const [openMenu, setOpenMenu]         = useState<string | null>(null)
  const [toast, setToast]               = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)

  const [form, setForm]                 = useState({ nome: '', categoria: 'Maquinário', localizacao: 'Produção A', valor: '', data: '', serie: '' })
  const [maintForm, setMaintForm]       = useState({ ativo: '', tipo: 'Preventiva', empresa: '', obs: '' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const loadData = async () => {
    setLoading(true)
    const [dbAssets, dbMaint] = await Promise.all([fetchPatrimonio(), fetchManutencoes()])
    
    setAssets(dbAssets.map(a => ({
      id: a.id,
      tag: a.numero_serie || `PAT-${a.id.substring(0, 4).toUpperCase()}`,
      nome: a.nome,
      categoria: a.categoria || 'Sem categoria',
      localizacao: a.localizacao || 'Não definida',
      valor: Number(a.valor_aquisicao) || 0,
      dataAquisicao: a.data_aquisicao ? new Date(a.data_aquisicao).toLocaleDateString('pt-BR') : '-',
      status: String(a.status).toUpperCase() as any
    })))
    
    setManutencoes(dbMaint)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const totalValor   = assets.reduce((s, a) => s + a.valor, 0)
  const emManutencao = assets.filter(a => a.status === 'MANUTENÇÃO').length
  const ativos       = assets.filter(a => a.status === 'ATIVO').length

  const filtered = assets.filter(a =>
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    a.tag.toLowerCase().includes(search.toLowerCase()) ||
    a.categoria.toLowerCase().includes(search.toLowerCase())
  )

  const groupedItems = assets.reduce((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = []
    acc[item.categoria].push(item)
    return acc
  }, {} as Record<string, typeof assets>)

  const handleSaveAsset = async () => {
    if (!form.nome) return
    
    // Convert form values carefully
    let dataValue = form.data || new Date().toISOString().split('T')[0]
    
    // In PostgreSQL, empty strings to numeric can fail sometimes if not handled, but we parsed to float
    // Number types in JS: if form.serie is empty string '', make it null so it doesn't break UUID or text uniquely?
    // In DB, `numero_serie` is `text`, so empty string is valid.
    
    const { data: inserted, error } = await createAtivo({
      nome: form.nome,
      categoria: form.categoria,
      localizacao: form.localizacao,
      valor_aquisicao: parseFloat(form.valor) || 0,
      data_aquisicao: dataValue,
      numero_serie: form.serie || null, // pass null instead of empty string just in case
      status: 'ativo'
    })
    
    if (inserted && !error) {
      setModal(false)
      loadData()
      setForm({ nome: '', categoria: 'Maquinário', localizacao: 'Produção A', valor: '', data: '', serie: '' })
      showToast('Ativo cadastrado com sucesso no banco de dados!')
    } else {
      showToast(`Erro ao cadastrar: ${error || 'Desconhecido'}`)
    }
  }

  const handleSaveMaint = async () => {
    if (!maintForm.ativo) return showToast('Selecione um ativo')
    
    const assetId = assets.find(a => a.nome === maintForm.ativo)?.id
    if (!assetId) return
    
    const timeNow = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    const success = await createManutencao({
      ativo: maintForm.ativo,
      tipo: maintForm.tipo,
      empresa: maintForm.empresa,
      obs: maintForm.obs,
      status: 'PENDENTE',
      time: timeNow
    })
    
    if (success) {
      await updateAtivo(assetId, { status: 'manutenção' })
      setMaintModal(false)
      loadData()
      setMaintForm({ ativo: assets[0]?.nome || '', tipo: 'Preventiva', empresa: '', obs: '' })
      showToast('Manutenção registrada e sincronizada!')
    }
  }

  const doDeleteAsset = async (id: string) => {
    const success = await deleteAtivo(id)
    if (success) {
      showToast('Ativo removido do sistema.')
      loadData()
    }
  }

  const toggleStatus = async (id: string) => {
    const asset = assets.find(a => a.id === id)
    if (!asset) return
    
    const nextStatus = asset.status === 'ATIVO' ? 'inativo' : asset.status === 'INATIVO' ? 'ativo' : 'ativo'
    const success = await updateAtivo(id, { status: nextStatus })
    
    if (success) {
      showToast('Status atualizado!')
      loadData()
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
          <title>Relatório Patrimonial - Casa Linda</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { background: white !important; color: black; font-family: sans-serif; }
            table { page-break-inside: auto; }
            tr    { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          </style>
          <script>
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

  if (loading) return <div className="p-10 text-center text-gray-500">Carregando patrimônio do banco de dados...</div>

  return (
    <>
    <div className="p-6 space-y-5 print:hidden" onClick={() => setOpenMenu(null)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patrimônio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de ativos fixos, equipamentos, mobiliário e veículos da Casa Linda Decorações.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={handlePrint}><Printer size={14} /> Imprimir PDF</button>
          <button onClick={() => setModal(true)} className="btn-primary"><Plus size={14} /> Novo Ativo</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">$</span>
            </div>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">Atualizado</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">R$ {(totalValor / 1000).toFixed(1)}k</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Valor Total do Patrimônio</p>
        </div>
        <div className="stat">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <Wrench size={16} className="text-orange-500" />
            </div>
            {emManutencao > 0 && <span className="badge badge-atencao text-[11px]">{emManutencao} URGENTES</span>}
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{String(emManutencao).padStart(2, '0')}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Itens em Manutenção</p>
        </div>
        <div className="stat">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <MapPin size={15} className="text-green-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">{ativos} ITENS ATIVOS</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{Math.round((ativos / Math.max(assets.length, 1)) * 100) || 0}%</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Disponibilidade</p>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <Search size={14} className="text-gray-400" />
              <input
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
                placeholder="Buscar por tag, nome ou categoria..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="btn-secondary text-xs py-2" onClick={() => setSearch('')}>
              {search ? <><X size={12} /> Limpar</> : <><span>⚙</span> Filtros</>}
            </button>
          </div>
          <div className="card overflow-x-auto w-full">
            <table className="w-full min-w-[600px] text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="th">Ativo / Tag</th>
                  <th className="th">Categoria</th>
                  <th className="th">Localização</th>
                  <th className="th">Valor / Aquisição</th>
                  <th className="th">Status</th>
                  <th className="th w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="tr">
                    <td className="td">
                      <p className="font-medium text-gray-800">{a.nome}</p>
                      <p className="text-[11px] text-gray-400">{a.tag}</p>
                    </td>
                    <td className="td text-gray-600 text-xs">{a.categoria}</td>
                    <td className="td">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={11} className="text-gray-400" />{a.localizacao}
                      </span>
                    </td>
                    <td className="td">
                      <p className="font-semibold text-gray-800 text-xs">{fmt(a.valor)}</p>
                      <p className="text-[11px] text-gray-400">{a.dataAquisicao}</p>
                    </td>
                    <td className="td"><span className={'badge ' + (STATUS_BADGE[a.status] || 'badge-ativo')}>{a.status}</span></td>
                    <td className="td relative">
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === a.id ? null : a.id) }}
                        className="text-gray-300 hover:text-gray-600"
                      >
                        <MoreVertical size={14} />
                      </button>
                      <AnimatePresence>
                        {openMenu === a.id && (
                          <ContextMenu
                            onClose={() => setOpenMenu(null)}
                            onDelete={() => doDeleteAsset(a.id)}
                            onToggleStatus={() => toggleStatus(a.id)}
                          />
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="td text-center text-gray-400 py-6">Nenhum ativo encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance log */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Wrench size={14} className="text-gray-400" /> Manutenções
            </p>
          </div>
          <div className="space-y-4">
            {manutencoes.map((m) => (
              <div key={m.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-800 text-sm">{m.ativo}</p>
                  <span className={'badge ' + MAINT_BADGE[m.status] + ' text-[10px]'}>{m.status}</span>
                </div>
                <p className="text-xs text-gray-500">{m.tipo}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[11px] text-gray-400">{m.time}</p>
                  {m.empresa && <p className="text-[10px] text-gray-400 bg-gray-50 px-1.5 rounded border border-gray-100">{m.empresa}</p>}
                </div>
              </div>
            ))}
            {manutencoes.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sem histórico de manutenções.</p>}
          </div>
          <button
            onClick={() => setMaintModal(true)}
            className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-navy-900/30 hover:text-navy-900 transition-colors"
          >
            <Plus size={13} /> Registrar Manutenção
          </button>
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)}>
            <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">Cadastrar Novo Ativo</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Preencha as informações do bem patrimonial.</p>
                </div>
                <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome do Ativo *</label>
                  <input className="input" placeholder="Ex: Impressora HP Latex 800" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                    <select className="input" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                      {['Maquinário', 'TI', 'Veículos', 'Móveis', 'Estrutura'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Localização</label>
                    <select className="input" value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))}>
                      {['Produção A', 'Produção B', 'Escritório', 'Almoxarifado', 'Externo'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Valor de Aquisição (R$)</label>
                    <input className="input" type="number" placeholder="0.00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Data de Aquisição</label>
                    <input className="input" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Número de Série / NF</label>
                  <input className="input" placeholder="Ex: HP-SN-2024-001" value={form.serie} onChange={e => setForm(f => ({ ...f, serie: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button onClick={handleSaveAsset} className="btn-primary flex-1 justify-center">Salvar no Banco</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {maintModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMaintModal(false)}>
            <motion.div className="modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900">Registrar Manutenção</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Registre uma ocorrência no histórico do ativo.</p>
                </div>
                <button onClick={() => setMaintModal(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ativo em Manutenção *</label>
                  <select className="input" value={maintForm.ativo} onChange={e => setMaintForm(f => ({ ...f, ativo: e.target.value }))}>
                    <option value="">Selecione o ativo...</option>
                    {assets.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo de Manutenção</label>
                  <select className="input" value={maintForm.tipo} onChange={e => setMaintForm(f => ({ ...f, tipo: e.target.value }))}>
                    {['Preventiva', 'Corretiva', 'Limpeza', 'Calibração', 'Inspeção', 'Reparo Geral'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Empresa / Prestador do Serviço</label>
                  <input className="input" placeholder="Ex: Tech Serviços Ltda" value={maintForm.empresa} onChange={e => setMaintForm(f => ({ ...f, empresa: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Observações e Detalhes do Defeito</label>
                  <textarea className="input h-16 resize-none" placeholder="Peças trocadas, valores previstos..." value={maintForm.obs} onChange={e => setMaintForm(f => ({ ...f, obs: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMaintModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  <button onClick={handleSaveMaint} className="btn-primary flex-1 justify-center">Registrar Manutenção</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>

    {/* Relatório Impressão Premium */}
    <div id="print-report" className="hidden">
      <div className="bg-[#1e293b] text-white p-8 border-b-[12px] border-orange-500 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#1e293b]">
              <Map size={22} />
            </span>
            Casa Linda
          </h1>
          <h2 className="text-xl font-medium uppercase tracking-widest text-slate-300 mt-2 opacity-90">Relatório Consolidado de Patrimônio</h2>
        </div>
        <div className="text-right bg-white/10 p-4 rounded-xl border border-white/20">
          <p className="text-sm font-semibold opacity-90 mb-1">DATA DO INVENTÁRIO FÍSICO</p>
          <p className="text-xl font-bold">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 p-8">
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-sm">
          <p className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-1">Valor Total Imobilizado</p>
          <p className="text-3xl font-black text-[#1e293b]">R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-sm">
          <p className="text-slate-500 font-bold uppercase text-xs tracking-wider mb-1">Total de Ativos Registrados</p>
          <p className="text-3xl font-black text-[#1e293b]">{assets.length} <span className="text-lg text-slate-400 font-medium">Bens</span></p>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-5 rounded-xl shadow-sm">
          <p className="text-orange-600 font-bold uppercase text-xs tracking-wider mb-1">Máquinas Paradas (Manutenção)</p>
          <p className="text-3xl font-black text-orange-700">{emManutencao} <span className="text-lg text-orange-400 font-medium">Ativos</span></p>
        </div>
      </div>

      <div className="px-8 space-y-12">
        {Object.keys(groupedItems).sort().map(cat => (
          <div key={cat}>
            <div className="bg-slate-800 text-white px-5 py-3 rounded-lg flex justify-between items-center shadow-md break-after-avoid mb-4">
              <h3 className="text-lg font-black uppercase flex items-center gap-2">📍 Categoria: {cat}</h3>
              <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">{groupedItems[cat].length} ATIVOS FIXOS</span>
            </div>
            
            <table className="w-full text-sm border-collapse border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-300">
                  <th className="py-3 px-4 text-left font-black text-[11px] uppercase tracking-wider w-28">Nº Série / Tag</th>
                  <th className="py-3 px-4 text-left font-black text-[11px] uppercase tracking-wider">Descrição do Equipamento</th>
                  <th className="py-3 px-4 text-center font-black text-[11px] uppercase tracking-wider">Localização Física</th>
                  <th className="py-3 px-4 text-center font-black text-[11px] uppercase tracking-wider">Data Compra</th>
                  <th className="py-3 px-4 text-right font-black text-[11px] uppercase tracking-wider w-32">Valor Aquisição</th>
                  <th className="py-3 px-4 text-center font-black text-[11px] uppercase tracking-wider w-28">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {groupedItems[cat].map(a => (
                  <tr key={a.id} className={a.status === 'MANUTENÇÃO' ? 'bg-orange-50/50' : a.status === 'INATIVO' ? 'bg-red-50/50 opacity-70' : ''}>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">{a.tag}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 text-[13px]">{a.nome}</td>
                    <td className="py-3 px-4 text-center text-slate-600 font-medium text-[13px]">{a.localizacao}</td>
                    <td className="py-3 px-4 text-center text-slate-500 text-xs">{a.dataAquisicao}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700 text-[13px]">{fmt(a.valor)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-block border w-full
                        ${a.status === 'ATIVO' ? 'bg-green-100 text-green-700 border-green-200' :
                        a.status === 'MANUTENÇÃO' ? 'bg-orange-100 text-orange-700 border-orange-300' : 
                        'bg-red-100 text-red-700 border-red-200'}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {manutencoes.length > 0 && (
          <div className="mt-12 break-inside-avoid">
            <h3 className="text-xl font-black text-slate-800 mb-4 border-b-2 border-orange-500 pb-2 uppercase tracking-wide">
              🛠️ Chamados e Histórico de Manutenção Recente
            </h3>
            <table className="w-full text-sm border-collapse border border-slate-200 rounded-lg shadow-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-300">
                  <th className="py-2 px-3 text-left font-black text-[10px] uppercase">Data/Hora</th>
                  <th className="py-2 px-3 text-left font-black text-[10px] uppercase">Equipamento</th>
                  <th className="py-2 px-3 text-left font-black text-[10px] uppercase">Serviço/Tipo</th>
                  <th className="py-2 px-3 text-left font-black text-[10px] uppercase">Prestador</th>
                  <th className="py-2 px-3 text-left font-black text-[10px] uppercase">Parecer/OBS</th>
                  <th className="py-2 px-3 text-center font-black text-[10px] uppercase">Situação OS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {manutencoes.map(m => (
                  <tr key={m.id} className={m.status === 'PENDENTE' ? 'bg-yellow-50/50' : 'bg-slate-50'}>
                    <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">{m.time}</td>
                    <td className="py-2 px-3 text-xs font-bold text-slate-800">{m.ativo}</td>
                    <td className="py-2 px-3 text-xs text-slate-600 font-medium">{m.tipo}</td>
                    <td className="py-2 px-3 text-xs text-slate-500">{m.empresa || '-'}</td>
                    <td className="py-2 px-3 text-xs text-slate-500 italic max-w-xs truncate">{m.obs}</td>
                    <td className="py-2 px-3 text-center">
                       <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase
                          ${m.status === 'CONCLUÍDO' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                          {m.status}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="mt-16 text-center text-xs text-slate-400 border-t border-slate-200 pt-6 font-medium px-8 pb-10">
        Resumo consolidado Oficial extraído por Sistema ERP Casa Linda © — {new Date().toLocaleString('pt-BR')} — Impresso
      </div>
    </div>
    </>
  )
}
