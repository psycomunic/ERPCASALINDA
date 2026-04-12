import { createContext, useContext, useState, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface LayoutCtx {
  activeTab: string
  setActiveTab: (t: string) => void
  tabs: string[]
}

const Ctx = createContext<LayoutCtx>({ activeTab: 'Visão Geral', setActiveTab: () => {}, tabs: [] })

const PAGE_TABS: Record<string, string[]> = {
  '/dashboard':  ['Visão Geral', 'Relatórios', 'Analytics'],
  '/production': ['Visão Geral', 'Relatórios'],
  '/financial':  ['Visão Geral', 'Relatórios'],
  '/inventory':  ['Visão Geral', 'Relatórios'],
  '/patrimonio': ['Visão Geral', 'Relatórios'],
  '/partners':   ['Visão Geral', 'Relatórios'],
  '/settings':   ['Perfil', 'Notificações', 'Aparência', 'Empresa', 'Segurança'],
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const tabs = PAGE_TABS[location.pathname] ?? ['Visão Geral']

  // Track the last pathname so we can reset activeTab synchronously
  // when the route changes — no useEffect needed, no double-render flash.
  const prevPath = useRef(location.pathname)
  const [activeTab, setActiveTab] = useState(tabs[0])

  // If the route changed, reset the tab immediately (same render cycle)
  if (prevPath.current !== location.pathname) {
    prevPath.current = location.pathname
    const first = tabs[0]
    // Only update if it changed to avoid infinite render
    if (activeTab !== first) {
      setActiveTab(first)
    }
  }

  return <Ctx.Provider value={{ activeTab, setActiveTab, tabs }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLayout = () => useContext(Ctx)
