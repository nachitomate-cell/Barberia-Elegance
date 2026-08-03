'use strict';

// functions/informe-medidor-agente.js
// ─────────────────────────────────────────────────────────────────────────────
//  INFORME DEL MEDIDOR DEL AGENTE — se manda UNA vez, cuando hay datos.
//
//  El 03-08-2026 se reemplazó el contador de conversaciones por un medidor
//  exacto (lib/wa-uso.js). Fijar el precio de los planes ESE día habría sido
//  repetir el error que veníamos de arreglar: decidir sobre un número en el que
//  todavía no se confía. Se acordó dejarlo correr dos semanas.
//
//  Esto es ese temporizador. Corre todos los días, mira si ya se cumplió el
//  plazo y —una sola vez— manda el correo con la distribución real y el corte
//  de planes que esos datos aguantan.
//
//  Por qué un cron diario y no un envío programado: Cloud Scheduler no hace
//  disparos de una sola vez. El estado vive en _system/informes.medidorAgente,
//  así que la fecha se puede mover a mano y el `enviado` impide que se repita
//  aunque el cron corra mil veces.
//
//  DEPLOY:
//    firebase deploy --only functions:informeMedidorAgente,functions:informeMedidorAgenteAhora
// ─────────────────────────────────────────────────────────────────────────────

const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError }= require('firebase-functions/v2/https');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { FieldValue }        = require('firebase-admin/firestore');
const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');
const { usoDelMes }         = require('./lib/wa-uso');
const { negocioDelMes }     = require('./lib/bot-negocio');

const db = admin.firestore();

const MAIL_FROM  = 'SynapTech <no-reply@synaptechspa.cl>';
const MAIL_PARA  = 'ignaciiio.mate@gmail.com';
const ESTADO_REF = () => db.doc('_system/informes');

/** Plazo por defecto si nadie lo configuró: dos semanas desde el 03-08-2026,
 *  el día en que el medidor exacto entró en producción. */
const PLAZO_POR_DEFECTO = '2026-08-17';

/* Datos mínimos para que la recomendación signifique algo. Sin este umbral, un
   mes flojo produce percentiles de 0 y la función igual propondría planes: el
   piso de la fórmula, presentado con la misma cara de seguridad que un número
   bien medido. Es exactamente el error que este informe existe para evitar.
   Si no se alcanza, se avisa y se prorroga en vez de inventar un corte. */
const MIN_CONVERSACIONES = 30;
const MIN_LOCALES        = 2;
const MAX_PRORROGAS      = 3;   // ~6 semanas extra; después se manda lo que haya
const DIAS_PRORROGA      = 14;

const hoyCL = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const clp = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
const usd = (n) => 'USD ' + (Number(n) || 0).toFixed(3);

/** Dólar de referencia para pasar el costo de Claude a pesos. Aproximado a
 *  propósito: sirve para dimensionar el margen, no para contabilidad. */
const CLP_POR_USD = 950;

/** Percentil sobre una lista YA ordenada de menor a mayor. */
function percentil(orden, p) {
  if (!orden.length) return 0;
  const i = Math.min(orden.length - 1, Math.max(0, Math.round((p / 100) * (orden.length - 1))));
  return orden[i];
}

/**
 * Junta, para cada local con el bot encendido, lo que el medidor lleva
 * registrado: conversaciones, mensajes, rechazos, citas y costo de IA.
 */
