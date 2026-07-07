'use strict';

// functions/lib/kronnos-marca.js
// ─────────────────────────────────────────────────────────────────
//  KRONNOS · Camino 1.5 — helper marca-aware para Cloud Functions
//
//  Los tenants Kronnos legacy (kronnos_penablanca/limache/woman)
//  comparten fidelización a nivel marca. Las colecciones marca-level
//  viven en tenants/kronnos/*, no en tenants/kronnos_<sede>/*.
//  Las operacionales (servicios, barberos, citas, settings) siguen
//  per-sede como en el resto de tenants.
//
//  Espejo del redirect implementado en firebaseUtils.js y
//  admin-panel/src/lib/tenantUtils.js. Uso desde CFs:
//
//      const marca = require('./lib/kronnos-marca');
//      const marcaTid  = marca.marcaAwareTenant(tenantId, 'users');
//      const sedeId    = marca.sedeIdFromLegacy(tenantId);
//
//  Reglas cerradas con Dexter (2026-07-06):
//    • Sellos suman cross-sede a nivel cliente-marca.
//    • Premio se canjea en la sede predominante en sellos del cliente.
//    • Tiebreak A (empate): se canjea en la sede donde el cliente lo
//      pide ese día (sedeCanje enviada por el cliente en la CF).
// ─────────────────────────────────────────────────────────────────

// Tenants Kronnos legacy → sedeId equivalente.
const LEGACY_KRONNOS_TO_SEDE = {
  kronnos_penablanca: 'penablanca',
  kronnos_limache:    'limache',
  kronnos_woman:      'woman',
};

// Nombre del tenant marca cuando el origen es Kronnos legacy.
const MARCA_TENANT = 'kronnos';

// Colecciones marca-level: viven en tenants/kronnos/* para pool cross-sede.
const MARCA_COLLECTIONS = new Set([
  'users',
  'sellos',
  'premios',
  'rangos',
  'canjes',
  // clientes es lookup por teléfono cross-sede: un mismo cliente atendido en
  // varias sedes debe ser un solo doc en tenants/kronnos/clientes/{tel}.
  'clientes',
]);

// Sedes válidas — para validar sedeCanje del payload cliente.
const KRONNOS_SEDES = new Set(['penablanca', 'limache', 'woman']);

// Un tenantId es Kronnos legacy si mapea a una sede conocida.
function isKronnosLegacy(tenantId) {
  return tenantId in LEGACY_KRONNOS_TO_SEDE;
}

// Devuelve la sede correspondiente al tenant legacy, o null si no aplica.
function sedeIdFromLegacy(tenantId) {
  return LEGACY_KRONNOS_TO_SEDE[tenantId] || null;
}

// Redirige tenant + colección al pool marca cuando corresponde.
// Ejemplo: (kronnos_penablanca, 'users') → 'kronnos'.
// Ejemplo: (kronnos_penablanca, 'citas') → 'kronnos_penablanca' (per-sede).
// Ejemplo: (elegance, 'users') → 'elegance' (sin cambio).
function marcaAwareTenant(tenantId, colName) {
  if (isKronnosLegacy(tenantId) && MARCA_COLLECTIONS.has(colName)) {
    return MARCA_TENANT;
  }
  return tenantId;
}

// Sede final de canje aplicando regla 3 + tiebreak A.
// - Si hay sede predominante única → esa sede.
// - Si empate → sedeCanjeSolicitada (donde el cliente pide canjear).
// sellosPorSede: { penablanca: N, limache: N, woman: N } (leído del user doc)
// sedeCanjeSolicitada: sede enviada por el cliente en el payload de crearCanje.
function resolverSedeCanje(sellosPorSede, sedeCanjeSolicitada) {
  const conteo = sellosPorSede || {};
  let max = 0, ganador = null, empate = false;
  for (const s of KRONNOS_SEDES) {
    const n = Number(conteo[s]) || 0;
    if (n > max)      { max = n; ganador = s; empate = false; }
    else if (n === max && n > 0) empate = true;
  }
  if (max > 0 && !empate) return ganador;
  // Empate o sin sellos: aplica tiebreak A (sede solicitada).
  if (sedeCanjeSolicitada && KRONNOS_SEDES.has(sedeCanjeSolicitada)) return sedeCanjeSolicitada;
  return null;
}

module.exports = {
  LEGACY_KRONNOS_TO_SEDE,
  MARCA_TENANT,
  MARCA_COLLECTIONS,
  KRONNOS_SEDES,
  isKronnosLegacy,
  sedeIdFromLegacy,
  marcaAwareTenant,
  resolverSedeCanje,
};
