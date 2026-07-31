'use strict';

// functions/evolution/alerta-sesion.js
// ─────────────────────────────────────────────────────────────────────────────
//  AVISO INMEDIATO cuando un número se desvincula o lo bloquean.
//
//  Ya existía evolution/salud.js: un cron cada 30 min que avisa si una sesión
//  lleva >20 min caída. Eso son hasta 50 minutos de silencio, y para un número
//  BLOQUEADO —que no vuelve solo— son 50 minutos perdidos. Además solo miraba
//  las sesiones de los locales: los chips de SynapTech (_system/wa_plataforma*)
//  no los vigilaba nadie, y por eso el chip principal se cayó a las 23:01 y nos
//  enteramos al mirar el panel.
//
//  Acá se avisa en el momento, con TRIGGERS sobre el doc que el webhook ya
//  escribe. Trigger y no envío inline en el webhook a propósito: el estado se
//  toca desde el webhook, desde el polling de las callables y desde /admin, y
//  el aviso tiene que salir en los tres casos. (Mismo criterio que el espejo de
//  confirmaciones, y la lección que dejaron los doc-espejo de roles.)
//
//  ⚠️ EL CRON SIGUE HACIENDO FALTA, no es redundante: si el VPS se muere no
//  llega ningún webhook, así que este trigger nunca se dispara. El cron es el
//  que detecta el silencio. Uno cubre "me avisaron que se cayó" y el otro
//  "nadie me avisó nada y lleva rato callado".
//
//  DEPLOY: firebase deploy --only functions:alertaSesionTenant,functions:alertaSesionChip
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { FieldValue }        = require('firebase-admin/firestore');

const db = admin.firestore();
const { enviarEmail, MAIL_SECRETS } = require('../lib/mailer');

const MAIL_FROM       = 'SynapTech <avisos@synaptechspa.cl>';
const EMAIL_SYNAPTECH = 'ignaciiio.mate@gmail.com';

/* Códigos de cierre que significan "la sesión NO vuelve sola".
     401 loggedOut  → el dispositivo se desvinculó (desde el teléfono, o porque
                      WhatsApp cerró la sesión). Es también la cara habitual de
                      un bloqueo.
     403 forbidden  → cuenta restringida o baneada.
     402            → cuenta suspendida por pago/política.
   Cualquier otro (515 restart, 428 close, 440 replaced, timeouts) es una caída
   operativa: Baileys reconecta solo casi siempre. */
const CODIGOS_TERMINALES = new Set([401, 402, 403]);

const esTerminal = (code) => CODIGOS_TERMINALES.has(Number(code));

/** Destinatarios del dueño. NUNCA correos de barberos/: son credenciales de
 *  login y muchos están inventados. Solo lo que el dueño declaró a propósito. */
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

