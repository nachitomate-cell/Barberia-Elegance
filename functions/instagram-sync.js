'use strict';

// functions/instagram-sync.js
// ─────────────────────────────────────────────────────────────────
//  INSTAGRAM SYNC — importa posts al lookbook de Firestore.
//
//  Usa Instagram API with Instagram Login (reemplaza Basic Display API).
//  Los docs creados tienen source='instagram' e instagramId para
//  evitar duplicados en re-sincronizaciones.
//
//  SETUP (una vez por app de Meta):
//    1. developers.facebook.com → Crear App → agregar producto "Instagram"
//    2. Activar "Instagram Login for Business"
//    3. Añadir Valid OAuth Redirect URI:
//       https://us-central1-barberia-elegance.cloudfunctions.net/instagramOAuthCallback
//    4. Guardar App ID en Firestore: _system/instagram_app { appId: '...' }
//    5. Setear secrets:
//       firebase functions:secrets:set INSTAGRAM_APP_SECRET
//       (App ID va en Firestore, no es secreto)
//
//  DEPLOY:
//    firebase deploy --only functions:instagramOAuthCallback,functions:instagramSyncScheduled,functions:instagramSyncManual
// ─────────────────────────────────────────────────────────────────

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule }                    = require('firebase-functions/v2/scheduler');
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const https                             = require('https');
const { URLSearchParams }               = require('url');
const { FieldValue, Timestamp }         = require('firebase-admin/firestore');

const db = admin.firestore();

const INSTAGRAM_APP_SECRET = defineSecret('INSTAGRAM_APP_SECRET');

const ALL_TENANTS      = ['elegance', 'ferraza', 'gitana', 'chameleon', 'mapubarbershop', 'deluxeperfumes', 'lumen', 'delnero', 'marcelo_hairdressing', 'aura', 'machos', 'infinity', 'sionbarberia', 'omegastudio', 'memphis', 'barbersclub', 'elbarberomoderno', 'renacer'];
const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com'];
const CALLBACK_URL     = 'https://us-central1-barberia-elegance.cloudfunctions.net/instagramOAuthCallback';

// Map de fallback tenant → URL absoluta del panel. Se usa cuando el `state`
// no trae origen o el origen viene fuera de la allow-list. Cubre todos los
// tenants en ALL_TENANTS con su dominio principal (los alias los cubre el
// origen dinámico que viene en state).
const TENANT_PANEL_URL = {
  elegance:             'https://barberiaelegance.synaptechspa.cl',
  ferraza:              'https://barberiaferraza.synaptechspa.cl',
  gitana:               'https://gitananails.synaptechspa.cl',
  chameleon:            'https://chameleonbarber.synaptechspa.cl',
  mapubarbershop:       'https://mapubarbershop.synaptechspa.cl',
  deluxeperfumes:       'https://deluxeperfumes.synaptechspa.cl',
  lumen:                'https://barberiadjones.synaptechspa.cl',
  delnero:              'https://delnerobarber.synaptechspa.cl',
  marcelo_hairdressing: 'https://marcelohairdressing.synaptechspa.cl',
  aura:                 'https://aurasalon.synaptechspa.cl',
  machos:               'https://machos.synaptechspa.cl',
  infinity:             'https://infinity.synaptechspa.cl',
  sionbarberia:         'https://studiodieciseis.synaptechspa.cl',
  omegastudio:          'https://omegastudio.synaptechspa.cl',
  memphis:              'https://memphissalon.synaptechspa.cl',
  barbersclub:          'https://barbersclub.synaptechspa.cl',
  elbarberomoderno:     'https://elbarberomoderno.synaptechspa.cl',
  renacer:              'https://renacer.synaptechspa.cl',
};

// Allow-list de orígenes para el redirect post-OAuth. Evita open-redirect
// (atacante iniciando el flow con `state` apuntando a su dominio). Se aceptan:
//   - subdominios de synaptechspa.cl, synaptech.cl, yugenstudio.cl
//   - http(s)://localhost[:port] para dev
const ALLOWED_ORIGIN_RE = /^https?:\/\/(?:[a-z0-9-]+\.)?(?:synaptechspa\.cl|synaptech\.cl|yugenstudio\.cl|localhost(?::\d+)?)$/i;

// ── Helpers de Firestore ───────────────────────────────────────────
function igConfigRef(tenantId) {
  return db.collection('_system').doc(`instagram_${tenantId}`);
}

function lookbookCol(tenantId) {
  return tenantId === 'elegance'
    ? db.collection('lookbook')
    : db.collection('tenants').doc(tenantId).collection('lookbook');
}

