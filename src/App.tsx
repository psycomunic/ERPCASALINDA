import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import Production from './pages/Production'
import FinancialLayout from './pages/financial/FinancialLayout'
import DashboardFinanceiro from './pages/financial/DashboardFinanceiro'
import Payable from './pages/financial/Payable'
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="production" element={<Production />} />
          <Route path="financial" element={<FinancialLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardFinanceiro />} />
            <Route path="payable" element={<Payable />} />
            <Route path="receivable" element={<Receivable />} />
            <Route path="dre" element={<Dre />} />
            <Route path="cashflow" element={<CashFlow />} />
            <Route path="conciliation" element={<Conciliation />} />
            <Route path="boletos">
              <Route path="manage" element={<ComingSoon title="Gerenciar Boletos" />} />
              <Route path="export" element={<ComingSoon title="Exportar Remessa" />} />
              <Route path="import" element={<ComingSoon title="Importar Retorno" />} />
            </Route>
            <Route path="aux">
              <Route path="caixas" element={<ComingSoon title="Caixas" />} />
              <Route path="bank-accounts" element={<ComingSoon title="Contas Bancárias" />} />
              <Route path="payment-methods" element={<ComingSoon title="Formas de Pagamento" />} />
              <Route path="chart-of-accounts" element={<ComingSoon title="Plano de Contas" />} />
              <Route path="status" element={<ComingSoon title="Situações" />} />
              <Route path="cost-centers" element={<ComingSoon title="Centros de Custos" />} />
              <Route path="transfers" element={<ComingSoon title="Transferências" />} />
              <Route path="custom-fields" element={<ComingSoon title="Campos Extras" />} />
              <Route path="email-templates" element={<ComingSoon title="Modelos de E-mails" />} />
              <Route path="apportionment" element={<ComingSoon title="Tabelas de Rateios" />} />
              <Route path="settings" element={<ComingSoon title="Configurações Financeiras" />} />
            </Route>
          </Route>
          <Route path="inventory"  element={<Inventory />} />
          <Route path="patrimonio" element={<Patrimonio />} />
          <Route path="partners"   element={<Partners />} />
          <Route path="settings"   element={<Settings />} />
          <Route path="reports"   element={<Reports />} />
          <Route path="catalogo"  element={<Catalogo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
