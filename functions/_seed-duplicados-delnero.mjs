// Siembra 4 escenarios controlados de duplicados en delnero para probar
// el script de cleanup (_cleanup-duplicados.mjs). Todos los docs llevan
// el prefijo ZZ_CLEANUP_TEST_ para poder limpiar fácil después si algo
// sale mal.
//
// USO: node _seed-duplicados-delnero.mjs

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = 'delnero';
const M = 'ZZ_CLEANUP_TEST_';

console.log(`\n═══ Sembrando 4 escenarios de duplicados en ${T} ═══\n`);

// ── Escenario 1: 2 users con MISMO email (esperado: FUSIÓN por email) ───
console.log('[1] Email duplicado exacto');
const emailDup = M.toLowerCase() + 'emaildup@delnero.cl';
const uEmail1 = db.collection(`tenants/${T}/users`).doc();
const uEmail2 = db.collection(`tenants/${T}/users`).doc();
await uEmail1.set({
  nombre: M + 'EmailDup Antiguo',
  email:  emailDup,
  telefono: '+56911100001',
  sellosHistoricos:  10,
  sellosDisponibles: 5,
  stamps: 5,
  fechaRegistroOriginal: '10/01/2025',  // más antiguo → keeper esperado
  creadoEn: FieldValue.serverTimestamp(),
});
await uEmail2.set({
  nombre: M + 'EmailDup Nuevo',
  email:  emailDup,
  telefono: '+56922200002',   // tel distinto pero mismo email
  sellosHistoricos:  3,
  sellosDisponibles: 3,
  stamps: 3,
  creadoEn: FieldValue.serverTimestamp(),
});
// Cita apuntando al descartado (el "Nuevo") — cleanup debe reasignarla al keeper
const cita1 = db.collection(`tenants/${T}/citas`).doc();
await cita1.set({
  fecha: '2026-08-15', hora: '10:00',
  clienteNombre: M + 'EmailDup', clienteEmail: emailDup, clienteTelefono: '+56922200002',
  clienteUid: uEmail2.id, userId: uEmail2.id,
  estado: 'Completada', origen: 'test_cleanup',
});
console.log(`    keeper esperado: ${uEmail1.id} (más antiguo, 10 sellos hist)`);
console.log(`    descartado:      ${uEmail2.id}`);
console.log(`    cita huérfana:   ${cita1.id} → debe reasignar al keeper`);

// ── Escenario 2: 2 users con mismo tel, UNO sin email (mismo humano) ─────
console.log('\n[2] Tel duplicado, uno sin email');
const telDup = '+56933300003';
const uTel1 = db.collection(`tenants/${T}/users`).doc();
const uTel2 = db.collection(`tenants/${T}/users`).doc();
await uTel1.set({
  nombre: M + 'TelDup SinEmail',
  telefono: telDup,
  sellosHistoricos:  8,
  fechaRegistroOriginal: '05/03/2025',  // más antiguo → keeper
  creadoEn: FieldValue.serverTimestamp(),
});
await uTel2.set({
  nombre: M + 'TelDup ConEmail',
  email:  M.toLowerCase() + 'teldup@delnero.cl',
  telefono: telDup,
  sellosHistoricos:  2,
  creadoEn: FieldValue.serverTimestamp(),
});
console.log(`    keeper esperado: ${uTel1.id} (más antiguo, sin email)`);
console.log(`    descartado:      ${uTel2.id} (aporta el email al keeper)`);

// ── Escenario 3: Familia — mismo tel, DOS emails distintos (esperado SKIP) ──
console.log('\n[3] Familia (mismo tel, emails distintos)');
const telFam = '+56944400004';
const uFam1 = db.collection(`tenants/${T}/users`).doc();
const uFam2 = db.collection(`tenants/${T}/users`).doc();
await uFam1.set({
  nombre: M + 'Familia Papa',
  email:  M.toLowerCase() + 'papa@delnero.cl',
  telefono: telFam,
  sellosHistoricos: 5,
  creadoEn: FieldValue.serverTimestamp(),
});
await uFam2.set({
  nombre: M + 'Familia Hijo',
  email:  M.toLowerCase() + 'hijo@delnero.cl',
  telefono: telFam,
  sellosHistoricos: 1,
  creadoEn: FieldValue.serverTimestamp(),
});
console.log(`    ambos deben marcar _needsReview:true (NO fusionar)`);
console.log(`    papa: ${uFam1.id}   hijo: ${uFam2.id}`);

// ── Escenario 4: Walk-in solo en clientes/ sin match en users/ ────────
console.log('\n[4] Walk-in en clientes/ sin match en users/');
const walkinTel = '+56955500005';
const walkinRef = db.doc(`tenants/${T}/clientes/${walkinTel.replace(/\D/g, '')}`);
await walkinRef.set({
  nombre:   M + 'Walkin Solo',
  email:    M.toLowerCase() + 'walkin@delnero.cl',
  telefono: walkinTel,
  sellosHistoricos:  4,
  sellosDisponibles: 2,
  creadoEn: FieldValue.serverTimestamp(),
});
console.log(`    walk-in: ${walkinRef.id} → debe MIGRAR a users/{auto-id}`);

console.log(`\n═══ Sembrado completo. Total docs de test creados: 6 users + 1 walkin + 1 cita ═══\n`);
console.log(`Para inspeccionar, andá a Firestore Console → tenants/${T}/users`);
console.log(`Filtrá por nombre que contenga "${M}" o email que contenga "${M.toLowerCase()}".`);
