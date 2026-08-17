import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const ROLES = ['admin', 'gerente', 'producao', 'impressao', 'financeiro', 'almoxarifado']

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

  const { email, nome, role, password } = req.body
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Não autorizado. Token ausente.' })
  }
  if (!email || !nome || !role || !password) {
    return res.status(400).json({ error: 'Parâmetros email, nome, role e password são obrigatórios.' })
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: `Papel inválido. Use um destes: ${ROLES.join(', ')}.` })
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' })
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return res.status(503).json({ error: 'Chave Service Role do Supabase não configurada na Vercel.' })
  }

  const supabase = createClient(url, serviceRoleKey)
  const cleanEmail = String(email).trim().toLowerCase()
  const cleanNome = String(nome).trim()

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
      return res.status(403).json({ error: 'Acesso negado: apenas administradores podem cadastrar usuários.' })
    }

    // Criar a conta já confirmada — não depende de envio de e-mail
    let userId: string | null = null
    let created = true

    const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { nome: cleanNome, role },
    })

    if (createErr) {
      // Conta já existe: reaproveita, garante senha e confirmação (repara cadastros pela metade)
      const existing = await findUserByEmail(supabase, cleanEmail)
      if (!existing) {
        return res.status(400).json({ error: createErr.message })
      }
      const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { nome: cleanNome, role },
      })
      if (updateErr) {
        return res.status(400).json({ error: updateErr.message })
      }
      userId = existing.id
      created = false
    } else {
      userId = createdUser.user?.id ?? null
    }

    if (!userId) {
      return res.status(500).json({ error: 'Usuário criado mas sem ID retornado pelo Supabase.' })
    }

    // Criar/atualizar o perfil — sem ele o login entra mas nenhuma tela abre
    const { error: profileErr } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email: cleanEmail,
        nome: cleanNome,
        role,
        ativo: true,
        updated_at: new Date().toISOString(),
      })

    if (profileErr) {
      return res.status(500).json({
        error: `Conta criada, mas falhou ao gravar o perfil: ${profileErr.message}`,
        userId,
      })
    }

    return res.status(200).json({
      success: true,
      userId,
      created,
      message: created
        ? 'Usuário cadastrado com sucesso!'
        : 'Usuário já existia — senha e perfil foram atualizados.',
    })
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    return res.status(500).json({ error: 'Erro interno do servidor.', detail: error.message })
  }
}

/** Procura um usuário no Auth pelo e-mail (a API admin não expõe busca direta). */
async function findUserByEmail(supabase: any, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const found = data.users.find((u: any) => u.email?.toLowerCase() === email)
    if (found) return found
    if (data.users.length < 200) return null
  }
  return null
}
