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
// Las cuotas y la fecha del contador se IMPORTAN del mailer, mismo criterio que
// capDiario más abajo: una sola definición, sin réplica que se desincronice.
const { enviarEmail, MAIL_SECRETS, CUOTAS, COL_USO, diaMail } = require('./lib/mailer');

const db = admin.firestore();
const OPS_TOKEN      = defineSecret('OPS_TOKEN');

const BOOTSTRAP = ['ignaciiio.mate@gmail.com'];
const CONEXION_URL = 'https://sushipro.synaptechspa.cl/api/metrics/summary';

function ultimosDias(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CORREO TRANSACCIONAL — consumo por proveedor

   Lee el contador que escribe lib/mailer.js en _mailUsage/{YYYY-MM-DD}.
   Sirve para una decisión concreta: cuándo dejan de alcanzar los planes free
   (Resend 100/día, Brevo 300/día) y toca pagar o sumar un tercer canal.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Días hacia atrás desde HOY en Santiago.
 *  No usa ultimosDias(): esa corta en UTC y el contador corta en Santiago, así
 *  que pasadas las 20:00 CL el dashboard leería el doc de mañana (vacío) y
 *  mostraría 0 enviados justo en las horas de más movimiento. */
function diasMailAtras(n) {
  const out  = [];
  // Mediodía UTC como ancla: restar días nunca cruza un cambio de horario.
  const base = new Date(diaMail() + 'T12:00:00Z');
  for (let i = 0; i < n; i++) {
    out.push(new Date(base.getTime() - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

async function resumenEmail() {
  const dias = diasMailAtras(31);
  const hoy  = dias[0];
  const mes  = hoy.slice(0, 7);

  const snaps = await Promise.all(dias.map((d) => db.doc(`${COL_USO}/${d}`).get()));

  const porDia = [];
  const mesTot = { resend: 0, brevo: 0, fallidos: 0 };
  let diasEnTope = 0;

  snaps.forEach((s, i) => {
    const d = s.data() || {};
    const fila = {
      fecha:    dias[i],
      resend:   Number(d.resend)   || 0,
      brevo:    Number(d.brevo)    || 0,
      fallidos: Number(d.fallidos) || 0,
    };
    fila.total = fila.resend + fila.brevo;
    porDia.push(fila);

    if (dias[i].startsWith(mes)) {
      mesTot.resend   += fila.resend;
      mesTot.brevo    += fila.brevo;
      mesTot.fallidos += fila.fallidos;
      // Un día en que CUALQUIER canal tocó su techo. Es la señal de compra:
      // no importa el promedio, importa cuántas veces nos quedamos cortos.
      if (fila.resend >= CUOTAS.resend.diaria || fila.brevo >= CUOTAS.brevo.diaria) diasEnTope++;
    }
  });

  const filaHoy = porDia[0];

  const proveedores = ['brevo', 'resend'].map((id) => {
    const c = CUOTAS[id];
    return {
      id,
      plan:   c.plan,
      hoy:    filaHoy[id],
      capDia: c.diaria,
      pctDia: c.diaria ? Math.round((filaHoy[id] / c.diaria) * 100) : 0,
      mes:    mesTot[id],
      capMes: c.mensual,
      pctMes: c.mensual ? Math.round((mesTot[id] / c.mensual) * 100) : 0,
    };
  });

  // Proyección de cierre de mes al ritmo actual: contesta "¿llego con el free?"
  const diaDelMes = Number(hoy.slice(8, 10));
  const diasDelMes = new Date(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)), 0).getDate();
  const totalMes = mesTot.resend + mesTot.brevo;

  return {
    hoy: filaHoy,
    mes: {
      ...mesTot,
      total:      totalMes,
      etiqueta:   mes,
      diasEnTope,
      proyeccion: diaDelMes ? Math.round((totalMes / diaDelMes) * diasDelMes) : 0,
    },
    capacidadDiaria: CUOTAS.resend.diaria + CUOTAS.brevo.diaria,
    proveedores,
    porDia: porDia.slice(0, 14).reverse(),   // cronológico para el minigráfico
  };
}

/** Alertas del canal de correo. Van a la MISMA lista que las de WhatsApp, así
 *  que las rojas también disparan el correo de opsVigilancia. */
function alertasEmail(em) {
  const out = [];
  for (const p of em.proveedores) {
    if (p.pctDia >= 100) {
      out.push({ nivel: 'rojo', texto: `Correo · ${p.id} agotó su cuota diaria (${p.hoy}/${p.capDia}). Los envíos están cayendo al otro canal.` });
    } else if (p.pctDia >= UMBRAL.mailPct * 100) {
      out.push({ nivel: 'ambar', texto: `Correo · ${p.id} al ${p.pctDia}% de su cuota diaria (${p.hoy}/${p.capDia}).` });
    }
  }
  if (em.hoy.total >= em.capacidadDiaria * UMBRAL.mailPct) {
    out.push({ nivel: 'rojo', texto: `Correo · ${em.hoy.total}/${em.capacidadDiaria} enviados hoy sumando los dos canales. Hora de evaluar plan pago o un tercer proveedor.` });
  }
  if (em.hoy.fallidos) {
    out.push({ nivel: 'ambar', texto: `Correo · ${em.hoy.fallidos} envío(s) fallaron en AMBOS canales hoy.` });
  }
  return out;
}

// Los topes se IMPORTAN, no se copian. Antes había acá una réplica de
// capDiario con un comentario que decía "mantener sincronizados" — y cuando
// los topes cambiaron en cuota.js, este dashboard siguió mostrando los
// viejos. Un panel de control que miente sobre el límite anti-ban es peor
// que no tener panel.
const { capDiario, capConfirmaciones, resumenHoy } = require('./evolution/cuota');
// Tope del chip compartido: se importa por el mismo motivo que los de arriba.
// Todo lo del chip se IMPORTA de evolution/plataforma: tope, rutas de los docs
// y la lista de chips vinculados. El dashboard no puede tener su propia idea de
// ninguna de las tres — ya pasó con los topes del canal propio, que cambiaron
// en el módulo y acá siguieron mostrándose los viejos durante semanas.
const {
  _capDiario:     capDiarioChip,
  _chipRef:       chipRef,
  _cuotaRef:      cuotaRefChip,
  _listarChips:   listarChips,
  _chipDeTenant:  chipDeTenant,
  _CHIP_DEFAULT:  CHIP_DEFAULT,
} = require('./evolution/plataforma');

// Umbrales de vigilancia. Son los que disparan alerta en el dashboard y en el
// correo de `opsVigilancia`.
const UMBRAL = {
  cuotaPct:     0.80,   // % del tope diario de salientes
  costoDiaUsd:  1.50,   // costo IA de UN local en UN día
  cacheHitMin:  0.60,   // bajo esto, el caché del prompt se rompió
  optoutPct:    0.05,   // bajas / envíos del mes
  failPct:      0.20,   // fallos de envío del día
  mailPct:      0.80,   // % de la cuota diaria de correo de un proveedor
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

/* ─────────────── SALUD DEL CHIP DE PLATAFORMA (canal SynapTech) ───────────────
   El chip compartido de evolution/plataforma.js es un consumible: se va a
   quemar tarde o temprano y la pregunta operativa es CUÁNDO cambiarlo, no si.
   Meta no avisa antes de suspender, así que hay que leer las señales
   adelantadas — y el volumen NO es una de ellas.

   Lo que de verdad anticipa el bloqueo, en orden de utilidad:
     1. Tasa de respuesta a la baja → posible shadowban: el envío sale "ok"
        pero el mensaje no llega. Es la señal más temprana y la más ignorada.
     2. Tasa de bajas (STOP) → la gente pidiendo salir es lo que sube justo
        antes de que Meta actúe.
     3. Tasa de fallo de envío → sesión ya degradada.
     4. Caídas de sesión → inestabilidad; suele acompañar a lo anterior.

   Se mira sobre 7 días y con un piso de volumen: con 3 mensajes enviados
   cualquier porcentaje es ruido, y una alarma que grita sin motivo se
   termina ignorando justo el día que importa. */
const CHIP_UMBRAL = {
  volMin:        20,    // mensajes en 7d para que los % signifiquen algo
  respuestaBaja: 0.20,  // <20% contestando con volumen suficiente
  optoutAlto:    0.05,  // >5% pidiendo baja
  falloAlto:     0.10,  // >10% de envíos fallando
  caidasDia:     3,     // caídas de sesión por día
};

async function saludChip(dias, chipId = CHIP_DEFAULT) {
  const cfg = (await chipRef(chipId).get()).data() || null;
  if (!cfg) return null;   // el chip nunca se vinculó: nada que vigilar

  const snaps = await Promise.all(
    dias.map((d) => cuotaRefChip(chipId, d).get()),
  );

  let enviados = 0, fallos = 0, respuestas = 0, optouts = 0, caidas = 0;
  let confSi = 0, confNo = 0;
  const porDia = {};
  const porLocal = {};
  snaps.forEach((s, i) => {
    const d = s.data(); if (!d) return;
    const n = Number(d.n) || 0;
    enviados   += n;
    fallos     += Number(d.fail)       || 0;
    respuestas += Number(d.respuestas) || 0;
    optouts    += Number(d.optout)     || 0;
    caidas     += Number(d.caidas)     || 0;
    confSi     += Number(d.conf_si)    || 0;
    confNo     += Number(d.conf_no)    || 0;
    porDia[dias[i]] = n;
    Object.keys(d).forEach((k) => {
      if (k.startsWith('t_')) porLocal[k.slice(2)] = (porLocal[k.slice(2)] || 0) + (Number(d[k]) || 0);
    });
  });

  const desde = cfg.vinculadoDesde?.toMillis ? cfg.vinculadoDesde.toMillis() : 0;
  const diasChip = desde ? (Date.now() - desde) / 86400000 : 0;
  // El tope se IMPORTA, no se recalcula: incluye el override manual y el
  // escalonado por antigüedad. Ya nos pasó con los topes del canal propio —
  // cambiaron en el módulo y el dashboard siguió mostrando los viejos.
  const cap = capDiarioChip(cfg);

  // ── Quién tiene el chip activo y cuánto consumió HOY ──
  // El tope es del CHIP, no de cada local: comparten el mismo cupo. Por eso
  // se muestra el consumo de cada uno contra el restante GLOBAL — si un local
  // se come el día, los demás quedan mudos aunque no hayan enviado nada.
  const hoyCL = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
  const cuotaHoy = (await cuotaRefChip(chipId, hoyCL).get()).data() || {};
  const usadosHoy = Number(cuotaHoy.n) || 0;

  const sysRefs = await db.collection('_system').listDocuments();
  const activos = [];
  for (const r of sysRefs) {
    // Los docs de los propios chips viven en /_system: sin este filtro
    // aparecerían como si fueran locales.
    if (r.id === 'wa_plataforma' || r.id.startsWith('wa_plataforma_')) continue;
    const s = (await r.get()).data() || {};
    if (s.waPlataforma !== true) continue;
    if (chipDeTenant(s) !== chipId) continue;   // cada chip lista SUS locales
    const td = (await db.doc(`tenants/${r.id}`).get()).data() || {};
    const waCfg = (await db.doc(`tenants/${r.id}/configuracion/whatsapp`).get()).data() || {};
    activos.push({
      id: r.id,
      nombre: td.nombre || td.nombreCorto || r.id,
      hoy: Number(cuotaHoy[`t_${r.id}`]) || 0,
      // Si el local ya manda por su número propio, el cron lo salta: el
      // módulo figura activo pero no envía nada. Hay que decirlo.
      silenciadoPorCanalPropio: waCfg.confirmacionesEnabled === true && waCfg.estadoConexion === 'connected',
    });
  }
  activos.sort((a, b) => b.hoy - a.hoy);

  const suficiente = enviados >= CHIP_UMBRAL.volMin;
  const tasaResp   = enviados ? respuestas / enviados : null;
  const tasaOptout = enviados ? optouts / enviados : null;
  const tasaFallo  = (enviados + fallos) ? fallos / (enviados + fallos) : null;

  const señales = [];
  if (suficiente && tasaResp < CHIP_UMBRAL.respuestaBaja) {
    señales.push({
      nivel: 'rojo',
      texto: `Solo ${Math.round(tasaResp * 100)}% de los clientes responde (${respuestas} de ${enviados}). ` +
             'Si el envío sale bien pero nadie contesta, lo más probable es que los mensajes no estén llegando: shadowban.',
    });
  }
  if (suficiente && tasaOptout > CHIP_UMBRAL.optoutAlto) {
    señales.push({
      nivel: 'rojo',
      texto: `${optouts} bajas en ${enviados} envíos (${Math.round(tasaOptout * 100)}%). ` +
             'La tasa de bajas es lo que sube justo antes de que Meta suspenda.',
    });
  }
  if (suficiente && tasaFallo > CHIP_UMBRAL.falloAlto) {
    señales.push({
      nivel: 'ambar',
      texto: `${Math.round(tasaFallo * 100)}% de los envíos falla (${fallos}). Sesión degradada.`,
    });
  }
  if (caidas > CHIP_UMBRAL.caidasDia * dias.length) {
    señales.push({
      nivel: 'ambar',
      texto: `${caidas} caídas de sesión en ${dias.length} días. Sesión inestable.`,
    });
  }
  if (cfg.estadoConexion !== 'connected') {
    const horas = cfg.desconectadoEn?.toMillis
      ? Math.round((Date.now() - cfg.desconectadoEn.toMillis()) / 3600e3) : null;
    señales.push({
      nivel: 'rojo',
      texto: `El chip está desconectado${horas != null ? ` hace ~${horas}h` : ''}. No sale ninguna confirmación.`,
    });
  }

  // Veredicto: cambiar el chip solo ante señal roja. Ámbar es vigilar, no
  // gastar un chip nuevo — cada recambio reinicia el escalonado a 40/día.
  const veredicto = señales.some((s) => s.nivel === 'rojo') ? 'cambiar'
                  : señales.length                          ? 'vigilar'
                  : suficiente                              ? 'sano'
                  : 'sin-datos';

  return {
    chipId,
    nombre: cfg.nombre || (chipId === CHIP_DEFAULT ? 'Chip principal' : chipId),
    numero: cfg.numeroVinculado || null,
    estado: cfg.estadoConexion || 'desconocido',
    diasVinculado: Number(diasChip.toFixed(1)),
    cap,
    topeManual: Number.isFinite(Number(cfg.topeDiario)) ? Number(cfg.topeDiario) : null,
    usadosHoy,
    restanteHoy: Math.max(0, cap - usadosHoy),
    activos,
    dias: dias.length,
    enviados, fallos, respuestas, optouts, caidas, confSi, confNo,
    tasaRespuesta: tasaResp, tasaOptout, tasaFallo,
    volumenSuficiente: suficiente,
    porDia, porLocal,
    señales, veredicto,
  };
}

exports._saludChip = saludChip;   // para el test de umbrales

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

  // ── Correo transaccional (Resend + Brevo) ──
  const usoEmail = await resumenEmail();
  alertas.push(...alertasEmail(usoEmail));

  // Salud de CADA chip de SynapTech: 7 días, que es la ventana donde una
  // degradación se nota sin que la diluya el histórico.
  // Va ANTES del sort: si un chip está rojo tiene que salir arriba, no al
  // final de la lista por haberse agregado tarde.
  //
  // La alerta lleva el nombre del chip: con dos o más, "el chip está
  // desconectado" no dice cuál hay que ir a reconectar.
  const idsChips = await listarChips();
  const chips = (await Promise.all(idsChips.map((id) => saludChip(ultimosDias(7), id))))
    .filter(Boolean);
  for (const c of chips) {
    c.señales.forEach((s) => alertas.push({
      nivel: s.nivel,
      texto: `Chip ${c.nombre} · ${s.texto}`,
    }));
  }
  // `chip` (singular) se mantiene apuntando al principal: ops.html lo lee así
  // desde antes y no tiene por qué romperse mientras se actualiza la vista.
  const chip = chips.find((c) => c.chipId === CHIP_DEFAULT) || chips[0] || null;

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
    chip,     // el principal — compat con la vista actual de ops
    chips,    // todos, para el panel por chip
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

  return { total, barberia, sushipro, sushiError, alertas, trials, email: usoEmail, mesActual, generadoEn: Date.now() };
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
  const [{ alertas }, email] = await Promise.all([
    analizarLocales(hoy, hoy.slice(0, 7)),
    resumenEmail(),
  ]);
  // Quedarse sin cuota de correo es un incidente que merece aviso: si se agotan
  // los dos canales, dejan de salir las confirmaciones de cita.
  alertas.push(...alertasEmail(email));
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
