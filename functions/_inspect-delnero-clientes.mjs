// Buscar los clientes reportados en delnero (Ignacio, vicente, Amaro) y ver
// en qué colecciones/campos aparecen y qué shape tienen.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = 'delnero';

async function scanCol(colName, needles) {
  console.log(`\n═══ ${colName} ═══`);
  const snap = await db.collection(`tenants/${T}/${colName}`).get();
  console.log(`  total: ${snap.size} docs`);
  const matches = [];
  snap.docs.forEach(d => {
    const data = d.data();
    const nombre = (data.nombre || data.name || data.displayName || '').toLowerCase();
    const email  = (data.email || '').toLowerCase();
    for (const n of needles) {
      if (nombre.includes(n) || email.includes(n)) {
        matches.push({ id: d.id, ...data });
        break;
      }
    }
  });
  if (!matches.length) { console.log('  (sin matches)'); return; }
  matches.forEach(m => {
    console.log(`  ${m.id}`);
    console.log(`    nombre="${m.nombre || ''}" email="${m.email || ''}" tel="${m.telefono || ''}" uid="${m.uid || ''}"`);
    // Campos que podrian filtrarse por diferentes vistas
    const flags = [];
    if (m._mainDocId)     flags.push(`_mainDocId=${m._mainDocId}`);
    if (m.esQA)           flags.push('esQA');
    if (m.eliminado)      flags.push('eliminado');
    if (m.archivado)      flags.push('archivado');
    if (m.oculto)         flags.push('oculto');
    if (m.activo === false) flags.push('activo:false');
    if (m.tenantId)       flags.push(`tenantId=${m.tenantId}`);
    if (flags.length)     console.log(`    flags: ${flags.join(', ')}`);
    if (m.createdAt)      console.log(`    createdAt: ${m.createdAt.toDate ? m.createdAt.toDate().toISOString() : m.createdAt}`);
  });
}

const needles = ['ignacio', 'vicente', 'amaro'];
await scanCol('users', needles);
await scanCol('clientes', needles);
