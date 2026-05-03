import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.png'],
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
            src: '/icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon.png',
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
      }
    })
  ],
})
