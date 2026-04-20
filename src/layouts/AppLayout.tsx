import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Factory, DollarSign, Package,
  Building2, Users, Settings, LogOut, Plus,
  Search, Bell, ChevronDown, Menu, X, Check, FileText, Grid,
  Sofa, ChevronRight, ChevronLeft
} from 'lucide-react'
import { LayoutProvider, useLayout } from '../contexts/LayoutContext'
import { fetchPedidos } from '../services/pedidos'

// ── Casa Linda Navigation ────────────────────────────────────────────────────
const NAV_CL = [
  { to: '/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/production', label: 'Produção (PCP)',   icon: Factory },
  { to: '/financial',  label: 'Financeiro',       icon: DollarSign },
  { to: '/inventory',  label: 'Almoxarifado',     icon: Package },
  { to: '/patrimonio', label: 'Patrimônio',       icon: Building2 },
  { to: '/partners',   label: 'Parceiros',        icon: Users },
  { to: '/reports',    label: 'Relatórios',       icon: FileText },
  { to: '/catalogo',   label: 'Catálogo',          icon: Grid },
]

// ── Lar e Vida Navigation ─────────────────────────────────────────────────────
const NAV_LV = [
  { to: '/lar-e-vida/dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/lar-e-vida/production', label: 'Produção (PCP)', icon: Factory },
  { to: '/lar-e-vida/financial',  label: 'Financeiro',    icon: DollarSign },
  { to: '/lar-e-vida/inventory',  label: 'Almoxarifado',  icon: Package },
  { to: '/partners',              label: 'Parceiros',     icon: Users },
  { to: '/reports',               label: 'Relatórios',    icon: FileText },
]

// Legacy alias used by ALL_ROUTES search (always shows all routes)
const NAV = NAV_CL

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
  '/lar-e-vida/dashboard':  'Lar e Vida — Dashboard',
  '/lar-e-vida/production': 'Lar e Vida — Produção PCP',
  '/lar-e-vida/financial':  'Lar e Vida — Financeiro',
  '/lar-e-vida/inventory':  'Lar e Vida — Almoxarifado',
}


const ALL_ROUTES = [...NAV_CL, ...NAV_LV, { to: '/settings', label: 'Configurações', icon: Settings }]

type StoreId = 'casa-linda' | 'lar-e-vida'

