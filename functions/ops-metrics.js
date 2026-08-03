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
const { enviarEmail, MAIL_SECRETS, CANALES, COL_USO, diaMail } = require('./lib/mailer');

const db = admin.firestore();
const OPS_TOKEN      = defineSecret('OPS_TOKEN');
const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');   // pricing_analytics de la WABA (cobro real Meta)

// Gate de acceso: la lista CENTRAL de lib/operadores (bootstrap + socio
// developer). Acá vivía una copia local con solo el bootstrap — la clásica
// lista espejo: el socio existía en operadores.js pero ops le decía "Sin
// acceso" (mordió el 31-jul con Gonzalo). BOOTSTRAP se conserva únicamente
// como destinatario del correo de vigilancia, que sí es solo de Ignacio.
const { esOperadorReq } = require('./lib/operadores');
const { negocioDelMes } = require('./lib/bot-negocio');
const { usoDelMes }     = require('./lib/wa-uso');
const BOOTSTRAP = ['ignaciiio.mate@gmail.com'];
const CONEXION_URL = 'https://sushipro.synaptechspa.cl/api/metrics/summary';

/** YYYY-MM-DD en Santiago. Es `diaMail` de lib/mailer, importado arriba y
 *  renombrado acá para que se lea por lo que hace y no por quién lo escribió
 *  primero. NO se define uno nuevo a propósito: entre el mailer, el contador
 *  de métricas y el canal de WhatsApp ya había tres formas de decir "hoy en
 *  Chile", y de ahí salió justamente el desfase que este cambio corrige. */
const diaChile = diaMail;

/** Días hacia atrás desde HOY en Santiago.
 *
 *  Cortaba en UTC igual que el escritor (lib/metrics.js), así que la serie era
 *  internamente coherente pero desfasada 4 h respecto de todo lo demás del
 *  panel: el cupo del chip, el correo y el consumo que ve el dueño ya cortaban
 *  en Santiago. Ahora los cuatro cuentan el mismo día.
 *
 *  El ancla es MEDIODÍA de la fecha chilena: restar días desde ahí nunca cruza
 *  un cambio de horario de verano, que en Chile mueve el reloj y a medianoche
 *  haría que un día se repita o se salte.
 *
 *  Sustituye también a diasMailAtras(): eran la misma función con distinto
 *  nombre desde el momento en que las dos series pasaron a cortar en Chile. */
