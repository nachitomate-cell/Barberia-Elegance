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

const auth    = firebase.auth();
const db      = firebase.firestore();
let storage;
try {
  storage = firebase.storage();
} catch(e) {
  console.warn('[Firebase] Storage SDK no disponible en esta página');
}
