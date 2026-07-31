'use strict';

// functions/alerta-plantillas-meta.js
// ─────────────────────────────────────────────────────────────────────────────
//  AVISO POR CORREO CUANDO META RESUELVE UNA PLANTILLA
//
//  Meta no manda webhook de esto a menos que se suscriba el campo
//  `message_template_status_update`, así que hasta ahora la única forma de
//  saberlo era preguntar a mano. Y una plantilla puede quedarse PENDING días:
//  preguntar cada rato no escala y olvidarse tampoco, porque el canal oficial
//  es justo el que queda listo cuando aprueba.
//
//  Cron cada 30 min: lee el estado real en la WABA, lo compara con el último
//  visto y avisa SOLO cuando cambia. El estado anterior vive en
//  `_system/whatsapp_notif.plantillasEstado` — sin eso, cada ciclo mandaría un
//  correo repitiendo lo que ya sabes.
//
//  Avisa de los tres desenlaces, no solo del bueno:
//    APPROVED → ya se puede usar (y se dice qué falta para que salga)
//    REJECTED → con el motivo, que es lo único accionable
//    PAUSED / DISABLED → Meta la frenó por calidad; hay que mirarlo YA
//
//  DEPLOY: firebase deploy --only functions:alertaPlantillasMeta
// ─────────────────────────────────────────────────────────────────────────────

const { onSchedule }   = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { logger }       = require('firebase-functions');
const admin            = require('firebase-admin');

const db = admin.firestore();
const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');

const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
const WABA_ID        = '1585275879793911';

const MAIL_FROM       = 'SynapTech <avisos@synaptechspa.cl>';
const EMAIL_SYNAPTECH = 'ignaciiio.mate@gmail.com';
const CFG             = '_system/whatsapp_notif';

const TONO = {
  APPROVED: { ic: '✅', color: '#16a34a', titulo: 'Plantilla aprobada' },
  REJECTED: { ic: '❌', color: '#dc2626', titulo: 'Plantilla rechazada' },
  PAUSED:   { ic: '⚠️', color: '#d97706', titulo: 'Plantilla pausada por Meta' },
  DISABLED: { ic: '🔴', color: '#dc2626', titulo: 'Plantilla deshabilitada' },
};

function html({ nombre, estado, motivo, apuntada, llaveGlobal }) {
  const t = TONO[estado] || { ic: 'ℹ️', color: '#475569', titulo: `Plantilla: ${estado}` };
  // Aprobar no basta para que salga un mensaje: hay dos interruptores más. Se
  // dicen acá para que el correo cierre el tema en vez de abrir una búsqueda.
  const pasos = estado !== 'APPROVED' ? '' : `
      <div style="background:#111c2f;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:bold;">Para que empiece a salir</p>
        <p style="margin:0;font-size:13px;line-height:1.7;color:#cbd5e1;">
          ${apuntada ? '✅' : '⬜'} La configuración apunta a esta plantilla${apuntada ? '' : ' — hoy apunta a otra'}<br>
          ${llaveGlobal ? '✅' : '⬜'} Llave global de plantillas encendida${llaveGlobal ? '' : ' — está APAGADA'}<br>
          ⬜ El módulo activado en cada local que lo vaya a usar
        </p>
      </div>`;
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0b1220;color:#e2e8f0;border-radius:14px;overflow:hidden;border:1px solid #1e293b;">
    <div style="background:${t.color};padding:18px 22px;">
      <p style="margin:0;font-size:17px;font-weight:bold;color:#fff;">${t.ic} ${t.titulo}</p>
    </div>
    <div style="padding:22px;">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;">
        <code style="background:#111c2f;padding:2px 7px;border-radius:5px;">${nombre}</code> pasó a <b>${estado}</b>.
      </p>
      ${motivo ? `<div style="background:#111c2f;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:bold;">Motivo</p>
        <p style="margin:0;font-size:13px;line-height:1.55;color:#cbd5e1;">${motivo}</p>
      </div>` : ''}
      ${pasos}
      <a href="https://business.facebook.com/wa/manage/message-templates/" style="display:inline-block;background:${t.color};color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:bold;">Abrir WhatsApp Manager</a>
    </div>
    <div style="padding:14px 22px;border-top:1px solid #1e293b;">
      <p style="margin:0;font-size:11px;color:#475569;">Aviso automático · solo cuando el estado CAMBIA.</p>
    </div>
  </div>`;
}

exports.alertaPlantillasMeta = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'America/Santiago',
    region:   'us-central1',
    secrets:  [WHATSAPP_TOKEN, ...MAIL_SECRETS],
  },
  async () => {
    let plantillas;
    try {
      const r = await fetch(
        `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates?fields=name,status,rejected_reason&limit=100`,
        { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN.value()}` } },
      );
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      plantillas = j.data || [];
    } catch (e) {
      // Un fallo de red no puede tumbar el cron ni inventar cambios de estado.
      logger.error('[plantillas] no pude consultar la WABA:', e.message);
      return;
    }

    const cfg    = (await db.doc(CFG).get()).data() || {};
    const previo = cfg.plantillasEstado || {};
    const ahora  = {};
    for (const p of plantillas) ahora[p.name] = p.status;

    const cambios = plantillas.filter(p => previo[p.name] && previo[p.name] !== p.status);
    // Las que aparecen por primera vez NO se avisan: en el primer ciclo eso
    // serían todas, y estrenar la función con cinco correos de nada es la mejor
    // forma de que el próximo se ignore.
    const nuevas = plantillas.filter(p => !previo[p.name]);

    for (const p of cambios) {
      const motivo = p.rejected_reason && p.rejected_reason !== 'NONE' ? p.rejected_reason : null;
      await enviarEmail({
        from: MAIL_FROM,
        to:   [EMAIL_SYNAPTECH],
        subject: `${(TONO[p.status] || {}).ic || 'ℹ️'} ${p.name} → ${p.status} · WhatsApp`,
        html: html({
          nombre:      p.name,
          estado:      p.status,
          motivo,
          apuntada:    cfg.templateRecordatorio === p.name,
          llaveGlobal: cfg.templatesEnabled === true,
        }),
      }, { primario: 'resend', etiqueta: 'plantilla-meta' }).catch(e =>
        logger.error(`[plantillas] correo ${p.name}:`, e.message));
      logger.info(`[plantillas] ${p.name}: ${previo[p.name]} → ${p.status} · avisado`);
    }

    if (cambios.length || nuevas.length) {
      await db.doc(CFG).set({ plantillasEstado: ahora }, { merge: true }).catch(() => {});
    }
    if (nuevas.length) logger.info(`[plantillas] ${nuevas.length} plantilla(s) registradas por primera vez, sin aviso`);
  },
);
