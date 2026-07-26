'use strict';

// functions/dedupe-cliente-onCreate.js
// ─────────────────────────────────────────────────────────────────
//  DEDUP AUTOMÁTICO AL REGISTRARSE UN CLIENTE
//
//  Dispara cuando se crea un doc en /tenants/{tid}/users/{uid} o
//  /users/{uid} (elegance). Si el cliente recién registrado matchea
//  con un perfil "legacy" (uid === docId por migración AgendaPro, o
//  importedFrom === 'agendapro'), fusiona sellos/historial en el
//  doc nuevo y borra el legacy en users/ + clientes/.
//
//  Aplica la MISMA regla híbrida que upsertCliente:
//    · Match por email exacto (identificador único humano).
//    · Match por tel solo si NO hay match por email Y el otro doc
//      tampoco tiene email (evita colapsar familia/tel compartido).
//
//  Reutiliza `resolveMatch` de upsert-cliente.js para tener una sola
//  fuente de verdad de la lógica de matching entre este trigger y el
//  callable manual. Un cambio en la regla se hace en un solo lugar.
//
//  Idempotente. El script de cleanup (Fase 2) sigue funcionando como
//  red de seguridad para tenants con backlog anterior a este CF.
//
//  Exports:
//    dedupeOnCreateElegance — trigger /users/{uid}
//    dedupeOnCreateTenant   — trigger /tenants/{tid}/users/{uid}
// ─────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { FieldValue }        = require('firebase-admin/firestore');

const {
  _resolveMatch: resolveMatch,
  _colUsers:     colUsers,
  _normPhone:    normPhone,
} = require('./upsert-cliente');

const db = admin.firestore();

function colClientes(tenantId) {
  return tenantId === 'elegance'
    ? db.collection('clientes')
    : db.collection(`tenants/${tenantId}/clientes`);
}

function isLegacyDoc(docId, data) {
  // 3 tipos de doc que este trigger puede absorber al crearse un doc canónico
  // (típicamente un registro nuevo del club con Firebase Auth uid):
  //  1. Legacy AgendaPro migrado: uid === docId (formato +56XXXXXXXXX).
  //  2. Legacy AgendaPro con marca explícita: importedFrom === 'agendapro'.
  //  3. Auto-computed por upsertCliente: docId con prefijo 'ac_'. Estos se
  //     crean cuando el cliente agendó o reservó ANTES de registrarse al club.
  //     Al registrarse queremos consolidar TODO en el doc con el authUid como
  //     docId (que es el que la app lee por currentUser.uid).
  return (data && data.uid === docId)
      || (data && data.importedFrom === 'agendapro')
      || (typeof docId === 'string' && docId.startsWith('ac_'));
}

