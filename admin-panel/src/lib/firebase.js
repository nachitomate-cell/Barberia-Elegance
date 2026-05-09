import { initializeApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
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

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const db      = getFirestore(app);
export const storage = getStorage(app);
