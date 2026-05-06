// ════════════════════════════════════════════════════════════════
//  sw.js — Service Worker de 𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐛𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩
//  Cubre: cache offline + Firebase Cloud Messaging (push)
// ════════════════════════════════════════════════════════════════

// ── 1. IMPORTAR FIREBASE PARA MENSAJERÍA EN BACKGROUND ──────────
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── 2. CONFIGURACIÓN FIREBASE (igual que firebase-config.js) ─────
firebase.initializeApp({
  apiKey:            "AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q",
  authDomain:        "barberia-elegance.firebaseapp.com",
  projectId:         "barberia-elegance",
  storageBucket:     "barberia-elegance.firebasestorage.app",
  messagingSenderId: "515311607907",
  appId:             "1:515311607907:web:8add6005144015c5e85856"
});

const messaging = firebase.messaging();

// ── 3. CACHE ─────────────────────────────────────────────────────
const CACHE_VERSION = 'elegance-v1';
const STATIC_ASSETS = [
  '/agenda',
  '/admin/',
  '/gestion-interna/',
  '/logo.jpg',
  '/output.css',
  '/firebase-config.js',
  '/firebaseUtils.js',
  '/config.js',
  '/db.js',
  '/manifest-admin.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first para HTML; cache-first para el resto
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // No interceptar peticiones de Firebase / APIs externas
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('fonts') ||
    url.hostname.includes('unpkg') ||
    url.hostname.includes('vercel') ||
    url.protocol === 'chrome-extension:'
  ) return;

  const isHTML = event.request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    // Network-first: siempre intenta la red para HTML
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // Solo cachear respuestas exitosas (no 404s)
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(async () => {
          // Sin red: intentar caché, luego shell de la app
          const cached = await caches.match(event.request);
          if (cached) return cached;
          // SPA fallback: servir el shell principal según la ruta
          if (url.pathname.startsWith('/gestion-interna')) {
            return caches.match('/gestion-interna/') || caches.match('/gestion-interna/index.html');
          }
          if (url.pathname.startsWith('/agenda')) {
            return caches.match('/agenda') || caches.match('/agenda.html');
          }
          return caches.match('/') || caches.match('/index.html');
        })
    );
  } else {
    // Cache-first: CSS, JS, imágenes locales
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          // Solo cachear respuestas exitosas
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
  }
});

// ── 4. PUSH EN BACKGROUND (Firebase Messaging) ───────────────────
// Se dispara cuando llega un mensaje FCM y la pestaña NO está activa/visible
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Mensaje en background recibido:', payload);

  const notifTitle = payload.notification?.title
    || payload.data?.title
    || 'Nueva reserva';

  const notifOptions = {
    body:    payload.notification?.body  || payload.data?.body  || 'Tienes una nueva cita agendada.',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag:     'nueva-cita',          // colapsa notificaciones duplicadas
    renotify: true,
    data: {
      url: payload.data?.url || '/agenda',
      citaId: payload.data?.citaId || null
    },
    actions: [
      { action: 'abrir', title: 'Ver cita' }
    ]
  };

  return self.registration.showNotification(notifTitle, notifOptions);
});

// ── 5. CLIC EN LA NOTIFICACIÓN ───────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/agenda';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/agenda') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── 6. PUSH MANUAL (fallback si el payload no viene del SDK) ─────
// Captura pushes raw que no pasan por onBackgroundMessage
self.addEventListener('push', event => {
  // Si Firebase Messaging ya lo manejaría, salir
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch (_) { data = { title: event.data.text() }; }

  // Si ya tiene estructura de FCM (manejada por onBackgroundMessage), no duplicar
  if (data.notification || data.data?.handled_by_fcm) return;

  const title = data.title || '𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞 𝐛𝐚𝐫𝐛𝐞𝐫𝐬𝐡𝐨𝐩';
  const options = {
    body:  data.body  || 'Nueva notificación',
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data:  { url: data.url || '/agenda' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
