// Tests unitarios de upsertCliente contra Firestore REAL del tenant delnero.
// Corre el handler puro (sin round-trip a la CF deployada) — más rápido y
// aísla la lógica del transporte HTTPS.
//
// Uso:
//   cd functions && node _test-upsert-delnero.mjs
//
// Cleanup: al final borra todos los docs con prefijo TEST_MARKER en el nombre.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

// Import CJS module (upsert-cliente.js es CommonJS) desde ESM
const require = createRequire(import.meta.url);
const { _upsertClienteCore } = require('./upsert-cliente.js');

const T = 'delnero';
const TEST_MARKER = 'ZZ_TEST_UPSERT_';  // prefix único para cleanup

let pass = 0, fail = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else      { fail++; failures.push(msg); console.log(`  ✗ ${msg}`); }
}

async function testCase(nombre, fn) {
  console.log(`\n─── ${nombre} ───`);
  try {
    await fn();
  } catch (err) {
    fail++;
    failures.push(`${nombre}: ${err.message}`);
    console.log(`  ✗ EXCEPCIÓN: ${err.message}`);
  }
}

// Helpers
function marker(suffix) { return `${TEST_MARKER}${suffix}`; }
async function getDoc(uid) {
  const snap = await db.doc(`tenants/${T}/users/${uid}`).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

console.log(`\n═══════════════════════════════════════════════════════════`);
console.log(`  Tests upsertCliente en tenant "${T}"`);
console.log(`  Marker de cleanup: "${TEST_MARKER}"`);
console.log(`═══════════════════════════════════════════════════════════`);

// ── Caso 1: cliente NUEVO (email + tel únicos) ─────────────────────
await testCase('1. Cliente nuevo (email + tel únicos) → CREATE', async () => {
  const res = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('nuevo_uno'),
    email:  marker('nuevo').toLowerCase() + '@test.cl',
    telefono: '+56911111111',
  });
  assert(res.wasCreated === true, 'wasCreated=true');
  assert(res.wasMerged === false, 'wasMerged=false');
  assert(res.matchedBy === null, `matchedBy=null (fue ${res.matchedBy})`);
  assert(typeof res.uid === 'string' && res.uid.length > 0, 'uid retornado');
  const doc = await getDoc(res.uid);
  assert(doc?.email === marker('nuevo').toLowerCase() + '@test.cl', 'email persistido');
});

// ── Caso 2: mismo email → REUSE (retorna mismo uid) ─────────────────
await testCase('2. Segundo call mismo email → REUSE mismo uid', async () => {
  const email = marker('reuse').toLowerCase() + '@test.cl';
  const first = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('reuse_A'),
    email,
    telefono: '+56922222222',
  });
  const second = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('reuse_B'),  // nombre distinto pero email igual
    email,                        // MISMO
    telefono: '+56933333333',    // tel distinto
  });
  assert(first.wasCreated === true, 'primer call: created');
  assert(second.wasMerged === true, 'segundo call: merged');
  assert(second.matchedBy === 'email', `matchedBy=email (fue ${second.matchedBy})`);
  assert(first.uid === second.uid, 'mismo uid retornado');
  // El nombre del target NO debe cambiar (fusion solo copia si vacío)
  const doc = await getDoc(second.uid);
  assert(doc.nombre === marker('reuse_A'), `nombre preservado (fue "${doc.nombre}")`);
  // El tel tampoco cambia (target ya tenía tel no vacío)
  assert(doc.telefono === '+56922222222', `tel preservado (fue "${doc.telefono}")`);
});

// ── Caso 3: mismo tel, email distinto → CREATE (familia) ────────────
await testCase('3. Mismo tel + emails distintos → CREATE (no colapsa familia)', async () => {
  const tel = '+56944444444';
  const first = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('familia_padre'),
    email:  marker('padre').toLowerCase() + '@test.cl',
    telefono: tel,
  });
  const second = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('familia_hijo'),
    email:  marker('hijo').toLowerCase() + '@test.cl',
    telefono: tel,
  });
  assert(first.wasCreated === true, 'padre: created');
  assert(second.wasCreated === true, 'hijo: created (no colapsa)');
  assert(second.matchedBy === 'tel-diff-email', `matchedBy=tel-diff-email (fue ${second.matchedBy})`);
  assert(first.uid !== second.uid, 'uids distintos');
});

// ── Caso 4: mismo tel, uno sin email → FUSION ───────────────────────
await testCase('4. Mismo tel + uno sin email → MERGE (mismo humano)', async () => {
  const tel = '+56955555555';
  // Primero un doc SIN email (simula legacy migrado)
  const first = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('sinemail_A'),
    telefono: tel,
  });
  // Luego mismo tel CON email (registro club posterior)
  const second = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('sinemail_B'),
    email:  marker('conemail').toLowerCase() + '@test.cl',
    telefono: tel,
  });
  assert(first.wasCreated === true, 'primero: created (sin email)');
  assert(second.wasMerged === true, 'segundo: merged (aportó email)');
  assert(second.matchedBy === 'tel', `matchedBy=tel (fue ${second.matchedBy})`);
  assert(first.uid === second.uid, 'mismo uid');
  const doc = await getDoc(second.uid);
  assert(doc.email === marker('conemail').toLowerCase() + '@test.cl', `email fusionado (fue "${doc.email}")`);
  // Nombre preservado del primero
  assert(doc.nombre === marker('sinemail_A'), 'nombre del primero preservado');
});

