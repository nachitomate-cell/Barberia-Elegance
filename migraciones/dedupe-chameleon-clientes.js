/**
 * dedupe-chameleon-clientes.js
 *
 * Limpia perfiles duplicados en tenants/chameleon/users creados cuando un
 * cliente migrado de AgendaPro (con uid = telefono) se registra después
 * por Firebase Auth (creando un nuevo doc con uid = firebaseAuthUid).
 *
 * Estrategia:
 *   1. Lee todos los docs de tenants/chameleon/users.
 *   2. Agrupa por email (case-insensitive).
 *   3. Para cada grupo con > 1 docs:
 *        - Identifica "real" = doc cuyo id != uid (uid es Firebase Auth real).
 *        - Identifica "legacy" = doc cuyo id == uid Y/O importedFrom == 'agendapro'.
 *      Si hay real + legacy:
 *        - Mergea sellos, historial, fechaRegistroOriginal al real.
 *        - Guarda telefono del legacy como telefonoAnterior en el real.
 *        - Borra el doc legacy de users/.
 *        - Borra el doc legacy de clientes/{telefonoLegacy} si quedó huérfano.
 *      Si solo hay legacy (no se registró aún): NO TOCA.
 *      Si solo hay real (no fue migrado): NO TOCA.
 *
 * Uso:
 *   node migraciones/dedupe-chameleon-clientes.js          → DRY RUN (no escribe)
 *   node migraciones/dedupe-chameleon-clientes.js --commit → ejecuta cambios
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

// --tenant=<id> para reusarlo en otros tenants migrados (default: chameleon).
const TENANT_ID = (process.argv.find(a => a.startsWith('--tenant=')) || '--tenant=chameleon').split('=')[1];
const COMMIT    = process.argv.includes('--commit');

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
const FieldValue = admin.firestore.FieldValue;

const usersCol    = db.collection(`tenants/${TENANT_ID}/users`);
const clientesCol = db.collection(`tenants/${TENANT_ID}/clientes`);

function normalize(s) {
  return (s || '').toString().trim().toLowerCase();
}

function isLegacy(doc) {
  const d = doc.data();
  // Doc de migración: users/{telefono} (uid === id) o id con forma de teléfono.
  // OJO: 'importedFrom' ya NO clasifica — el merge lo estampa en el doc REAL
  // como traza histórica, y usarlo hacía que un real ya fusionado quedara
  // clasificado legacy en corridas posteriores (caso aura aaprz2121).
  const idTelefono = /^\+?\d{8,15}$/.test(doc.id);
  return d.uid === doc.id || idTelefono;
}

async function main() {
  console.log(`🎯 Tenant: ${TENANT_ID}`);
  console.log(COMMIT ? '🚀 MODO COMMIT — escribe cambios a Firestore' : '🧪 DRY RUN — no se escribe nada (pasá --commit para ejecutar)');
  console.log('');

  const snap = await usersCol.get();
  console.log(`📥 Leídos ${snap.size} docs en users/`);

  // Agrupar por email
  const byEmail = new Map();
  let sinEmail = 0;
  for (const doc of snap.docs) {
    const email = normalize(doc.data().email);
    if (!email) {
      sinEmail++;
      continue;
    }
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push(doc);
  }
  console.log(`   - Con email:  ${snap.size - sinEmail}`);
  console.log(`   - Sin email:  ${sinEmail} (se ignoran, no se pueden dedupar)\n`);

  const duplicados = [...byEmail.entries()].filter(([, docs]) => docs.length > 1);
  console.log(`🔍 Encontrados ${duplicados.length} emails con perfiles duplicados\n`);

  if (duplicados.length === 0) {
    console.log('✅ Nada que hacer.');
    process.exit(0);
  }

  let merged    = 0;
  let skipped   = 0;
  let clientesBorrados = 0;

  for (const [email, docs] of duplicados) {
    const reales   = docs.filter(d => !isLegacy(d));
    const legacies = docs.filter(d =>  isLegacy(d));

    console.log(`\n📧 ${email}`);
    console.log(`   ${docs.length} docs (${reales.length} reales · ${legacies.length} legacy)`);
    docs.forEach(d => {
      const data = d.data();
      console.log(`     · ${d.id.padEnd(30)} uid=${(data.uid || '').slice(0, 30).padEnd(30)} sellos=${data.sellosHistoricos ?? data.stamps ?? 0} tel=${data.telefono || '—'}`);
    });

    if (reales.length === 0) {
      console.log('   → solo legacy, sin registro real aún. Se preserva como está.');
      skipped++;
      continue;
    }
    if (legacies.length === 0) {
      console.log('   → solo reales, no aplica dedup.');
      skipped++;
      continue;
    }
    if (reales.length > 1) {
      console.log(`   ⚠ ${reales.length} docs "reales" para el mismo email — caso raro. NO se toca, revisar manualmente.`);
      skipped++;
      continue;
    }

    const real    = reales[0];
    const realRef = real.ref;
    const realData = real.data();

    // Acumular cambios al real desde TODOS los legacies
    const mergeUpdate = {
      importedFrom:           'agendapro', // marca histórica
      updatedAt:              FieldValue.serverTimestamp(),
      dedupedAt:              FieldValue.serverTimestamp(),
    };
    const sellosHistAdd  = legacies.reduce((s, l) => s + (Number(l.data().sellosHistoricos) || 0), 0);
    const sellosDispAdd  = legacies.reduce((s, l) => s + (Number(l.data().sellosDisponibles) || 0), 0);
    const stampsAdd      = legacies.reduce((s, l) => s + (Number(l.data().stamps)            || 0), 0);

    if (sellosHistAdd > 0) mergeUpdate.sellosHistoricos = FieldValue.increment(sellosHistAdd);
    if (sellosDispAdd > 0) mergeUpdate.sellosDisponibles = FieldValue.increment(sellosDispAdd);
    if (stampsAdd > 0)     mergeUpdate.stamps            = FieldValue.increment(stampsAdd);

    // Historial concatenado
    const historialExtra = legacies.flatMap(l => l.data().historialSellos || []);
    if (historialExtra.length > 0) {
      mergeUpdate.historialSellos = FieldValue.arrayUnion(...historialExtra);
    }

    // fechaRegistroOriginal: si el real no tiene, tomar la del legacy más antiguo
    if (!realData.fechaRegistroOriginal) {
      const fromLegacy = legacies.map(l => l.data().fechaRegistroOriginal).filter(Boolean)[0];
      if (fromLegacy) mergeUpdate.fechaRegistroOriginal = fromLegacy;
    }

    // telefonoAnterior: si los legacies tienen un teléfono distinto al real
    const telsLegacy = legacies.map(l => l.data().telefono).filter(t => t && t !== realData.telefono);
    if (telsLegacy.length > 0 && !realData.telefonoAnterior) {
      mergeUpdate.telefonoAnterior = telsLegacy[0];
    }

    // IDs de docs en clientes/ a borrar (los telefonos legacy)
    const telefonosLegacyParaBorrar = telsLegacy.map(t => (t || '').replace(/\D/g, '')).filter(Boolean);

    console.log(`   ✏ Plan:`);
    console.log(`     - Mergear al real (${real.id}): +${sellosHistAdd} histórico, +${sellosDispAdd} disponible, +${stampsAdd} stamps`);
    if (mergeUpdate.fechaRegistroOriginal) console.log(`     - Adoptar fechaRegistroOriginal: ${mergeUpdate.fechaRegistroOriginal}`);
    if (mergeUpdate.telefonoAnterior)      console.log(`     - Guardar telefonoAnterior: ${mergeUpdate.telefonoAnterior}`);
    console.log(`     - Borrar ${legacies.length} doc(s) legacy en users/: ${legacies.map(l => l.id).join(', ')}`);
    if (telefonosLegacyParaBorrar.length) {
      console.log(`     - Borrar en clientes/: ${telefonosLegacyParaBorrar.join(', ')}`);
    }

    if (COMMIT) {
      try {
        const batch = db.batch();
        batch.set(realRef, mergeUpdate, { merge: true });
        legacies.forEach(l => batch.delete(l.ref));
        telefonosLegacyParaBorrar.forEach(tel => {
          batch.delete(clientesCol.doc(tel));
          clientesBorrados++;
        });
        await batch.commit();
        console.log(`   ✅ APLICADO`);
        merged++;
      } catch (e) {
        console.error(`   ❌ ERROR: ${e.message}`);
      }
    } else {
      merged++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`  ${COMMIT ? '✅ Dedup completo' : '🧪 Dry run completo'}`);
  console.log(`  Fusionados:  ${merged}`);
  console.log(`  Skipped:     ${skipped}`);
  if (COMMIT) console.log(`  Docs clientes/ borrados: ${clientesBorrados}`);
  console.log('═══════════════════════════════════════');

  if (!COMMIT) {
    console.log('\n💡 Para ejecutar de verdad:');
    console.log('   node migraciones/dedupe-chameleon-clientes.js --commit\n');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('❌ Error fatal:', e);
  process.exit(1);
});
