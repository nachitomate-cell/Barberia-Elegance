'use strict';

// functions/push-cliente-eventos.js
// ─────────────────────────────────────────────────────────────────
//  EVENTOS QUE LE IMPORTAN AL CLIENTE (dashboard PWA) — todos los locales
//
//  Hasta ahora el cliente se enteraba de lo que ÉL hacía (reservar,
//  ganar sellos) pero no de lo que el local le hacía a él. Este módulo
//  cierra esos huecos:
//
//  1) CITA CANCELADA POR EL LOCAL → push + correo (transición a
//     'Cancelada' SIN canceladaPor:'cliente' — ese campo solo lo
//     escriben dashboard/bot cuando cancela el propio cliente).
//  2) CITA REAGENDADA / CAMBIO DE PROFESIONAL → push (cambia fecha,
//     hora o barberoId en una cita en pie y futura).
//  3) CUPO LIBERADO → push a ADMINS si la cancelación deja hueco y hay
//     gente compatible en listaEspera (la lista no guarda uid del
//     cliente — solo nombre+teléfono — así que el push al cliente es
//     imposible; el staff llama y convierte).
//  4) RESEÑA POST-ATENCIÓN → cron horario: citas Completadas hace ≥2h
//     (pendingGoogleReview) → push al cliente hacia su dashboard, donde
//     ya vive la tarjeta de reseña (con o sin ficha de Google: la
//     calificación in-app funciona igual). Tope 1 por mes por cliente.
//  5) SUBISTE DE RANGO → cruce de umbral de sellosHistoricos
//     (espejo de calcRangoId en sello-automatico.js: 10 gold, 25 platinum).
//  6) TU INVITADO YA VINO → onCreate de referral_awards (el audit-doc
//     que escribe referidos-recompensa al convertir un referido).
//
//  "Premio disponible" NO va aquí: ya existe en push-cliente.js.
//
//  Piloto delnero 2026-08-03 → rollout general el mismo día (todos los
//  tenants vía listaTenants; elegance raíz con sus triggers gemelos).
//
//  DEPLOY:
//    firebase deploy --only functions:pushCitaCambiadaTenant,functions:pushCitaCambiadaElegance,functions:pushResenaPostAtencion,functions:pushRangoTenant,functions:pushRangoElegance,functions:pushReferidoConvertidoTenant,functions:pushReferidoConvertidoElegance
// ─────────────────────────────────────────────────────────────────

