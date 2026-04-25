import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { type ReactNode } from 'react'
import { AuthProvider, useAuth, type Module } from './contexts/AuthContext'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import Production from './pages/Production'
import FinancialLayout from './pages/financial/FinancialLayout'
import DashboardFinanceiro from './pages/financial/DashboardFinanceiro'
import Payable from './pages/financial/Payable'
import PayableFixed from './pages/financial/PayableFixed'
import Receivable from './pages/financial/Receivable'
import Dre from './pages/financial/Dre'
import CashFlow from './pages/financial/CashFlow'
import Conciliation from './pages/financial/Conciliation'
import ComingSoon from './pages/financial/ComingSoon'
import Inventory from './pages/Inventory'
import Patrimonio from './pages/Patrimonio'
import Partners from './pages/Partners'
import Settings from './pages/Settings'
import Reports from './pages/Reports'
import Catalogo from './pages/Catalogo'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import AccessDenied from './pages/AccessDenied'
import UsersPage from './pages/admin/UsersPage'
// ── Lar e Vida ────────────────────────────────────────────────────────────────
import DashboardLV from './pages/lar-e-vida/DashboardLV'
import ProductionLV from './pages/lar-e-vida/ProductionLV'
import InventoryLV from './pages/lar-e-vida/InventoryLV'

// ─── Guards ───────────────────────────────────────────────────────────────────

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function PermGuard({ module, children }: { module: Module; children: ReactNode }) {
  const { can, loading } = useAuth()
  if (loading) return null
  if (!can(module)) return <AccessDenied />
  return <>{children}</>
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route path="/" element={<AuthGuard><AppLayout /></AuthGuard>}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            <Route path="dashboard"  element={<PermGuard module="dashboard"><Dashboard /></PermGuard>} />
            <Route path="production" element={<PermGuard module="production"><Production /></PermGuard>} />

            <Route path="financial" element={<PermGuard module="financial"><FinancialLayout /></PermGuard>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"   element={<DashboardFinanceiro />} />
              <Route path="payable"     element={<Payable />} />
              <Route path="payable-fixed" element={<PayableFixed />} />
              <Route path="receivable"  element={<Receivable />} />
              <Route path="dre"         element={<Dre />} />
              <Route path="cashflow"    element={<CashFlow />} />
              <Route path="conciliation" element={<Conciliation />} />
              <Route path="boletos">
                <Route path="manage"  element={<ComingSoon title="Gerenciar Boletos" />} />
                <Route path="export"  element={<ComingSoon title="Exportar Remessa" />} />
                <Route path="import"  element={<ComingSoon title="Importar Retorno" />} />
              </Route>
              <Route path="aux">
                <Route path="caixas"         element={<ComingSoon title="Caixas" />} />
                <Route path="bank-accounts"  element={<ComingSoon title="Contas Bancárias" />} />
                <Route path="payment-methods" element={<ComingSoon title="Formas de Pagamento" />} />
                <Route path="chart-of-accounts" element={<ComingSoon title="Plano de Contas" />} />
                <Route path="status"         element={<ComingSoon title="Situações" />} />
                <Route path="cost-centers"   element={<ComingSoon title="Centros de Custos" />} />
                <Route path="transfers"      element={<ComingSoon title="Transferências" />} />
                <Route path="custom-fields"  element={<ComingSoon title="Campos Extras" />} />
                <Route path="email-templates" element={<ComingSoon title="Modelos de E-mails" />} />
                <Route path="apportionment"  element={<ComingSoon title="Tabelas de Rateios" />} />
                <Route path="settings"       element={<ComingSoon title="Configurações Financeiras" />} />
              </Route>
            </Route>

            <Route path="inventory"  element={<PermGuard module="inventory"><Inventory /></PermGuard>} />
            <Route path="patrimonio" element={<PermGuard module="patrimonio"><Patrimonio /></PermGuard>} />
            <Route path="partners"   element={<PermGuard module="partners"><Partners /></PermGuard>} />
            <Route path="reports"    element={<PermGuard module="reports"><Reports /></PermGuard>} />
            <Route path="catalogo"   element={<PermGuard module="catalogo"><Catalogo /></PermGuard>} />
            <Route path="settings"   element={<PermGuard module="settings"><Settings /></PermGuard>} />

            {/* Admin */}
            <Route path="admin">
              <Route path="users" element={<PermGuard module="users"><UsersPage /></PermGuard>} />
            </Route>

            {/* ── Lar e Vida ──────────────────────────────────────────────── */}
            <Route path="lar-e-vida">
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"  element={<PermGuard module="dashboard"><DashboardLV /></PermGuard>} />
              <Route path="production" element={<PermGuard module="production"><ProductionLV /></PermGuard>} />
              <Route path="inventory"  element={<PermGuard module="inventory"><InventoryLV /></PermGuard>} />
              <Route path="financial"  element={<PermGuard module="financial"><ComingSoon title="Financeiro — Lar e Vida" /></PermGuard>} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
