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

// Notificación cuando el tab está cerrado o en background
messaging.onBackgroundMessage(payload => {
  const { title = 'Nueva cita', body = '' } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon:     '/gestion-interna/pwa-192.png',
    badge:    '/gestion-interna/pwa-192.png',
    vibrate:  [200, 100, 200],
    // Tag único por notificación (viene del server); un tag fijo hace que
    // cada notificación nueva reemplace a la anterior no leída.
    tag:      payload.data?.tag || 'notif-' + Date.now(),
    renotify: true,
    data:     payload.data || {},
  });
});

// Abrir / enfocar el panel al tocar la notificación
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/gestion-interna/agenda';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/gestion-interna') && 'focus' in c) return c.focus();
      }
      return clients.openWindow ? clients.openWindow(url) : undefined;
    })
  );
});
