'use strict';

// functions/lib/meta-capi.js
// ─────────────────────────────────────────────────────────────────────────────
//  Conversions API de Meta — el evento que le enseña a la campaña a quién buscar.
//
//  Por qué existe (auditoría 05-08-2026): la cuenta gastó $124.548 optimizando
//  por "conversación de WhatsApp". Meta cumplió — trajo 59 conversaciones a
//  $1.646 c/u — pero ninguna terminó en cliente, porque "conversación" no es el
//  resultado que vale. El evento que importa es que el dueño CREE su agenda.
//  Sin este puente, el algoritmo no puede aprender qué perfil llega hasta ahí.
//
//  Server-side y no solo píxel de navegador: el alta se confirma en el backend
//  (recién ahí el tenant existe de verdad), no la bloquean los ad-blockers ni
//  la pérdida de cookies de Safari, y el `event_id` compartido con el píxel
//  deja que Meta deduplique los dos envíos del mismo hecho.
//
//  Config sin deploy en `_system/meta_ads`:
//    { pixelId: '<id>', capiActivo: true, testEventCode: 'TEST12345' }
//  Token en el secret META_CAPI_TOKEN (System User con `ads_management`; NO
//  sirve el META_ADS_TOKEN de solo lectura del analista).
//
//  Silencioso por diseño: si falta config, token o Meta responde error, se
//  loguea y se sigue. Un evento de marketing JAMÁS puede voltear un alta.
// ─────────────────────────────────────────────────────────────────────────────

const crypto     = require('crypto');
const { logger } = require('firebase-functions');
const admin      = require('firebase-admin');

const GRAPH = 'https://graph.facebook.com/v21.0';

/** Meta exige los datos personales hasheados en SHA-256 sobre el valor normalizado. */
function hash(valor) {
  const v = String(valor || '').trim().toLowerCase();
  if (!v) return null;
  return crypto.createHash('sha256').update(v).digest('hex');
}

/** Teléfono: solo dígitos, con código de país y sin el "+" (formato E.164 pelado). */
function hashTelefono(tel) {
  const solo = String(tel || '').replace(/\D/g, '');
  return solo.length >= 8 ? hash(solo) : null;
}

/**
 * Envía un evento de conversión a Meta.
 *
 * @param {object} p
 * @param {string} p.evento        nombre del evento (ej. 'StartTrial')
 * @param {string} [p.eventId]     mismo id que mandó el píxel → deduplicación
 * @param {string} [p.email]       email del dueño (se hashea)
 * @param {string} [p.telefono]    teléfono del dueño (se hashea)
 * @param {string} [p.nombre]      nombre de pila (se hashea)
 * @param {string} [p.ip]          IP del cliente
 * @param {string} [p.userAgent]   user-agent del navegador
 * @param {string} [p.fbp]         cookie _fbp del píxel
 * @param {string} [p.fbc]         cookie _fbc (deriva del fbclid del anuncio)
 * @param {string} [p.sourceUrl]   URL donde ocurrió
 * @param {object} [p.custom]      custom_data extra (value, currency, content_name…)
 * @returns {Promise<{ok:boolean, motivo?:string}>} nunca lanza
 */
async function enviarEventoCapi(p) {
  try {
    const cfg = (await admin.firestore().doc('_system/meta_ads').get()).data() || {};
    const pixelId = String(cfg.pixelId || '').trim();
    const token   = String(process.env.META_CAPI_TOKEN || '').trim();

    if (cfg.capiActivo === false) return { ok: false, motivo: 'capi-apagado' };
    if (!pixelId) return { ok: false, motivo: 'sin-pixelId' };
    if (!token)   return { ok: false, motivo: 'sin-token' };

    // Meta descarta el evento si no viene AL MENOS un dato de match.
    const userData = {
      em:           hash(p.email)        ? [hash(p.email)]        : undefined,
      ph:           hashTelefono(p.telefono) ? [hashTelefono(p.telefono)] : undefined,
      fn:           hash(p.nombre)       ? [hash(p.nombre)]       : undefined,
      country:      [hash('cl')],
      client_ip_address:  p.ip        || undefined,
      client_user_agent:  p.userAgent || undefined,
      fbp:          p.fbp || undefined,
      fbc:          p.fbc || undefined,
    };
    Object.keys(userData).forEach(k => userData[k] === undefined && delete userData[k]);
    if (!userData.em && !userData.ph && !userData.fbp && !userData.fbc) {
      return { ok: false, motivo: 'sin-datos-de-match' };
    }

    const evento = {
      event_name:       p.evento,
      event_time:       Math.floor(Date.now() / 1000),
      action_source:    'website',
      event_source_url: p.sourceUrl || undefined,
      ...(p.eventId ? { event_id: p.eventId } : {}),
      user_data:        userData,
      ...(p.custom ? { custom_data: p.custom } : {}),
    };

    const body = {
      data: [evento],
      ...(cfg.testEventCode ? { test_event_code: String(cfg.testEventCode) } : {}),
    };

    const res = await fetch(`${GRAPH}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.error) {
      logger.warn(`[capi] ${p.evento} rechazado: ${out.error?.message || res.status}`);
      return { ok: false, motivo: out.error?.message || `http-${res.status}` };
    }
    logger.info(`[capi] ${p.evento} enviado (recibidos=${out.events_received ?? '?'}${p.eventId ? `, id=${p.eventId}` : ''})`);
    return { ok: true };
  } catch (e) {
    logger.warn(`[capi] ${p?.evento || '?'} falló: ${e.message}`);
    return { ok: false, motivo: e.message };
  }
}

module.exports = { enviarEventoCapi, _hash: hash, _hashTelefono: hashTelefono };
