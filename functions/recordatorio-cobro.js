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
// Canal oficial de Meta (Cloud API): plantilla `cobranza_mensualidad` —
// entrega garantizada, inmune al shadowban de los chips. Se enciende con
// _system/cobranza.canalOficial=true cuando Meta apruebe la plantilla.
const WHATSAPP_TOKEN    = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_ID = defineSecret('WHATSAPP_PHONE_ID');
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

// Costo referencial por CANAL para reportar a ops. Estimaciones CLP netas
// (2026-08): la plantilla utility de Meta en Chile ~$50, Evolution es chip
// propio hospedado (variable = 0), push FCM gratis y Brevo transaccional
// se acerca a los $5/CLP por email al tipo de cambio actual. Editable sin
// deploy vía _system/cobranza.costos = { oficial, evolution, push, email }.
const COSTO_DEFAULT_CLP = { oficial: 50, evolution: 0, push: 0, email: 5 };

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

/* ─────────────────────── FLUJO INTELIGENTE DE COBRANZA ───────────────────────
   UN solo aviso por día de escalera, con el CANAL elegido según la etapa:
   los recordatorios suaves van por push (barato, no invasivo), los momentos
   importantes por WhatsApp (el canal que de verdad se lee) y los formales por
   email (respaldo escrito). Los demás canales del día son FALLBACK si el
   elegido no está disponible — nunca refuerzo. Antes WhatsApp y push salían
   juntos, y con el canal oficial habrían sido TRES avisos el mismo día
   (pedido de Ignacio 02-08: "no podemos spamear en los tres canales").

     -3  suave     (push → email)                  aviso temprano
     -1  whatsapp  (oficial → evo → push → email)  víspera, el importante
      0  suave     (push → email)                  día D, refuerzo liviano
     +1  whatsapp                                  primer atraso
     +3  email     (email → push)                  variar canal, respaldo escrito
     +8  whatsapp                                  bloqueo de secciones
    +15  email                                     pre-suspensión, formal
    >15  semanal, alternando whatsapp / email      persistencia sin quemar canal

   "whatsapp" intenta primero la PLANTILLA OFICIAL de Meta (entrega
   garantizada, inmune a shadowban) si _system/cobranza.canalOficial está
   encendido; después Evolution (instanciaWa) si está configurada. */

const PLAN_CANAL = { '-3': 'suave', '-1': 'whatsapp', '0': 'suave', '1': 'whatsapp', '3': 'email', '8': 'whatsapp', '15': 'email' };

function canalDelDia(dias) {
  const p = PLAN_CANAL[String(dias)];
  if (p) return p;
  if (dias > 15 && (dias - 15) % RECORDATORIO_RECURRENTE === 0) {
    return ((dias - 15) / RECORDATORIO_RECURRENTE) % 2 === 1 ? 'whatsapp' : 'email';
  }
  return null;
}

// Frase para la variable {{3}} de la plantilla oficial.
function fraseVencimiento(dias) {
  if (dias < 0) { const n = Math.abs(dias); return n === 1 ? 'vence mañana' : `vence en ${n} días`; }
  if (dias === 0) return 'vence hoy';
  return `venció hace ${dias} día${dias === 1 ? '' : 's'}`;
}