// ── Caso 5: solo email (sin tel) → CREATE ───────────────────────────
await testCase('5. Cliente solo con email → CREATE', async () => {
  const res = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('solo_email'),
    email:  marker('soloemail').toLowerCase() + '@test.cl',
  });
  assert(res.wasCreated === true, 'created');
  const doc = await getDoc(res.uid);
  assert(doc.telefono === '', `tel vacío (fue "${doc.telefono}")`);
  assert(doc.email === marker('soloemail').toLowerCase() + '@test.cl', 'email persistido');
});

// ── Caso 6: solo tel (sin email) → CREATE ───────────────────────────
await testCase('6. Cliente solo con tel → CREATE', async () => {
  const res = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('solo_tel'),
    telefono: '+56966666666',
  });
  assert(res.wasCreated === true, 'created');
  const doc = await getDoc(res.uid);
  assert(doc.email === '', `email vacío (fue "${doc.email}")`);
  assert(doc.telefono === '+56966666666', 'tel persistido');
});

// ── Caso 7: 3 clientes distintos con mismo tel → ambos existentes se mantienen, tercero también ─
await testCase('7. Tel con MÚLTIPLES matches previos → ambiguo → CREATE nuevo', async () => {
  const tel = '+56977777777';
  const a = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('multi_A'),
    email:  marker('multiA').toLowerCase() + '@test.cl',
    telefono: tel,
  });
  const b = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('multi_B'),
    email:  marker('multiB').toLowerCase() + '@test.cl',
    telefono: tel,
  });
  // Tercero sin email pero mismo tel → tel-ambiguo (hay 2 matches) → CREATE
  const c = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('multi_C'),
    telefono: tel,
  });
  assert(c.wasCreated === true, 'tercero: created');
  assert(c.matchedBy === 'tel-ambiguo', `matchedBy=tel-ambiguo (fue ${c.matchedBy})`);
  assert(c.uid !== a.uid && c.uid !== b.uid, 'uid distinto de los previos');
});

// ── Caso 8 (bonus): normalización de tel (variantes) ────────────────
await testCase('8. Match por tel en formatos distintos (+56, 56, sin código)', async () => {
  const first = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('normphone_A'),
    telefono: '+56988888888',
  });
  // Ahora con formato distinto pero mismo humano
  const second = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('normphone_B'),
    telefono: '988888888',  // sin código país
  });
  const third = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('normphone_C'),
    telefono: '+56 9 8888 8888',  // con espacios
  });
  assert(first.wasCreated === true, 'primero: created');
  assert(second.wasMerged === true, 'segundo: matcheado por tel normalizado');
  assert(third.wasMerged === true, 'tercero: matcheado por tel normalizado');
  assert(first.uid === second.uid && second.uid === third.uid, 'todos mismo uid');
});

// ── Caso 9 (bonus): whitelist de extras ─────────────────────────────
await testCase('9. Extras whitelist: `role` NO se guarda', async () => {
  const res = await _upsertClienteCore({
    tenantId: T,
    nombre: marker('whitelist_test'),
    email:  marker('whitelist').toLowerCase() + '@test.cl',
    role:   'admin',                  // NO debe entrar
    fechaNacimiento: '1990-01-01',    // SÍ (whitelisted)
  });
  const doc = await getDoc(res.uid);
  assert(doc.role === undefined, `role no persistido (fue ${doc.role})`);
  assert(doc.fechaNacimiento === '1990-01-01', 'fechaNacimiento persistido');
});

// ── Cleanup: borrar todos los docs de test ──────────────────────────
console.log(`\n─── Cleanup ───`);
const snap = await db.collection(`tenants/${T}/users`).get();
const toDelete = snap.docs.filter(d => {
  const data = d.data();
  return (data.nombre || '').includes(TEST_MARKER)
      || (data.email  || '').includes(TEST_MARKER.toLowerCase());
});
console.log(`  Docs a borrar: ${toDelete.length}`);
for (const d of toDelete) {
  await d.ref.delete();
}
console.log(`  Cleanup OK`);

// ── Resumen ─────────────────────────────────────────────────────────
console.log(`\n═══════════════════════════════════════════════════════════`);
console.log(`  Pass: ${pass}  ·  Fail: ${fail}`);
if (fail > 0) {
  console.log(`\n  Fallos:`);
  failures.forEach(f => console.log(`    · ${f}`));
  process.exit(1);
}
console.log(`  ✓ Todos los tests pasaron`);
console.log(`═══════════════════════════════════════════════════════════\n`);
process.exit(0);
