'use strict';

// functions/self-service-trial-extension.js
// ─────────────────────────────────────────────────────────────────────────────
//  EXTENSIÓN DE TRIAL AUTO-APROBADA (una vez por tenant)
//
//  Filosofía: el "valle de silencio" post día 3 mata la conversión. En vez de
//  ofrecer 30d por default (aplaza pagos, baja urgencia = baja conversión —
//  data SaaS demuestra que 30d convierte ~5pp peor que 14d), damos default
//  14d y ofrecemos +14d COMO REGALO cuando quedan ≤2 días de trial.
//
//  Beneficios de este diseño:
//    · Filtra a los verdaderos indecisos (los que ya pagaban no piden extensión).
//    · Se siente como agradecimiento, no como derecho por default.
//    · No aplaza el flujo de caja de la mayoría.
//    · Una sola extensión por tenant (anti-abuso) — la 2a hay que pedirla
//      por WhatsApp a soporte.
//
//  El motivo (opcional) queda registrado para métricas: qué tan lejos están
//  del "wow" cuando piden más tiempo (falta configurar bot? nunca subieron
//  foto? no compartieron el link?). Iteramos el onboarding a partir de eso.
//
//  Solo admin del tenant (self-service / admin-express). Rate limit por IP
//  10/hora contra scripts abusivos.
//
//  DEPLOY:
//    firebase deploy --only functions:solicitarExtensionTrial
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const db = admin.firestore();

const DIAS_EXTENSION = 14;

const ORIGENES_SELF = new Set(['self-service', 'admin-express']);

// Copia del helper de provision-tenant.js (rate limit por IP en _rate_limits).
async function chequearLimite(clave, ventanaSeg, tope) {
  if (!clave) return;
  const ref = db.collection('_rate_limits').doc(clave);
  const ahora  = Date.now();
  const inicio = ahora - ventanaSeg * 1000;
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : {};
      const hits = Array.isArray(data.hits) ? data.hits.filter((t) => t > inicio) : [];
      if (hits.length >= tope) {
        throw new HttpsError('resource-exhausted', 'Demasiados intentos. Espera unos minutos.');
      }
      hits.push(ahora);
      tx.set(ref, { hits, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.warn('[trial-extension] rate limit txn falló:', e.message);
  }
}

function ipDeRequest(req) {
  const raw = req && req.rawRequest;
  if (!raw) return null;
  const xff = String(raw.headers && raw.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || raw.ip || null;
}

async function esAdminDelTenant(auth, tid) {
  if (!auth || !auth.uid) return false;
  const email = String((auth.token && auth.token.email) || '').toLowerCase();
  if (email === 'ignaciiio.mate@gmail.com') return true;
  if (auth.token && auth.token.role === 'admin' && auth.token.tenantId === tid) return true;
  try {
    let snap = await db.collection(`tenants/${tid}/barberos`).doc(auth.uid).get();
    if (snap.exists && snap.data()._mainDocId) {
      snap = await db.collection(`tenants/${tid}/barberos`).doc(String(snap.data()._mainDocId)).get();
    }
    return snap.exists && snap.data().rol === 'admin';
  } catch (_) { return false; }
}

exports.solicitarExtensionTrial = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');

  const tid = String(req.data?.tenantId || '').trim();
  if (!tid) throw new HttpsError('invalid-argument', 'Falta tenantId.');

  const ip = ipDeRequest(req);
  if (ip) await chequearLimite(`ext_${ip}`, 3600, 10);

  if (!(await esAdminDelTenant(req.auth, tid))) {
    throw new HttpsError('permission-denied', 'Solo el administrador del local puede extender el trial.');
  }

  const tRef  = db.doc(`tenants/${tid}`);
  const tSnap = await tRef.get();
  if (!tSnap.exists) throw new HttpsError('not-found', 'Local no encontrado.');
  const t = tSnap.data();

  if (!ORIGENES_SELF.has(t.origen)) {
    throw new HttpsError('failed-precondition', 'Este local no está en modo self-service.');
  }
  if (t.status === 'active') {
    throw new HttpsError('failed-precondition', 'Tu plan ya está activo — no necesitas extender el trial.');
  }
  const usadas = Number(t.trialExtensionesUsadas || 0);
  if (usadas >= 1) {
    throw new HttpsError('failed-precondition',
      'Ya usaste tu extensión gratis. Escríbenos por WhatsApp para conversar tu caso.');
  }

  // La nueva fecha se calcula desde AHORA, no desde la fecha vieja: si el
  // trial ya venció hace 2 días, el dueño recibe 14 días completos desde hoy
  // (no 12).
  const nuevoFin = Timestamp.fromMillis(Date.now() + DIAS_EXTENSION * 86400000);
  const motivo   = String(req.data?.motivo || '').trim().slice(0, 300) || null;
  const email    = String((req.auth.token && req.auth.token.email) || '').toLowerCase();

  const batch = db.batch();
  batch.set(tRef, {
    status:                    'trial',
    trialFinaliza:             nuevoFin,
    trialExtensionesUsadas:    usadas + 1,
    trialUltimaExtensionEn:    FieldValue.serverTimestamp(),
    trialUltimaExtensionMotivo: motivo,
    trialUltimaExtensionPor:   email,
    updatedAt:                 FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(db.doc(`_billing/${tid}`), {
    estadoPago:    'trial',
    trialFinaliza: nuevoFin,
  }, { merge: true });
  await batch.commit();

  logger.info(`[trial-extension] +${DIAS_EXTENSION}d ${tid} por ${email} motivo="${motivo || '-'}"`);

  // Aviso opcional al admin de la plataforma para saber quién está peleando la
  // decisión (indicador de retención). Best-effort — nunca rompe la extensión.
  try {
    const { dispatchAdminPush } = require('./admin-push');
    const messaging = admin.messaging();
    await dispatchAdminPush(db, messaging, {
      title: '⏱ Extensión de trial usada',
      body: `${t.nombre || tid} pidió +${DIAS_EXTENSION} días` + (motivo ? ` · "${motivo.slice(0, 60)}"` : ''),
      url:  '/admin/',
      tag:  `trial-ext-${tid}`,
      data: { tipo: 'trial_extension', slug: tid },
    });
  } catch (e) { logger.warn('[trial-extension] push admin falló:', e.message); }

  return { ok: true, trialFinalizaMs: nuevoFin.toMillis(), diasExtendidos: DIAS_EXTENSION };
});
