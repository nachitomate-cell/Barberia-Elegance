/**
 * migrate-chameleon-clientes-to-users.js
 *
 * Migra clientes de AgendaPro a:
 *   1. tenants/chameleon/clientes/{telefono}  (para lookups de citas y cron de cumpleaños)
 *   2. tenants/chameleon/users/{telefono}     (para que aparezcan en el panel de administración /gestion-interna/clientes)
 *
 * Uso:
 *   node migraciones/migrate-chameleon-clientes-to-users.js          → DRY RUN
 *   node migraciones/migrate-chameleon-clientes-to-users.js --commit → escribe a Firestore
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const TENANT_ID = 'chameleon';
const INPUT_FILE = path.join(__dirname, 'clientes-chameleon-clean.json');
const BATCH_SIZE = 250; // Usamos 250 porque escribimos 2 documentos por cliente (500 operaciones máx por batch)
const COMMIT = process.argv.includes('--commit');

// ── Auth ──────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'service-account.json');
let credential;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')));
  console.log('🔑 Usando service-account.json');
} else {
  credential = admin.credential.applicationDefault();
  console.log('🔑 Usando Application Default Credentials');
}
admin.initializeApp({ credential, projectId: 'barberia-elegance' });
const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Falta ${INPUT_FILE}`);
    process.exit(1);
  }
  const clientes = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`📥 Leídos ${clientes.length} clientes desde ${path.basename(INPUT_FILE)}`);
  console.log(`🎯 Destinos:`);
  console.log(`   - tenants/${TENANT_ID}/clientes/{telefono}`);
  console.log(`   - tenants/${TENANT_ID}/users/{telefono} (uid = telefono)`);
  console.log(`📦 Tamaño batch: ${BATCH_SIZE} clientes (500 escrituras)`);
  console.log(COMMIT ? '🚀 MODO COMMIT — se escribirá a Firestore' : '🧪 DRY RUN — no se escribe nada (pasá --commit para escribir)');
  console.log('');

  const colClientes = db.collection(`tenants/${TENANT_ID}/clientes`);
  const colUsers = db.collection(`tenants/${TENANT_ID}/users`);

  const total = clientes.length;
  let written = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = clientes.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    let inBatch = 0;

    for (const c of chunk) {
      const telefono = String(c.telefono || '').trim();
      if (!telefono) {
        skipped++;
        errors.push({ row: i + inBatch, reason: 'sin teléfono', data: c });
        continue;
      }
      if (telefono.includes('/') || telefono === '.' || telefono === '..') {
        skipped++;
        errors.push({ row: i + inBatch, reason: `ID inválido: ${telefono}`, data: c });
        continue;
      }

      // 1. Datos para la colección 'clientes' (lookups rápidos por teléfono)
      const dataCliente = {
        nombre:    c.nombre || '',
        telefono,
        ...(c.email ? { email: c.email } : {}),
        uid:       telefono, // vinculamos el uid al teléfono del documento en 'users'
        ...(c.fechaRegistroOriginal ? { fechaRegistroOriginal: c.fechaRegistroOriginal } : {}),
        sellosDisponibles:    admin.firestore.FieldValue.increment(0),
        sellosHistoricos:     admin.firestore.FieldValue.increment(0),
        stamps:               admin.firestore.FieldValue.increment(0),
        importedFrom:         'agendapro',
        importedAt:           TS(),
        updatedAt:            TS(),
      };

      // 2. Datos para la colección 'users' (fidelización principal en panel)
      const dataUser = {
        uid:                  telefono, // su uid es su número de teléfono
        nombre:               c.nombre || '',
        telefono,
        ...(c.email ? { email: c.email } : {}),
        stamps:               admin.firestore.FieldValue.increment(0),
        sellosDisponibles:    admin.firestore.FieldValue.increment(0),
        sellosHistoricos:     admin.firestore.FieldValue.increment(0),
        importedFrom:         'agendapro',
        creadoEn:             TS(),
        updatedAt:            TS(),
      };

      batch.set(colClientes.doc(telefono), dataCliente, { merge: true });
      batch.set(colUsers.doc(telefono), dataUser, { merge: true });
      inBatch++;
    }

    if (COMMIT && inBatch > 0) {
      try {
        await batch.commit();
        written += inBatch;
        process.stdout.write(`\r  ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${written}/${total} clientes migrados en ambas colecciones...`);
      } catch (e) {
        console.error(`\n  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} falló:`, e.message);
        process.exit(1);
      }
    } else if (!COMMIT) {
      written += inBatch;
      console.log(`  [dry] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inBatch} clientes preparados para ambas colecciones (acumulado ${written}/${total})`);
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════');
  console.log(`  ${COMMIT ? '✅ Migración dual completa' : '🧪 Dry run completo'}`);
  console.log(`  Clientes migrados:     ${written}`);
  console.log(`  Operaciones de escritura: ${COMMIT ? written * 2 : 0}`);
  console.log(`  Skipped:               ${skipped}`);
  console.log('═══════════════════════════════════════');

  if (errors.length > 0) {
    console.log(`\n⚠ ${errors.length} filas con problemas:`);
    errors.slice(0, 10).forEach(e => console.log(`  - row ${e.row}: ${e.reason} (${JSON.stringify(e.data)})`));
  }

  if (!COMMIT) {
    console.log('\n💡 Cuando estés conforme, corré:');
    console.log('   node migraciones/migrate-chameleon-clientes-to-users.js --commit\n');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('❌ Error fatal:', e);
  process.exit(1);
});
