// useMembership.js — Lee la suscripción activa del usuario actual en tiempo real.
// Usa onSnapshot para actualizarse al renovar/cancelar sin recargar.

import { useState, useEffect } from 'react';
import { doc, onSnapshot }    from 'firebase/firestore';
import { db }                 from '../lib/firebase';
import { PLANES }             from '../lib/plans';

/**
 * @param {string|null} tenantId
 * @param {string|null} uid  - Firebase Auth UID del cliente
 *
 * Retorna:
 *   { sub, plan, activa, loading }
 *   sub   → objeto subscription crudo (o null)
 *   plan  → entrada de PLANES (o null)
 *   activa → boolean — activa Y dentro del período
 */
export function useMembership(tenantId, uid) {
  const [sub,     setSub]     = useState(undefined); // undefined = cargando
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !uid) { setSub(null); setLoading(false); return; }

    const path  = tenantId === 'elegance' ? `users/${uid}` : `tenants/${tenantId}/users/${uid}`;
    const ref   = doc(db, path);

    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) { setSub(null); setLoading(false); return; }
      const raw = snap.data()?.subscription ?? null;
      setSub(raw);
      setLoading(false);
    }, () => { setSub(null); setLoading(false); });

    return unsub;
  }, [tenantId, uid]);

  const plan = sub?.planId ? (PLANES[sub.planId] ?? null) : null;

  const activa = !!sub
    && sub.status === 'active'
    && (sub.currentPeriodEnd?.toDate?.() ?? new Date(0)) > new Date();

  return { sub, plan, activa, loading };
}
