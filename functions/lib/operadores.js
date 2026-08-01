'use strict';

// functions/lib/operadores.js
// ─────────────────────────────────────────────────────────────────────────────
//  QUIÉN OPERA LA PLATAFORMA (no confundir con los roles DE un local)
//
//  Dos niveles, y la diferencia es la plata:
//
//    bootstrap → Ignacio. Todo, incluidos los ingresos y la facturación.
//    socio     → socio developer. Opera la plataforma completa (locales,
//                WhatsApp, staff, kill switch) pero NO ve los números del
//                negocio: ingresos proyectados, cuotas, estado de pago.
//
//  ⚠️ El candado de verdad son las REGLAS, no la UI. `loadIncomeProjection`
//  lee `_billing` directo desde el navegador, así que esconder la tarjeta
//  dejaría el dato a un `collection('_billing').get()` de distancia en la
//  consola. Por eso `_billing` sigue siendo `esBootstrap()` en
//  firestore.rules y el socio simplemente no puede leerla.
//  Misma lección que dejó el rol `recepcion`: esconder el ítem NO cierra
//  la puerta.
//
//  ⚠️ Lista espejo: la copia del navegador vive en `firebaseUtils.js`
//  (getRol / esSocioDeveloper). Si agregas o quitas a alguien, tócalo en los
//  DOS lados — el guard `npm run check:operadores` lo verifica.
// ─────────────────────────────────────────────────────────────────────────────

const BOOTSTRAP = ['ignaciiio.mate@gmail.com'];
// 2026-07-31: acceso de Gonzalo Simpson revocado por Ignacio (cuenta Auth
// eliminada también). La lista queda vacía, no se borra: es el slot donde
// entra el próximo socio, y el guard del espejo en firebaseUtils.js la exige.
const SOCIOS    = [];

const norm = (email) => String(email || '').toLowerCase().trim();

/** Ignacio. Acceso total, incluida la plata. */
function esBootstrap(email) {
  return BOOTSTRAP.includes(norm(email));
}

/** Socio developer: opera todo menos los números del negocio. */
function esSocio(email) {
  return SOCIOS.includes(norm(email));
}

/** Cualquiera de los dos. Es el gate por defecto de /admin y sus callables:
 *  úsalo salvo que el endpoint exponga ingresos o facturación. */
function esOperador(email) {
  return esBootstrap(email) || esSocio(email);
}

/** Igual que arriba pero leyendo el request de un callable. */
function esOperadorReq(req) {
  return esOperador(req && req.auth && req.auth.token && req.auth.token.email);
}
function esBootstrapReq(req) {
  return esBootstrap(req && req.auth && req.auth.token && req.auth.token.email);
}

module.exports = {
  BOOTSTRAP, SOCIOS,
  esBootstrap, esSocio, esOperador,
  esOperadorReq, esBootstrapReq,
};
