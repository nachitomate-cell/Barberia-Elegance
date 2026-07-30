'use strict';

// functions/ops-metrics.js
// Callable `opsMetrics` para el dashboard ops.synaptechspa.cl.
// Agrega las métricas de barbería (_metrics/*) + los locales activos, y consulta
// server-to-server el resumen de conexion/SushiPro con el OPS_TOKEN. Solo operador.
//
// v2 (2026-07-22) — control total:
//   · Semáforo de sesiones por local (ok/caída/off + minutos caído + edad del nº)
//   · Costo de IA por local (mes en curso, _metrics/ai_vendor_{tid}_{YYYY-MM})
//   · Negocio del bot por local (_metrics/bot_{tid}_{YYYY-MM}: agendadas,
//     canceladas, ratio CONFIRMAR/CANCELAR)
//   · Trials (_system/{tid}.waAsistenteTrial) con días restantes
//   · Alertas server-side (sesión caída, tope diario, trial por vencer,
//     chats silenciados)
//   · FIX: enumeración por listDocuments (los docs padre tenants/{id} no
//     existen y collection().get() los omitía → el dashboard veía 0 locales)

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule }         = require('firebase-functions/v2/scheduler');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { Timestamp }          = require('firebase-admin/firestore');
const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');

const db = admin.firestore();
const OPS_TOKEN      = defineSecret('OPS_TOKEN');

const BOOTSTRAP = ['ignaciiio.mate@gmail.com'];
const CONEXION_URL = 'https://sushipro.synaptechspa.cl/api/metrics/summary';

function ultimosDias(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  return out;
}

// Los topes se IMPORTAN, no se copian. Antes había acá una réplica de
// capDiario con un comentario que decía "mantener sincronizados" — y cuando
// los topes cambiaron en cuota.js, este dashboard siguió mostrando los
// viejos. Un panel de control que miente sobre el límite anti-ban es peor
// que no tener panel.
const { capDiario, capConfirmaciones, resumenHoy } = require('./evolution/cuota');

// Umbrales de vigilancia. Son los que disparan alerta en el dashboard y en el
// correo de `opsVigilancia`.
const UMBRAL = {
  cuotaPct:     0.80,   // % del tope diario de salientes
  costoDiaUsd:  1.50,   // costo IA de UN local en UN día
  cacheHitMin:  0.60,   // bajo esto, el caché del prompt se rompió
  optoutPct:    0.05,   // bajas / envíos del mes
  failPct:      0.20,   // fallos de envío del día
};

const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);

/**
 * Analiza el canal WhatsApp de TODOS los locales: semáforo, cuota del día,
 * costo IA, salud del caché, bajas y alertas. Es una sola función a propósito:
 * la usa el dashboard (opsMetrics) y también el cron de vigilancia
 * (opsVigilancia) que manda los correos. Si cada uno evaluara sus propios
 * umbrales, tarde o temprano el correo diría una cosa y el panel otra.
 */