function html({ titulo, cuerpo, acento, quePasa, queHacer, url, urlTexto }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0b1220;color:#e2e8f0;border-radius:14px;overflow:hidden;border:1px solid #1e293b;">
    <div style="background:${acento};padding:18px 22px;">
      <p style="margin:0;font-size:17px;font-weight:bold;color:#fff;">${titulo}</p>
    </div>
    <div style="padding:22px;">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;">${cuerpo}</p>
      <div style="background:#111c2f;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:bold;">Qué está pasando</p>
        <p style="margin:0;font-size:13px;line-height:1.55;color:#cbd5e1;">${quePasa}</p>
      </div>
      <div style="background:#111c2f;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
        <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:bold;">Qué hacer</p>
        <p style="margin:0;font-size:13px;line-height:1.55;color:#cbd5e1;">${queHacer}</p>
      </div>
      <a href="${url}" style="display:inline-block;background:${acento};color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:bold;">${urlTexto}</a>
    </div>
    <div style="padding:14px 22px;border-top:1px solid #1e293b;">
      <p style="margin:0;font-size:11px;color:#475569;">Aviso automático de SynapTech · se envía una sola vez por caída.</p>
    </div>
  </div>`;
}

/* Núcleo compartido. `ref` es el doc que lleva el candado, para que un flapping
   (close/open/close en segundos) no dispare un correo por cada rebote. */
async function avisar({ ref, antes, ahora, etiqueta, nombre, destinatarios, url, urlTexto, esChip }) {
  const eraConectado = antes.estadoConexion === 'connected';
  const estaCaido    = ahora.estadoConexion === 'disconnected';

  // ── Volvió: cerrar el ciclo. Solo si habíamos alertado; si no, es ruido. ──
  if (eraConectado === false && ahora.estadoConexion === 'connected') {
    if (antes.alertaDesconexionEnviada !== true) return;
    await enviarEmail({
      from: MAIL_FROM, to: destinatarios,
      subject: `✅ WhatsApp reconectado · ${nombre}`,
      html: html({
        titulo: '✅ Volvió a estar en línea', acento: '#16a34a',
        cuerpo: `La sesión de <b>${nombre}</b> se reconectó. Los mensajes vuelven a salir con normalidad.`,
        quePasa: 'La caída que te avisamos antes ya se resolvió.',
        queHacer: 'Nada. Este correo es solo para que no te quedes con la duda.',
        url, urlTexto,
      }),
    }, { primario: 'resend', etiqueta: `${etiqueta}-recuperada` }).catch(e =>
      logger.error(`[alerta-sesion] recuperada ${nombre}:`, e.message));
    logger.info(`[alerta-sesion] ${nombre}: reconectada → aviso de recuperación`);
    return;
  }

  if (!eraConectado || !estaCaido) return;              // no es la transición
  if (ahora.alertaDesconexionEnviada === true) return;  // ya se avisó esta caída

  // Desvinculación hecha por nosotros desde el panel: ya la sabe quien la hizo.
  // Un correo acá solo entrena a ignorar los correos que sí importan.
  if (ahora.cierreManual === true) {
    logger.info(`[alerta-sesion] ${nombre}: desvinculación manual, sin aviso`);
    await ref.set({ alertaDesconexionEnviada: true }, { merge: true }).catch(() => {});
    return;
  }

  const code     = ahora.cierreStatusCode ?? null;
  const terminal = esTerminal(code);
  const numero   = ahora.numeroVinculado ? `+${ahora.numeroVinculado}` : 'el número';

  const contenido = terminal
    ? {
        titulo: '🔴 Sesión cerrada por WhatsApp', acento: '#dc2626',
        cuerpo: `WhatsApp cerró la sesión de <b>${nombre}</b> (${numero}). <b>No va a reconectar sola.</b>`,
        quePasa: `El código de cierre fue <b>${code}</b>${code === 403 ? ' (cuenta restringida)' : ' (sesión cerrada o dispositivo desvinculado)'}. ` +
          'Puede ser que alguien haya desvinculado el dispositivo desde el teléfono, o que WhatsApp haya bloqueado el número. ' +
          'Mientras tanto no sale ni un mensaje: ni confirmaciones, ni recordatorios, ni respuestas del asistente.',
        queHacer: code === 403 || code === 402
          ? 'Revisa si el número puede seguir usando WhatsApp desde el teléfono. Si está bloqueado, hay que reemplazarlo por otro: un número baneado no se recupera.'
          : 'Vuelve a vincular escaneando el QR. Si al escanear se cae de nuevo enseguida, el número está bloqueado y hay que reemplazarlo.',
      }
    : {
        titulo: '⚠️ WhatsApp desconectado', acento: '#d97706',
        cuerpo: `La sesión de <b>${nombre}</b> (${numero}) se desconectó recién.`,
        quePasa: (code ? `Cierre con código <b>${code}</b>. ` : '') +
          'Suele ser el teléfono sin internet, apagado, o un corte del servidor. ' +
          'Mientras esté así no salen confirmaciones ni recordatorios.',
        queHacer: 'Normalmente se reconecta sola en unos minutos y te avisamos cuando vuelva. ' +
          'Si en media hora no llega ese aviso, revisa que el teléfono tenga internet y, si no, vuelve a escanear el QR.',
      };

  await enviarEmail({
    from: MAIL_FROM, to: destinatarios,
    subject: terminal
      ? `🔴 URGENTE · WhatsApp cerró la sesión de ${nombre}`
      : `⚠️ WhatsApp desconectado · ${nombre}`,
    html: html({ ...contenido, url, urlTexto }),
  }, { primario: 'resend', etiqueta: `${etiqueta}-${terminal ? 'terminal' : 'caida'}` });

  await ref.set({
    alertaDesconexionEnviada: true,
    alertaDesconexionEn:      FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});

  logger.warn(`[alerta-sesion] ${nombre}${esChip ? ' (chip)' : ''}: ${terminal ? 'TERMINAL' : 'caída'} code=${code} → ${destinatarios.join(', ')}`);
}

/* ── Sesiones de los locales (su propio número) ── */
exports.alertaSesionTenant = onDocumentWritten(
  { document: 'tenants/{tid}/configuracion/whatsapp', region: 'us-central1', secrets: [...MAIL_SECRETS] },
  async (event) => {
    const tid   = event.params.tid;
    const antes = event.data?.before?.data() || {};
    const ahora = event.data?.after?.data();
    if (!ahora) return;
    if (antes.estadoConexion === ahora.estadoConexion) return;   // no cambió el estado

    // Solo locales que USAN el módulo: para el resto, desconectado es lo normal
    // y el correo sería puro ruido.
    if (ahora.botEnabled !== true && ahora.confirmacionesEnabled !== true) return;

    const td     = (await db.doc(`tenants/${tid}`).get()).data() || {};
    const nombre = td.nombre || td.nombreCorto || tid;
    try {
      await avisar({
        ref:   db.doc(`tenants/${tid}/configuracion/whatsapp`),
        antes, ahora,
        etiqueta: 'sesion-local',
        nombre,
        destinatarios: [...new Set([EMAIL_SYNAPTECH, ...(await emailsDueno(tid))])],
        url:       `https://app.synaptechspa.cl/gestion-interna/whatsapp?local=${tid}`,
        urlTexto:  'Abrir mi panel de WhatsApp',
        esChip:    false,
      });
    } catch (e) { logger.error(`[alerta-sesion] ${tid}:`, e.message); }
  },
);