async function recolectar(meses) {
  const refs = await db.collection('tenants').listDocuments();
  const tids = refs.map(r => r.id).filter(id => id !== 'elegance');

  const filas = [];
  for (const tid of tids) {
    const [waSnap, sysSnap] = await Promise.all([
      db.doc(`tenants/${tid}/configuracion/whatsapp`).get(),
      db.doc(`_system/${tid}`).get(),
    ]);
    const wa  = waSnap.data()  || {};
    const sys = sysSnap.data() || {};
    // Solo los que tuvieron el bot encendido en la ventana: un local sin
    // asistente metería ceros y correría los percentiles hacia abajo.
    if (wa.botEnabled !== true) continue;

    const fila = {
      tid,
      nombre: sys.nombre || tid,
      conversaciones: 0, mensajesIn: 0, mensajesOut: 0,
      rechazadas: 0, rechazadasPorMotivo: {},
      citas: 0, dinero: 0, costoUsd: 0,
    };

    for (const mes of meses) {
      const [uso, neg, aiSnap] = await Promise.all([
        usoDelMes(tid, mes),
        negocioDelMes(tid, mes),
        db.doc(`_metrics/ai_vendor_${tid}_${mes}`).get(),
      ]);
      fila.conversaciones += uso.conversaciones;
      fila.mensajesIn     += uso.mensajesIn;
      fila.mensajesOut    += uso.mensajesOut;
      fila.rechazadas     += uso.rechazadasTotal;
      for (const [k, v] of Object.entries(uso.rechazadas || {})) {
        fila.rechazadasPorMotivo[k] = (fila.rechazadasPorMotivo[k] || 0) + (Number(v) || 0);
      }
      fila.citas  += neg.agendadasVivas;
      fila.dinero += neg.dineroAgendado;
      fila.costoUsd += Number((aiSnap.data() || {}).costUsd) || 0;
    }
    filas.push(fila);
  }
  return filas.sort((a, b) => b.conversaciones - a.conversaciones);
}

/**
 * La medida a tomar. No inventa precios: parte del costo REAL por conversación
 * y propone los cortes en los percentiles observados, que es lo único que evita
 * un plan que nadie alcanza o uno que todos revientan el día 10.
 */
function recomendar(filas, dias) {
  const activos = filas.filter(f => f.conversaciones > 0);
  const totalConv  = filas.reduce((a, f) => a + f.conversaciones, 0);
  const totalCosto = filas.reduce((a, f) => a + f.costoUsd, 0);
  const totalCitas = filas.reduce((a, f) => a + f.citas, 0);

  const costoConvUsd = totalConv > 0 ? totalCosto / totalConv : 0;
  const costoConvClp = costoConvUsd * CLP_POR_USD;

  // Proyección a mes cerrado: la ventana medida casi nunca son 30 días justos.
  const factor = dias > 0 ? 30 / dias : 1;
  const mensual = activos
    .map(f => Math.round(f.conversaciones * factor))
    .sort((a, b) => a - b);

  const p50 = percentil(mensual, 50);
  const p90 = percentil(mensual, 90);
  const max = mensual.length ? mensual[mensual.length - 1] : 0;

  // Los cortes se redondean a la centena de arriba: un plan de "137
  // conversaciones" delata que salió de una planilla y no de una decisión.
  const redondear = (n) => Math.max(100, Math.ceil(n / 50) * 50);
  const cupoEsencial = redondear(p50 * 1.3);   // el local típico con holgura
  const cupoPro      = redondear(p90 * 1.3);   // el intensivo sin sobresaltos

  // Precio con margen objetivo de 70% sobre el costo del cupo lleno, que es el
  // peor caso (un local que agota su plan todos los meses).
  const precio = (cupo) => Math.max(4900, Math.ceil((cupo * costoConvClp / 0.30) / 1000) * 1000);

  return {
    totalConv, totalCitas, costoConvUsd, costoConvClp,
    cierrePct: totalConv > 0 ? Math.round((totalCitas / totalConv) * 100) : null,
    p50, p90, max, activos: activos.length,
    esencial: { cupo: cupoEsencial, precio: precio(cupoEsencial) },
    pro:      { cupo: cupoPro,      precio: precio(cupoPro) },
    excedente: Math.max(50, Math.ceil((costoConvClp / 0.30) / 10) * 10),
  };
}

