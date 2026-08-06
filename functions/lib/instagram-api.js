'use strict';

// functions/lib/instagram-api.js
// ─────────────────────────────────────────────────────────────────────────────
//  Cliente de la Instagram API with Instagram Login.
//
//  Es la API nueva (la Basic Display murió en dic-2024). Todo cuelga de
//  graph.instagram.com y del token de la propia cuenta profesional: NO hace
//  falta una página de Facebook de por medio, que era el requisito viejo.
//
//  Lo que cubre, en el orden en que se usa:
//    · perfil e insights   → métricas para el panel de ops
//    · mensajes directos   → el cerebro de ventas contesta los DM
//    · comentarios         → responder en público y saltar al privado
//    · publicación         → subir foto/carrusel/reel desde el panel
//
//  Dos cosas que la API impone y que hay que respetar sí o sí:
//    1. Ventana de 24 h: solo se puede escribirle libremente a alguien dentro
//       de las 24 h desde SU último mensaje. Después Meta rechaza el envío.
//    2. Publicar es en dos pasos (crear contenedor → publicarlo), y el
//       contenedor de video tarda en procesarse: hay que sondearlo.
// ─────────────────────────────────────────────────────────────────────────────

const { logger } = require('firebase-functions');

const GRAPH = 'https://graph.instagram.com/v21.0';

/** Ventana de mensajería estándar de Meta. Fuera de ella, el envío falla. */
const VENTANA_MS = 24 * 60 * 60 * 1000;

