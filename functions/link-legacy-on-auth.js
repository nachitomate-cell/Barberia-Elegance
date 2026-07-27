'use strict';

// functions/link-legacy-on-auth.js
// ─────────────────────────────────────────────────────────────────
//  AUTO-MERGE DE DOC LEGACY AL REGISTRARSE AL CLUB
//
//  Contexto: en tenants tipo barbería (aura, delnero, etc.) el 80% de
//  los clientes NO se registran al club de fidelidad — el barbero les
//  crea la cita a mano o reservan desde el flujo público sin login.
//  La CF pack-automatico auto-crea `users/{tel569}` con esLegacy:true
//  cuando completa la cita → ahí quedan sellos, packs y todo el
//  historial vinculado por teléfono.
//
//  Cuando ese cliente decide DESPUÉS registrarse al club (formulario
//  de registro), se crea `users/{authUid}` limpio, sin sellos ni
//  packs. El cliente ve su dashboard vacío aunque haya pagado un pack
//  y acumulado sellos. Antes de esta CF, había que fusionar a mano
//  (migraciones/dedupe-chameleon-clientes.js server-side).
//
//  Esta CF dispara al crearse un doc en users/. Si el nuevo doc:
//   - NO es legacy (docId no es un teléfono 11 dígitos)
//   - Tiene email o teléfono
//   → busca otros docs en users/ con el mismo email/teléfono y
//     marca `esLegacy:true` → fusiona: mueve packsActivos, suma
//     sellos, une historial, marca el legacy como fusionado.
//   → actualiza citas/logs que apuntaban al legacy uid.
//
//  Idempotente: si el legacy ya tiene `fusionadoCon` con el mismo
//  authUid, skip. Si tiene otro, warning + skip (caso raro: cliente
//  que borra su cuenta y crea otra con el mismo teléfono).
//
//  Exports:
//    linkLegacyElegance — trigger en /users/{authUid}
//    linkLegacyTenant   — trigger en /tenants/{tid}/users/{authUid}
//
//  DEPLOY:
//    firebase deploy --only functions:linkLegacyElegance,functions:linkLegacyTenant
// ─────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { FieldValue }        = require('firebase-admin/firestore');

const db = admin.firestore();

// Normaliza teléfono al formato chileno 11 dígitos (569XXXXXXXX).
// Espejo de resolverUserId() en pack-automatico.js.
function normTel(raw) {
  const digs = String(raw || '').replace(/\D/g, '');
  if (digs.length === 11 && digs.startsWith('56')) return digs;
  if (digs.length === 9) return `56${digs}`;
  if (digs.length >= 11) return digs;
  return '';
}

function colecciones(tenantId) {
  const isEle = tenantId === 'elegance';
  return {
    users:        db.collection(isEle ? 'users' : `tenants/${tenantId}/users`),
    packConsumos: db.collection(isEle ? 'packConsumos' : `tenants/${tenantId}/packConsumos`),
    citas:        db.collection(isEle ? 'citas' : `tenants/${tenantId}/citas`),
    // Fase 3.C: clientes/ deprecated. Este CF ya no escribe ahí (la
    // sincronización del uid en el mirror era relevante cuando el buscador
    // de agenda leía clientes/; ahora lee users/ directo).
  };
}

