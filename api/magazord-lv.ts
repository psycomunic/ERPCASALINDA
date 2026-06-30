/**
 * api/magazord-lv.ts
 *
 * Vercel Serverless Function — proxy seguro para a API Magazord da loja Lar e Vida.
 * As credenciais ficam 100% server-side (variáveis de ambiente da Vercel).
 *
 * Variáveis necessárias no painel da Vercel:
 *   MAGAZORD_LV_BASE_URL  https://larevida.painel.magazord.com.br  (ajustar URL)
 *   MAGAZORD_LV_USER      usuario-api-da-magazord
 *   MAGAZORD_LV_PASS      senha-api-da-magazord
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // ── Credenciais da Lar e Vida ────────────────────────────────────────────────
  // Usar env vars da Vercel se existirem; fallback fixado para credenciais da LV
  const user    = process.env.MAGAZORD_LV_USER    || 'MZDKfa05c6fac5df376e7a4c373bbcf5fccde76197984b68baf91344f5c380c9'
  const pass    = process.env.MAGAZORD_LV_PASS    || '@Up31Kizl%cP'
  const baseUrl = process.env.MAGAZORD_LV_BASE_URL || 'https://larevida.painel.magazord.com.br'

  if (!user || !pass) {
    res.status(503).json({ error: 'Credenciais Magazord LV não configuradas.' })
    return
  }


  // Extrair o path original via query `origPath`
  const apiPath = req.query['origPath'] || ''

  // Forward all query params except the internal 'origPath' param
  const { origPath: _p, ...restQuery } = req.query
  const qs = new URLSearchParams(
    Object.entries(restQuery).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map(val => [k, val]) : [[k, String(v)]]
    )
  ).toString()

  const targetUrl = `${baseUrl}/api/${apiPath}${qs ? '?' + qs : ''}`

  // ── Forward request ──────────────────────────────────────────────────────────
  const basicAuth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')

  try {
    const upstream = await fetch(targetUrl, {
      method:  req.method ?? 'GET',
      headers: {
        Authorization: basicAuth,
        Accept:        'application/json',
        'Content-Type': 'application/json',
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? { body: JSON.stringify(req.body) }
        : {}),
    })

    const contentType = upstream.headers.get('Content-Type') ?? 'application/json'
    const text = await upstream.text()

    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(upstream.status).send(text)
  } catch (err) {
    console.error('[magazord-lv-proxy] upstream fetch failed:', err)
    res.status(502).json({ error: 'Magazord Lar e Vida API unreachable.', detail: String(err) })
  }
}
