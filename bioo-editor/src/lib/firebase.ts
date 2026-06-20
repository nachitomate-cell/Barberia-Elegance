import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q',
  authDomain: 'barberia-elegance.firebaseapp.com',
  projectId: 'barberia-elegance',
  storageBucket: 'barberia-elegance.firebasestorage.app',
  messagingSenderId: '515311607907',
  appId: '1:515311607907:web:8add6005144015c5e85856',
};

export const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
