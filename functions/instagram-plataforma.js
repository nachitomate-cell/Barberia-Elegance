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

/**
 * Suscribe la app a los webhooks de la cuenta, si no lo está ya.
 *
 * Configurar la URL del webhook en el panel de Meta NO basta: eso solo define
 * a dónde entregar. Falta además suscribir la CUENTA, que es una llamada a la
 * API aparte y que nadie hace porque la interfaz no la pide. Sin ella
 * `subscribed_apps` queda vacío y no llega ni un DM — pasó exactamente eso el
 * 06-08-2026: todo se veía configurado y no entregaba nada.
 *
 * Se llama al leer el estado, así que abrir el panel la auto-sana (mismo
 * patrón que asegurarSlot en slotlocks). Nunca lanza.
 */
async function asegurarSuscripcion(con) {
  try {
    const actual = await ig.llamar('GET', `${con.igUserId}/subscribed_apps`, { token: con.token });
    const campos = actual?.data?.[0]?.subscribed_fields || [];
    const faltan = ['messages', 'comments'].filter((f) => !campos.includes(f));
    if (!faltan.length) return { ok: true, campos, yaEstaba: true };

    await ig.llamar('POST', `${con.igUserId}/subscribed_apps`, {
      token: con.token, params: { subscribed_fields: 'messages,comments' },
    });
    logger.info(`[ig] suscripción creada/reparada (faltaban: ${faltan.join(', ')})`);
    return { ok: true, campos: ['messages', 'comments'], reparada: true };
  } catch (e) {
    logger.warn('[ig] no pude asegurar la suscripción:', e.message);
    return { ok: false, error: e.message };
  }
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
  const [perfil, suscripcion] = await Promise.all([
    ig.perfil(con.token).catch((e) => ({ _err: e.message })),
    asegurarSuscripcion(con),
  ]);
  return {
    ok: true, conectado: true, username: con.username, igUserId: con.igUserId,
    venceEn: con.venceEn ? con.venceEn.toISOString() : null,
    suscripcion,
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
  // 512 MiB por lo mismo que opsMetrics: el contenedor carga todo el grafo de
  // funciones (~130 MB) y con 256 el arranque en frío se arrastra justo cuando
  // hay alguien esperando respuesta al otro lado.
  memory: '512MiB',
  // SIN minInstances a propósito: medido, el arranque en frío es ~1,7 s. Los 3
  // minutos de demora del 06-08 no eran el frío sino el mensaje perdido por
  // hacer el ack antes de trabajar. Una instancia siempre viva costaría ~US$10
  // al mes para ahorrar menos de 2 segundos: no se justifica todavía.
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

  // Se TRABAJA y recién después se responde. La versión anterior hacía el ack
  // primero "para no hacer esperar a Meta", y eso perdía mensajes: Cloud
  // Functions congela la CPU de la instancia apenas se envía la respuesta, así
  // que el trabajo de después puede no ejecutarse nunca. Medido el 06-08-2026:
  // el primer DM real no se procesó y solo se contestó cuando Meta reintentó
  // 3 minutos más tarde.
  //
  // Responder después es seguro porque el cerebro deduplica por id de mensaje
  // (`lastMsgId` en la transacción de reclamo de ventas.js): si Meta reintenta,
  // el segundo intento no vuelve a contestar. Y si algo falla se devuelve 500 a
  // propósito, para que Meta reintente en vez de perder el lead.
  try {
    const cfg = await leerCfg();
    if (cfg.activo === false) {
      logger.info('[ig-webhook] plataforma apagada');
      res.status(200).send('EVENT_RECEIVED'); return;
    }
    const con = await leerConexion();
    if (!con) {
      logger.warn('[ig-webhook] llegó un evento pero no hay cuenta conectada');
      res.status(200).send('EVENT_RECEIVED'); return;
    }

    for (const entrada of (body.entry || [])) {
      // DMs: vienen en `messaging`.
      for (const m of (entrada.messaging || [])) {
        await manejarDM(m, con, cfg);
      }
      // Comentarios y menciones: vienen en `changes`.
      for (const c of (entrada.changes || [])) {
        if (c.field === 'comments') await manejarComentario(c.value, con, cfg);
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } catch (e) {
    logger.error('[ig-webhook] proceso:', e.message);
    res.status(500).send('retry');
  }
});

/* ─────────────── ¿Cliente que pide soporte o lead nuevo? ───────────────
   Un local que YA paga y escribe con un problema no puede recibir un pitch de
   ventas: es la peor cara posible. Pero tampoco quiero apagar el bot para
   todos, porque entonces vuelve el agujero que costó $124.548.

   Se resuelve con dos listas:
     · AUTOMÁTICA — los @ de los locales que ya son clientes, derivados de los
       tenants y de las cuentas de Instagram conectadas. Se calcula sola, así
       que un cliente nuevo queda protegido sin que nadie haga nada.
     · MANUAL — `_system/instagram_plataforma.soporte[]`, para los barberos que
       escriben desde su cuenta PERSONAL, que es lo que la automática no puede
       adivinar. Se llena desde ops con un clic.

   Ante la duda contesta el bot: perder un lead cuesta más que un pitch de más
   a alguien que después se marca como soporte y no se repite nunca. */

const CACHE_TTL_MS = 5 * 60 * 1000;
let _cacheClientes = null;
let _cacheClientesAt = 0;

async function handlesDeClientes() {
  if (_cacheClientes && (Date.now() - _cacheClientesAt) < CACHE_TTL_MS) return _cacheClientes;

  const norm = (h) => String(h || '').replace(/^@+/, '').trim().toLowerCase();
  const set = new Set();

  // De los docs de tenant (el @ que declararon al darse de alta).
  const refs = await db.collection('tenants').listDocuments();
  await Promise.all(refs.map(async (r) => {
    const v = (await r.get()).data() || {};
    if (v.instagram) set.add(norm(v.instagram));
  }));

  // De las cuentas realmente conectadas: la fuente más fiable.
  const sys = await db.collection('_system').listDocuments();
  await Promise.all(sys
    .filter((r) => r.id.startsWith('instagram_') &&
      !['instagram_app', 'instagram_plataforma', `instagram_${CUENTA}`].includes(r.id))
    .map(async (r) => {
      const v = (await r.get()).data() || {};
      if (v.instagramUsername) set.add(norm(v.instagramUsername));
    }));

  // Varios tenants conectaron usando la propia cuenta de SynapTech: si quedara
  // en la lista, cualquier mensaje se leería como "cliente" y el bot enmudecería.
  set.delete('synaptechspa');
  set.delete('');

  _cacheClientes = set;
  _cacheClientesAt = Date.now();
  return set;
}

/**
 * Decide si el bot contesta o si el mensaje es para Ignacio.
 * @returns {{esSoporte:boolean, motivo:string|null, username:string, nombre:string}}
 */
async function clasificarRemitente(con, cfg, igsid, guardado) {
  // El @ se resuelve una vez y queda cacheado en la conversación: pedirlo en
  // cada mensaje es una llamada de más por cada línea que escriben.
  let username = guardado?.username || '';
  let nombre   = guardado?.nombre || '';
  if (!username) {
    const p = await ig.perfilDeUsuario(con.token, igsid).catch(() => null);
    username = String(p?.username || '').toLowerCase();
    nombre   = String(p?.name || '');
  }

  const manual = (cfg.soporte || []).map((h) => String(h).replace(/^@+/, '').toLowerCase());
  if (username && manual.includes(username)) {
    return { esSoporte: true, motivo: 'marcado como soporte', username, nombre };
  }
  if (guardado?.esSoporte === true) {
    return { esSoporte: true, motivo: 'marcado como soporte', username, nombre };
  }
  if (username && (await handlesDeClientes()).has(username)) {
    return { esSoporte: true, motivo: 'es un local cliente', username, nombre };
  }
  return { esSoporte: false, motivo: null, username, nombre };
}

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

  const convRef = db.doc(`ig_conversaciones/${remitente}`);
  const guardado = (await convRef.get()).data() || null;
  const quien = await clasificarRemitente(con, cfg, remitente, guardado);

  // La ventana de 24 h se cuenta desde ESTE mensaje, así que queda registrada
  // para saber si más tarde todavía se le puede escribir.
  await convRef.set({
    igsid: remitente, cuenta: propio || con.igUserId,
    username: quien.username || null, nombre: quien.nombre || null,
    esSoporte: quien.esSoporte,
    ultimoMensajeEn: Timestamp.now(), ultimoTexto: texto.slice(0, 400),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});

  // Cliente pidiendo soporte: el bot se calla y se le avisa a Ignacio. Meterle
  // un pitch de ventas a alguien que ya paga es la peor cara posible.
  if (quien.esSoporte) {
    logger.info(`[ig-dm] @${quien.username} → soporte (${quien.motivo}); el bot no contesta`);
    const evoReal = require('./evolution/client').crearCliente({
      baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value(),
    });
    await evoReal.enviarTexto('instance_plat_ventas', '56983568212', [
      '🛟 *Soporte por Instagram*',
      '',
      `De: @${quien.username}${quien.nombre ? ` (${quien.nombre})` : ''}`,
      `Motivo: ${quien.motivo}`,
      '',
      `💬 "${texto.slice(0, 300)}"`,
      '',
      'El bot NO contestó — te toca a ti.',
    ].join('\n')).catch((e) => logger.warn('[ig-dm] aviso soporte:', e.message));
    return;
  }

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

/* ─────────────────── Marcar quién va a soporte ─────────────────── */

exports.instagramMarcarSoporte = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const igsid   = String(req.data?.igsid || '');
  const soporte = req.data?.soporte !== false;
  if (!igsid) throw new HttpsError('invalid-argument', 'Falta el igsid.');

  const ref = db.doc(`ig_conversaciones/${igsid}`);
  const conv = (await ref.get()).data() || {};
  await ref.set({ esSoporte: soporte, marcadoEn: FieldValue.serverTimestamp() }, { merge: true });

  // También al doc de config: así la marca sobrevive aunque la conversación se
  // borre, y sirve si la misma persona escribe desde otro hilo.
  const usuario = String(conv.username || req.data?.username || '').replace(/^@+/, '').toLowerCase();
  if (usuario) {
    await CFG_REF().set({
      soporte: soporte ? FieldValue.arrayUnion(usuario) : FieldValue.arrayRemove(usuario),
    }, { merge: true });
  }

  // El bot ya activó esa conversación en su propia colección; hay que soltarla
  // o seguiría contestando aunque acá diga soporte.
  if (soporte) {
    await db.doc(`wa_ventas_conversaciones/ig_${igsid}`)
      .set({ activado: false }, { merge: true }).catch(() => {});
  }

  logger.info(`[ig] @${usuario || igsid} ${soporte ? '→ soporte (el bot se calla)' : '→ el bot vuelve a contestarle'}`);
  return { ok: true, igsid, username: usuario, soporte };
});

