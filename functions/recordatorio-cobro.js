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
const { logger }        = require('firebase-functions');
const admin             = require('firebase-admin');
const { dispatchAdminPush } = require('./admin-push');
// Copy + HTML compartidos con scripts/preview-email-cobro.js, para que lo que
// se revisa por diseño sea exactamente lo que reciben los locales.
const { buildMensaje, buildEmailHtml } = require('./lib/email-cobro-template');

const db        = admin.firestore();
const messaging = admin.messaging();
const TIMEZONE  = 'America/Santiago';

const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');
const MAIL_FROM      = 'SynapTech <cobros@synaptechspa.cl>';

// Canal WhatsApp (2026-08-02): el aviso sale del número comercial de SynapTech
// (chip ventas, ya vinculado) hacia el número EXPLÍCITO _billing.whatsappCobro.
// Es el canal que los dueños de verdad leen; push/email quedan de respaldo.
const { defineSecret }  = require('firebase-functions/params');
const { crearCliente }  = require('./evolution/client');
const EVOLUTION_API_URL = defineSecret('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = defineSecret('EVOLUTION_API_KEY');
// Instancia por defecto; se puede redirigir sin deploy con
// _system/cobranza.instanciaWa (p.ej. 'instance_synaptech' = chip principal,
// para que la cobranza no salga del número personal de Ignacio).
const INSTANCIA_WA_DEFAULT = 'instance_plat_ventas';

/* Copy CÁLIDO del aviso por WhatsApp — deliberadamente distinto del email:
   el correo es formal; por WhatsApp escribe "Ignacio" a un cliente que
   conoce, y una cobranza tibia cobra mejor que una amenaza. El tono sube
   con los días, pero siempre con puerta abierta a conversar. */
function mensajeWaCobro({ dias, monto, nombreLocal, sinCorte, transf, linkAuto, urlPlan }) {
  const m = '$' + (Number(monto) || 0).toLocaleString('es-CL');
  const saludo = nombreLocal ? `¡Hola ${nombreLocal}! 👋` : '¡Hola! 👋';
  let cuerpo;
  if (dias < 0) {
    const n = Math.abs(dias);
    cuerpo = `Espero que la semana vaya bien por el local 🙌 Te escribo cortito: la mensualidad de tu agenda (${m}) vence ${n === 1 ? '*mañana*' : `en *${n} días*`}. Sin apuro — solo para que no se te pase entre tanta pega.`;
  } else if (dias === 0) {
    cuerpo = `¿Cómo va ese día? 💈 Te recuerdo que *hoy* vence la mensualidad de tu agenda (${m}). Son dos minutos y quedas listo para todo el mes 💪`;
  } else if (dias < 8) {
    cuerpo = `Sé que los días en el local no dan tregua 😅 — se nos pasó la fecha de la mensualidad (${m}, venció hace ${dias} día${dias === 1 ? '' : 's'}). ¿La regularizamos cuando tengas un momento?`;
  } else if (sinCorte) {
    cuerpo = `Te escribo por la mensualidad que quedó pendiente (${m}, ya van ${dias} días). Si este mes viene complicado, respóndeme no más y lo conversamos — siempre hay forma de ordenarlo 🤝`;
  } else if (dias < 15) {
    cuerpo = `Llevamos ${dias} días con la mensualidad pendiente (${m}) y el sistema ya dejó bloqueadas algunas secciones del panel (Métricas, Comisiones y Caja) 😔 La regularizas y se reactivan al tiro. Y si andas complicado, escríbeme y lo vemos juntos.`;
  } else {
    cuerpo = `Ya van ${dias} días con la mensualidad pendiente (${m}) y de verdad no quiero llegar a suspender tu agenda 🙏 Si estás pasando un mes difícil, respóndeme y armamos un plan juntos. Si fue puro olvido, abajo van los datos.`;
  }
  return [
    saludo,
    '',
    cuerpo,
    ...(transf ? [
      '',
      '💳 *Datos para la transferencia:*',
      transf.titular,
      `RUT ${transf.rut}`,
      `${transf.banco} · ${transf.tipoCuenta}`,
      `N° cuenta: ${transf.numero}`,
      transf.email,
      '',
      '📎 Me mandas el comprobante por aquí y te confirmo al tiro ✅',
    ] : [
      '',
      `🔗 Puedes revisar y pagar aquí: ${urlPlan}`,
    ]),
    ...(linkAuto ? ['', `⚡ Y si prefieres olvidarte del tema: deja el cargo automático mensual aquí → ${linkAuto}`] : []),
    '',
    `🔎 El detalle de tu plan: ${urlPlan}`,
    '',
    '_Un abrazo — Ignacio, SynapTech_',
  ].filter(l => l !== null && l !== undefined).join('\n');
}

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

exports.recordatorioCobro = onSchedule(
  { schedule: '0 10 * * *', timeZone: TIMEZONE, secrets: [...MAIL_SECRETS, EVOLUTION_API_URL, EVOLUTION_API_KEY] },
  async () => {
    const hoyUTC   = santiagoHoyUTC();
    const todayStr = new Date(hoyUTC).toISOString().slice(0, 10);
    const snap     = await db.collection('_billing').get();

    let totalPush = 0, totalMail = 0, totalWa = 0;
    // Cliente Evolution perezoso: solo se construye si algún local tiene
    // whatsappCobro configurado (si no, esta corrida ni toca el VPS).
    let _evo = null;
    const evoCli = () => (_evo || (_evo = crearCliente({
      baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value(),
    })));
    // Config de cobranza (_system/cobranza, editable sin deploy): datos de
    // transferencia (método PRINCIPAL, decisión de Ignacio 02-08) y por qué
    // instancia sale el WhatsApp (chip principal para no usar su número).
    const cobCfg = ((await db.doc('_system/cobranza').get().catch(() => null))?.data() || {});
    const transf = cobCfg.transferencia || null;
    const INSTANCIA_WA = String(cobCfg.instanciaWa || '').trim() || INSTANCIA_WA_DEFAULT;
    const sinCanal = [];   // locales inalcanzables → alerta al superadmin

    for (const doc of snap.docs) {
      const tid = doc.id;
      const d   = doc.data();
      const dueUTC = parseFechaUTC(d.fechaProximoPago);
      if (dueUTC === null) continue;

      const dias = Math.round((hoyUTC - dueUTC) / 86400000); // + = atrasado, - = falta
      if (!tocaRecordatorio(dias)) continue;
      // Idempotencia diaria: da igual por qué canal haya salido hoy.
      if (d.ultimoRecordatorioPush === todayStr || d.ultimoRecordatorioEmail === todayStr
        || d.ultimoRecordatorioWa === todayStr) continue;

      // sinCorte: se avisa igual, pero sin prometer bloqueos que no ocurren.
      // montoPendiente es NETO (criterio 2026-07-20): el aviso pide el total
      // con IVA 19%, igual que la vista Mensualidad y el cargo automático.
      const montoConIva = Math.round((Number(d.montoPendiente) || 0) * 1.19);
      const { title, body } = buildMensaje(dias, montoConIva, d.sinCorte === true);

      // ── Canal 0: WhatsApp (número EXPLÍCITO en _billing.whatsappCobro) ──
      // Nunca derivado de barberos/ ni de configuracion: el superadmin lo
      // escribe a mano por local, mismo criterio que emailCobro.
      let waOk = false;
      const waNum = String(d.whatsappCobro || '').replace(/\D/g, '');
      // Nombre del local + correos: una sola resolución que sirve para el
      // WhatsApp (saludo con nombre) y para el fallback por email.
      const { emails: destinatarios, nombreLocal } = await emailsCobro(tid, d);
      if (waNum.length >= 9) {
        try {
          const susMp = d.suscripcionMp || {};
          const linkAuto = susMp.status === 'link_creado' && susMp.initPoint ? susMp.initPoint : null;
          const urlPlan = `https://${tid === 'elegance' ? 'www' : tid}.synaptechspa.cl/gestion-interna/mensualidad`;
          const texto = mensajeWaCobro({
            dias, monto: montoConIva, nombreLocal,
            sinCorte: d.sinCorte === true, transf, linkAuto, urlPlan,
          });
          await evoCli().enviarTexto(INSTANCIA_WA, waNum, texto);
          waOk = true;
          totalWa++;
          await doc.ref.update({ ultimoRecordatorioWa: todayStr }).catch(() => {});
          logger.info(`[Cobro] 📱 ${tid} (dias=${dias}) → WhatsApp a ***${waNum.slice(-4)}`);
        } catch (e) {
          // Sesión caída o número inválido → la escalera sigue con push/email.
          logger.warn(`[Cobro] ✗ WhatsApp ${tid}: ${e.message}`);
        }
      }

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

      let mailOk = false;

      // Si el WhatsApp ya salió, el correo sobra (era el fallback del fallback).
      if (!waOk && destinatarios.length) {
        try {
          await enviarEmail({
            from:    MAIL_FROM,
            to:      destinatarios,
            subject: title,
            html:    buildEmailHtml({ title, body, tid, nombreLocal }),
          }, { grupo: 'interno', etiqueta: 'recordatorio-cobro' });
          mailOk = true;
          totalMail += destinatarios.length;
          logger.info(`[Cobro] ✉ ${tid} (dias=${dias}) → email a ${destinatarios.length} destinatario(s)`);
        } catch (e) {
          logger.error(`[Cobro] ✗ email ${tid}: ${e.message}`);
        }
      } else if (!waOk) {
        logger.warn(`[Cobro] ${tid}: sin tokens y sin email de contacto`);
      }

      await doc.ref.update({
        sinTokensDesde: desde,
        ...(mailOk ? { ultimoRecordatorioEmail: todayStr } : {}),
      }).catch(() => {});

      // ── Canal 3: alerta al superadmin ──────────────────────────
      // Solo si la falta de push ya es crónica, o si no hubo NINGÚN canal.
      const yaAvisadoHoy = d.ultimaAlertaSuperadmin === todayStr;
      // Con WhatsApp entregado el local NO está incomunicado: nada que alertar.
      if (!yaAvisadoHoy && !waOk && (!mailOk || diasSinCanal >= ALERTA_DIAS_SIN_CANAL)) {
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

    logger.info(`[Cobro] Resumen: ${totalWa} WhatsApp, ${totalPush} push, ${totalMail} email, ${sinCanal.length} sin canal`);
  },
);
