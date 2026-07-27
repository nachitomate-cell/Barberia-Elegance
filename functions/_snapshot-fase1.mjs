// Snapshot del estado de un tenant post-Fase 1 para monitoreo pasivo.
// Uso: node _snapshot-fase1.mjs <tenant>
// Guarda: functions/_snapshots/{tenant}-{timestamp}.json
// Se corre HOY (baseline) y en 2-3 días para comparar.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = process.argv[2] || 'aura';
const now = new Date();
const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

const normPhone = (t) => {
  const d = (t || '').replace(/\D/g, '');
  return d.length > 9 ? d.slice(-9) : d;
};

console.log(`\nTomando snapshot de "${T}" @ ${now.toISOString()}...`);
const usersSnap = await db.collection(`tenants/${T}/users`).get();
const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
const usersConNombre = users.filter(u => (u.nombre || '').trim());

// Duplicados por email exacto
const byEmail = new Map();
usersConNombre.forEach(u => {
  const em = (u.email || '').toLowerCase().trim();
  if (em) {
    if (!byEmail.has(em)) byEmail.set(em, []);
    byEmail.get(em).push(u.id);
  }
});
const dupsPorEmail = [...byEmail.values()].filter(g => g.length > 1);

// Duplicados por tel normalizado
const byTel = new Map();
usersConNombre.forEach(u => {
  const t = normPhone(u.telefono);
  if (t) {
    if (!byTel.has(t)) byTel.set(t, []);
    byTel.get(t).push(u.id);
  }
});
const dupsPorTel = [...byTel.values()].filter(g => g.length > 1);

// Docs con prefijo ac_ (creados por upsertCliente)
const docsAc = usersConNombre.filter(u => u.id.startsWith('ac_'));

// Docs con dedupedAt reciente (últimos 7 días)
const hace7dias = Date.now() - 7 * 86400000;
const dedupedRecientes = usersConNombre.filter(u => {
  const ts = u.dedupedAt?.toDate ? u.dedupedAt.toDate().getTime() : 0;
  return ts >= hace7dias;
});

// Docs con upsertedAt (marca de upsertCliente)
const upsertedTotal = usersConNombre.filter(u => u.upsertedAt).length;

// Legacies restantes (uid === docId o importedFrom === 'agendapro')
const legacies = usersConNombre.filter(u => u.uid === u.id || u.importedFrom === 'agendapro');

// Clientes collection
const clientesSnap = await db.collection(`tenants/${T}/clientes`).get();

const snapshot = {
  tenant:                 T,
  timestamp:              now.toISOString(),
  usersTotal:             users.length,
  usersConNombre:         usersConNombre.length,
  clientesTotal:          clientesSnap.size,
  dupsPorEmailGrupos:     dupsPorEmail.length,
  dupsPorEmailDocsExtra:  dupsPorEmail.reduce((s, g) => s + g.length - 1, 0),
  dupsPorTelGrupos:       dupsPorTel.length,
  dupsPorTelDocsExtra:    dupsPorTel.reduce((s, g) => s + g.length - 1, 0),
  docsAcTotal:            docsAc.length,
  dedupedUltimos7Dias:    dedupedRecientes.length,
  upsertedTotal:          upsertedTotal,
  legaciesTotal:          legacies.length,
  // Muestras (primeros 5) de cada categoría
  muestraDupsEmail:       dupsPorEmail.slice(0, 5).map(g => ({ ids: g })),
  muestraDupsTel:         dupsPorTel.slice(0, 5).map(g => ({ ids: g })),
  muestraDocsAc:          docsAc.slice(0, 5).map(u => ({ id: u.id, nombre: u.nombre, email: u.email })),
};

const outPath = `_snapshots/${T}-${ts}.json`;
writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf-8');
console.log(`✓ Guardado en functions/${outPath}\n`);
console.log('═══ Resumen ═══');
console.log(`  Users total:              ${snapshot.usersTotal}`);
console.log(`  Users con nombre:         ${snapshot.usersConNombre}`);
console.log(`  Clientes (mirror):        ${snapshot.clientesTotal}`);
console.log(`  ── Duplicados ──`);
console.log(`  Grupos por email exacto:  ${snapshot.dupsPorEmailGrupos} (${snapshot.dupsPorEmailDocsExtra} docs extra)`);
console.log(`  Grupos por tel exacto:    ${snapshot.dupsPorTelGrupos} (${snapshot.dupsPorTelDocsExtra} docs extra)`);
console.log(`  ── Actividad Fase 1 ──`);
console.log(`  Docs ac_ (upsertCliente): ${snapshot.docsAcTotal}`);
console.log(`  Docs con upsertedAt:      ${snapshot.upsertedTotal}`);
console.log(`  Fusiones últimos 7d:      ${snapshot.dedupedUltimos7Dias}`);
console.log(`  Legacies restantes:       ${snapshot.legaciesTotal}\n`);
