// Productos premium cobrados por SynapTech al creador (single-seller MP).
// Ver functions/payments-mp-platform.js para el backend.
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { onAuthStateChanged } from 'firebase/auth';
import { app, auth, db } from './firebase';

const functions = getFunctions(app, 'us-central1');

// Mantener sincronizado con SKUS en functions/payments-mp-platform.js.
// Acá solo el precio mostrado al usuario — el cobro real lo decide el backend.
export const PLATFORM_SKUS = {
  removeWatermark: { price: 4990, currency: 'CLP', label: 'Quitar marca de agua' },
} as const;

export type PlatformSku = keyof typeof PLATFORM_SKUS;

const _checkout = httpsCallable<{ sku: PlatformSku }, { url: string; orderId: string }>(
  functions, 'mpBioPlatformCheckout',
);
const _verify = httpsCallable<{ orderId: string }, { status: string; sku: string }>(
  functions, 'mpBioPlatformVerify',
);

/** Inicia el checkout single-seller. Redirige al init_point de MP. */
export async function startPlatformCheckout(sku: PlatformSku): Promise<{ url: string; orderId: string }> {
  const res = await _checkout({ sku });
  return res.data;
}

/** Fuerza la verificación de una orden (útil al volver del pago). */
export async function verifyPlatformOrder(orderId: string): Promise<{ status: string; sku: string }> {
  const res = await _verify({ orderId });
  return res.data;
}

export interface ProState {
  removeWatermark: boolean;
  loading: boolean;
}

/** Observa en vivo qué productos premium tiene el usuario activados. */
export function useProState(): ProState {
  const [removeWatermark, setRW] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: () => void = () => {};
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      unsubDoc();
      if (!u) { setRW(false); setLoading(false); return; }
      setLoading(true);
      unsubDoc = onSnapshot(
        doc(db, 'bio_users', u.uid),
        (snap) => {
          const d = snap.data() as Record<string, unknown> | undefined;
          setRW(!!(d && d.proRemoveWatermark === true));
          setLoading(false);
        },
        () => setLoading(false),
      );
    });
    return () => { unsubAuth(); unsubDoc(); };
  }, []);

  return { removeWatermark, loading };
}

export function formatCLP(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}
