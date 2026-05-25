import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { db } from '../lib/firebase';

export const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;
const SW_URL = '/gestion-interna/sw.js';

/**
 * Solicita permiso, registra el SW de FCM y guarda el token en Firestore.
 * Debe llamarse desde un gesto del usuario (click).
 * Retorna 'granted' | 'denied' | 'error'.
 */
export async function activarNotificaciones({ uid, tenantId }) {
  try {
    if (!VAPID_KEY) throw new Error('VITE_VAPID_KEY no configurada');

    const supported = await isSupported().catch(() => false);
    if (!supported) throw new Error('Navegador no compatible');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission; // 'denied' | 'default'

    const swReg = await navigator.serviceWorker.register(SW_URL, {
      scope: '/gestion-interna/',
    });

    const messaging = getMessaging(getApps()[0]);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    if (!token) throw new Error('No se obtuvo token FCM');

    await setDoc(doc(db, 'fcm_tokens', token), {
      token,
      uid,
      barberoId:  uid,
      tenantId,
      activo:     true,
      plataforma: 'web-admin',
      updatedAt:  serverTimestamp(),
      creadoEn:   serverTimestamp(),
    }, { merge: true });

    return 'granted';
  } catch (err) {
    console.warn('[FCM]', err.message);
    return 'error';
  }
}
