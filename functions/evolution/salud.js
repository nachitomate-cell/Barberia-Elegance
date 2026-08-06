'use strict';

// functions/evolution/salud.js
// ─────────────────────────────────────────────────────────────────────────────
//  SALUD DE SESIONES — RED DE SEGURIDAD del aviso de caída.
//
//  ⚠️ El aviso INMEDIATO ya no vive acá: lo manda evolution/alerta-sesion.js
//  con triggers sobre el doc, en el momento en que el webhook escribe el
//  cambio de estado. Este cron quedó para el caso que ese trigger NO puede
//  cubrir: si el VPS se muere, no llega ningún webhook, nadie escribe nada y
//  el trigger jamás se dispara. O sea, uno cubre "me avisaron que se cayó" y
//  el otro "nadie avisó nada y esto lleva rato callado".
//
//  Los dos comparten el candado `alertaDesconexionEnviada`, así que no se
//  duplican: el que llegue primero lo levanta y el otro se calla.
//
//  Cada 30 min, sesiones caídas hace >20 min (margen anti-flapping: Baileys
//  reconecta solo en cortes breves), un aviso por caída, por email (Resend).
//  Cubre tanto los números de los locales como los CHIPS de SynapTech.
//
//  El rastro lo deja el gateway en tenants/{tid}/configuracion/whatsapp:
//    desconectadoEn            → primer momento de la caída (webhook 'close')
//    alertaDesconexionEnviada  → candado de una-alerta-por-caída
//  Ambos se limpian al reconectar ('open'), re-armando la alerta.
//
//  DEPLOY: firebase deploy --only functions:evolutionSaludSesiones
// ─────────────────────────────────────────────────────────────────────────────

const { onSchedule }   = require('firebase-functions/v2/scheduler');
const { logger }       = require('firebase-functions');
const admin            = require('firebase-admin');
const { FieldValue }   = require('firebase-admin/firestore');

const db = admin.firestore();

const { enviarEmail, MAIL_SECRETS } = require('../lib/mailer');

const MAIL_FROM      = 'SynapTech <avisos@synaptechspa.cl>';
const EMAIL_SYNAPTECH = 'ignaciiio.mate@gmail.com';
const GRACIA_MIN     = 20;   // minutos caída antes de alertar (anti-flapping)

/* Caídas en un día que dejan de ser "Baileys reconectando" y pasan a ser una
   sesión degradada. Mismo umbral que CHIP_UMBRAL usa para los chips.

   Este aviso cubre el punto ciego del de arriba: aquel exige 20 minutos caída
   seguidos, así que una sesión que se cae y vuelve en cinco minutos —diez veces
   al día— nunca lo dispara, y al reconectar se borra `desconectadoEn` y no
   queda rastro. Reportaron eso mismo en kronnos_limache el 2026-08-06 y no
   hubo con qué confirmarlo. Acá se mira la FRECUENCIA, no la duración. */
const CAIDAS_DIA_ALERTA = 4;

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

