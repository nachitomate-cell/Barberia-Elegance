'use strict';

// functions/admin-alerts.js
// ─────────────────────────────────────────────────────────────────
//  ALERTAS PROACTIVAS AL PORTAL /admin (superadmin)
//
//  Convierte el /admin de "tablero que consultas" a "copiloto que te
//  avisa". Empuja push (dispatchAdminPush → admin_fcm_tokens) ante:
//    · adminAlertaNuevoTenant       — nuevo local self-service (crecimiento)
//    · adminAlertaSoporte           — nuevo mensaje de soporte
//    · adminAlertaErroresSpike      — pico de errores (system_errors), cada 30 min
//    · adminAlertaOnboardingEstancado — diaria: self-service sin 1a reserva
//
//  Deploy:
//    firebase deploy --only functions:adminAlertaNuevoTenant,\
//      functions:adminAlertaSoporte,functions:adminAlertaErroresSpike,\
//      functions:adminAlertaOnboardingEstancado
// ─────────────────────────────────────────────────────────────────

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { dispatchAdminPush } = require('./admin-push');

const db        = admin.firestore();
const messaging = admin.messaging();
const REGION    = 'us-central1';
const DIA       = 24 * 60 * 60 * 1000;

// ── 1) Nuevo local self-service ──────────────────────────────────
exports.adminAlertaNuevoTenant = onDocumentCreated(
  { document: 'tenants/{slug}', region: REGION },
  async (event) => {
    const d = event.data?.data();
    // Solo self-service: los tenants a medida no crean doc raíz en /tenants.
    if (!d || d.origen !== 'self-service') return null;
    const slug = event.params.slug;
    try {
      await dispatchAdminPush(db, messaging, {
        title: '🆕 Nuevo local (self-service)',
        body:  `${d.nombre || slug} acaba de crear su agenda${d.tipo ? ` (${d.tipo})` : ''}.`,
        url:   '/admin/',
        tag:   'admin-nuevo-tenant',
        data:  { tipo: 'nuevo_tenant', slug },
      });
    } catch (e) { logger.error('[admin-alerta nuevo-tenant]', e.message); }
    return null;
  },
);

// ── 2) Nuevo mensaje de soporte ──────────────────────────────────
exports.adminAlertaSoporte = onDocumentCreated(
  { document: 'soporte_mensajes/{id}', region: REGION },
  async (event) => {
    const d = event.data?.data();
    if (!d) return null;
    // Si el doc marca al superadmin como autor (respuesta saliente), no avisar.
    const autor = (d.autor || d.remitente || d.from || '').toString().toLowerCase();
    if (autor === 'admin' || autor === 'soporte' || autor === 'synaptech') return null;

    const quien = d.tenantNombre || d.tenantId || d.nombre || d.email || 'Un local';
    const texto = (d.mensaje || d.texto || d.body || d.contenido || '').toString().slice(0, 140);
    try {
      await dispatchAdminPush(db, messaging, {
        title: '🆘 Soporte',
        body:  `${quien}: ${texto || 'nuevo mensaje'}`,
        url:   '/admin/',
        tag:   'admin-soporte',
        data:  { tipo: 'soporte', id: event.params.id },
      });
    } catch (e) { logger.error('[admin-alerta soporte]', e.message); }
    return null;
  },
);

// ── 3) Pico de errores (system_errors) ───────────────────────────
//  Cada 30 min cuenta los errores de la ventana. Si supera el umbral y
//  no hubo aviso en las últimas 2h (cooldown), empuja una alerta.
exports.adminAlertaErroresSpike = onSchedule(
  { schedule: 'every 30 minutes', region: REGION },
  async () => {
    const UMBRAL = 12;
    const desde  = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 60 * 1000);
    let count = 0;
    try {
      const snap = await db.collection('system_errors').where('timestamp', '>', desde).get();
      count = snap.size;
    } catch (e) { logger.warn('[admin-alerta errores] query', e.message); return; }
    if (count < UMBRAL) return;

    // Cooldown 2h vía flag en _system para no spamear.
    const flagRef = db.doc('_system/_adminAlertErrores');
    try {
      const flag = await flagRef.get();
      const last = flag.exists ? (flag.data().lastPushAt?.toMillis?.() || 0) : 0;
      if (Date.now() - last < 2 * 60 * 60 * 1000) return;
      await flagRef.set({ lastPushAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (_) { /* si falla el flag, igual avisamos una vez */ }

    try {
      await dispatchAdminPush(db, messaging, {
        title: '⚠️ Pico de errores',
        body:  `${count} errores en los últimos 30 min. Revisa los logs.`,
        url:   '/admin/',
        tag:   'admin-errores',
        data:  { tipo: 'errores', count },
      });
    } catch (e) { logger.error('[admin-alerta errores]', e.message); }
  },
);

// ── 4) Onboardings estancados (diaria 10:00 CLT) ─────────────────
//  Self-service creados hace +3 días que aún NO tienen ninguna cita:
//  el embudo abandonado. Un aviso diario para salir a nudgear.
exports.adminAlertaOnboardingEstancado = onSchedule(
  { schedule: '0 10 * * *', timeZone: 'America/Santiago', region: REGION },
  async () => {
    const ahora = Date.now();
    let estancados = 0;
    const nombres = [];
    try {
      const snap = await db.collection('tenants').where('origen', '==', 'self-service').get();
      for (const doc of snap.docs) {
        const t = doc.data();
        const creadoMs = t.createdAt?.toMillis?.() || 0;
        // Dar 3 días de gracia antes de contarlo como estancado.
        if (!creadoMs || ahora - creadoMs <= 3 * DIA) continue;
        const citas = await doc.ref.collection('citas').limit(1).get().catch(() => null);
        if (citas && citas.empty) {
          estancados++;
          if (nombres.length < 4) nombres.push(t.nombre || doc.id);
        }
      }
    } catch (e) { logger.error('[admin-alerta onboarding] scan', e.message); return; }
    if (!estancados) return;

    try {
      await dispatchAdminPush(db, messaging, {
        title: `📉 ${estancados} onboarding${estancados !== 1 ? 's' : ''} estancado${estancados !== 1 ? 's' : ''}`,
        body:  `Sin su 1ª reserva: ${nombres.join(', ')}${estancados > nombres.length ? '…' : ''}. Míralos en el embudo.`,
        url:   '/admin/',
        tag:   'admin-onboarding',
        data:  { tipo: 'onboarding_estancado', estancados },
      });
    } catch (e) { logger.error('[admin-alerta onboarding]', e.message); }
  },
);
