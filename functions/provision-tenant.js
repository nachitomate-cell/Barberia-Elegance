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
const { FieldValue }         = require('firebase-admin/firestore');

const db = admin.firestore();

const BASE_DOMAIN = 'synaptechspa.cl';

/* ─────────────────────────── Slugs reservados ───────────────────────────
   Los tenants existentes viven en código (config.js/_tenants, DOMAIN_MAP)
   y NO tienen doc raíz en /tenants, así que la existencia del doc no basta
   para detectar colisión: esta lista es la fuente de verdad para ellos.
   Mantener sincronizada al agregar tenants a medida. */
const SLUGS_RESERVADOS = new Set([
  // Tenants a medida actuales (ids internos)
  'elegance', 'ferraza', 'gitana', 'mapubarbershop', 'chameleon', 'lumen',
  'delnero', 'marcelo_hairdressing', 'aura', 'latincaribe', 'yugen', 'machos',
  'infinity', 'sionbarberia', 'omegastudio', 'memphis', 'alfamen',
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
  const slug = normalizarSlug(req.data && req.data.slug);
  if (!slug) return { ok: true, libre: false, motivo: 'Escribe una dirección.' };
  const r = await chequearSlug(slug);
  return { ok: true, slug, libre: r.libre, motivo: r.motivo || null };
});

/* ─────────────────── Callable: aprovisionar tenant ─────────────────── */

exports.provisionarTenantSelf = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Crea tu cuenta antes de activar la agenda.');
  }
  const uid   = req.auth.uid;
  const email = String(req.auth.token.email || '').toLowerCase();

  const raw      = req.data || {};
  const slug     = normalizarSlug(raw.slug);
  const nombre   = String(raw.nombre || '').trim().slice(0, 60);
  const tipoRaw  = String(raw.tipo || '').trim();
  const telefono = String(raw.telefono || '').replace(/\D/g, '').slice(0, 15);
  const colorRaw = String(raw.color || '').trim();
  const instagram = String(raw.instagram || '').trim().replace(/^@+/, '').slice(0, 40);
  const nombreDueno = String(raw.nombreDueno || '').trim().slice(0, 60);

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

  const tenantRef = db.collection('tenants').doc(slug);
  const nombreCorto = nombre.split(/\s+/)[0];

  // 1. Doc raíz — reserva atómica del slug (create falla si ya existe).
  //    Público y no sensible: branding + plan. Lo consumen el edge middleware
  //    (resolución de subdominio + SEO) y config.js (window.SHOP).
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
      logoUrl:   null,
      dominio:   `${slug}.${BASE_DOMAIN}`,
      origen:    'self-service',
      plan:      'free',
      estado:    'activo',
      ownerUid:  uid,
      ownerEmail: email || null,
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

  // 2. Subcolecciones + _system en batch (post-reserva; si algo falla a
  //    mitad, re-ejecutar cae en la rama idempotente de "previo").
  const batch = db.batch();
  const TS = FieldValue.serverTimestamp();

  const servicios = PLANTILLAS_SERVICIOS[tipo];
  const categorias = [...new Set(servicios.map((s) => s.categoria))];

  batch.set(tenantRef.collection('configuracion').doc('main'), {
    ...CONFIG_DEFAULT,
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
  const duenoNombre = nombreDueno || nombreCorto;
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

  await batch.commit();

  // 3. Claims de admin — directo, sin esperar la propagación del trigger
  //    sincronizarClaims (mismo patrón que los seeds de credenciales).
  await admin.auth().setCustomUserClaims(uid, { role: 'admin', tenantId: slug });

  logger.info(`[self-service] tenant creado: ${slug} ("${nombre}", tipo=${tipo}) owner=${email || uid}`);

  return {
    ok: true,
    slug,
    urlAgenda: `https://${slug}.${BASE_DOMAIN}`,
    urlPanel:  `https://${slug}.${BASE_DOMAIN}/gestion-interna/?local=${slug}`,
  };
});