const { onDocumentUpdated, onDocumentWritten, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { writeNotifLog } = require('./lib/notif-log');
const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');
const { getTenantConfig } = require('./lib/tenant-mail-config');
const {
  TIMEZONE, hoySantiago, minutosAhoraSantiago, rootDe, listaTenants,
  tokensAdmins, enviarPushStaff, enviarPushCliente,
} = require('./lib/push-staff');

const db = admin.firestore();

const LOGO_URL = 'https://elegance.synaptechspa.cl/synaptech/ig.png';

// Igual que push-cliente.js: la cita puede traer el uid en varios campos.
async function resolverUidCita(root, cita) {
  if (cita.clienteUid) return cita.clienteUid;
  if (cita.clienteId && cita.clienteId.length > 12) return cita.clienteId;
  const email = (cita.clienteEmail || '').toLowerCase().trim();
  if (!email) return null;
  try {
    const q = await db.collection(`${root}users`).where('email', '==', email).limit(1).get();
    return q.empty ? null : q.docs[0].id;
  } catch (_) { return null; }
}

function citaGuard(cita) {
  return !cita || cita.skipNotificaciones === true || cita.origen === 'import_manual' || cita.origenQA;
}

// ═══ 1-3) CAMBIOS EN LA CITA (trigger onUpdate) ═════════════════════

function htmlCancelacion(cfg, cita) {
  const color = cfg.color || '#9CCC3C';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0b1220;color:#e2e8f0;border-radius:14px;overflow:hidden;border:1px solid #1e293b;">
    <div style="padding:22px 26px;border-bottom:1px solid #1e293b;">
      <p style="margin:0;font-size:12px;letter-spacing:3px;color:${color};font-weight:bold;">${(cfg.nombre || '').toUpperCase()}</p>
      <h2 style="margin:6px 0 0;font-size:19px;color:#f8fafc;">Tu cita fue cancelada 😔</h2>
    </div>
    <div style="padding:22px 26px;">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Hola <b style="color:#f8fafc;">${cita.clienteNombre || ''}</b>, lamentamos avisarte que el local
        tuvo que cancelar tu cita:
      </p>
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:14px 18px;margin:0 0 18px;font-size:14px;color:#e2e8f0;">
        ${cita.servicioNombre || cita.servicio || 'Atención'}${cita.barbero || cita.barberoNombre ? ` · con ${cita.barbero || cita.barberoNombre}` : ''}<br>
        <b>${cita.fecha || ''} a las ${cita.hora || ''}</b>
      </div>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Puedes reagendar en un par de toques — elige el horario que más te acomode.
      </p>
      <a href="${cfg.dashboardUrl || '#'}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:${color};color:#0b1220;font-size:14px;font-weight:bold;text-decoration:none;">Reagendar mi cita</a>
    </div>
    <div style="padding:14px 26px;background:#0f172a;font-size:11px;color:#475569;">
      <img src="${LOGO_URL}" alt="" width="14" height="14" style="vertical-align:middle;border-radius:3px;margin-right:6px;">Powered by SynapTech SpA &middot; synaptechspa.cl
    </div>
  </div>`;
}

async function avisarCupoLiberado(tid, root, cita) {
  // A cualquier cancelación de cita futura, mirar la lista de espera.
  if (!cita.fecha || cita.fecha < hoySantiago()) return;
  const snap = await db.collection(`${root}listaEspera`).get().catch(() => null);
  if (!snap || snap.empty) return;
  const compatibles = snap.docs.map(d => d.data()).filter(e =>
    ['en_espera', 'notificado'].includes(e.estado)
    && (e.flexible || e.fecha === cita.fecha)
    && (!e.barberoId || e.barberoId === cita.barberoId));
  if (!compatibles.length) return;

  const tokens = await tokensAdmins(root);
  if (!tokens.length) return;
  const n = compatibles.length;
  const r = await enviarPushStaff({
    tokens,
    title: '🔔 Se liberó un cupo',
    body:  `Se canceló ${cita.hora || ''} del ${cita.fecha}${cita.barbero || cita.barberoNombre ? ` (${cita.barbero || cita.barberoNombre})` : ''} y tienes ${n} persona${n === 1 ? '' : 's'} en lista de espera.`,
    link:  '/gestion-interna/lista-espera',
    tag:   `cupo-${tid}-${cita.fecha}-${cita.hora || ''}`,
  });
  await writeNotifLog(db, {
    tenantId: tid, type: 'push_cupo_liberado', channel: 'push',
    status: r.successCount ? 'sent' : 'failed',
    meta: { fecha: cita.fecha, hora: String(cita.hora || ''), enEspera: String(n) },
  });
  logger.info(`[cupo-liberado] ${tid}: ${cita.fecha} ${cita.hora} → ${r.successCount}/${tokens.length} push a admins (${n} en espera)`);
}

async function cambioCita(tid, citaId, before, after) {
  if (citaGuard(after) || !before) return;
  const root = rootDe(tid);

  const seCancelo = before.estado !== 'Cancelada' && after.estado === 'Cancelada';

  // ── Cancelación POR EL LOCAL → push + correo al cliente ──
  if (seCancelo && after.canceladaPor !== 'cliente' && !after.notifCancelLocalEnviada) {
    const uid = await resolverUidCita(root, after);
    const cfg = await getTenantConfig(tid, logger);
    let push = 0;
    if (uid) {
      push = await enviarPushCliente(root, uid, {
        title: '😔 Tu cita fue cancelada',
        body:  `${after.servicioNombre || after.servicio || 'Tu cita'} del ${after.fecha || ''} a las ${after.hora || ''} fue cancelada por ${cfg.nombre || 'el local'}. Toca para reagendar.`,
        data:  { type: 'cita_cancelada_local', citaId, url: '/dashboard.html' },
      });
    }
    let mail = null;
    const email = (after.clienteEmail || '').trim();
    if (email) {
      mail = await enviarEmail({
        from:    cfg.from || 'SynapTech <avisos@synaptechspa.cl>',
        to:      [email],
        subject: `Tu cita fue cancelada · ${cfg.nombre || ''}`.trim(),
        html:    htmlCancelacion(cfg, after),
      }, { grupo: 'citas', etiqueta: 'cita-cancelada-local', silencioso: true });
    }
    await db.doc(`${root}citas/${citaId}`).update({ notifCancelLocalEnviada: true }).catch(() => {});
    await writeNotifLog(db, {
      tenantId: tid, type: 'push_cita_cancelada_local', channel: 'push',
      status: (push > 0 || mail?.ok) ? 'sent' : 'failed',
      to: { nombre: after.clienteNombre || '', email },
      meta: { citaId, push: String(push), correo: String(!!mail?.ok) },
    });
    logger.info(`[cita-cancelada] ${tid}/${citaId}: push=${push} correo=${!!mail?.ok}`);
  }

  // ── Cualquier cancelación libera cupo → mirar lista de espera ──
  if (seCancelo) {
    try { await avisarCupoLiberado(tid, root, after); }
    catch (e) { logger.warn(`[cupo-liberado] ${tid}:`, e.message); }
  }

  // ── Reagendo / cambio de profesional (cita en pie y futura) ──
  const enPie = !['Cancelada', 'Completada'].includes(after.estado) && !['Cancelada', 'Completada'].includes(before.estado);
  const cambioHorario = before.fecha !== after.fecha || before.hora !== after.hora;
  const cambioBarbero = !!before.barberoId && !!after.barberoId && before.barberoId !== after.barberoId;
  if (enPie && (cambioHorario || cambioBarbero) && after.fecha >= hoySantiago()) {
    const uid = await resolverUidCita(root, after);
    if (!uid) return;
    const barbero = after.barbero || after.barberoNombre || '';
    const title = cambioHorario ? '📅 Tu cita cambió de horario' : '💈 Cambio de profesional';
    const body = cambioHorario
      ? `Ahora es el ${after.fecha} a las ${after.hora}${barbero ? ` con ${barbero}` : ''}. Si no te acomoda, puedes reagendar.`
      : `Tu cita del ${after.fecha} a las ${after.hora} ahora es con ${barbero || 'otro profesional'}.`;
    const sent = await enviarPushCliente(root, uid, {
      title, body, data: { type: 'cita_modificada', citaId, url: '/dashboard.html' },
    });
    if (sent > 0) {
      await writeNotifLog(db, {
        tenantId: tid, type: cambioHorario ? 'push_cita_reagendada' : 'push_cambio_profesional',
        channel: 'push', status: 'sent',
        to: { nombre: after.clienteNombre || '' },
        meta: { citaId, fecha: after.fecha, hora: String(after.hora || '') },
      });
      logger.info(`[cita-cambiada] ${tid}/${citaId}: ${title} → ${sent} push`);
    }
  }
}

exports.pushCitaCambiadaTenant = onDocumentUpdated(
  { document: 'tenants/{tid}/citas/{citaId}', secrets: [...MAIL_SECRETS] },
  async (event) => {
    try {
      await cambioCita(event.params.tid, event.params.citaId,
        event.data?.before?.data(), event.data?.after?.data());
    } catch (e) { logger.error('[cita-cambiada]', e.message); }
  },
);

// Gemelo para elegance (legacy): sus citas viven en la raíz.
exports.pushCitaCambiadaElegance = onDocumentUpdated(
  { document: 'citas/{citaId}', secrets: [...MAIL_SECRETS] },
  async (event) => {
    try {
      await cambioCita('elegance', event.params.citaId,
        event.data?.before?.data(), event.data?.after?.data());
    } catch (e) { logger.error('[cita-cambiada]', e.message); }
  },
);

// ═══ 4) RESEÑA POST-ATENCIÓN (cron horario) ═════════════════════════

const RESENA_ESPERA_MIN = 120;       // 2h después del fin de la atención
const RESENA_CAP_DIAS   = 30;        // máx. 1 pedido de reseña por mes

async function resenaPostAtencion({ dryRun = false } = {}) {
  const ahora = minutosAhoraSantiago();
  const hoy   = hoySantiago();
  // Ayer también: una cita cerrada a las 22:00 cumple sus 2h pasada la
  // medianoche — con solo `fecha == hoy` esos cierres nocturnos se
  // perderían para siempre.
  const ayer = new Date(Date.now() - 86_400_000)
    .toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  const out = [];
  for (const { id: tid, root } of await listaTenants()) {
    try {
      const snap = await db.collection(`${root}citas`)
        .where('fecha', 'in', [hoy, ayer])
        .where('pendingGoogleReview', '==', true).get();
      for (const d of snap.docs) {
        const c = d.data();
        if (citaGuard(c) || c.estado !== 'Completada' || c.resenaPushEnviada) continue;
        const [hh, mm] = String(c.hora || '00:00').split(':').map(Number);
        const dur = parseInt(c.duracionServicio || c.duracion || 30, 10) || 30;
        const finMin = (hh * 60 + (mm || 0)) + dur;
        const transcurrido = c.fecha === hoy ? ahora - finMin : (1440 - finMin) + ahora;
        if (transcurrido < RESENA_ESPERA_MIN) continue;

        const uid = await resolverUidCita(root, c);
        if (!uid) continue;
        const uref = db.doc(`${root}users/${uid}`);
        const u = (await uref.get()).data() || {};
        const ultimo = u.resenaPushAt?.toMillis?.() || 0;
        if (Date.now() - ultimo < RESENA_CAP_DIAS * 86_400_000) continue;

        const cfg = await getTenantConfig(tid, logger);
        if (dryRun) { out.push({ tid, citaId: d.id, uid, dryRun: true }); continue; }
        const sent = await enviarPushCliente(root, uid, {
          title: '⭐ ¿Cómo estuvo tu atención?',
          body:  `Cuéntanos cómo te fue hoy en ${cfg.nombre || 'el local'}. Tu opinión ayuda muchísimo.`,
          data:  { type: 'resena_post', citaId: d.id, url: '/dashboard.html' },
        });
        await d.ref.update({ resenaPushEnviada: true }).catch(() => {});
        if (sent > 0) {
          await uref.set({ resenaPushAt: admin.firestore.Timestamp.now() }, { merge: true });
          await writeNotifLog(db, {
            tenantId: tid, type: 'push_resena_post', channel: 'push', status: 'sent',
            to: { nombre: c.clienteNombre || '' }, meta: { citaId: d.id },
          });
        }
        out.push({ tid, citaId: d.id, enviados: sent });
      }
    } catch (e) { logger.error(`[resena-post] ${tid}:`, e.message); out.push({ tid, error: e.message }); }
  }
  if (out.length) logger.info(`[resena-post] ${JSON.stringify(out)}`);
  return out;
}

exports.pushResenaPostAtencion = onSchedule(
  { schedule: '15 * * * *', timeZone: TIMEZONE, region: 'us-central1', timeoutSeconds: 300 },
  async () => {
    try { await resenaPostAtencion(); }
    catch (e) { logger.error('[resena-post]', e.message); throw e; }
  },
);

// ═══ 5) SUBISTE DE RANGO ════════════════════════════════════════════

// Espejo de calcRangoId en sello-automatico.js (y calcTier del panel).
function calcRango(historicos) {
  const h = Number(historicos) || 0;
  if (h >= 25) return 'platinum';
  if (h >= 10) return 'gold';
  return 'silver';
}
const RANGO_NOMBRE = { silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
const RANGO_ORDEN  = { silver: 0, gold: 1, platinum: 2 };

async function cambioRango(tid, uid, before, after) {
  if (!after) return;
  const rAntes = calcRango(before?.sellosHistoricos ?? before?.stamps);
  const rDesp  = calcRango(after.sellosHistoricos ?? after.stamps);
  if (RANGO_ORDEN[rDesp] <= RANGO_ORDEN[rAntes]) return;      // solo subidas
  if (after.rangoNotificado === rDesp) return;                 // idempotencia

  const root = rootDe(tid);
  // Beneficio concreto si el local configuró sellos por visita para el rango.
  let beneficio = '';
  try {
    const conf = await db.doc(`${root}configuracion/rangos`).get();
    const r = (conf.data()?.rangos || []).find(x => x.id === rDesp);
    const n = r ? Math.round(Number(r.sellosPorVisita)) : NaN;
    if (Number.isFinite(n) && n > 1) beneficio = ` Ahora ganas ${n} sellos por visita.`;
  } catch (_) {}

  const sent = await enviarPushCliente(root, uid, {
    title: `🏆 ¡Subiste a rango ${RANGO_NOMBRE[rDesp]}!`,
    body:  `Tu fidelidad tiene premio.${beneficio || ' Revisa tus nuevos beneficios en el club.'}`,
    data:  { type: 'rango', rango: rDesp, url: '/dashboard.html' },
  });
  await db.doc(`${root}users/${uid}`).set({ rangoNotificado: rDesp }, { merge: true });
  if (sent > 0) {
    await writeNotifLog(db, {
      tenantId: tid, type: 'push_rango', channel: 'push', status: 'sent',
      to: { nombre: after.nombre || '' }, meta: { rango: rDesp },
    });
    logger.info(`[rango] ${tid}/${uid}: ${rAntes}→${rDesp} → ${sent} push`);
  }
}

exports.pushRangoTenant = onDocumentWritten('tenants/{tid}/users/{uid}', async (event) => {
  try {
    await cambioRango(event.params.tid, event.params.uid,
      event.data?.before?.data(), event.data?.after?.data());
  } catch (e) { logger.error('[rango]', e.message); }
});

exports.pushRangoElegance = onDocumentWritten('users/{uid}', async (event) => {
  try {
    await cambioRango('elegance', event.params.uid,
      event.data?.before?.data(), event.data?.after?.data());
  } catch (e) { logger.error('[rango]', e.message); }
});

// ═══ 6) TU INVITADO YA VINO (referral_awards onCreate) ══════════════

async function referidoConvertido(tid, award) {
  if (!award?.referidorUid) return;
  const root = rootDe(tid);
  const nombre = award.referidoNombre || 'Tu invitado';
  const conRecompensa = !!award.resRefdor && !award.resRefdor.skip;
  const sent = await enviarPushCliente(root, award.referidorUid, {
    title: '🎉 ¡Tu invitado ya vino!',
    body: conRecompensa
      ? `${nombre} completó su primera visita. Tu recompensa por invitarlo está lista en tu club.`
      : `${nombre} completó su primera visita. ¡Gracias por recomendarnos!`,
    data: { type: 'referido_convertido', url: '/dashboard.html' },
  });
  if (sent > 0) {
    await writeNotifLog(db, {
      tenantId: tid, type: 'push_referido_convertido', channel: 'push', status: 'sent',
      to: { nombre: award.referidorNombre || '' },
      meta: { referido: nombre },
    });
    logger.info(`[referido] ${tid}: ${award.referidorNombre || award.referidorUid} ← ${nombre} → ${sent} push`);
  }
}

exports.pushReferidoConvertidoTenant = onDocumentCreated('tenants/{tid}/referral_awards/{awardId}', async (event) => {
  try { await referidoConvertido(event.params.tid, event.data?.data()); }
  catch (e) { logger.error('[referido]', e.message); }
});

exports.pushReferidoConvertidoElegance = onDocumentCreated('referral_awards/{awardId}', async (event) => {
  try { await referidoConvertido('elegance', event.data?.data()); }
  catch (e) { logger.error('[referido]', e.message); }
});

// Núcleos expuestos para pruebas locales (scripts one-off, no producción).
exports._test = { cambioCita, resenaPostAtencion, cambioRango, referidoConvertido, avisarCupoLiberado };
