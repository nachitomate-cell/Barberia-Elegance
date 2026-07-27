// Test end-to-end del sistema unificado de clientes en delnero (Task #6).
// Simula el ciclo completo de vida de un cliente con los 5 flujos wireados:
//   1. Agenda a mano (barbero desde panel/agenda.html) → upsertCliente crea user.
//   2. Segunda cita mismo cliente → reusa uid.
//   3. Cliente se registra al club → dedupeOnCreateTenant fusiona en el authUid doc.
//   4. Reserva pública con distinto tel pero mismo email → reusa por email.
//   5. Familia (mismo tel, email distinto) → user separado, no colapsa.
//
// Cero UI: se llama a _upsertClienteCore directamente + se simulan writes
// que dispararían los triggers. Rápido, reproducible, sin depender del browser.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const { _upsertClienteCore } = require('./upsert-cliente.js');

const T = 'delnero';
const MARKER = 'ZZ_E2E_';
const esperar = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const failures = [];
const assert = (c, m) => { if (c) { pass++; console.log(`    ✓ ${m}`); } else { fail++; failures.push(m); console.log(`    ✗ ${m}`); } };

const uidState = {}; // guarda uids resueltos para chequear a través de escenarios

console.log(`\n╔══════════════════════════════════════════════════════════╗`);
console.log(`║  Test E2E integrado — delnero                            ║`);
console.log(`╚══════════════════════════════════════════════════════════╝`);

// ── ESCENARIO 1: Agenda barbero — cliente nuevo ─────────────────
console.log(`\n[1] Agenda a mano: barbero crea cliente nuevo`);
{
  const res = await _upsertClienteCore({
    tenantId: T,
    nombre:   MARKER + 'Juan Ciclo',
    email:    MARKER.toLowerCase() + 'juan@delnero.cl',
    telefono: '+56911111111',
  });
  assert(res.wasCreated === true, 'wasCreated=true');
  assert(res.uid?.startsWith('ac_'), `uid con prefix ac_ (fue "${res.uid}")`);
  uidState.juanUidInicial = res.uid;
}

// ── ESCENARIO 2: Agenda barbero — segunda cita mismo cliente ────
console.log(`\n[2] Segunda agenda: mismo cliente reusa uid`);
{
  const res = await _upsertClienteCore({
    tenantId: T,
    nombre:   MARKER + 'Juan Ciclo',
    email:    MARKER.toLowerCase() + 'juan@delnero.cl',
    telefono: '+56911111111',
  });
  assert(res.wasMerged === true, 'wasMerged=true (no crea nuevo)');
  assert(res.matchedBy === 'email', `matchedBy=email (fue "${res.matchedBy}")`);
  assert(res.uid === uidState.juanUidInicial, `mismo uid que escenario 1`);
}

// ── ESCENARIO 3: Cliente se registra al club ─────────────────────
// Simulamos ensureUserDoc creando users/{firebaseAuthUid} con datos igual/similar.
// El trigger dedupeOnCreateTenant debe fusionar el `ac_...` en el authUid doc.
console.log(`\n[3] Registro al club: dedupeOnCreateTenant fusiona el ac_ en el authUid doc`);
{
  const fakeAuthUid = MARKER + 'AuthUid789Sim';
  const authRef = db.doc(`tenants/${T}/users/${fakeAuthUid}`);
  await authRef.set({
    nombre:   MARKER + 'Juan Ciclo',
    email:    MARKER.toLowerCase() + 'juan@delnero.cl',
    telefono: '+56911111111',
    stamps:   0,
    creadoEn: new Date(),
  });
  console.log(`    doc authUid creado: ${fakeAuthUid}. Esperando trigger 8s...`);
  await esperar(8000);
  const authSnap = await authRef.get();
  const authData = authSnap.data() || {};
  assert(authSnap.exists, 'doc authUid sigue existiendo');
  assert(authData.dedupedAt != null, 'dedupedAt seteado (trigger corrió)');
  const acRef = db.doc(`tenants/${T}/users/${uidState.juanUidInicial}`);
  const acSnap = await acRef.get();
  assert(!acSnap.exists, `doc ac_ (${uidState.juanUidInicial}) borrado por dedupe`);
  uidState.juanUidCanonico = fakeAuthUid; // ahora este es el canónico
}

// ── ESCENARIO 4: Reserva pública desde otro dispositivo con nuevo tel ─────
// Simulamos: el cliente entra al sitio público sin logueo, ingresa el MISMO
// email pero OTRO tel (cambió de número). upsertCliente debe reusar por email
// y actualizar el tel? En realidad NO actualiza (solo copia campos vacíos),
// pero el uid retornado es el mismo (fusión por email).
console.log(`\n[4] Booking público: mismo email, tel distinto → reusa por email`);
{
  const res = await _upsertClienteCore({
    tenantId: T,
    nombre:   MARKER + 'Juan Ciclo',
    email:    MARKER.toLowerCase() + 'juan@delnero.cl',
    telefono: '+56999999999', // ← tel distinto (cambió de número)
  });
  assert(res.wasMerged === true, 'wasMerged=true');
  assert(res.matchedBy === 'email', `matchedBy=email (fue "${res.matchedBy}")`);
  assert(res.uid === uidState.juanUidCanonico, `mismo uid canónico (authUid)`);
}

// ── ESCENARIO 5: Familia — mismo tel, email distinto ─────────────
console.log(`\n[5] Familia: hermano con mismo tel pero email distinto → CREATE (no colapsa)`);
{
  const res = await _upsertClienteCore({
    tenantId: T,
    nombre:   MARKER + 'Pedro Hermano',
    email:    MARKER.toLowerCase() + 'pedro@delnero.cl',
    telefono: '+56911111111',
  });
  assert(res.wasCreated === true, 'wasCreated=true (nuevo doc)');
  assert(res.matchedBy === 'tel-diff-email', `matchedBy=tel-diff-email (fue "${res.matchedBy}")`);
  assert(res.uid !== uidState.juanUidCanonico, `uid distinto al del hermano`);
  uidState.pedroUid = res.uid;
}

// ── CLEANUP ────────────────────────────────────────────────────────
console.log(`\n[cleanup] Borrando docs de test`);
{
  const users = await db.collection(`tenants/${T}/users`).get();
  let del = 0;
  for (const d of users.docs) {
    const data = d.data();
    if ((data.nombre || '').includes(MARKER) || (data.email || '').includes(MARKER.toLowerCase())) {
      await d.ref.delete(); del++;
    }
  }
  const cliMirror = await db.collection(`tenants/${T}/clientes`).get();
  for (const d of cliMirror.docs) {
    const data = d.data();
    if ((data.nombre || '').includes(MARKER) || (data.email || '').includes(MARKER.toLowerCase())) {
      await d.ref.delete();
    }
  }
  console.log(`    ✓ ${del} users borrados`);
}

// ── RESUMEN ────────────────────────────────────────────────────────
console.log(`\n╔══════════════════════════════════════════════════════════╗`);
console.log(`║  Pass: ${String(pass).padEnd(3)} · Fail: ${String(fail).padEnd(3)}                                 ║`);
console.log(`╚══════════════════════════════════════════════════════════╝`);
if (fail > 0) { failures.forEach(f => console.log(`  · ${f}`)); process.exit(1); }
console.log(`\n  ✓ E2E integrado en delnero: TODOS los escenarios OK\n`);
process.exit(0);
