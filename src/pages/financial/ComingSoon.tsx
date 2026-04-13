import { useState, useEffect } from 'react'
import { Plus, Settings2, Trash2, Edit2, Search } from 'lucide-react'

export default function AuxMenuEditor({ title, description }: { title: string, description?: string }) {
  const STORAGE_KEY = `erp_aux_${title.replace(/ /g, '_').toLowerCase()}`
  const [items, setItems] = useState<any[]>([])
  const [term, setTerm] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setItems(JSON.parse(saved))
    else setItems([{ id: 1, nome: `Pré-Definição ${title}` }])
  }, [STORAGE_KEY])

  const handleAdd = () => {
    const name = window.prompt(`Novo item para ${title}:`)
    if (!name) return
    const novo = [...items, { id: Date.now(), nome: name }]
    setItems(novo)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novo))
  }

  const handleDelete = (id: number) => {
    if (!window.confirm('Excluir este registro?')) return
    const novo = items.filter(x => x.id !== id)
    setItems(novo)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novo))
  }

  const filtered = items.filter(i => i.nome.toLowerCase().includes(term.toLowerCase()))

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="border-b border-gray-100 px-6 py-5 flex items-center justify-between shrink-0 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-medium tracking-wider">
            {description || 'Gestão de Cadastros Auxiliares'}
          </p>
        </div>
        <button onClick={handleAdd} className="btn-primary"><Plus size={14} /> Novo Registro</button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto w-full max-w-4xl mx-auto space-y-4">
        
        <div className="card h-full flex flex-col">
          <div className="p-4 border-b border-gray-100 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                placeholder={`Buscar em ${title}...`}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:bg-white focus:outline-none"
                value={term} onChange={e => setTerm(e.target.value)}
              />
            </div>
            <button className="btn-secondary text-xs"><Settings2 size={14} /> View</button>
          </div>

          <table className="w-full text-left text-sm flex-1">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <tr>
                <th className="py-3 px-4 w-20">ID</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4 text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(i => (
                <tr key={i.id} className="hover:bg-gray-50 group">
                  <td className="py-3 px-4 text-xs font-bold text-gray-400">{i.id.toString().slice(-4)}</td>
                  <td className="py-3 px-4 font-bold text-gray-800">{i.nome}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Edit2 size={14}/></button>
                      <button onClick={() => handleDelete(i.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                   <td colSpan={3} className="text-center py-10 text-gray-400 text-sm">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