exports.recordatorioCobro = onSchedule(
  { schedule: '0 10 * * *', timeZone: TIMEZONE, secrets: [...MAIL_SECRETS, EVOLUTION_API_URL, EVOLUTION_API_KEY, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID] },
  async () => {
    const hoyUTC   = santiagoHoyUTC();
    const todayStr = new Date(hoyUTC).toISOString().slice(0, 10);
    const snap     = await db.collection('_billing').get();

    // Cliente Evolution perezoso: solo se construye si algún envío lo necesita.
    let _evo = null;
    const evoCli = () => (_evo || (_evo = crearCliente({
      baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value(),
    })));
    // Config de cobranza (_system/cobranza, editable sin deploy): transferencia
    // (método principal), instancia Evolution y flag del canal oficial.
    const cobCfg = ((await db.doc('_system/cobranza').get().catch(() => null))?.data() || {});
    const transf          = cobCfg.transferencia || null;
    const INSTANCIA_WA    = String(cobCfg.instanciaWa || '').trim() || INSTANCIA_WA_DEFAULT;
    const canalOficialOn  = cobCfg.canalOficial === true;
    const plantilla       = String(cobCfg.plantillaOficial || 'cobranza_mensualidad');
    const plantillaLang   = String(cobCfg.plantillaLang || 'es');
    // Costos por canal — usa override de _system/cobranza.costos si existe.
    const COSTOS = { ...COSTO_DEFAULT_CLP, ...(cobCfg.costos || {}) };

    const totales  = { oficial: 0, evolution: 0, push: 0, email: 0 };
    const sinCanal = [];   // locales donde NINGÚN canal funcionó

    for (const doc of snap.docs) {
      const tid = doc.id;
      const d   = doc.data();
      const dueUTC = parseFechaUTC(d.fechaProximoPago);
      if (dueUTC === null) continue;

      const dias = Math.round((hoyUTC - dueUTC) / 86400000); // + = atrasado, - = falta
      if (!tocaRecordatorio(dias)) continue;
      const canalPlan = canalDelDia(dias);
      if (!canalPlan) continue;

      // Idempotencia ÚNICA del día (más compat con las marcas antiguas).
      if (d.ultimoAvisoCobro === todayStr
        || d.ultimoRecordatorioPush === todayStr || d.ultimoRecordatorioEmail === todayStr
        || d.ultimoRecordatorioWa === todayStr) continue;

      // Cuota del ciclo ya pagada → nada que recordar (pagó por adelantado y
      // el aviso de "vence en 3 días" sería puro ruido que erosiona confianza).
      const cuotaMes = (Array.isArray(d.cuotas) ? d.cuotas : [])
        .find(c => c && c.mes === todayStr.slice(0, 7));
      if (cuotaMes && cuotaMes.pagada === true) continue;

      // sinCorte: se avisa igual, pero sin prometer bloqueos que no ocurren.
      // montoPendiente es NETO (criterio 2026-07-20): el aviso pide el total
      // con IVA 19%, igual que la vista Mensualidad y el cargo automático.
      const montoConIva = Math.round((Number(d.montoPendiente) || 0) * 1.19);
      const { title, body } = buildMensaje(dias, montoConIva, d.sinCorte === true);
      const { emails: destinatarios, nombreLocal } = await emailsCobro(tid, d);
      const waNum   = String(d.whatsappCobro || '').replace(/\D/g, '');
      const susMp   = d.suscripcionMp || {};
      const linkAuto = susMp.status === 'link_creado' && susMp.initPoint ? susMp.initPoint : null;
      const urlPlan  = `https://${tid === 'elegance' ? 'www' : tid}.synaptechspa.cl/gestion-interna/mensualidad`;

      // ── Senders: cada uno devuelve true si el aviso SALIÓ de verdad ──
      const intentos = {
        // Plantilla oficial de Meta: entrega garantizada. El número va SOLO
        // del campo explícito _billing.whatsappCobro (jamás derivado).
        oficial: async () => {
          if (!canalOficialOn || waNum.length < 9) return false;
          try {
            const res = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID.value()}/messages`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${WHATSAPP_TOKEN.value()}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messaging_product: 'whatsapp', to: waNum, type: 'template',
                template: {
                  name: plantilla, language: { code: plantillaLang },
                  components: [{
                    type: 'body',
                    parameters: [
                      { type: 'text', text: nombreLocal || tid },
                      { type: 'text', text: '$' + montoConIva.toLocaleString('es-CL') },
                      { type: 'text', text: fraseVencimiento(dias) },
                    ],
                  }],
                },
              }),
            });
            const out = await res.json().catch(() => ({}));
            if (!res.ok || out.error) throw new Error(out.error?.message || `HTTP ${res.status}`);
            return true;
          } catch (e) { logger.warn(`[Cobro] ✗ oficial ${tid}: ${e.message}`); return false; }
        },

        // Evolution (chip): copy cálido con nombre. Solo si hay instancia real
        // configurada — el placeholder 'desactivada' la salta de inmediato.
        evolution: async () => {
          if (waNum.length < 9 || !INSTANCIA_WA || INSTANCIA_WA.includes('desactivada')) return false;
          try {
            const texto = mensajeWaCobro({
              dias, monto: montoConIva, nombreLocal,
              sinCorte: d.sinCorte === true, transf, linkAuto, urlPlan,
            });
            await evoCli().enviarTexto(INSTANCIA_WA, waNum, texto);
            return true;
          } catch (e) { logger.warn(`[Cobro] ✗ evolution ${tid}: ${e.message}`); return false; }
        },

        push: async () => {
          const tokens = await tokensAdmin(tid);
          if (!tokens.length) return false;
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
              logger.warn(`[Cobro] ✗ push ${tid}: ${code || err.message}`);
            }
          }));
          if (invalidos.length) {
            const batch = db.batch();
            invalidos.forEach(id => batch.update(db.collection(fcmTokensColPath(tid)).doc(id), { activo: false }));
            await batch.commit().catch(() => {});
          }
          return enviados > 0;
        },

        email: async () => {
          if (!destinatarios.length) return false;
          try {
            await enviarEmail({
              from:    MAIL_FROM,
              to:      destinatarios,
              subject: title,
              html:    buildEmailHtml({ title, body, tid, nombreLocal }),
            }, { grupo: 'interno', etiqueta: 'recordatorio-cobro' });
            return true;
          } catch (e) { logger.error(`[Cobro] ✗ email ${tid}: ${e.message}`); return false; }
        },
      };

      // Orden de intentos según el plan del día: el primero que sale, CIERRA.
      const ORDEN = {
        whatsapp: ['oficial', 'evolution', 'push', 'email'],
        suave:    ['push', 'email'],
        email:    ['email', 'push'],
      }[canalPlan];

      let canalUsado = null;
      for (const c of ORDEN) {
        // eslint-disable-next-line no-await-in-loop
        if (await intentos[c]()) { canalUsado = c; break; }
      }

      if (canalUsado) {
        totales[canalUsado]++;
        const costoEvento = Number(COSTOS[canalUsado]) || 0;
        // Log detallado del envío (subcolección) — cada tirada del cron deja
        // un doc consultable por ops sin depender de _billing.avisosStats.
        // ID = fecha para que idempotencia natural: si el cron se dispara dos
        // veces (raro pero pasa), el doc no se duplica.
        await doc.ref.collection('avisosCobro').doc(todayStr).set({
          fecha:       todayStr,
          canal:       canalUsado,
          canalPlan,
          dias,
          monto:       montoConIva,
          ok:          true,
          costoClp:    costoEvento,
          creadoEn:    admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
        // Agregados en _billing/{tid}.avisosStats para pintar chips rápidos.
        // Incrementos atómicos: no se pierde nada si dos avisos caen el mismo día.
        await doc.ref.update({
          ultimoAvisoCobro: todayStr,
          ultimoAvisoCanal: canalUsado,
          ultimoAvisoDias:  dias,
          ultimoAvisoOk:    true,
          ultimoAvisoAt:    admin.firestore.FieldValue.serverTimestamp(),
          'avisosStats.total':        admin.firestore.FieldValue.increment(1),
          [`avisosStats.porCanal.${canalUsado}`]: admin.firestore.FieldValue.increment(1),
          'avisosStats.costoClp':     admin.firestore.FieldValue.increment(costoEvento),
          'avisosStats.ultimoAt':     admin.firestore.FieldValue.serverTimestamp(),
          'avisosStats.ultimoCanal':  canalUsado,
          'avisosStats.ultimoOk':     true,
          // Compat: ops y la idempotencia antigua leen estas marcas.
          ...(canalUsado === 'push'
            ? { ultimoRecordatorioPush: todayStr, sinTokensDesde: admin.firestore.FieldValue.delete() } : {}),
          ...(canalUsado === 'email' ? { ultimoRecordatorioEmail: todayStr } : {}),
          ...(canalUsado === 'oficial' || canalUsado === 'evolution'
            ? { ultimoRecordatorioWa: todayStr } : {}),
        }).catch(() => {});
        logger.info(`[Cobro] ✓ ${tid} (dias=${dias}, plan=${canalPlan}) → ${canalUsado} · $${costoEvento} CLP`);
      } else {
        // Ningún canal disponible: log de fallo + rastro + alerta al superadmin.
        await doc.ref.collection('avisosCobro').doc(todayStr).set({
          fecha:       todayStr,
          canal:       'ninguno',
          canalPlan,
          dias,
          monto:       montoConIva,
          ok:          false,
          costoClp:    0,
          creadoEn:    admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
        await doc.ref.update({
          sinTokensDesde: d.sinTokensDesde || todayStr,
          ultimoAvisoOk:  false,
          ultimoAvisoAt:  admin.firestore.FieldValue.serverTimestamp(),
          'avisosStats.fallidos': admin.firestore.FieldValue.increment(1),
          'avisosStats.ultimoAt': admin.firestore.FieldValue.serverTimestamp(),
          'avisosStats.ultimoOk': false,
        }).catch(() => {});
        if (d.ultimaAlertaSuperadmin !== todayStr) {
          sinCanal.push({ tid, dias, ref: doc.ref });
        }
        logger.warn(`[Cobro] ⛔ ${tid} (dias=${dias}, plan=${canalPlan}): ningún canal disponible`);
      }
    }

    // Una sola push al superadmin por corrida (no una por local).
    if (sinCanal.length) {
      const nombres = sinCanal.map(x => x.tid).join(', ');
      try {
        await dispatchAdminPush(db, messaging, {
          title: `⛔ ${sinCanal.length} local(es) sin canal de cobro`,
          body:  `${nombres}: sin WhatsApp, push ni email disponibles. El aviso de mensualidad NO está llegando.`,
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

    logger.info(`[Cobro] Resumen: ${totales.oficial} oficial, ${totales.evolution} evolution, ${totales.push} push, ${totales.email} email, ${sinCanal.length} sin canal`);
  },
);
