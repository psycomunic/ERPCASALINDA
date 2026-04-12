/**
 * api/health.ts
 * GET /api/health — retorna status das integrações configuradas no servidor.
 * Não expõe os valores reais das credenciais, apenas se estão presentes.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const magazordOk = !!(process.env.MAGAZORD_USER && process.env.MAGAZORD_PASS)
  const supabaseOk = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(200).json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    services: {
      magazord: {
        configured: magazordOk,
        baseUrl:    process.env.MAGAZORD_BASE_URL ?? null,
      },
      supabase: {
        configured: supabaseOk,
        url: process.env.VITE_SUPABASE_URL
          ? process.env.VITE_SUPABASE_URL.replace('https://', '').split('.')[0] + '.supabase.co'
          : null,
      },
    },
  })
}
