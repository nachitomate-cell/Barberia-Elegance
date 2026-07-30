'use strict';

// functions/brand-admins.js
// ─────────────────────────────────────────────────────────────────────────────
//  Fuente de verdad SERVER-SIDE de quién puede administrar un tenant.
//
//  Un "admin de marca" es un dueño con acceso 'admin' a varias sedes del mismo
//  grupo sin estar registrado como barbero en cada una. Su permiso NO vive en
//  los custom claims (que son de un solo tenant: { role, tenantId }), así que
//  cualquier callable que autorice mirando solo el claim lo rechaza aunque el
//  panel lo haya dejado entrar.
//
//  Ese fue exactamente el bug de 2026-07-30: `cambiarPasswordStaff` sí tenía su
//  copia del mapa, `enviarLinkAccesoStaff` y `crearAccesoStaff` no. Resultado:
//  Claudio (admin de marca Kronnos, claim tenantId=kronnos_limache) podía fijar
//  contraseñas en Woman pero al enviar el enlace por email veía
//  "Solo el admin del local puede enviar enlaces de acceso".
//
//  Por eso el mapa se DERIVA de acá y no se copia: toda callable que necesite
//  "¿este caller manda en este tenant?" usa puedeAdministrarTenant().
//  El espejo del cliente (admin-panel/src/contexts/AuthContext.jsx BRAND_ADMINS)
//  es otro bundle y sigue aparte — es solo UI, el enforcement real es acá y en
//  firestore.rules.
// ─────────────────────────────────────────────────────────────────────────────

const SUPERADMINS = ['ignaciiio.mate@gmail.com'];

// Incluye el marcador unificado 'kronnos' (Camino 1 D2) además de las 3 sedes
// legacy hasta el cutover D4-D5.
const BRAND_ADMINS = {
  'administracionkronnos@gmail.com': ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
  'claudio.burgos91@gmail.com':      ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
  'grupo.kratos.spa@gmail.com':      ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
};

function esSuperadmin(email) {
  return SUPERADMINS.includes(String(email || '').toLowerCase());
}

function esBrandAdmin(email, tenantId) {
  return (BRAND_ADMINS[String(email || '').toLowerCase()] || []).includes(tenantId);
}

/**
 * Sedes concretas de un admin de marca, para el hub (app.synaptechspa.cl).
 * Se deriva quitando el marcador unificado 'kronnos': el selector muestra
 * locales reales, no la marca.
 */
function sedesDeMarca(email) {
  return (BRAND_ADMINS[String(email || '').toLowerCase()] || []).filter(t => t !== 'kronnos');
}

/**
 * ¿El caller puede administrar `tenantId`?
 *   · superadmin SynapTech (bootstrap)
 *   · admin de marca con esa sede en su lista
 *   · admin del propio tenant según custom claims
 *
 * @param {object} request  el request de la callable (onCall)
 * @param {string} tenantId el tenant objetivo (viene en request.data)
 */
function puedeAdministrarTenant(request, tenantId) {
  if (!request.auth) return false;
  const email  = String(request.auth.token?.email || '').toLowerCase();
  const role   = request.auth.token?.role;
  const tenant = request.auth.token?.tenantId;
  return esSuperadmin(email)
      || esBrandAdmin(email, tenantId)
      || (role === 'admin' && tenant === tenantId);
}

module.exports = {
  SUPERADMINS,
  BRAND_ADMINS,
  esSuperadmin,
  esBrandAdmin,
  sedesDeMarca,
  puedeAdministrarTenant,
};
