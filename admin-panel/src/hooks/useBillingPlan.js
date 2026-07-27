import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';

// Plan comercial del tenant desde _billing/{tid}.plan. Determina qué shape
// del panel se muestra:
//   'wallet-only' → producto standalone (sin agenda) — sidebar recortado
//                   + defaultRoute = 'inicio' en vez de 'agenda'
//   null / otro   → panel completo de barbería
//
// Se re-lee en vivo (onSnapshot) para que activar/desactivar el plan desde
// _billing no requiera recargar la app.
export function useBillingPlan() {
  const { id: tenantId } = useTenant();
  // undefined = cargando, string = plan resuelto, null = sin plan definido
  const [plan, setPlan] = useState(undefined);
  useEffect(() => {
    const ref = doc(db, '_billing', tenantId);
    const unsub = onSnapshot(
      ref,
      snap => setPlan(snap.exists() ? (snap.data().plan || null) : null),
      () => setPlan(null),
    );
    return unsub;
  }, [tenantId]);
  return plan;
}
