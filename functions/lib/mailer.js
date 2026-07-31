'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  lib/mailer.js
//  Canal único de email transaccional. CUATRO canales que conviven:
//
//    brevo_sy     Brevo · cuenta SynaptechSpa   300/día
//    brevo_bioo   Brevo · cuenta bioo           300/día
//    resend_sy    Resend · cuenta SynapTech     100/día
//    resend_bioo  Resend · cuenta bioo          100/día
//
//  Un canal = una CUENTA, no un proveedor. La cuota es por cuenta: agregar un
//  dominio a una cuenta existente no suma ni un correo, abrir otra cuenta sí.
//  El mismo dominio puede vivir en dos cuentas Brevo (el CNAME de DKIM apunta
//  al mismo destino y los dos `brevo-code` conviven en la raíz), y por eso los
//  600 de Brevo sirven todos para las citas de barbería.
//
//  ── Cómo se usa ────────────────────────────────────────────────────────────
//    const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');
//
//    exports.miFuncion = onSchedule({ secrets: [...MAIL_SECRETS] }, async () => {
//      await enviarEmail({ from, to, subject, html },
//                        { grupo: 'citas', etiqueta: 'confirmacion-cita' });
//    });
//
//  El payload es SIEMPRE el formato de Resend ({ from, to, subject, html }).
//  Este módulo lo traduce al de Brevo cuando el canal elegido es Brevo. Los ~15
//  sitios que mandan correo no saben ni les importa por dónde salió.
//
//  ── Grupos ────────────────────────────────────────────────────────────────
//    citas    → lo que ve el CLIENTE de la barbería. 600/día entre las dos
//               cuentas Brevo, con Resend de red.
//    interno  → correo al dueño o a nosotros. Va por Resend, que es la cuota
//               chica y alcanza de sobra para el goteo interno.
//    bioo     → reservas y avisos de bioo.cl.
//
//  ── Qué canal puede mandar desde qué dominio ──────────────────────────────
//  Cada canal declara los dominios que tiene AUTENTICADOS en su cuenta. Un
//  canal que no tenga autenticado el dominio del remitente se descarta antes de
//  intentarlo: no es una optimización, es correctitud. Brevo acepta el envío
//  con 201 aunque el dominio no esté autenticado y después lo marca `error`
//  en silencio — el correo no llega y nadie se entera.
// ─────────────────────────────────────────────────────────────────────────────

const { defineSecret } = require('firebase-functions/params');
const { logger }       = require('firebase-functions');

const RESEND_API_KEY       = defineSecret('RESEND_API_KEY');
const BREVO_API_KEY        = defineSecret('BREVO_API_KEY');
const BREVO_BIOO_API_KEY   = defineSecret('BREVO_BIOO_API_KEY');
const RESEND_BIOO_API_KEY  = defineSecret('RESEND_BIOO_API_KEY');

// Spread en el `secrets:` de cada función: secrets: [...MAIL_SECRETS]
const MAIL_SECRETS = [RESEND_API_KEY, BREVO_API_KEY, BREVO_BIOO_API_KEY, RESEND_BIOO_API_KEY];

const TZ = 'America/Santiago';

// ── Los canales ──────────────────────────────────────────────────────────────
// Fuente única: el dashboard de ops lee las cuotas DE ACÁ para dibujar las
// barras. Si se contrata un plan pago se cambia este objeto y el panel se
// actualiza solo — no hay una segunda copia que se pueda desincronizar.
const CANALES = {
  brevo_sy: {
    etiqueta: 'Brevo · SynapTech', proveedor: 'brevo', param: BREVO_API_KEY,
    diaria: 300, mensual: 9000, plan: 'free', dominios: ['synaptechspa.cl'],
  },
  brevo_bioo: {
    etiqueta: 'Brevo · bioo', proveedor: 'brevo', param: BREVO_BIOO_API_KEY,
    diaria: 300, mensual: 9000, plan: 'free', dominios: ['bioo.cl', 'synaptechspa.cl'],
  },
  resend_sy: {
    etiqueta: 'Resend · SynapTech', proveedor: 'resend', param: RESEND_API_KEY,
    diaria: 100, mensual: 3000, plan: 'free', dominios: ['synaptechspa.cl'],
  },
  resend_bioo: {
    etiqueta: 'Resend · bioo', proveedor: 'resend', param: RESEND_BIOO_API_KEY,
    diaria: 100, mensual: 3000, plan: 'free', dominios: ['bioo.cl'],
  },
};

