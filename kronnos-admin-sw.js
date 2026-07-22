'use strict';

// Service worker MÍNIMO del lobby admin.kronnos.synaptechspa.cl — existe para
// que el sitio sea instalable como PWA (Chrome exige un handler de fetch).
// Estrategia: red primero SIEMPRE (el lobby es liviano y el login necesita
// red); la caché es solo respaldo de navegación sin conexión.
// Scope '/' de ESTE origen. Convive con el SW de /gestion-interna/ (Vite PWA):
// allá gana su scope más específico una vez que el panel se visita.

const CACHE = 'kronnos-admin-v1';

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('kronnos-admin-') && k !== CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Solo navegaciones: HTML del lobby. Assets e íconos los maneja el navegador.
  if (req.mode !== 'navigate') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match('/kronnos-admin'))),
  );
});