async function analizarLocales(hoy, mesActual) {
  // ── Por local: canal WhatsApp + trial + costo + negocio + alertas ──
  // listDocuments: los docs padre tenants/{id} pueden no existir (solo
  // subcolecciones) y collection().get() los omite.
  const tenantRefs = await db.collection('tenants').listDocuments();
  const tids = new Set(tenantRefs.map((r) => r.id)); tids.add('elegance');

  const locales = [];
  const trials = [];
  const alertas = [];
  const negocioTotal = { agendadas: 0, canceladas: 0, confSi: 0, confNo: 0, optout: 0 };

  for (const tid of tids) {
    const [waSnap, sysSnap] = await Promise.all([
      db.doc(`tenants/${tid}/configuracion/whatsapp`).get(),
      db.doc(`_system/${tid}`).get(),
    ]);

    // Trial del asistente (independiente de si ya vinculó el canal).
    const trial = (sysSnap.data() || {}).waAsistenteTrial || null;
    let trialInfo = null;
    if (trial && trial.fin) {
      const diasRestantes = Math.ceil((Date.parse(trial.fin) - Date.now()) / 86400000);
      trialInfo = { fin: trial.fin, inicio: trial.inicio || null, tipo: trial.tipo || '', diasRestantes };
      trials.push({ tid, ...trialInfo });
      if (diasRestantes < 0) {
        alertas.push({ nivel: 'rojo', texto: `Trial VENCIDO: ${tid} venció el ${trial.fin} — apagar waAsistente o convertir a pago.` });
      } else if (diasRestantes <= 15) {
        alertas.push({ nivel: 'ambar', texto: `Trial de ${tid} vence en ${diasRestantes} día(s) (${trial.fin}).` });
      }
    }

    const wa = waSnap.data();
    if (!wa) continue;
    const tieneCanal = wa.estadoConexion === 'connected' || wa.botEnabled === true
      || wa.confirmacionesEnabled === true || !!wa.numeroVinculado;
    if (!tieneCanal) continue;

    const conectado = wa.estadoConexion === 'connected';
    const usaModulo = wa.botEnabled === true || wa.confirmacionesEnabled === true;
    const minCaida  = (!conectado && millis(wa.desconectadoEn))
      ? Math.floor((Date.now() - millis(wa.desconectadoEn)) / 60000) : 0;
    // Semáforo: ok = conectado · caida = desconectado con módulos que DEBERÍAN
    // correr (bot/confirmaciones mudos) · off = canal vinculado pero módulos apagados.
    const salud = conectado ? 'ok' : (usaModulo ? 'caida' : 'off');
    if (salud === 'caida' && minCaida >= 20) {
      alertas.push({ nivel: 'rojo', texto: `Sesión caída: ${tid} lleva ${minCaida >= 60 ? Math.floor(minCaida / 60) + ' h' : minCaida + ' min'} sin WhatsApp — bot y confirmaciones mudos.` });
    }

    // ── Cuota del día: salientes reales del número vs su tope ──
    // Esta es LA métrica anti-ban. Antes solo se miraba confirmDia, que cuenta
    // confirmaciones; el bot conversacional sumaba salientes que nadie veía.
    const capTotal   = capDiario(wa);
    const capConfirm = capConfirmaciones(wa);
    const cuota      = await resumenHoy(tid);
    const cd         = wa.confirmDia || {};
    const confHoy    = cd.fecha === hoy ? (Number(cd.enviadas) || 0) : 0;

    if (cuota.n >= capTotal) {
      alertas.push({ nivel: 'rojo', texto: `${tid} agotó el tope diario de salientes (${cuota.n}/${capTotal}) — el número queda mudo hasta mañana.` });
    } else if (cuota.n >= capTotal * UMBRAL.cuotaPct) {
      alertas.push({ nivel: 'ambar', texto: `${tid} va en ${cuota.n}/${capTotal} salientes hoy (${Math.round(cuota.n / capTotal * 100)}% del tope anti-ban).` });
    }
    if (confHoy >= capConfirm) {
      alertas.push({ nivel: 'ambar', texto: `${tid} alcanzó el tope de confirmaciones (${capConfirm}/día) — citas sin preguntar hasta mañana.` });
    }

    // ── Fallos de envío del día ──
    // Una tasa alta es el síntoma de una sesión degradada ANTES de que se
    // caiga del todo: el semáforo sigue verde y los mensajes no llegan.
    const intentos = cuota.botOk + cuota.botFail + cuota.confOk + cuota.confFail;
    const fallos   = cuota.botFail + cuota.confFail;
    const failPct  = intentos ? fallos / intentos : 0;
    if (intentos >= 5 && failPct >= UMBRAL.failPct) {
      alertas.push({ nivel: 'rojo', texto: `${tid}: ${Math.round(failPct * 100)}% de los envíos de hoy están fallando (${fallos}/${intentos}) — revisa la sesión antes de que se caiga.` });
    }

    // Chats con el bot silenciado AHORA (intervención humana o derivación).
    let silenciados = 0;
    try {
      const sq = await db.collection(`tenants/${tid}/wa_conversaciones`)
        .where('botSilencedUntil', '>', Timestamp.now()).get();
      silenciados = sq.size;
    } catch (e) { logger.warn(`[opsMetrics] silenciados ${tid}:`, e.message); }
    if (silenciados > 0) {
      alertas.push({ nivel: 'info', texto: `${tid}: bot en pausa en ${silenciados} chat(s) (humano al mando o derivación).` });
    }

    // Costo IA (mes + HOY) y negocio del bot, por tenant.
    const [aiV, aiD, botV] = await Promise.all([
      db.doc(`_metrics/ai_vendor_${tid}_${mesActual}`).get(),
      db.doc(`_metrics/ai_dia_${tid}_${hoy}`).get(),
      db.doc(`_metrics/bot_${tid}_${mesActual}`).get(),
    ]);
    const ai   = aiV.data() || {};
    const aiHoy = aiD.data() || {};
    const neg  = botV.data() || {};
    const negocio = {
      agendadas:  Number(neg.agendada)  || 0,
      canceladas: Number(neg.cancelada) || 0,
      confSi:     Number(neg.conf_si)   || 0,
      confNo:     Number(neg.conf_no)   || 0,
      optout:     Number(neg.optout)    || 0,
    };

    // ── Salud del caché del prompt ──
    // hit = leído / (leído + no cacheado). Si se desploma es que el prefijo de
    // ese local quedó bajo el mínimo cacheable y el costo se duplicó sin aviso.
    const cIn   = Number(aiHoy.tokensIn) || 0;
    const cRead = Number(aiHoy.tokensCacheRead) || 0;
    const cacheHit = (cIn + cRead) > 0 ? cRead / (cIn + cRead) : null;
    const costoHoy = Number(aiHoy.costUsd) || 0;

    if (costoHoy >= UMBRAL.costoDiaUsd) {
      alertas.push({ nivel: 'ambar', texto: `${tid} lleva ${costoHoy.toFixed(2)} USD de IA HOY (umbral ${UMBRAL.costoDiaUsd}).` });
    }
    if (cacheHit !== null && (Number(aiHoy.llamadas) || 0) >= 5 && cacheHit < UMBRAL.cacheHitMin) {
      alertas.push({ nivel: 'rojo', texto: `${tid}: caché del prompt al ${Math.round(cacheHit * 100)}% — el prefijo se rompió y el costo se duplicó. Corre npm run check:bot-prompt.` });
    }

    // ── Tasa de bajas: el indicador adelantado del ban ──
    // Meta no avisa antes de suspender. Lo que sube primero es la gente
    // pidiendo baja; los que además bloquean ni siquiera los vemos.
    const enviosMes = negocio.agendadas + negocio.confSi + negocio.confNo;
    const optoutPct = enviosMes >= 10 ? negocio.optout / enviosMes : 0;
    if (negocio.optout > 0 && optoutPct >= UMBRAL.optoutPct) {
      alertas.push({ nivel: 'rojo', texto: `${tid}: ${negocio.optout} baja(s) este mes (${Math.round(optoutPct * 100)}% de los contactos). Riesgo de ban — baja el volumen o revisa el copy.` });
    }
    negocioTotal.agendadas  += negocio.agendadas;
    negocioTotal.canceladas += negocio.canceladas;
    negocioTotal.confSi     += negocio.confSi;
    negocioTotal.confNo     += negocio.confNo;
    negocioTotal.optout     += negocio.optout;

    locales.push({
      id: tid,
      estado: wa.estadoConexion || 'disconnected',
      salud, minCaida,
      bot: wa.botEnabled === true,
      conf: wa.confirmacionesEnabled === true,
      numero: wa.numeroVinculado || null,
      edadDias: millis(wa.vinculadoDesde) ? Math.floor((Date.now() - millis(wa.vinculadoDesde)) / 86400000) : null,
      silenciados,
      ia: {
        llamadas: Number(ai.llamadas) || 0,
        costoUsd: Number(ai.costUsd) || 0,
        costoHoy,
        llamadasHoy: Number(aiHoy.llamadas) || 0,
        cacheHit,                                  // null = sin datos hoy
      },
      cuota: {
        salientes: cuota.n, capTotal,
        confirmaciones: confHoy, capConfirm,
        fallos, intentos,
        pct: capTotal ? Math.round(cuota.n / capTotal * 100) : 0,
      },
      negocio,
      trial: trialInfo,
    });
  }

  return { locales, trials, alertas, negocioTotal };
}

