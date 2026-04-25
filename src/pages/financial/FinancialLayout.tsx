import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  TrendingDown, TrendingUp, BarChart3, LineChart, FileText,
  DownloadCloud, UploadCloud, ChevronDown, ChevronRight,
  Monitor, PiggyBank, Banknote, Network, List, Receipt,
  GitCompare, ArrowRightLeft, PlusSquare, Mail, Layers, Settings,
  Barcode, CreditCard, Menu, X
} from 'lucide-react'

const MENU = [
  { to: '/financial/payable', label: 'Contas a pagar', icon: TrendingDown },
  { to: '/financial/receivable', label: 'Contas a receber', icon: TrendingUp },
  { to: '/financial/cards', label: 'Gestão de Cartões', icon: CreditCard },
  { to: '/financial/dre', label: 'DRE gerencial', icon: Network },
  { to: '/financial/cashflow', label: 'Fluxo de caixa', icon: BarChart3 },
]

const BOLETOS = [
  { to: '/financial/boletos/manage', label: 'Gerenciar boletos', icon: Barcode },
  { to: '/financial/boletos/export', label: 'Exportar remessa', icon: UploadCloud },
  { to: '/financial/boletos/import', label: 'Importar retorno', icon: DownloadCloud },
]

const AUXILIARES = [
  { to: '/financial/aux/caixas', label: 'Caixas', icon: Monitor },
  { to: '/financial/aux/bank-accounts', label: 'Contas bancárias', icon: PiggyBank },
  { to: '/financial/aux/payment-methods', label: 'Formas de pagamento', icon: Banknote },
  { to: '/financial/aux/chart-of-accounts', label: 'Plano de contas', icon: Network },
  { to: '/financial/aux/status', label: 'Situações', icon: List },
  { to: '/financial/aux/cost-centers', label: 'Centros de custos', icon: Receipt },
  { to: '/financial/conciliation', label: 'Conciliação bancária', icon: GitCompare },
  { to: '/financial/aux/transfers', label: 'Transferências', icon: ArrowRightLeft },
  { to: '/financial/aux/custom-fields', label: 'Campos extras', icon: PlusSquare },
  { to: '/financial/aux/email-templates', label: 'Modelos de e-mails', icon: Mail },
  { to: '/financial/aux/apportionment', label: 'Tabelas de rateios', icon: Layers },
  { to: '/financial/aux/settings', label: 'Configurações', icon: Settings },
]

export default function FinancialLayout() {
  const [boletosOpen, setBoletosOpen] = useState(true)
  const [auxOpen, setAuxOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex bg-gray-50 h-[calc(100vh-48px)] overflow-hidden relative">
      {/* Overlay Mobile */}
      {mobileMenuOpen && (
         <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Secondary Sidebar */}
      <aside className={`absolute md:relative z-50 bg-white h-full border-r border-gray-200 flex flex-col w-64 md:w-56 shrink-0 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 py-5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            Financeiro
          </h2>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600 bg-gray-50 p-1 rounded-md">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 pb-6 space-y-0.5 overflow-y-auto">
          <NavLink onClick={() => setMobileMenuOpen(false)} to="/financial/dashboard" className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-gray-200 text-gray-900 font-bold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
            <LineChart size={15} /> Dashboard Geral
          </NavLink>

          <div className="pt-2 pb-1">
            <div className="h-px w-full bg-gray-200 mb-2" />
          </div>

          {MENU.map(m => (
            <NavLink onClick={() => setMobileMenuOpen(false)} key={m.to} to={m.to} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-gray-200 text-gray-900 font-bold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
              <m.icon size={15} /> {m.label}
            </NavLink>
          ))}

          {/* Collapsible: Boletos */}
          <div className="pt-3">
            <button onClick={() => setBoletosOpen(!boletosOpen)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="flex items-center gap-2.5"><Barcode size={15} /> Boletos bancários</span>
              {boletosOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            </button>
            {boletosOpen && (
              <div className="pl-6 mt-0.5 space-y-0.5">
                {BOLETOS.map(m => (
                  <NavLink onClick={() => setMobileMenuOpen(false)} key={m.to} to={m.to} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${isActive ? 'bg-gray-200 text-gray-900 font-bold' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
                    <m.icon size={13} /> {m.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Collapsible: Opções auxiliares */}
          <div className="pt-2">
            <button onClick={() => setAuxOpen(!auxOpen)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="flex items-center gap-2.5"><FileText size={15} /> Opções auxiliares</span>
              {auxOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            </button>
            {auxOpen && (
              <div className="pl-6 mt-0.5 space-y-0.5 pb-8">
                {AUXILIARES.map(m => (
                  <NavLink onClick={() => setMobileMenuOpen(false)} key={m.to} to={m.to} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${isActive ? 'bg-gray-200 text-gray-900 font-bold' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
                    <m.icon size={13} /> {m.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-white overflow-y-auto relative flex flex-col min-w-0">
        <div className="md:hidden flex items-center justify-between p-3 bg-white border-b border-gray-200 shrink-0 shadow-sm z-10">
          <button onClick={() => setMobileMenuOpen(true)} className="flex items-center gap-2 text-navy-700 font-bold bg-navy-50 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-navy-100">
            <Menu size={18} /> Acessar Menu Financeiro
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
