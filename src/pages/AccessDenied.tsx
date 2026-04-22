/**
 * AccessDenied.tsx — Tela de permissão negada
 */
import { useNavigate } from 'react-router-dom'
import { ShieldX, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function AccessDenied() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const goBack = () => {
    if (can('dashboard'))  { navigate('/dashboard');  return }
    if (can('production')) { navigate('/production'); return }
    if (can('financial'))  { navigate('/financial');  return }
    if (can('inventory'))  { navigate('/inventory');  return }
    navigate(-1)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <ShieldX size={28} className="text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        Você não tem permissão para acessar esta área. Entre em contato com o administrador caso precise de acesso.
      </p>
      <button onClick={goBack} className="flex items-center gap-2 text-sm font-semibold text-navy-900 hover:underline">
        <ArrowLeft size={14} /> Voltar ao início
      </button>
    </div>
  )
}
