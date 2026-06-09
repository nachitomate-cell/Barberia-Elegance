import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            'AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q',
  authDomain:        'barberia-elegance.firebaseapp.com',
  projectId:         'barberia-elegance',
  storageBucket:     'barberia-elegance.firebasestorage.app',
  messagingSenderId: '515311607907',
  appId:             '1:515311607907:web:8add6005144015c5e85856',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// initializeAuth es síncrono — no hay race condition con signInWithEmailAndPassword.
// indexedDB como primario es más robusto en mobile/iOS que localStorage.
let _auth;
try {
  _auth = initializeAuth(app, {
    // session al final: permite reconocer logins "no recordar" hechos en el lobby
    // (sessionStorage del mismo tab) sin perder la persistencia LOCAL por defecto.
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
  });
} catch {
  _auth = getAuth(app);
}
export const auth = _auth;

export const db      = getFirestore(app);
export const storage = getStorage(app);
