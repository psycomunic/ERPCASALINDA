import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // ── Casa Linda ─────────────────────────────────────────────────────────────
  const mUser = env.VITE_MAGAZORD_USER ?? ''
  const mPass = env.VITE_MAGAZORD_PASS ?? ''
  const basicAuth = mUser
    ? 'Basic ' + Buffer.from(`${mUser}:${mPass}`).toString('base64')
    : ''
  const magazordOrigin = (env.VITE_MAGAZORD_BASE_URL ?? 'https://casalinda.painel.magazord.com.br')
    .replace(/\/api\/?$/, '').replace(/\/$/, '')

  // ── Lar e Vida ──────────────────────────────────────────────────────────────
  const lvUser = env.VITE_MAGAZORD_LV_USER ?? mUser  // fallback às creds da CL
  const lvPass = env.VITE_MAGAZORD_LV_PASS ?? mPass
  const basicAuthLV = lvUser
    ? 'Basic ' + Buffer.from(`${lvUser}:${lvPass}`).toString('base64')
    : ''
  const magazordLVOrigin = (env.VITE_MAGAZORD_LV_BASE_URL ?? 'https://larevida.painel.magazord.com.br')
    .replace(/\/api\/?$/, '').replace(/\/$/, '')

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png'],
        // ── Garante que o Service Worker preserve a URL no reload ──
        // navigateFallback faz o SW responder com index.html para qualquer
        // rota de navegação, deixando o React Router interpretar a URL correta.
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/api\//,           // nunca intercepta chamadas de API
            /^\/magazord-api\//,
            /^\/magazord-lv-api\//,
          ],
        },
        manifest: {
          name: 'ERP Casa Linda',
          short_name: 'Casa Linda',
          description: 'ERP Production Dashboard',
          theme_color: '#d97706',
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        // ── Casa Linda ────────────────────────────────────────────────────────
        '/magazord-api': {
          target: magazordOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/magazord-api/, '/api'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (basicAuth) proxyReq.setHeader('Authorization', basicAuth)
              proxyReq.setHeader('Accept', 'application/json')
              proxyReq.setHeader('Content-Type', 'application/json')
            })
            proxy.on('proxyRes', (proxyRes) => {
              delete proxyRes.headers['www-authenticate']
            })
          },
        },
        // ── Lar e Vida ────────────────────────────────────────────────────────
        '/magazord-lv-api': {
          target: magazordLVOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/magazord-lv-api/, '/api'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (basicAuthLV) proxyReq.setHeader('Authorization', basicAuthLV)
              proxyReq.setHeader('Accept', 'application/json')
              proxyReq.setHeader('Content-Type', 'application/json')
            })
            // Removido o bloqueio do www-authenticate para permitir teste manual
          },
        },
      },
    },
  }
})
