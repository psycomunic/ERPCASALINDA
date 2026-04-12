import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Build BasicAuth header from env vars (server-side only, never exposed to browser)
  const mUser = env.VITE_MAGAZORD_USER ?? ''
  const mPass = env.VITE_MAGAZORD_PASS ?? ''
  const basicAuth = mUser
    ? 'Basic ' + Buffer.from(`${mUser}:${mPass}`).toString('base64')
    : ''

  // Base URL of the Magazord store, e.g. https://casalinda.magazord.com.br
  const magazordOrigin = (env.VITE_MAGAZORD_BASE_URL ?? 'https://casalinda.magazord.com.br')
    .replace(/\/api\/?$/, '')   // strip trailing /api if present
    .replace(/\/$/, '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        // All requests to /magazord-api/** are forwarded to the real Magazord API
        '/magazord-api': {
          target: magazordOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/magazord-api/, '/api'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (basicAuth) {
                proxyReq.setHeader('Authorization', basicAuth)
              }
              proxyReq.setHeader('Accept', 'application/json')
              proxyReq.setHeader('Content-Type', 'application/json')
            })
          },
        },
      },
    },
  }
})
