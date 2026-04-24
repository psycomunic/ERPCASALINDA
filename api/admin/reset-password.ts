import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { userId, newPassword } = req.body
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Não autorizado. Token ausente.' })
  }
  if (!userId || !newPassword) {
    return res.status(400).json({ error: 'Parâmetros userId e newPassword são obrigatórios.' })
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return res.status(503).json({ error: 'Chave Service Role do Supabase não configurada na Vercel.' })
  }

  const supabase = createClient(url, serviceRoleKey)

  try {
    // Verificar se o token de quem está chamando é válido
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: verifyErr } = await supabase.auth.getUser(token)
    
    if (verifyErr || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' })
    }

    // Verificar se o usuário autenticado é admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado: apenas administradores podem redefinir senhas.' })
    }

    // Usar a API admin para redefinir a senha do usuário alvo
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, { 
      password: newPassword 
    })

    if (updateErr) {
      return res.status(400).json({ error: updateErr.message })
    }

    return res.status(200).json({ success: true, message: 'Senha redefinida com sucesso!' })
  } catch (error: any) {
    console.error('Erro ao redefinir senha:', error)
    return res.status(500).json({ error: 'Erro interno do servidor.', detail: error.message })
  }
}