async function procesarDedup({ tenantId, uid, data }) {
  // Silenciosos (estos paths disparan en cada user create sin hacer nada):
  if (isLegacyDoc(uid, data)) return;

  const email    = (data.email    || '').toLowerCase().trim();
  const telefono = (data.telefono || '').trim();
  if (!email && !telefono) return;

  const usersCol = colUsers(tenantId);

  // ── Idempotencia doble ─────────────────────────────────────────────
  //  Cloud Functions onDocumentCreated tiene garantía at-least-once y
  //  puede reejecutar el trigger. Además dos invocaciones concurrentes
  //  pueden leer el estado "sin dedupedAt" simultáneamente (race). Dos
  //  capas de defensa:
  //   (a) Guard opportunistic: si el doc ya tiene dedupedAt → skip.
  //       Bloquea el caso serial (retry tras completar).
  //   (b) Valores ABSOLUTOS en vez de FieldValue.increment(): dos
  //       ejecuciones concurrentes que calculan `dispActual + 3 = 3`
  //       y setean el mismo valor NO duplican. Idempotente por diseño.
  const meRef  = usersCol.doc(uid);
  const meSnap = await meRef.get();
  if (!meSnap.exists) return; // ya borrado
  const meData = meSnap.data() || {};
  if (meData.dedupedAt) {
    logger.info(`[Dedup] ${tenantId}/${uid}: ya deduplicado (dedupedAt presente), skip.`);
    return;
  }

  // Lookup con la MISMA regla híbrida que upsertCliente. Excluimos el
  // propio doc recién creado para que no matchee consigo mismo.
  const primer = await resolveMatch(usersCol, { email, telefono }, { excludeDocId: uid });

  // Recolectamos hasta 2 legacies: uno por email + uno por tel (si el
  // registro nuevo cambió de tel pero mantuvo email, o viceversa). Un
  // humano típicamente tiene MAX 1 legacy migrado, pero cubrimos el caso.
  const legaciesMap = new Map();
  if (primer.target && isLegacyDoc(primer.target.id, primer.target.data())) {
    legaciesMap.set(primer.target.id, primer.target);
  }
  // Si el primer match fue por email, buscar también por tel excluyendo
  // ambos (uid nuevo + uid del primer match).
  if (primer.matchedBy === 'email' && telefono) {
    const excludeIds = new Set([uid, primer.target?.id].filter(Boolean));
    const segundo = await resolveMatch(usersCol, { email: '', telefono }, { excludeDocId: uid });
    if (segundo.target
        && !excludeIds.has(segundo.target.id)
        && isLegacyDoc(segundo.target.id, segundo.target.data())) {
      legaciesMap.set(segundo.target.id, segundo.target);
    }
  }

  const legacies = [...legaciesMap.values()];
  if (legacies.length === 0) return;

  logger.info(`[Dedup] ${tenantId}/${uid}: matched ${legacies.length} legacy(s) via ${primer.matchedBy}. Fusionando…`);

  // Sumar sellos de todos los legacies encontrados. Historial se une
  // con arrayUnion (dedup por deep-equal). fechaOriginal y teléfono
  // anterior solo si el nuevo doc no los tiene.
  const sellosHistLegacies = legacies.reduce((s, l) => s + (Number(l.data().sellosHistoricos) || 0), 0);
  const sellosDispLegacies = legacies.reduce((s, l) => s + (Number(l.data().sellosDisponibles) || 0), 0);
  const stampsLegacies     = legacies.reduce((s, l) => s + (Number(l.data().stamps)            || 0), 0);
  const historial          = legacies.flatMap(l => l.data().historialSellos || []);
  const fechaOrig          = legacies.map(l => l.data().fechaRegistroOriginal).filter(Boolean)[0];
  const telPrev            = legacies.map(l => l.data().telefono).filter(t => t && t !== data.telefono)[0];

  // VALORES ABSOLUTOS (no increment): idempotente ante ejecuciones
  // concurrentes. `meData` es el snapshot del doc ACTUAL (post-write
  // del registro pero pre-fusión). Sumamos meData + legacies y seteamos
  // el resultado final. Si otra ejecución concurrente hace lo mismo,
  // llega al mismo número absoluto → no duplica.
  const currentHist  = Number(meData.sellosHistoricos  ?? 0);
  const currentDisp  = Number(meData.sellosDisponibles ?? 0);
  const currentStmp  = Number(meData.stamps            ?? 0);
  const finalHist    = currentHist + sellosHistLegacies;
  const finalDisp    = currentDisp + sellosDispLegacies;
  const finalStmp    = currentStmp + stampsLegacies;

  const mergeUpdate = {
    importedFrom: 'agendapro',
    dedupedAt:    FieldValue.serverTimestamp(),
    updatedAt:    FieldValue.serverTimestamp(),
  };
  if (finalHist !== currentHist) mergeUpdate.sellosHistoricos  = finalHist;
  if (finalDisp !== currentDisp) mergeUpdate.sellosDisponibles = finalDisp;
  if (finalStmp !== currentStmp) mergeUpdate.stamps            = finalStmp;
  if (historial.length)        mergeUpdate.historialSellos       = FieldValue.arrayUnion(...historial);
  if (fechaOrig && !data.fechaRegistroOriginal) mergeUpdate.fechaRegistroOriginal = fechaOrig;
  if (telPrev   && !data.telefonoAnterior)      mergeUpdate.telefonoAnterior      = telPrev;

  // Tenants multi-sede (kronnos): consolidar contadores por sede.
  // También en absoluto (currentSede + legaciesSede) por idempotencia.
  const currentSede = (meData.sellosPorSede && typeof meData.sellosPorSede === 'object')
    ? meData.sellosPorSede
    : {};
  const sedeTotales = {};
  legacies.forEach(l => {
    const sps = l.data().sellosPorSede;
    if (sps && typeof sps === 'object') {
      Object.entries(sps).forEach(([sede, n]) => {
        const v = Number(n) || 0;
        if (v) sedeTotales[sede] = (sedeTotales[sede] || 0) + v;
      });
    }
  });
  Object.entries(sedeTotales).forEach(([sede, n]) => {
    const final = (Number(currentSede[sede]) || 0) + n;
    mergeUpdate[`sellosPorSede.${sede}`] = final;
  });

  // IDs de docs en clientes/ (mirror por tel) a borrar
  const clientesCol = colClientes(tenantId);
  const telefonosLegacy = [
    ...new Set(legacies.flatMap(l => [l.data().telefono, l.id]).map(normPhone).filter(Boolean)),
  ];

  const batch = db.batch();
  batch.set(usersCol.doc(uid), mergeUpdate, { merge: true });
  legacies.forEach(l => batch.delete(l.ref));
  telefonosLegacy.forEach(tel => batch.delete(clientesCol.doc(tel)));

  try {
    await batch.commit();
    logger.info(`[Dedup] ${tenantId}/${uid}: OK. Borrados ${legacies.length} legacy(s) en users/ + ${telefonosLegacy.length} en clientes/. Sellos hist ${currentHist}→${finalHist}, disp ${currentDisp}→${finalDisp}.`);
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
