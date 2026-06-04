import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifestFilename: 'site.webmanifest',
      includeAssets: ['logo-pwa.png', 'pwa/icon.svg', 'pwa/icon-source.png', 'pwa/icon-192.png', 'pwa/icon-512.png', 'pwa/maskable-512.png', 'pwa/apple-touch-icon.png'],
      workbox: {
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/sanctum(?:\/|$)/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => (
              url.pathname.startsWith('/api') ||
              url.pathname.startsWith('/sanctum') ||
              /\/api(?:\/|$)/.test(url.pathname)
            ),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'weeb-api-network-only',
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'weeb-google-font-styles',
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'weeb-google-font-files',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'weeb-static-images',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'WeeBudget - Smart Personal Finance',
        short_name: 'WeeBudget',
        description: 'Dashboard finansial modern untuk mengelola rekening, transaksi, budget planner, tabungan, dana darurat, dan wishlist.',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        background_color: '#0B1120',
        theme_color: '#08A0FF',
        categories: ['finance', 'productivity'],
        lang: 'id',
        icons: [
          {
            src: '/logo-pwa.png',
            sizes: '1000x1000',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
