import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { tenantCol, resolveTenantId } from '../lib/tenantUtils';

// ─────────────────────────────────────────────────────────────────────────
//  useClubUsers — suscripción compartida y persistente a `users/` del tenant.
//
//  Fase 3.A (post cleanup + backfill): antes este hook mergeaba users/ con
//  clientes/ + dedupeaba por email/tel para papear duplicados que la data
//  legacy había dejado. Con Fase 2 + backfill hechos:
//   · Los duplicados físicos en users/ fueron fusionados/marcados.
//   · Los walk-ins de clientes/ fueron migrados a users/.
//   · Toda cita histórica tiene clienteUid apuntando a un doc real de users/.
//  → el merge en runtime ya no aporta valor. Un listener directo a users/
//    es suficiente, más rápido, y los conteos del panel coinciden 1:1 con
//    Firestore (antes había un delta por dedupe runtime que confundía).
//
//  clientes/ deja de leerse aquí. Se elimina completamente en Fase 3.B/C
//  (rules deprecated + collection removed).
//
//  Cache module-level: 1 listener por sesión, docs residen en memoria y
//  Firestore solo cobra deltas.
// ─────────────────────────────────────────────────────────────────────────

const _cache = {
  tid:       null,
  data:      [],
  loaded:    false,
  unsub:     null,
  listeners: new Set(),
};

function _emit() {
  _cache.listeners.forEach(cb => cb(_cache.data, _cache.loaded));
}

function _ensureSubscription() {
  const tid = resolveTenantId();
  if (_cache.tid === tid && _cache.unsub) return;

  if (_cache.unsub) { _cache.unsub(); _cache.unsub = null; }
  _cache.tid    = tid;
  _cache.data   = [];
  _cache.loaded = false;

  _cache.unsub = onSnapshot(
    tenantCol('users'),
    snap => {
      // Filtros:
      //  · sin nombre → residuo anónimo, descartar
      //  · fusionadoCon → doc legacy ya absorbido por un authUid; el canónico
      //    ya está en la lista. Sin este filtro, un cliente que hizo walk-in
      //    (ac_hash) + después login passwordless (authUid) aparecía 2 veces
      //    en el buscador de agenda.
      _cache.data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => (u.nombre || '').trim() && !u.fusionadoCon);
      _cache.loaded = true;
      _emit();
    },
    () => { _cache.loaded = true; _emit(); },
  );
}

export function useClubUsers() {
  const [data,    setData]    = useState(_cache.data);
  const [loading, setLoading] = useState(!_cache.loaded);

  useEffect(() => {
    const cb = (d, loaded) => { setData(d); setLoading(!loaded); };
    _cache.listeners.add(cb);
    _ensureSubscription();
    cb(_cache.data, _cache.loaded); // servir de inmediato lo que haya en caché
    return () => { _cache.listeners.delete(cb); };
    // El listener de Firestore NO se cierra al desmontar: se mantiene vivo
    // durante la sesión a propósito, para que reabrir vistas no relea todo.
  }, []);

  return { data, loading };
}