function html({ filas, rec, desde, hasta, dias }) {
  const fila = (f) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #1e293b;color:#e2e8f0;">${f.nombre}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #1e293b;color:#f1f5f9;text-align:right;font-weight:700;">${f.conversaciones}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #1e293b;color:#94a3b8;text-align:right;">${f.mensajesIn} / ${f.mensajesOut}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #1e293b;color:${f.rechazadas ? '#fbbf24' : '#64748b'};text-align:right;">${f.rechazadas || '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #1e293b;color:#34d399;text-align:right;">${f.citas}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #1e293b;color:#94a3b8;text-align:right;">${usd(f.costoUsd)}</td>
    </tr>`;

  const rechazos = filas.flatMap(f =>
    Object.entries(f.rechazadasPorMotivo).map(([m, n]) => `${f.nombre}: ${n} por ${m.replace(/_/g, ' ')}`));

  return `<div style="background:#0f172a;padding:28px 20px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
  <div style="max-width:660px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">
    <div style="padding:22px 24px;border-bottom:1px solid #1f2937;">
      <h1 style="margin:0;font-size:21px;font-weight:900;color:#f1f5f9;letter-spacing:-0.4px;">📊 El medidor del agente ya tiene datos</h1>
      <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
        Pasaron los ${dias} días que acordamos (${desde} → ${hasta}). Acá está lo que midió y el corte de planes que estos números aguantan.
      </p>
    </div>

    <div style="padding:20px 24px;">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <thead><tr>
          <th style="padding:6px 10px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;">Local</th>
          <th style="padding:6px 10px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;">Conv.</th>
          <th style="padding:6px 10px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;">Msj in/out</th>
          <th style="padding:6px 10px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;">Rechaz.</th>
          <th style="padding:6px 10px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;">Citas</th>
          <th style="padding:6px 10px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;">Costo IA</th>
        </tr></thead>
        <tbody>${filas.map(fila).join('')}</tbody>
      </table>
      ${filas.length === 0 ? '<p style="color:#fbbf24;font-size:13px;margin:14px 0 0;">Ningún local tuvo el bot encendido en la ventana. No hay con qué fijar planes todavía.</p>' : ''}
    </div>

    <div style="padding:0 24px 20px;">
      <div style="background:#0b1220;border:1px solid #1f2937;border-radius:12px;padding:16px 18px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:800;color:#7dd3fc;text-transform:uppercase;letter-spacing:0.7px;">Lo que dicen los números</p>
        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.85;">
          · <b style="color:#f1f5f9;">${rec.totalConv} conversaciones</b> en ${rec.activos} local${rec.activos === 1 ? '' : 'es'} activo${rec.activos === 1 ? '' : 's'}<br>
          · Costo real por conversación: <b style="color:#f1f5f9;">${usd(rec.costoConvUsd)}</b> (~${clp(rec.costoConvClp)})<br>
          · Local típico: <b style="color:#f1f5f9;">${rec.p50}/mes</b> · el intensivo: <b style="color:#f1f5f9;">${rec.p90}/mes</b> · el mayor: ${rec.max}/mes<br>
          · Cerró en cita el <b style="color:#34d399;">${rec.cierrePct === null ? '—' : rec.cierrePct + '%'}</b> de las conversaciones (${rec.totalCitas} reservas)
        </p>
      </div>
    </div>

    <div style="padding:0 24px 24px;">
      <div style="background:rgba(52,211,153,0.07);border:1px solid rgba(52,211,153,0.28);border-radius:12px;padding:16px 18px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:800;color:#34d399;text-transform:uppercase;letter-spacing:0.7px;">La medida a tomar</p>
        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.85;">
          · <b style="color:#f1f5f9;">Esencial — ${clp(rec.esencial.precio)} neto:</b> ${rec.esencial.cupo} conversaciones/mes<br>
          · <b style="color:#f1f5f9;">Pro — ${clp(rec.pro.precio)} neto:</b> ${rec.pro.cupo} conversaciones/mes<br>
          · <b style="color:#f1f5f9;">Excedente:</b> ${clp(rec.excedente)} por conversación extra, sin cortar el bot<br>
          · Más <b style="color:#f1f5f9;">$500 por cita agendada</b> en los dos planes
        </p>
        <p style="margin:12px 0 0;font-size:11.5px;color:#94a3b8;line-height:1.7;">
          Los cupos salen de los percentiles reales con 30% de holgura: el Esencial cubre al local típico y el Pro al intensivo. Los precios dejan ~70% de margen con el plan agotado, que es el peor caso.
        </p>
      </div>
    </div>

    ${rechazos.length ? `<div style="padding:0 24px 24px;">
      <div style="background:rgba(251,191,36,0.07);border:1px solid rgba(251,191,36,0.28);border-radius:12px;padding:16px 18px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#fbbf24;text-transform:uppercase;letter-spacing:0.7px;">Conversaciones que no se atendieron</p>
        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.8;">${rechazos.join('<br>')}</p>
        <p style="margin:10px 0 0;font-size:11.5px;color:#94a3b8;line-height:1.7;">Cada una es un cliente que escribió y no tuvo respuesta. Si el motivo es el tope, ese local está pidiendo un plan más grande.</p>
      </div>
    </div>` : ''}

    <div style="padding:0 24px 26px;">
      <p style="margin:0;font-size:11.5px;color:#64748b;line-height:1.7;">
        Conversación = ventana de 24 h por chat, la misma definición de WhatsApp Business. Medida en transacción sobre el doc del chat, así que no cuenta doble.
        El detalle por local está en ops. Este correo se manda una sola vez.
      </p>
    </div>
  </div>
</div>`;
}

/** Correo corto cuando la muestra no da: se dice qué falta y hasta cuándo. */
function htmlInsuficiente({ rec, activos, dias, nuevoPlazo }) {
  return `<div style="background:#0f172a;padding:28px 20px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:16px;padding:24px;">
    <h1 style="margin:0;font-size:20px;font-weight:900;color:#f1f5f9;letter-spacing:-0.4px;">⏳ El medidor aún no junta datos para fijar planes</h1>
    <p style="margin:12px 0 0;font-size:13.5px;color:#cbd5e1;line-height:1.8;">
      En ${dias} días el asistente tuvo <b style="color:#f1f5f9;">${rec.totalConv} conversaciones</b> en
      <b style="color:#f1f5f9;">${activos} local${activos === 1 ? '' : 'es'}</b>. Para proponerte un corte de planes
      que no sea una corazonada necesito al menos ${MIN_CONVERSACIONES} conversaciones en ${MIN_LOCALES} locales.
    </p>
    <p style="margin:14px 0 0;font-size:13.5px;color:#cbd5e1;line-height:1.8;">
      Con esta muestra los percentiles darían casi cero y la fórmula caería a su piso: te llegaría un plan inventado
      con cara de dato. Prefiero esperar — <b style="color:#f1f5f9;">vuelvo a mirar el ${nuevoPlazo}</b>.
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.7;">
      Si necesitas los planes antes, avísame y los armamos con lo que haya, asumiendo el margen de error.
      Mientras tanto el detalle por local está en ops.
    </p>
  </div>
</div>`;
}

/**
 * Núcleo: junta, decide si la muestra alcanza, y manda el correo que
 * corresponda. Devuelve el resumen para el log y para el callable manual.
 */
async function generarYEnviar({ desde, hasta, dias, forzar = false }) {
  // La ventana puede cruzar de mes, así que se suman todos los meses tocados.
  const meses = [...new Set([desde.slice(0, 7), hasta.slice(0, 7)])];
  const filas = await recolectar(meses);
  const rec   = recomendar(filas, dias);
  const activos = filas.filter(f => f.conversaciones > 0).length;

  const alcanza = rec.totalConv >= MIN_CONVERSACIONES && activos >= MIN_LOCALES;
  if (!alcanza && !forzar) {
    const nuevoPlazo = new Date(Date.now() + DIAS_PRORROGA * 86400e3).toISOString().slice(0, 10);
    await enviarEmail({
      from: MAIL_FROM,
      to:   [MAIL_PARA],
      subject: `⏳ Medidor del agente · solo ${rec.totalConv} conversaciones en ${dias} días — espero al ${nuevoPlazo}`,
      html: htmlInsuficiente({ rec, activos, dias, nuevoPlazo }),
    }, { grupo: 'interno', etiqueta: 'informe-medidor-insuficiente' });
    logger.warn(`[informe-medidor] muestra insuficiente: ${rec.totalConv} conv / ${activos} locales → prórroga al ${nuevoPlazo}`);
    return { suficiente: false, nuevoPlazo, totalConv: rec.totalConv, activos };
  }

  await enviarEmail({
    from: MAIL_FROM,
    to:   [MAIL_PARA],
    subject: `📊 Medidor del agente · ${rec.totalConv} conversaciones en ${dias} días — planes sugeridos`,
    html: html({ filas, rec, desde, hasta, dias }),
  }, { grupo: 'interno', etiqueta: 'informe-medidor-agente' });

  logger.info(`[informe-medidor] enviado: ${rec.totalConv} conv · ${filas.length} locales · ${usd(rec.costoConvUsd)}/conv`);
  return { suficiente: true, filas: filas.length, ...rec };
}

/** Lee (y siembra) el estado del temporizador. */
async function estado() {
  const snap = await ESTADO_REF().get();
  const d = (snap.data() || {}).medidorAgente || {};
  return {
    desde:     d.desde   || '2026-08-03',
    hasta:     d.hasta   || PLAZO_POR_DEFECTO,
    enviado:   d.enviado === true,
    prorrogas: Number(d.prorrogas) || 0,
  };
}

exports.informeMedidorAgente = onSchedule({
  schedule: '0 10 * * *',
  timeZone: 'America/Santiago',
  region:   'us-central1',
  secrets:  MAIL_SECRETS,
  timeoutSeconds: 300,
}, async () => {
  try {
    const { desde, hasta, enviado, prorrogas } = await estado();
    if (enviado) return;
    const hoy = hoyCL();
    if (hoy < hasta) {
      logger.info(`[informe-medidor] faltan días (hoy ${hoy}, plazo ${hasta})`);
      return;
    }
    const dias = Math.max(1, Math.round((new Date(hoy + 'T12:00:00') - new Date(desde + 'T12:00:00')) / 86400e3));
    // Agotadas las prórrogas se manda lo que haya, con su advertencia: es peor
    // que el informe no llegue nunca a que llegue con una muestra chica.
    const r = await generarYEnviar({ desde, hasta: hoy, dias, forzar: prorrogas >= MAX_PRORROGAS });

    // Se escribe DESPUÉS de enviar: si el correo falla, mañana se reintenta.
    await ESTADO_REF().set({
      medidorAgente: r.suficiente
        ? { desde, hasta: hoy, prorrogas, enviado: true, enviadoEn: FieldValue.serverTimestamp() }
        : { desde, hasta: r.nuevoPlazo, prorrogas: prorrogas + 1, enviado: false },
    }, { merge: true });
  } catch (e) {
    logger.error('[informe-medidor] cron:', e.message);
  }
});

/** Adelantar el informe a mano (para verlo antes del plazo). No marca enviado. */
exports.informeMedidorAgenteAhora = onCall({
  region: 'us-central1', cors: true, secrets: MAIL_SECRETS, timeoutSeconds: 300,
}, async (req) => {
  const email = String(req.auth?.token?.email || '').toLowerCase();
  if (email !== MAIL_PARA) throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  const { desde } = await estado();
  const hoy = hoyCL();
  const dias = Math.max(1, Math.round((new Date(hoy + 'T12:00:00') - new Date(desde + 'T12:00:00')) / 86400e3));
  // `forzar`: si lo pides a mano es porque quieres verlo igual, con la muestra
  // que haya. No mueve el plazo ni marca el informe como enviado.
  return generarYEnviar({ desde, hasta: hoy, dias, forzar: req.data?.forzar === true });
});

module.exports._generarYEnviar = generarYEnviar;
module.exports._recomendar = recomendar;
module.exports._recolectar = recolectar;
