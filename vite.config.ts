import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5175,
    strictPort: true
  },
  build: {
    sourcemap: false
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['dmk-icon.png'],
      manifest: {
        name: 'DMK Platform Admin',
        short_name: 'DMK Admin',
        description: 'Administration sécurisée pour la plateforme DMK',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/dmk-icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/dmk-icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      disable: process.cwd().includes("'"),
      workbox: {
        // Sécurité: Ne pas mettre en cache les requêtes API
        navigateFallbackDenylist: [/^\/api/],
        // Nettoyer les anciens caches pour éviter les fuites de données
        cleanupOutdatedCaches: true,
        inlineWorkboxRuntime: true,
        maximumFileSizeToCacheInBytes: 5242880,
      }
    })
  ],
})
