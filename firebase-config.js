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
//  FIREBASE APP CHECK (reCAPTCHA v3)
//
//  Mitiga bots y clientes no autorizados en Firestore + Cloud Functions.
//  Es la defensa REAL contra el flooding del booking público: sin App Check,
//  cualquiera con la config pública puede escribir `citas` directo, limitado
//  solo por las reglas (auditoría 2026-08-05). Requerido por Sprint 3.1 del
//  roadmap legal.
//
//  INERTE por defecto: mientras APPCHECK_SITE_KEY sea el placeholder no se
//  activa nada, así que commitear/desplegar este archivo no cambia el
//  comportamiento. Para encenderlo:
//    1. Firebase Console → App Check → registra la web app con reCAPTCHA v3.
//    2. Pega la site key en APPCHECK_SITE_KEY (abajo).
//    3. En Google reCAPTCHA admin → allowed domains agrega los subdominios
//       (*.synaptechspa.cl cubre a todos).
//    4. Agrega en TODOS los HTML públicos, ANTES de este archivo:
//         <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check-compat.js"></script>
//    5. Prueba ~1 semana en modo "unenforced" y recién ahí activa el
//       enforcement (Firestore + Functions) en la consola.
// ═══════════════════════════════════════════════════════════════════
const APPCHECK_SITE_KEY = 'REEMPLAZAR_CON_SITE_KEY_RECAPTCHA_V3';
try {
  if (APPCHECK_SITE_KEY !== 'REEMPLAZAR_CON_SITE_KEY_RECAPTCHA_V3'
      && typeof firebase !== 'undefined'
      && typeof firebase.appCheck === 'function') {
    firebase.appCheck().activate(
      new firebase.appCheck.ReCaptchaV3Provider(APPCHECK_SITE_KEY),
      true // isTokenAutoRefreshEnabled
    );
    console.info('[AppCheck] activado (reCAPTCHA v3)');
  }
} catch (e) {
  console.warn('[AppCheck] no se pudo inicializar:', e.message);
}

let auth;
try {
  auth = firebase.auth();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
} catch(e) {
  console.warn('[Firebase] Auth SDK no disponible en esta página');
}
// Guard igual que auth/storage: páginas que no cargan firestore-compat
// (ej: crea.html solo usa auth+functions) no deben reventar acá — el throw
// cortaba el resto de este archivo (storage quedaba sin inicializar).
let db;
try {
  db = firebase.firestore();
} catch(e) {
  console.warn('[Firebase] Firestore SDK no disponible en esta página');
}
// Navegadores in-app (Instagram, Facebook, etc.) rompen el transporte
// WebChannel/streaming de Firestore y la conexión queda colgada: los datos no
// cargan y la página no se recupera (spinner eterno). La auto-detección NO es
// fiable en el WebView de Instagram en iOS, así que ahí forzamos long-polling;
// en el resto de navegadores dejamos auto-detect (streaming cuando se puede).
(function () {
  if (!db) return;
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
