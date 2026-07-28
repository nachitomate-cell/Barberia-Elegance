'use strict';

// functions/superadmin-staff.js
// ─────────────────────────────────────────────────────────────────
//  superadminCrearStaff — el superadmin (SynapTech) crea accesos de
//  staff para CUALQUIER local, con Auth + custom claims + doc de
//  barbero, en una sola llamada. Tres perfiles:
//    · Admin de local      → rol 'admin', NO atiende (no reservable)
//    · Admin que atiende    → rol 'admin', atiende (reservable)
//    · Barbero              → rol 'barbero', atiende
//
//  Reutiliza el patrón de crearAccesoStaff (Auth + claims) y de
//  provisionarTenantSelf (doc principal + doc de enlace por uid).
//  Los triggers sincronizarClaims{Elegance,Tenant} reafirman los
//  claims desde el doc, así que quedan consistentes.
//
//  superadminActualizarStaff — CONVIERTE un perfil que YA existe entre
//  esos mismos tres modos, sin tocar la contraseña. Crear y convertir
//  estaban fusionados en superadminCrearStaff, que sirve para convertir
//  (reusa el doc por email) pero exige password y se la resetea a la
//  persona — inservible como botón de "cambiar perfil".
//
//  DEPLOY:
//    firebase deploy --only functions:superadminCrearStaff,functions:superadminActualizarStaff
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');

const db = admin.firestore();
const SUPERADMINS = ['ignaciiio.mate@gmail.com'];

exports.superadminCrearStaff = onCall({ region: 'us-central1', cors: true }, async (request) => {
  const callerEmail = (request.auth?.token?.email || '').toLowerCase();
  if (!SUPERADMINS.includes(callerEmail)) {
    throw new HttpsError('permission-denied', 'Solo el superadmin puede crear accesos aquí.');
  }

  const d        = request.data || {};
  const tenantId = String(d.tenantId || '').trim();
  const nombre   = String(d.nombre || '').trim().slice(0, 60);
  const email    = String(d.email || '').trim().toLowerCase();
  const password = String(d.password || '');
  const rolNorm  = String(d.rol || 'barbero').toLowerCase();
  const atiende  = d.atiende !== false; // default true

  if (!tenantId) throw new HttpsError('invalid-argument', 'Falta el local (tenantId).');
  if (!nombre)   throw new HttpsError('invalid-argument', 'Falta el nombre.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Correo inválido.');
  }
  if (!password || password.length < 6) {
    throw new HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
  }
  if (!['admin', 'barbero'].includes(rolNorm)) {
    throw new HttpsError('invalid-argument', 'Rol inválido.');
  }

  // ── 1) Crear o vincular la cuenta Auth ───────────────────────
  let uid, yaExistia = false;
  try {
    const rec = await admin.auth().createUser({ email, password, displayName: nombre || undefined });
    uid = rec.uid;
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      yaExistia = true;
      const existing = await admin.auth().getUserByEmail(email);
      uid = existing.uid;
      // El superadmin puede estar refijando la clave de una cuenta existente.
      try { await admin.auth().updateUser(uid, { password }); } catch (_) {}
    } else if (err.code === 'auth/invalid-email') {
      throw new HttpsError('invalid-argument', 'El correo no tiene formato válido.');
    } else if (err.code === 'auth/invalid-password' || err.code === 'auth/weak-password') {
      throw new HttpsError('invalid-argument', 'Contraseña muy débil (mínimo 6 caracteres).');
    } else {
      logger.error('[superadminCrearStaff] auth error:', err);
      throw new HttpsError('internal', err.message || 'No se pudo crear la cuenta.');
    }
  }

  // ── 2) Custom claims { role, tenantId } ──────────────────────
  await admin.auth().setCustomUserClaims(uid, { role: rolNorm, tenantId });

  // ── 3) Doc de barbero (principal + enlace por uid) ───────────
  //  Elegance vive en /barberos (raíz); el resto en tenants/{tid}/barberos.
  //  Mismo criterio que los triggers sincronizarClaims{Elegance,Tenant}.
  const barberosCol = tenantId === 'elegance'
    ? db.collection('barberos')
    : db.collection(`tenants/${tenantId}/barberos`);
  const TS = FieldValue.serverTimestamp();

  // ── Anti-duplicado ───────────────────────────────────────────
  //  Si ya existe un barbero con este email en el local, REUSAMOS su
  //  doc PRINCIPAL (le pegamos login + rol) en vez de crear otra tarjeta.
  //  Así un perfil legacy (sin login) no queda duplicado al darle acceso
  //  nativo — que es justo lo que pasaba antes.
  let mainDocId = null, reusoDoc = false;
  try {
    const q = await barberosCol.where('email', '==', email).get();
    // El doc de enlace del propio uid NO cuenta como "perfil existente".
    const candidatos = q.docs
      .map(d => ({ id: d.id, data: d.data() }))
      .filter(d => d.id !== uid);
    const principal = candidatos.find(d => !d.data._mainDocId); // tarjeta real (no de enlace)
    if (principal) mainDocId = principal.id;
    else if (candidatos.length && candidatos[0].data._mainDocId) mainDocId = candidatos[0].data._mainDocId;
    reusoDoc = !!mainDocId;
  } catch (e) {
    logger.warn('[superadminCrearStaff] búsqueda por email falló:', e.message);
  }

  const mainRef = mainDocId ? barberosCol.doc(mainDocId) : barberosCol.doc();
  // `atiende` controla si es reservable Y si aparece en la agenda: el filtro
  // de la grilla oculta a los admins puros salvo mostrarEnAgenda/esBarbero.
  // Así "admin que atiende" sale como columna y "admin de local" no.
  const base = {
    nombre, email, rol: rolNorm, activo: true,
    disponible: atiende, mostrarEnAgenda: atiende, esBarbero: atiende,
    uid,
  };
  await mainRef.set(
    reusoDoc
      ? { ...base, actualizadoEn: TS, actualizadoPor: callerEmail }
      : { ...base, creadoEn: TS, creadoPor: callerEmail },
    { merge: true },
  );

  // Doc de enlace por UID (los triggers/queries indexan por uid).
  await barberosCol.doc(uid).set({
    _mainDocId: mainRef.id,
    uid,
    email,
    nombre,
    rol:    rolNorm,
    activo: true,
  }, { merge: true });

  logger.info(`[superadminCrearStaff] ${email} → ${tenantId} rol=${rolNorm} atiende=${atiende} uid=${uid} (authYaExistia=${yaExistia}, reusoDoc=${reusoDoc}) by ${callerEmail}`);
  return { ok: true, uid, docId: mainRef.id, yaExistia, reusoDoc };
});

