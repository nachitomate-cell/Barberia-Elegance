'use strict';

// functions/lib/cuentas-protegidas.js
// ─────────────────────────────────────────────────────────────────────────────
//  Cuentas de SISTEMA cuya contraseña NO se puede cambiar desde el panel.
//
//  El caso que motivó esto: `practica@synaptechspa.cl` es la cuenta dueña del
//  local de práctica — el entorno donde el equipo comercial aprende haciendo
//  clic en TODO, incluido "crear staff" y "cambiar contraseña". Cualquiera de
//  esos botones, apuntado al correo del dueño, le reescribe la clave y deja a
//  todo el mundo afuera del panel sin ningún aviso. Pasó dos veces (04 y
//  06-ago-2026) y desde el panel es indistinguible de "la clave está mala".
//
//  Estas cuentas se administran SOLO desde el servidor:
//      node scripts/seed-practica.js
//
//  No es una medida de seguridad (quien tenga el service-account puede hacer
//  lo que quiera): es un candado contra el pie propio.
// ─────────────────────────────────────────────────────────────────────────────

const CUENTAS_PROTEGIDAS = new Set([
  'practica@synaptechspa.cl',
  // Superadmin: una clave pisada acá deja fuera TODOS los tenants y /admin a
  // la vez (incidente 06-ago-2026). Se repone solo con el Admin SDK local.
  'ignaciiio.mate@gmail.com',
]);

function esCuentaProtegida(email) {
  return CUENTAS_PROTEGIDAS.has(String(email || '').trim().toLowerCase());
}

/* Mensaje único para las tres callables que pueden pisar una clave. Explica
   qué hacer en vez de solo negar, porque quien lo vea va a ser Ignacio o
   alguien del equipo comercial, no un atacante. */
const MENSAJE_PROTEGIDA =
  'Esta es una cuenta de sistema y su contraseña no se cambia desde el panel. ' +
  'Se repone en el servidor con: node scripts/seed-practica.js';

module.exports = { esCuentaProtegida, MENSAJE_PROTEGIDA, CUENTAS_PROTEGIDAS };
