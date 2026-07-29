'use strict';

// functions/evolution/confirmaciones.js
// ─────────────────────────────────────────────────────────────────────────────
//  CONFIRMACIONES ANTI-NO-SHOW (Sprint 3) — sobre el número PROPIO del local.
//
//  Cron cada 30 min: por cada tenant con el add-on de confirmaciones activo y
//  conectado, busca citas `Pendiente` dentro de la ventana (12/24/48h configurable)
//  y le manda al cliente un WhatsApp por Evolution pidiendo CONFIRMAR / CANCELAR.
//
//  La RESPUESTA la maneja el cerebro (functions/evolution/cerebro.js):
//    · CONFIRMAR → cita.estado = 'Confirmada'
//    · CANCELAR  → cita.estado = 'Cancelada'  → liberar-slot-on-cancel libera el cupo
//
//  Marca `waConfirmSolicitada=true` para no re-preguntar, y deja
//  `wa_conversaciones/{telefono}.citaPendiente` para que el cerebro sepa a qué
//  cita aplica la respuesta.
//
//  Sin plantillas de Meta, sin aprobaciones, costo $0. (Ver [[asistente-ia-evolution]].)
// ─────────────────────────────────────────────────────────────────────────────

const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret }  = require('firebase-functions/params');
const { logger }        = require('firebase-functions');
const admin             = require('firebase-admin');
const { FieldValue }    = require('firebase-admin/firestore');
const { crearCliente }  = require('./client');
const { _ahoraChile: ahoraChile } = require('../chat-horas-disponibles');
const { logWaSend }               = require('../lib/metrics');
const { estaBloqueado }           = require('../lib/wa-consent');
const {
  capDiario, capConfirmaciones, MAX_POR_CICLO,
  dentroDeVentanaHoraria, registrarSaliente, salientesHoy, HORA_INICIO, HORA_FIN,
} = require('./cuota');

const db = admin.firestore();

const EVOLUTION_API_URL = defineSecret('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = defineSecret('EVOLUTION_API_KEY');

const esE      = (tid) => tid === 'elegance';
const citasCol = (tid) => (esE(tid) ? db.collection('citas') : db.collection(`tenants/${tid}/citas`));

const toMins = (t) => { const [h, m] = String(t || '').split(':').map(Number); return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0); };