// ── HTTP helpers ───────────────────────────────────────────────────
function httpsGet(urlStr) {
  return new Promise((resolve, reject) => {
    const u    = new URL(urlStr);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method: 'GET' };
    const req  = https.request(opts, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function httpsPost(urlStr, data) {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(data).toString();
    const u       = new URL(urlStr);
    const opts    = {
      hostname: u.hostname,
      path:     u.pathname + u.search,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Mapeo de hashtags a categorías del lookbook ────────────────────
function extractCategoria(caption = '') {
  const l = (caption || '').toLowerCase();
  if (l.includes('#fade')    || l.includes('#degradado'))  return 'Fade';
  if (l.includes('#clasico') || l.includes('#clásico'))    return 'Clásico';
  if (l.includes('#barba')   || l.includes('#beard'))      return 'Barba';
  if (l.includes('#diseño')  || l.includes('#design'))     return 'Diseño';
  if (l.includes('#corte')   || l.includes('#haircut'))    return 'Fade';
  return 'Fade';
}

function extractTitulo(caption = '') {
  const first = (caption || '').split('\n')[0].replace(/#\S+/g, '').trim();
  return (first.length > 3 && first.length < 60) ? first : '';
}

// ── OAuth Callback ─────────────────────────────────────────────────
exports.instagramOAuthCallback = onRequest(
  { secrets: [INSTAGRAM_APP_SECRET], region: 'us-central1' },
  async (req, res) => {
    const code     = req.query.code;
    const stateRaw = String(req.query.state || '');
    // Nuevo formato: `${tenantId}|${base64url(origin)}`. Backward-compat: si
    // no hay pipe, tratamos toda la cadena como tenantId (state legacy).
    const [tenantPart, originB64] = stateRaw.includes('|') ? stateRaw.split('|') : [stateRaw, ''];

    // Antes: fallback silencioso a 'elegance' → si el tenant no estaba en la
    // lista, la config se escribía en `_system/instagram_elegance` y contaminaba
    // esa cuenta. Ahora abortamos con error claro para que la falta de tenant
    // sea visible en producción (y no un "éxito" que rompe otro tenant).
    if (!ALL_TENANTS.includes(tenantPart)) {
      logger.error(`[Instagram] Tenant no reconocido en state: "${tenantPart}". Agrégalo a ALL_TENANTS y redeployá.`);
      res.status(400).send(
        `Tenant no reconocido: "${tenantPart}". ` +
        `Agrégalo a ALL_TENANTS en functions/instagram-sync.js y volvé a hacer firebase deploy --only functions:instagramOAuthCallback.`
      );
      return;
    }
    const tenantId = tenantPart;

    // Decodifica base64url y valida contra la allow-list. Cualquier origen
    // fuera de allow-list se descarta silenciosamente (fallback al map por
    // tenant) — evita open-redirect si alguien manipuló el `state`.
    let clientOrigin = '';
    if (originB64) {
      try {
        const b64 = originB64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - originB64.length % 4) % 4);
        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
        if (ALLOWED_ORIGIN_RE.test(decoded)) clientOrigin = decoded;
        else logger.warn('[Instagram] Origen rechazado por allow-list:', decoded);
      } catch (e) {
        logger.warn('[Instagram] No se pudo decodificar origen del state:', e.message);
      }
    }

    if (!code) {
      res.status(400).send('Error: parámetro code faltante en el callback.');
      return;
    }

    const appSecret = INSTAGRAM_APP_SECRET.value();

    // Leer App ID desde Firestore (no es secreto, se puede guardar ahí)
    let appId = '';
    try {
      const appCfgSnap = await db.collection('_system').doc('instagram_app').get();
      appId = appCfgSnap.exists ? (appCfgSnap.data().appId || '') : '';
    } catch (e) {
      logger.warn('[Instagram] No se pudo leer instagram_app:', e.message);
    }

    if (!appId) {
      res.status(500).send('Error: App ID de Instagram no configurado en _system/instagram_app.');
      return;
    }

    try {
      // Paso 1: code → short-lived token (1 hora)
      const shortRes = await httpsPost('https://api.instagram.com/oauth/access_token', {
        client_id:     appId,
        client_secret: appSecret,
        grant_type:    'authorization_code',
        redirect_uri:  CALLBACK_URL,
        code,
      });

      if (!shortRes.access_token) {
        logger.error('[Instagram] Short token failed:', shortRes);
        res.status(500).send('Error intercambiando code por token: ' + (shortRes.error_message || JSON.stringify(shortRes)));
        return;
      }

      // Paso 2: short-lived → long-lived token (60 días)
      const longRes = await httpsGet(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortRes.access_token}`
      );

      if (!longRes.access_token) {
        logger.error('[Instagram] Long token failed:', longRes);
        res.status(500).send('Error obteniendo token largo: ' + JSON.stringify(longRes));
        return;
      }

      const token     = longRes.access_token;
      const expiresIn = longRes.expires_in || 5183944; // ~60 días

      // Paso 3: username del usuario
      const meRes     = await httpsGet(
        `https://graph.instagram.com/me?fields=id,username&access_token=${token}`
      );

      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      await igConfigRef(tenantId).set({
        tenantId,
        accessToken:       token,
        tokenExpiresAt:    Timestamp.fromDate(expiresAt),
        instagramUserId:   String(shortRes.user_id || meRes.id || ''),
        instagramUsername: meRes.username || '',
        enabled:           true,
        connectedAt:       Timestamp.now(),
        lastSync:          null,
        postCount:         0,
        errorMsg:          FieldValue.delete(),
      }, { merge: true });

      logger.info(`[Instagram] Conectado tenant=${tenantId} @${meRes.username}`);
      // Redirect ABSOLUTO: preferimos el origen del cliente (validado); si no
      // vino o quedó fuera de la allow-list, usamos el mapa del tenant. El
      // path relativo anterior resolvía contra el host de Cloud Functions y
      // rompía con 404. Con URL absoluta el browser cae en el panel real.
      const baseUrl = clientOrigin || TENANT_PANEL_URL[tenantId] || TENANT_PANEL_URL.elegance;
      res.redirect(302, `${baseUrl}/gestion-interna/?instagram=connected`);
    } catch (err) {
      logger.error('[Instagram] OAuth error:', err.message);
      res.status(500).send('Error interno: ' + err.message);
    }
  }
);

// ── Core: sincronizar posts de un tenant ───────────────────────────
async function syncTenant(tenantId) {
  const snap = await igConfigRef(tenantId).get();
  if (!snap.exists) return { tenantId, skipped: true };

  const cfg = snap.data();
  if (!cfg.enabled || !cfg.accessToken) return { tenantId, skipped: true };

  let token = cfg.accessToken;

  // Auto-renovar si expira en menos de 7 días
  const expiresAt = cfg.tokenExpiresAt?.toDate?.() ?? new Date(0);
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (expiresAt < sevenDays) {
    try {
      const refreshed = await httpsGet(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refreshtoken&access_token=${token}`
      );
      if (refreshed.access_token) {
        token = refreshed.access_token;
        await igConfigRef(tenantId).update({
          accessToken:    token,
          tokenExpiresAt: Timestamp.fromDate(new Date(Date.now() + (refreshed.expires_in || 5183944) * 1000)),
        });
        logger.info(`[Instagram] Token renovado para ${tenantId}`);
      }
    } catch (e) {
      logger.warn(`[Instagram] No se pudo renovar token (${tenantId}): ${e.message}`);
    }
  }

  // Obtener últimos 30 posts de Instagram. Incluimos `permalink` como fallback
  // para reels: la URL directa del video (media_url) puede expirar en horas
  // en el CDN de IG, mientras que el permalink es estable.
  const mediaRes = await httpsGet(
    `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp&limit=30&access_token=${token}`
  );

  if (mediaRes.error) {
    logger.error(`[Instagram] API error (${tenantId}):`, mediaRes.error);
    // Token inválido → deshabilitar
    if (mediaRes.error.code === 190) {
      await igConfigRef(tenantId).update({ enabled: false, errorMsg: 'Token expirado o inválido. Vuelve a conectar.' });
    }
    return { tenantId, error: mediaRes.error.message };
  }

  // Imágenes, álbumes y videos/reels. Para VIDEO exigimos thumbnail_url
  // (el poster) porque `url` en el doc se guarda como imagen para que los
  // renderers existentes muestren un frame sin romperse. La URL del video
  // va en videoUrl aparte.
  const posts = (mediaRes.data || []).filter(p => {
    if (p.media_type === 'IMAGE' || p.media_type === 'CAROUSEL_ALBUM') return !!p.media_url;
    if (p.media_type === 'VIDEO') return !!p.thumbnail_url;
    return false;
  });
  if (!posts.length) return { tenantId, added: 0 };

  // Mapa instagramId → docRef de los ya sincronizados. Lo usamos para dos cosas:
  //   1) NO duplicar los que ya existen.
  //   2) REFRESCAR su `url`/`thumbnailUrl`/`videoUrl` en cada corrida — las URLs
  //      del CDN de Instagram (scontent.cdninstagram.com) vienen firmadas y
  //      CADUCAN en horas/días. Como el cron corre cada 6h y cada llamada a la
  //      API devuelve URLs recién firmadas, refrescarlas las mantiene vivas y
  //      las tarjetas dejan de salir en negro. (Los posts que ya no estén entre
  //      los últimos 30 —o borrados de IG— no se refrescan y eventualmente
  //      mueren; aceptable para el lookbook, que muestra lo reciente.)
  const col          = lookbookCol(tenantId);
  const existingSnap = await col.where('source', '==', 'instagram').get();
  const existingById = new Map();
  existingSnap.docs.forEach(d => {
    const igId = d.data().instagramId;
    if (igId) existingById.set(igId, d.ref);
  });

  // Calcular order base (debajo de los posts manuales existentes)
  const topSnap  = await col.orderBy('order', 'desc').limit(1).get();
  const maxOrder = topSnap.empty ? 0 : (topSnap.docs[0].data().order ?? 0);

  const batch = db.batch();
  let added = 0, refreshed = 0;
  posts.forEach(post => {
    const isVideo  = post.media_type === 'VIDEO';
    // Para VIDEO, `url` = thumbnail (poster) para que los renderers legacy
    // muestren una imagen sin romperse. La URL del video va en videoUrl.
    const freshUrl = isVideo ? post.thumbnail_url : post.media_url;
    const existingRef = existingById.get(post.id);

    if (existingRef) {
      // Refrescar SOLO los campos que caducan. NO tocar order/likes/focalX/Y/
      // titulo/categoria: pueden haber sido reordenados o editados a mano.
      batch.update(existingRef, {
        url:            freshUrl,
        thumbnailUrl:   post.thumbnail_url || null,
        videoUrl:       isVideo ? (post.media_url || null) : null,
        permalink:      post.permalink || null,
        urlRefreshedAt: Timestamp.now(),
      });
      refreshed++;
    } else {
      batch.set(col.doc(`ig_${post.id}`), {
        url:          freshUrl,
        mediaType:    post.media_type,
        thumbnailUrl: post.thumbnail_url || null,
        videoUrl:     isVideo ? (post.media_url || null) : null,
        permalink:    post.permalink || null,
        titulo:       extractTitulo(post.caption),
        categoria:    extractCategoria(post.caption),
        source:       'instagram',
        instagramId:  post.id,
        caption:      post.caption || '',
        timestamp:    post.timestamp || '',
        order:        maxOrder + added + 1,
        creadoEn:     Timestamp.now(),
      });
      added++;
    }
  });

  if (added === 0 && refreshed === 0) return { tenantId, added: 0, refreshed: 0 };
  await batch.commit();

  await igConfigRef(tenantId).update({
    lastSync:  Timestamp.now(),
    postCount: FieldValue.increment(added),
    errorMsg:  FieldValue.delete(),
  });

  logger.info(`[Instagram] Sync OK ${tenantId}: +${added} nuevos, ${refreshed} refrescados`);
  return { tenantId, added, refreshed };
}

// ── Cron: cada 6 horas ─────────────────────────────────────────────
exports.instagramSyncScheduled = onSchedule(
  { schedule: '0 */6 * * *', region: 'us-central1', secrets: [INSTAGRAM_APP_SECRET] },
  async () => {
    const results = await Promise.allSettled(ALL_TENANTS.map(syncTenant));
    results.forEach((r, i) => {
      if (r.status === 'rejected') logger.error(`[Instagram] Error (${ALL_TENANTS[i]}):`, r.reason);
    });
  }
);

// ── Callable: sync manual desde el admin panel ─────────────────────
exports.instagramSyncManual = onCall(
  { region: 'us-central1', secrets: [INSTAGRAM_APP_SECRET] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');

    const tenantId = request.data?.tenantId || 'elegance';
    if (!ALL_TENANTS.includes(tenantId)) throw new HttpsError('invalid-argument', 'tenantId inválido.');

    const email = (request.auth.token?.email || '').toLowerCase();
    if (!BOOTSTRAP_ADMINS.includes(email)) {
      // 1) Rol por custom claims (patrón nuevo desde migrarClaimsExistentes).
      let rol = request.auth.token?.role || null;
      // 2) Fallback Firestore — importante: buscar en el path del tenant
      //    correcto. Para 'elegance' vive en raíz; para el resto está en
      //    tenants/{tid}/barberos/. Antes solo miraba root, así que los
      //    admins/barberos de tenants multi-tenant caían a permission-denied.
      if (!rol) {
        const barberoRef = tenantId === 'elegance'
          ? db.collection('barberos').doc(request.auth.uid)
          : db.collection('tenants').doc(tenantId).collection('barberos').doc(request.auth.uid);
        const barberoDoc = await barberoRef.get();
        rol = barberoDoc.exists ? barberoDoc.data().rol : null;
      }
      // 3) Habilitar admin, jefe Y barbero (equipo del local). Consistente
      //    con esStaff() de firestore.rules.
      if (!['admin', 'jefe', 'barbero'].includes(rol)) {
        throw new HttpsError('permission-denied', 'Solo el equipo del local puede sincronizar.');
      }
    }

    return syncTenant(tenantId);
  }
);
