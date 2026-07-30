'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  lib/mailer.js
//  Canal único de email transaccional del sistema. Dos proveedores que CONVIVEN:
//
//    · Resend  (api.resend.com)   → plan free: 100 emails/día
//    · Brevo   (api.brevo.com)    → plan free: 300 emails/día
//
//  Capacidad combinada: 400/día. No se reemplaza uno por otro — cada envío
//  elige un proveedor primario y, si ese falla o se quedó sin cuota, cae
//  automáticamente al otro (failover en ambas direcciones).
//
//  ── Cómo se usa ────────────────────────────────────────────────────────────
//    const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');
//
//    exports.miFuncion = onSchedule({ secrets: [...MAIL_SECRETS] }, async () => {
//      await enviarEmail({ from, to, subject, html }, { primario: 'brevo' });
//    });
//
//  El payload es SIEMPRE el formato de Resend ({ from, to, subject, html }).
//  Este módulo lo traduce al formato de Brevo cuando toca. Los ~14 sitios que
//  mandan correo no saben ni les importa qué proveedor se usó.
//
//  ── Reparto por defecto ────────────────────────────────────────────────────
//    primario: 'brevo'  → correo al CLIENTE final (confirmaciones, recordatorios,
//                         recuperar contraseña). Es el volumen alto, así que va
//                         al balde grande (300/día).
//    primario: 'resend' → correo INTERNO / al dueño del local (avisos de cobro,
//                         leads, ops, salud, acceso al panel). Volumen bajo, le
//                         sobra con los 100/día.
//
//  Se puede forzar globalmente con la env var MAIL_PRIMARIO=resend|brevo.
//
//  Requiere los secrets RESEND_API_KEY y BREVO_API_KEY. Si BREVO_API_KEY está
//  vacío el módulo sigue funcionando solo con Resend (degradación limpia).
// ─────────────────────────────────────────────────────────────────────────────

const { defineSecret } = require('firebase-functions/params');
const { logger }       = require('firebase-functions');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const BREVO_API_KEY  = defineSecret('BREVO_API_KEY');

// Spread en el `secrets:` de cada función: secrets: [...MAIL_SECRETS]
const MAIL_SECRETS = [RESEND_API_KEY, BREVO_API_KEY];

const TZ = 'America/Santiago';

// ── Cuotas de los planes contratados ─────────────────────────────────────────
// Fuente única: el panel de ops las lee DE ACÁ para dibujar las barras. Si
// alguna vez se contrata un plan pago, se cambia este objeto y el dashboard se
// actualiza solo — no hay una segunda copia que se pueda desincronizar.
const CUOTAS = {
  resend: { plan: 'free', diaria: 100, mensual: 3000 },
  brevo:  { plan: 'free', diaria: 300, mensual: 9000 }, // 300/día, sin tope mensual propio
};

// Colección del contador diario. La comparte el dashboard de ops.
const COL_USO = '_mailUsage';

// ── Estado en memoria: proveedor agotado hoy ──────────────────────────────────
// Cuando un proveedor responde "sin cuota diaria" lo marcamos para el resto de
// la vida de esta instancia y dejamos de gastarle una request a cada envío.
// Es solo una optimización: si la instancia se recicla, se reintenta y se vuelve
// a marcar. No hay estado compartido que mantener.
const _fueraDeServicio = { resend: null, brevo: null };

function hoyCL() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
}

function estaFuera(prov) {
  return _fueraDeServicio[prov] === hoyCL();
}

function marcarFuera(prov, motivo) {
  _fueraDeServicio[prov] = hoyCL();
  logger.warn(`[mailer] ${prov} fuera de servicio (${motivo}) — el resto del día va por el otro canal`);
}

// ── Normalización del payload ─────────────────────────────────────────────────

/** 'Elegance Barbershop <citas@synaptechspa.cl>' → { nombre, email } */
function parseFrom(from) {
  const s = String(from || '').trim();
  const m = s.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { nombre: m[1].replace(/^"|"$/g, '').trim(), email: m[2].trim() };
  return { nombre: '', email: s };
}

