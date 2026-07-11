'use strict';

// functions/admin-daily-digest.js
// ─────────────────────────────────────────────────────────────────
//  DAILY DIGEST — Push diaria al portal /admin (PWA)
//
//  A las 09:00 hora Santiago, agrega métricas de toda la red y
//  manda una sola push a los tokens de /admin_fcm_tokens.
//
//  Formato del push:
//    Título:  📊 Ayer: $2.4M · Hoy: 47 citas
//    Body:    12 locales operando · 2 soportes pendientes · 0 errores
//
//  Deploy:
//    firebase deploy --only functions:adminDailyDigest
// ─────────────────────────────────────────────────────────────────

const { onSchedule }         = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { dispatchAdminPush }  = require('./admin-push');

const TIMEZONE = 'America/Santiago';
const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com'];

// Mismo listado que alertas-financieras.js / cumpleanos.js.
// Cuando agregues un tenant, súmalo acá también.
const TENANTS = [
  { id: 'elegance',             root: ''                              },
  { id: 'gitana',               root: 'tenants/gitana/'               },
  { id: 'ferraza',              root: 'tenants/ferraza/'              },
  { id: 'chameleon',            root: 'tenants/chameleon/'            },
  { id: 'aura',                 root: 'tenants/aura/'                 },
  { id: 'lumen',                root: 'tenants/lumen/'                },
  { id: 'mapubarbershop',       root: 'tenants/mapubarbershop/'       },
  { id: 'delnero',              root: 'tenants/delnero/'              },
  { id: 'marcelo_hairdressing', root: 'tenants/marcelo_hairdressing/' },
  { id: 'machos',               root: 'tenants/machos/'               },
  { id: 'infinity',             root: 'tenants/infinity/'             },
  { id: 'sionbarberia',         root: 'tenants/sionbarberia/'         },
];

const PRECIO_FALLBACK = 15000; // mismo default que agenda.html cuando no hay precio

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Formato de dinero: $1.2M / $850k / $12.400 según magnitud. */
function fmtMoneyShort(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace('.', ',') + 'M';
  if (v >= 100_000)   return '$' + Math.round(v / 1000) + 'k';
  return '$' + v.toLocaleString('es-CL');
}

async function contarCitasDelDia(db, root, fechaStr) {
  try {
    const snap = await db.collection(`${root}citas`)
      .where('fecha', '==', fechaStr)
      .get();
    let total = 0, ingreso = 0;
    snap.forEach(d => {
      const c = d.data();
      const estado = String(c.estado || '').toLowerCase();
      if (estado.startsWith('cancelad')) return; // excluye Cancelada / Cancelado
      total++;
      ingreso += Number(c.precio) || PRECIO_FALLBACK;
    });
    return { total, ingreso };
  } catch (e) {
    logger.warn(`[digest] Error leyendo citas ${root} ${fechaStr}: ${e.message}`);
    return { total: 0, ingreso: 0 };
  }
}

async function contarSoportePendiente(db, root) {
  try {
    const snap = await db.collection(`${root}soporte_mensajes`)
      .where('leido', '==', false)
      .get();
    return snap.size;
  } catch (e) {
    return 0;
  }
}

async function contarErroresAbiertos(db) {
  try {
    const snap = await db.collection('system_errors')
      .where('status', '==', 'open')
      .get();
    return snap.size;
  } catch (e) {
    return 0;
  }
}

async function contarTenantsOperativos(db) {
  try {
    const snap = await db.collection('_system').get();
    let suspended = 0;
    snap.forEach(d => { if (d.data().status === 'suspended') suspended++; });
    return Math.max(0, TENANTS.length - suspended);
  } catch (e) {
    return TENANTS.length;
  }
}

/**
 * Corre el digest completo y devuelve { titulo, cuerpo, stats }.
 * No envía nada — separado del schedule para poder invocarlo de test.
 */
