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

// Devuelve TODAS las variantes razonables de un teléfono para hacer lookups
// robustos. Esto cubre los casos:
//   - Migración guardó IDs con '+' (ej. '+56982682794')
//   - Nuevo registro usa otro formato (sin '+', con/sin código de país, con espacios)
//   - Cliente escribió +56 9 8268 2794 vs +56982682794 vs 982682794
function phoneVariants(rawPhone) {
  const variants = new Set();
  if (!rawPhone) return [];
  const raw  = String(rawPhone).trim();
  const norm = raw.replace(/\D/g, '');
  if (raw)  variants.add(raw);
  if (norm) {
    variants.add(norm);
    variants.add('+' + norm);
    // Chile: 56XXXXXXXXX ↔ XXXXXXXXX (móvil 9 dígitos)
    if (norm.startsWith('56') && norm.length >= 10) {
      const sin56 = norm.slice(2);
      variants.add(sin56);
      variants.add('+' + sin56);
    }
    if (!norm.startsWith('56') && norm.length === 9) {
      variants.add('56' + norm);
      variants.add('+56' + norm);
    }
  }
  return [...variants].filter(Boolean);
}

async function procesarDedup({ tenantId, uid, data }) {
  // Silenciosos (estos paths disparan en cada user create sin hacer nada):
  if (isLegacyDoc(uid, data)) return;
  const email   = (data.email    || '').toLowerCase().trim();
  const telNorm = normalizePhone(data.telefono);
  if (!email && !telNorm) return;

  const cols = colecciones(tenantId);
  const legaciesMap = new Map(); // dedup por doc.id en caso de match cruzado

  // 1) Buscar legacies por email (cuando el cliente conserva email)
  if (email) {
    const q = await cols.users.where('email', '==', email).limit(10).get();
    q.docs.forEach(d => {
      if (d.id !== uid && isLegacyDoc(d.id, d.data())) legaciesMap.set(d.id, d);
    });
  }

  // 2) Buscar legacies por teléfono normalizado (cuando el email es distinto o ausente,
  //    pero el cliente conserva el mismo número que tenía en AgendaPro).
  //    Probamos VARIAS variantes porque la migración usó el formato original
  //    (con '+', sin normalizar) y el nuevo registro puede traer otro.
  if (data.telefono) {
    const variants = phoneVariants(data.telefono);

    // 2a) Match por doc.id (el legacy tiene id == su telefono tal cual del Excel).
    const idLookups = await Promise.all(variants.map(v => cols.users.doc(v).get().catch(() => null)));
    idLookups.forEach(snap => {
      if (snap && snap.exists && snap.id !== uid && isLegacyDoc(snap.id, snap.data())) {
        legaciesMap.set(snap.id, snap);
      }
    });

    // 2b) Match por campo `telefono` con cada variante (cubre formatos distintos).
    const fieldLookups = await Promise.all(
      variants.map(v =>
        cols.users.where('telefono', '==', v).limit(5).get().catch(() => ({ docs: [] }))
      )
    );
    fieldLookups.forEach(q => {
      q.docs.forEach(d => {
        if (d.id !== uid && isLegacyDoc(d.id, d.data())) legaciesMap.set(d.id, d);
      });
    });
  }

  const legacies = [...legaciesMap.values()];

  if (legacies.length === 0) return; // silencioso: ningún legacy = caso esperado

  logger.info(`[Dedup] ${tenantId}/${uid}: encontrados ${legacies.length} legacy(s) (match email/tel). Fusionando…`);

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
