'use strict';

// functions/recordatorio-cobro.js
// ─────────────────────────────────────────────────────────────────
//  RECORDATORIO DE COBRO (mensualidad) — aviso al admin del local.
//  Cron diario: avisa cuando el pago está próximo a vencer o atrasado.
//  Lee _billing/{tenant}.
//
//  Canales, en orden:
//    1) Push FCM a los jefes/admin del local (si tienen la PWA activada).
//    2) FALLBACK por email (Resend) si NO hay tokens: si nadie activó las
//       notificaciones, el aviso igual sale. Antes esto fallaba en silencio.
//    3) ALERTA al superadmin (/admin) si un local con cobro pendiente lleva
//       ALERTA_DIAS_SIN_CANAL días sin push, y con más urgencia si además no
//       hay email de contacto (ahí el cobro es literalmente inalcanzable).
//
//  Destinatarios de email: SOLO campos explícitos (_billing.emailCobro o
//  tenants/{tid}.ownerEmail). Nunca se derivan de barberos/, cuyos correos
//  son credenciales de login y en muchos locales son inventados.
//
//  Deploy: firebase deploy --only functions:recordatorioCobro
// ─────────────────────────────────────────────────────────────────

const { onSchedule }    = require('firebase-functions/v2/scheduler');
const { defineSecret }  = require('firebase-functions/params');
const { logger }        = require('firebase-functions');
const admin             = require('firebase-admin');
const { dispatchAdminPush } = require('./admin-push');
// Copy + HTML compartidos con scripts/preview-email-cobro.js, para que lo que
// se revisa por diseño sea exactamente lo que reciben los locales.
const { buildMensaje, buildEmailHtml } = require('./lib/email-cobro-template');

const db        = admin.firestore();
const messaging = admin.messaging();
const TIMEZONE  = 'America/Santiago';

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const MAIL_FROM      = 'SynapTech <cobros@synaptechspa.cl>';

// Días respecto al vencimiento en los que se envía recordatorio.
// Negativo = antes de vencer; 0 = vence hoy; positivo = atrasado.
const DIAS_RECORDATORIO = new Set([-3, -1, 0, 1, 3, 8, 15]);

// Pasado el día 15 la escalera se acababa y el local NUNCA volvía a recibir
// un aviso: quien aguantaba dos semanas dejaba de existir para el cobro.
// Ahora se repite cada RECORDATORIO_RECURRENTE días de forma indefinida.
const RECORDATORIO_RECURRENTE = 7;

function tocaRecordatorio(dias) {
  if (DIAS_RECORDATORIO.has(dias)) return true;
  return dias > 15 && (dias - 15) % RECORDATORIO_RECURRENTE === 0;
}

// Días seguidos sin tokens push antes de molestar al superadmin.
const ALERTA_DIAS_SIN_CANAL = 3;

const fcmTokensColPath = (tid) => (tid === 'elegance' ? 'fcm_tokens' : `tenants/${tid}/fcm_tokens`);
const barberosColPath  = (tid) => (tid === 'elegance' ? 'barberos'   : `tenants/${tid}/barberos`);

