import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
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
  plugins: [
    react(),
    // Installable (desktop and the mobile app). The service worker precaches
    // the app shell only: staff work on live data, so API responses are not
    // kept offline. The manifest is generated per tenant at container start.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        // Shell only. Precaching every chunk (56 files, Mermaid/BPMN) at install
        // exceeds the platform nginx rate limit for frontends (10 r/s, burst 20):
        // the install fails with 503s and no worker is registered. The lazy
        // chunks are cached the first time they are used (runtime rule below).
        globPatterns: ['index.html', 'assets/index-*.{js,css}', 'assets/*.woff2'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: { cacheName: 'assets', expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 } },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/themes\//, /^\/health/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
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
