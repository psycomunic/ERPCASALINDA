import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import Production from './pages/Production'
import Financial from './pages/Financial'
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
          <Route path="financial"  element={<Financial />} />
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