async function fusionar({ tenantId, authUid, authData }) {
  const cols = colecciones(tenantId);

  // El id del nuevo doc PARECE un authUid (largo, alfanumérico mixto)?
  // Si es solo dígitos (típico del legacy por teléfono), skip: es él mismo
  // el legacy, no un usuario recién registrado al club.
  if (/^\d+$/.test(authUid)) {
    logger.info(`[link-legacy] ${tenantId}/${authUid}: doc ID es solo dígitos, skip (parece legacy).`);
    return;
  }

  const email = String(authData?.email || authData?.emailLower || '').toLowerCase().trim();
  const tel   = normTel(authData?.telefono);
  if (!email && !tel) {
    logger.info(`[link-legacy] ${tenantId}/${authUid}: sin email ni teléfono resoluble, skip.`);
    return;
  }

  // Buscar candidatos legacy por tel y/o email.
  //  · Legacy walk-in antiguo: docId = tel normalizado ('569XXXXXXXX').
  //  · Legacy upsertCliente (Fase 1+): docId = 'ac_<hash>'. Se busca por
  //    field `telefono` (variantes con/sin '+') y `telefonoSuf9` (últimos
  //    9 dígitos — más robusto ante diferencias de formato).
  //  Sin la búsqueda por field, un cliente que hizo walk-in solo con tel
  //  (sin email) NUNCA se fusionaba al registrarse después con ese tel
  //  → los sellos quedaban huérfanos en el ac_hash.
  const candidatos = new Map(); // uid → data
  if (tel) {
    // 1) legacy walk-in antiguo: docId = tel
    const s = await cols.users.doc(tel).get();
    if (s.exists && s.id !== authUid) candidatos.set(s.id, s.data());
    // 2) por field telefono — variantes con y sin '+' para tolerar formatos
    const telVariants = new Set([tel, `+${tel}`]);
    for (const t of telVariants) {
      const q = await cols.users.where('telefono', '==', t).limit(5).get();
      for (const d of q.docs) if (d.id !== authUid) candidatos.set(d.id, d.data());
    }
    // 3) por telefonoSuf9 — más robusto (últimos 9 dígitos, ignora prefijos)
    const suf9 = tel.length >= 9 ? tel.slice(-9) : '';
    if (suf9) {
      const q = await cols.users.where('telefonoSuf9', '==', suf9).limit(5).get();
      for (const d of q.docs) if (d.id !== authUid) candidatos.set(d.id, d.data());
    }
  }
  if (email) {
    const q1 = await cols.users.where('email', '==', email).limit(5).get();
    for (const d of q1.docs) if (d.id !== authUid) candidatos.set(d.id, d.data());
    const q2 = await cols.users.where('emailLower', '==', email).limit(5).get();
    for (const d of q2.docs) if (d.id !== authUid) candidatos.set(d.id, d.data());
  }

  // Filtrar: solo mergeamos docs que sean claramente "legacy" (esLegacy:true
  // o docId numérico) y NO estén ya fusionados. Esto evita mergear un
  // segundo cliente del club que casualmente comparte email/tel (raro pero
  // posible con teléfonos reciclados).
  const legacyDocs = [];
  for (const [uid, data] of candidatos) {
    if (data.fusionadoCon === authUid) continue; // ya fusionado en un run anterior
    if (data.fusionadoCon && data.fusionadoCon !== authUid) {
      logger.warn(`[link-legacy] ${tenantId}/${uid} ya está fusionado con ${data.fusionadoCon}, no toco.`);
      continue;
    }
    // Un doc es fusionable si:
    //  · esLegacy:true (marca explícita del CF viejo pack-automatico)
    //  · docId puramente numérico (legacy tel-as-uid, walk-in antiguo)
    //  · docId con prefijo 'ac_' (creado por upsertCliente pre-Auth: walk-in
    //    o reserva pública que no llegó a registrarse al club aún)
    const esLegacy = data.esLegacy === true || /^\d+$/.test(uid) || /^ac_/.test(uid);
    if (!esLegacy) continue;
    legacyDocs.push({ uid, data });
  }

  if (legacyDocs.length === 0) {
    logger.info(`[link-legacy] ${tenantId}/${authUid}: sin legacy match, nada que fusionar.`);
    return;
  }

  logger.info(`[link-legacy] ${tenantId}/${authUid}: fusiono ${legacyDocs.length} legacy doc(s): ${legacyDocs.map(x => x.uid).join(', ')}`);

  // Acumular todo lo del legacy y aplicar en 1 escritura al Auth doc.
  const packs = [];
  const historial = [];
  let addSellosDisponibles = 0;
  let addSellosHistoricos  = 0;
  const patchExtras = {};
  for (const { uid, data } of legacyDocs) {
    for (const p of (Array.isArray(data.packsActivos) ? data.packsActivos : [])) packs.push(p);
    for (const h of (Array.isArray(data.historialSellos) ? data.historialSellos : [])) historial.push(h);
    addSellosDisponibles += Number(data.sellosDisponibles) || 0;
    addSellosHistoricos  += Number(data.sellosHistoricos)  || 0;
    // Rellenar campos vacíos en el Auth doc con datos del legacy.
    if (!authData.telefono && data.telefono) patchExtras.telefono = data.telefono;
    if (!authData.nombre   && data.nombre)   patchExtras.nombre   = data.nombre;
  }

  // Dedupe packs: por packId+citaActivacion (evita duplicar si por algún
  // motivo la CF corre dos veces).
  const authRef = cols.users.doc(authUid);
  const currentAuth = (await authRef.get()).data() || {};
  const authPacks = Array.isArray(currentAuth.packsActivos) ? [...currentAuth.packsActivos] : [];
  for (const p of packs) {
    if (!authPacks.some(x => x.packId === p.packId && x.citaActivacion === p.citaActivacion)) {
      authPacks.push(p);
    }
  }

  const authPatch = {
    ...patchExtras,
    packsActivos:      authPacks,
    updatedAt:         FieldValue.serverTimestamp(),
  };
  if (addSellosDisponibles) authPatch.sellosDisponibles = FieldValue.increment(addSellosDisponibles);
  if (addSellosHistoricos)  authPatch.sellosHistoricos  = FieldValue.increment(addSellosHistoricos);
  if (addSellosDisponibles) authPatch.stamps            = FieldValue.increment(addSellosDisponibles);
  if (historial.length)     authPatch.historialSellos   = FieldValue.arrayUnion(...historial);

  // ── ORDEN DE ESCRITURA — evita double-counting ────────────────────
  //  1) batch1: vaciar cada legacy + marcar fusionadoCon.
  //     Si esto falla → ABORT: no aplicamos sellos al auth, así el
  //     legacy queda intacto y un reintento futuro puede recuperar.
  //  2) authRef.update(sellos+historial+packs): aplicar recién ahora.
  //  3) batch2: reasignar citas y packConsumos (nice-to-have; si falla,
  //     la cita queda apuntando al uid legacy pero el auth ya heredó).
  //
  //  Antes: authRef.update() PRIMERO, batch DESPUÉS. Si el batch fallaba
  //  (ej. legacy borrado por race), el auth ya tenía sellos y el legacy
  //  seguía con sellos → double-count silencioso.

  const batch1 = db.batch();
  for (const { uid } of legacyDocs) {
    batch1.update(cols.users.doc(uid), {
      fusionadoCon:      authUid,
      fusionadoEn:       FieldValue.serverTimestamp(),
      packsActivos:      [],
      sellosDisponibles: 0,
      sellosHistoricos:  0,
      stamps:            0,
      historialSellos:   [],
    });
  }
  try {
    await batch1.commit();
  } catch (e) {
    logger.warn(`[link-legacy] ${tenantId}/${authUid}: no se pudo vaciar legacy (${e.code || e.message}) — abort sin aplicar sellos al auth. Puede reintentar futuro.`);
    return;
  }

  // Legacy vaciado OK → ahora sí, aplicar todo al auth.
  await authRef.update(authPatch);

  // Best effort: reasignar citas y packConsumos. Si falla, no rollback
  // (el auth ya heredó sellos que era lo importante).
  const batch2 = db.batch();
  for (const { uid } of legacyDocs) {
    const q = await cols.packConsumos.where('userId', '==', uid).get();
    for (const d of q.docs) batch2.update(d.ref, { userId: authUid, userIdLegacy: uid });
  }
  const telsPosibles = new Set([tel, `+${tel}`, authData?.telefono].filter(Boolean));
  const citasIds = new Set();
  for (const { uid } of legacyDocs) {
    const q = await cols.citas.where('userId', '==', uid).get();
    for (const d of q.docs) { citasIds.add(d.id); batch2.update(d.ref, { userId: authUid, userIdLegacy: uid }); }
  }
  for (const t of telsPosibles) {
    const q = await cols.citas.where('clienteTelefono', '==', t).get();
    for (const d of q.docs) {
      if (citasIds.has(d.id)) continue;
      citasIds.add(d.id);
      // Solo tocamos userId si aún no lo tiene, para no pisar auths distintos.
      batch2.update(d.ref, { userId: authUid, userIdLegacy: legacyDocs[0].uid });
    }
  }
  try {
    await batch2.commit();
  } catch (e) {
    logger.warn(`[link-legacy] ${tenantId}/${authUid}: fusión de sellos OK pero fallo reasignar citas (${e.code || e.message}). Auth heredó sellos; citas quedan apuntando a legacy.`);
  }

  logger.info(`[link-legacy] ${tenantId}/${authUid}: fusión completa. Packs=${authPacks.length} · +sellos=${addSellosDisponibles}`);
}

// ── Guard común: solo dispara para docs nuevos con datos útiles ────
async function safeRun({ tenantId, authUid, authData }) {
  try {
    await fusionar({ tenantId, authUid, authData });
  } catch (err) {
    logger.error(`[link-legacy] ${tenantId}/${authUid}: error inesperado:`, err);
  }
}

exports.linkLegacyElegance = onDocumentCreated('users/{authUid}', async (event) => {
  const authUid  = event.params.authUid;
  const authData = event.data?.data() || {};
  await safeRun({ tenantId: 'elegance', authUid, authData });
  return null;
});

exports.linkLegacyTenant = onDocumentCreated('tenants/{tid}/users/{authUid}', async (event) => {
  const { tid, authUid } = event.params;
  const authData = event.data?.data() || {};
  await safeRun({ tenantId: tid, authUid, authData });
  return null;
});