function htmlAlerta({ local, tid, minutos, url }) {
  // `url` explícita para los chips: son de SynapTech y se gestionan desde ops,
  // no desde el panel de un local. Componer la del tenant con tid='ops' daba
  // una dirección que no existe.
  const panelUrl = url || `https://${tid}.synaptechspa.cl/gestion-interna/whatsapp?local=${tid}`;
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

/* Aviso de sesión INESTABLE. Va solo a SynapTech, no al dueño: el local no
   puede hacer nada con "tu sesión se cayó 6 veces" —no está caída ahora— y
   mandárselo solo genera una llamada. Es una señal para nosotros: revisar el
   VPS, la antigüedad del número o proponer un chip de respaldo. */
function htmlInestable({ local, tid, caidas, ultima }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0b1220;color:#e2e8f0;border-radius:14px;overflow:hidden;border:1px solid #1e293b;">
    <div style="padding:22px 26px;border-bottom:1px solid #1e293b;">
      <p style="margin:0;font-size:12px;letter-spacing:3px;color:#f59e0b;font-weight:bold;">SYNAPTECH · INTERNO</p>
      <h2 style="margin:6px 0 0;font-size:19px;color:#f8fafc;">Sesión inestable</h2>
    </div>
    <div style="padding:22px 26px;">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        La sesión de <b style="color:#f8fafc;">${local}</b> (${tid}) se cayó
        <b>${caidas} veces hoy</b>. Reconecta sola cada vez, así que el aviso de
        "20 minutos caída" nunca se dispara — pero una sesión que se cae seguido
        es una sesión degradada, y eso precede a un bloqueo.
      </p>
      <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;">Última caída: <b style="color:#cbd5e1;">${ultima}</b></p>
      <p style="margin:14px 0 0;font-size:13px;color:#cbd5e1;">
        Qué revisar: estado del VPS, antigüedad del número, y si el teléfono del
        local tiene batería o red inestable.
      </p>
      <a href="https://ops.synaptechspa.cl" style="display:inline-block;margin-top:16px;padding:10px 18px;border-radius:10px;background:#34d399;color:#052e16;font-size:13px;font-weight:bold;text-decoration:none;">Abrir ops</a>
    </div>
    <div style="padding:14px 26px;background:#0f172a;font-size:11px;color:#475569;">
      Powered by SynapTech SpA · synaptechspa.cl
    </div>
  </div>`;
}

exports.evolutionSaludSesiones = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'America/Santiago',
    region:   'us-central1',
    secrets:  [...MAIL_SECRETS],
  },
  async () => {
    // listDocuments, NO collection().get(): los docs padre tenants/{id}
    // suelen NO existir (solo subcolecciones) y get() los omite — con get()
    // este cron no vigilaba las sesiones de casi ningún local.
    const tenantRefs = await db.collection('tenants').listDocuments();
    const tids = new Set(tenantRefs.map(r => r.id));
    tids.add('elegance');

    let alertas = 0;
    for (const tid of tids) {
      try {
        const ref = db.doc(`tenants/${tid}/configuracion/whatsapp`);
        const cfg = (await ref.get()).data();
        if (!cfg) continue;
        // Solo tenants que USAN el módulo: para el resto, desconectado es lo normal.
        if (cfg.botEnabled !== true && cfg.confirmacionesEnabled !== true) continue;

        /* ── Sesión inestable (flapping) ──────────────────────────────
           Se evalúa ANTES del `continue` de "no está desconectada": el caso
           que cubre es justamente una sesión que AHORA está conectada pero
           se cayó varias veces hoy. Con el chequeo abajo nunca se alcanzaría.
           Un aviso por día y por local (`alertaInestableDia`). */
        try {
          const hoyCl = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
          }).format(new Date());
          const cuota  = (await db.doc(`tenants/${tid}/wa_cuota/${hoyCl}`).get()).data() || {};
          const caidas = Number(cuota.caidas) || 0;
          if (caidas >= CAIDAS_DIA_ALERTA && cfg.alertaInestableDia !== hoyCl) {
            const td    = (await db.doc(`tenants/${tid}`).get()).data() || {};
            const local = td.nombre || td.nombreCorto || tid;
            const ultima = cuota.ultimaCaida?.toDate
              ? cuota.ultimaCaida.toDate().toLocaleString('es-CL', { timeZone: 'America/Santiago' })
              : '—';
            await enviarEmail({
              from:    MAIL_FROM,
              to:      [EMAIL_SYNAPTECH],
              subject: `📶 Sesión inestable · ${local} (${caidas} caídas hoy)`,
              html:    htmlInestable({ local, tid, caidas, ultima }),
            }, { grupo: 'interno', etiqueta: 'evolution-inestable' });
            await ref.set({ alertaInestableDia: hoyCl }, { merge: true });
            alertas++;
            logger.warn(`[salud] ${tid}: sesión inestable, ${caidas} caídas hoy → alerta interna`);
          }
        } catch (e) {
          logger.error(`[salud] ${tid} flapping:`, e.message);
        }

        if (cfg.estadoConexion !== 'disconnected') continue;
        if (cfg.alertaDesconexionEnviada === true) continue;   // ya se avisó esta caída

        const caidaMs = cfg.desconectadoEn && cfg.desconectadoEn.toMillis ? cfg.desconectadoEn.toMillis() : 0;
        if (!caidaMs) continue;                                 // sin rastro (caída pre-feature)
        const minutos = Math.floor((Date.now() - caidaMs) / 60000);
        if (minutos < GRACIA_MIN) continue;                     // puede reconectar sola

        const td    = (await db.doc(`tenants/${tid}`).get()).data() || {};
        const local = td.nombre || td.nombreCorto || tid;
        const to    = [...new Set([EMAIL_SYNAPTECH, ...(await emailsDueno(tid))])];

        await enviarEmail({
          from:    MAIL_FROM,
          to,
          subject: `⚠️ WhatsApp desconectado · ${local} (${minutos} min)`,
          html:    htmlAlerta({ local, tid, minutos }),
        }, { grupo: 'interno', etiqueta: 'evolution-salud' });
        await ref.set({ alertaDesconexionEnviada: true, alertaDesconexionEn: FieldValue.serverTimestamp() }, { merge: true });
        alertas++;
        logger.warn(`[salud] ${tid}: sesión caída ${minutos} min → alerta enviada a ${to.join(', ')}`);
      } catch (e) {
        logger.error(`[salud] ${tid}:`, e.message);
      }
    }
    // ── Chips de SynapTech ──
    // El trigger inmediato ya los vigila; esto es para cuando el VPS se cae
    // entero y no llega el webhook. Van solo a SynapTech: el chip es nuestro.
    const sysRefs = await db.collection('_system').listDocuments();
    for (const r of sysRefs) {
      if (r.id !== 'wa_plataforma' && !r.id.startsWith('wa_plataforma_')) continue;
      try {
        const cfg = (await r.get()).data();
        if (!cfg) continue;
        if (cfg.estadoConexion !== 'disconnected') continue;
        if (cfg.alertaDesconexionEnviada === true) continue;
        if (cfg.cierreManual === true) continue;            // lo desvinculamos nosotros

        const caidaMs = cfg.desconectadoEn?.toMillis ? cfg.desconectadoEn.toMillis() : 0;
        if (!caidaMs) continue;
        const minutos = Math.floor((Date.now() - caidaMs) / 60000);
        if (minutos < GRACIA_MIN) continue;

        const chipId = r.id === 'wa_plataforma' ? 'synaptech' : r.id.slice('wa_plataforma_'.length);
        const nombre = cfg.nombre || (chipId === 'synaptech' ? 'Chip principal' : `Chip ${chipId}`);

        await enviarEmail({
          from:    MAIL_FROM,
          to:      [EMAIL_SYNAPTECH],
          subject: `⚠️ Chip de SynapTech desconectado · ${nombre} (${minutos} min)`,
          html:    htmlAlerta({ local: nombre, minutos, url: 'https://ops.synaptechspa.cl' }),
        }, { grupo: 'interno', etiqueta: 'evolution-salud-chip' });
        await r.set({ alertaDesconexionEnviada: true, alertaDesconexionEn: FieldValue.serverTimestamp() }, { merge: true });
        alertas++;
        logger.warn(`[salud] chip ${chipId}: caído ${minutos} min → alerta enviada`);
      } catch (e) {
        logger.error(`[salud] chip ${r.id}:`, e.message);
      }
    }

    if (alertas) logger.info(`[salud] ciclo: ${alertas} alerta(s) de sesión caída`);
  },
);
