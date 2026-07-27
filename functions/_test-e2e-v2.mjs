// Test E2E v2: verifica los 2 fixes post-test-manual.
//   Bug 1: al fusionar legacy, reasignar citas apuntando al legacy → doc canónico.
//   Bug 2: rescate onCreate de citas sin clienteUid.

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
const MARKER = 'ZZ_E2E2_';
const esperar = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const failures = [];
const assert = (c, m) => { if (c) { pass++; console.log(`    ✓ ${m}`); } else { fail++; failures.push(m); console.log(`    ✗ ${m}`); } };

console.log('\n╔═════════════════════════════════════════════╗');
console.log('║  Test E2E v2: reasignación + rescate        ║');
console.log('╚═════════════════════════════════════════════╝');

// ── ESCENARIO 1: reasignación de citas al fusionar legacy ───────
console.log('\n[1] Fusión reasigna citas históricas del legacy');
{
  // 1a. Crear cliente vía upsert (queda como ac_)
  const r1 = await _upsertClienteCore({
    tenantId: T,
    nombre:   MARKER + 'Reasign Test',
    email:    MARKER.toLowerCase() + 'reasign@delnero.cl',
    telefono: '+56988877766',
  });
  const acUid = r1.uid;
  console.log(`    upsert creó: ${acUid}`);

  // 1b. Crear 2 citas apuntando al ac_
  const cita1Ref = db.collection(`tenants/${T}/citas`).doc();
  const cita2Ref = db.collection(`tenants/${T}/citas`).doc();
  await cita1Ref.set({
    fecha:           '2026-08-01',
    hora:            '10:00',
    clienteNombre:   MARKER + 'Reasign Test',
    clienteEmail:    MARKER.toLowerCase() + 'reasign@delnero.cl',
    clienteTelefono: '+56988877766',
    clienteUid:      acUid,
    userId:          acUid,
    estado:          'Confirmada',
    origen:          'test_e2e',
  });
  await cita2Ref.set({
    fecha:           '2026-08-02',
    hora:            '11:00',
    clienteNombre:   MARKER + 'Reasign Test',
    clienteEmail:    MARKER.toLowerCase() + 'reasign@delnero.cl',
    clienteTelefono: '+56988877766',
    clienteUid:      acUid,
    userId:          acUid,
    estado:          'Confirmada',
    origen:          'test_e2e',
  });
  console.log(`    2 citas creadas apuntando al ac_`);

  // 1c. Simular registro al club: crear doc users/{authUid} con mismo email
  const authUid = MARKER + 'ReasignAuthUid1';
  const authRef = db.doc(`tenants/${T}/users/${authUid}`);
  await authRef.set({
    nombre:   MARKER + 'Reasign Test',
    email:    MARKER.toLowerCase() + 'reasign@delnero.cl',
    telefono: '+56988877766',
    stamps:   0,
    creadoEn: new Date(),
  });
  console.log(`    registro simulado: ${authUid}. Esperando trigger 8s...`);
  await esperar(8000);

  // 1d. Verificar: ac_ borrado + citas reasignadas al authUid
  const acSnap = await db.doc(`tenants/${T}/users/${acUid}`).get();
  assert(!acSnap.exists, `ac_ borrado (${acUid})`);
  const cita1Snap = await cita1Ref.get();
  const cita2Snap = await cita2Ref.get();
  assert(cita1Snap.data()?.clienteUid === authUid, `cita 1 reasignada al authUid (fue ${cita1Snap.data()?.clienteUid})`);
  assert(cita1Snap.data()?.userId     === authUid, `cita 1.userId reasignado`);
  assert(cita2Snap.data()?.clienteUid === authUid, `cita 2 reasignada al authUid`);
  assert(cita2Snap.data()?.userId     === authUid, `cita 2.userId reasignado`);
  console.log(`    Fusión reasignó ambas citas ✓`);
}

// ── ESCENARIO 2: rescate onCreate de cita sin clienteUid ─────────
console.log('\n[2] Rescate: cita creada SIN clienteUid → trigger la linkea');
{
  // 2a. Sembrar user con datos conocidos (simula que ya existía de otra reserva)
  const semilla = await _upsertClienteCore({
    tenantId: T,
    nombre:   MARKER + 'Rescate Test',
    email:    MARKER.toLowerCase() + 'rescate@delnero.cl',
    telefono: '+56977766655',
  });
  console.log(`    semilla user: ${semilla.uid}`);

  // 2b. Crear cita SIN clienteUid (simula fallo del CF client-side)
  const citaRef = db.collection(`tenants/${T}/citas`).doc();
  await citaRef.set({
    fecha:           '2026-08-03',
    hora:            '15:00',
    clienteNombre:   MARKER + 'Rescate Test',
    clienteEmail:    MARKER.toLowerCase() + 'rescate@delnero.cl',
    clienteTelefono: '+56977766655',
    // clienteUid: intencional NULL
    estado:          'Confirmada',
    origen:          'test_rescate',
  });
  console.log(`    cita creada SIN clienteUid. Esperando trigger rescate 8s...`);
  await esperar(8000);

  // 2c. Verificar: cita ahora tiene clienteUid seteado por el trigger rescate
  const citaSnap = await citaRef.get();
  const data = citaSnap.data();
  assert(data?.clienteUid === semilla.uid, `cita rescatada al uid semilla (fue ${data?.clienteUid})`);
  assert(data?.userId     === semilla.uid, `cita.userId también seteado`);
  assert(data?.rescatadoPorTrigger === true, `marca rescatadoPorTrigger seteada`);
  console.log(`    Rescate server-side funcionó ✓`);
}

// ── CLEANUP ────────────────────────────────────────────────────────
console.log('\n[cleanup]');
{
  let del = 0;
  const usersSnap = await db.collection(`tenants/${T}/users`).get();
  for (const d of usersSnap.docs) {
    const data = d.data();
    if ((data.nombre || '').includes(MARKER) || (data.email || '').includes(MARKER.toLowerCase())) {
      await d.ref.delete(); del++;
    }
  }
  const citasSnap = await db.collection(`tenants/${T}/citas`).get();
  for (const d of citasSnap.docs) {
    const data = d.data();
    if ((data.clienteNombre || '').includes(MARKER) || (data.clienteEmail || '').includes(MARKER.toLowerCase())) {
      await d.ref.delete();
    }
  }
  const cliSnap = await db.collection(`tenants/${T}/clientes`).get();
  for (const d of cliSnap.docs) {
    const data = d.data();
    if ((data.nombre || '').includes(MARKER) || (data.email || '').includes(MARKER.toLowerCase())) {
      await d.ref.delete();
    }
  }
  console.log(`    ✓ ${del} users borrados + citas + mirrors`);
}

console.log(`\n╔═════════════════════════════════════════════╗`);
console.log(`║  Pass: ${String(pass).padEnd(3)} · Fail: ${String(fail).padEnd(3)}                    ║`);
console.log(`╚═════════════════════════════════════════════╝\n`);
if (fail > 0) { failures.forEach(f => console.log(`  · ${f}`)); process.exit(1); }
process.exit(0);
