/**
 * Lectura-only: busca al usuario por email en todos los tenants (incluido root "elegance")
 * y muestra barberos/servicios mínimos para poder crear una cita de prueba.
 *
 *   node scripts/find-user-tenants.js ignaciiio.mate@gmail.com
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const EMAIL = (process.argv[2] || '').toLowerCase().trim();
if (!EMAIL) { console.error('Uso: node scripts/find-user-tenants.js <email>'); process.exit(1); }

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();

async function scanTenant(label, usersCol, barberosCol, serviciosCol) {
  const snap = await usersCol.where('email', '==', EMAIL).get();
  if (snap.empty) {
    // fallback: a veces email se guarda con mayúsculas o el doc id es el uid pero sin email indexado
    const all = await usersCol.get();
    const match = all.docs.find(d => ((d.data().email || '').toLowerCase() === EMAIL));
    if (!match) return null;
    return await summarize(label, match, barberosCol, serviciosCol);
  }
  return await summarize(label, snap.docs[0], barberosCol, serviciosCol);
}

async function summarize(label, userDoc, barberosCol, serviciosCol) {
  const u = userDoc.data();
  const barberos = await barberosCol.limit(20).get();
  const servicios = await serviciosCol.limit(20).get();
  return {
    tenant: label,
    uid: userDoc.id,
    nombre: u.nombre || '(sin nombre)',
    email: u.email,
    telefono: u.telefono || '',
    sellos: u.sellosHistoricos ?? u.stamps ?? 0,
    barberos: barberos.docs.map(d => ({ id: d.id, nombre: d.data().nombre || d.id, activo: d.data().activo !== false })),
    servicios: servicios.docs.map(d => ({ id: d.id, nombre: d.data().nombre || d.id, duracion: d.data().duracion || 30, precio: d.data().precio || 0 })),
  };
}

(async () => {
  const results = [];

  // 1. elegance (root)
  const r = await scanTenant('elegance',
    db.collection('users'),
    db.collection('barberos'),
    db.collection('servicios'));
  if (r) results.push(r);

  // 2. tenants/*
  const tenantRefs = await db.collection('tenants').listDocuments();
  for (const t of tenantRefs) {
    const tid = t.id;
    if (tid === 'elegance') continue;
    const r2 = await scanTenant(tid,
      db.collection(`tenants/${tid}/users`),
      db.collection(`tenants/${tid}/barberos`),
      db.collection(`tenants/${tid}/servicios`));
    if (r2) results.push(r2);
  }

  if (!results.length) {
    console.log(`❌ El email ${EMAIL} no aparece en ningún tenant.`);
    process.exit(0);
  }

  console.log(`\n🔎 ${EMAIL} encontrado en ${results.length} tenant(s):\n`);
  for (const r of results) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`TENANT: ${r.tenant}`);
    console.log(`  uid:      ${r.uid}`);
    console.log(`  nombre:   ${r.nombre}`);
    console.log(`  email:    ${r.email}`);
    console.log(`  telefono: ${r.telefono}`);
    console.log(`  sellos:   ${r.sellos}`);
    console.log(`  barberos (${r.barberos.length}):`);
    r.barberos.forEach(b => console.log(`    - ${b.id} · ${b.nombre}${b.activo ? '' : ' (inactivo)'}`));
    console.log(`  servicios (${r.servicios.length}):`);
    r.servicios.forEach(s => console.log(`    - ${s.id} · ${s.nombre} · ${s.duracion}min · $${s.precio}`));
    console.log('');
  }
  process.exit(0);
})().catch(err => { console.error('❌', err); process.exit(1); });