// ═════════════════════════════════════════════════════════════════
//  superadminActualizarStaff — cambia el PERFIL de alguien que ya existe
//  ({tenantId, docId, rol, atiende}). No toca Auth ni la contraseña.
//
//  Escribe en los DOS docs (principal + enlace por uid) porque el rol del
//  panel se lee del doc-espejo `barberos/{uid}` y la agenda del principal;
//  si solo se toca uno, el perfil queda partido.
//
//  Los claims NO se setean acá: los reemite sincronizarClaims{Elegance,
//  Tenant} al detectar la escritura. Igual los forzamos al final para que
//  el cambio se note sin esperar al trigger.
// ═════════════════════════════════════════════════════════════════
exports.superadminActualizarStaff = onCall({ region: 'us-central1', cors: true }, async (request) => {
  const callerEmail = (request.auth?.token?.email || '').toLowerCase();
  if (!SUPERADMINS.includes(callerEmail)) {
    throw new HttpsError('permission-denied', 'Solo el superadmin puede cambiar perfiles aquí.');
  }

  const d        = request.data || {};
  const tenantId = String(d.tenantId || '').trim();
  const docId    = String(d.docId || '').trim();
  const rolNorm  = String(d.rol || '').toLowerCase();
  const atiende  = d.atiende !== false; // default true

  if (!tenantId) throw new HttpsError('invalid-argument', 'Falta el local (tenantId).');
  if (!docId)    throw new HttpsError('invalid-argument', 'Falta el miembro (docId).');
  if (!['admin', 'barbero'].includes(rolNorm)) {
    throw new HttpsError('invalid-argument', 'Rol inválido.');
  }

  const barberosCol = tenantId === 'elegance'
    ? db.collection('barberos')
    : db.collection(`tenants/${tenantId}/barberos`);

  const snap = await barberosCol.doc(docId).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Ese miembro no existe en este local.');
  const data = snap.data() || {};

  // El clic puede venir sobre el doc de enlace o sobre el principal.
  // Normalizamos: mainId = la tarjeta real, uid = la cuenta de Auth.
  const mainId = data._mainDocId || docId;
  const uid    = data._mainDocId ? docId : (data.authUid || data.uid || null);

  // `atiende` es el único concepto; se materializa en los tres booleanos
  // que leen los filtros (disponible / mostrarEnAgenda / esBarbero). Van
  // siempre juntos justamente para que no se desincronicen.
  const patch = {
    rol: rolNorm,
    disponible:      atiende,
    mostrarEnAgenda: atiende,
    esBarbero:       atiende,
    actualizadoEn:   FieldValue.serverTimestamp(),
    actualizadoPor:  callerEmail,
  };
  await barberosCol.doc(mainId).set(patch, { merge: true });

  // Doc de enlace: solo el rol (los flags de agenda viven en el principal).
  if (uid && uid !== mainId) {
    await barberosCol.doc(uid).set({ rol: rolNorm }, { merge: true }).catch((e) => {
      logger.warn('[superadminActualizarStaff] doc de enlace no se pudo escribir:', e.message);
    });
  }

  // Adelanto de los claims (el trigger igual los reafirma).
  if (uid) {
    try {
      await admin.auth().setCustomUserClaims(uid, { role: rolNorm, tenantId });
    } catch (e) {
      if (e.code !== 'auth/user-not-found') {
        logger.warn('[superadminActualizarStaff] claims:', e.message);
      }
    }
  }

  logger.info(`[superadminActualizarStaff] ${tenantId}/${mainId} rol=${rolNorm} atiende=${atiende} uid=${uid || '(sin auth)'} by ${callerEmail}`);
  return { ok: true, docId: mainId, uid, rol: rolNorm, atiende, sinCuenta: !uid };
});
