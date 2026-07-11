// firebase-config.js — Configuración compartida de Firebase
// Requiere que los scripts compat de Firebase estén cargados ANTES de este archivo.

// Auth same-origin en TODOS los dominios propios: el handler de Google se sirve desde el
// propio dominio (proxy /__/auth y /__/firebase en vercel.json), evitando el storage
// partitioning que rompe el login de Google dentro de las PWA. En localhost/preview se usa
// el authDomain por defecto de Firebase.
// REQUISITO (una vez por dominio, en consola):
//   • Firebase → Authentication → Authorized domains: agregar el dominio.
//   • Google Cloud → Credentials → OAuth Web Client → Authorized redirect URIs:
//       https://<dominio>/__/auth/handler   (si falta: Error 400 redirect_uri_mismatch).
const _authDomain = (function () {
  try {
    var h = location.hostname || '';
    if (!h || h === 'localhost' || /^127\./.test(h) || /\.vercel\.app$/i.test(h)) return 'barberia-elegance.firebaseapp.com';
    return h;   // dominio propio → handler same-origin vía proxy /__/auth
  } catch (e) { return 'barberia-elegance.firebaseapp.com'; }
})();
const firebaseConfig = {
  apiKey: "AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q",
  authDomain: _authDomain,
  projectId: "barberia-elegance",
  storageBucket: "barberia-elegance.firebasestorage.app",
  messagingSenderId: "515311607907",
  appId: "1:515311607907:web:8add6005144015c5e85856",
  measurementId: "G-VCEVWF9JCX"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ═══════════════════════════════════════════════════════════════════
//  FIREBASE APP CHECK (reCAPTCHA v3) — deshabilitado por defecto.
//
//  Activar cuando esté listo el setup en Firebase Console:
//    1. Firebase Console → App Check → Register the web app.
//    2. Elige "reCAPTCHA v3" como proveedor y crea un site key
//       (protégelo en Firebase, NO en Google reCAPTCHA admin).
//    3. Copia la site key aquí abajo (APPCHECK_SITE_KEY).
//    4. En cada tenant, agrega el subdominio en Google reCAPTCHA
//       admin → allowed domains (*.synaptechspa.cl cubre a todos).
//    5. Descomenta el bloque y agrega en TODOS los HTML públicos:
//         <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check-compat.js"></script>
//    6. Activa el enforcement en Firebase Console (después de probar
//       una semana en modo "unenforced"): Firestore, Functions.
//
//  Impacto: protege Firestore y Cloud Functions contra bots y clientes
//  no autorizados. Requerido por Sprint 3.1 del roadmap legal.
// ═══════════════════════════════════════════════════════════════════
/*
try {
  const APPCHECK_SITE_KEY = 'REEMPLAZAR_CON_SITE_KEY_RECAPTCHA_V3';
  if (typeof firebase.appCheck === 'function') {
    firebase.appCheck().activate(
      new firebase.appCheck.ReCaptchaV3Provider(APPCHECK_SITE_KEY),
      true // isTokenAutoRefreshEnabled
    );
  }
} catch (e) {
  console.warn('[AppCheck] no se pudo inicializar:', e.message);
}
*/

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