function santiagoHoyUTC() {
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  const [y, m, d] = dtf.format(new Date()).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function parseFechaUTC(f) {
  try {
    const s = typeof f === 'string' ? f : (f && f.toDate ? f.toDate().toISOString().slice(0, 10) : null);
    if (!s) return null;
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return Date.UTC(y, m - 1, d);
  } catch { return null; }
}

// Tokens de los administradores/jefes del local.
async function tokensAdmin(tid) {
  try {
    const [bSnap, tSnap] = await Promise.all([
      db.collection(barberosColPath(tid)).get(),
      db.collection(fcmTokensColPath(tid)).where('activo', '==', true).get(),
    ]);
    const uids = new Set();
    bSnap.forEach(doc => {
      const b = doc.data();
      if (b.activo === false) return;
      if (b.rol === 'admin') { uids.add(doc.id); if (b.uid) uids.add(b.uid); }
    });
    const out = [];
    tSnap.forEach(doc => {
      const x = doc.data();
      if (x.token && uids.has(x.uid)) out.push({ id: doc.id, token: x.token });
    });
    return out;
  } catch (e) {
    logger.warn(`[Cobro] tokens ${tid}: ${e.message}`);
    return [];
  }
}

// Destinatarios EXPLÍCITOS para el fallback por correo, en orden:
//   1) settings/general.emailAvisos — correo oficial del local, que el propio
//      dueño edita en /gestion-interna → Configuración → "Correo para avisos".
//   2) _billing/{tid}.emailCobro    — override del superadmin (string | array)
//   3) tenants/{tid}.ownerEmail     — capturado en el alta self-service
// NUNCA se usan los correos de barberos/: son credenciales de login y en
// varios locales están inventados.
const settingsRefPath = (tid) => (tid === 'elegance' ? 'settings/general' : `tenants/${tid}/settings/general`);

async function emailsCobro(tid, billingData) {
  const limpia = (v) => {
    const arr = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
    return [...new Set(arr.map(e => String(e || '').trim().toLowerCase()).filter(e => e.includes('@')))];
  };
  let nombreLocal = '';

  try {
    const s = await db.doc(settingsRefPath(tid)).get();
    if (s.exists) {
      nombreLocal = String(s.data().nombre || '').trim();
      const oficial = limpia(s.data().emailAvisos);
      if (oficial.length) return { emails: oficial, nombreLocal };
    }
  } catch (e) {
    logger.warn(`[Cobro] emailAvisos ${tid}: ${e.message}`);
  }

  const deBilling = limpia(billingData.emailCobro);
  if (deBilling.length) return { emails: deBilling, nombreLocal };

  try {
    const t = await db.collection('tenants').doc(tid).get();
    if (t.exists) {
      if (!nombreLocal) nombreLocal = String(t.data().nombre || '').trim();
      const owner = limpia(t.data().ownerEmail);
      if (owner.length) return { emails: owner, nombreLocal };
    }
  } catch (e) {
    logger.warn(`[Cobro] ownerEmail ${tid}: ${e.message}`);
  }
  return { emails: [], nombreLocal };
}

async function sendResend(apiKey, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

exports.recordatorioCobro = onSchedule(
  { schedule: '0 10 * * *', timeZone: TIMEZONE, secrets: [RESEND_API_KEY] },
  async () => {
    const hoyUTC   = santiagoHoyUTC();
    const todayStr = new Date(hoyUTC).toISOString().slice(0, 10);
    const snap     = await db.collection('_billing').get();

    let totalPush = 0, totalMail = 0;
    const sinCanal = [];   // locales inalcanzables → alerta al superadmin

    for (const doc of snap.docs) {
      const tid = doc.id;
      const d   = doc.data();
      const dueUTC = parseFechaUTC(d.fechaProximoPago);
      if (dueUTC === null) continue;

      const dias = Math.round((hoyUTC - dueUTC) / 86400000); // + = atrasado, - = falta
      if (!tocaRecordatorio(dias)) continue;
      // Idempotencia diaria: da igual por qué canal haya salido hoy.
      if (d.ultimoRecordatorioPush === todayStr || d.ultimoRecordatorioEmail === todayStr) continue;

      // sinCorte: se avisa igual, pero sin prometer bloqueos que no ocurren.
      const { title, body } = buildMensaje(dias, d.montoPendiente, d.sinCorte === true);
      const tokens = await tokensAdmin(tid);

      // ── Canal 1: push FCM ──────────────────────────────────────
      if (tokens.length) {
        const invalidos = [];
        let enviados = 0;

        await Promise.all(tokens.map(async t => {
          try {
            await messaging.send({
              token: t.token,
              notification: { title, body },
              data: { tipo: 'cobro', tenantId: tid, url: '/gestion-interna/mensualidad' },
              webpush: {
                headers: { Urgency: 'high' },
                notification: {
                  title, body,
                  icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
                  tag: `cobro-${tid}`, renotify: true, vibrate: [200, 100, 200],
                },
                fcmOptions: { link: `/gestion-interna/mensualidad?local=${tid}` },
              },
            });
            enviados++;
          } catch (err) {
            const code = err.errorInfo?.code || err.code || '';
            if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'].includes(code)) invalidos.push(t.id);
            logger.warn(`[Cobro] ✗ ${tid}: ${code || err.message}`);
          }
        }));

        if (invalidos.length) {
          const batch = db.batch();
          invalidos.forEach(id => batch.update(db.collection(fcmTokensColPath(tid)).doc(id), { activo: false }));
          await batch.commit().catch(() => {});
        }

        if (enviados > 0) {
          await doc.ref.update({
            ultimoRecordatorioPush: todayStr,
            sinTokensDesde: admin.firestore.FieldValue.delete(),  // se recuperó el canal
          }).catch(() => {});
          totalPush += enviados;
          logger.info(`[Cobro] ✓ ${tid} (dias=${dias}) → ${enviados} push`);
          continue;
        }
        // Si ninguna push salió, seguimos al fallback por correo.
      }

      // ── Canal 2: fallback por email ────────────────────────────
      // Marca desde cuándo este local no tiene push, para la alerta.
      const desde = d.sinTokensDesde || todayStr;
      const diasSinCanal = Math.round((hoyUTC - (parseFechaUTC(desde) ?? hoyUTC)) / 86400000);

      const { emails: destinatarios, nombreLocal } = await emailsCobro(tid, d);
      let mailOk = false;

      if (destinatarios.length) {
        try {
          await sendResend(RESEND_API_KEY.value(), {
            from:    MAIL_FROM,
            to:      destinatarios,
            subject: title,
            html:    buildEmailHtml({ title, body, tid, nombreLocal }),
          });
          mailOk = true;
          totalMail += destinatarios.length;
          logger.info(`[Cobro] ✉ ${tid} (dias=${dias}) → email a ${destinatarios.length} destinatario(s)`);
        } catch (e) {
          logger.error(`[Cobro] ✗ email ${tid}: ${e.message}`);
        }
      } else {
        logger.warn(`[Cobro] ${tid}: sin tokens y sin email de contacto`);
      }

      await doc.ref.update({
        sinTokensDesde: desde,
        ...(mailOk ? { ultimoRecordatorioEmail: todayStr } : {}),
      }).catch(() => {});

      // ── Canal 3: alerta al superadmin ──────────────────────────
      // Solo si la falta de push ya es crónica, o si no hubo NINGÚN canal.
      const yaAvisadoHoy = d.ultimaAlertaSuperadmin === todayStr;
      if (!yaAvisadoHoy && (!mailOk || diasSinCanal >= ALERTA_DIAS_SIN_CANAL)) {
        sinCanal.push({ tid, dias, diasSinCanal, mailOk, ref: doc.ref });
      }
    }

    // Una sola push al superadmin por corrida (no una por local).
    if (sinCanal.length) {
      const criticos = sinCanal.filter(x => !x.mailOk);
      const nombres  = sinCanal.map(x => x.tid).join(', ');
      const title = criticos.length
        ? `⛔ ${criticos.length} local(es) sin canal de cobro`
        : `📵 ${sinCanal.length} local(es) sin push de cobro`;
      const body = criticos.length
        ? `Sin push NI email: ${criticos.map(x => x.tid).join(', ')}. No les está llegando el aviso de mensualidad.`
        : `${nombres}: llevan ${ALERTA_DIAS_SIN_CANAL}+ días sin notificaciones activas. El aviso salió por correo.`;
      try {
        await dispatchAdminPush(db, messaging, {
          title, body,
          url:  '/admin/',
          tag:  'admin-cobro-sin-canal',
          data: { tipo: 'cobro_sin_canal', tenants: nombres },
        });
        await Promise.all(sinCanal.map(x =>
          x.ref.update({ ultimaAlertaSuperadmin: todayStr }).catch(() => {})));
      } catch (e) {
        logger.error('[Cobro] alerta superadmin:', e.message);
      }
    }

    logger.info(`[Cobro] Resumen: ${totalPush} push, ${totalMail} email, ${sinCanal.length} sin canal`);
  },
);