exports.opsMetrics = onCall({ region: 'us-central1', cors: true, secrets: [OPS_TOKEN] }, async (req) => {
  const email = String(req.auth?.token?.email || '').toLowerCase();
  if (!req.auth || !BOOTSTRAP.includes(email)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }

  const ds = ultimosDias(30);
  const hoy = ds[0];
  const mesActual = hoy.slice(0, 7);

  // ── Métricas globales de barbería (30 días) ──
  const [waSnaps, aiSnaps] = await Promise.all([
    Promise.all(ds.map((d) => db.doc(`_metrics/wa_${d}`).get())),
    Promise.all(ds.map((d) => db.doc(`_metrics/ai_${d}`).get())),
  ]);
  let mensajes = 0, mensajesOk = 0;
  const porDia = {};
  waSnaps.forEach((s, i) => {
    const d = s.data(); if (!d) return;
    mensajes += Number(d.total) || 0;
    porDia[ds[i]] = Number(d.total) || 0;
    Object.keys(d).forEach((k) => { if (k.endsWith('_ok')) mensajesOk += Number(d[k]) || 0; });
  });
  let costoUsd = 0, tokensIn = 0, tokensOut = 0, llamadas = 0;
  aiSnaps.forEach((s) => {
    const d = s.data(); if (!d) return;
    costoUsd += Number(d.costUsd) || 0;
    tokensIn += Number(d.tokensIn) || 0;
    tokensOut += Number(d.tokensOut) || 0;
    llamadas += Number(d.llamadas) || 0;
  });

  // ── Por local: canal WhatsApp + trial + costo + negocio + alertas ──
  // listDocuments: los docs padre tenants/{id} pueden no existir (solo
  // subcolecciones) y collection().get() los omite.
  const tenantRefs = await db.collection('tenants').listDocuments();
  const tids = new Set(tenantRefs.map((r) => r.id)); tids.add('elegance');

  const { locales, trials, alertas, negocioTotal } = await analizarLocales(hoy, mesActual);

  // Rojo primero, luego ámbar, luego info.
  const peso = { rojo: 0, ambar: 1, info: 2 };
  alertas.sort((a, b) => (peso[a.nivel] ?? 9) - (peso[b.nivel] ?? 9));
  trials.sort((a, b) => a.diasRestantes - b.diasRestantes);

  const localesActivos = locales.filter((l) => l.estado === 'connected').length;

  const barberia = {
    proyecto: 'barberia', localesActivos, locales,
    mensajes: { total: mensajes, ok: mensajesOk, porDia },
    claude: { costoUsd, tokensIn, tokensOut, llamadas },
    negocio: negocioTotal,          // mes en curso
    dias: 30,
  };

  // ── Resumen de conexion/SushiPro (server-to-server) ──
  let sushipro = null, sushiError = null;
  try {
    const r = await fetch(CONEXION_URL, { headers: { 'x-ops-token': OPS_TOKEN.value() } });
    if (r.ok) sushipro = await r.json();
    else sushiError = `HTTP ${r.status}`;
  } catch (e) {
    sushiError = e.message;
    logger.warn('[opsMetrics] conexion summary:', e.message);
  }

  const total = {
    localesActivos: barberia.localesActivos + (sushipro?.localesActivos || 0),
    mensajes:       barberia.mensajes.total + (sushipro?.mensajes?.total || 0),
    costoUsd:       barberia.claude.costoUsd + (sushipro?.claude?.costoUsd || 0),
    llamadasIA:     barberia.claude.llamadas + (sushipro?.claude?.llamadas || 0),
  };

  return { total, barberia, sushipro, sushiError, alertas, trials, mesActual, generadoEn: Date.now() };
});

