import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { tenantCol, resolveTenantId } from '../lib/tenantUtils';

// ─────────────────────────────────────────────────────────────────────────
//  useClubUsers — suscripción COMPARTIDA y persistente por sesión a la
//  colección `users` del tenant.
//
//  Por qué: la vista Clientes necesita TODOS los clientes en memoria (KPIs,
//  tiers, riesgo, migrados, búsqueda) → no se puede paginar con cursor sin
//  romper esos agregados. Con un useCollection normal, cada vez que se abre
//  la vista se vuelve a leer la colección completa.
//
//  Esta caché de módulo mantiene UN solo listener vivo durante la sesión: la
//  lectura completa ocurre una vez (al primer uso) y los remounts reusan los
//  datos en memoria; luego Firestore solo cobra las lecturas de los docs que
//  cambian (delta reads). El listener arranca únicamente cuando se usa por
//  primera vez (no en el arranque de la app), así los tenants sin Club no pagan.
// ─────────────────────────────────────────────────────────────────────────

let _cache = {
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
  if (_cache.tid === tid && _cache.unsub) return; // ya activa para este tenant

  // Tenant cambió (o primer uso) → reiniciar la suscripción
  if (_cache.unsub) { _cache.unsub(); _cache.unsub = null; }
  _cache.tid    = tid;
  _cache.data   = [];
  _cache.loaded = false;

  _cache.unsub = onSnapshot(
    tenantCol('users'),
    snap => {
      _cache.data   = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    // durante la sesión a propósito, para que reabrir Clientes no relea todo.
  }, []);

  return { data, loading };
}