function ultimosDias(n) {
  const out  = [];
  const base = new Date(diaChile() + 'T12:00:00Z');
  for (let i = 0; i < n; i++) {
    out.push(new Date(base.getTime() - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CORREO TRANSACCIONAL — consumo por proveedor

   Lee el contador que escribe lib/mailer.js en _mailUsage/{YYYY-MM-DD}.
   Sirve para una decisión concreta: cuándo dejan de alcanzar los planes free
   (Resend 100/día, Brevo 300/día) y toca pagar o sumar un tercer canal.
   ═══════════════════════════════════════════════════════════════════════════ */

async function resumenEmail() {
  // Antes tenía su propia diasMailAtras() porque ultimosDias() cortaba en UTC
  // y el contador de correo en Santiago. Ahora las dos series cortan igual, así
  // que la copia sobraba — y una copia que sobra es una que se desincroniza.
  const dias = ultimosDias(31);
  const hoy  = dias[0];
  const mes  = hoy.slice(0, 7);

  const snaps = await Promise.all(dias.map((d) => db.doc(`${COL_USO}/${d}`).get()));

  const ids = Object.keys(CANALES);          // brevo_sy, brevo_bioo, resend_sy…
  const porDia = [];
  const mesTot = Object.fromEntries(ids.map((c) => [c, 0]));
  mesTot.fallidos = 0;
  let diasEnTope = 0;

  snaps.forEach((s, i) => {
    const d = s.data() || {};
    const fila = { fecha: dias[i], fallidos: Number(d.fallidos) || 0 };
    ids.forEach((c) => { fila[c] = Number(d[c]) || 0; });

    // Los docs anteriores al reparto en 4 canales contaban por PROVEEDOR
    // (`resend`/`brevo`). Se suman a la cuenta de SynapTech, que era la única
    // que existía entonces — si no, el histórico del mes aparecería en cero.
    fila.brevo_sy  += Number(d.brevo)  || 0;
    fila.resend_sy += Number(d.resend) || 0;

    fila.total = ids.reduce((t, c) => t + fila[c], 0);
    porDia.push(fila);

    if (dias[i].startsWith(mes)) {
      ids.forEach((c) => { mesTot[c] += fila[c]; });
      mesTot.fallidos += fila.fallidos;
      // Un día en que CUALQUIER canal tocó su techo. Es la señal de compra:
      // no importa el promedio, importa cuántas veces nos quedamos cortos.
      if (ids.some((c) => fila[c] >= CANALES[c].diaria)) diasEnTope++;
    }
  });

  const filaHoy = porDia[0];

  const canales = ids.map((id) => {
    const c = CANALES[id];
    return {
      id,
      nombre: c.etiqueta,
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
  const totalMes = ids.reduce((t, c) => t + mesTot[c], 0);

  return {
    hoy: filaHoy,
    mes: {
      ...mesTot,
      total:      totalMes,
      etiqueta:   mes,
      diasEnTope,
      proyeccion: diaDelMes ? Math.round((totalMes / diaDelMes) * diasDelMes) : 0,
    },
    capacidadDiaria: ids.reduce((t, c) => t + CANALES[c].diaria, 0),
    canales,
    porDia: porDia.slice(0, 14).reverse(),   // cronológico para el minigráfico
  };
}

/** Alertas del canal de correo. Van a la MISMA lista que las de WhatsApp, así
 *  que las rojas también disparan el correo de opsVigilancia. */
function alertasEmail(em) {
  const out = [];
  // Que se agote UN canal ya no es rojo: quedan otros tres y el failover los
  // usa. Rojo se reserva para cuando la suma del día se acerca al techo, que es
  // el momento en que de verdad hay que comprar.
  for (const c of em.canales) {
    if (c.pctDia >= 100) {
      out.push({ nivel: 'ambar', texto: `Correo · ${c.nombre} agotó su cuota diaria (${c.hoy}/${c.capDia}). Los envíos siguen por los otros canales.` });
    } else if (c.pctDia >= UMBRAL.mailPct * 100) {
      out.push({ nivel: 'ambar', texto: `Correo · ${c.nombre} al ${c.pctDia}% de su cuota diaria (${c.hoy}/${c.capDia}).` });
    }
  }
  if (em.hoy.total >= em.capacidadDiaria * UMBRAL.mailPct) {
    out.push({ nivel: 'rojo', texto: `Correo · ${em.hoy.total}/${em.capacidadDiaria} enviados hoy sumando los cuatro canales. Hora de evaluar plan pago.` });
  }
  if (em.hoy.fallidos) {
    out.push({ nivel: 'rojo', texto: `Correo · ${em.hoy.fallidos} envío(s) no salieron por NINGÚN canal hoy.` });
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
  const tids = [...new Set([...tenantRefs.map((r) => r.id), 'elegance'])];

  // Los locales se analizan EN PARALELO: sus lecturas son independientes y en
  // secuencia el dashboard tardaba ~20 s (el 31-jul eso, sumado al arranque en
  // frío, lo dejaba al borde del timeout y el panel veía 500). Promise.all
  // conserva el orden del array, así que la salida no baila entre lecturas.
  const porTenant = await Promise.all(tids.map((tid) => analizarLocal(tid, hoy, mesActual)));

  const locales = [];
  const trials = [];
  const alertas = [];
  const negocioTotal = { agendadas: 0, canceladas: 0, reubicadas: 0, confSi: 0, confNo: 0, optout: 0 };
  for (const r of porTenant) {
    alertas.push(...r.alertas);
    if (r.trial) trials.push(r.trial);
    if (!r.local) continue;
    locales.push(r.local);
    for (const k of Object.keys(negocioTotal)) negocioTotal[k] += r.local.negocio[k] || 0;
  }
  return { locales, trials, alertas, negocioTotal };
}

/** Todo lo de UN local (semáforo, cuota, IA, negocio, alertas). `local` sale
 *  null si el tenant no tiene canal de WhatsApp vinculado. */
async function analizarLocal(tid, hoy, mesActual) {
  const alertas = [];
  const [waSnap, sysSnap, notifSnap] = await Promise.all([
      db.doc(`tenants/${tid}/configuracion/whatsapp`).get(),
      db.doc(`_system/${tid}`).get(),
      db.doc(`wa_notif/${tid}`).get(),
    ]);

  // ── Canal OFICIAL (plantillas Meta + bolsas de mensajes, wa-bolsas.js) ──
  // El saldo es dinero de por medio en las dos direcciones: sin saldo el
  // local queda mudo (y reclama), y el consumo es el costo Meta de SynapTech.
  const notif = notifSnap.data() || {};
  const oficial = {
    planCliente:      notif.planCliente === true,
    planRecordatorio: notif.planRecordatorio === true,
    saldo:  (Number(notif.bolsaSaldoConf) || 0) + (Number(notif.bolsaSaldoRec) || 0),
    saldoConf: Number(notif.bolsaSaldoConf) || 0,
    saldoRec:  Number(notif.bolsaSaldoRec)  || 0,
    usados: Number(notif.bolsaUsados) || 0,
  };
  if (oficial.planCliente || oficial.planRecordatorio) {
    if (oficial.saldo <= 0) {
      alertas.push({ nivel: 'rojo', texto: `${tid}: bolsa de mensajes AGOTADA — confirmaciones oficiales detenidas hasta que recargue.` });
    } else if (oficial.saldo <= 10) {
      alertas.push({ nivel: 'ambar', texto: `${tid}: quedan ${oficial.saldo} mensaje(s) en la bolsa del canal oficial (${oficial.usados} usados).` });
    }
  }

    // Trial del asistente (independiente de si ya vinculó el canal).
    const trial = (sysSnap.data() || {}).waAsistenteTrial || null;
    let trialInfo = null;
    if (trial && trial.fin) {
      const diasRestantes = Math.ceil((Date.parse(trial.fin) - Date.now()) / 86400000);
      trialInfo = { fin: trial.fin, inicio: trial.inicio || null, tipo: trial.tipo || '', diasRestantes };
      if (diasRestantes < 0) {
        alertas.push({ nivel: 'rojo', texto: `Trial VENCIDO: ${tid} venció el ${trial.fin} — apagar waAsistente o convertir a pago.` });
      } else if (diasRestantes <= 15) {
        alertas.push({ nivel: 'ambar', texto: `Trial de ${tid} vence en ${diasRestantes} día(s) (${trial.fin}).` });
      }
    }

    const trialOut = trialInfo ? { tid, ...trialInfo } : null;
    const wa = waSnap.data();
    if (!wa) return { alertas, trial: trialOut, local: null };
    const tieneCanal = wa.estadoConexion === 'connected' || wa.botEnabled === true
      || wa.confirmacionesEnabled === true || !!wa.numeroVinculado;
    if (!tieneCanal) return { alertas, trial: trialOut, local: null };

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
    // Las cinco lecturas que quedan no dependen entre sí: en paralelo.
    const [cuota, silSnap, aiV, aiD, botV, negMes, uso] = await Promise.all([
      resumenHoy(tid),
      db.collection(`tenants/${tid}/wa_conversaciones`)
        .where('botSilencedUntil', '>', Timestamp.now()).get()
        .catch((e) => { logger.warn(`[opsMetrics] silenciados ${tid}:`, e.message); return null; }),
      db.doc(`_metrics/ai_vendor_${tid}_${mesActual}`).get(),
      db.doc(`_metrics/ai_dia_${tid}_${hoy}`).get(),
      db.doc(`_metrics/bot_${tid}_${mesActual}`).get(),
      negocioDelMes(tid, mesActual),
      usoDelMes(tid, mesActual),
    ]);
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
    const silenciados = silSnap ? silSnap.size : 0;
    if (silenciados > 0) {
      alertas.push({ nivel: 'info', texto: `${tid}: bot en pausa en ${silenciados} chat(s) (humano al mando o derivación).` });
    }

    // Costo IA (mes + HOY) y negocio del bot, por tenant.
    const ai   = aiV.data() || {};
    const aiHoy = aiD.data() || {};
    const neg  = botV.data() || {};
    // Derivado de las citas (lib/bot-negocio.js), no del contador _metrics: ese
    // se desviaba en las dos direcciones —perdía eventos con su catch mudo y
    // contaba doble en los reintentos— y ops tomaba decisiones con él.
    // `optout` es la excepción: vive en wa_optout, global y sin tenant.
    const negocio = {
      agendadas:  negMes.agendadasVivas,
      canceladas: negMes.canceladas,
      reubicadas: negMes.reubicadas,   // citas movidas por el bot en vez de perderse
      confSi:     negMes.confSi,
      confNo:     negMes.confNo,
      optout:     Number(neg.optout) || 0,
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
    const local = {
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
      // ── Uso del MES: la base sobre la que se cobran los planes del agente ──
      // Conversación = ventana de 24 h por chat (lib/wa-uso.js), abierta en una
      // transacción, no un increment a ciegas. `costoPorConv` es lo que dice si
      // el precio de un plan tiene margen; `rechazadas` es la señal comercial:
      // un local que topa el cupo es un local listo para subir de plan.
      uso: {
        conversaciones: uso.conversaciones,
        mensajesIn:     uso.mensajesIn,
        mensajesOut:    uso.mensajesOut,
        rechazadas:     uso.rechazadasTotal,
        rechazadasPorMotivo: uso.rechazadas,
        costoPorConvUsd: uso.conversaciones > 0
          ? Number(((Number(ai.costUsd) || 0) / uso.conversaciones).toFixed(4))
          : null,
        // Qué porcentaje de las conversaciones terminó en cita: la tasa de
        // cierre del agente, y el argumento de la comisión por reserva.
        cierrePct: uso.conversaciones > 0
          ? Math.round((negocio.agendadas / uso.conversaciones) * 100)
          : null,
        ok: uso.ok,
      },
      oficial,          // canal oficial: plan + saldo/consumo de la bolsa
      trial: trialInfo,
  };
  return { alertas, trial: trialOut, local };
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
  // Apagado a propósito (cfg.apagado, ej. chip2 desde el 31-jul): no se
  // vigila. Una alerta roja permanente por algo decidido entrena a ignorar
  // las alertas el día que una sí importe.
  if (cfg.apagado === true) return null;

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
  // En paralelo: eran 3 lecturas secuenciales POR doc de _system y este loop
  // era de los que más sumaba a los ~20 s del dashboard.
  const activos = (await Promise.all(sysRefs.map(async (r) => {
    // Los docs de los propios chips viven en /_system: sin este filtro
    // aparecerían como si fueran locales.
    if (r.id === 'wa_plataforma' || r.id.startsWith('wa_plataforma_')) return null;
    const s = (await r.get()).data() || {};
    if (s.waPlataforma !== true) return null;
    if (chipDeTenant(s) !== chipId) return null;   // cada chip lista SUS locales
    const [tdSnap, waSnap] = await Promise.all([
      db.doc(`tenants/${r.id}`).get(),
      db.doc(`tenants/${r.id}/configuracion/whatsapp`).get(),
    ]);
    const td = tdSnap.data() || {};
    const waCfg = waSnap.data() || {};
    return {
      id: r.id,
      nombre: td.nombre || td.nombreCorto || r.id,
      hoy: Number(cuotaHoy[`t_${r.id}`]) || 0,
      // Si el local ya manda por su número propio, el cron lo salta: el
      // módulo figura activo pero no envía nada. Hay que decirlo.
      silenciadoPorCanalPropio: waCfg.confirmacionesEnabled === true && waCfg.estadoConexion === 'connected',
    };
  }))).filter(Boolean);
  activos.sort((a, b) => b.hoy - a.hoy);

  const suficiente = enviados >= CHIP_UMBRAL.volMin;
  const tasaResp   = enviados ? respuestas / enviados : null;
  const tasaOptout = enviados ? optouts / enviados : null;
  const tasaFallo  = (enviados + fallos) ? fallos / (enviados + fallos) : null;

  const señales = [];
  if (suficiente && tasaResp < CHIP_UMBRAL.respuestaBaja) {
    señales.push({
      nivel: 'rojo',
      // "X respuestas para Y envíos" y no "X% de los clientes responde": se
      // cuenta cada mensaje entrante, no cada cliente. Con la redacción vieja,
      // 13 respuestas sobre 10 envíos salía como "130% de los clientes
      // responde (13 de 10)", que es literalmente imposible.
      texto: `Solo ${respuestas} respuesta(s) para ${enviados} envíos (${Math.round(tasaResp * 100)}%). ` +
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

// 512 MiB y 120 s a propósito: con 256 MiB el contenedor cargaba todo el grafo
// de funciones (~130 MB) y el handler lo dejaba a ~180 MB — un cold start o dos
// llamadas concurrentes lo tiraban por OOM y el panel veía 500 "internal"
// intermitentes (31-jul). El handler además tarda ~20 s hoy; 60 s de timeout
// quedaba sin margen en frío.
exports.opsMetrics = onCall({ region: 'us-central1', cors: true, secrets: [OPS_TOKEN, WHATSAPP_TOKEN], memory: '512MiB', timeoutSeconds: 120 }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }

  const ds = ultimosDias(30);
  const hoy = ds[0];
  const mesActual = hoy.slice(0, 7);

  // ── Todo lo independiente sale EN PARALELO ──
  // Antes: métricas globales → locales → correo → chips, en serie (~20 s).
  // Nada de eso depende entre sí; junto con analizarLocales paralelo el
  // dashboard queda en unos pocos segundos.
  const [waSnaps, aiSnaps, resLocales, usoEmail, chips] = await Promise.all([
    Promise.all(ds.map((d) => db.doc(`_metrics/wa_${d}`).get())),
    Promise.all(ds.map((d) => db.doc(`_metrics/ai_${d}`).get())),
    analizarLocales(hoy, mesActual),
    resumenEmail(),
    // Salud de CADA chip de SynapTech: 7 días, la ventana donde una
    // degradación se nota sin que la diluya el histórico.
    listarChips()
      .then((ids) => Promise.all(ids.map((id) => saludChip(ultimosDias(7), id))))
      .then((cs) => cs.filter(Boolean)),
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

  const { locales, trials, alertas, negocioTotal } = resLocales;

  // ── Correo transaccional (Resend + Brevo) ──
  alertas.push(...alertasEmail(usoEmail));

  // Señales de los chips ANTES del sort: si un chip está rojo tiene que salir
  // arriba, no al final de la lista por haberse agregado tarde. La alerta
  // lleva el nombre del chip: con dos o más, "el chip está desconectado" no
  // dice cuál hay que ir a reconectar.
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

  // ── Cobro REAL de Meta (WhatsApp oficial) ──
  // pricing_analytics de la WABA: lo que Meta efectivamente factura (CLP),
  // no nuestra estimación. El split sandbox/producción sale de NUESTRO
  // ledger (notification_logs): Meta no sabe de tenants.
  let metaWhatsApp = null;
  try {
    const WABA = '1585275879793911';
    const ini = Math.floor(new Date(`${mesActual}-01T00:00:00-04:00`).getTime() / 1000);
    const fin = Math.floor(Date.now() / 1000);
    const rr = await fetch(`https://graph.facebook.com/v21.0/${WABA}?fields=pricing_analytics.start(${ini}).end(${fin}).granularity(DAILY)&access_token=${WHATSAPP_TOKEN.value()}`);
    const jj = await rr.json();
    const pts = jj?.pricing_analytics?.data?.[0]?.data_points || [];
    const hoyIni = Math.floor(new Date(`${hoy}T00:00:00-04:00`).getTime() / 1000);
    let mesMsgs = 0, mesClp = 0, hoyMsgs = 0, hoyClp = 0;
    for (const p of pts) {
      mesMsgs += Number(p.volume) || 0;
      mesClp  += Number(p.cost)   || 0;
      if (p.start >= hoyIni) { hoyMsgs += Number(p.volume) || 0; hoyClp += Number(p.cost) || 0; }
    }
    // Split por tenant desde el ledger propio del mes.
    const cfgWa = (await db.doc('_system/whatsapp_notif').get()).data() || {};
    const SANDBOX = new Set(Array.isArray(cfgWa.tenantsSandbox) ? cfgWa.tenantsSandbox : ['delnero', 'elegance']);
    // Solo el rango de fecha en la query (campo único, sin índice compuesto:
    // channel+sentAt lo exigía y el error silencioso dejaba el panel vacío);
    // el canal se filtra en memoria — un mes de logs son cientos, no miles.
    const logs = await db.collection('notification_logs')
      .where('sentAt', '>=', Timestamp.fromMillis(ini * 1000)).get();
    const porTenant = {};
    logs.forEach((d) => {
      const x = d.data();
      if (x.channel !== 'whatsapp_template' || x.status !== 'sent') return;
      const t = x.tenantId || '?';
      porTenant[t] = porTenant[t] || { mes: 0, hoy: 0 };
      porTenant[t].mes++;
      if ((x.sentAt?.toMillis?.() || 0) >= hoyIni * 1000) porTenant[t].hoy++;
    });
    const cpm = mesMsgs ? mesClp / mesMsgs : 17.7;   // costo por mensaje real del mes
    const grupos = { sandbox: { mensajes: 0, costoClp: 0 }, produccion: { mensajes: 0, costoClp: 0 } };
    const detalle = Object.entries(porTenant).map(([t, v]) => {
      const esSandbox = SANDBOX.has(t);
      const g = grupos[esSandbox ? 'sandbox' : 'produccion'];
      g.mensajes += v.mes; g.costoClp += Math.round(v.mes * cpm);
      return { tid: t, hoy: v.hoy, mes: v.mes, costoClp: Math.round(v.mes * cpm), sandbox: esSandbox };
    }).sort((a, b) => b.mes - a.mes);
    metaWhatsApp = {
      hoy: { mensajes: hoyMsgs, costoClp: Math.round(hoyClp) },
      mes: { mensajes: mesMsgs, costoClp: Math.round(mesClp) },
      costoPorMensaje: Math.round(cpm * 100) / 100,
      sandbox: grupos.sandbox, produccion: grupos.produccion,
      porTenant: detalle,
    };
  } catch (e) { logger.warn('[opsMetrics] pricing_analytics:', e.message); }

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

  return { total, barberia, sushipro, sushiError, alertas, trials, email: usoEmail, metaWhatsApp, mesActual, generadoEn: Date.now() };
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
  // Chile, no UTC: `hoy` se usa para leer _metrics/ai_dia_{tid}_{hoy}, que
  // ahora se escribe con la fecha chilena. Con UTC, el correo de alertas de
  // las 20:00 en adelante leería el doc de mañana —vacío— y reportaría consumo
  // cero justo en las horas de más movimiento.
  const hoy = diaChile();
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
  if (!esOperadorReq(req)) {
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
  if (!esOperadorReq(req)) {
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
      // Transcripción COMPLETA de lo archivado (hasta 80 turnos): con 10 no
      // se podía auditar un reclamo y había que pedirle capturas al local.
      turnos: msgs.slice(-80).map(m => ({
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
    }, { grupo: 'interno', etiqueta: 'ops-vigilancia', silencioso: true });

    await ref.set({ firma, avisadoEn: Timestamp.now(), n: rojas.length }, { merge: true }).catch(() => {});
    logger.warn(`[ops:vigilancia] ${rojas.length} alerta(s) roja(s) notificadas`);
  },
);