/* ═══════════════════════════════════════════════════════════════════════════
   KILL SWITCH — apagar el canal desde ops, sin entrar al panel de cada local

   Un gráfico no es control: control es poder cortar. Si un sábado a
   medianoche un bot se descarrila, entrar al panel de cada local (o a
   Firestore a mano) es demasiado lento. Esto apaga por local o todo de una.

   Solo apaga: NO enciende bots ni confirmaciones. Encender es una decisión
   deliberada que debe pasar por el panel del local — acá el botón de pánico
   solo va en una dirección, que es la que no se puede hacer mal.
   ═══════════════════════════════════════════════════════════════════════════ */
/** Solo las alertas ROJAS, calculadas por la MISMA función que alimenta el
 *  dashboard. Si esto reevaluara sus propios umbrales, el correo y el panel
 *  terminarían diciendo cosas distintas. */
async function recolectarAlertasRojas() {
  const hoy = new Date().toISOString().slice(0, 10);
  const { alertas } = await analizarLocales(hoy, hoy.slice(0, 7));
  return alertas.filter(a => a.nivel === 'rojo');
}

exports.opsKillSwitch = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  if (!BOOTSTRAP.includes(String(req.auth.token.email || '').toLowerCase())) {
    throw new HttpsError('permission-denied', 'Solo el operador.');
  }
  const alcance = String(req.data?.alcance || '');   // 'tenant' | 'global'
  const tid     = String(req.data?.tenantId || '');
  const que     = String(req.data?.que || 'todo');   // 'bot' | 'confirmaciones' | 'todo'

  const patch = {};
  if (que === 'bot'  || que === 'todo') patch.botEnabled = false;
  if (que === 'confirmaciones' || que === 'todo') patch.confirmacionesEnabled = false;
  if (!Object.keys(patch).length) throw new HttpsError('invalid-argument', 'Nada que apagar.');
  patch.apagadoPorOps   = true;
  patch.apagadoPorOpsEn = Timestamp.now();

  let objetivos = [];
  if (alcance === 'global') {
    const refs = await db.collection('tenants').listDocuments();
    objetivos = refs.map(r => r.id);
    if (!objetivos.includes('elegance')) objetivos.push('elegance');
  } else if (tid) {
    objetivos = [tid];
  } else {
    throw new HttpsError('invalid-argument', 'Falta tenantId o alcance global.');
  }

  let apagados = 0;
  for (const t of objetivos) {
    const ref = db.doc(`tenants/${t}/configuracion/whatsapp`);
    const s = await ref.get();
    if (!s.exists) continue;                                  // sin canal, nada que apagar
    const d = s.data() || {};
    if (d.botEnabled !== true && d.confirmacionesEnabled !== true) continue;  // ya estaba mudo
    await ref.set(patch, { merge: true });
    apagados++;
    logger.warn(`[ops:kill] ${t} apagado desde ops (${que})`);
  }
  return { ok: true, apagados, objetivos: objetivos.length, que };
});

