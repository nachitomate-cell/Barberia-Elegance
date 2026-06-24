import { runTransaction, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Genera y RESERVA un handle anónimo random tipo `k7mp9`. Es la base del
 * flujo viral: el usuario aterriza, diseña y publica sin escribir un nombre.
 *
 * El handle se reserva en `bios/{handle}` vía transacción para evitar
 * colisiones entre dos anónimos que entran al mismo tiempo. El doc inicial
 * solo lleva `uid + reservedAt`; la primera llamada a `saveBio` lo rellena.
 */

// Alfabeto sin caracteres confundibles (sin 0/o/l/1). 32 símbolos.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
/** Largo del handle random. 5 chars = 32^5 ≈ 33M combinaciones. */
const HANDLE_LEN = 5;
/** Cuántos handles probar antes de rendirse (cada uno = 1 transacción). */
const MAX_ATTEMPTS = 6;

/** Genera un slug random con cripto-aleatoriedad cuando está disponible. */
function generateCandidate(): string {
  const arr = new Uint8Array(HANDLE_LEN);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < HANDLE_LEN; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < HANDLE_LEN; i++) out += ALPHABET[arr[i] % ALPHABET.length];
  return out;
}

/**
 * Reserva un handle nuevo y libre. Lanza si no hay sesión o si tras
 * MAX_ATTEMPTS no consiguió uno libre (prácticamente imposible).
 */
export async function mintRandomHandle(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('not-authenticated');

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateCandidate();
    try {
      const claimed = await runTransaction(db, async (tx) => {
        const ref = doc(db, 'bios', candidate);
        const snap = await tx.get(ref);
        if (snap.exists()) return null; // colisión: prueba otro
        tx.set(ref, {
          uid: user.uid,
          username: candidate,
          reservedAt: serverTimestamp(),
          anonymous: true,
        });
        // Mapeo uid → username para que loadUserBio() lo recupere al volver.
        tx.set(doc(db, 'bio_users', user.uid), {
          username: candidate,
          email: user.email ?? '',
          updatedAt: serverTimestamp(),
        }, { merge: true });
        return candidate;
      });
      if (claimed) return claimed;
    } catch (err) {
      // Si la transacción falla por permisos o red, no insistir indefinidamente.
      if (attempt === MAX_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error('mint-handle-exhausted');
}