/** Acepta string, array de strings, o array de {email} → ['a@b.cl', ...] */
function normalizarDestinatarios(to) {
  const arr = Array.isArray(to) ? to : [to];
  return arr
    .map(d => (d && typeof d === 'object' ? d.email : d))
    .map(d => String(d || '').trim())
    .filter(Boolean);
}

// ── Proveedor: Resend ─────────────────────────────────────────────────────────

async function enviarPorResend(apiKey, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const txt = JSON.stringify(body);
    // Resend usa 429 tanto para "cuota diaria agotada" como para el rate limit
    // de 2 req/s. Solo la primera es motivo para dejar de intentar hoy.
    const sinCuota = res.status === 429 && /quota|limit.*day|daily/i.test(txt);
    const err = new Error(`Resend ${res.status}: ${txt}`);
    err.sinCuota    = sinCuota;
    err.authFallida = res.status === 401 || res.status === 403;
    err.transitorio = err.authFallida || res.status === 429 || res.status >= 500;
    throw err;
  }
  return { id: body.id || null };
}

// ── Proveedor: Brevo ──────────────────────────────────────────────────────────

async function enviarPorBrevo(apiKey, payload) {
  const remitente = parseFrom(payload.from);
  const cuerpo = {
    sender:      remitente.nombre ? { name: remitente.nombre, email: remitente.email }
                                  : { email: remitente.email },
    to:          normalizarDestinatarios(payload.to).map(email => ({ email })),
    subject:     payload.subject,
    htmlContent: payload.html,
  };
  if (payload.text)     cuerpo.textContent = payload.text;
  if (payload.reply_to) cuerpo.replyTo     = { email: parseFrom(payload.reply_to).email };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body:    JSON.stringify(cuerpo),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const txt = JSON.stringify(body);
    // 402 not_enough_credits = se acabaron los 300 del día.
    const sinCuota = res.status === 402 || /not_enough_credits/i.test(txt);
    // 401 = key inválida O la IP de salida no está en "Authorised IPs" de Brevo
    // (las Cloud Functions salen por IPs dinámicas de Google). Es una falla del
    // PROVEEDOR, no del mensaje: hay que caer al otro canal, no descartar el mail.
    // Destinatario en la blocklist de Brevo (se dio de baja alguna vez). NO es
    // un mail inválido: en Resend ese mismo cliente sigue siendo alcanzable, y
    // una confirmación de cita no se puede perder porque alguien apretó
    // "darse de baja". Se trata como caída del canal para que haga failover.
    const bloqueado = /blocked|blacklist|unsubscrib|not_?allowed/i.test(txt);

    const err = new Error(`Brevo ${res.status}: ${txt}`);
    err.sinCuota    = sinCuota;
    err.authFallida = res.status === 401 || res.status === 403;
    err.transitorio = sinCuota || err.authFallida || bloqueado ||
                      res.status === 429 || res.status >= 500;
    throw err;
  }
  return { id: body.messageId || null };
}

// ── Contador de uso diario (best-effort, nunca bloquea el envío) ──────────────
// Colección propia para no ensuciar /_system (ahí viven los kill switch por
// tenant). Un doc por día: _mailUsage/{YYYY-MM-DD} → { resend, brevo, fallidos }.
async function contar(campo) {
  if (process.env.MAILER_SIN_TELEMETRIA === '1') return; // tests hermeticos
  try {
    const admin = require('firebase-admin');
    const { FieldValue } = require('firebase-admin/firestore');
    await admin.firestore().doc(`${COL_USO}/${hoyCL()}`).set(
      { [campo]: FieldValue.increment(1), actualizado: FieldValue.serverTimestamp() },
      { merge: true },
    );
  } catch (_) { /* la telemetría jamás rompe un envío */ }
}

// ── API pública ───────────────────────────────────────────────────────────────

