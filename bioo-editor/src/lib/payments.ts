import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from './firebase';

/**
 * Pagos del paywall/propina. Dos proveedores conviven:
 *   - Stripe Connect  → creadores internacionales (USD).
 *   - Mercado Pago    → Chile/LatAm (CLP), modelo marketplace.
 * El proveedor se elige según lo que el creador conectó (flags públicos del bio:
 * mpReady / stripeReady). El precio se valida SIEMPRE en el servidor y la
 * `hiddenUrl` solo se entrega tras verificar el pago. El cliente nunca lee /secrets.
 */

const functions: Functions = getFunctions(app, 'us-central1');

const _createCheckout = httpsCallable<
  { blockId: string; username: string; origin: string; amount?: number },
  { url: string; sessionId: string }
>(functions, 'createStripeCheckout');

const _verifyUnlock = httpsCallable<
  { sessionId: string },
  { hiddenUrl: string; kind: 'tip' | 'paywall' }
>(functions, 'verifyUnlock');

const _mpCheckout = httpsCallable<
  { blockId: string; username: string; amount?: number },
  { url: string; orderId: string; provider: 'mercadopago' }
>(functions, 'mpBioCheckout');

const _mpVerify = httpsCallable<
  { username: string; orderId: string },
  { hiddenUrl: string; kind: 'tip' | 'paywall' }
>(functions, 'mpBioVerify');

export type PayProvider = 'mercadopago' | 'stripe';

/** Resuelve el proveedor de cobro del creador desde el bio público.
 *  Prioriza Mercado Pago (Chile); cae a Stripe si solo ese está conectado. */
export async function resolveProvider(username: string): Promise<PayProvider | null> {
  try {
    const snap = await getDoc(doc(db, 'bios', username));
    const d = snap.data() as Record<string, unknown> | undefined;
    if (d && d.mpReady === true) return 'mercadopago';
    if (d && d.stripeReady === true) return 'stripe';
  } catch { /* sin permiso / offline */ }
  return null;
}

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
}

export interface UnlockResult {
  ok: boolean;
  hiddenUrl?: string;
  kind?: 'tip' | 'paywall';
  error?: string;
}

/** Crea la sesión de Stripe y devuelve la URL de checkout a la que redirigir.
 *  Para bloques 'tip' pasa el monto seleccionado (validado en el servidor). */
export async function createCheckoutSession(blockId: string, username: string, amount?: number): Promise<CheckoutSession> {
  const origin = `${window.location.origin}/${username}`;
  const res = await _createCheckout({ blockId, username, origin, amount });
  return { sessionId: res.data.sessionId, checkoutUrl: res.data.url };
}

/** Inicia el cobro con el proveedor que el creador tenga conectado y devuelve
 *  la URL de pago a la que redirigir. Lanza si nadie está conectado. */
export async function startCheckout(blockId: string, username: string, amount?: number): Promise<{ url: string; provider: PayProvider }> {
  const provider = await resolveProvider(username);
  if (provider === 'mercadopago') {
    const res = await _mpCheckout({ blockId, username, amount });
    return { url: res.data.url, provider };
  }
  if (provider === 'stripe') {
    const { checkoutUrl } = await createCheckoutSession(blockId, username, amount);
    return { url: checkoutUrl, provider };
  }
  throw new Error('El creador aún no conectó un medio de pago.');
}

/** Verifica el pago de Stripe: entrega hiddenUrl (paywall) o confirma el apoyo (tip). */
export async function verifyPaymentAndUnlock(sessionId: string): Promise<UnlockResult> {
  try {
    const res = await _verifyUnlock({ sessionId });
    return { ok: true, hiddenUrl: res.data.hiddenUrl, kind: res.data.kind };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'verify-failed' };
  }
}

/** Verifica el pago de Mercado Pago a partir del orderId devuelto en el retorno. */
export async function verifyMpAndUnlock(username: string, orderId: string): Promise<UnlockResult> {
  try {
    const res = await _mpVerify({ username, orderId });
    return { ok: true, hiddenUrl: res.data.hiddenUrl, kind: res.data.kind };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'verify-failed' };
  }
}
