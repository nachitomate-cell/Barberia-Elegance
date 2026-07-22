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

const { onSchedule }   = require('firebase-functions/v2/scheduler');
const { defineSecret }  = require('firebase-functions/params');
const { logger }        = require('firebase-functions');
const admin             = require('firebase-admin');
const { FieldValue }    = require('firebase-admin/firestore');
const { crearCliente }  = require('./client');
const { _ahoraChile: ahoraChile } = require('../chat-horas-disponibles');
const { logWaSend }               = require('../lib/metrics');

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

/* Tope DIARIO de confirmaciones por instancia, escalonado por madurez del
   número — anti-ban: un número recién vinculado despachando decenas de
   salientes proactivos el día uno es el patrón clásico que Meta suspende.
   La edad se mide desde `vinculadoDesde` (primera conexión, NO se resetea
   en reconexiones); sin ese dato se asume número nuevo (conservador). */
function capDiario(cfg) {
  const desde = cfg && cfg.vinculadoDesde && cfg.vinculadoDesde.toMillis
    ? cfg.vinculadoDesde.toMillis() : 0;
  const dias = desde ? (Date.now() - desde) / 86400000 : 0;
  if (dias >= 30) return 150;
  if (dias >= 7)  return 60;
  return 20;
}

/** Escanea un tenant y envía las confirmaciones que toquen. Devuelve cuántas envió. */
async function procesarConfirmacionesTenant({ tid, cfg, evoClient, nombreLocal }) {
  const ventana = Number(cfg?.recordatorio?.ventanaHoras) || 24;
  const now = ahoraChile();
  const nowAbs = absMin(now.fecha, now.mins);
  const nDays = Math.ceil(ventana / 24);

  // Contador del día persistido en la config del canal (sobrevive entre ciclos).
  const cap = capDiario(cfg);
  const cd  = (cfg && cfg.confirmDia) || {};
  let enviadasHoy = cd.fecha === now.fecha ? (Number(cd.enviadas) || 0) : 0;
  const cfgRef = db.doc(`tenants/${tid}/configuracion/whatsapp`);

  let enviadas = 0;
  for (let i = 0; i <= nDays; i++) {
    const fecha = sumarDias(now.fecha, i);
    const snap = await citasCol(tid).where('fecha', '==', fecha).get();
    for (const doc of snap.docs) {
      const cita = doc.data();
      if ((cita.estado || '') !== 'Pendiente') continue;   // solo citas por confirmar
      if (cita.waConfirmSolicitada === true) continue;      // ya se preguntó
      if (cita.waOptIn !== true) continue;                  // opt-in del cliente
      // Agendada por el propio cliente en el chat hace <2h: acaba de pedirla —
      // preguntarle "¿confirmas?" al tiro es ruido. Un ciclo posterior la toma.
      if (cita.origen === 'wa_bot' && cita.creadoEn && typeof cita.creadoEn.toMillis === 'function'
          && Date.now() - cita.creadoEn.toMillis() < 2 * 3600e3) continue;
      if (typeof cita.hora !== 'string' || !cita.hora.includes(':')) continue;
      const tel = normalizeCl(cita.clienteTelefono);
      if (!tel) continue;

      const diffH = (absMin(cita.fecha, toMins(cita.hora)) - nowAbs) / 60;
      if (diffH <= 0 || diffH > ventana) continue;          // fuera de ventana

      if (enviadasHoy >= cap) {
        // Válvula de seguridad: las citas no preguntadas siguen 'Pendiente'
        // y entran en el próximo ciclo/día. Mejor un no-show que un ban.
        logger.warn(`[confirm] ${tid}: tope diario anti-ban alcanzado (${cap}); quedan citas sin preguntar`);
        return enviadas;
      }

      try {
        await enviarConfirmacion({ tid, citaId: doc.id, cita, tel, evoClient, nombreLocal });
        enviadas++;
        enviadasHoy++;
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
  },
  async () => {
    const evoClient = crearCliente({ baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value() });
    const n = await escanearTodos({ evoClient });
    logger.info(`[confirm] ciclo completo: ${n} confirmación(es) enviada(s)`);
  },
);

// Para tests locales (scripts con Admin SDK): no es parte del API público.
module.exports._escanearTodos               = escanearTodos;
module.exports._procesarConfirmacionesTenant = procesarConfirmacionesTenant;
module.exports._enviarConfirmacion          = enviarConfirmacion;
module.exports._normalizeCl                 = normalizeCl;
