'use strict';

// ══════════════════════════════════════════════════════════════════════
//  ELIMINAR MIS DATOS — Derecho de supresión (Ley 19.628 / 21.719 Chile)
//
//  Callable para el cliente final. Ejecuta la baja de datos personales:
//    · Purga  /users/{uid}, /userPublic/{uid}
//    · Purga  /clientes que coincidan por uid, clienteUid o email
//    · Purga  /fcm_tokens del usuario
//    · Anonimiza /citas — se conservan por retención tributaria SII
//      (6 años si hay boleta emitida), pero se remueve toda la PII.
//    · Purga  /bio_users/{uid} (solo cuando aplica al tenant elegance,
//      donde bio_users vive en la raíz compartida con Bioo).
//    · Escribe un asiento en /eliminaciones_log con hashes de uid/email
//      para auditoría (obligatorio bajo 21.719).
//
//  La cuenta Firebase Auth NO se borra: el mismo uid puede tener datos
//  en otro tenant (multi-tenant SaaS). El frontend hace signOut() al
//  terminar; el shell Auth queda sin datos personales asociados.
//
//  Autorización: cualquier usuario autenticado. El uid a borrar es
//  SIEMPRE request.auth.uid — nunca se acepta del payload. Un caller
//  autenticado solo puede purgar sus propios datos.
//
//  Payload:
//    { confirmacion: 'ELIMINAR', tenantId?: 'elegance'|'kronnos'|... }
//
//  Se exponen dos callables (mismo patrón que resto del proyecto):
//    · eliminarMisDatosElegance — fija tenantId='elegance' (raíz)
//    · eliminarMisDatosTenant   — recibe tenantId por payload (subcol.)
//
//  DEPLOY:
//    firebase deploy --only functions:eliminarMisDatosElegance,functions:eliminarMisDatosTenant
// ══════════════════════════════════════════════════════════════════════

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const crypto                 = require('crypto');

const CONFIRMACION_ESPERADA = 'ELIMINAR';
const MAX_BATCH             = 400; // Firestore limita a 500 ops por batch

function hash(v) {
  return crypto.createHash('sha256').update(String(v || '')).digest('hex').slice(0, 16);
}

function basePath(tenantId) {
  return tenantId === 'elegance' ? '' : `tenants/${tenantId}/`;
}

async function commitEnLotes(db, ops) {
  for (let i = 0; i < ops.length; i += MAX_BATCH) {
    const batch = db.batch();
    ops.slice(i, i + MAX_BATCH).forEach(op => {
      if (op.action === 'delete') batch.delete(op.ref);
      else                        batch.update(op.ref, op.data);
    });
    await batch.commit();
  }
}

async function purgeUsuario({ db, base, uid }) {
  const ref  = db.doc(`${base}users/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) return 0;
  await ref.delete();
  return 1;
}

async function purgeUserPublic({ db, base, uid }) {
  const ref  = db.doc(`${base}userPublic/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) return 0;
  await ref.delete();
  return 1;
}

async function purgeClientesMatch({ db, base, uid, email }) {
  const col = db.collection(`${base}clientes`);
  const consultas = [
    col.where('uid',        '==', uid).get().catch(() => ({ docs: [] })),
    col.where('clienteUid', '==', uid).get().catch(() => ({ docs: [] })),
  ];
  if (email) {
    consultas.push(col.where('email', '==', email).get().catch(() => ({ docs: [] })));
  }
  const resultados = await Promise.all(consultas);
  const refs = new Map();
  resultados.forEach(r => (r.docs || []).forEach(d => refs.set(d.ref.path, d.ref)));
  const ops = [...refs.values()].map(ref => ({ ref, action: 'delete' }));
  await commitEnLotes(db, ops);
  return ops.length;
}

async function purgeFcmTokens({ db, base, uid }) {
  const col = db.collection(`${base}fcm_tokens`);
  const snap = await col.where('userId', '==', uid).get().catch(() => ({ docs: [] }));
  const ops  = (snap.docs || []).map(d => ({ ref: d.ref, action: 'delete' }));
  await commitEnLotes(db, ops);
  return ops.length;
}

