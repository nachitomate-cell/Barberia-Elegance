/**
 * migrate-ferraza.js
 * Migra todas las colecciones de Barbería Ferraza (proyecto barberiaferraza-edc26)
 * al proyecto Elegance bajo /tenants/ferraza/
 *
 * Uso: node migrate-ferraza.js
 * Requiere: ferraza-service-account.json y service-account.json en la raíz
 */

const admin = require('firebase-admin');

// ── Apps ──────────────────────────────────────────────────────────────────────
const ferrazaApp = admin.initializeApp({
  credential: admin.credential.cert(require('./ferraza-service-account.json')),
  projectId: 'barberiaferraza-edc26',
}, 'ferraza');

const eleganceApp = admin.initializeApp({
  credential: admin.credential.cert(require('./service-account.json')),
  projectId: 'barberia-elegance',
}, 'elegance');

const src = admin.firestore(ferrazaApp);
const dst = admin.firestore(eleganceApp);
const TS  = admin.firestore.FieldValue.serverTimestamp;

const TENANT_ID = 'ferraza';

// Colecciones planas a migrar (origen → destino relativo al tenant)
const COLLECTIONS = [
  'citas',
  'servicios',
  'configuracion',
  'barberos',
  'bloqueos',
  'premios',
  'users',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function sep(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 48 - title.length))}`);
}

async function commitInBatches(dstDb, writes) {
  for (let i = 0; i < writes.length; i += 400) {
    const batch = dstDb.batch();
    writes.slice(i, i + 400).forEach(({ ref, data }) => batch.set(ref, data));
    await batch.commit();
  }
}

// ── Migrar colección plana ────────────────────────────────────────────────────
async function migrateCollection(colName) {
  const snap = await src.collection(colName).get();
  if (snap.empty) {
    console.log(`  ⏭  /${colName} vacía`);
    return 0;
  }

  const dstBase = `tenants/${TENANT_ID}/${colName}`;
  const writes   = snap.docs.map(doc => ({
    ref:  dst.collection(dstBase).doc(doc.id),
    data: doc.data(),
  }));

  await commitInBatches(dst, writes);
  console.log(`  ✅ ${writes.length} docs → /${dstBase}`);
  return writes.length;
}

// ── Migrar subcolecciones de /barberos ────────────────────────────────────────
async function migrateBarberosSubcols() {
  const snap = await src.collection('barberos').get();
  if (snap.empty) return;

  for (const doc of snap.docs) {
    const cfgSnap = await doc.ref.collection('configuracion').get();
    if (cfgSnap.empty) continue;

    const writes = cfgSnap.docs.map(cfg => ({
      ref:  dst.doc(`tenants/${TENANT_ID}/barberos/${doc.id}/configuracion/${cfg.id}`),
      data: cfg.data(),
    }));

    await commitInBatches(dst, writes);
    console.log(`    ↳ barberos/${doc.id}/configuracion: ${writes.length} docs`);
  }
}

// ── Migrar bookings SaaS (si existen en el proyecto Ferraza) ──────────────────
async function migrateBookings() {
  try {
    const snap = await src.collection('tenants').doc(TENANT_ID).collection('bookings').get();
    if (snap.empty) { console.log('  ⏭  Sin bookings SaaS previos'); return; }

    const writes = snap.docs.map(doc => ({
      ref:  dst.collection(`tenants/${TENANT_ID}/bookings`).doc(doc.id),
      data: doc.data(),
    }));
    await commitInBatches(dst, writes);
    console.log(`  ✅ ${writes.length} bookings migrados`);
  } catch (_) {
    console.log('  ⏭  Sin colección bookings en Ferraza');
  }
}

// ── Crear perfil y tema del tenant ────────────────────────────────────────────
async function seedTenantProfile() {
  const tenantRef = dst.collection('tenants').doc(TENANT_ID);

  await tenantRef.collection('profile').doc('main').set({
    name:            'Barbería Ferraza',
    shortName:       'Ferraza',
    slogan:          'El cambio comienza por ti',
    club:            'Club Ferraza',
    address:         'Av. Libertad 63 / Local 28',
    scheduleText:    'Lun a Sáb 10:00 – 20:00 hrs.',
    phone:           '56994269228',
    logoUrl:         '/logo.jpg',
    pageTitle:       'Agendar Hora | Barbería Ferraza',
    metaDescription: 'Reserva tu hora en Barbería Ferraza. El cambio comienza por ti.',
    updatedAt:       TS(),
  });

  await tenantRef.collection('settings').doc('theme').set({
    colorBg:      '#050505',
    colorSurface: '#0a0a0d',
    colorPrimary: '#ffffff',
    colorAccent:  '#d4d4d8',
    updatedAt:    TS(),
  });

  console.log('  ✅ Profile y theme creados');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function migrate() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Migración: Ferraza → Elegance (tenant)             ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Origen : barberiaferraza-edc26`);
  console.log(`  Destino: barberia-elegance /tenants/ferraza/\n`);

  sep('PERFIL TENANT');
  await seedTenantProfile();

  for (const col of COLLECTIONS) {
    sep(col.toUpperCase());
    await migrateCollection(col);
    if (col === 'barberos') await migrateBarberosSubcols();
  }

  sep('BOOKINGS SAAS');
  await migrateBookings();

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   ✅  Migración completada                            ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  process.exit(0);
}

migrate().catch(err => {
  console.error('\n❌ Error durante la migración:', err.message || err);
  process.exit(1);
});
