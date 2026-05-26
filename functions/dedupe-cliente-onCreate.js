'use strict';

// functions/dedupe-cliente-onCreate.js
// ─────────────────────────────────────────────────────────────────
//  DEDUP AUTOMÁTICO AL REGISTRARSE UN CLIENTE
//
//  Dispara cuando se crea un doc en /tenants/{tid}/users/{uid} o
//  /users/{uid} (elegance). Si el cliente recién registrado
//  comparte email con un perfil "legacy" creado por la migración
//  de AgendaPro (users/{telefono} con uid === telefono o
//  importedFrom === 'agendapro'), fusiona los sellos/historial del
//  legacy al nuevo doc y borra el legacy de users/ y clientes/.
//
//  Idempotente: el script manual (migraciones/dedupe-chameleon-...)
//  sigue funcionando como red de seguridad — esta CF solo cubre
//  el caso "nuevo registro" para evitar correr el script a mano.
//
//  Exports:
//    dedupeOnCreateElegance — trigger /users/{uid}
//    dedupeOnCreateTenant   — trigger /tenants/{tid}/users/{uid}
//
//  DEPLOY:
//    firebase deploy --only \
//      functions:dedupeOnCreateElegance,functions:dedupeOnCreateTenant
// ─────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { FieldValue }        = require('firebase-admin/firestore');

const db = admin.firestore();

function colecciones(tenantId) {
  const isElegance = tenantId === 'elegance';
  return {
    users:    db.collection(isElegance ? 'users'    : `tenants/${tenantId}/users`),
    clientes: db.collection(isElegance ? 'clientes' : `tenants/${tenantId}/clientes`),
  };
}

function isLegacyDoc(docId, data) {
  return data.uid === docId || data.importedFrom === 'agendapro';
}

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

async function procesarDedup({ tenantId, uid, data }) {
  // Si el doc creado ES un legacy (lo creó la migración), no es un registro real.
  if (isLegacyDoc(uid, data)) {
    logger.info(`[Dedup] ${tenantId}/${uid}: doc legacy, sin acción.`);
    return;
  }

  const email = (data.email || '').toLowerCase().trim();
  if (!email) {
    logger.info(`[Dedup] ${tenantId}/${uid}: sin email, no se puede dedupar.`);
    return;
  }

  const cols = colecciones(tenantId);

  // Buscar otros docs con el mismo email
  const q = await cols.users.where('email', '==', email).limit(10).get();
  const legacies = q.docs.filter(d => d.id !== uid && isLegacyDoc(d.id, d.data()));

  if (legacies.length === 0) {
    logger.info(`[Dedup] ${tenantId}/${uid}: sin perfiles legacy para email ${email}.`);
    return;
  }

  logger.info(`[Dedup] ${tenantId}/${uid}: encontrados ${legacies.length} legacy(s) para email ${email}. Fusionando…`);

  // Acumular cambios
  const sellosHist = legacies.reduce((s, l) => s + (Number(l.data().sellosHistoricos) || 0), 0);
  const sellosDisp = legacies.reduce((s, l) => s + (Number(l.data().sellosDisponibles) || 0), 0);
  const stamps     = legacies.reduce((s, l) => s + (Number(l.data().stamps)            || 0), 0);
  const historial  = legacies.flatMap(l => l.data().historialSellos || []);
  const fechaOrig  = legacies.map(l => l.data().fechaRegistroOriginal).filter(Boolean)[0];
  const telPrev    = legacies.map(l => l.data().telefono).filter(t => t && t !== data.telefono)[0];

  const mergeUpdate = {
    importedFrom: 'agendapro',
    dedupedAt:    FieldValue.serverTimestamp(),
    updatedAt:    FieldValue.serverTimestamp(),
  };
  if (sellosHist) mergeUpdate.sellosHistoricos  = FieldValue.increment(sellosHist);
  if (sellosDisp) mergeUpdate.sellosDisponibles = FieldValue.increment(sellosDisp);
  if (stamps)     mergeUpdate.stamps            = FieldValue.increment(stamps);
  if (historial.length)        mergeUpdate.historialSellos       = FieldValue.arrayUnion(...historial);
  if (fechaOrig && !data.fechaRegistroOriginal) mergeUpdate.fechaRegistroOriginal = fechaOrig;
  if (telPrev   && !data.telefonoAnterior)      mergeUpdate.telefonoAnterior      = telPrev;

  // IDs de docs en clientes/ a borrar
  const telefonosLegacy = [
    ...new Set(legacies.flatMap(l => [l.data().telefono, l.id]).map(normalizePhone).filter(Boolean)),
  ];

  // Aplicar en batch
  const batch = db.batch();
  batch.set(cols.users.doc(uid), mergeUpdate, { merge: true });
  legacies.forEach(l => batch.delete(l.ref));
  telefonosLegacy.forEach(tel => batch.delete(cols.clientes.doc(tel)));

  try {
    await batch.commit();
    logger.info(`[Dedup] ${tenantId}/${uid}: OK. Borrados ${legacies.length} legacy(s) en users/ + ${telefonosLegacy.length} en clientes/. Sellos acumulados: +${sellosHist}.`);
  } catch (e) {
    logger.error(`[Dedup] ${tenantId}/${uid}: error al fusionar:`, e);
  }
}

// ── Export 1: elegance root (/users/{uid}) ────────────────────────
exports.dedupeOnCreateElegance = onDocumentCreated('users/{uid}', async (event) => {
  const uid  = event.params.uid;
  const data = event.data?.data();
  if (!data) return null;

  try {
    await procesarDedup({ tenantId: 'elegance', uid, data });
  } catch (err) {
    logger.error(`[Dedup] elegance/${uid}: error inesperado:`, err);
  }
  return null;
});

// ── Export 2: multi-tenant (/tenants/{tid}/users/{uid}) ───────────
exports.dedupeOnCreateTenant = onDocumentCreated(
  'tenants/{tid}/users/{uid}',
  async (event) => {
    const { tid, uid } = event.params;
    const data = event.data?.data();
    if (!data) return null;

    try {
      await procesarDedup({ tenantId: tid, uid, data });
    } catch (err) {
      logger.error(`[Dedup] ${tid}/${uid}: error inesperado:`, err);
    }
    return null;
  },
);