async function llamar(metodo, path, { token, params, body } = {}) {
  const url = new URL(`${GRAPH}/${path}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  url.searchParams.set('access_token', token);

  const opts = { method: metodo };
  if (body) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  const res  = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const e = data.error || {};
    const err = new Error(`IG ${path}: ${e.message || res.status}`);
    err.codigo   = e.code;
    err.subcodigo = e.error_subcode;
    // 190 = token vencido o revocado. Lo distinguimos porque exige que el
    // dueño vuelva a autorizar; no se arregla reintentando.
    err.esAuth   = e.code === 190 || e.type === 'OAuthException';
    // 10 / 551 aparecen cuando se escribe fuera de la ventana de 24 h.
    err.fueraDeVentana = e.code === 10 || e.code === 551;
    throw err;
  }
  return data;
}

/* ─────────────────────────── Perfil y métricas ─────────────────────────── */

/** Datos de la cuenta. `followers_count` solo viene en cuentas profesionales. */
async function perfil(token) {
  return llamar('GET', 'me', {
    token,
    params: { fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography' },
  });
}

/**
 * Métricas de la cuenta.
 *
 * Se piden en dos tandas porque Meta las separa por tipo: las de serie
 * temporal aceptan `period=day`, y las de valor total exigen
 * `metric_type=total_value` — mezclarlas en una sola llamada devuelve error.
 * Cada tanda falla por su cuenta: mejor media tarjeta que ninguna.
 */
async function insights(token, igUserId, dias = 7) {
  const since = Math.floor((Date.now() - dias * 86400e3) / 1000);
  const until = Math.floor(Date.now() / 1000);

  const serie = await llamar('GET', `${igUserId}/insights`, {
    token, params: { metric: 'reach', period: 'day', since, until },
  }).catch((e) => { logger.warn('[ig-api] insights serie:', e.message); return null; });

  const totales = await llamar('GET', `${igUserId}/insights`, {
    token,
    params: {
      metric: 'accounts_engaged,total_interactions,profile_views',
      metric_type: 'total_value', period: 'day', since, until,
    },
  }).catch((e) => { logger.warn('[ig-api] insights totales:', e.message); return null; });

  const valores = {};
  for (const m of (totales?.data || [])) valores[m.name] = m.total_value?.value ?? null;

  const alcanceSerie = (serie?.data || []).find((m) => m.name === 'reach')?.values || [];
  return {
    alcance: alcanceSerie.reduce((a, v) => a + (Number(v.value) || 0), 0),
    alcanceSerie: alcanceSerie.map((v) => ({ fecha: String(v.end_time || '').slice(0, 10), valor: Number(v.value) || 0 })),
    cuentasAlcanzadas: valores.accounts_engaged ?? null,
    interacciones:     valores.total_interactions ?? null,
    visitasAlPerfil:   valores.profile_views ?? null,
  };
}

/* ─────────────────────────── Mensajes directos ─────────────────────────── */

/** Envía un DM. `destinatarioId` es el IGSID de la persona, no su @usuario. */
async function enviarDM(token, igUserId, destinatarioId, texto) {
  return llamar('POST', `${igUserId}/messages`, {
    token,
    body: { recipient: { id: String(destinatarioId) }, message: { text: String(texto).slice(0, 990) } },
  });
}

/**
 * Respuesta privada a un comentario: abre un DM con quien comentó.
 * Solo se puede UNA vez por comentario y dentro de los 7 días — es la vía
 * legítima del clásico "comenta AGENDA y te escribo por privado".
 */
async function responderComentarioEnPrivado(token, igUserId, commentId, texto) {
  return llamar('POST', `${igUserId}/messages`, {
    token,
    body: { recipient: { comment_id: String(commentId) }, message: { text: String(texto).slice(0, 990) } },
  });
}

function dentroDeVentana(ultimoMensajeMs) {
  return !!ultimoMensajeMs && (Date.now() - ultimoMensajeMs) < VENTANA_MS;
}

/**
 * Quién es el que escribe. El webhook solo trae el IGSID (un número opaco);
 * el @usuario hay que pedirlo. Es lo que permite distinguir a un cliente que
 * viene a pedir soporte de un desconocido que viene a preguntar precios.
 * `is_user_follow_business` de yapa: quien ya te sigue rara vez es un lead frío.
 */
async function perfilDeUsuario(token, igsid) {
  return llamar('GET', String(igsid), {
    token, params: { fields: 'name,username,follower_count,is_user_follow_business' },
  });
}

/* ─────────────────────────────── Comentarios ─────────────────────────────── */

/** Responde el comentario EN PÚBLICO, colgando de ese mismo hilo. */
async function responderComentario(token, commentId, texto) {
  return llamar('POST', `${commentId}/replies`, {
    token, body: { message: String(texto).slice(0, 990) },
  });
}

async function ocultarComentario(token, commentId, oculto = true) {
  return llamar('POST', commentId, { token, params: { hide: oculto } });
}

/* ─────────────────────────────── Publicación ─────────────────────────────── */

/**
 * Publica en dos pasos, como exige la API: primero se crea un contenedor con
 * la media y luego se publica. El video no está listo al instante, así que se
 * sondea el contenedor hasta que Meta lo marca FINISHED.
 *
 * @param {'IMAGE'|'REELS'|'STORIES'|'CAROUSEL'} tipo
 * @param {string[]} urls  URLs públicas de la media (varias solo en CAROUSEL)
 */
async function publicar(token, igUserId, { tipo, urls, caption, ubicacion }) {
  const media = Array.isArray(urls) ? urls : [urls];
  if (!media.length) throw new Error('No hay media que publicar.');

  let contenedorId;

  if (tipo === 'CAROUSEL') {
    // Cada hijo se sube como contenedor suelto marcado `is_carousel_item`.
    const hijos = [];
    for (const url of media.slice(0, 10)) {
      const r = await llamar('POST', `${igUserId}/media`, {
        token, params: { image_url: url, is_carousel_item: true },
      });
      hijos.push(r.id);
    }
    const r = await llamar('POST', `${igUserId}/media`, {
      token, params: { media_type: 'CAROUSEL', children: hijos.join(','), caption },
    });
    contenedorId = r.id;
  } else {
    const params = { caption };
    if (tipo === 'IMAGE')  params.image_url = media[0];
    if (tipo === 'REELS')  { params.media_type = 'REELS';  params.video_url = media[0]; }
    if (tipo === 'STORIES') {
      params.media_type = 'STORIES';
      // Una historia puede ser foto o video; se decide por la extensión.
      if (/\.(mp4|mov)(\?|$)/i.test(media[0])) params.video_url = media[0];
      else params.image_url = media[0];
    }
    if (ubicacion) params.location_id = ubicacion;
    const r = await llamar('POST', `${igUserId}/media`, { token, params });
    contenedorId = r.id;
  }

  // El video puede tardar. 5 s entre intentos, hasta ~60 s: pasado eso es más
  // honesto devolver el error que dejar al panel colgado.
  for (let i = 0; i < 12; i++) {
    const st = await llamar('GET', contenedorId, { token, params: { fields: 'status_code,status' } })
      .catch(() => null);
    const code = st?.status_code;
    if (code === 'FINISHED') break;
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error(`Instagram rechazó la media (${code}): ${st?.status || 'sin detalle'}`);
    }
    if (i === 11) throw new Error('La media sigue procesándose tras 60 s. Intenta de nuevo en un rato.');
    await new Promise((r) => setTimeout(r, 5000));
  }

  const pub = await llamar('POST', `${igUserId}/media_publish`, {
    token, params: { creation_id: contenedorId },
  });
  return { id: pub.id, contenedorId };
}

/** Cuántas publicaciones quedan hoy (Meta permite 50 por cuenta cada 24 h). */
async function cupoPublicacion(token, igUserId) {
  const r = await llamar('GET', `${igUserId}/content_publishing_limit`, {
    token, params: { fields: 'config,quota_usage' },
  }).catch(() => null);
  const d = r?.data?.[0];
  return d ? { usado: d.quota_usage ?? 0, tope: d.config?.quota_total ?? 50 } : null;
}

module.exports = {
  llamar, perfil, insights,
  enviarDM, responderComentarioEnPrivado, dentroDeVentana, VENTANA_MS, perfilDeUsuario,
  responderComentario, ocultarComentario,
  publicar, cupoPublicacion,
};
