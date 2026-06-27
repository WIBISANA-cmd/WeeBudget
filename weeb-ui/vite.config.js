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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,
      manifestFilename: 'site.webmanifest',
      includeAssets: ['logo-pwa.png', 'pwa/icon.svg', 'pwa/icon-source.png', 'pwa/icon-192.png', 'pwa/icon-512.png', 'pwa/maskable-512.png', 'pwa/apple-touch-icon.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
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