// Cada nivel es un escalón de preferencia; dentro de un nivel se sortea, para
// que los dos Brevo se repartan la carga en vez de llenar uno y desbordar al
// otro. Un contador en memoria no serviría: cada instancia empezaría en cero.
const GRUPOS = {
  citas:   [['brevo_sy', 'brevo_bioo'], ['resend_sy']],
  interno: [['resend_sy'], ['brevo_sy', 'brevo_bioo']],
  bioo:    [['resend_bioo'], ['brevo_bioo']],
};
const GRUPO_POR_DEFECTO = 'interno';

const COL_USO = '_mailUsage';

// ── Estado en memoria: canal fuera de servicio hoy ───────────────────────────
// Cuando un canal responde "sin cuota" o rechaza la auth lo marcamos para el
// resto de la vida de esta instancia y dejamos de gastarle una request a cada
// envío. Es solo una optimización: si la instancia se recicla, se reintenta.
const _fueraDeServicio = {};

function hoyCL() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
}

function estaFuera(canal) {
  return _fueraDeServicio[canal] === hoyCL();
}

function marcarFuera(canal, motivo) {
  _fueraDeServicio[canal] = hoyCL();
  logger.warn(`[mailer] ${canal} fuera de servicio (${motivo}) — el resto del día va por los otros canales`);
}

// ── Normalización del payload ────────────────────────────────────────────────

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

/** Dominio del remitente, en minúsculas. '' si el from viene roto. */
function dominioDe(from) {
  const email = parseFrom(from).email;
  const i = email.lastIndexOf('@');
  return i === -1 ? '' : email.slice(i + 1).toLowerCase();
}

/** ¿Este canal tiene autenticado el dominio del remitente?
 *  Acepta subdominios: mail.bioo.cl entra por bioo.cl. */
function puedeMandarDesde(canal, dominio) {
  if (!dominio) return false;
  return CANALES[canal].dominios.some(d => dominio === d || dominio.endsWith('.' + d));
}

// ── Proveedor: Resend ────────────────────────────────────────────────────────

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

// ── Proveedor: Brevo ─────────────────────────────────────────────────────────

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
    // 402 not_enough_credits = se acabaron los 300 del día de esa cuenta.
    const sinCuota = res.status === 402 || /not_enough_credits/i.test(txt);
    // 401 = key inválida O la IP de salida no está en "Authorised IPs" de esa
    // cuenta (las Cloud Functions salen por IPs dinámicas de Google). Es falla
    // del CANAL, no del mensaje: hay que ir al siguiente, no descartar el mail.
    // Destinatario en la blocklist: tampoco es un mail inválido — en otra
    // cuenta ese cliente sigue siendo alcanzable, y una confirmación de cita no
    // se puede perder porque alguien apretó "darse de baja" una vez.
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

const ENVIAR = { resend: enviarPorResend, brevo: enviarPorBrevo };

// ── Claves ───────────────────────────────────────────────────────────────────
// .value() lanza si el secret no está enlazado a esta función. Preferimos
// tratarlo como "canal no disponible" antes que tumbar el envío entero.
// Un secret con placeholder (una cuenta que todavía no existe) cuenta como
// ausente: así el canal queda cableado y se enciende solo cuando llega la key.
const PREFIJO = { resend: 're_', brevo: 'xkeysib-' };

function claveDe(canal) {
  const c = CANALES[canal];
  let v = '';
  try { v = (c.param.value() || '').trim(); } catch (_) { return ''; }
  return v.startsWith(PREFIJO[c.proveedor]) ? v : '';
}

// ── API pública ──────────────────────────────────────────────────────────────

/** Orden en que se van a intentar los canales, ya filtrado. */
function colaDeCanales(grupo, dominio) {
  const niveles = GRUPOS[grupo] || GRUPOS[GRUPO_POR_DEFECTO];
  const orden = [];
  for (const nivel of niveles) {
    // Sorteo dentro del nivel: reparte entre canales de igual preferencia.
    const mezclado = nivel.slice();
    for (let i = mezclado.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mezclado[i], mezclado[j]] = [mezclado[j], mezclado[i]];
    }
    orden.push(...mezclado);
  }
  const usables = orden.filter(c => claveDe(c) && puedeMandarDesde(c, dominio));
  // Los caídos al final, por si se resolvió mientras tanto.
  return [...usables.filter(c => !estaFuera(c)), ...usables.filter(c => estaFuera(c))];
}

