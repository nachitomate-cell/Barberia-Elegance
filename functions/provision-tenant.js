'use strict';

// functions/provision-tenant.js
// ─────────────────────────────────────────────────────────────────────────────
//  SYNAPTECH SELF-SERVICE — aprovisionamiento automático de tenants.
//
//  Producto masivo (gratis, estilo "Setmore chileno"): el dueño de un local
//  entra a /crea, se registra con email+contraseña y en un solo paso queda
//  con su agenda funcionando en https://{slug}.synaptechspa.cl — sin que
//  SynapTech tenga que crear nada a mano. El servicio a medida (diseño
//  personalizado) sigue existiendo por el canal de siempre (empieza.html →
//  lead → Ignacio); este módulo NO lo toca.
//
//  Dos callables:
//    1. verificarSlugLibre     — check en vivo del subdominio elegido.
//    2. provisionarTenantSelf  — crea el tenant completo (requiere auth):
//         · tenants/{slug}                     doc raíz público (branding +
//           plan). Lo lee el edge middleware por REST para resolver el
//           subdominio y config.js para armar window.SHOP.
//         · tenants/{slug}/configuracion/main  horario default
//         · tenants/{slug}/servicios/*         plantilla según tipo de negocio
//         · tenants/{slug}/barberos/*          el dueño como admin atendiendo
//           (doc principal + doc de enlace por UID, patrón de la plataforma)
//         · tenants/{slug}/premios/*           1 premio de club default
//         · _system/{slug}                     estado para kill switch/billing
//         · Custom claims { role:'admin', tenantId: slug } al dueño
//
//  El doc raíz tenants/{slug} es legible públicamente (rules ya lo permiten)
//  y NO contiene datos sensibles: solo branding y plan.
//
//  DEPLOY:
//    firebase deploy --only functions:verificarSlugLibre,functions:provisionarTenantSelf
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const crypto                 = require('crypto');

const db = admin.firestore();

const BASE_DOMAIN = 'synaptechspa.cl';
const TRIAL_DIAS  = 14;

// Token de sesión para el handoff crea.synaptechspa.cl → {slug}.synaptechspa.cl.
// La sesión de Firebase Auth NO cruza subdominios (IndexedDB por origen), así
// que la callable devuelve un custom token (vida útil 1h, un solo uso práctico)
// y el LoginPage del panel lo consume con signInWithCustomToken. Si falla el
// mint, el flujo sigue sin token: el dueño entra con email+contraseña.
async function tokenHandoff(uid) {
  try { return await admin.auth().createCustomToken(uid); }
  catch (e) { logger.warn('[self-service] createCustomToken falló:', e.message); return null; }
}

/* ── Branding: logo/banner subidos en el Paso 3 del wizard ──────────────
   El cliente manda data URLs (ya reducidas por canvas) y el servidor las
   escribe en Storage con token de descarga estilo Firebase — todo server-side,
   sin tocar storage.rules ni depender de claims que aún no existen. Si el
   dueño no sube nada, los campos quedan null y cada superficie usa sus
   placeholders del sistema (iniciales en login, /syn-192.png como ícono,
   fondo neutro del hero). */
const IMG_DATAURL_RE = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/;
const IMG_MAX_BYTES  = 3 * 1024 * 1024;

