// firebase-messaging-sw.js — SW dedicado a Firebase Cloud Messaging
// para los HTMLs públicos (index.html, dashboard.html, chat.html, etc.)
// servidos en la raíz del dominio del tenant (barberiaferraza.synaptechspa.cl,
// auralondresvina.synaptechspa.cl, etc.).
//
// Por qué este archivo existe acá: el SDK de Firebase Messaging, al hacer
// getToken() sin pasar un serviceWorkerRegistration, intenta registrar
// automáticamente '/firebase-messaging-sw.js' bajo el scope
// '/firebase-cloud-messaging-push-scope'. Si el archivo no existe en la raíz,
// Vercel sirve el SPA fallback (text/html) y la registración falla con
// "The script has an unsupported MIME type ('text/html')".
//
// El /sw.js de la raíz ya hace caching PWA + algo de FCM, pero el SDK de
// Messaging exige específicamente este path. Lo dejamos minimal y compatible.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q',
  authDomain:        'barberia-elegance.firebaseapp.com',
  projectId:         'barberia-elegance',
  storageBucket:     'barberia-elegance.firebasestorage.app',
  messagingSenderId: '515311607907',
  appId:             '1:515311607907:web:8add6005144015c5e85856',
});

const messaging = firebase.messaging();

// Notificaciones cuando el tab está cerrado o en background.
// El payload.notification ya trae title/body desde la Cloud Function que las envía.
messaging.onBackgroundMessage(payload => {
  const { title = 'Nueva notificación', body = '' } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon:     '/icons/icon-192.png',
    badge:    '/icons/icon-192.png',
    vibrate:  [200, 100, 200],
    tag:      payload.data?.tag || 'notif-' + Date.now(),
    renotify: true,
    data:     payload.data || {},
  });
});

// Al tocar la notificación: enfocar el tab abierto (cualquier ruta del dominio)
// o abrir la URL declarada en data.url (las CFs la setean: /dashboard, /chat, etc.).
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
    })
  );
});
