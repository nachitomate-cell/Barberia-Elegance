import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      scope: '/gestion-interna/',
      base: '/gestion-interna/',
      includeAssets: ['pwa-192.png', 'pwa-512.png'],
      // El manifest NO lo genera el build: lo sirve el Edge middleware por
      // tenant en /gestion-interna/manifest.webmanifest (nombre + íconos del
      // local). Con manifest:false el SW tampoco lo precachea — antes el
      // precache servía el manifest genérico (logo SynapTech) pisando al
      // dinámico. El <link rel="manifest"> vive manual en index.html.
      manifest: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        importScripts: ['/gestion-interna/firebase-messaging-sw.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/gestion-interna/index.html',
        navigateFallbackAllowlist: [/^\/gestion-interna/],
        runtimeCaching: [
          /* Video/audio — NUNCA cachear. Las peticiones de rango del <video>
             devuelven 206 (Partial Content) y rompen Cache.put() con
             "NetworkError: Cache.put() encountered a network error".
             Debe ir ANTES de la regla de Firebase Storage (donde vive el
             video del Fondo de Pantalla TV). Se sirven directo de la red. */
          {
            urlPattern: ({ request }) => request.destination === 'video' || request.destination === 'audio',
            handler: 'NetworkOnly',
          },
          /* Firestore streaming endpoints — NUNCA cachear.
             `Listen/channel` y `Write/channel` son long-polling bidireccional
             (onSnapshot, transaction commits) que devuelven respuestas
             streaming. Cache.put() truena con
             "NetworkError: Cache.put() encountered a network error" y rompe
             TODOS los onSnapshot del panel (incluyendo instagram_app,
             instagram_${tenantId} y el estado de conexión). Debe ir ANTES
             de la regla genérica de firestore. */
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*\/(Listen|Write)\/channel/i,
            handler: 'NetworkOnly',
          },
          /* Firebase Firestore / Auth — network-first */
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'googleapis-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          /* Google Fonts — stale-while-revalidate */
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          /* Firebase Storage images — cache-first */
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          /* Phosphor Icons (unpkg CDN) — cache-first, versión fija */
          {
            urlPattern: /^https:\/\/unpkg\.com\/@phosphor-icons\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'phosphor-icons',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: '/gestion-interna/',
  server: { port: 5173 },
  build: {
    outDir: '../gestion-interna',
    emptyOutDir: true,
  },
});
