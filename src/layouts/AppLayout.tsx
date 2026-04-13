import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Factory, DollarSign, Package,
  Building2, Users, Settings, LogOut, Plus,
  Search, Bell, ChevronDown, Menu, X, Check, FileText, Grid
} from 'lucide-react'
import { LayoutProvider, useLayout } from '../contexts/LayoutContext'
import { fetchPedidos } from '../services/pedidos'

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/production', label: 'Produção (PCP)',   icon: Factory },
  { to: '/financial',  label: 'Financeiro',       icon: DollarSign },
  { to: '/inventory',  label: 'Almoxarifado',     icon: Package },
  { to: '/patrimonio', label: 'Patrimônio',       icon: Building2 },
  { to: '/partners',   label: 'Parceiros',        icon: Users },
  { to: '/reports',    label: 'Relatórios',       icon: FileText },
  { to: '/catalogo',   label: 'Catálogo',          icon: Grid },
]

const SECTION_LABELS: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/production': 'Produção PCP',
  '/financial':  'Financeiro',
  '/inventory':  'Almoxarifado',
  '/patrimonio': 'Patrimônio',
  '/partners':   'Parceiros',
  '/settings':   'Configurações',
  '/reports':    'Relatórios',
  '/catalogo':   'Catálogo de Produtos',
}



const ALL_ROUTES = [...NAV, { to: '/settings', label: 'Configurações', icon: Settings }]

function Sidebar({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-44">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-navy-900 rounded-lg flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight">Casa Linda</p>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest leading-tight">Decorações</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Top CTA */}
      <div className="px-3 py-3">
        <button
          onClick={() => {
            const current = window.location.pathname
            if (current.includes('/financial')) navigate('/financial/payable')
            else navigate('/production')
            onClose?.()
          }}
          className="w-full btn-primary justify-center text-xs py-2"
        >
          <Plus size={14} /> Novo Registro
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ${isActive ? 'nav-active' : 'nav-idle'}`
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 px-2 py-3 space-y-0.5">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors mt-2 ${isActive ? 'nav-active' : 'nav-idle'}`
          }
        >
          <Settings size={15} /> Configurações
        </NavLink>
        <button
          onClick={() => {
            if (window.confirm('Tem certeza que deseja sair do sistema?')) {
              window.location.href = '/'
            }
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium nav-idle w-full text-left hover:text-red-600"
        >
          <LogOut size={15} /> Sair
        </button>
      </div>
    </div>
  )
}

function Topbar() {
  const location   = useLocation()
  const navigate   = useNavigate()
  const { tabs, activeTab, setActiveTab } = useLayout()
  const section    = SECTION_LABELS[location.pathname] ?? ''

  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs]         = useState<any[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchQ, setSearchQ]       = useState('')
  const [showUser, setShowUser]     = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchPedidos().then(pedidos => {
      const atrasados = pedidos.filter(p => p.status === 'Atrasado')
      const dynamicNotifs = atrasados.map((p, i) => ({
        id: i + 1,
        title: 'Pedido Atrasado',
        desc: `Pedido ${p.magazord_id ? '#' + p.magazord_id : ''} – ${p.cliente || 'Cliente'} está atrasado.`,
        time: 'Agora',
        read: false
      }))
      setNotifs(dynamicNotifs)
    })
  }, [])

  const unread = notifs.filter(n => !n.read).length

  const searchResults = searchQ.trim()
    ? ALL_ROUTES.filter(r => r.label.toLowerCase().includes(searchQ.toLowerCase()))
    : []

  useEffect(() => {
    if (showSearch) searchRef.current?.focus()
  }, [showSearch])

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })))

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0 relative z-20">
      {/* Page + Tabs */}
      <div className="flex items-center gap-0 flex-1 h-full">
        <span className="text-sm text-gray-400 mr-4 font-medium shrink-0">{section}</span>
        <div className="flex items-center h-full">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-full px-4 text-sm font-medium border-b-2 transition-colors duration-150 ${
                activeTab === tab
                  ? 'border-navy-900 text-navy-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <AnimatePresence>
            {showSearch ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-full">
                  <Search size={12} className="text-gray-400 shrink-0" />
                  <input
                    ref={searchRef}
                    className="bg-transparent outline-none flex-1 text-gray-700 placeholder-gray-400"
                    placeholder="Buscar..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    onBlur={() => { setTimeout(() => { setShowSearch(false); setSearchQ('') }, 200) }}
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[180px] overflow-hidden z-30">
                    {searchResults.map(r => (
                      <button key={r.to} onMouseDown={() => { navigate(r.to); setShowSearch(false); setSearchQ('') }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        <r.icon size={14} className="text-gray-400" /> {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-400 w-40 hover:border-gray-300 transition-colors"
              >
                <Search size={12} /> Pesquisar...
              </button>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="relative text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotifs && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowNotifs(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 w-80 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">Notificações</p>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs text-navy-900 hover:underline font-medium flex items-center gap-1">
                        <Check size={11} /> Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-50">
                    {notifs.map(n => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}
                        onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                      >
                        <div className="flex items-start gap-2.5">
                          {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                          <div className={!n.read ? '' : 'ml-4'}>
                            <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
                            <p className="text-[11px] text-gray-400 mt-1">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {unread === 0 && (
                    <div className="px-4 py-3 text-center text-xs text-gray-400">Nenhuma notificação nova.</div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Settings shortcut */}
        <button
          onClick={() => navigate('/settings')}
          className="text-gray-400 hover:text-gray-700 transition-colors"
          title="Configurações"
        >
          <Settings size={18} />
        </button>

        {/* User menu */}
        <div className="relative">
          <div
            className="flex items-center gap-2 cursor-pointer select-none hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
            onClick={() => setShowUser(v => !v)}
          >
            <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center text-white font-bold text-xs shrink-0">A</div>
            <div className="hidden md:block leading-tight">
              <p className="text-xs font-semibold text-gray-800">Admin</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Gestor de Fábrica</p>
            </div>
            <ChevronDown size={12} className="text-gray-400 hidden md:block" />
          </div>
          <AnimatePresence>
            {showUser && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowUser(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 w-48 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">Admin</p>
                    <p className="text-xs text-gray-400">admin@casalinda.com.br</p>
                  </div>
                  <button onClick={() => { navigate('/settings'); setShowUser(false) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings size={14} /> Configurações
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Tem certeza que deseja sair?')) window.location.href = '/' }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100">
                    <LogOut size={14} /> Sair
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <LayoutProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Mobile overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile sidebar */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
              initial={{ x: -200 }} animate={{ x: 0 }} exit={{ x: -200 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Sidebar onClose={() => setMobileOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop sidebar */}
        <div className="hidden lg:block shrink-0">
          <Sidebar />
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile menu button */}
          <div className="lg:hidden absolute top-3 left-3 z-30">
            <button onClick={() => setMobileOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <Menu size={20} />
            </button>
          </div>

          <Topbar />

          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </LayoutProvider>
  )
}
