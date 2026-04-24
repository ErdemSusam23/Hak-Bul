import { env } from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8000'
const backendRoutes = [
  '/ask',
  '/auth',
  '/chat',
  '/documents',
  '/feedback',
  '/templates',
  '/admin',
  '/forum',
  '/search',
  '/health',
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(
      backendRoutes.map((route) => [
        route,
        {
          target: proxyTarget,
          changeOrigin: true,
        },
      ]),
    ),
  },
})
