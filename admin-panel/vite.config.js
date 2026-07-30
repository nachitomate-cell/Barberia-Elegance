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
        // Sin esto los caches de deploys anteriores quedan vivos y el SW puede
        // servir un index.html viejo que apunta a un chunk cuyo hash ya no
        // existe → la vista no monta. Es la causa del "a veces no cargan los
        // módulos": no es lentitud, es cache envenenado tras cada deploy.
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5000000,
        importScripts: ['/gestion-interna/firebase-messaging-sw.js'],
        // Los PNG salen del precache: eran la mayor parte de los 9,7 MB que el
        // SW bajaba en la primera visita. Se sirven desde la red, y los íconos
        // de la PWA siguen cubiertos por includeAssets.
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
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
    // El bundle era UN archivo de 3,6 MB. Separar las dependencias que casi
    // nunca cambian permite que el navegador las reuse entre deploys, en vez
    // de rebajarlas cada vez que tocamos una vista.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@firebase') || id.includes('/firebase/')) return 'firebase';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@dnd-kit')) return 'dnd';
          if (id.includes('recharts') || id.includes('/d3-')) return 'charts';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('xlsx')) return 'xlsx';
          return 'vendor';
        },
      },
    },
  },
});