// Minutos absolutos (día*1440 + minutos) para comparar sin líos de zona (todo Chile local).
function absMin(fecha, mins) {
  const [y, m, d] = String(fecha).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000) * 1440 + mins;
}
function sumarDias(fecha, n) {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Normaliza a formato internacional CL (56 9 XXXXXXXX) para Evolution. */
function normalizeCl(phone) {
  let n = String(phone || '').replace(/\D/g, '');
  if (!n) return null;
  if (n.length === 11 && n.startsWith('569')) return n;
  if (n.length === 9  && n.startsWith('9'))   return '56' + n;
  if (n.length === 8)                         return '569' + n;
  if (n.startsWith('56'))                     return n;
  return '56' + n;
}

function fechaBonita(fecha) {
  try {
    const d = new Date(`${fecha}T12:00:00`);
    return new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  } catch (_) { return fecha; }
}

/* Redacciones rotadas del mensaje de confirmación — anti-ban: miles de envíos
   con EXACTAMENTE el mismo texto son firma de bot para la heurística de Meta
   (mismo truco que copyResenaSugerida en las reseñas de Google). Todas
   mantienen las palabras clave *CONFIRMAR* / *CANCELAR* que el fast-path del
   cerebro detecta en la RESPUESTA del cliente (detectarDecision). */
const SALUDOS = [
  (n) => (n ? `Hola ${n} 👋` : '¡Hola! 👋'),
  (n) => (n ? `¡Hola ${n}!` : '¡Hola!'),
  (n) => (n ? `${n}, ¿cómo estás? 👋` : '¿Cómo estás? 👋'),
];
const INTROS = [
  (local) => `Te recordamos tu cita en *${local}*:`,
  (local) => `Te escribimos de *${local}* para recordarte tu cita:`,
  (local) => `Tienes una cita agendada en *${local}*:`,
];
const CIERRES = [
  '¿La confirmas? Responde *CONFIRMAR* para asistir o *CANCELAR* si no podrás. 🙌',
  'Para asegurar tu cupo responde *CONFIRMAR*, o *CANCELAR* si no podrás venir. 🙏',
  '¿Cuento contigo? Escribe *CONFIRMAR* y te esperamos, o *CANCELAR* si tuviste un imprevisto.',
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Envía UNA confirmación por Evolution y deja el rastro para la respuesta. */
async function enviarConfirmacion({ tid, citaId, cita, tel, evoClient, nombreLocal }) {
  const nombre = String(cita.clienteNombre || '').trim().split(/\s+/)[0] || '';
  const msg = [
    pick(SALUDOS)(nombre),
    '',
    pick(INTROS)(nombreLocal),
    `📅 ${fechaBonita(cita.fecha)}`,
    `🕐 ${cita.hora} hrs`,
    cita.servicioNombre ? `✂️ ${cita.servicioNombre}` : '',
    '',
    pick(CIERRES),
  ].filter(Boolean).join('\n');

  const sent = await evoClient.enviarTexto(`instance_${tid}`, tel, msg);
  const sentId = sent && sent.key && sent.key.id ? String(sent.key.id) : null;

  await citasCol(tid).doc(citaId).update({
    waConfirmSolicitada:   true,
    waConfirmSolicitadaEn: FieldValue.serverTimestamp(),
  });

  // El cerebro leerá esto al llegar la respuesta del cliente (mismo doc id = teléfono).
  await db.doc(`tenants/${tid}/wa_conversaciones/${tel}`).set({
    citaPendiente: {
      citaId,
      codigo:   cita.codigoCita || '',
      fecha:    cita.fecha,
      hora:     cita.hora,
      servicio: cita.servicioNombre || '',
    },
    remoteJid: `${tel}@s.whatsapp.net`,
    // Registra el eco de este envío para que la anti-colisión NO lo lea como
    // "el dueño escribió" (ver cerebro.js: botMsgIds). lastBotSendAt alimenta
    // la gracia anti-carrera del cerebro (el eco puede ganarle a esta escritura).
    ...(sentId ? { botMsgIds: FieldValue.arrayUnion(sentId) } : {}),
    lastBotSendAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await logWaSend(tid, 'confirmacion', !!sentId).catch(() => {}); // métrica para el dashboard ops
  logger.info(`[confirm] ${tid}/${citaId} → confirmación enviada a ${tel}`);
}

// capDiario y capConfirmaciones viven ahora en ./cuota.js: el tope tiene que
// contar TODOS los salientes del número (bot + confirmaciones), no solo estas.

/** Escanea un tenant y envía las confirmaciones que toquen. Devuelve cuántas envió. */
async function procesarConfirmacionesTenant({ tid, cfg, evoClient, nombreLocal }) {
  const ventana = Number(cfg?.recordatorio?.ventanaHoras) || 24;
  const now = ahoraChile();
  const nowAbs = absMin(now.fecha, now.mins);
  const nDays = Math.ceil(ventana / 24);

  // Dos topes distintos y ambos importan:
  //  · capTotal   → todos los salientes del número hoy (lo que mira Meta)
  //  · capConfirm → solo los proactivos (iniciar conversación pesa mucho más
  //                 que responderle a alguien que te escribió primero)
  const capTotal   = capDiario(cfg);
  const capConfirm = capConfirmaciones(cfg);
  const cd = (cfg && cfg.confirmDia) || {};
  let enviadasHoy = cd.fecha === now.fecha ? (Number(cd.enviadas) || 0) : 0;
  let totalHoy    = await salientesHoy(tid);
  const cfgRef = db.doc(`tenants/${tid}/configuracion/whatsapp`);

  if (totalHoy >= capTotal) {
    logger.warn(`[confirm] ${tid}: tope TOTAL de salientes alcanzado (${totalHoy}/${capTotal}); nada más hoy`);
    return 0;
  }

  let enviadas = 0;
  for (let i = 0; i <= nDays; i++) {
    const fecha = sumarDias(now.fecha, i);
    const snap = await citasCol(tid).where('fecha', '==', fecha).get();
    for (const doc of snap.docs) {
      const cita = doc.data();
      if ((cita.estado || '') !== 'Pendiente') continue;   // solo citas por confirmar
      if (cita.waConfirmSolicitada === true) continue;      // ya se preguntó
      // Opt-in EXPLÍCITO del cliente: desde el doble opt-in, esto es la
      // casilla que marcó al reservar. Sin casilla no hay WhatsApp.
      if (cita.waOptIn !== true) continue;
      // Número que ya comprobamos que no existe en WhatsApp: no reintentar
      // ciclo tras ciclo (cada intento fallido es señal de lista mala).
      if (cita.waNumeroInvalido === true) continue;
      // Agendada por el propio cliente en el chat hace <2h: acaba de pedirla —
      // preguntarle "¿confirmas?" al tiro es ruido. Un ciclo posterior la toma.
      if (cita.origen === 'wa_bot' && cita.creadoEn && typeof cita.creadoEn.toMillis === 'function'
          && Date.now() - cita.creadoEn.toMillis() < 2 * 3600e3) continue;
      if (typeof cita.hora !== 'string' || !cita.hora.includes(':')) continue;
      const tel = normalizeCl(cita.clienteTelefono);
      if (!tel) continue;

      const diffH = (absMin(cita.fecha, toMins(cita.hora)) - nowAbs) / 60;
      if (diffH <= 0 || diffH > ventana) continue;          // fuera de ventana

      // ── Opt-out global: manda por sobre el waOptIn de la cita ──
      // El cliente escribió STOP (por este canal o por el oficial). Se marca
      // la cita para no volver a evaluarla y se sigue de largo.
      if (await estaBloqueado(tel)) {
        await citasCol(tid).doc(doc.id).update({
          waConfirmSolicitada: true,
          waOmitidaMotivo:     'optout',
        }).catch(() => {});
        logger.info(`[confirm] ${tid}/${doc.id}: omitida por opt-out ***${tel.slice(-4)}`);
        continue;
      }

      // ── Topes ──
      if (enviadas >= MAX_POR_CICLO) {
        // Reparte la carga entre ciclos (el cron corre cada 30 min) en vez de
        // soltar una ráfaga de 20 mensajes a 20 personas distintas. Las citas
        // que quedan siguen 'Pendiente' y las toma el ciclo siguiente.
        logger.info(`[confirm] ${tid}: tope por ciclo (${MAX_POR_CICLO}); el resto va en el próximo`);
        return enviadas;
      }
      if (enviadasHoy >= capConfirm || totalHoy >= capTotal) {
        // Válvula de seguridad: las citas no preguntadas siguen 'Pendiente'
        // y entran en el próximo ciclo/día. Mejor un no-show que un ban.
        logger.warn(`[confirm] ${tid}: tope diario alcanzado (confirm ${enviadasHoy}/${capConfirm}, total ${totalHoy}/${capTotal})`);
        return enviadas;
      }

      // ── ¿El número existe en WhatsApp? ──
      // Se consulta recién acá, cuando ya pasó todos los demás filtros, para
      // no gastar una llamada al VPS por cada cita descartada.
      try {
        const existe = await evoClient.verificarNumeros(`instance_${tid}`, [tel]);
        if (existe.size && existe.get(tel) === false) {
          await citasCol(tid).doc(doc.id).update({
            waNumeroInvalido: true,
            waOmitidaMotivo:  'sin-whatsapp',
          }).catch(() => {});
          logger.info(`[confirm] ${tid}/${doc.id}: ***${tel.slice(-4)} no está en WhatsApp, omitida`);
          continue;
        }
      } catch (e) {
        // Falla-abierto: si el VPS no responde la verificación, se envía igual.
        logger.warn(`[confirm] ${tid}: verificarNumeros falló (${e.message}); se envía sin verificar`);
      }

      try {
        await enviarConfirmacion({ tid, citaId: doc.id, cita, tel, evoClient, nombreLocal });
        enviadas++;
        enviadasHoy++;
        totalHoy++;
        await registrarSaliente(tid, { tipo: 'confirmacion', ok: true });
        await cfgRef.set({ confirmDia: { fecha: now.fecha, enviadas: enviadasHoy } }, { merge: true }).catch(() => {});
      } catch (e) {
        logger.error(`[confirm] ${tid}/${doc.id}:`, e.message);
      }
    }
  }
  return enviadas;
}

/** Recorre los tenants con confirmaciones activas + conectadas. */
async function escanearTodos({ evoClient }) {
  // listDocuments, NO collection().get(): la mayoría de los docs padre
  // tenants/{id} NO existen como documentos (solo subcolecciones) y get()
  // los omite — con get() este cron solo veía delnero+elegance y saltaba
  // TODOS los demás locales (Kronnos incluido). Ver recordatorio-cita.js.
  const tenantRefs = await db.collection('tenants').listDocuments();
  const tids = new Set(tenantRefs.map(r => r.id));
  tids.add('elegance'); // root, por si no aparece en tenants/

  let total = 0;
  for (const tid of tids) {
    const cfg = (await db.doc(`tenants/${tid}/configuracion/whatsapp`).get()).data() || {};
    if (cfg.confirmacionesEnabled !== true) continue;
    if (cfg.estadoConexion !== 'connected') continue;

    const td = (await db.doc(`tenants/${tid}`).get()).data() || {};
    const nombreLocal = td.nombre || td.nombreCorto || tid;

    try {
      total += await procesarConfirmacionesTenant({ tid, cfg, evoClient, nombreLocal });
    } catch (e) {
      logger.error(`[confirm] tenant ${tid}:`, e.message);
    }
  }
  return total;
}

exports.evolutionConfirmaciones = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'America/Santiago',
    region:   'us-central1',
    secrets:  [EVOLUTION_API_URL, EVOLUTION_API_KEY],
    // El default de 60s no alcanzaba: `enviarTexto` pide a Evolution un delay
    // de 3–8 s por mensaje ("escribiendo…"), así que el ciclo se cortaba
    // calladamente a los ~10 envíos y las citas restantes quedaban sin
    // preguntar. Con el tope por ciclo (8) esto va sobrado.
    timeoutSeconds: 300,
  },
  async () => {
    // ── Ventana horaria: nada de salientes proactivos de madrugada ──
    // El cron corre cada 30 min las 24 h; sin esto, una cita de las 10:00 con
    // ventana de 24 h disparaba la confirmación a las 3 de la mañana. Un
    // WhatsApp comercial de madrugada es la vía rápida a que te bloqueen.
    if (!dentroDeVentanaHoraria()) {
      logger.info(`[confirm] fuera de ventana horaria (${HORA_INICIO}:00–${HORA_FIN}:00 Chile): ciclo omitido`);
      return;
    }
    const evoClient = crearCliente({ baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value() });
    const n = await escanearTodos({ evoClient });
    logger.info(`[confirm] ciclo completo: ${n} confirmación(es) enviada(s)`);
  },
);

/* ───────────── Espejo público del flag (para el doble opt-in) ─────────────
   La agenda pública necesita saber si mostrar la casilla de consentimiento de
   WhatsApp, pero NO puede leer `configuracion/whatsapp`: ese doc guarda el
   número vinculado del local y el email de quien aceptó los términos, y está
   cerrado al público en las rules. Así que espejamos SOLO el booleano al doc
   `configuracion/main`, que ya es público y que la agenda ya carga igual.

   Trigger y no escritura desde el panel a propósito: el toggle se puede
   cambiar desde el panel, desde /admin o desde un script, y el espejo tiene
   que quedar bien en los tres casos. (Mismo patrón que ya nos mordió con los
   doc-espejo de roles y con las storage rules por tenant.)

   Nota: cuando el canal OFICIAL de Meta entre en producción, este flag debe
   pasar a ser un OR de ambos canales — hoy solo Evolution está vivo. */
exports.espejoFlagConfirmaciones = onDocumentWritten(
  { document: 'tenants/{tid}/configuracion/whatsapp', region: 'us-central1' },
  async (event) => {
    const tid    = event.params.tid;
    const antes  = event.data?.before?.data() || {};
    const ahora  = event.data?.after?.data()  || {};
    if (antes.confirmacionesEnabled === ahora.confirmacionesEnabled) return; // sin cambio real

    const activo = ahora.confirmacionesEnabled === true;
    // elegance vive en la raíz de Firestore, no bajo tenants/.
    const destino = tid === 'elegance'
      ? db.doc('configuracion/main')
      : db.doc(`tenants/${tid}/configuracion/main`);

    await destino.set({ waConfirmActivo: activo }, { merge: true }).catch(e =>
      logger.error(`[confirm:espejo] ${tid}:`, e.message));
    logger.info(`[confirm:espejo] ${tid}: waConfirmActivo=${activo}`);
  },
);

// Para tests locales (scripts con Admin SDK): no es parte del API público.
module.exports._escanearTodos               = escanearTodos;
module.exports._procesarConfirmacionesTenant = procesarConfirmacionesTenant;
module.exports._enviarConfirmacion          = enviarConfirmacion;
module.exports._normalizeCl                 = normalizeCl;
