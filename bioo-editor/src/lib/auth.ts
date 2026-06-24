import {
  signInAnonymously,
  linkWithPopup,
  linkWithRedirect,
  linkWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  EmailAuthProvider,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';

/** Resultado de un upgrade de cuenta anónima.
 *  - 'linked'   → se fusionó el anónimo con la nueva identidad (mismo uid; hay que
 *                 publicar el borrador local porque es una cuenta recién creada).
 *  - 'switched' → la identidad ya existía en otra cuenta; iniciamos sesión en ella
 *                 (uid distinto; NO se publica el borrador, se carga su bio guardada).
 */
export type UpgradeResult =
  | { ok: true; mode: 'linked' | 'switched' }
  | { ok: false; code: string; message: string };

/** ¿Entorno donde los popups de OAuth suelen bloquearse (móvil / PWA instalada)? */
export function preferRedirect(): boolean {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent || '',
  );
  let isPwa = false;
  try {
    isPwa =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch { /* matchMedia no disponible */ }
  return isMobile || isPwa;
}

/** Inicia sesión anónima si aún no hay usuario. Silencioso: si el proyecto no tiene
 *  habilitado el proveedor Anónimo (Authentication → Sign-in method), no rompe el
 *  editor — solo deja `auth.currentUser` en null y se cae al flujo de /registro. */
export async function ensureAnonymousSession(): Promise<void> {
  if (auth.currentUser) return;
  try {
    await signInAnonymously(auth);
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
      console.warn('[bioo] Auth anónimo deshabilitado en Firebase. Habilítalo en Authentication → Sign-in method → Anónimo.');
    } else {
      console.error('[bioo] No se pudo iniciar sesión anónima:', err);
    }
  }
}

function mapError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use': return 'Ese correo ya tiene una cuenta. Inicia sesión para continuar.';
    case 'auth/invalid-email':        return 'El correo no es válido.';
    case 'auth/weak-password':        return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':   return 'Correo o contraseña incorrectos.';
    case 'auth/popup-closed-by-user': return 'Cerraste la ventana de Google. Intenta de nuevo.';
    case 'auth/unauthorized-domain':  return 'Este dominio no está autorizado en Firebase.';
    case 'auth/operation-not-allowed':return 'Ese método de acceso no está habilitado en Firebase.';
    case 'auth/network-request-failed': return 'Falla de red. Revisa tu conexión.';
    default: return code ? `No se pudo completar (${code}).` : 'No se pudo completar. Intenta nuevamente.';
  }
}

/** Fusiona la cuenta anónima actual con una cuenta de Google.
 *  Si el navegador requiere redirect (móvil/PWA), lanza el flujo de redirect y la
 *  resolución la completa `completePendingRedirect()` al volver. */
export async function upgradeWithGoogle(): Promise<UpgradeResult> {
  const current = auth.currentUser;
  if (!current) return { ok: false, code: 'no-user', message: 'No hay sesión activa.' };
  const provider = new GoogleAuthProvider();

  if (preferRedirect()) {
    // El resultado se procesa en completePendingRedirect() tras recargar.
    await linkWithRedirect(current, provider);
    return { ok: true, mode: 'linked' }; // (no se alcanza: la página navega)
  }

  try {
    await linkWithPopup(current, provider);
    return { ok: true, mode: 'linked' };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    // La cuenta de Google ya pertenece a OTRO usuario bioo → iniciamos sesión en ella.
    if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
      const cred = GoogleAuthProvider.credentialFromError(err as never);
      if (cred) {
        try {
          await signInWithCredential(auth, cred);
          return { ok: true, mode: 'switched' };
        } catch (e2) {
          return { ok: false, code: (e2 as { code?: string })?.code ?? code, message: mapError(code) };
        }
      }
    }
    if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request' || code === 'auth/operation-not-supported-in-this-environment') {
      await linkWithRedirect(current, provider);
      return { ok: true, mode: 'linked' };
    }
    return { ok: false, code, message: mapError(code) };
  }
}

/** Fusiona la cuenta anónima actual con un par correo/contraseña. */
export async function upgradeWithEmail(email: string, password: string): Promise<UpgradeResult> {
  const current = auth.currentUser;
  if (!current) return { ok: false, code: 'no-user', message: 'No hay sesión activa.' };
  const credential = EmailAuthProvider.credential(email.trim(), password);

  try {
    await linkWithCredential(current, credential);
    return { ok: true, mode: 'linked' };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    // El correo ya tiene cuenta → intentamos iniciar sesión con lo que escribió.
    if (code === 'auth/email-already-in-use' || code === 'auth/credential-already-in-use') {
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        return { ok: true, mode: 'switched' };
      } catch (e2) {
        const c2 = (e2 as { code?: string })?.code ?? code;
        return { ok: false, code: c2, message: c2 === 'auth/wrong-password' || c2 === 'auth/invalid-credential'
          ? 'Ese correo ya tiene cuenta, pero la contraseña no coincide.'
          : mapError(c2) };
      }
    }
    return { ok: false, code, message: mapError(code) };
  }
}

/** Completa un upgrade con Google iniciado vía redirect (móvil/PWA). Devuelve el
 *  resultado si hubo redirect pendiente, o null si no había ninguno. */
export async function completePendingRedirect(): Promise<UpgradeResult | null> {
  let result: UserCredential | null = null;
  try {
    result = await getRedirectResult(auth);
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
      const cred = GoogleAuthProvider.credentialFromError(err as never);
      if (cred) {
        try {
          await signInWithCredential(auth, cred);
          return { ok: true, mode: 'switched' };
        } catch { /* cae al return de abajo */ }
      }
    }
    return { ok: false, code, message: mapError(code) };
  }
  if (!result) return null;
  return { ok: true, mode: 'linked' };
}
