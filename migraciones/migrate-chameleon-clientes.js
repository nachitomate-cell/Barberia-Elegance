/**
 * migrate-chameleon-clientes.js
 *
 * Migra clientes de AgendaPro a tenants/chameleon/clientes/{telefono}.
 *
 * Input:  ./clientes-chameleon-clean.json  (595 clientes ya limpios y dedupedos)
 * Output: 1 doc por cliente en Firestore, en batches de 500.
 *
 * Idempotente: se puede correr múltiples veces. Usa merge:true, no pisa
 * sellos ni datos existentes — solo agrega/actualiza nombre, email, telefono
 * y metadata de import.
 *
 * Uso (desde la raíz del repo):
 *   node migraciones/migrate-chameleon-clientes.js          → DRY RUN (no escribe)
 *   node migraciones/migrate-chameleon-clientes.js --commit → escribe a Firestore
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const TENANT_ID = 'chameleon';
const INPUT_FILE = path.join(__dirname, 'clientes-chameleon-clean.json');
const BATCH_SIZE = 500;
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
  console.log(`🎯 Destino: tenants/${TENANT_ID}/clientes/{telefono}`);
  console.log(`📦 Tamaño batch: ${BATCH_SIZE}`);
  console.log(COMMIT ? '🚀 MODO COMMIT — se escribirá a Firestore' : '🧪 DRY RUN — no se escribe nada (pasá --commit para escribir)');
  console.log('');

  const col = db.collection(`tenants/${TENANT_ID}/clientes`);
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
      // Validar ID seguro para Firestore
      if (telefono.includes('/') || telefono === '.' || telefono === '..') {
        skipped++;
        errors.push({ row: i + inBatch, reason: `ID inválido: ${telefono}`, data: c });
        continue;
      }

      const data = {
        nombre:    c.nombre || '',
        telefono,
        ...(c.email ? { email: c.email } : {}),
        ...(c.fechaRegistroOriginal ? { fechaRegistroOriginal: c.fechaRegistroOriginal } : {}),
        sellosDisponibles:    admin.firestore.FieldValue.increment(0), // no toca si existe, deja 0 si es nuevo
        sellosHistoricos:     admin.firestore.FieldValue.increment(0),
        stamps:               admin.firestore.FieldValue.increment(0),
        importedFrom:         'agendapro',
        importedAt:           TS(),
        updatedAt:            TS(),
      };

      batch.set(col.doc(telefono), data, { merge: true });
      inBatch++;
    }

    if (COMMIT && inBatch > 0) {
      try {
        await batch.commit();
        written += inBatch;
        process.stdout.write(`\r  ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${written}/${total} escritos...`);
      } catch (e) {
        console.error(`\n  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} falló:`, e.message);
        process.exit(1);
      }
    } else if (!COMMIT) {
      written += inBatch;
      console.log(`  [dry] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inBatch} docs preparados (acumulado ${written}/${total})`);
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════');
  console.log(`  ${COMMIT ? '✅ Migración completa' : '🧪 Dry run completo'}`);
  console.log(`  Escritos / preparados: ${written}`);
  console.log(`  Skipped:               ${skipped}`);
  console.log('═══════════════════════════════════════');

  if (errors.length > 0) {
    console.log(`\n⚠ ${errors.length} filas con problemas:`);
    errors.slice(0, 10).forEach(e => console.log(`  - row ${e.row}: ${e.reason} (${JSON.stringify(e.data)})`));
    if (errors.length > 10) console.log(`  ... y ${errors.length - 10} más`);
  }

  if (!COMMIT) {
    console.log('\n💡 Cuando estés conforme, corré:');
    console.log('   node migraciones/migrate-chameleon-clientes.js --commit\n');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('❌ Error fatal:', e);
  process.exit(1);
});
