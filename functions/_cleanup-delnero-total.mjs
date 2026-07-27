// Limpia TODOS los residuos de tests en delnero antes del test manual final.
// Deja delnero con solo los datos reales del sandbox (Vicente barbero, etc).
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

// Patterns de nombres/emails que huelen a test
const isTest = (s) => {
  const x = (s || '').toLowerCase();
  return x.includes('test ')
      || x.includes('test.')
      || x.includes('_test')
      || x.includes('prueba peek')
      || x.includes('peek test')
      || x.includes('e2e')
      || x.includes('zz_')
      || x.includes('publico a')
      || x.includes('publico b');
};

console.log(`\n═══ Escaneando delnero para residuos de test ═══\n`);

// Users
const usersSnap = await db.collection(`tenants/${T}/users`).get();
const toDelUsers = [];
usersSnap.docs.forEach(d => {
  const data = d.data();
  if (isTest(data.nombre) || isTest(data.email)) {
    toDelUsers.push({ id: d.id, nombre: data.nombre, email: data.email });
  }
});
console.log(`Users a borrar: ${toDelUsers.length}`);
toDelUsers.forEach(u => console.log(`  - ${u.id} · "${u.nombre}" · ${u.email || ''}`));

// Citas
const citasSnap = await db.collection(`tenants/${T}/citas`).get();
const toDelCitas = [];
citasSnap.docs.forEach(d => {
  const data = d.data();
  if (isTest(data.clienteNombre) || isTest(data.clienteEmail)) {
    toDelCitas.push({ id: d.id, cliente: data.clienteNombre, fecha: data.fecha, hora: data.hora });
  }
});
console.log(`\nCitas a borrar: ${toDelCitas.length}`);
toDelCitas.slice(0, 10).forEach(c => console.log(`  - ${c.id} · "${c.cliente}" · ${c.fecha} ${c.hora}`));
if (toDelCitas.length > 10) console.log(`  ... y ${toDelCitas.length - 10} más`);

// Mirror clientes/
const cliSnap = await db.collection(`tenants/${T}/clientes`).get();
const toDelCli = [];
cliSnap.docs.forEach(d => {
  const data = d.data();
  if (isTest(data.nombre) || isTest(data.email)) {
    toDelCli.push({ id: d.id, nombre: data.nombre });
  }
});
console.log(`\nMirrors clientes/ a borrar: ${toDelCli.length}`);

// slotLocks de las citas borradas
const lockIds = toDelCitas.map(c => c.slotLockId).filter(Boolean);

// Aplicar
console.log(`\n═══ Borrando ═══`);
for (const u of toDelUsers) { await db.doc(`tenants/${T}/users/${u.id}`).delete(); }
for (const c of toDelCitas) { await db.doc(`tenants/${T}/citas/${c.id}`).delete(); }
for (const c of toDelCli)   { await db.doc(`tenants/${T}/clientes/${c.id}`).delete(); }

// Limpiar slotLocks huérfanos
let locksBorrados = 0;
const locksSnap = await db.collection(`tenants/${T}/slotLocks`).get();
for (const d of locksSnap.docs) {
  const data = d.data();
  const citaId = data.citaId;
  if (citaId && toDelCitas.some(c => c.id === citaId)) {
    await d.ref.delete();
    locksBorrados++;
  }
}

console.log(`✓ ${toDelUsers.length} users, ${toDelCitas.length} citas, ${toDelCli.length} mirrors, ${locksBorrados} slotLocks borrados`);
