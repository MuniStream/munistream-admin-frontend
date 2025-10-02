import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const baseAllowedHosts = ['localhost', '127.0.0.1', '.munistream.com', '.paw.mx']

const allowedHosts = Array.from(
  new Set(
    [
      ...baseAllowedHosts,
      ...((process.env.VITE_ALLOWED_HOSTS ?? '')
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean)),
    ],
  ),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['mermaid'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
