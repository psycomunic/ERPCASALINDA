/**
 * api/magazord.ts — proxy seguro para a API Magazord da Casa Linda.
 *
 * Credenciais SOMENTE nas variáveis de ambiente da Vercel (nunca no código):
 *   MAGAZORD_USER      token da API (usuário WebService da Magazord)
 *   MAGAZORD_PASS      senha da API
 *   MAGAZORD_BASE_URL  (opcional) padrão https://casalinda.painel.magazord.com.br
 *
 * Exige usuário logado e ativo no ERP e só libera as operações que o ERP usa.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

// URL e chave "anon" do Supabase são públicas por natureza (já vão no front-end).
const SUPABASE_URL = 'https://tyjdetvuzqpjzhdmdzxo.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5amRldHZ1enFwanpoZG1kenhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjIxMTgsImV4cCI6MjA5MTU5ODExOH0.96OUu75ky42zh5jKV9bi5mThcVw3p4PSCoDmm6WCTTg'

// Operações permitidas na API Magazord (caminho sem a barra inicial, ex.: "v2/site/pedido")
const ALLOWED: Array<{ method: string; path: RegExp }> = [
  { method: 'GET', path: /^v2\/site\/pedido$/ },
  { method: 'GET', path: /^v2\/site\/pedido\/[\w.-]+$/ },
  { method: 'GET', path: /^v2\/site\/produto$/ },
  { method: 'GET', path: /^v2\/pedido$/ },                          // teste de conexão
  { method: 'PUT', path: /^v2\/(site\/)?pedido\/[\w.-]+\/situacao$/ }, // mover situação do pedido
]

// Campos aceitos no corpo da troca de situação
const SITUACAO_FIELDS = ['situacao', 'codigoRastreio', 'transportadora']

type ProxyConfig = {
  label: string
  user?: string
  pass?: string
  baseUrl: string
}

async function requireActiveUser(req: VercelRequest): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Faça login no ERP para acessar a Magazord.' }
  }
  const token = auth.slice('Bearer '.length).trim()

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  })
  if (!userRes.ok) return { ok: false, status: 401, error: 'Sessão inválida ou expirada.' }
  const user = (await userRes.json()) as { id?: string }
  if (!user?.id) return { ok: false, status: 401, error: 'Sessão inválida.' }

  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${encodeURIComponent(user.id)}&select=ativo`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
  )
  const rows = profRes.ok ? ((await profRes.json()) as Array<{ ativo: boolean | null }>) : []
  if (!rows[0] || rows[0].ativo === false) {
    return { ok: false, status: 403, error: 'Usuário sem acesso ao ERP.' }
  }
  return { ok: true }
}

async function handleMagazordProxy(req: VercelRequest, res: VercelResponse, cfg: ProxyConfig) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  // 1. Usuário logado e ativo
  const check = await requireActiveUser(req).catch(() => ({ ok: false as const, status: 401, error: 'Falha ao validar sessão.' }))
  if (!check.ok) {
    res.status(check.status).json({ error: check.error })
    return
  }

  // 2. Credenciais configuradas na Vercel
  if (!cfg.user || !cfg.pass) {
    res.status(503).json({ error: `Credenciais Magazord (${cfg.label}) não configuradas na Vercel.` })
    return
  }

  // 3. Operação permitida
  const rawPath = req.query['origPath']
  const apiPath = (Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath ?? '')).replace(/^\/+/, '')
  const method = (req.method ?? 'GET').toUpperCase()
  if (apiPath.includes('..') || !ALLOWED.some(r => r.method === method && r.path.test(apiPath))) {
    res.status(403).json({ error: 'Operação não permitida pelo ERP.' })
    return
  }

  const { origPath: _ignored, ...restQuery } = req.query
  const qs = new URLSearchParams(
    Object.entries(restQuery).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map(val => [k, val]) : [[k, String(v)]],
    ),
  ).toString()
  const targetUrl = `${cfg.baseUrl}/api/${apiPath}${qs ? '?' + qs : ''}`

  let body: string | undefined
  if (method === 'PUT') {
    const src = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}) as Record<string, unknown>
    body = JSON.stringify(Object.fromEntries(Object.entries(src).filter(([k]) => SITUACAO_FIELDS.includes(k))))
  }

  const basicAuth = 'Basic ' + Buffer.from(`${cfg.user}:${cfg.pass}`).toString('base64')

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers: {
        Authorization: basicAuth,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      ...(body !== undefined ? { body } : {}),
    })
    const contentType = upstream.headers.get('Content-Type') ?? 'application/json'
    const text = await upstream.text()
    res.setHeader('Content-Type', contentType)
    res.status(upstream.status).send(text)
  } catch (err) {
    console.error(`[magazord-proxy ${cfg.label}] upstream fetch failed:`, err)
    res.status(502).json({ error: `Magazord (${cfg.label}) indisponível.` })
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleMagazordProxy(req, res, {
    label: 'Casa Linda',
    user: process.env.MAGAZORD_USER,
    pass: process.env.MAGAZORD_PASS,
    baseUrl: process.env.MAGAZORD_BASE_URL || 'https://casalinda.painel.magazord.com.br',
  })
}
