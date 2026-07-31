'use strict';

// functions/alerta-gasto-ia.js
// ─────────────────────────────────────────────────────────────────────────────
//  AVISO POR CORREO DEL GASTO DE CLAUDE POR LOCAL
//
//  Los topes viven en lib/ai-presupuesto.js y los aplica el cerebro antes de
//  llamar al modelo. Acá solo se avisa, y se avisa DOS veces:
//
//    · al 70% del tope  → "esto va rápido", con tiempo de reaccionar
//    · al 100%          → "el bot quedó en pausa", ya pasó
//
//  El corte no puede ser la primera noticia: un local que se queda sin
//  asistente sin aviso previo llama enojado, y con razón.
//
//  Trigger sobre el contador que lib/metrics.js ya escribe, no un cron: entre
//  que empieza un bucle y que se come el tope pueden pasar minutos, y un cron
//  cada media hora se entera cuando ya no sirve de nada.
//
//  ⚠️ El contador se escribe en CADA llamada al modelo, así que este trigger se
//  dispara muchísimo. Todo lo caro (leer config, componer, enviar) va DESPUÉS
//  del candado y del corte por umbral: el 99% de las ejecuciones tiene que
//  salir en la primera comparación.
//
//  DEPLOY: firebase deploy --only functions:alertaGastoIaDia,functions:alertaGastoIaMes
// ─────────────────────────────────────────────────────────────────────────────

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { FieldValue }        = require('firebase-admin/firestore');

const db = admin.firestore();
const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');
const { topesDe, AVISO_PCT }        = require('./lib/ai-presupuesto');

const MAIL_FROM       = 'SynapTech <avisos@synaptechspa.cl>';
const EMAIL_SYNAPTECH = 'ignaciiio.mate@gmail.com';

const usd = (n) => '$' + Number(n || 0).toFixed(2);

