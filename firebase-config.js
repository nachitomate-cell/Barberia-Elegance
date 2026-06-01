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
// Navegadores in-app (Instagram, Facebook, etc.) suelen romper el transporte
// WebChannel/streaming de Firestore y la conexión queda colgada: los datos no
// cargan y la página no se recupera. Auto-detectar long-polling lo resuelve —
// Firestore cae a long-polling solo cuando el entorno lo necesita.
try {
  db.settings({ experimentalAutoDetectLongPolling: true });
} catch (e) {
  console.warn('[Firebase] No se pudo aplicar Firestore settings (long-polling):', e && e.message);
}
let storage;
try {
  storage = firebase.storage();
} catch(e) {
  console.warn('[Firebase] Storage SDK no disponible en esta página');
}
