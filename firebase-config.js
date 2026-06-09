// firebase-config.js — Configuración compartida de Firebase
// Requiere que los scripts compat de Firebase estén cargados ANTES de este archivo.

const firebaseConfig = {
  apiKey: "AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q",
  authDomain: "barberia-elegance.firebaseapp.com",
  projectId: "barberia-elegance",
  storageBucket: "barberia-elegance.firebasestorage.app",
  messagingSenderId: "515311607907",
  appId: "1:515311607907:web:8add6005144015c5e85856",
  measurementId: "G-VCEVWF9JCX"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

let auth;
try {
  auth = firebase.auth();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
} catch(e) {
  console.warn('[Firebase] Auth SDK no disponible en esta página');
}
const db      = firebase.firestore();
// Navegadores in-app (Instagram, Facebook, etc.) rompen el transporte
// WebChannel/streaming de Firestore y la conexión queda colgada: los datos no
// cargan y la página no se recupera (spinner eterno). La auto-detección NO es
// fiable en el WebView de Instagram en iOS, así que ahí forzamos long-polling;
// en el resto de navegadores dejamos auto-detect (streaming cuando se puede).
(function () {
  var ua = (navigator.userAgent || '');
  var isInApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|Twitter|TikTok|MicroMessenger|musical_ly/i.test(ua);
  try {
    db.settings(
      isInApp
        ? { experimentalForceLongPolling: true }
        : { experimentalAutoDetectLongPolling: true }
    );
  } catch (e) {
    console.warn('[Firebase] No se pudo aplicar Firestore settings (long-polling):', e && e.message);
  }
})();
let storage;
try {
  storage = firebase.storage();
} catch(e) {
  console.warn('[Firebase] Storage SDK no disponible en esta página');
}
