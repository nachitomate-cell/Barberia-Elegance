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
//
//  ⚠️ CICLO DE VIDA (1-ago-2026). Antes el listener quedaba abierto TODA la
//  sesión aunque nadie lo estuviera mirando: en Infinity son 1.436 usuarios
//  (~2 MB ya como objetos JS) recibiendo deltas y re-renderizando a sus
//  suscriptores durante horas, y Chrome terminó marcando la pestaña por
//  consumo de recursos. Ahora hay dos tiempos, que preservan lo que hacía
//  bueno al diseño original y sueltan lo que sobraba:
//
//    · Sin suscriptores 3 min  → se CIERRA el listener. Deja de recibir
//      deltas y de re-renderizar, pero los datos quedan en memoria: volver a
//      Clientes o a la Agenda sigue siendo instantáneo.
//    · Sin suscriptores 15 min → se VACÍA la caché. Ahí sí se devuelve la
//      memoria; la próxima visita paga una lectura completa, que a esa altura
//      es lo correcto (probablemente el panel quedó abierto sin uso).
//
//  Los dos plazos se cancelan apenas alguien vuelve a suscribirse, así que
//  navegar entre vistas no cierra ni reabre nada.
//
//  Por qué 3 min y no 30 s: re-suscribirse cuesta una lectura COMPLETA de la
//  colección (1.436 documentos en Infinity). Con un plazo corto, un dueño que
//  entra y sale de Clientes durante el día pagaría esa lectura decenas de
//  veces — se habría cambiado un problema de memoria por uno de facturación.
//  Tres minutos cubren el ir y venir normal entre vistas; quince, la pestaña
//  que quedó abierta y olvidada, que es el caso que motivó todo esto.
// ─────────────────────────────────────────────────────────────────────────

const CIERRE_MS = 3 * 60_000;    // cerrar listener tras quedarse sin suscriptores
const PURGA_MS  = 15 * 60_000;   // liberar los datos si sigue sin usarse

const _cache = {
  tid:       null,
  data:      [],
  loaded:    false,
  unsub:     null,
  listeners: new Set(),
};
let _tCierre = null;
let _tPurga  = null;

function _cancelarTimers() {
  if (_tCierre) { clearTimeout(_tCierre); _tCierre = null; }
  if (_tPurga)  { clearTimeout(_tPurga);  _tPurga  = null; }
}

function _programarLiberacion() {
  _cancelarTimers();
  _tCierre = setTimeout(() => {
    if (_cache.listeners.size) return;           // volvió alguien: no tocar
    if (_cache.unsub) { _cache.unsub(); _cache.unsub = null; }
  }, CIERRE_MS);
  _tPurga = setTimeout(() => {
    if (_cache.listeners.size) return;
    _cache.data   = [];
    _cache.loaded = false;
  }, PURGA_MS);
}

function _emit() {
  _cache.listeners.forEach(cb => cb(_cache.data, _cache.loaded));
}

function _ensureSubscription() {
  const tid = resolveTenantId();
  _cancelarTimers();                       // alguien volvió: nada que liberar
  if (_cache.tid === tid && _cache.unsub) return;

  if (_cache.unsub) { _cache.unsub(); _cache.unsub = null; }
  // Al RE-suscribir en el mismo tenant se conservan los datos: si se
  // vaciaran, volver a Clientes mostraría la lista en blanco hasta que
  // llegue el primer snapshot. Solo se limpia al cambiar de tenant, donde
  // los datos anteriores son de otro local.
  const mismoTenant = _cache.tid === tid;
  _cache.tid = tid;
  if (!mismoTenant) { _cache.data = []; _cache.loaded = false; }

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
    return () => {
      _cache.listeners.delete(cb);
      // Último en salir apaga la luz: sin nadie mirando, el listener se
      // cierra a los 3 min y los datos se liberan a los 15 (ver arriba).
      if (_cache.listeners.size === 0) _programarLiberacion();
    };
  }, []);

  return { data, loading };
}
