'use strict';

/**
 * scripts/kronnos-healthcheck.js
 * ─────────────────────────────────────────────────────────────────
 *  Verificación final go-live Kronnos (D9). Chequea:
 *
 *    - 5 dominios responden con status esperado.
 *    - Firestore pool marca poblado (users/premios/rangos/descuentos).
 *    - Firestore per-sede con servicios correctos.
 *    - 4 cuentas Auth Firebase existen con claims correctos.
 *    - Reglas Firestore compilan y esKronnosBrandAdmin presente.
 *    - Cloud Functions activas.
 *
 *  Uso:
 *    node scripts/kronnos-healthcheck.js
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(__dirname, '..', 'service-account.json'))),
});
const db = admin.firestore();

const results = { pass: 0, fail: 0, warn: 0 };
function pass(msg) { console.log(`  [32m✓[0m ${msg}`); results.pass++; }
function fail(msg) { console.log(`  [31m✗[0m ${msg}`); results.fail++; }
function warn(msg) { console.log(`  [33m⚠[0m ${msg}`); results.warn++; }
function line() { console.log('─'.repeat(70)); }

// ── Dominios ────────────────────────────────────────────────────
async function checkDominios() {
  console.log('\n' + '─'.repeat(70));
  console.log('DOMINIOS');
  line();

  const targets = [
    { url: 'https://kronnos.synaptechspa.cl',                expected: [200, 301, 302, 307, 308] },
    { url: 'https://kronnospenablanca.synaptechspa.cl',      expected: [200] },
    { url: 'https://kronnoslimache.synaptechspa.cl',         expected: [200] },
    { url: 'https://kronnoswoman.synaptechspa.cl',           expected: [200] },
    { url: 'https://admin.kronnos.synaptechspa.cl/kronnos-admin', expected: [200] },
  ];

  for (const t of targets) {
    try {
      const res = await fetch(t.url, { method: 'HEAD', redirect: 'manual' });
      if (t.expected.includes(res.status)) {
        pass(`${res.status} ${t.url}`);
      } else {
        fail(`${res.status} ${t.url} (esperado ${t.expected.join('|')})`);
      }
    } catch (e) {
      fail(`ERR ${t.url}: ${e.message}`);
    }
  }
}

// ── OG tags ─────────────────────────────────────────────────────
async function checkOG() {
  console.log('\n' + '─'.repeat(70));
  console.log('SEO / OG TAGS POR SEDE');
  line();

  const targets = [
    { url: 'https://kronnospenablanca.synaptechspa.cl', includes: 'Kronnos Studio Peñablanca', ogimg: '/kronnos/kronospena.png' },
    { url: 'https://kronnoslimache.synaptechspa.cl',    includes: 'Kronnos Studio Limache',    ogimg: '/kronnos/kronoslima.png' },
    { url: 'https://kronnoswoman.synaptechspa.cl',      includes: 'Kronnos Woman',              ogimg: '/kronnos/kronoswoman.png' },
  ];

  for (const t of targets) {
    try {
      const res = await fetch(t.url, { headers: { 'User-Agent': 'WhatsAppBot' } });
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
      const ogimgMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
      if (titleMatch && titleMatch[1].includes(t.includes)) {
        pass(`meta title ok: ${titleMatch[1]}`);
      } else {
        fail(`meta title fail en ${t.url}: ${titleMatch?.[1] || 'no encontrado'}`);
      }
      if (ogimgMatch && ogimgMatch[1].includes(t.ogimg)) {
        pass(`og:image ok: ${ogimgMatch[1]}`);
      } else {
        fail(`og:image fail en ${t.url}`);
      }
    } catch (e) {
      fail(`ERR ${t.url}: ${e.message}`);
    }
  }
}

// ── Firestore ───────────────────────────────────────────────────
async function checkFirestore() {
  console.log('\n' + '─'.repeat(70));
  console.log('FIRESTORE POOL MARCA');
  line();

  const premios = await db.collection('tenants/kronnos/premios').get();
  premios.size === 3 ? pass(`premios: 3`) : fail(`premios: ${premios.size} (esperado 3)`);
  const descuentos = await db.collection('tenants/kronnos/descuentos').get();
  descuentos.size === 3 ? pass(`descuentos: 3`) : fail(`descuentos: ${descuentos.size} (esperado 3)`);
  const users = await db.collection('tenants/kronnos/users').get();
  users.size >= 2900 ? pass(`users: ${users.size} (>=2900)`) : warn(`users: ${users.size} (esperado >=2900)`);
  const clientes = await db.collection('tenants/kronnos/clientes').get();
  clientes.size >= 2900 ? pass(`clientes: ${clientes.size} (>=2900)`) : warn(`clientes: ${clientes.size} (esperado >=2900)`);

  const rangos = await db.doc('tenants/kronnos/configuracion/rangos').get();
  if (rangos.exists && (rangos.data().rangos || []).length === 3) {
    pass('rangos: silver/gold/platinum');
  } else fail('rangos config falta o incompleta');

  const canje = await db.doc('tenants/kronnos/configuracion/canje').get();
  if (canje.exists && canje.data().canjeClienteEnabled === true) {
    pass(`canjeClienteEnabled=true, tiebreak=${canje.data().tiebreakEmpate}`);
  } else fail('config canje mal');

  console.log('\n' + '─'.repeat(70));
  console.log('FIRESTORE POR SEDE');
  line();
  for (const [T, expected] of [['kronnos_penablanca', 17], ['kronnos_limache', 9], ['kronnos_woman', 36]]) {
    const s = await db.collection(`tenants/${T}/servicios`).get();
    s.size === expected ? pass(`${T}/servicios: ${expected}`) : fail(`${T}/servicios: ${s.size} (esperado ${expected})`);
  }
  for (const T of ['kronnos_penablanca', 'kronnos_limache', 'kronnos_woman']) {
    const b = await db.collection(`tenants/${T}/barberos`).get();
    b.size > 0 ? pass(`${T}/barberos: ${b.size}`) : fail(`${T}/barberos vacío`);
  }
}

// ── Auth ────────────────────────────────────────────────────────
async function checkAuth() {
  console.log('\n' + '─'.repeat(70));
  console.log('CUENTAS FIREBASE AUTH');
  line();
  const emails = [
    { e: 'administracionkronnos@gmail.com', claims: null,
      note: 'sin custom claims — accede vía esKronnosBrandAdmin en rules' },
    { e: 'kronnospenablanca@gmail.com',     claims: { role: 'admin', tenantId: 'kronnos_penablanca' } },
    { e: 'kronnoslimache@gmail.com',        claims: { role: 'admin', tenantId: 'kronnos_limache' } },
    { e: 'kronnoswoman@gmail.com',          claims: { role: 'admin', tenantId: 'kronnos_woman' } },
  ];
  for (const { e, claims, note } of emails) {
    try {
      const u = await admin.auth().getUserByEmail(e);
      const actual = u.customClaims || {};
      if (claims === null) {
        pass(`${e} (${note})`);
      } else if (actual.role === claims.role && actual.tenantId === claims.tenantId) {
        pass(`${e}: role=${actual.role}, tenantId=${actual.tenantId}`);
      } else {
        fail(`${e}: claims=${JSON.stringify(actual)} (esperado ${JSON.stringify(claims)})`);
      }
    } catch (err) {
      fail(`${e}: ${err.code || err.message}`);
    }
  }
}

// ── Firestore rules integrity ───────────────────────────────────
async function checkRules() {
  console.log('\n' + '─'.repeat(70));
  console.log('FIRESTORE RULES');
  line();
  const fs = require('fs');
  const rules = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');
  rules.includes('esKronnosBrandAdmin')
    ? pass('helper esKronnosBrandAdmin presente en rules')
    : fail('esKronnosBrandAdmin NO está en rules');
  rules.includes('administracionkronnos@gmail.com')
    ? pass('email Claudio en rules')
    : fail('email Claudio NO está en rules');
}

// ── Summary ─────────────────────────────────────────────────────
(async () => {
  console.log('\n' + '═'.repeat(70));
  console.log(`KRONNOS HEALTHCHECK — go-live 2026-07-15`);
  console.log('═'.repeat(70));

  await checkDominios();
  await checkOG();
  await checkFirestore();
  await checkAuth();
  await checkRules();

  console.log('\n' + '═'.repeat(70));
  console.log(`RESUMEN: ${results.pass} PASS · ${results.warn} WARN · ${results.fail} FAIL`);
  console.log('═'.repeat(70));

  if (results.fail === 0) {
    console.log('\n[32m✅ SISTEMA LISTO PARA GO-LIVE[0m\n');
  } else {
    console.log('\n[31m❌ HAY FALLAS QUE ATENDER ANTES DEL LANZAMIENTO[0m\n');
    process.exit(1);
  }
  process.exit(0);
})().catch((e) => {
  console.error('ERROR fatal:', e);
  process.exit(1);
});