function html({ local, periodo, gasto, tope, pct, cortado }) {
  const acento = cortado ? '#dc2626' : '#d97706';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0b1220;color:#e2e8f0;border-radius:14px;overflow:hidden;border:1px solid #1e293b;">
    <div style="background:${acento};padding:18px 22px;">
      <p style="margin:0;font-size:17px;font-weight:bold;color:#fff;">
        ${cortado ? '🔴 Asistente IA en pausa' : '⚠️ Gasto de IA al ' + pct + '%'} · ${local}
      </p>
    </div>
    <div style="padding:22px;">
      <p style="margin:0 0 16px;font-size:14px;line-height:1.55;">
        ${cortado
          ? `El asistente de <b>${local}</b> alcanzó su tope ${periodo} y <b>dejó de responder</b>.`
          : `El asistente de <b>${local}</b> lleva gastado el <b>${pct}%</b> de su tope ${periodo}.`}
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
        <tr><td style="padding:6px 0;color:#94a3b8;">Gastado (${periodo})</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;">${usd(gasto)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Tope</td>
            <td style="padding:6px 0;text-align:right;">${usd(tope)}</td></tr>
      </table>
      <div style="background:#111c2f;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
        <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:bold;">Qué significa</p>
        <p style="margin:0;font-size:13px;line-height:1.55;color:#cbd5e1;">
          Una conversación normal cuesta cerca de US$0,012, así que ${usd(tope)} son unas
          ${Math.round(tope / 0.012)} conversaciones. Llegar al tope casi nunca es uso real:
          suele ser un bucle —dos bots hablándose, o alguien insistiendo sin parar—.
          ${cortado ? '<b>Las confirmaciones y recordatorios siguen saliendo normal:</b> esas no usan IA.' : ''}
        </p>
      </div>
      <div style="background:#111c2f;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
        <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;font-weight:bold;">Qué hacer</p>
        <p style="margin:0;font-size:13px;line-height:1.55;color:#cbd5e1;">
          Mira las conversaciones del local en ops. Si el consumo es legítimo, sube el tope
          desde <code>_system/{tenant}</code> (<code>aiTopeDiaUsd</code> / <code>aiTopeMesUsd</code>).
          Si es un bucle, corta esa conversación${cortado ? '' : ' antes de que se coma el tope'}.
        </p>
      </div>
      <a href="https://ops.synaptechspa.cl" style="display:inline-block;background:${acento};color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:bold;">Abrir ops</a>
    </div>
    <div style="padding:14px 22px;border-top:1px solid #1e293b;">
      <p style="margin:0;font-size:11px;color:#475569;">Aviso automático · un correo por umbral y por ${periodo}.</p>
    </div>
  </div>`;
}

/** Núcleo: decide si toca avisar y deja el candado puesto. */
async function revisar({ ref, antes, ahora, tid, periodo, campoAviso, campoCorte, tope }) {
  if (!tope) return;                                   // sin tope, nada que vigilar
  const gasto = Number(ahora.costUsd) || 0;
  const previo = Number(antes.costUsd) || 0;
  if (gasto <= previo) return;                          // no subió (o es el propio candado)

  const cruzo = (umbral, ya) => !ya && previo < umbral && gasto >= umbral;
  const corte = cruzo(tope, ahora[campoCorte] === true);
  const aviso = !corte && cruzo(tope * AVISO_PCT, ahora[campoAviso] === true || ahora[campoCorte] === true);
  if (!corte && !aviso) return;

  const td    = (await db.doc(`tenants/${tid}`).get()).data() || {};
  const local = td.nombre || td.nombreCorto || tid;

  await enviarEmail({
    from: MAIL_FROM,
    to:   [EMAIL_SYNAPTECH],
    subject: corte
      ? `🔴 Asistente IA en pausa · ${local} (tope ${periodo} ${usd(tope)})`
      : `⚠️ Gasto de IA al ${Math.round(AVISO_PCT * 100)}% · ${local} (${usd(gasto)} de ${usd(tope)} ${periodo})`,
    html: html({ local, periodo, gasto, tope, pct: Math.round((gasto / tope) * 100), cortado: corte }),
  }, { primario: 'resend', etiqueta: `gasto-ia-${periodo}-${corte ? 'corte' : 'aviso'}` });

  await ref.set({ [corte ? campoCorte : campoAviso]: true }, { merge: true }).catch(() => {});
  logger.warn(`[gasto-ia] ${tid} ${periodo}: ${usd(gasto)} de ${usd(tope)} → ${corte ? 'CORTE' : 'aviso'}`);
}

/** ¿Qué serie es este doc? Los dos formatos se distinguen por el largo de la
 *  fecha, así que se resuelven en la misma función: dos triggers sobre el mismo
 *  path serían dos invocaciones por cada escritura de métrica, y /_metrics se
 *  escribe en cada llamada al modelo y en cada WhatsApp enviado. */
function clasificar(id) {
  let m = /^ai_dia_(.+)_(\d{4}-\d{2}-\d{2})$/.exec(id);
  if (m) return { tid: m[1], periodo: 'diario', campo: 'dia' };
  m = /^ai_vendor_(.+)_(\d{4}-\d{2})$/.exec(id);
  if (m) return { tid: m[1], periodo: 'mensual', campo: 'mes' };
  return null;   // wa_, bot_, ai_ global… nada que vigilar acá
}

/* Los candados viven en el propio doc de la serie, y como el doc del día (y el
   del mes) nace nuevo cada período, se re-arman solos: no hay que limpiarlos en
   ninguna parte.

   Escribir el candado vuelve a disparar este trigger, pero esa segunda pasada
   no cambia `costUsd`, así que muere en la comparación `gasto <= previo`. */
exports.alertaGastoIa = onDocumentWritten(
  { document: '_metrics/{docId}', region: 'us-central1', secrets: [...MAIL_SECRETS] },
  async (event) => {
    const id   = event.params.docId;
    const info = clasificar(id);
    if (!info) return;
    const ahora = event.data?.after?.data();
    if (!ahora) return;

    try {
      const sys = (await db.doc(`_system/${info.tid}`).get()).data() || {};
      await revisar({
        ref:   db.doc(`_metrics/${id}`),
        antes: event.data?.before?.data() || {},
        ahora,
        tid:     info.tid,
        periodo: info.periodo,
        campoAviso: 'avisoGasto70',
        campoCorte: 'avisoGasto100',
        tope:    topesDe(sys)[info.campo],
      });
    } catch (e) { logger.error(`[gasto-ia] ${id}:`, e.message); }
  },
);

exports._revisar    = revisar;
exports._clasificar = clasificar;
