/**
 * api/magazord/[...path].ts
 *
 * Vercel Serverless Function — proxy seguro para a API Magazord.
 * As credenciais ficam 100% server-side (variáveis de ambiente da Vercel,
 * sem prefixo VITE_, nunca expostas ao browser).
 *
 * Variáveis necessárias no painel da Vercel:
 *   MAGAZORD_BASE_URL  https://casalinda.magazord.com.br
 *   MAGAZORD_USER      usuario-api-da-magazord
 *   MAGAZORD_PASS      senha-api-da-magazord
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── Preflight CORS ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin',  '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.status(204).send('')
    return
  }

  // ── Credentials (server-side only ou fixados para MVP) ──────────────────────
  const user    = process.env.MAGAZORD_USER    || 'psycomunic@gmail.com'
  const pass    = process.env.MAGAZORD_PASS    || 'Aa82058405*'
  const baseUrl = (process.env.MAGAZORD_BASE_URL || 'https://casalinda.magazord.com.br').replace(/\/$/, '')

  if (!user || !pass) {
    res.status(503).json({
      error: 'Magazord credentials not configured. Set MAGAZORD_USER and MAGAZORD_PASS in Vercel environment variables.',
    })
    return
  }

  // ── Build target URL ────────────────────────────────────────────────────────
  // req.query.path is the [...path] catch-all: e.g. ["v2", "pedido"]
  const segments = req.query['path']
  const apiPath  = Array.isArray(segments)
    ? segments.join('/')
    : (segments ?? '')

  // Forward all query params except the internal 'path' param
  const { path: _path, ...restQuery } = req.query
  const qs = new URLSearchParams(
    Object.entries(restQuery).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map(val => [k, val]) : [[k, String(v)]]
    )
  ).toString()

  const targetUrl = `${baseUrl}/api/${apiPath}${qs ? '?' + qs : ''}`

  // ── Forward request ─────────────────────────────────────────────────────────
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
    console.error('[magazord-proxy] upstream fetch failed:', err)
    res.status(502).json({ error: 'Magazord API unreachable.', detail: String(err) })
  }
}
