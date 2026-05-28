/**
 * migrate-djones-clientes.js
 *
 * Migra 805 clientes de D'Jones Barber desde el export de AgendaPro.
 *
 * NOTA: el tenantId interno de D'Jones es 'lumen' (decisión de no renombrar
 * para evitar tocar ~250 referencias CSS/JS). El cliente final ve "D'Jones
 * Barber" en todos lados; 'lumen' es solo el identificador interno.
 *
 * IMPORTANTE: D'Jones NO requiere contraseña para el Club de Fidelidad.
 * Por eso este script crea AMBAS colecciones en una sola corrida:
 *
 *   tenants/lumen/clientes/{telefono}  → para lookups rápidos (cron cumpleaños, etc.)
 *   tenants/lumen/users/{telefono}     → con uid=telefono, perfil "pasivo" del Club.
 *                                        Aparece en /gestion-interna/clientes con
 *                                        badge "MIGRADO". La CF sello-automatico
 *                                        le suma sello al completar citas aunque
 *                                        el cliente nunca se registre activamente.
 *
 *   Si en el futuro algún cliente quiere registrarse con email+password, la CF
 *   dedupeOnCreateTenant detecta el perfil pasivo y mergea sellos/historial.
 *
 * Uso (desde la raíz del repo):
 *   node migraciones/migrate-djones-clientes.js          → DRY RUN (no escribe)
 *   node migraciones/migrate-djones-clientes.js --commit → escribe a Firestore
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const TENANT_ID  = 'lumen'; // D'Jones Barber (tenantId interno = lumen)
const INPUT_FILE = path.join(__dirname, 'clientes-djones-clean.json');
const BATCH_SIZE = 250; // 250 clientes * 2 docs = 500 ops por batch (límite Firestore)
const COMMIT     = process.argv.includes('--commit');

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
const INC = admin.firestore.FieldValue.increment;

async function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Falta ${INPUT_FILE}`);
    process.exit(1);
  }
  const clientes = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`📥 Leídos ${clientes.length} clientes desde ${path.basename(INPUT_FILE)}`);
  console.log(`🎯 Destino:`);
  console.log(`   - tenants/${TENANT_ID}/clientes/{telefono}`);
  console.log(`   - tenants/${TENANT_ID}/users/{telefono}    (uid = telefono, perfil pasivo)`);
  console.log(`📦 Tamaño batch: ${BATCH_SIZE} clientes (× 2 docs = ${BATCH_SIZE * 2} ops)`);
  console.log(COMMIT ? '🚀 MODO COMMIT — escribe a Firestore' : '🧪 DRY RUN — pasá --commit para escribir');
  console.log('');

  const colClientes = db.collection(`tenants/${TENANT_ID}/clientes`);
  const colUsers    = db.collection(`tenants/${TENANT_ID}/users`);
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
      // docId: el principal queda con id=telefono; familiares con id=telefono__nombre-slug.
      // Esto permite que distintas personas con mismo telefono (padre/hijo, hermanos)
      // tengan perfiles separados en el panel admin.
      const docId = String(c.docId || telefono).trim();
      if (!docId || docId.includes('/') || docId === '.' || docId === '..') {
        skipped++;
        errors.push({ row: i + inBatch, reason: 'ID inválido', data: c });
        continue;
      }

      // Campos de relación familiar (si aplica)
      const familiarFields = c.compartesTelefono
        ? {
            compartesTelefono:        true,
            telefonoPrincipalDocId:   c.telefonoPrincipalDocId || telefono,
          }
        : {};

      const dataCliente = {
        nombre:    c.nombre || 'Cliente',
        telefono,
        ...(c.email ? { email: c.email } : {}),
        uid:       docId, // marca de perfil pasivo (uid === docId)
        ...(c.fechaRegistroOriginal ? { fechaRegistroOriginal: c.fechaRegistroOriginal } : {}),
        ...familiarFields,
        sellosDisponibles:  INC(0),
        sellosHistoricos:   INC(0),
        stamps:             INC(0),
        importedFrom:       'agendapro',
        importedAt:         TS(),
        updatedAt:          TS(),
      };

      const dataUser = {
        uid:                docId, // uid===id → perfil pasivo (mismo patrón que autoEnroll)
        nombre:             c.nombre || 'Cliente',
        telefono,
        ...(c.email ? { email: c.email } : {}),
        ...(c.fechaRegistroOriginal ? { fechaRegistroOriginal: c.fechaRegistroOriginal } : {}),
        ...familiarFields,
        sellosDisponibles:  INC(0),
        sellosHistoricos:   INC(0),
        stamps:             INC(0),
        importedFrom:       'agendapro',
        creadoEn:           TS(),
        updatedAt:          TS(),
      };

      batch.set(colClientes.doc(docId), dataCliente, { merge: true });
      batch.set(colUsers.doc(docId),    dataUser,    { merge: true });
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
      console.log(`  [dry] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inBatch} clientes preparados (acumulado ${written}/${total})`);
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════');
  console.log(`  ${COMMIT ? '✅ Migración completa' : '🧪 Dry run completo'}`);
  console.log(`  Escritos / preparados: ${written}  (= ${written * 2} docs en Firestore)`);
  console.log(`  Skipped:               ${skipped}`);
  console.log('═══════════════════════════════════════');

  if (errors.length > 0) {
    console.log(`\n⚠ ${errors.length} filas con problemas:`);
    errors.slice(0, 10).forEach(e => console.log(`  - row ${e.row}: ${e.reason} (${JSON.stringify(e.data)})`));
    if (errors.length > 10) console.log(`  ... y ${errors.length - 10} más`);
  }

  if (!COMMIT) {
    console.log('\n💡 Cuando estés conforme:');
    console.log('   node migraciones/migrate-djones-clientes.js --commit\n');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('❌ Error fatal:', e);
  process.exit(1);
});
