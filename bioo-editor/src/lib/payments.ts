/**
 * Esqueleto de la arquitectura de pagos del paywall (Fase 5).
 *
 * Diseño de seguridad:
 *  - La `hiddenUrl` vive en `bios/{username}/secrets/{blockId}` (reglas: solo el dueño).
 *  - El COMPRADOR nunca puede leer ese documento directamente (las reglas lo deniegan).
 *  - La entrega del secreto ocurre EXCLUSIVAMENTE en el backend, tras verificar el pago.
 *
 * Las dos funciones de abajo son la firma + simulación. La integración real con
 * Stripe / MercadoPago se hace en endpoints de confianza (Cloud Functions / API routes)
 * con claves secretas del servidor y el Admin SDK (que ignora las reglas de cliente).
 */

export type PaymentProvider = 'stripe' | 'mercadopago';

export interface CheckoutSession {
  provider: PaymentProvider;
  sessionId: string;
  checkoutUrl: string;
}

export interface UnlockResult {
  ok: boolean;
  hiddenUrl?: string;
  error?: string;
}

/**
 * Crea una sesión de checkout para comprar un bloque paywall.
 * Llamada desde el Frontend al pulsar "Comprar".
 *
 * PRODUCCIÓN (no en el cliente):
 *   POST /api/payments/checkout  { blockId, username, buyerEmail }
 *   → el servidor crea la sesión (Stripe Checkout / MercadoPago Preference) con
 *     metadata { username, blockId } y devuelve { sessionId, checkoutUrl }.
 *   El front redirige a checkoutUrl.
 */
export async function createCheckoutSession(
  blockId: string,
  username: string,
  buyerEmail: string,
): Promise<CheckoutSession> {
  // TODO(backend): reemplazar por fetch('/api/payments/checkout', { ... }).
  void buyerEmail; // se enviará al backend para el recibo / prefill del checkout
  const sessionId = `sess_sim_${username}_${blockId}_${Date.now().toString(36)}`;
  return {
    provider: 'stripe',
    sessionId,
    checkoutUrl: `https://checkout.bioo.cl/simulado?sid=${encodeURIComponent(sessionId)}`,
  };
}

/**
 * Verifica un pago y devuelve la `hiddenUrl` real al comprador.
 *
 * ⚠️ DEBE ejecutarse SOLO en el backend (Cloud Function / API con Admin SDK):
 *   1. Validar `sessionId` con el proveedor (estado === 'paid') o recibir el webhook firmado.
 *   2. Derivar { username, blockId } desde la metadata de la sesión.
 *   3. adminDb.doc(`bios/${username}/secrets/${blockId}`).get() → hiddenUrl.
 *   4. (Opcional) registrar la venta y enviar el enlace por email.
 *
 * En el cliente esta lectura fallaría por las reglas de Firestore (acceso denegado al
 * público), que es exactamente la protección que buscamos.
 */
export async function verifyPaymentAndUnlock(sessionId: string): Promise<UnlockResult> {
  // TODO(backend): validar la sesión y leer /secrets con el Admin SDK.
  if (!sessionId) return { ok: false, error: 'missing-session' };
  return { ok: true, hiddenUrl: 'https://ejemplo.com/recurso-protegido (simulado)' };
}
