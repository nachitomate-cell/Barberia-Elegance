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
//  DEPLOY:
//    firebase deploy --only functions:superadminCrearStaff
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
  if (!['admin', 'jefe', 'barbero'].includes(rolNorm)) {
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
