// Inspecciona el estado del cliente de prueba y sus packs.
// Útil para verificar entre pasos del checklist.
//
// Uso: node _sandbox-packs-inspect.mjs

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const TENANT = 'delnero';
const CLIENTE_UID = '56999888777';

const uSnap = await db.doc(`tenants/${TENANT}/users/${CLIENTE_UID}`).get();
if (!uSnap.exists) { console.log('✗ Cliente NO existe. Corré _setup-sandbox-packs.mjs --apply primero.'); process.exit(1); }
const u = uSnap.data();

console.log(`\n═══ ESTADO DEL CLIENTE ═══`);
console.log(`  ${u.nombre || '?'} · ${u.telefono || '?'}`);
console.log(`  Email: ${u.email || '(sin email)'}`);
console.log(`  Es legacy: ${!!u.esLegacy}`);
console.log('');

const packs = Array.isArray(u.packsActivos) ? u.packsActivos : [];
console.log(`═══ PACKS ACTIVOS (${packs.length}) ═══`);
if (packs.length === 0) {
  console.log('  (ninguno · cliente listo para comprar un pack nuevo)');
} else {
  for (const p of packs) {
    const venceMs = p.fechaVencimiento?.toMillis?.() || 0;
    const vencido = venceMs > 0 && venceMs < Date.now();
    const diasResta = venceMs > 0 ? Math.ceil((venceMs - Date.now()) / (24 * 60 * 60 * 1000)) : '?';
    const venceStr = venceMs > 0 ? new Date(venceMs).toLocaleDateString('es-CL') : '(sin vencimiento)';
    console.log(`  • ${p.nombrePack || p.packId}`);
    console.log(`     Sesiones: ${p.sesionesRestantes || 0} / ${p.sesionesTotales || '?'}`);
    if (p.serviciosRestantes) {
      console.log(`     Por servicio:`, JSON.stringify(p.serviciosRestantes));
    }
    console.log(`     Vence: ${venceStr}  (${vencido ? '⚠ VENCIDO' : `${diasResta}d restantes`})`);
    console.log(`     Cita de activación: ${p.citaActivacion}`);
    console.log(`     Citas consumidas: ${(p.citasConsumo || []).length}`);
  }
}

// Logs de packConsumos (filtramos por userId; ordenamos en memoria para
// evitar necesitar un índice compuesto).
const logsSnap = await db.collection(`tenants/${TENANT}/packConsumos`)
  .where('userId', '==', CLIENTE_UID)
  .get();

console.log(`\n═══ LOG DE PACKS (últimos 5) ═══`);
if (logsSnap.empty) {
  console.log('  (sin registros)');
} else {
  const logs = logsSnap.docs.map(d => d.data())
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .slice(0, 5);
  for (const l of logs) {
    const cuando = l.createdAt?.toDate?.().toLocaleString('es-CL') || '?';
    console.log(`  [${(l.tipo || '?').toUpperCase().padEnd(11)}] ${cuando} · ${l.packNombre} · ${l.sesionesAntes}→${l.sesionesDespues} · cita ${l.citaId}`);
  }
}

// Últimas 5 citas del cliente
const citasSnap = await db.collection(`tenants/${TENANT}/citas`)
  .where('clienteTelefono', '==', u.telefono || '')
  .limit(10)
  .get();

console.log(`\n═══ CITAS RECIENTES DE ESTE CLIENTE (${citasSnap.size}) ═══`);
if (citasSnap.empty) {
  console.log('  (sin citas)');
} else {
  const citas = citasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  citas.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  for (const c of citas.slice(0, 5)) {
    const flag = c.packProcesado ? ' 📦' : '';
    const est  = (c.estado || '?').padEnd(11);
    console.log(`  ${c.fecha} ${c.hora || '?'} · ${est} · ${(c.servicioNombre || '?').padEnd(30)} · precio=$${(Number(c.precio)||0).toLocaleString('es-CL')}${flag}`);
    if (c.esActivacionPack) console.log(`     ✓ Activó pack (sesión ${c.packSesionIndex}/${c.packSesionTotal})`);
    if (c.consumeSesionPack) console.log(`     → Consumo de pack (refId ${c.packRefId})`);
  }
}
console.log('');
