'use strict';

// functions/instagram-plataforma.js
// ─────────────────────────────────────────────────────────────────────────────
//  INSTAGRAM DE SYNAPTECH — @synaptechspa conectado de verdad, no solo leído.
//
//  Contexto (05-08-2026): ya había Instagram conectado, pero solo con permiso
//  `instagram_business_basic` y solo para importar fotos al lookbook de los 15
//  locales. La cuenta propia de SynapTech no estaba conectada a nada.
//
//  El agujero que esto cierra: la mayor parte del gasto en Meta Ads se fue en
//  Instagram feed ($50.671 de $124.548) y quien ve el anuncio y manda un DM al
//  perfil caía en el vacío — el mismo bug que ya se arregló en WhatsApp, pero
//  acá directamente no había nadie contestando.
//
//    · instagramPlataformaLink   onCall  → link de autorización con los 5 permisos
//    · instagramPlataformaEstado onCall  → qué está conectado y con qué permisos
//    · instagramWebhook          onRequest → DMs y comentarios entrantes
//    · instagramPublicar         onCall  → publicar foto/carrusel/reel/historia
//
//  Config sin deploy en `_system/instagram_plataforma`:
//    { botDM: true, autoComentarios: true, palabrasClave: ['agenda','precio'],
//      respuestaComentario: '...', activo: true }
//  Secrets: INSTAGRAM_APP_SECRET (ya existía) + IG_WEBHOOK_TOKEN (verificación).
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const crypto                            = require('crypto');
const { FieldValue, Timestamp }         = require('firebase-admin/firestore');

const ig                   = require('./lib/instagram-api');
const { esOperadorReq }    = require('./lib/operadores');

const db = admin.firestore();

const INSTAGRAM_APP_SECRET = defineSecret('INSTAGRAM_APP_SECRET');
const IG_WEBHOOK_TOKEN     = defineSecret('IG_WEBHOOK_TOKEN');
const EVOLUTION_API_URL    = defineSecret('EVOLUTION_API_URL');
const EVOLUTION_API_KEY    = defineSecret('EVOLUTION_API_KEY');
const ANTHROPIC_API_KEY    = defineSecret('ANTHROPIC_API_KEY');

// `synaptech` es la cuenta de la PLATAFORMA, no un local. Comparte la cañería
// de tokens con los tenants (mismo doc `_system/instagram_{id}`, mismo refresco)
// pero no sincroniza lookbook: SynapTech no tiene catálogo de cortes.
const CUENTA = 'synaptech';
const CFG_REF   = () => db.doc('_system/instagram_plataforma');
const CONEX_REF = () => db.doc(`_system/instagram_${CUENTA}`);

const CALLBACK_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/instagramOAuthCallback';

// Los 5 permisos de la Instagram API with Instagram Login. `basic` es el único
// que ya estaba en uso; los otros cuatro son los que habilitan DMs, comentarios,
// publicación y métricas. Para la cuenta propia funcionan en modo desarrollo;
// para cuentas de terceros (los locales) exigen App Review de Meta.
const PERMISOS = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
];

/* ───────────────────────────── Conexión ───────────────────────────── */

async function leerConexion() {
  const s = await CONEX_REF().get();
  if (!s.exists) return null;
  const c = s.data() || {};
  if (!c.accessToken) return null;
  return {
    token:    c.accessToken,
    igUserId: String(c.instagramUserId || ''),
    username: c.instagramUsername || '',
    venceEn:  c.tokenExpiresAt?.toDate?.() || null,
  };
}

async function leerCfg() {
  return (await CFG_REF().get()).data() || {};
}

/* ───────────────────────── Link de autorización ───────────────────────── */

exports.instagramPlataformaLink = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const appId = ((await db.doc('_system/instagram_app').get()).data() || {}).appId;
  if (!appId) throw new HttpsError('failed-precondition', 'Falta _system/instagram_app.appId');

  // El callback existente valida el `state` como `${cuenta}|${origenB64}`.
  const origen = String(req.data?.origen || 'https://ops.synaptechspa.cl');
  const b64 = Buffer.from(origen, 'utf-8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const p = new URLSearchParams({
    client_id:     appId,
    redirect_uri:  CALLBACK_URL,
    response_type: 'code',
    scope:         PERMISOS.join(','),
    state:         `${CUENTA}|${b64}`,
  });
  return { ok: true, url: `https://www.instagram.com/oauth/authorize?${p}`, permisos: PERMISOS };
});

