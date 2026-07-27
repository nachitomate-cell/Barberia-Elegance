// Auditar sincronización entre users y clientes en un tenant.
// Reporta cuántos users NO tienen mirror en clientes y viceversa.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = process.argv[2] || 'aura';
console.log(`\n═══ Auditoría espejos users↔clientes en tenant "${T}" ═══\n`);

const normPhone = (t) => (t || '').replace(/\D/g, '');

const uSnap = await db.collection(`tenants/${T}/users`).get();
const cSnap = await db.collection(`tenants/${T}/clientes`).get();

const users = uSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  .filter(u => (u.nombre || '').trim()); // igual filtro que el panel

const clientes = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));

console.log(`users total (con nombre): ${users.length}`);
console.log(`clientes total:           ${clientes.length}\n`);

// Índice de clientes por teléfono normalizado y por docId
const clientesPorTel   = new Map();
const clientesPorDocId = new Map(clientes.map(c => [c.id, c]));
clientes.forEach(c => {
  const t = normPhone(c.telefono || c.id);
  if (t) clientesPorTel.set(t, c);
});

// Users sin espejo en clientes (buscar por teléfono normalizado)
const usersHuerfanos = users.filter(u => {
  const t = normPhone(u.telefono);
  if (!t) return true; // sin teléfono nunca tiene mirror
  return !clientesPorTel.has(t) && !clientesPorDocId.has(t);
});

// Clientes sin espejo en users (buscar por teléfono)
const usersPorTel = new Map();
users.forEach(u => {
  const t = normPhone(u.telefono);
  if (t) usersPorTel.set(t, u);
});
const clientesHuerfanos = clientes.filter(c => {
  const t = normPhone(c.telefono || c.id);
  if (!t) return true;
  return !usersPorTel.has(t);
});

console.log(`Users SIN espejo en clientes: ${usersHuerfanos.length} / ${users.length} (${Math.round(usersHuerfanos.length/users.length*100)}%)`);
console.log(`Clientes SIN espejo en users: ${clientesHuerfanos.length} / ${clientes.length} (${Math.round(clientesHuerfanos.length/Math.max(1,clientes.length)*100)}%)`);

if (usersHuerfanos.length) {
  console.log('\n─── Muestras de users sin espejo (primeros 5) ───');
  usersHuerfanos.slice(0, 5).forEach(u => {
    console.log(`  ${u.id} · "${u.nombre}" · tel="${u.telefono || ''}" · email="${u.email || ''}"`);
  });
}
if (clientesHuerfanos.length) {
  console.log('\n─── Muestras de clientes sin espejo (primeros 5) ───');
  clientesHuerfanos.slice(0, 5).forEach(c => {
    console.log(`  ${c.id} · "${c.nombre}" · tel="${c.telefono || ''}" · email="${c.email || ''}"`);
  });
}
