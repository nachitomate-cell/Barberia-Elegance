'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  staff-eliminar.js — staffEliminarAcceso
//
//  "Eliminar" en Equipo era un borrado a medias: deleteDoc del doc principal
//  y nada más. Quedaban vivos el doc-espejo por UID, la cuenta de Firebase
//  Auth y los claims {role, tenantId} — así que el "eliminado" seguía
//  pudiendo entrar a la agenda y conservaba lectura staff del local, y su
//  tarjeta podía reaparecer. Caso real: David en chameleon, borrado "hace
//  tiempo", hizo login el 07-08-2026 y volvió a aparecer en el equipo.
//
//  Esta callable borra TODO lo que constituye el acceso:
//    1. El doc principal del barbero.
//    2. Todos los doc-espejo (_mainDocId → docId) y el doc por UID.
//    3. Los claims de la cuenta Auth (si apuntan a ESTE tenant) + revoca
//       los refresh tokens para matar las sesiones abiertas.
//
//  La cuenta Auth NO se deshabilita: por el hub multi-tenant una misma
//  cuenta puede ser staff de otro local; sin claims de este tenant y sin
//  docs de barbero, las rules ya no le dan ningún acceso acá.
//
//  Autorización: puedeAdministrarTenant (superadmin, admin de marca o admin
//  del propio tenant) — mismo criterio que crearAccesoStaff. Guardas: no
//  puedes eliminarte a ti mismo ni a una cuenta protegida.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { puedeAdministrarTenant } = require('./brand-admins');
const { esCuentaProtegida, MENSAJE_PROTEGIDA } = require('./lib/cuentas-protegidas');

const db = admin.firestore();

exports.staffEliminarAcceso = onCall({ region: 'us-central1', cors: true }, async (request) => {
  const callerEmail = (request.auth?.token?.email || '').toLowerCase();
  const { tenantId, docId } = request.data || {};
  if (!tenantId || typeof tenantId !== 'string') throw new HttpsError('invalid-argument', 'tenantId requerido.');
  if (!docId || typeof docId !== 'string')       throw new HttpsError('invalid-argument', 'docId requerido.');
  if (!puedeAdministrarTenant(request, tenantId)) {
    throw new HttpsError('permission-denied', 'Solo el admin del local puede eliminar miembros.');
  }

  const col = tenantId === 'elegance'
    ? db.collection('barberos')
    : db.collection(`tenants/${tenantId}/barberos`);

  const mainSnap = await col.doc(docId).get();
  if (!mainSnap.exists) throw new HttpsError('not-found', 'Ese miembro ya no existe.');
  const data  = mainSnap.data() || {};
  const email = String(data.email || '').trim().toLowerCase();

  if (esCuentaProtegida(email)) throw new HttpsError('permission-denied', MENSAJE_PROTEGIDA);
  if (email && email === callerEmail) {
    throw new HttpsError('failed-precondition', 'No puedes eliminarte a ti mismo. Pide a otro admin que lo haga.');
  }

  // ── 1-2. Todos los docs de esta persona: principal + espejos + doc-por-uid ──
  const aBorrar = new Set([docId]);
  const espejos = await col.where('_mainDocId', '==', docId).get();
  espejos.forEach(d => aBorrar.add(d.id));
  for (const uid of [data.authUid, data.uid]) {
    if (uid && typeof uid === 'string') aBorrar.add(uid);
  }

  // ── 3. Resolver la cuenta Auth (uid explícito o por email) ──
  const uids = new Set();
  for (const cand of [data.authUid, data.uid, docId]) {
    if (!cand || typeof cand !== 'string') continue;
    try { uids.add((await admin.auth().getUser(cand)).uid); } catch (_) {}
  }
  if (email) {
    try { uids.add((await admin.auth().getUserByEmail(email)).uid); } catch (_) {}
  }

  let cuentasCerradas = 0;
  for (const uid of uids) {
    try {
      const u = await admin.auth().getUser(uid);
      if (esCuentaProtegida(String(u.email || '').toLowerCase())) continue;
      // Solo se tocan claims que apuntan a ESTE tenant: si la cuenta es staff
      // de otro local (hub), sus claims son de allá y no nos pertenecen.
      if (u.customClaims?.tenantId === tenantId) {
        await admin.auth().setCustomUserClaims(uid, null);
        await admin.auth().revokeRefreshTokens(uid);
        cuentasCerradas++;
      }
      // El doc barberos/{uid} de este tenant se borra igual, tenga o no claims.
      aBorrar.add(uid);
    } catch (_) {}
  }

  const batch = db.batch();
  let docsBorrados = 0;
  for (const id of aBorrar) {
    const s = await col.doc(id).get();
    if (s.exists) { batch.delete(col.doc(id)); docsBorrados++; }
  }
  await batch.commit();

  logger.info(`[staffEliminarAcceso] ${tenantId}: "${data.nombre || docId}" eliminado por ${callerEmail} — ${docsBorrados} docs, ${cuentasCerradas} cuenta(s) cerradas`);
  return { ok: true, docsBorrados, cuentasCerradas };
});