async function anonimizarCitas({ db, base, uid, email }) {
  const FieldValue = admin.firestore.FieldValue;
  const col = db.collection(`${base}citas`);
  const consultas = [
    col.where('clienteUid', '==', uid).get().catch(() => ({ docs: [] })),
    col.where('clienteId',  '==', uid).get().catch(() => ({ docs: [] })),
  ];
  if (email) {
    consultas.push(col.where('clienteEmail', '==', email).get().catch(() => ({ docs: [] })));
  }
  const resultados = await Promise.all(consultas);
  const refs = new Map();
  resultados.forEach(r => (r.docs || []).forEach(d => refs.set(d.ref.path, d.ref)));

  // Sobrescribimos toda la PII pero preservamos datos operativos/tributarios:
  // fecha, servicio, monto, folio, barbero → necesarios para SII y contabilidad.
  const data = {
    clienteNombre:      'Cliente eliminado',
    clienteEmail:       null,
    clienteUid:         null,
    clienteId:          null,
    clienteTelefono:    null,
    clienteFotoUrl:     null,
    _anonimizadaAt:     FieldValue.serverTimestamp(),
    _anonimizadaMotivo: 'derecho_supresion',
  };
  const ops = [...refs.values()].map(ref => ({ ref, action: 'update', data }));
  await commitEnLotes(db, ops);
  return ops.length;
}

async function purgeBioUsers({ db, uid }) {
  const ref  = db.doc(`bio_users/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) return 0;
  await ref.delete();
  return 1;
}

async function ejecutar({ tenantId, uid, email }) {
  const db     = admin.firestore();
  const base   = basePath(tenantId);
  const inicio = Date.now();

  const conteos = {
    users:             0,
    userPublic:        0,
    clientes:          0,
    fcmTokens:         0,
    citasAnonimizadas: 0,
    bioUsers:          0,
  };

  const resultados = await Promise.allSettled([
    purgeUsuario      ({ db, base, uid       }).then(n => conteos.users             = n),
    purgeUserPublic   ({ db, base, uid       }).then(n => conteos.userPublic        = n),
    purgeClientesMatch({ db, base, uid, email }).then(n => conteos.clientes          = n),
    purgeFcmTokens    ({ db, base, uid       }).then(n => conteos.fcmTokens         = n),
    anonimizarCitas   ({ db, base, uid, email }).then(n => conteos.citasAnonimizadas = n),
    tenantId === 'elegance'
      ? purgeBioUsers({ db, uid }).then(n => conteos.bioUsers = n)
      : Promise.resolve(),
  ]);

  const errores = resultados
    .filter(r => r.status === 'rejected')
    .map(r => (r.reason && r.reason.message) || String(r.reason));

  // Asiento de auditoría — el emailHash permite re-atender solicitudes ARCO
  // sin volver a exponer PII (Ley 21.719 art. 17 inc. 3).
  const eventoRef = admin.firestore().collection('eliminaciones_log').doc();
  await eventoRef.set({
    tenantId,
    uidHash:     hash(uid),
    emailHash:   email ? hash(email.toLowerCase()) : null,
    conteos,
    errores,
    duracionMs:  Date.now() - inicio,
    procesadaAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(
    `[eliminarMisDatos] tenant=${tenantId} uidHash=${hash(uid)} ` +
    `conteos=${JSON.stringify(conteos)} errores=${errores.length}`
  );

  return { ok: true, eventoId: eventoRef.id, conteos, errores };
}

function crearCallable(tenantIdFijo) {
  return onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated',
        'Debes iniciar sesión para eliminar tus datos.');
    }
    const { confirmacion } = request.data || {};
    if (confirmacion !== CONFIRMACION_ESPERADA) {
      throw new HttpsError('invalid-argument',
        `Falta confirmación explícita. Envía { confirmacion: "${CONFIRMACION_ESPERADA}" }.`);
    }

    const tenantId = tenantIdFijo || String(request.data?.tenantId || '').trim();
    if (!tenantId) {
      throw new HttpsError('invalid-argument', 'tenantId requerido.');
    }

    const uid   = request.auth.uid;
    const email = (request.auth.token?.email || '').toLowerCase() || null;

    return await ejecutar({ tenantId, uid, email });
  });
}

exports.eliminarMisDatosElegance = crearCallable('elegance');
exports.eliminarMisDatosTenant   = crearCallable(null);
