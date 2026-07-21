'use strict';

// functions/evolution/salud.js
// ─────────────────────────────────────────────────────────────────────────────
//  SALUD DE SESIONES — alerta cuando el WhatsApp de un local se desconecta.
//
//  Antes, una sesión caída (QR desvinculado, teléfono apagado, VPS) dejaba
//  el bot y las confirmaciones MUDOS en silencio hasta que el dueño
//  reclamaba. Este cron (cada 30 min) detecta sesiones de tenants que USAN
//  el módulo (bot o confirmaciones activas) caídas hace >20 min (margen
//  anti-flapping: Baileys reconecta solo en cortes breves) y avisa UNA vez
//  por caída, por email (Resend), a SynapTech + al dueño del local.
//
//  El rastro lo deja el gateway en tenants/{tid}/configuracion/whatsapp:
//    desconectadoEn            → primer momento de la caída (webhook 'close')
//    alertaDesconexionEnviada  → candado de una-alerta-por-caída
//  Ambos se limpian al reconectar ('open'), re-armando la alerta.
//
//  DEPLOY: firebase deploy --only functions:evolutionSaludSesiones
// ─────────────────────────────────────────────────────────────────────────────

const { onSchedule }   = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { logger }       = require('firebase-functions');
const admin            = require('firebase-admin');
const { FieldValue }   = require('firebase-admin/firestore');

const db = admin.firestore();

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const MAIL_FROM      = 'SynapTech <avisos@synaptechspa.cl>';
const EMAIL_SYNAPTECH = 'ignaciiio.mate@gmail.com';
const GRACIA_MIN     = 20;   // minutos caída antes de alertar (anti-flapping)

// Destinatarios del dueño — mismo orden que recordatorio-cobro / comprobantes:
// settings.emailAvisos (lo edita el dueño) → tenants/{tid}.ownerEmail.
// NUNCA correos de barberos/ (credenciales de login, muchos inventados).
async function emailsDueno(tid) {
  const limpia = (v) => {
    const arr = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
    return [...new Set(arr.map(e => String(e || '').trim().toLowerCase()).filter(e => e.includes('@')))];
  };
  try {
    const s = await db.doc(tid === 'elegance' ? 'settings/general' : `tenants/${tid}/settings/general`).get();
    if (s.exists) {
      const avisos = limpia(s.data().emailAvisos);
      if (avisos.length) return avisos;
    }
  } catch (_) {}
  try {
    const t = await db.doc(`tenants/${tid}`).get();
    if (t.exists) return limpia(t.data().ownerEmail);
  } catch (_) {}
  return [];
}

function htmlAlerta({ local, tid, minutos }) {
  const panelUrl = `https://${tid}.synaptechspa.cl/gestion-interna/whatsapp?local=${tid}`;
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0b1220;color:#e2e8f0;border-radius:14px;overflow:hidden;border:1px solid #1e293b;">
    <div style="padding:22px 26px;border-bottom:1px solid #1e293b;">
      <p style="margin:0;font-size:12px;letter-spacing:3px;color:#f59e0b;font-weight:bold;">SYNAPTECH · AVISO</p>
      <h2 style="margin:6px 0 0;font-size:19px;color:#f8fafc;">Tu WhatsApp se desconectó ⚠️</h2>
    </div>
    <div style="padding:22px 26px;">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        El asistente de WhatsApp de <b style="color:#f8fafc;">${local}</b> lleva
        <b>${minutos} minutos desconectado</b>: el bot no está respondiendo y las
        confirmaciones de citas están en pausa.
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#cbd5e1;"><b style="color:#f8fafc;">Cómo reconectarlo (2 minutos):</b></p>
      <ol style="margin:0 0 14px;padding-left:18px;font-size:13px;line-height:1.8;color:#cbd5e1;">
        <li>Entra a tu panel → Conexiones → WhatsApp</li>
        <li>Toca "Vincular" y aparece un código QR</li>
        <li>En el teléfono del local: WhatsApp → Dispositivos vinculados → Vincular dispositivo → escanea el QR</li>
      </ol>
      <a href="${panelUrl}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#34d399;color:#052e16;font-size:13px;font-weight:bold;text-decoration:none;">Abrir mi panel</a>
      <p style="margin:18px 0 0;font-size:12px;color:#64748b;line-height:1.6;">
        Si el teléfono del local está apagado o sin internet, con encenderlo suele
        reconectar solo. ¿Necesitas ayuda? Escríbenos al WhatsApp +56 9 8356 8212.
      </p>
    </div>
    <div style="padding:14px 26px;background:#0f172a;font-size:11px;color:#475569;">
      Powered by SynapTech SpA · synaptechspa.cl
    </div>
  </div>`;
}

async function sendResend(apiKey, payload) {
  const res  = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

exports.evolutionSaludSesiones = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'America/Santiago',
    region:   'us-central1',
    secrets:  [RESEND_API_KEY],
  },
  async () => {
    // Pocos tenants → iterar es más simple/robusto que un collectionGroup.
    const tenantsSnap = await db.collection('tenants').get();
    const tids = new Set(tenantsSnap.docs.map(d => d.id));
    tids.add('elegance');

    let alertas = 0;
    for (const tid of tids) {
      try {
        const ref = db.doc(`tenants/${tid}/configuracion/whatsapp`);
        const cfg = (await ref.get()).data();
        if (!cfg) continue;
        // Solo tenants que USAN el módulo: para el resto, desconectado es lo normal.
        if (cfg.botEnabled !== true && cfg.confirmacionesEnabled !== true) continue;
        if (cfg.estadoConexion !== 'disconnected') continue;
        if (cfg.alertaDesconexionEnviada === true) continue;   // ya se avisó esta caída

        const caidaMs = cfg.desconectadoEn && cfg.desconectadoEn.toMillis ? cfg.desconectadoEn.toMillis() : 0;
        if (!caidaMs) continue;                                 // sin rastro (caída pre-feature)
        const minutos = Math.floor((Date.now() - caidaMs) / 60000);
        if (minutos < GRACIA_MIN) continue;                     // puede reconectar sola

        const td    = (await db.doc(`tenants/${tid}`).get()).data() || {};
        const local = td.nombre || td.nombreCorto || tid;
        const to    = [...new Set([EMAIL_SYNAPTECH, ...(await emailsDueno(tid))])];

        await sendResend(RESEND_API_KEY.value(), {
          from:    MAIL_FROM,
          to,
          subject: `⚠️ WhatsApp desconectado · ${local} (${minutos} min)`,
          html:    htmlAlerta({ local, tid, minutos }),
        });
        await ref.set({ alertaDesconexionEnviada: true, alertaDesconexionEn: FieldValue.serverTimestamp() }, { merge: true });
        alertas++;
        logger.warn(`[salud] ${tid}: sesión caída ${minutos} min → alerta enviada a ${to.join(', ')}`);
      } catch (e) {
        logger.error(`[salud] ${tid}:`, e.message);
      }
    }
    if (alertas) logger.info(`[salud] ciclo: ${alertas} alerta(s) de sesión caída`);
  },
);