async function calcularDigest(db) {
  const now = new Date();
  // Ajuste a hora Santiago para calcular "ayer" y "hoy" correctos.
  const santiagoNow = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const hoy = santiagoNow;
  const ayer = new Date(santiagoNow);
  ayer.setDate(ayer.getDate() - 1);
  const hoyStr = ymd(hoy);
  const ayerStr = ymd(ayer);

  const [ayerAgg, hoyAgg, soporteAgg, tenantsOp, errores] = await Promise.all([
    Promise.all(TENANTS.map(t => contarCitasDelDia(db, t.root, ayerStr))),
    Promise.all(TENANTS.map(t => contarCitasDelDia(db, t.root, hoyStr))),
    Promise.all(TENANTS.map(t => contarSoportePendiente(db, t.root))),
    contarTenantsOperativos(db),
    contarErroresAbiertos(db),
  ]);

  const stats = {
    ayerIngreso:  ayerAgg.reduce((a, x) => a + x.ingreso, 0),
    ayerCitas:    ayerAgg.reduce((a, x) => a + x.total, 0),
    hoyCitas:     hoyAgg.reduce((a, x) => a + x.total, 0),
    soportePend:  soporteAgg.reduce((a, x) => a + x, 0),
    tenantsOp,
    errores,
    hoyStr,
    ayerStr,
  };

  const titulo = `📊 Ayer: ${fmtMoneyShort(stats.ayerIngreso)} · Hoy: ${stats.hoyCitas} cita${stats.hoyCitas === 1 ? '' : 's'}`;
  const partesCuerpo = [
    `${stats.tenantsOp} local${stats.tenantsOp === 1 ? '' : 'es'} operando`,
    stats.soportePend > 0
      ? `${stats.soportePend} soporte${stats.soportePend === 1 ? '' : 's'} pendiente${stats.soportePend === 1 ? '' : 's'}`
      : '0 soporte pendiente',
    stats.errores > 0
      ? `⚠️ ${stats.errores} error${stats.errores === 1 ? '' : 'es'}`
      : '0 errores',
  ];
  const cuerpo = partesCuerpo.join(' · ');

  return { titulo, cuerpo, stats };
}

async function tokensAdminActivos(db) {
  const snap = await db.collection('admin_fcm_tokens').where('activo', '==', true).limit(1).get();
  return !snap.empty;
}

async function correrDigest(db, messaging) {
  const hayTokens = await tokensAdminActivos(db);
  if (!hayTokens) {
    logger.info('[digest] Sin admin_fcm_tokens activos; se salta el envío.');
    return { skipped: true };
  }

  const { titulo, cuerpo, stats } = await calcularDigest(db);
  logger.info('[digest] Enviando:', { titulo, cuerpo, stats });

  const res = await dispatchAdminPush(db, messaging, {
    title: titulo,
    body:  cuerpo,
    url:   '/admin/',
    tag:   'admin-daily-digest',
    data: {
      tipo:         'daily_digest',
      ayerIngreso:  stats.ayerIngreso,
      ayerCitas:    stats.ayerCitas,
      hoyCitas:     stats.hoyCitas,
      soportePend:  stats.soportePend,
      tenantsOp:    stats.tenantsOp,
      errores:      stats.errores,
    },
  });
  return { skipped: false, ...res, titulo, cuerpo, stats };
}

// ── Schedule: cron diario 09:00 hora Santiago ──
exports.adminDailyDigest = onSchedule(
  { schedule: '0 9 * * *', timeZone: TIMEZONE, region: 'us-central1' },
  async () => {
    try {
      const res = await correrDigest(admin.firestore(), admin.messaging());
      logger.info('[digest] OK', res);
    } catch (e) {
      logger.error('[digest] Error:', e);
    }
  }
);

// ── Callable para preview / test manual desde /admin ──
// Uso en consola:
//   firebase.functions().httpsCallable('adminDigestPreview')({ enviar: true })
// { enviar:false } → devuelve el título/cuerpo sin mandar push.
exports.adminDigestPreview = onCall({ region: 'us-central1' }, async (request) => {
  const email = (request.auth?.token?.email || '').toLowerCase();
  if (!BOOTSTRAP_ADMINS.includes(email)) {
    throw new HttpsError('permission-denied', 'No autorizado.');
  }
  const db = admin.firestore();
  const messaging = admin.messaging();
  const enviar = request.data?.enviar === true;

  if (enviar) {
    const res = await correrDigest(db, messaging);
    return { ok: true, ...res };
  }
  const preview = await calcularDigest(db);
  return { ok: true, preview };
});
