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

    // Registrar SW y esperar a que esté activo antes de pedir token
    navigator.serviceWorker.register(SW_URL, { scope: '/gestion-interna/' }).catch(() => {});
    const swReg = await navigator.serviceWorker.ready;

    const messaging = getMessaging(getApps()[0]);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    if (!token) throw new Error('No se obtuvo token FCM');

    // Multi-tenant: el token debe guardarse en la MISMA ruta que leen las
    // Cloud Functions de envío. elegance → raíz fcm_tokens; el resto →
    // tenants/{tid}/fcm_tokens (getTokensActivosTenant en functions/index.js).
    const tid = tenantId || 'elegance';
    const tokenRef = tid === 'elegance'
      ? doc(db, 'fcm_tokens', token)
      : doc(db, 'tenants', tid, 'fcm_tokens', token);

    await setDoc(tokenRef, {
      token,
      uid,
      barberoId:  uid,
      tenantId:   tid,
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
