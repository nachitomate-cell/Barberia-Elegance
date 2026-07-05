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

// ── Confirmación de entrega/click ────────────────────────────────
// Reporta al backend cuando una push se MUESTRA o se TOCA, para poder
// visualizar en /admin que el cliente efectivamente recibió la alerta.
const _CONFIRM_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/confirmarEntregaPush';
function _reportPush(logId, evento) {
  if (!logId) return Promise.resolve();
  return fetch(_CONFIRM_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ logId, event: evento }),
  }).catch(() => {});
}

// ── 3. CACHE ─────────────────────────────────────────────────────
const CACHE_VERSION = 'saas-v23';
const STATIC_ASSETS = [
  '/dashboard.html',
  '/index.html',
  '/agenda',
  '/output.css',
  '/firebase-config.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // manifest files are excluded — served dynamically per tenant by middleware
];

self.addEventListener('install', event => {
  self.skipWaiting();
  // Caching fail-safe: si un asset falla, el SW sigue instalándose
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] No se pudo cachear:', url, err.message))
        )
      )
    )
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

  // Manifests are dynamic per tenant — network-first, but cache as fallback
  if (url.pathname === '/manifest.json' || url.pathname === '/manifest-agenda.json') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } });
        })
    );
    return;
  }

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
            return (await caches.match('/gestion-interna/')) ||
                   (await caches.match('/gestion-interna/index.html')) ||
                   new Response('', { status: 503 });
          }
          if (url.pathname.startsWith('/agenda')) {
            return (await caches.match('/agenda')) ||
                   (await caches.match('/agenda.html')) ||
                   new Response('', { status: 503 });
          }
          return (await caches.match('/dashboard.html')) ||
                 (await caches.match('/')) ||
                 (await caches.match('/index.html')) ||
                 new Response('', { status: 503 });
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

  const tipo       = payload.data?.tipo || null;
  const citaId     = payload.data?.citaId || null;
  const tenantId   = payload.data?.tenantId || null;
  const logId      = payload.data?.logId || null;

  const notifTitle = payload.notification?.title || payload.data?.title || 'Nueva reserva';
  const body       = payload.notification?.body  || payload.data?.body  || 'Tienes una nueva cita agendada.';

  let tag, renotify, actions;

  if (tipo === 'recordatorio') {
    tag      = `recordatorio-${citaId || 'cita'}`;
    renotify = false;
    actions  = [
      { action: 'confirmar', title: '✅ Confirmar' },
      { action: 'cancelar',  title: '❌ Cancelar'  },
    ];
  } else {
    tag      = 'nueva-cita';
    renotify = true;
    actions  = [{ action: 'abrir', title: 'Ver cita' }];
  }

  const notifOptions = {
    body,
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag,
    renotify,
    data: {
      url:      payload.data?.url || (tipo === 'recordatorio' ? '/dashboard.html' : '/agenda'),
      citaId,
      tipo,
      tenantId,
      logId,
    },
    actions,
  };

  // Badge en el ícono de la PWA (reaparece aunque la app esté cerrada)
  self.navigator?.setAppBadge?.().catch?.(() => {});

  // Mostrar la notificación y, en paralelo, confirmar la entrega.
  return Promise.all([
    self.registration.showNotification(notifTitle, notifOptions),
    _reportPush(logId, 'delivered'),
  ]);
});

// ── 5. CLIC EN LA NOTIFICACIÓN ───────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  // Limpiar badge al tocar la notificación
  self.navigator?.clearAppBadge?.().catch?.(() => {});

  const data     = event.notification.data || {};
  const action   = event.action;
  const tipo     = data.tipo;
  const citaId   = data.citaId;
  const tenantId = data.tenantId || '';

  // Confirmar el click (también marca entregado) en paralelo a la navegación.
  if (data.logId) event.waitUntil(_reportPush(data.logId, 'clicked'));

  let targetUrl;
  if (tipo === 'recordatorio' && citaId && (action === 'confirmar' || action === 'cancelar')) {
    // Acción de recordatorio: abrir dashboard con deep-link params
    targetUrl = `/dashboard.html?accion=${action}&citaId=${encodeURIComponent(citaId)}&tenantId=${encodeURIComponent(tenantId)}`;
  } else if (tipo === 'recordatorio') {
    // Toque en el cuerpo de la notificación (sin acción específica)
    targetUrl = `/dashboard.html`;
  } else {
    targetUrl = data.url || '/agenda';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (tipo === 'recordatorio') {
        // Para recordatorio siempre navegar al dashboard con los params
        const dashClient = clientList.find(c => c.url.includes('/dashboard.html'));
        if (dashClient && 'navigate' in dashClient) {
          return dashClient.navigate(targetUrl).then(c => c && c.focus());
        }
        const anyClient = clientList.find(c => new URL(c.url).origin === self.location.origin);
        if (anyClient && 'navigate' in anyClient) {
          return anyClient.navigate(targetUrl).then(c => c && c.focus());
        }
        return clients.openWindow(targetUrl);
      }

      // Priorizar ventana de /agenda ya abierta
      const agendaClient = clientList.find(c => c.url.includes('/agenda'));
      if (agendaClient && 'focus' in agendaClient) return agendaClient.focus();

      // Cualquier ventana del mismo origen
      const anyClient = clientList.find(c => new URL(c.url).origin === self.location.origin);
      if (anyClient && 'focus' in anyClient) {
        return anyClient.navigate(targetUrl).then(c => c && c.focus());
      }

      return clients.openWindow(targetUrl);
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
