import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { app } from './firebase';

/**
 * Pagos del paywall vía Stripe Checkout (Cloud Functions callables).
 *
 * Seguridad: el precio se valida en el servidor; la `hiddenUrl` solo se entrega
 * tras verificar el pago con Stripe (verifyUnlock). El cliente nunca lee /secrets.
 */

const functions: Functions = getFunctions(app, 'us-central1');

const _createCheckout = httpsCallable<
  { blockId: string; username: string; origin: string },
  { url: string; sessionId: string }
>(functions, 'createStripeCheckout');

const _verifyUnlock = httpsCallable<
  { sessionId: string },
  { hiddenUrl: string }
>(functions, 'verifyUnlock');

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
}

export interface UnlockResult {
  ok: boolean;
  hiddenUrl?: string;
  error?: string;
}

/** Crea la sesión de Stripe y devuelve la URL de checkout a la que redirigir. */
export async function createCheckoutSession(blockId: string, username: string): Promise<CheckoutSession> {
  const origin = `${window.location.origin}/${username}`;
  const res = await _createCheckout({ blockId, username, origin });
  return { sessionId: res.data.sessionId, checkoutUrl: res.data.url };
}

/** Verifica el pago y obtiene la hiddenUrl real (solo si la sesión está pagada). */
export async function verifyPaymentAndUnlock(sessionId: string): Promise<UnlockResult> {
  try {
    const res = await _verifyUnlock({ sessionId });
    return { ok: true, hiddenUrl: res.data.hiddenUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'verify-failed' };
  }
}