/* ── Chips de SynapTech ──
   Van SOLO a SynapTech: el chip es nuestro y el local no puede hacer nada al
   respecto. Avisarle sería preocuparlo con algo que no está en su mano. */
exports.alertaSesionChip = onDocumentWritten(
  { document: '_system/{docId}', region: 'us-central1', secrets: [...MAIL_SECRETS] },
  async (event) => {
    const id = event.params.docId;
    // /_system guarda muchas cosas además de los chips (estado de tenants,
    // kill switch, qaBarbero…). Sin este filtro el trigger se dispararía con
    // cada cambio de cualquiera de ellos.
    if (id !== 'wa_plataforma' && !id.startsWith('wa_plataforma_')) return;

    const antes = event.data?.before?.data() || {};
    const ahora = event.data?.after?.data();
    if (!ahora) return;                                          // chip eliminado = desvinculación deliberada
    if (antes.estadoConexion === ahora.estadoConexion) return;

    const chipId = id === 'wa_plataforma' ? 'synaptech' : id.slice('wa_plataforma_'.length);
    const nombre = ahora.nombre || (chipId === 'synaptech' ? 'Chip principal' : `Chip ${chipId}`);
    try {
      await avisar({
        ref:   db.doc(`_system/${id}`),
        antes, ahora,
        etiqueta: 'sesion-chip',
        nombre,
        destinatarios: [EMAIL_SYNAPTECH],
        url:       'https://ops.synaptechspa.cl',
        urlTexto:  'Abrir ops',
        esChip:    true,
      });
    } catch (e) { logger.error(`[alerta-sesion] chip ${chipId}:`, e.message); }
  },
);

// Para tests: no es parte del API público.
exports._esTerminal = esTerminal;
exports._avisar     = avisar;
