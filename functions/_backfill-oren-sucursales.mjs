// _backfill-oren-sucursales.mjs
// Asigna sucursalId a barberos + backfilllea citas huérfanas en oren.
//
// USO:
//   node _backfill-oren-sucursales.mjs             # dry-run (default)
//   node _backfill-oren-sucursales.mjs --apply     # ejecuta

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const TENANT = 'oren';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  BACKFILL SUCURSAL ID EN OREN  ${APPLY ? '⚠️  APPLY MODE  ' : '(DRY-RUN)'.padEnd(20)}    ║`);
console.log(`╚══════════════════════════════════════════════════════════════╝`);

// ── Regla de asignación ─────────────────────────────────────────────
// Todos en Reñaca EXCEPTO Pablo + Admin Villa Alemana → Villa Alemana.
// oren-max-villa → activo:false (Max ya no atiende en Villa).
const VILLAALEMANA_NOMBRES = new Set([
  'Barbero Pablo',
  'Admin Villa Alemana',
]);
// Max está inactivo — desactivar sus 3 docs (canónicos de ambas sedes + espejo authUid).
const DEACTIVATE_DOCID = new Set([
  'oren-max-villa',
  'oren-max-renaca',
  'WkcTvw9HHGV2NVu4hoNwDImNfA72', // espejo authUid de Max
]);

// Citas fantasma a cancelar (barbero borrado, no reasignable).
const CANCEL_CITAS = new Set(['R2wnYOLQW7kNWAdkIDMO']);

// ── PASO 1: cargar barberos ─────────────────────────────────────────
const barbSnap = await db.collection(`tenants/${TENANT}/barberos`).get();
const barberos = barbSnap.docs.map(d => ({ id: d.id, data: d.data() }));
console.log(`\n── PASO 1: barberos cargados: ${barberos.length}`);

// Índices: authUid → doc canónico (con sucursalId)
const byAuthUid = new Map();
for (const b of barberos) {
  const authUid = b.data.authUid || b.data.uid;
  if (authUid) {
    if (!byAuthUid.has(authUid)) byAuthUid.set(authUid, []);
    byAuthUid.get(authUid).push(b);
  }
}

// ── PASO 2: plan de barberos ────────────────────────────────────────
const planBarb = [];
for (const b of barberos) {
  const nombre = b.data.nombre || b.data.displayName || '';
  const currentSuc = b.data.sucursalId;
  let expected = null;
  let deactivate = false;

  if (DEACTIVATE_DOCID.has(b.id)) {
    deactivate = true;
  } else if (VILLAALEMANA_NOMBRES.has(nombre)) {
    expected = 'villaalemana';
  } else {
    // Todo lo demás → renaca. Incluye espejos por authUid.
    expected = 'renaca';
  }

  const needsSuc  = expected && currentSuc !== expected;
  const needsDeac = deactivate && b.data.activo !== false;

  if (needsSuc || needsDeac) {
    planBarb.push({ id: b.id, nombre, from: currentSuc || '(vacío)', to: expected, deactivate: needsDeac });
  }
}

console.log(`\n── PASO 2: plan barberos — ${planBarb.length} actualizaciones`);
for (const p of planBarb) {
  const arrow = p.deactivate ? '❌ activo:false' : `${p.from} → ${p.to}`;
  console.log(`   • ${p.id.padEnd(35)}  "${p.nombre.padEnd(25)}"  ${arrow}`);
}

// ── PASO 3: citas huérfanas → resolver por barberoId ────────────────
// Mapa barberoId → sucursalId (post-plan): incluye espejos por authUid resueltos.
const barbSucId = new Map();
for (const b of barberos) {
  const nombre = b.data.nombre || '';
  if (DEACTIVATE_DOCID.has(b.id)) {
    // Aún así asignar sucursalId=villaalemana por historial
    barbSucId.set(b.id, 'villaalemana');
  } else if (VILLAALEMANA_NOMBRES.has(nombre)) {
    barbSucId.set(b.id, 'villaalemana');
  } else {
    barbSucId.set(b.id, 'renaca');
  }
}

const citasSnap = await db.collection(`tenants/${TENANT}/citas`).get();
const planCitas = [];
const orphan = [];  // citas con barberoId que no existe en barberos/
for (const d of citasSnap.docs) {
  const c = d.data();
  if (c.sucursalId) continue;
  const suc = barbSucId.get(c.barberoId);
  if (suc) {
    planCitas.push({ id: d.id, barberoId: c.barberoId, sucursalId: suc, fecha: c.fecha });
  } else {
    orphan.push({ id: d.id, barberoId: c.barberoId, clienteNombre: c.clienteNombre, fecha: c.fecha });
  }
}

console.log(`\n── PASO 3: citas huérfanas`);
console.log(`   Resolubles: ${planCitas.length}`);
console.log(`   Con barbero fantasma: ${orphan.length}`);
if (orphan.length && orphan.length <= 10) {
  console.log(`   Fantasmas (barberoId sin match en barberos/):`);
  for (const o of orphan) console.log(`      • ${o.id}  barberoId=${o.barberoId}  cliente="${o.clienteNombre}"  fecha=${o.fecha}`);
}

// ── APPLY ───────────────────────────────────────────────────────────
if (!APPLY) {
  console.log(`\n   (dry-run) Correr con --apply para ejecutar.\n`);
  process.exit(0);
}

console.log(`\n── APPLY ──`);
// Barberos
let updB = 0;
for (const p of planBarb) {
  const ref = db.doc(`tenants/${TENANT}/barberos/${p.id}`);
  const patch = { updatedAt: FieldValue.serverTimestamp() };
  if (p.deactivate) patch.activo = false;
  if (p.to)         patch.sucursalId = p.to;
  await ref.update(patch);
  updB++;
}
console.log(`   ✅ ${updB} barbero(s) actualizados`);

// Citas: batches de 400
let updC = 0;
for (let i = 0; i < planCitas.length; i += 400) {
  const chunk = planCitas.slice(i, i + 400);
  const batch = db.batch();
  for (const p of chunk) {
    const ref = db.doc(`tenants/${TENANT}/citas/${p.id}`);
    batch.update(ref, {
      sucursalId: p.sucursalId,
      sucursalNombre: p.sucursalId === 'renaca' ? 'Oren Barber Reñaca' : 'Oren Barber Villa Alemana',
      backfilledSucursalAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  updC += chunk.length;
}
console.log(`   ✅ ${updC} cita(s) actualizadas`);

// Cancelar citas fantasma
let updCancel = 0;
for (const citaId of CANCEL_CITAS) {
  await db.doc(`tenants/${TENANT}/citas/${citaId}`).update({
    estado: 'Cancelada',
    canceladaPor: 'backfill_barbero_fantasma',
    canceladaEn: FieldValue.serverTimestamp(),
  });
  updCancel++;
}
console.log(`   ✅ ${updCancel} cita(s) fantasma canceladas\n`);