// ── Contador de uso diario (best-effort, nunca bloquea el envío) ─────────────
// Colección propia para no ensuciar /_system (ahí viven los kill switch por
// tenant). Un doc por día: _mailUsage/{YYYY-MM-DD} → { brevo_sy, brevo_bioo,
// resend_sy, resend_bioo, fallidos }.
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

/**
 * Manda un email por el canal que corresponda, con failover automático.
 *
 * @param {{from:string, to:string|string[], subject:string, html:string,
 *          text?:string, reply_to?:string}} payload  Formato Resend.
 * @param {{grupo?:'citas'|'interno'|'bioo', etiqueta?:string, silencioso?:boolean}} [opts]
 *        grupo      — qué escalera de canales usar (ver GRUPOS).
 *        etiqueta   — nombre corto para los logs (ej. 'confirmacion-cita').
 *        silencioso — true = no lanza si fallan todos, devuelve { ok:false }.
 * @returns {Promise<{ok:boolean, canal:string|null, id:string|null, error?:string}>}
 */
async function enviarEmail(payload, opts = {}) {
  const etiqueta = opts.etiqueta || 'mail';
  const grupo    = (process.env.MAIL_GRUPO_FORZADO || opts.grupo || GRUPO_POR_DEFECTO).toLowerCase();
  const dominio  = dominioDe(payload.from);

  const cola = colaDeCanales(grupo, dominio);

  if (!cola.length) {
    // Distinguir las dos causas: sin key es configuración, dominio no
    // autenticado es un remitente que nadie dio de alta. Se depuran distinto.
    const conKey = Object.keys(CANALES).filter(c => claveDe(c));
    const msg = conKey.length
      ? `ningún canal del grupo '${grupo}' tiene autenticado el dominio '${dominio}'`
      : 'ningún canal de email tiene API key configurada';
    logger.error(`[mailer:${etiqueta}] ${msg}`);
    contar('fallidos');
    if (opts.silencioso) return { ok: false, canal: null, id: null, error: msg };
    throw new Error(msg);
  }

  const errores = [];
  for (const canal of cola) {
    const c = CANALES[canal];
    try {
      const r = await ENVIAR[c.proveedor](claveDe(canal), payload);
      if (canal !== cola[0]) {
        logger.info(`[mailer:${etiqueta}] enviado por ${canal} (failover desde ${cola[0]})`);
      }
      contar(canal);
      return { ok: true, canal, id: r.id };
    } catch (e) {
      if (e.sinCuota)    marcarFuera(canal, 'sin cuota diaria');
      if (e.authFallida) marcarFuera(canal, 'auth rechazada (key inválida o IP no autorizada)');
      errores.push(`${canal}: ${e.message}`);
      // Un 4xx de validación (email inválido, HTML roto) va a fallar igual en
      // los otros canales: no gastamos cuota reintentando.
      if (!e.transitorio && !e.sinCuota) break;
    }
  }

  const msg = errores.join(' | ');
  logger.error(`[mailer:${etiqueta}] falló en todos los canales — ${msg}`);
  contar('fallidos');
  if (opts.silencioso) return { ok: false, canal: null, id: null, error: msg };
  throw new Error(msg);
}

module.exports = {
  enviarEmail,
  MAIL_SECRETS,
  RESEND_API_KEY,
  BREVO_API_KEY,
  BREVO_BIOO_API_KEY,
  RESEND_BIOO_API_KEY,
  // Los consume el dashboard de ops (ops-metrics.js). Se exportan desde acá
  // para que la fecha del contador y las cuotas tengan UNA sola definición.
  CANALES,
  GRUPOS,
  COL_USO,
  diaMail: hoyCL,
  TZ_MAIL: TZ,
  // exportados para tests
  _internos: { parseFrom, normalizarDestinatarios, dominioDe, puedeMandarDesde, colaDeCanales },
};