/* ═══════════════════════════════════════════════════════════════════════════
   VISOR DE CONVERSACIONES — leer lo que el bot está diciendo, sin Firestore

   El primer fin de semana la pregunta no es "cuántos mensajes salieron" sino
   "¿está respondiendo bien?". Devuelve las últimas conversaciones de un local
   con su transcripción para poder auditarlas de un vistazo.

   El teléfono va enmascarado: este panel se abre en cualquier parte y no hay
   razón para exponer el número completo de un cliente para revisar el tono.
   ═══════════════════════════════════════════════════════════════════════════ */
exports.opsConversaciones = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  if (!BOOTSTRAP.includes(String(req.auth.token.email || '').toLowerCase())) {
    throw new HttpsError('permission-denied', 'Solo el operador.');
  }
  const tid   = String(req.data?.tenantId || '');
  if (!tid) throw new HttpsError('invalid-argument', 'Falta tenantId.');
  const limit = Math.min(Number(req.data?.limit) || 8, 25);

  const snap = await db.collection(`tenants/${tid}/wa_conversaciones`)
    .orderBy('updatedAt', 'desc').limit(limit).get();

  const conversaciones = snap.docs.map(d => {
    const c = d.data() || {};
    const msgs = Array.isArray(c.messages) ? c.messages : [];
    return {
      chat:      `••••${String(d.id).slice(-4)}`,
      nombre:    c.clienteNombre || '',
      respHoy:   c.respDia?.n || 0,
      silenciado: millis(c.botSilencedUntil) > Date.now(),
      pendiente: c.citaPendiente ? `${c.citaPendiente.fecha} ${c.citaPendiente.hora}` : null,
      actualizado: millis(c.updatedAt) || null,
      turnos: msgs.slice(-10).map(m => ({
        rol: m.role,
        texto: typeof m.content === 'string' ? m.content : '[bloques]',
      })),
    };
  });
  return { ok: true, tenantId: tid, conversaciones };
});