exports.instagramConversaciones = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const snap = await db.collection('ig_conversaciones')
    .orderBy('ultimoMensajeEn', 'desc').limit(30).get();
  return {
    ok: true,
    items: snap.docs.map((d) => {
      const v = d.data();
      return {
        igsid: d.id, username: v.username || null, nombre: v.nombre || null,
        esSoporte: v.esSoporte === true,
        ultimoTexto: v.ultimoTexto || '',
        ultimoMensajeEn: v.ultimoMensajeEn?.toMillis?.() || null,
      };
    }),
  };
});

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

/**
 * Las últimas publicaciones de la cuenta, para reutilizarlas.
 *
 * Las URLs que devuelve son de la CDN de Meta y caducan en horas: sirven para
 * la miniatura del panel, NO para publicar más tarde. Por eso lo programado
 * guarda el id de la publicación y vuelve a pedir la URL al momento de salir.
 */
exports.instagramMisPublicaciones = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth || !esOperadorReq(req)) {
    throw new HttpsError('permission-denied', 'Solo el operador de la plataforma.');
  }
  const con = await leerConexion();
  if (!con) throw new HttpsError('failed-precondition', 'Instagram no está conectado.');
  const items = await ig.misPublicaciones(con.token, Number(req.data?.limite) || 18)
    .catch((e) => { throw new HttpsError('internal', e.message); });
  return { ok: true, items };
});

