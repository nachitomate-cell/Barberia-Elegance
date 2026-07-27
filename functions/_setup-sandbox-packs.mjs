// Setup del sandbox delnero para probar el flujo de packs end-to-end.
//
// Crea/asegura:
//   1. Un servicio base "Corte de prueba" ($20.000, 30min).
//   2. Un servicio pack "3 cortes al mes (SANDBOX)" isPack=true,
//      3 sesiones, validez 30 días, consume "Corte de prueba".
//   3. Un cliente de prueba en users/56999888777 (limpia sus packs activos
//      previos para que la prueba parta de cero).
//
// Idempotente: si ya existen, actualiza los campos clave para que estén
// bien configurados.
//
// Uso:
//   node _setup-sandbox-packs.mjs           → muestra qué haría
//   node _setup-sandbox-packs.mjs --apply   → aplica

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const TENANT = 'delnero';
const SRV_CORTE_ID = 'sandbox-corte-prueba';
const SRV_PACK_ID  = 'sandbox-pack-3cortes';
const CLIENTE_UID  = '56999888777';   // formato chileno estándar 11 dígitos
const CLIENTE_TEL  = '+56 9 9988 8777';

console.log(APPLY ? '=== APPLY ===' : '=== DRY-RUN ===\n');

// 1) Servicio base "Corte de prueba"
const srvCorte = {
  id:       SRV_CORTE_ID,
  nombre:   'Corte de prueba (SANDBOX)',
  categoria: 'Corte',
  duracion: 30,
  precio:   20000,
  icono:    'ph-scissors',
  soloStaff: false,
  isPack:   false,
  orden:    9990,
};

// 2) Servicio pack "3 cortes al mes"
const srvPack = {
  id:       SRV_PACK_ID,
  nombre:   '3 cortes al mes (SANDBOX)',
  categoria: 'Combo',
  duracion: 30,       // placeholder (los packs no consumen la duración del pack sino la del servicio consumido)
  precio:   50000,
  icono:    'ph-trophy',
  soloStaff: false,
  isPack:   true,
  sesionesTotales: 3,
  diasValidez:     30,
  serviciosIncluidos:   [SRV_CORTE_ID],
  serviciosCantidades:  { [SRV_CORTE_ID]: 3 },
  orden:    9991,
};

// 3) Cliente de prueba
const cliente = {
  nombre:   'Cliente Prueba Packs',
  telefono: CLIENTE_TEL,
  email:    'prueba.packs@sandbox.test',
  esLegacy: true,
  esPruebaSandbox: true,
};

console.log('Plan del setup:');
console.log(`  1. Servicio base:  tenants/${TENANT}/servicios/${SRV_CORTE_ID}`);
console.log(`     → "${srvCorte.nombre}" · $${srvCorte.precio.toLocaleString('es-CL')} · ${srvCorte.duracion} min`);
console.log(`  2. Servicio pack:  tenants/${TENANT}/servicios/${SRV_PACK_ID}`);
console.log(`     → "${srvPack.nombre}" · $${srvPack.precio.toLocaleString('es-CL')} · ${srvPack.sesionesTotales} sesiones · vence ${srvPack.diasValidez}d`);
console.log(`     → mapa: ${srvPack.sesionesTotales}× Corte de prueba`);
console.log(`  3. Cliente prueba: tenants/${TENANT}/users/${CLIENTE_UID}`);
console.log(`     → "${cliente.nombre}" · tel ${cliente.telefono}`);
console.log(`     → RESET: packsActivos:[] para partir de cero cada prueba`);
console.log('');

if (!APPLY) {
  console.log('(dry-run) para aplicar: node _setup-sandbox-packs.mjs --apply');
  process.exit(0);
}

const batch = db.batch();
batch.set(db.doc(`tenants/${TENANT}/servicios/${SRV_CORTE_ID}`), { ...srvCorte, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
batch.set(db.doc(`tenants/${TENANT}/servicios/${SRV_PACK_ID}`),  { ...srvPack,  updatedAt: FieldValue.serverTimestamp() }, { merge: true });
// Reset cliente: sobrescribe packsActivos con [] pero no borra otras props si existen.
batch.set(db.doc(`tenants/${TENANT}/users/${CLIENTE_UID}`),      { ...cliente,  packsActivos: [], updatedAt: FieldValue.serverTimestamp() }, { merge: true });
await batch.commit();

console.log('✓ Setup completo.');
console.log('');
console.log('Datos para usar en el panel de delnero:');
console.log(`  Cliente:    ${cliente.nombre}`);
console.log(`  Teléfono:   ${cliente.telefono}   (uid = ${CLIENTE_UID})`);
console.log(`  Pack:       "${srvPack.nombre}"`);
console.log(`  Corte:      "${srvCorte.nombre}"`);
