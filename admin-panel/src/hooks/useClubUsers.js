import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { tenantCol, resolveTenantId } from '../lib/tenantUtils';

// ─────────────────────────────────────────────────────────────────────────
//  useClubUsers — suscripción COMPARTIDA y persistente por sesión a los
//  clientes del tenant. Une DOS colecciones:
//
//   • `users`    → cuenta del club (fuente de verdad — sellos, packs, uid)
//   • `clientes` → mirror walk-in indexado por teléfono (creado por CFs
//                  como dedupe-cliente-onCreate cuando alguien agenda sin
//                  tener cuenta). En tenants normales los CFs mantienen
//                  el mirror alineado; en tenants con datos legacy o
//                  registros passwordless sin teléfono, los mirrors
//                  divergen y el mismo humano puede estar en solo una.
//
//  Sin el merge, cada vista veía solo una colección: los walk-ins sin
//  cuenta desaparecían del panel /clientes, y los users passwordless sin
//  teléfono desaparecían del buscador de agenda. Ahora ambas vistas ven
//  el pool completo, dedupeado por (teléfono normalizado, email) con
//  `users` como base preferida cuando hay match.
//
//  Este cache mantiene UN par de listeners vivos durante la sesión: los
//  remounts reusan los datos en memoria y Firestore solo cobra los deltas.
//  Los listeners arrancan al primer uso (los tenants que no abran la
//  vista Clientes / GiftCards no pagan).
// ─────────────────────────────────────────────────────────────────────────

const _cache = {
  tid:             null,
  users:           [],
  clientes:        [],
  data:            [],
  loadedUsers:     false,
  loadedClientes:  false,
  unsubUsers:      null,
  unsubClientes:   null,
  listeners:       new Set(),
};

const _normPhone = (t) => (t || '').replace(/\D/g, '');

function _merge(users, clientes) {
  const seenTel   = new Map();
  const seenEmail = new Map();
  const out = [];
  users.forEach(u => {
    const tel   = _normPhone(u.telefono);
    const email = (u.email || '').toLowerCase();
    if (tel   && seenTel.has(tel))     return;
    if (email && seenEmail.has(email)) return;
    out.push(u);
    if (tel)   seenTel.set(tel, u);
    if (email) seenEmail.set(email, u);
  });
  clientes.forEach(c => {
    const tel   = _normPhone(c.telefono || c.id);
    const email = (c.email || '').toLowerCase();
    if (tel   && seenTel.has(tel))     return;
    if (email && seenEmail.has(email)) return;
    // Marcamos origen para que consumers puedan distinguir walk-ins puros.
    // No renombra `id` (docId real del mirror clientes, típicamente el tel).
    out.push({ ...c, _sourceCol: 'clientes' });
    if (tel)   seenTel.set(tel, c);
    if (email) seenEmail.set(email, c);
  });
  return out;
}

function _recompute() {
  _cache.data = _merge(_cache.users, _cache.clientes);
}

function _loaded() {
  return _cache.loadedUsers && _cache.loadedClientes;
}

function _emit() {
  const done = _loaded();
  _cache.listeners.forEach(cb => cb(_cache.data, done));
}

function _ensureSubscription() {
  const tid = resolveTenantId();
  if (_cache.tid === tid && (_cache.unsubUsers || _cache.unsubClientes)) return;

  if (_cache.unsubUsers)    { _cache.unsubUsers();    _cache.unsubUsers    = null; }
  if (_cache.unsubClientes) { _cache.unsubClientes(); _cache.unsubClientes = null; }
  _cache.tid            = tid;
  _cache.users          = [];
  _cache.clientes       = [];
  _cache.data           = [];
  _cache.loadedUsers    = false;
  _cache.loadedClientes = false;

  _cache.unsubUsers = onSnapshot(
    tenantCol('users'),
    snap => {
      _cache.users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _cache.loadedUsers = true;
      _recompute();
      _emit();
    },
    () => { _cache.loadedUsers = true; _emit(); },
  );
  _cache.unsubClientes = onSnapshot(
    tenantCol('clientes'),
    snap => {
      _cache.clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _cache.loadedClientes = true;
      _recompute();
      _emit();
    },
    () => { _cache.loadedClientes = true; _emit(); },
  );
}

export function useClubUsers() {
  const [data,    setData]    = useState(_cache.data);
  const [loading, setLoading] = useState(!_loaded());

  useEffect(() => {
    const cb = (d, loaded) => { setData(d); setLoading(!loaded); };
    _cache.listeners.add(cb);
    _ensureSubscription();
    cb(_cache.data, _loaded()); // servir de inmediato lo que haya en caché
    return () => { _cache.listeners.delete(cb); };
    // Los listeners de Firestore NO se cierran al desmontar: se mantienen
    // vivos durante la sesión a propósito, para que reabrir Clientes /
    // GiftCards no relea todo.
  }, []);

  return { data, loading };
}