exports.instagramPlataformaEstado = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const con = await leerConexion();
  if (!con) return { ok: true, conectado: false, permisos: PERMISOS };
  const cfg = await leerCfg();
  const perfil = await ig.perfil(con.token).catch((e) => ({ _err: e.message }));
  return {
    ok: true, conectado: true, username: con.username, igUserId: con.igUserId,
    venceEn: con.venceEn ? con.venceEn.toISOString() : null,
    perfil: perfil._err ? null : perfil, error: perfil._err || null,
    cfg: {
      botDM: cfg.botDM !== false, autoComentarios: cfg.autoComentarios !== false,
      palabrasClave: cfg.palabrasClave || [], activo: cfg.activo !== false,
    },
  };
});

/* ─────────────────────────────── Webhook ───────────────────────────────
   Meta manda acá los DMs y comentarios. Dos cosas no negociables:
     · la firma: sin verificar `X-Hub-Signature-256` cualquiera podría inyectar
       mensajes falsos y hacer que el bot converse (y gaste) con un atacante;
     · responder 200 rápido: Meta reintenta y termina desactivando el webhook
       si tarda. El trabajo real va después del ack. */

function firmaValida(req, appSecret) {
  const firma = String(req.get('x-hub-signature-256') || '');
  if (!firma.startsWith('sha256=')) return false;
  const esperado = crypto.createHmac('sha256', appSecret)
    .update(req.rawBody || Buffer.from('')).digest('hex');
  const a = Buffer.from(firma.slice(7), 'utf-8');
  const b = Buffer.from(esperado, 'utf-8');
  // timingSafeEqual exige mismo largo; distinta longitud ya es firma inválida.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

exports.instagramWebhook = onRequest({
  region: 'us-central1',
  secrets: [INSTAGRAM_APP_SECRET, IG_WEBHOOK_TOKEN, EVOLUTION_API_URL, EVOLUTION_API_KEY, ANTHROPIC_API_KEY],
  timeoutSeconds: 120,
}, async (req, res) => {
  // Handshake de suscripción: Meta pega un GET con el token que configuraste.
  if (req.method === 'GET') {
    const modo  = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    if (modo === 'subscribe' && token === IG_WEBHOOK_TOKEN.value()) {
      logger.info('[ig-webhook] suscripción verificada');
      res.status(200).send(String(req.query['hub.challenge'] || ''));
      return;
    }
    logger.warn('[ig-webhook] verificación rechazada');
    res.status(403).send('forbidden');
    return;
  }

  if (req.method !== 'POST') { res.status(405).send('method not allowed'); return; }

  if (!firmaValida(req, INSTAGRAM_APP_SECRET.value())) {
    logger.warn('[ig-webhook] firma inválida — descartado');
    res.status(401).send('bad signature');
    return;
  }

  const body = req.body || {};
  res.status(200).send('EVENT_RECEIVED');   // ack primero, trabajo después

  try {
    const cfg = await leerCfg();
    if (cfg.activo === false) { logger.info('[ig-webhook] plataforma apagada'); return; }
    const con = await leerConexion();
    if (!con) { logger.warn('[ig-webhook] llegó un evento pero no hay cuenta conectada'); return; }

    for (const entrada of (body.entry || [])) {
      // DMs: vienen en `messaging`.
      for (const m of (entrada.messaging || [])) {
        await manejarDM(m, con, cfg).catch((e) => logger.error('[ig-webhook] DM:', e.message));
      }
      // Comentarios y menciones: vienen en `changes`.
      for (const c of (entrada.changes || [])) {
        if (c.field === 'comments') {
          await manejarComentario(c.value, con, cfg).catch((e) => logger.error('[ig-webhook] comentario:', e.message));
        }
      }
    }
  } catch (e) {
    logger.error('[ig-webhook] proceso:', e.message);
  }
});

/* ───────────────────── DM → el cerebro de ventas ─────────────────────
   No se duplica el bot: se reusa `evolution/ventas.js` entero — su prompt, su
   tool de registrar reuniones, sus topes de gasto, el opt-out y el silencio
   cuando Ignacio contesta a mano. Lo único que cambia es por dónde entra y
   sale el texto, así que se le pasa un cliente con la misma forma que el de
   Evolution pero que habla Instagram. */

async function manejarDM(evento, con, cfg) {
  const remitente = String(evento.sender?.id || '');
  const propio    = String(evento.recipient?.id || '');
  const msg       = evento.message || {};

  if (!remitente || remitente === con.igUserId) return;   // eco de lo que enviamos
  if (msg.is_echo) return;
  if (evento.read || evento.reaction || evento.delivery) return;

  const texto = String(msg.text || '').trim();
  const mid   = String(msg.mid || '');
  if (!texto && !(msg.attachments || []).length) return;
  if (cfg.botDM === false) { logger.info('[ig-dm] bot de DM apagado — lo maneja Ignacio'); return; }

  // La ventana de 24 h se cuenta desde ESTE mensaje, así que queda registrada
  // para saber si más tarde todavía se le puede escribir.
  await db.doc(`ig_conversaciones/${remitente}`).set({
    igsid: remitente, cuenta: propio || con.igUserId,
    ultimoMensajeEn: Timestamp.now(), ultimoTexto: texto.slice(0, 400),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});

  const { procesarMensajeVentas } = require('./evolution/ventas');
  const { crearCliente }          = require('./evolution/client');

  // El cerebro avisa los leads al WhatsApp de Ignacio (56983568212). Ese aviso
  // tiene que seguir yendo por WhatsApp, no como DM a un IGSID que no existe:
  // por eso el adaptador desvía ese destino al chip real y el resto a Instagram.
  const WHATSAPP_IGNACIO = '56983568212';
  const evoReal = crearCliente({ baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value() });

  const adaptador = {
    enviarTexto: async (_inst, destino, txt) => {
      if (String(destino) === WHATSAPP_IGNACIO) {
        return evoReal.enviarTexto('instance_plat_ventas', WHATSAPP_IGNACIO, `📸 *Instagram*\n\n${txt}`);
      }
      return ig.enviarDM(con.token, con.igUserId, remitente, txt);
    },
    marcarLeido: async () => {},
  };

  // Payload con la forma que espera el cerebro. El id del chat lleva prefijo
  // `ig_` para que las conversaciones de Instagram no se mezclen con las de
  // WhatsApp en `wa_ventas_conversaciones` (mismo número, personas distintas).
  const fingido = {
    data: {
      key: { remoteJid: `ig_${remitente}@s.whatsapp.net`, fromMe: false, id: mid || `ig_${Date.now()}` },
      message: { conversation: texto || '[envió un archivo que no puedo ver]' },
      pushName: String(evento.sender?.username || '').slice(0, 60),
    },
  };

  // `activadores` vacío + el gatillo de anuncio no aplican acá: en Instagram
  // TODO el que escribe al perfil comercial es un lead, no un amigo. Por eso se
  // marca la conversación como ya activada antes de entrar al cerebro.
  await db.doc(`wa_ventas_conversaciones/ig_${remitente}`)
    .set({ activado: true, canal: 'instagram', igsid: remitente, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

  await procesarMensajeVentas({
    chipId: 'instagram',
    cfg: { ventasBot: true, meetLink: cfg.meetLink || null, activadores: [] },
    body: fingido,
    evoClient: adaptador,
    anthropicKey: ANTHROPIC_API_KEY.value(),
    instancia: 'instagram',
  });

  logger.info(`[ig-dm] respondido ***${remitente.slice(-4)}`);
}

/* ───────────────────────── Comentarios ─────────────────────────
   Dos jugadas distintas y complementarias:
     · responder EN PÚBLICO, que es lo que ve el resto y da prueba social;
     · si el comentario trae una palabra clave, abrir además el PRIVADO, que
       es la única vía legítima de Meta para el "comenta X y te escribo". */

async function manejarComentario(valor, con, cfg) {
  const commentId = String(valor?.id || '');
  const texto     = String(valor?.text || '').trim();
  const autor     = String(valor?.from?.username || '');
  const autorId   = String(valor?.from?.id || '');

  if (!commentId || !texto) return;
  if (autorId && autorId === con.igUserId) return;   // comentario propio
  if (cfg.autoComentarios === false) return;

  await db.doc(`ig_comentarios/${commentId}`).set({
    commentId, texto: texto.slice(0, 500), autor, autorId,
    mediaId: String(valor?.media?.id || ''), recibidoEn: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});

  const norm = texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const claves = Array.isArray(cfg.palabrasClave) && cfg.palabrasClave.length
    ? cfg.palabrasClave : ['agenda', 'precio', 'info', 'demo', 'quiero'];
  const disparo = claves.find((k) => norm.includes(String(k).toLowerCase()));

  // Respuesta pública: corta y sin prometer nada que el bot no pueda cumplir.
  const publica = String(cfg.respuestaComentario || '¡Gracias por escribir! Te mandé un mensaje por privado 🙌');
  if (disparo) {
    await ig.responderComentario(con.token, commentId, publica)
      .catch((e) => logger.warn('[ig-comentario] respuesta pública:', e.message));

    const privado = String(cfg.mensajePrivado ||
      '¡Hola! 👋 Vi tu comentario. Soy Ignacio, de SynapTech. ¿Para qué barbería o salón sería? Te muestro en 2 minutos cómo funciona la agenda online.');
    await ig.responderComentarioEnPrivado(con.token, con.igUserId, commentId, privado)
      .then(() => db.doc(`ig_comentarios/${commentId}`).set({ privadoEnviado: true }, { merge: true }))
      .catch((e) => logger.warn('[ig-comentario] privado:', e.message));

    logger.info(`[ig-comentario] @${autor} disparó "${disparo}" → público + privado`);
  } else {
    logger.info(`[ig-comentario] @${autor} sin palabra clave; queda registrado sin responder`);
  }
}

/* ───────────────────────────── Publicar ───────────────────────────── */

exports.instagramPublicar = onCall({
  region: 'us-central1', cors: true, timeoutSeconds: 300,
}, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const con = await leerConexion();
  if (!con) throw new HttpsError('failed-precondition', 'Instagram no está conectado todavía.');

  const tipo = String(req.data?.tipo || 'IMAGE').toUpperCase();
  if (!['IMAGE', 'CAROUSEL', 'REELS', 'STORIES'].includes(tipo)) {
    throw new HttpsError('invalid-argument', 'tipo debe ser IMAGE, CAROUSEL, REELS o STORIES.');
  }
  const urls = (Array.isArray(req.data?.urls) ? req.data.urls : [req.data?.url])
    .filter(Boolean).map(String);
  if (!urls.length) throw new HttpsError('invalid-argument', 'Falta la URL de la media.');
  // Instagram descarga la media desde una URL pública: un blob local o un
  // enlace privado le devuelve 403 y el contenedor muere en ERROR.
  if (urls.some((u) => !/^https:\/\//i.test(u))) {
    throw new HttpsError('invalid-argument', 'Las URLs deben ser https públicas y accesibles por Meta.');
  }

  const caption = String(req.data?.caption || '').slice(0, 2200);
  const out = await ig.publicar(con.token, con.igUserId, { tipo, urls, caption })
    .catch((e) => { throw new HttpsError('internal', e.message); });

  await db.collection('ig_publicaciones').add({
    ...out, tipo, urls, caption, cuenta: con.username,
    por: String(req.auth.token?.email || ''), publicadoEn: FieldValue.serverTimestamp(),
  }).catch(() => {});

  logger.info(`[ig-publicar] ${tipo} publicado id=${out.id} por ${req.auth.token?.email}`);
  return { ok: true, ...out };
});

/* ───────────────── Métricas para el snapshot de ops ───────────────── */

/** Resumen para el panel. Nunca lanza: sin Instagram el panel sigue vivo. */
async function resumenInstagram() {
  try {
    const con = await leerConexion();
    if (!con) return { conectado: false };
    const [perfil, ins, cupo] = await Promise.all([
      ig.perfil(con.token).catch(() => null),
      ig.insights(con.token, con.igUserId, 7).catch(() => null),
      ig.cupoPublicacion(con.token, con.igUserId).catch(() => null),
    ]);
    const hace7 = Date.now() - 7 * 86400e3;
    const [dms, coments] = await Promise.all([
      db.collection('ig_conversaciones').get().catch(() => null),
      db.collection('ig_comentarios').get().catch(() => null),
    ]);
    const ms = (v) => v?.toMillis?.() || 0;
    return {
      conectado: true,
      username: con.username,
      venceEnDias: con.venceEn ? Math.round((con.venceEn - Date.now()) / 86400000) : null,
      seguidores: perfil?.followers_count ?? null,
      publicaciones: perfil?.media_count ?? null,
      alcance7d: ins?.alcance ?? null,
      interacciones7d: ins?.interacciones ?? null,
      visitasPerfil7d: ins?.visitasAlPerfil ?? null,
      alcanceSerie: ins?.alcanceSerie || [],
      dm7d:        dms ? dms.docs.filter((d) => ms(d.data().ultimoMensajeEn) >= hace7).length : null,
      comentarios7d: coments ? coments.docs.filter((d) => ms(d.data().recibidoEn) >= hace7).length : null,
      cupoPublicacion: cupo,
    };
  } catch (e) {
    logger.warn('[ig-resumen]', e.message);
    return { conectado: false, error: e.message };
  }
}

exports._resumenInstagram = resumenInstagram;
exports._PERMISOS = PERMISOS;
exports._CUENTA = CUENTA;
