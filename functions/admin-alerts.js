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
const { defineSecret }      = require('firebase-functions/params');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { dispatchAdminPush } = require('./admin-push');
const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');
const { crearCliente }      = require('./evolution/client');

const db        = admin.firestore();
const messaging = admin.messaging();
const REGION    = 'us-central1';
const DIA       = 24 * 60 * 60 * 1000;

// Canales para avisos al operador de la plataforma.
const EVOLUTION_API_URL = defineSecret('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = defineSecret('EVOLUTION_API_KEY');
const WHATSAPP_IGNACIO  = '56983568212';
const EMAIL_IGNACIO     = 'ignaciiio.mate@gmail.com';
const INSTANCIA_WA      = 'instance_plat_ventas';
const MAIL_FROM         = 'SynapTech Alerts <hola@synaptechspa.cl>';

function diasEntre(msFinal) {
  if (!msFinal) return null;
  return Math.max(0, Math.ceil((msFinal - Date.now()) / DIA));
}

function origenBonito(o) {
  return o === 'admin-express' ? 'Admin Express (Ignacio)' : 'Self-Service (crea.*)';
}

function htmlAvisoNuevoTenant({ nombre, slug, tipo, dueno, waDueno, emailDueno, diasTrial, ref, utm, origen, urlAgenda, urlAdmin }) {
  const chip = (t, c) => `<span style="display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;background:${c};color:#0d0b22;margin-right:4px;">${t}</span>`;
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#0b0f1a;color:#e2e8f0;border-radius:14px;overflow:hidden;border:1px solid #1e293b;">
    <div style="padding:20px 26px;border-bottom:1px solid #1e293b;background:linear-gradient(135deg,#8b7cf6,#5d4ce8);">
      <p style="margin:0;font-size:11px;letter-spacing:2px;color:#ffffff;font-weight:bold;opacity:.85;">SYNAPTECH · NUEVO LOCAL</p>
      <h2 style="margin:6px 0 0;font-size:22px;color:#ffffff;letter-spacing:-.5px;">🆕 ${nombre}</h2>
    </div>
    <div style="padding:22px 26px;">
      <div style="margin:0 0 14px;">
        ${chip('Trial ' + diasTrial + ' días', '#c6f94e')}
        ${chip(tipo || 'sin tipo', '#b4a9fa')}
        ${chip(origenBonito(origen), '#a7f3d0')}
        ${ref ? chip('👤 ' + ref, '#fbbf24') : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13.5px;line-height:1.55;">
        <tr><td style="padding:5px 0;color:#94a3b8;width:40%;">Local</td><td style="padding:5px 0;color:#f8fafc;font-weight:600;">${nombre} · <span style="color:#94a3b8;font-family:ui-monospace,monospace;">${slug}</span></td></tr>
        <tr><td style="padding:5px 0;color:#94a3b8;">Dueño</td><td style="padding:5px 0;color:#f8fafc;font-weight:600;">${dueno || '—'}</td></tr>
        <tr><td style="padding:5px 0;color:#94a3b8;">WhatsApp</td><td style="padding:5px 0;">${waDueno ? `<a href="https://wa.me/${waDueno}" style="color:#34d399;font-weight:700;text-decoration:none;">+${waDueno}</a>` : '—'}</td></tr>
        <tr><td style="padding:5px 0;color:#94a3b8;">Email</td><td style="padding:5px 0;">${emailDueno ? `<a href="mailto:${emailDueno}" style="color:#8b7cf6;text-decoration:none;">${emailDueno}</a>` : '—'}</td></tr>
        <tr><td style="padding:5px 0;color:#94a3b8;">Origen</td><td style="padding:5px 0;color:#cbd5e1;">${origenBonito(origen)}</td></tr>
        ${ref  ? `<tr><td style="padding:5px 0;color:#94a3b8;">Vendedor</td><td style="padding:5px 0;color:#fbbf24;font-weight:700;">👤 ${ref}</td></tr>` : ''}
        ${utm  ? `<tr><td style="padding:5px 0;color:#94a3b8;">UTM</td><td style="padding:5px 0;color:#cbd5e1;font-family:ui-monospace,monospace;font-size:12px;">${utm}</td></tr>` : ''}
      </table>
      <div style="margin-top:20px;display:flex;flex-direction:column;gap:8px;">
        <a href="${urlAdmin}" style="display:block;padding:12px;text-align:center;background:#8b7cf6;color:#0d0b22;text-decoration:none;border-radius:10px;font-weight:800;font-size:14px;">Abrir en /admin →</a>
        <a href="${urlAgenda}" style="display:block;padding:12px;text-align:center;background:transparent;border:1px solid #334155;color:#cbd5e1;text-decoration:none;border-radius:10px;font-weight:600;font-size:13px;">Ver agenda pública</a>
      </div>
      <p style="margin:18px 0 0;font-size:11.5px;color:#64748b;line-height:1.6;">
        El trial vence en <b style="color:#94a3b8;">${diasTrial} días</b>. Si es de Massiel u otro vendedor, tienes ${diasTrial} días para asegurar la conversión.
      </p>
    </div>
    <div style="padding:12px 26px;background:#0f172a;font-size:11px;color:#475569;">
      SynapTech SpA · Alerta automática desde adminAlertaNuevoTenant
    </div>
  </div>`;
}

// ── 1) Nuevo local (self-service + admin-express) ────────────────
//  Alerta triple: push + email + WhatsApp a Ignacio. El push a veces se
//  pierde en la avalancha de notificaciones; el WA se ve siempre; el
//  email queda como registro histórico y CTA con botones grandes.
exports.adminAlertaNuevoTenant = onDocumentCreated(
  { document: 'tenants/{slug}', region: REGION, secrets: [EVOLUTION_API_URL, EVOLUTION_API_KEY, ...MAIL_SECRETS] },
  async (event) => {
    const d = event.data?.data();
    if (!d) return null;
    // Ampliado a admin-express también (antes solo self-service).
    if (!['self-service', 'admin-express'].includes(d.origen)) return null;

    const slug         = event.params.slug;
    const nombre       = d.nombre || slug;
    const tipo         = d.tipo || null;
    const dueno        = d.contacto?.nombre || null;
    const waDueno      = String(d.contacto?.whatsapp || d.telefono || '').replace(/\D/g, '') || null;
    const emailDueno   = d.contacto?.email || d.ownerEmail || null;
    const refVendedor  = d.refVendedor || d.atribucion?.ref || null;
    const utmSource    = d.atribucion?.utm_source || null;
    const utmCampaign  = d.atribucion?.utm_campaign || null;
    const utmDisplay   = [utmSource, utmCampaign].filter(Boolean).join(' · ') || null;
    const diasTrial    = diasEntre(d.trialFinaliza?.toMillis?.()) ?? 14;
    const urlAgenda    = `https://${slug}.synaptechspa.cl`;
    const urlAdmin     = `https://barberiaelegance.synaptechspa.cl/admin/`;

    // 1. Push a los admins (mismo canal FCM que el resto de /admin).
    try {
      await dispatchAdminPush(db, messaging, {
        title: refVendedor
          ? `🆕 Trial nuevo · ${refVendedor}`
          : '🆕 Nuevo local (self-service)',
        body: `${nombre}${tipo ? ` (${tipo})` : ''} · trial ${diasTrial}d` +
              (waDueno ? ` · ${dueno || 'dueño'} +${waDueno}` : ''),
        url:   '/admin/',
        tag:   `admin-nuevo-tenant-${slug}`,   // agrupa por tenant, evita duplicados
        data:  { tipo: 'nuevo_tenant', slug, refVendedor: refVendedor || '' },
      });
    } catch (e) { logger.error('[admin-alerta push]', e.message); }

    // 2. WhatsApp a Ignacio (chat consigo mismo vía chip ventas — el push
    //    se pierde entre notificaciones, el WA lo lees siempre).
    try {
      const evo = crearCliente({ baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value() });
      const lineas = [
        `🆕 *Nuevo trial · ${nombre}*`,
        '',
        `📍 ${slug}.synaptechspa.cl`,
        tipo ? `🏷️ ${tipo}` : null,
        dueno ? `👤 ${dueno}` : null,
        waDueno ? `📱 https://wa.me/${waDueno}` : null,
        emailDueno ? `✉️ ${emailDueno}` : null,
        `⏱ Trial ${diasTrial} días`,
        `🔗 Origen: ${origenBonito(d.origen)}`,
        refVendedor ? `👤 Vendedor: *${refVendedor}*` : null,
        utmDisplay ? `📢 UTM: ${utmDisplay}` : null,
        '',
        `→ /admin/ (botón "Tenants nuevos")`,
      ].filter(Boolean);
      await evo.enviarTexto(INSTANCIA_WA, WHATSAPP_IGNACIO, lineas.join('\n'));
    } catch (e) { logger.warn('[admin-alerta WA]', e.message); }

    // 3. Email a Ignacio (registro histórico + CTA grandes).
    try {
      await enviarEmail({
        from:    MAIL_FROM,
        to:      EMAIL_IGNACIO,
        subject: refVendedor
          ? `🆕 Trial nuevo desde ${refVendedor}: ${nombre}`
          : `🆕 Nuevo trial: ${nombre}`,
        html: htmlAvisoNuevoTenant({
          nombre, slug, tipo, dueno, waDueno, emailDueno,
          diasTrial, ref: refVendedor, utm: utmDisplay,
          origen: d.origen, urlAgenda, urlAdmin,
        }),
      });
    } catch (e) { logger.warn('[admin-alerta email]', e.message); }

    logger.info(`[admin-alerta] nuevo tenant ${slug} nombre="${nombre}" ref=${refVendedor || '-'} trial=${diasTrial}d`);
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