function Sidebar({ onClose, isCollapsed, onToggle }: { onClose?: () => void, isCollapsed?: boolean, onToggle?: () => void }) {
  const navigate   = useNavigate()
  const location   = useLocation()
  const [showStorePicker, setShowStorePicker] = useState(false)

  // Detect active store from URL
  const isLV = location.pathname.startsWith('/lar-e-vida')
  const activeStore: StoreId = isLV ? 'lar-e-vida' : 'casa-linda'
  const activeNav = isLV ? NAV_LV : NAV_CL

  const handleSwitchStore = (store: StoreId) => {
    setShowStorePicker(false)
    if (store === 'lar-e-vida') navigate('/lar-e-vida/dashboard')
    else navigate('/dashboard')
    onClose?.()
  }

  return (
    <div className={`relative flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-44'}`}>
      {/* Collapse Toggle */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-5 bg-white border border-gray-200 rounded-full p-1 text-gray-400 hover:text-gray-700 hover:shadow-md z-50 hidden lg:block transition-transform duration-300"
          title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* Store Selector */}
      <div
        className={`relative flex items-center gap-2 px-3 py-3 border-b border-gray-100 cursor-pointer select-none hover:bg-gray-50 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
        onClick={() => setShowStorePicker(v => !v)}
        title={isCollapsed ? (isLV ? 'Lar e Vida' : 'Casa Linda') : undefined}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={isLV
            ? { background: 'linear-gradient(135deg, #b45309, #d97706)' }
            : { background: '#0f172a' }
          }
        >
          {isLV
            ? <Sofa size={15} className="text-white" />
            : <Building2 size={15} className="text-white" />}
        </div>
        {!isCollapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 text-xs leading-tight">{isLV ? 'Lar e Vida' : 'Casa Linda'}</p>
              <p className="text-gray-400 text-[9px] uppercase tracking-widest leading-tight">Decorações</p>
            </div>
            <ChevronDown size={12} className="text-gray-400 shrink-0" />
          </>
        )}
        {onClose && (
          <button onClick={e => { e.stopPropagation(); onClose() }} className="ml-auto text-gray-400 hover:text-gray-700 lg:hidden">
            <X size={18} />
          </button>
        )}

        {/* Store picker dropdown */}
        <AnimatePresence>
          {showStorePicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setShowStorePicker(false) }} />
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-52 overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <p className="px-3 py-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Trocar de Loja</p>
                {[
                  { id: 'casa-linda' as StoreId, label: 'Casa Linda', sub: 'Quadros & Canvas', icon: Building2, color: '#0f172a' },
                  { id: 'lar-e-vida' as StoreId, label: 'Lar e Vida',  sub: 'Tapetes & Decoração', icon: Sofa, color: '#b45309' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSwitchStore(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                      activeStore === s.id ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.color }}>
                      <s.icon size={13} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-tight">{s.label}</p>
                      <p className="text-[9px] text-gray-400">{s.sub}</p>
                    </div>
                    {activeStore === s.id && <Check size={12} style={{ color: s.color }} className="shrink-0" />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Active store badge */}
      {isLV && !isCollapsed && (
        <div className="mx-3 mt-2 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-center" style={{ background: '#fef3c7', color: '#b45309' }}>
          Lar e Vida Ativo
        </div>
      )}

      {/* Top CTA */}
      <div className="px-3 pt-2 pb-1">
        <button
          onClick={() => {
            const current = window.location.pathname
            if (current.includes('/lar-e-vida')) navigate('/lar-e-vida/production')
            else if (current.includes('/financial')) navigate('/financial/payable')
            else navigate('/production')
            onClose?.()
          }}
          className={`w-full flex items-center justify-center gap-1.5 rounded-xl font-semibold text-white transition-colors overflow-hidden ${isCollapsed ? 'py-3' : 'py-2 text-xs'}`}
          style={{ background: isLV ? 'linear-gradient(135deg, #b45309, #d97706)' : '#0f172a' }}
          title={isCollapsed ? "Novo Registro" : undefined}
        >
          <Plus size={isCollapsed ? 16 : 14} className="shrink-0" />
          {!isCollapsed && <span>Novo Registro</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto mt-1 overflow-x-hidden">
        {activeNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            title={isCollapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg text-xs font-medium transition-colors duration-150 relative group ${
                isCollapsed ? 'justify-center py-3' : 'px-3 py-2'
              } ${isActive ? (isLV ? 'bg-amber-50 text-amber-800 font-semibold' : 'nav-active') : 'nav-idle'}`
            }
          >
            <Icon size={isCollapsed ? 18 : 15} className="shrink-0" />
            {!isCollapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 px-2 py-3 space-y-0.5 overflow-x-hidden">
        <NavLink
          to="/settings"
          onClick={onClose}
          title={isCollapsed ? "Configurações" : undefined}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg text-xs font-medium transition-colors ${
              isCollapsed ? 'justify-center py-3' : 'px-3 py-2'
            } ${isActive ? 'nav-active' : 'nav-idle'}`
          }
        >
          <Settings size={isCollapsed ? 18 : 15} className="shrink-0" /> 
          {!isCollapsed && <span className="truncate">Configurações</span>}
        </NavLink>
        <button
          onClick={() => {
            if (window.confirm('Tem certeza que deseja sair do sistema?')) {
              window.location.href = '/'
            }
          }}
          title={isCollapsed ? "Sair" : undefined}
          className={`flex items-center gap-2.5 rounded-lg text-xs font-medium nav-idle w-full text-left hover:text-red-600 ${
            isCollapsed ? 'justify-center py-3' : 'px-3 py-2'
          }`}
        >
          <LogOut size={isCollapsed ? 18 : 15} className="shrink-0" /> 
          {!isCollapsed && <span className="truncate">Sair</span>}
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
  
  // Use mobileOpen state for collapsing on desktop as well to share the boolean
  // On mobile it means "is menu open". On desktop we will use it as "is menu collapsed".
  // Actually, let's keep them separate to prevent bugs when resizing
  const [isCollapsed, setIsCollapsed] = useState(false)
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
              <Sidebar onClose={() => setMobileOpen(false)} isCollapsed={false} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop sidebar */}
        <div className="hidden lg:block shrink-0 relative z-30 transition-all duration-300" style={{ width: isCollapsed ? '4rem' : '11rem' }}>
          <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
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