async function subirImagenBranding(slug, tipo, dataUrl) {
  if (!dataUrl) return null;
  const m = String(dataUrl).match(IMG_DATAURL_RE);
  if (!m) throw new HttpsError('invalid-argument', `La imagen de ${tipo} no es válida. Usa PNG, JPG o WebP.`);
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length) return null;
  if (buf.length > IMG_MAX_BYTES) {
    throw new HttpsError('invalid-argument', `La imagen de ${tipo} pesa demasiado (máx 3 MB).`);
  }
  const ext   = (m[1] === 'jpeg' || m[1] === 'jpg') ? 'jpg' : m[1];
  const mime  = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const token = crypto.randomUUID();
  const path  = `tenants/${slug}/branding/${tipo}.${ext}`;
  const bucket = admin.storage().bucket();
  await bucket.file(path).save(buf, {
    metadata: {
      contentType:  mime,
      cacheControl: 'public, max-age=31536000',
      metadata:     { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/* ─────────────────────────── Slugs reservados ───────────────────────────
   Los tenants existentes viven en código (config.js/_tenants, DOMAIN_MAP)
   y NO tienen doc raíz en /tenants, así que la existencia del doc no basta
   para detectar colisión: esta lista es la fuente de verdad para ellos.
   Mantener sincronizada al agregar tenants a medida. */
const SLUGS_RESERVADOS = new Set([
  // Tenants a medida actuales (ids internos)
  'elegance', 'ferraza', 'gitana', 'mapubarbershop', 'chameleon', 'lumen',
  'delnero', 'marcelo_hairdressing', 'aura', 'latincaribe', 'yugen', 'machos',
  'infinity', 'sionbarberia', 'omega', 'memphis', 'alfamen',
  'deluxeperfumes', 'kronnos', 'kronnos_penablanca', 'kronnos_limache',
  'kronnos_woman', 'kronnos_lobby', 'barbersclub', 'elbarberomoderno',
  // Subdominios en uso (DOMAIN_MAP del middleware)
  'barberiaelegance', 'barberiaferraza', 'gitananails', 'chameleonbarber',
  'barberiadjones', 'djonesbarberia', 'delnerobarber', 'marcelohairdressing',
  'marcelo-hairdressing', 'marcelopalma', 'aurasalon', 'aurasalonmalegrooming',
  'thelatincaribe', 'yugenstudio', 'studiodieciseis', 'barberiasion',
  'kronnospenablanca', 'kronnoslimache', 'kronnoswoman', 'memphissalon',
  // Producto / sistema
  'www', 'admin', 'api', 'app', 'panel', 'links', 'bioo', 'bio', 'empieza',
  'crea', 'demo', 'ayuda', 'soporte', 'blog', 'mail', 'correo', 'test',
  'staging', 'dev', 'synaptech', 'synaptechspa', 'agenda', 'reservas',
  'gestion-interna', 'cliente', 'clientes', 'registro', 'dashboard',
]);

// 3-30 chars, minúsculas/números/guiones, sin guión al inicio/fin.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;

/* ─────────────────────── Plantillas de servicios ───────────────────────
   Precios CLP típicos por tipo de negocio. El dueño los edita después en
   gestión-interna/servicios; esto es para que la agenda nazca usable. */
const SVC = (nombre, precio, duracion, categoria, icono, orden) =>
  ({ nombre, precio, duracion, categoria, icono, activo: true, orden });

const PLANTILLAS_SERVICIOS = {
  barberia: [
    SVC('Corte de cabello',       12000, 45, 'Cortes', 'ph-scissors', 0),
    SVC('Corte + Barba',          18000, 60, 'Combos', 'ph-crown',    1),
    SVC('Barba',                   8000, 30, 'Barba',  'ph-mustache', 2),
    SVC('Perfilado de cejas',      3000, 10, 'Extras', 'ph-eye',      3),
    SVC('Corte niño',             10000, 30, 'Cortes', 'ph-smiley',   4),
  ],
  peluqueria: [
    SVC('Corte de cabello',       15000, 45, 'Cortes',      'ph-scissors',    0),
    SVC('Peinado',                12000, 40, 'Peinados',    'ph-sparkle',     1),
    SVC('Color raíz',             35000, 90, 'Color',       'ph-paint-brush', 2),
    SVC('Alisado / Brushing',     15000, 45, 'Tratamientos','ph-wind',        3),
    SVC('Hidratación capilar',    18000, 50, 'Tratamientos','ph-drop',        4),
  ],
  nails: [
    SVC('Manicure tradicional',   12000, 40, 'Manos', 'ph-hand',       0),
    SVC('Manicure permanente',    18000, 60, 'Manos', 'ph-sparkle',    1),
    SVC('Uñas acrílicas',         28000, 90, 'Manos', 'ph-diamond',    2),
    SVC('Pedicure',               15000, 50, 'Pies',  'ph-flower',     3),
    SVC('Retiro + mantención',    10000, 40, 'Manos', 'ph-magic-wand', 4),
  ],
  spa: [
    SVC('Limpieza facial',        25000, 60, 'Facial',  'ph-sparkle', 0),
    SVC('Masaje relajación',      28000, 60, 'Masajes', 'ph-leaf',    1),
    SVC('Masaje descontracturante', 32000, 60, 'Masajes', 'ph-fire',  2),
    SVC('Depilación cera',        12000, 30, 'Depilación', 'ph-drop', 3),
  ],
  mixto: [
    SVC('Corte hombre',           12000, 45, 'Cortes', 'ph-scissors',    0),
    SVC('Corte mujer',            15000, 50, 'Cortes', 'ph-scissors',    1),
    SVC('Barba',                   8000, 30, 'Barba',  'ph-mustache',    2),
    SVC('Color',                  35000, 90, 'Color',  'ph-paint-brush', 3),
    SVC('Peinado',                12000, 40, 'Otros',  'ph-sparkle',     4),
  ],
  otro: [
    SVC('Servicio 1',             10000, 30, 'Otro', 'ph-star',    0),
    SVC('Servicio 2',             15000, 45, 'Otro', 'ph-sparkle', 1),
    SVC('Servicio 3',             20000, 60, 'Otro', 'ph-crown',   2),
  ],
};

// Configuración operativa default (misma forma que _defaultConfig del cliente
// y que los seeds a medida): Lun-Sáb 10:00-20:00, slots de 30 min.
const CONFIG_DEFAULT = {
  horarioInicio:    '10:00',
  horarioFin:       '20:00',
  intervaloMinutos: 30,
  diasLaborales:    [1, 2, 3, 4, 5, 6],
  diasBloqueados:   [],
  colacion:         null,
  diasConfig:       {},
};

/* ─────────────────────────── Helpers ───────────────────────────

  Rate limit por IP (contra spam del self-service público). Firestore doc
  `_rate_limits/{clave}` con ventana rodante — al ser públicas ambas callables
  y sin App Check, un solo actor podría spammear cuentas de Auth (createUser
  se llama antes del provisioner) o intentar tomar slugs. Rechazamos al
  superar el tope con HttpsError('resource-exhausted') → el frontend muestra
  el mensaje tal cual. Bootstrap admin (Ignacio) queda exento.
*/
async function chequearLimite(clave, ventanaSeg, tope) {
  if (!clave) return;
  const ref = db.collection('_rate_limits').doc(clave);
  const ahora = Date.now();
  const inicio = ahora - ventanaSeg * 1000;
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : {};
      const hits = Array.isArray(data.hits) ? data.hits.filter((t) => t > inicio) : [];
      if (hits.length >= tope) {
        throw new HttpsError('resource-exhausted',
          'Demasiados intentos desde tu conexión. Espera unos minutos y vuelve a intentar.');
      }
      hits.push(ahora);
      tx.set(ref, { hits, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    // Si Firestore falla, no bloqueamos el flujo — solo perdemos rate limit
    // ese request. Es preferible perder protección que perder al cliente.
    logger.warn('[rate-limit] fallo transacción:', e.message);
  }
}

function ipDeRequest(req) {
  const raw = req && req.rawRequest;
  if (!raw) return null;
  const xff = String(raw.headers && raw.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || raw.ip || null;
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function normalizarSlug(raw) {
  return String(raw || '')
    .toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

/** Valida el slug. Devuelve { libre, motivo } — motivo solo si no está libre. */
async function chequearSlug(slug) {
  if (!SLUG_RE.test(slug)) {
    return { libre: false, motivo: 'Usa 3 a 30 caracteres: letras minúsculas, números y guiones.' };
  }
  if (SLUGS_RESERVADOS.has(slug)) {
    return { libre: false, motivo: 'Esa dirección no está disponible.' };
  }
  const snap = await db.collection('tenants').doc(slug).get();
  if (snap.exists) {
    return { libre: false, motivo: 'Esa dirección ya está tomada.' };
  }
  return { libre: true };
}

/* ─────────────────────── Callable: check de slug ─────────────────────── */

exports.verificarSlugLibre = onCall(async (req) => {
  // Cheap check: 40/min por IP (el input dispara uno cada 450ms al tipear).
  const ip = ipDeRequest(req);
  if (ip) await chequearLimite(`slug_${ip}`, 60, 40);

  const slug = normalizarSlug(req.data && req.data.slug);
  if (!slug) return { ok: true, libre: false, motivo: 'Escribe una dirección.' };
  const r = await chequearSlug(slug);
  return { ok: true, slug, libre: r.libre, motivo: r.motivo || null };
});

/* ─────────────────── Callable: aprovisionar tenant ─────────────────── */

/* ─────────── Callable: aprovisionar tenant desde /admin (EXPRESS) ───────────
   Alta "a medida express" hecha por SynapTech: crea el tenant COMPLETO sobre
   los mismos rieles dinámicos del self-service (middleware resuelve el
   subdominio desde tenants/{slug} — CERO ediciones de código), pero con lo que
   el self-service no cubre:
     · cuenta del DUEÑO creada por SynapTech (email+password para entregar)
     · _billing/{slug} con plan/monto/vencimiento (mensualidad desde el día 1)
     · servicios REALES del cliente (o plantilla por tipo si no se pasan)
     · equipo inicial (barberos sin cuenta; credenciales después vía Equipo)
   Objetivo: tenant funcionando en ~10 min. El tema CSS a medida y las fotos
   quedan como fase 2 opcional por cliente (no bloquean el go-live).
   Solo bootstrap (SynapTech). */

const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com'];

function passwordLegible(nombreCorto) {
  // Pronunciable + dígitos + símbolo: fácil de dictar por WhatsApp, no trivial.
  const silabas = ['ba', 'ce', 'di', 'fo', 'gu', 'ka', 'le', 'mi', 'no', 'pu', 'ra', 'se', 'ti', 'vo', 'zu'];
  let p = '';
  for (let i = 0; i < 3; i++) p += silabas[Math.floor(Math.random() * silabas.length)];
  const base = (nombreCorto || 'local').replace(/[^a-zA-Z]/g, '').slice(0, 6) || 'local';
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase()
    + '.' + p + Math.floor(100 + Math.random() * 900);
}

/* ─────────── Callable: importar negocio desde la competencia ───────────
   Pegas el link público de reservas del prospecto y devuelve los datos
   normalizados para prellenar el wizard del alta express. Proveedores:
     · Weibook (book.weibook.co/branch/...) — COMPLETO: identidad + teléfono +
       dirección + IG + color de marca + logo + servicios (precio/duración/
       categoría) + equipo. Todo viene server-rendered en su __NEXT_DATA__.
     · AgendaPro ({slug}.agendapro.com / {slug}.site.agendapro.com) — PARCIAL:
       identidad + descripción + logo + color + rubro (companyOverview del
       minisitio). Sus servicios cargan por API autenticada (401 público), así
       que se pegan a mano. `parcial: true` avisa al wizard.
   Solo bootstrap. Lee únicamente páginas públicas (lo mismo que ve un
   cliente en el navegador). */

const IMPORT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': IMPORT_UA, 'Accept-Language': 'es-CL,es;q=0.9' }, redirect: 'follow' });
  if (!res.ok) throw new HttpsError('not-found', `La página respondió ${res.status}. Revisa el link.`);
  return await res.text();
}

function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (_) { return null; }
}

function igHandle(v) {
  const m = String(v || '').match(/instagram\.com\/([A-Za-z0-9._]+)/);
  return m ? m[1] : (String(v || '').replace(/^@+/, '').trim() || null);
}

function tipoDesdeTexto(txt) {
  const t = String(txt || '').toLowerCase();
  if (/barber/.test(t)) return 'barberia';
  if (/pelu|hair|salon|salón/.test(t)) return 'peluqueria';
  if (/nail|uña|manicur/.test(t)) return 'nails';
  if (/spa|estetic|estétic|belleza/.test(t)) return 'spa';
  return 'barberia';
}

// Weibook solo expone IDs opacos de categoría (los nombres no viajan en la
// página), así que categorizamos por el nombre del servicio. Mismo espíritu
// que las categorías default de la plataforma.
function categoriaHeuristica(nombre) {
  const n = String(nombre || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/pack|combo|\by\b|\+/.test(n))              return 'Combos';
  if (/barba|bigote|afeitad/.test(n))             return 'Barba';
  if (/corte|fade|degradad/.test(n))              return 'Cortes';
  if (/color|tinte|mecha|platinad/.test(n))       return 'Color';
  if (/manicur|u(n|ñ)a|esmalt/.test(n))           return 'Manos';
  if (/pedicur/.test(n))                          return 'Pies';
  if (/masaje/.test(n))                           return 'Masajes';
  if (/limpieza facial|facial/.test(n))           return 'Facial';
  if (/ceja|pestan/.test(n))                      return 'Extras';
  if (/lavado|hidrata|tratamiento|keratina|alisad/.test(n)) return 'Tratamientos';
  return 'Otro';
}

async function importarWeibook(url) {
  const html = await fetchHtml(url);
  const data = nextData(html);
  const info = data && data.props && data.props.pageProps && data.props.pageProps.info;
  if (!info || !info.dataInfo) throw new HttpsError('not-found', 'No pude leer los datos de esa página de Weibook.');
  const d = info.dataInfo;

  const servicios = ((info.services && info.services.data) || [])
    .filter((s) => s && s.name && Number(s.cost) > 0)
    .map((s) => ({
      nombre:    String(s.name).trim().slice(0, 80),
      precio:    Math.round(Number(s.cost) || 0),
      duracion:  Math.max(5, Math.round(Number(s.min) || 30)),
      categoria: categoriaHeuristica(s.name),
    }));

  const equipo = ((info.collaborators && info.collaborators.data) || [])
    .map((c) => String((c && c.name) || '').trim())
    .filter(Boolean);

  const palette = (data.props.pageProps.themeConfig && data.props.pageProps.themeConfig.palette) || {};

  return {
    proveedor: 'weibook',
    parcial:   false,
    nombre:    String(d.name || '').trim(),
    slogan:    String(d.description || '').trim().slice(0, 120) || null,
    telefono:  String(d.telephone || '').replace(/\D/g, '') || null,
    direccion: String(d.address || '').trim().slice(0, 120) || null,
    instagram: igHandle(d.instagram),
    color:     /^#[0-9a-fA-F]{6}$/.test(String(palette.primary || '')) ? palette.primary : null,
    logoUrl:   String(d.portad_image || d.imageshare || '').trim() || null,
    // categoriesBusiness son strings planos (ej: ["Barbería","Salon de belleza"]).
    tipo:      tipoDesdeTexto((Array.isArray(d.categoriesBusiness) ? d.categoriesBusiness.join(' ') : '') || d.description),
    servicios,
    equipo,
  };
}

async function importarAgendaPro(url) {
  const u = new URL(url);
  const slug = u.hostname.split('.')[0];
  // location id: /sucursal/{id} o ?local={id}; si no viene, se pesca del HTML.
  let locId = (u.pathname.match(/\/sucursal\/(\d+)/) || [])[1] || u.searchParams.get('local') || null;
  if (!locId) {
    const landing = await fetchHtml(`https://${slug}.agendapro.com/cl`);
    locId = (landing.match(/location_id=(\d+)/) || landing.match(/sucursal\/(\d+)/) || [])[1] || null;
  }
  if (!locId) throw new HttpsError('not-found', 'No encontré la sucursal en ese link de AgendaPro. Pega el link que incluye ?local= o /sucursal/.');

  const html = await fetchHtml(`https://${slug}.site.agendapro.com/cl/sucursal/${locId}`);
  const data = nextData(html);
  const ov = data && data.props && data.props.pageProps && data.props.pageProps.companyOverview;
  if (!ov) throw new HttpsError('not-found', 'No pude leer los datos de ese minisitio de AgendaPro.');

  return {
    proveedor: 'agendapro',
    parcial:   true,
    nota:      'AgendaPro no publica los servicios en la página (API cerrada): pégalos a mano o pídele la lista al dueño.',
    nombre:    String(ov.name || '').trim(),
    slogan:    String(ov.description || '').trim().slice(0, 120) || null,
    telefono:  String(ov.phone || '').replace(/\D/g, '') || null,
    direccion: null,
    instagram: null,
    color:     /^#[0-9a-fA-F]{6}$/.test(String(ov.colorMinisite || '')) ? ov.colorMinisite : null,
    logoUrl:   String(ov.logo || '').trim() || null,
    tipo:      tipoDesdeTexto(ov.economicSector),
    servicios: [],
    equipo:    [],
  };
}

async function ejecutarImport(urlStr) {
  let url;
  try { url = new URL(String(urlStr || '').trim()); }
  catch (_) { throw new HttpsError('invalid-argument', 'Pega un link válido (https://…).'); }
  const host = url.hostname.toLowerCase();
  if (host === 'book.weibook.co' || host.endsWith('.weibook.co')) {
    return await importarWeibook(url.href);
  }
  if (host.endsWith('agendapro.com')) {
    return await importarAgendaPro(url.href);
  }
  throw new HttpsError('invalid-argument', 'Proveedor no soportado aún. Hoy: Weibook y AgendaPro.');
}

// Bootstrap: solo SynapTech (uso en /admin alta express).
exports.importarNegocioExterno = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const callerEmail = String((req.auth && req.auth.token && req.auth.token.email) || '').toLowerCase();
  if (!req.auth || !BOOTSTRAP_ADMINS.includes(callerEmail)) {
    throw new HttpsError('permission-denied', 'Solo SynapTech puede importar negocios.');
  }
  const out = await ejecutarImport(req.data && req.data.url);
  logger.info(`[importar] ${out.proveedor} "${out.nombre}" servicios=${out.servicios.length} equipo=${out.equipo.length}`);
  return { ok: true, ...out };
});

/* Versión pública (sin auth) para el wizard self-service en crea.synaptechspa.cl:
   el dueño pega su link de Weibook/AgendaPro antes de tener cuenta y el
   wizard prellena todos los campos. Solo lee páginas públicas — nada que un
   scraper anónimo no pueda hacer igual — y tiene rate limit por IP (20/hora)
   contra abuso. NO acepta URLs raras: solo whitelist de proveedores. */
exports.importarNegocioExternoPublic = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const ip = ipDeRequest(req);
  if (ip) await chequearLimite(`import_${ip}`, 3600, 20);
  const out = await ejecutarImport(req.data && req.data.url);
  logger.info(`[importar-public] ${out.proveedor} "${out.nombre}" ip=${ip || '-'} servicios=${out.servicios.length}`);
  return { ok: true, ...out };
});

exports.provisionarTenantAdmin = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const callerEmail = String((req.auth && req.auth.token && req.auth.token.email) || '').toLowerCase();
  if (!req.auth || !BOOTSTRAP_ADMINS.includes(callerEmail)) {
    throw new HttpsError('permission-denied', 'Solo SynapTech puede crear tenants desde /admin.');
  }

  const raw       = req.data || {};
  const slug      = normalizarSlug(raw.slug);
  const nombre    = String(raw.nombre || '').trim().slice(0, 60);
  const tipoRaw   = String(raw.tipo || '').trim();
  const telefono  = String(raw.telefono || '').replace(/\D/g, '').slice(0, 15);
  const direccion = String(raw.direccion || '').trim().slice(0, 120) || null;
  const slogan    = String(raw.slogan || '').trim().slice(0, 120) || null;
  const instagram = String(raw.instagram || '').trim().replace(/^@+/, '').slice(0, 40) || null;
  const colorRaw  = String(raw.color || '').trim();
  const logoUrl   = /^https?:\/\/\S+$/.test(String(raw.logoUrl || '').trim()) ? String(raw.logoUrl).trim() : null;

  if (!nombre) throw new HttpsError('invalid-argument', 'Falta el nombre del local.');
  if (!slug)   throw new HttpsError('invalid-argument', 'Falta el slug.');
  const tipo  = PLANTILLAS_SERVICIOS[tipoRaw] ? tipoRaw : 'barberia';
  const color = /^#[0-9a-fA-F]{6}$/.test(colorRaw) ? colorRaw.toLowerCase() : null;

  // ── Dueño ──
  const dueno       = raw.dueno || {};
  const duenoNombre = String(dueno.nombre || '').trim().slice(0, 60) || nombre.split(/\s+/)[0];
  const duenoEmail  = String(dueno.email || '').trim().toLowerCase();
  const duenoAtiende = dueno.atiende !== false;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(duenoEmail)) {
    throw new HttpsError('invalid-argument', 'Email del dueño inválido.');
  }

  const check = await chequearSlug(slug);
  if (!check.libre) throw new HttpsError('already-exists', check.motivo);

  // Cuenta del dueño: reusar si existe (validando que no pertenezca a OTRO
  // local), crear si no. La password solo se devuelve cuando la creamos acá.
  let ownerUid, passwordEntregada = null, cuentaNueva = false;
  try {
    const u = await admin.auth().getUserByEmail(duenoEmail);
    const c = u.customClaims || {};
    if (c.tenantId && c.tenantId !== slug) {
      throw new HttpsError('failed-precondition',
        `Ese email ya pertenece al local "${c.tenantId}". Usa otro correo para el dueño.`);
    }
    ownerUid = u.uid;
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    if (e.code !== 'auth/user-not-found') {
      throw new HttpsError('internal', `Auth: ${e.message}`);
    }
    passwordEntregada = String(dueno.password || '').trim() || passwordLegible(nombre.split(/\s+/)[0]);
    if (passwordEntregada.length < 6) {
      throw new HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
    }
    const nuevo = await admin.auth().createUser({
      email: duenoEmail, password: passwordEntregada, displayName: duenoNombre,
    });
    ownerUid = nuevo.uid;
    cuentaNueva = true;
  }

  // ── Servicios: los reales del cliente, o la plantilla del tipo ──
  const svcRaw = Array.isArray(raw.servicios) ? raw.servicios : [];
  const serviciosCustom = svcRaw
    .map((s, i) => ({
      nombre:    String((s && s.nombre) || '').trim().slice(0, 80),
      precio:    Math.max(0, Math.round(Number(s && s.precio) || 0)),
      duracion:  Math.max(5, Math.min(480, Math.round(Number(s && s.duracion) || 30))),
      categoria: String((s && s.categoria) || '').trim().slice(0, 40) || 'Otro',
      icono:     'ph-scissors',
      activo:    true,
      orden:     i,
    }))
    .filter(s => s.nombre && s.precio > 0)
    .slice(0, 60);
  const servicios = serviciosCustom.length ? serviciosCustom : PLANTILLAS_SERVICIOS[tipo];

  // ── Equipo extra (barberos sin cuenta) ──
  const equipo = (Array.isArray(raw.equipo) ? raw.equipo : [])
    .map(n => String(n || '').trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 20);

  // ── Billing ──
  const billing = raw.billing || {};
  const monto   = Math.max(0, Math.round(Number(billing.monto) || 0));
  const plan    = String(billing.plan || '').trim().slice(0, 60) || null;
  const fpp     = /^\d{4}-\d{2}-\d{2}$/.test(String(billing.fechaProximoPago || '')) ? billing.fechaProximoPago : null;

  const tenantRef = db.collection('tenants').doc(slug);
  const nombreCorto = nombre.split(/\s+/)[0];

  // 1. Doc raíz — reserva atómica del slug (mismo patrón que el self-service).
  await db.runTransaction(async (tx) => {
    const cur = await tx.get(tenantRef);
    if (cur.exists) throw new HttpsError('already-exists', 'Esa dirección ya está tomada.');
    tx.create(tenantRef, {
      slug, nombre, nombreCorto, tipo,
      telefono: telefono || null,
      color, instagram, slogan, direccion, logoUrl,
      dominio:   `${slug}.${BASE_DOMAIN}`,
      origen:    'admin-express',
      plan:      plan || 'a-medida',
      estado:    'activo',
      ownerUid,
      ownerEmail: duenoEmail,
      altaPor:    callerEmail,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  // 2. Subcolecciones + _system + _billing en batch.
  const batch = db.batch();
  const TS = FieldValue.serverTimestamp();
  const categorias = [...new Set(servicios.map((s) => s.categoria))];

  batch.set(tenantRef.collection('configuracion').doc('main'), {
    ...CONFIG_DEFAULT,
    telefonoAdmin: telefono || null,
    categoriasServicio: [...categorias, 'Otro'].filter((c, i, a) => a.indexOf(c) === i),
    updatedAt: TS,
  });
  batch.set(tenantRef.collection('settings').doc('general'), {
    nombre,
    direccion: direccion || '',
    telefono:  telefono || '',
    instagram: instagram || '',
    emailAvisos: duenoEmail,
    updatedAt: TS,
  });

  servicios.forEach((svc, i) => {
    batch.set(tenantRef.collection('servicios').doc(`svc-${slug}-${i}`), {
      ...svc, createdAt: TS, updatedAt: TS,
    });
  });

  // Dueño: admin. Si atiende, aparece en la agenda; si no, solo administra.
  const mainBarberoRef = tenantRef.collection('barberos').doc(`dueno-${slug}`);
  batch.set(mainBarberoRef, {
    nombre:     duenoNombre,
    email:      duenoEmail,
    rol:        'admin',
    esBarbero:  duenoAtiende,
    activo:     true,
    disponible: duenoAtiende,
    uid:        ownerUid,
    authUid:    ownerUid,
    creadoEn:   TS,
  });
  batch.set(mainBarberoRef.collection('configuracion').doc('main'), {
    ...CONFIG_DEFAULT, updatedAt: TS,
  });
  batch.set(tenantRef.collection('barberos').doc(ownerUid), {
    _mainDocId: `dueno-${slug}`,
    uid: ownerUid,
    email: duenoEmail,
    nombre: duenoNombre,
    rol: 'admin',
    activo: true,
  });

  equipo.forEach((nombreBarbero, i) => {
    batch.set(tenantRef.collection('barberos').doc(`barbero-${slug}-${i + 1}`), {
      nombre: nombreBarbero,
      rol: 'barbero',
      activo: true,
      disponible: true,
      foto: null,
      creadoEn: TS,
    });
  });

  batch.set(tenantRef.collection('premios').doc(`premio-${slug}-1`), {
    nombre: 'Servicio gratis', costoSellos: 10, activo: true, creadoEn: TS,
  });

  batch.set(db.collection('_system').doc(slug), {
    status: 'active',
    plan:   plan || 'a-medida',
    origen: 'admin-express',
    tenantNombre: nombre,
    creadoEn: TS,
  });

  if (monto > 0 || plan) {
    batch.set(db.collection('_billing').doc(slug), {
      estadoPago:      'al_dia',
      montoPendiente:  monto,
      ...(plan ? { plan } : {}),
      ...(fpp  ? { fechaProximoPago: fpp } : {}),
      emailCobro:      duenoEmail,
      creadoEn:        TS,
    }, { merge: true });
  }

  await batch.commit();

  // 3. Claims del dueño (directo, sin esperar triggers).
  await admin.auth().setCustomUserClaims(ownerUid, { role: 'admin', tenantId: slug });

  // 4. Auto-provisionar el fantasma QA si está activo en el maestro. Silencioso
  //    ante errores — no queremos que un fallo del QA rompa la alta del tenant.
  try {
    const { provisionarQaEnTenant } = require('./qa-fantasma');
    await provisionarQaEnTenant(slug);
  } catch (err) {
    logger.warn(`[admin-express] provision QA falló (no crítico):`, err.message);
  }

  logger.info(`[admin-express] tenant creado: ${slug} ("${nombre}", tipo=${tipo}) dueño=${duenoEmail} por=${callerEmail}`);

  return {
    ok: true,
    slug,
    urlAgenda: `https://${slug}.${BASE_DOMAIN}`,
    urlPanel:  `https://${slug}.${BASE_DOMAIN}/gestion-interna/?local=${slug}`,
    dueno: {
      email: duenoEmail,
      password: passwordEntregada,   // null si la cuenta ya existía
      cuentaNueva,
    },
    resumen: {
      servicios: servicios.length,
      serviciosDeplantilla: serviciosCustom.length === 0,
      equipo: equipo.length,
      billing: monto > 0 || !!plan,
    },
  };
});

exports.provisionarTenantSelf = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Crea tu cuenta antes de activar la agenda.');
  }
  const uid   = req.auth.uid;
  const email = String(req.auth.token.email || '').toLowerCase();

  // Rate limit por IP (3 provisions/hora). El bootstrap admin queda exento
  // para que Ignacio pueda demoar en vivo sin bloquearse. La rama
  // idempotente (mismo owner refresca) NO cuenta porque se retorna antes.
  if (!BOOTSTRAP_ADMINS.includes(email)) {
    const ip = ipDeRequest(req);
    if (ip) await chequearLimite(`prov_${ip}`, 3600, 3);
  }

  const raw      = req.data || {};
  const slug     = normalizarSlug(raw.slug);
  const nombre   = String(raw.nombre || '').trim().slice(0, 60);
  const tipoRaw  = String(raw.tipo || '').trim();
  const telefono = String(raw.telefono || '').replace(/\D/g, '').slice(0, 15);
  const colorRaw = String(raw.color || '').trim();
  const instagram = String(raw.instagram || '').trim().replace(/^@+/, '').slice(0, 40);
  const nombreDueno = String(raw.nombreDueno || '').trim().slice(0, 60);
  // Tema visual del Paso 3: 'aura' (claro) o 'chameleon' (oscuro premium).
  // Cualquier otra cosa → null = plantilla neutra oscura de siempre.
  const temaRaw = String(raw.tema || '').trim().toLowerCase();
  const tema    = (temaRaw === 'aura' || temaRaw === 'chameleon') ? temaRaw : null;

  // Evidencia de aceptación B2B (contrato SaaS + DPA + privacidad). El
  // frontend (crea.html) obliga el checkbox y lo envía en raw.acepto. Si
  // falta → no se puede provisionar el tenant (Ley 21.719: consentimiento
  // previo). Se persisten los documentos aceptados en el tenant doc para
  // atender solicitudes ARCO y demostrar que el usuario aceptó una
  // versión concreta y no una posterior.
  const acepto = raw.acepto || {};
  const terminosVersion = String(acepto.version || '').trim();
  if (!terminosVersion) {
    throw new HttpsError('failed-precondition',
      'Debes aceptar el Contrato SaaS, el Anexo DPA y la Política de Privacidad antes de crear tu local.');
  }
  const userAgentSignup    = String(acepto.ua || '').slice(0, 500) || null;
  const documentosAceptados = Array.isArray(acepto.documentos)
    ? acepto.documentos.map(String).slice(0, 20)
    : [];

  // Servicios importados (Weibook completo). Si vienen del import del
  // wizard, se usan tal cual — el dueño ve su catálogo REAL en el panel día
  // 1, no una plantilla genérica. Fallback: PLANTILLAS_SERVICIOS[tipo].
  // Mismo formato que provisionarTenantAdmin (line 503-516).
  const svcRaw = Array.isArray(raw.serviciosCustom) ? raw.serviciosCustom : [];
  const serviciosCustom = svcRaw
    .map((s, i) => ({
      nombre:    String(s?.nombre || '').trim().slice(0, 80),
      precio:    Math.max(0, Math.round(Number(s?.precio) || 0)),
      duracion:  Math.max(5, Math.round(Number(s?.duracion) || 30)),
      categoria: String(s?.categoria || 'Otro').trim().slice(0, 40) || 'Otro',
      icono:     'ph-scissors',
      activo:    true,
      orden:     i,
    }))
    .filter((s) => s.nombre && s.precio > 0)
    .slice(0, 60);

  // Equipo importado (colaboradores del negocio de la competencia). Se
  // crean como barberos sin cuenta; el dueño les asigna credenciales luego
  // desde Equipo. Se dedupe contra el nombre del dueño.
  const eqRaw = Array.isArray(raw.equipoCustom) ? raw.equipoCustom : [];
  const equipoCustom = eqRaw
    .map((n) => String(n || '').trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 20);

  // Horario del wizard: si el dueño lo especifica, sobreescribe CONFIG_DEFAULT.
  // Formato esperado: { horaInicio: 'HH:MM', horaFin: 'HH:MM', dias: [0-6] }.
  const horarioRaw = raw.horario || {};
  const horarioCustom = {};
  const hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (typeof horarioRaw.horaInicio === 'string' && hhmm.test(horarioRaw.horaInicio)) {
    horarioCustom.horarioInicio = horarioRaw.horaInicio;
  }
  if (typeof horarioRaw.horaFin === 'string' && hhmm.test(horarioRaw.horaFin)) {
    horarioCustom.horarioFin = horarioRaw.horaFin;
  }
  if (Array.isArray(horarioRaw.dias)) {
    const dias = [...new Set(horarioRaw.dias
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    )].sort();
    if (dias.length) horarioCustom.diasLaborales = dias;
  }

  // Atribución (vendedor + UTM). ref se sanitiza a slug: solo alfanumérico
  // + guiones bajos/medios, máx 32 chars. Se guarda para comisiones y
  // análisis de canal; nada bloqueante si falta.
  const atribucionRaw = raw.atribucion || {};
  const atribucion = {
    ref:          String(atribucionRaw.ref || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32) || null,
    utm_source:   String(atribucionRaw.utm_source   || '').slice(0, 60) || null,
    utm_medium:   String(atribucionRaw.utm_medium   || '').slice(0, 60) || null,
    utm_campaign: String(atribucionRaw.utm_campaign || '').slice(0, 80) || null,
    referrer:     String(atribucionRaw.referrer     || '').slice(0, 200) || null,
    landedAt:     String(atribucionRaw.landedAt     || '').slice(0, 30) || null,
  };

  if (!nombre)   throw new HttpsError('invalid-argument', 'Falta el nombre de tu local.');
  if (!slug)     throw new HttpsError('invalid-argument', 'Falta la dirección web (slug).');
  if (!telefono || telefono.length < 8) {
    throw new HttpsError('invalid-argument', 'Ingresa un WhatsApp válido.');
  }
  const tipo  = PLANTILLAS_SERVICIOS[tipoRaw] ? tipoRaw : 'barberia';
  const color = /^#[0-9a-fA-F]{6}$/.test(colorRaw) ? colorRaw.toLowerCase() : null;

  // Un local por cuenta. Si esta cuenta ya creó uno, devolvemos el existente
  // (idempotente para el UX: refrescar la página no duplica ni rompe).
  const previo = await db.collection('tenants')
    .where('ownerUid', '==', uid).limit(1).get();
  if (!previo.empty) {
    const pSlug = previo.docs[0].id;
    return {
      ok: true, yaExistia: true, slug: pSlug,
      urlAgenda: `https://${pSlug}.${BASE_DOMAIN}`,
      urlPanel:  `https://${pSlug}.${BASE_DOMAIN}/gestion-interna/?local=${pSlug}`,
      token: await tokenHandoff(uid),
    };
  }

  // Una cuenta que ya pertenece a otro local (barbero/admin de un tenant a
  // medida) no puede convertirse en dueña de uno nuevo: los claims son 1:1.
  const user = await admin.auth().getUser(uid);
  const claims = user.customClaims || {};
  if (claims.tenantId && claims.tenantId !== slug) {
    throw new HttpsError('failed-precondition',
      'Esta cuenta ya pertenece a otro local. Usa un correo distinto.');
  }

  const check = await chequearSlug(slug);
  if (!check.libre) throw new HttpsError('already-exists', check.motivo);

  // Branding subido en el wizard (después del check de slug para no subir
  // basura de slugs tomados; si la reserva atómica de abajo pierde la
  // carrera, se limpian los archivos).
  const logoUrl   = await subirImagenBranding(slug, 'logo',   raw.logoBase64);
  const bannerUrl = await subirImagenBranding(slug, 'banner', raw.bannerBase64);

  const tenantRef = db.collection('tenants').doc(slug);
  const nombreCorto = nombre.split(/\s+/)[0];
  const duenoNombre = nombreDueno || nombreCorto;

  // Trial de 14 días desde el alta. `estado:'activo'` sigue siendo el kill
  // switch del edge (middleware corta con 'suspendido'); `status`/`trialFinaliza`
  // son el estado COMERCIAL. El espejo en _billing alimenta opsSummaryApi
  // (active_trials) sin activar los crons de Wallo (filtran walletActivo).
  const trialFinaliza = Timestamp.fromMillis(Date.now() + TRIAL_DIAS * 86400000);

  // 1. Doc raíz — reserva atómica del slug (create falla si ya existe).
  //    Público y no sensible: branding + plan. Lo consumen el edge middleware
  //    (resolución de subdominio + SEO) y config.js (window.SHOP).
  try {
  await db.runTransaction(async (tx) => {
    const cur = await tx.get(tenantRef);
    if (cur.exists) throw new HttpsError('already-exists', 'Esa dirección ya está tomada.');
    tx.create(tenantRef, {
      slug,
      nombre,
      nombreCorto,
      tipo,
      telefono,
      color,
      instagram: instagram || null,
      slogan:    null,
      direccion: null,
      logoUrl,
      bannerUrl,
      tema,
      dominio:   `${slug}.${BASE_DOMAIN}`,
      origen:    'self-service',
      plan:      'free',
      estado:    'activo',
      status:        'trial',
      trialFinaliza,
      contacto: {
        nombre:   duenoNombre,
        email:    email || null,
        whatsapp: telefono,
      },
      ownerUid:  uid,
      ownerEmail: email || null,
      atribucion,
      refVendedor: atribucion.ref,
      // Evidencia B2B del contrato SaaS + DPA + política de privacidad al alta.
      aceptoTerminosAt:    FieldValue.serverTimestamp(),
      aceptoPrivacidadAt:  FieldValue.serverTimestamp(),
      terminosVersion,
      documentosAceptados,
      signupUserAgent:     userAgentSignup,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  } catch (e) {
    // Perdió la carrera del slug después de subir imágenes: no dejar huérfanos.
    if (logoUrl || bannerUrl) {
      try { await admin.storage().bucket().deleteFiles({ prefix: `tenants/${slug}/branding/` }); }
      catch (_) { /* limpieza best-effort */ }
    }
    throw e;
  }

  // 2. Subcolecciones + _system en batch (post-reserva; si algo falla a
  //    mitad, re-ejecutar cae en la rama idempotente de "previo").
  const batch = db.batch();
  const TS = FieldValue.serverTimestamp();

  const servicios = serviciosCustom.length ? serviciosCustom : PLANTILLAS_SERVICIOS[tipo];
  const categorias = [...new Set(servicios.map((s) => s.categoria))];

  batch.set(tenantRef.collection('configuracion').doc('main'), {
    ...CONFIG_DEFAULT,
    ...horarioCustom,
    telefonoAdmin: telefono,
    categoriasServicio: [...categorias, 'Otro'].filter((c, i, a) => a.indexOf(c) === i),
    updatedAt: TS,
  });

  servicios.forEach((svc, i) => {
    batch.set(tenantRef.collection('servicios').doc(`svc-${slug}-${i}`), {
      ...svc, createdAt: TS, updatedAt: TS,
    });
  });

  // El dueño parte como admin QUE ATIENDE (caso típico: dueño solo). Puede
  // sumar equipo o marcarse no reservable después en gestión-interna/equipo.
  const mainBarberoRef = tenantRef.collection('barberos').doc(`dueno-${slug}`);
  batch.set(mainBarberoRef, {
    nombre:     duenoNombre,
    email:      email || null,
    rol:        'admin',
    activo:     true,
    disponible: true,
    uid,
    creadoEn:   TS,
  });
  batch.set(mainBarberoRef.collection('configuracion').doc('main'), {
    ...CONFIG_DEFAULT, updatedAt: TS,
  });
  // Doc de enlace por UID (patrón plataforma: triggers/queries indexan por uid).
  batch.set(tenantRef.collection('barberos').doc(uid), {
    _mainDocId: `dueno-${slug}`,
    uid,
    email:  email || null,
    nombre: duenoNombre,
    rol:    'admin',
    activo: true,
  });

  // Equipo importado (Weibook): se crean sin cuenta — el dueño les asigna
  // credenciales cuando quiera desde Equipo. Dedupe contra el dueño.
  const nombreDuenoNorm = String(duenoNombre || '').toLowerCase().trim();
  equipoCustom
    .filter((n) => n.toLowerCase().trim() !== nombreDuenoNorm)
    .forEach((nombre, i) => {
      const docId = `equipo-${slug}-${i + 1}`;
      const ref = tenantRef.collection('barberos').doc(docId);
      batch.set(ref, {
        nombre,
        email:      null,
        rol:        'barbero',
        activo:     true,
        disponible: true,
        importado:  true,
        creadoEn:   TS,
      });
      batch.set(ref.collection('configuracion').doc('main'), {
        ...CONFIG_DEFAULT, ...horarioCustom, updatedAt: TS,
      });
    });

  batch.set(tenantRef.collection('premios').doc(`premio-${slug}-1`), {
    nombre: 'Servicio gratis', costoSellos: 10, activo: true, creadoEn: TS,
  });

  // Kill switch / billing (TenantContext lee status === 'suspended').
  batch.set(db.collection('_system').doc(slug), {
    status: 'active',
    plan:   'free',
    origen: 'self-service',
    tenantNombre: nombre,
    creadoEn: TS,
  });

  // Espejo comercial del trial: opsSummaryApi cuenta active_trials desde
  // _billing.trialFinaliza. estadoPago 'trial' no gatilla la escalera de
  // cobranza (solo reacciona a 'atrasado' / cuotas impagas).
  batch.set(db.collection('_billing').doc(slug), {
    estadoPago:     'trial',
    trialFinaliza,
    montoPendiente: 0,
    emailCobro:     email || null,
    origen:         'self-service',
    refVendedor:    atribucion.ref,
    utmSource:      atribucion.utm_source,
    utmCampaign:    atribucion.utm_campaign,
    creadoEn:       TS,
  }, { merge: true });

  await batch.commit();

  // 3. Claims de admin — directo, sin esperar la propagación del trigger
  //    sincronizarClaims (mismo patrón que los seeds de credenciales).
  await admin.auth().setCustomUserClaims(uid, { role: 'admin', tenantId: slug });

  // 4. Auto-provisionar el fantasma QA si está activo en el maestro. Silencioso.
  try {
    const { provisionarQaEnTenant } = require('./qa-fantasma');
    await provisionarQaEnTenant(slug);
  } catch (err) {
    logger.warn(`[self-service] provision QA falló (no crítico):`, err.message);
  }

  logger.info(`[self-service] tenant creado: ${slug} ("${nombre}", tipo=${tipo}) owner=${email || uid} ref=${atribucion.ref || '-'} utm=${atribucion.utm_source || '-'}`);

  return {
    ok: true,
    slug,
    urlAgenda: `https://${slug}.${BASE_DOMAIN}`,
    urlPanel:  `https://${slug}.${BASE_DOMAIN}/gestion-interna/?local=${slug}`,
    token: await tokenHandoff(uid),
  };
});