const PROVEEDORES = {
  resend: { enviar: enviarPorResend, key: () => leerSecret(RESEND_API_KEY) },
  brevo:  { enviar: enviarPorBrevo,  key: () => leerSecret(BREVO_API_KEY)  },
};

// .value() lanza si el secret no está enlazado a esta función. Preferimos
// tratarlo como "proveedor no disponible" antes que tumbar el envío entero.
function leerSecret(param) {
  try { return (param.value() || '').trim(); } catch (_) { return ''; }
}

/**
 * Manda un email por el canal que corresponda, con failover automático.
 *
 * @param {{from:string, to:string|string[], subject:string, html:string,
 *          text?:string, reply_to?:string}} payload  Formato Resend.
 * @param {{primario?:'resend'|'brevo', etiqueta?:string, silencioso?:boolean}} [opts]
 *        primario   — proveedor preferido; el otro queda de respaldo.
 *        etiqueta   — nombre corto para los logs (ej. 'confirmacion-cita').
 *        silencioso — true = no lanza si fallan los dos, devuelve { ok:false }.
 * @returns {Promise<{ok:boolean, proveedor:string|null, id:string|null, error?:string}>}
 */
async function enviarEmail(payload, opts = {}) {
  const etiqueta = opts.etiqueta || 'mail';
  const preferido = (process.env.MAIL_PRIMARIO || opts.primario || 'resend').toLowerCase();
  const orden = preferido === 'brevo' ? ['brevo', 'resend'] : ['resend', 'brevo'];

  // Los que tienen key y siguen en pie van primero; los que ya sabemos caídos
  // hoy quedan al final como último recurso (por si se resolvió mientras tanto).
  const disponibles = orden.filter(p => PROVEEDORES[p].key());
  if (!disponibles.length) {
    const msg = 'ningún proveedor de email tiene API key configurada';
    logger.error(`[mailer:${etiqueta}] ${msg}`);
    if (opts.silencioso) return { ok: false, proveedor: null, id: null, error: msg };
    throw new Error(msg);
  }
  const cola = [
    ...disponibles.filter(p => !estaFuera(p)),
    ...disponibles.filter(p =>  estaFuera(p)),
  ];

  const errores = [];
  for (const prov of cola) {
    try {
      const r = await PROVEEDORES[prov].enviar(PROVEEDORES[prov].key(), payload);
      if (prov !== cola[0]) {
        logger.info(`[mailer:${etiqueta}] enviado por ${prov} (failover desde ${cola[0]})`);
      }
      contar(prov);
      return { ok: true, proveedor: prov, id: r.id };
    } catch (e) {
      if (e.sinCuota)    marcarFuera(prov, 'sin cuota diaria');
      if (e.authFallida) marcarFuera(prov, 'auth rechazada (key inválida o IP no autorizada)');
      errores.push(`${prov}: ${e.message}`);
      // Un 4xx de validación (email inválido, HTML roto) va a fallar igual en el
      // otro proveedor: no gastamos cuota reintentando.
      if (!e.transitorio && !e.sinCuota) break;
    }
  }

  const msg = errores.join(' | ');
  logger.error(`[mailer:${etiqueta}] falló en todos los canales — ${msg}`);
  contar('fallidos');
  if (opts.silencioso) return { ok: false, proveedor: null, id: null, error: msg };
  throw new Error(msg);
}

module.exports = {
  enviarEmail,
  MAIL_SECRETS,
  RESEND_API_KEY,
  BREVO_API_KEY,
  // Los consume el dashboard de ops (ops-metrics.js). Se exportan desde acá
  // para que la fecha del contador y las cuotas tengan UNA sola definición:
  // ops calcula sus otros rangos en UTC, y con el corte en Santiago las cuentas
  // no cuadraban de noche.
  CUOTAS,
  COL_USO,
  diaMail: hoyCL,
  TZ_MAIL: TZ,
  // exportados para tests
  _internos: { parseFrom, normalizarDestinatarios },
};
