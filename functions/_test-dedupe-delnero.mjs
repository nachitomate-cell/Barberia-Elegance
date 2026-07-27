// Test del trigger dedupeOnCreateTenant contra delnero.
// Simulamos el escenario "cliente se registra con email de un legacy":
//   1. Sembramos un user legacy (uid === docId === telefono) con sellos históricos.
//   2. Creamos un doc "registro nuevo" con id auto (simula createUserWithEmailAndPassword)
//      y campos email/telefono que matchean el legacy.
//   3. El trigger onCreate debería fusionar sellos y borrar el legacy.
//   4. Verificamos + cleanup.
//
// El segundo test cubre el bug de familia (mi regla híbrida):
//   1. Sembramos legacy con tel X + email A.
//   2. Creamos "registro nuevo" con MISMO tel X pero email B (hermano/pareja).
//   3. El trigger NO debe fusionar (personas distintas).

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = 'delnero';
const MARKER = 'ZZ_TEST_DEDUP_';

let pass = 0, fail = 0;
const failures = [];
const assert = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; failures.push(m); console.log(`  ✗ ${m}`); } };

async function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Caso 1: legacy con email → registro con mismo email = fusión ──
console.log('\n─── 1. Legacy + registro mismo email → fusión ───');
{
  const email = MARKER.toLowerCase() + 'caso1@test.cl';
  const legacyRef = db.doc(`tenants/${T}/users/+56911100001`);
  await legacyRef.set({
    uid:               '+56911100001',   // uid === docId → marca legacy
    nombre:            MARKER + 'Caso1 Legacy',
    email,
    telefono:          '+56911100001',
    sellosHistoricos:  7,
    sellosDisponibles: 4,
    stamps:            4,
    importedFrom:      'agendapro',
    fechaRegistroOriginal: '15/10/2025',
  });
  // Simular registro nuevo con auto-id
  const nuevoRef = db.collection(`tenants/${T}/users`).doc();
  await nuevoRef.set({
    nombre:    MARKER + 'Caso1 Nuevo',
    email,
    telefono:  '+56911100001',
    stamps:    0,
    creadoEn:  new Date(),
  });
  console.log(`  legacy: ${legacyRef.id}  nuevo: ${nuevoRef.id}  (esperando trigger 6s)`);
  await esperar(6000);
  // Verificar
  const nuevoSnap = await nuevoRef.get();
  const legacySnap = await legacyRef.get();
  assert(!legacySnap.exists, 'legacy borrado');
  const nuevoData = nuevoSnap.data() || {};
  assert(nuevoData.sellosHistoricos === 7,  `sellosHistoricos=7 (fue ${nuevoData.sellosHistoricos})`);
  assert(nuevoData.sellosDisponibles === 4, `sellosDisponibles=4 (fue ${nuevoData.sellosDisponibles})`);
  assert(nuevoData.dedupedAt != null,       'dedupedAt seteado');
  // Cleanup
  await nuevoRef.delete();
}

// ── Caso 2: legacy + registro mismo tel + email DISTINTO → NO fusión ──
console.log('\n─── 2. Familia (mismo tel, emails distintos) → NO fusión ───');
{
  const legacyRef = db.doc(`tenants/${T}/users/+56922200002`);
  await legacyRef.set({
    uid:               '+56922200002',
    nombre:            MARKER + 'Caso2 PadreLegacy',
    email:             MARKER.toLowerCase() + 'padre@test.cl',
    telefono:          '+56922200002',
    sellosHistoricos:  10,
    importedFrom:      'agendapro',
  });
  const hijoRef = db.collection(`tenants/${T}/users`).doc();
  await hijoRef.set({
    nombre:    MARKER + 'Caso2 Hijo',
    email:     MARKER.toLowerCase() + 'hijo@test.cl',  // DISTINTO
    telefono:  '+56922200002',                          // MISMO tel
    stamps:    0,
    creadoEn:  new Date(),
  });
  console.log(`  legacy padre: ${legacyRef.id}  hijo nuevo: ${hijoRef.id}  (esperando trigger 6s)`);
  await esperar(6000);
  const legacySnap = await legacyRef.get();
  const hijoSnap = await hijoRef.get();
  assert(legacySnap.exists, 'legacy NO borrado (familia respetada)');
  const hijoData = hijoSnap.data() || {};
  assert(!hijoData.sellosHistoricos, `hijo NO recibió sellos del padre (fue ${hijoData.sellosHistoricos})`);
  assert(!hijoData.dedupedAt, 'hijo NO marcado como deduplicado');
  // Cleanup
  await legacyRef.delete();
  await hijoRef.delete();
}

// ── Caso 3: legacy sin email + registro con email + mismo tel → fusión ──
console.log('\n─── 3. Legacy sin email + registro con email (mismo tel) → fusión ───');
{
  const legacyRef = db.doc(`tenants/${T}/users/+56933300003`);
  await legacyRef.set({
    uid:               '+56933300003',
    nombre:            MARKER + 'Caso3 LegacySinEmail',
    telefono:          '+56933300003',
    sellosHistoricos:  3,
    stamps:            3,
    importedFrom:      'agendapro',
  });
  const nuevoRef = db.collection(`tenants/${T}/users`).doc();
  await nuevoRef.set({
    nombre:    MARKER + 'Caso3 Nuevo',
    email:     MARKER.toLowerCase() + 'caso3@test.cl',
    telefono:  '+56933300003',
    stamps:    0,
    creadoEn:  new Date(),
  });
  console.log(`  legacy: ${legacyRef.id}  nuevo: ${nuevoRef.id}  (esperando trigger 6s)`);
  await esperar(6000);
  const legacySnap = await legacyRef.get();
  const nuevoSnap  = await nuevoRef.get();
  assert(!legacySnap.exists, 'legacy borrado');
  const nuevoData = nuevoSnap.data() || {};
  assert(nuevoData.sellosHistoricos === 3, `sellosHistoricos=3 (fue ${nuevoData.sellosHistoricos})`);
  // Cleanup
  await nuevoRef.delete();
}

// Resumen
console.log(`\n═══ Pass: ${pass}  ·  Fail: ${fail} ═══`);
if (fail > 0) { failures.forEach(f => console.log(`  · ${f}`)); process.exit(1); }
console.log('  ✓ Todos los tests del trigger dedupe pasaron\n');
process.exit(0);