/* ───────────────── Métricas para el snapshot de ops ───────────────── */

/** Resumen para el panel. Nunca lanza: sin Instagram el panel sigue vivo. */
async function resumenInstagram() {
  try {
    const con = await leerConexion();
    if (!con) return { conectado: false };
    const [perfil, ins, cupo, susc] = await Promise.all([
      ig.perfil(con.token).catch(() => null),
      ig.insights(con.token, con.igUserId, 7).catch(() => null),
      ig.cupoPublicacion(con.token, con.igUserId).catch(() => null),
      // El snapshot corre cada 5 min: es el mejor momento para auto-sanar la
      // suscripción, porque si se cae nadie se entera hasta que faltan leads.
      asegurarSuscripcion(con),
    ]);
    const hace7 = Date.now() - 7 * 86400e3;
    const { _resumenProgramadas } = require('./instagram-programador');
    const [dms, coments, programadas] = await Promise.all([
      db.collection('ig_conversaciones').get().catch(() => null),
      db.collection('ig_comentarios').get().catch(() => null),
      _resumenProgramadas().catch(() => null),
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
      // Últimos hilos con su clasificación, para poder corregirla desde ops.
      conversaciones: dms ? dms.docs
        .sort((a, b) => ms(b.data().ultimoMensajeEn) - ms(a.data().ultimoMensajeEn))
        .slice(0, 12)
        .map((d) => {
          const v = d.data();
          return {
            igsid: d.id, username: v.username || null, nombre: v.nombre || null,
            esSoporte: v.esSoporte === true,
            texto: String(v.ultimoTexto || '').slice(0, 90),
            cuando: ms(v.ultimoMensajeEn),
          };
        }) : [],
      comentarios7d: coments ? coments.docs.filter((d) => ms(d.data().recibidoEn) >= hace7).length : null,
      cupoPublicacion: cupo,
      // Si esto se cae, el bot deja de recibir DMs sin ningún otro síntoma.
      suscripcionOk: !!susc?.ok,
      suscripcionCampos: susc?.campos || [],
      programadas,
    };
  } catch (e) {
    logger.warn('[ig-resumen]', e.message);
    return { conectado: false, error: e.message };
  }
}

exports._resumenInstagram   = resumenInstagram;
exports._handlesDeClientes  = handlesDeClientes;
exports._clasificarRemitente = clasificarRemitente;
exports._PERMISOS = PERMISOS;
exports._CUENTA = CUENTA;