/* ═══════════════════════════════════════════════════════════════════════════
   VIGILANCIA — las alertas te van a buscar

   Un dashboard solo sirve si alguien lo está mirando. Este cron evalúa las
   mismas alertas cada 30 min y manda correo cuando aparece una ROJA nueva.
   Anti-spam: guarda la firma del último aviso en _system/ops_vigilancia y no
   repite hasta que el conjunto de alertas cambie.
   ═══════════════════════════════════════════════════════════════════════════ */
exports.opsVigilancia = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'America/Santiago',
    region: 'us-central1',
    secrets: [...MAIL_SECRETS],
    timeoutSeconds: 180,
  },
  async () => {
    const rojas = await recolectarAlertasRojas();
    const ref   = db.doc('_system/ops_vigilancia');
    const prev  = (await ref.get().catch(() => null))?.data() || {};

    // Firma = qué alertas hay. Si es la misma, ya avisamos y no insistimos.
    const firma = rojas.map(a => a.texto).sort().join('|');
    if (!rojas.length) {
      if (prev.firma) await ref.set({ firma: '', resueltoEn: Timestamp.now() }, { merge: true }).catch(() => {});
      return;
    }
    if (firma === prev.firma) {
      logger.info('[ops:vigilancia] mismas alertas que el ciclo anterior, no se reenvía');
      return;
    }

    const filas = rojas.map(a => `<li style="margin-bottom:8px">${a.texto}</li>`).join('');
    await enviarEmail({
      from: 'SynapTech Ops <avisos@synaptechspa.cl>',
      to: BOOTSTRAP,
      subject: `🔴 Ops · ${rojas.length} alerta(s) en el canal WhatsApp`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px">
          <h2 style="font-size:17px">Alertas activas</h2>
          <ul style="font-size:14px;line-height:1.6;color:#333">${filas}</ul>
          <p style="font-size:13px;color:#666">Abre <a href="https://ops.synaptechspa.cl">ops.synaptechspa.cl</a> para el detalle y el kill switch.</p>
        </div>`,
    }, { primario: 'resend', etiqueta: 'ops-vigilancia', silencioso: true });

    await ref.set({ firma, avisadoEn: Timestamp.now(), n: rojas.length }, { merge: true }).catch(() => {});
    logger.warn(`[ops:vigilancia] ${rojas.length} alerta(s) roja(s) notificadas`);
  },
);
