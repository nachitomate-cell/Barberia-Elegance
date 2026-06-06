/**
 * fix-aura-users-sin-telefono.js
 *
 * Repara usuarios de Aura que tienen nombre pero telefono vacío en
 * tenants/aura/users.  Recupera el número desde sus citas históricas.
 *
 * Estrategia:
 *   1. Lee todos los docs de tenants/aura/users donde telefono es falsy.
 *   2. Omite perfiles "pasivos" migrados de AgendaPro (uid === docId).
 *   3. Para cada usuario afectado busca citas en tenants/aura/citas por email.
 *   4. Toma el clienteTelefono más frecuente en esas citas.
 *   5. Actualiza users/{uid}.telefono.
 *   6. Hace set merge en clientes/{phone} con nombre + email para que el
 *      perfil también quede enlazado a la colección clientes.
 *
 * Uso (desde la raíz del repo):
 *   node migraciones/fix-aura-users-sin-telefono.js           → DRY RUN
 *   node migraciones/fix-aura-users-sin-telefono.js --commit  → escribe
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const TENANT_ID  = 'aura';
const COMMIT     = process.argv.includes('--commit');
const BATCH_SIZE = 250; // ×2 docs max = 500 ops, límite Firestore

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
const TS  = admin.firestore.FieldValue.serverTimestamp;

const colUsers    = db.collection(`tenants/${TENANT_ID}/users`);
const colCitas    = db.collection(`tenants/${TENANT_ID}/citas`);
const colClientes = db.collection(`tenants/${TENANT_ID}/clientes`);

// ── helpers ──────────────────────────────────────────────────────────────────

/** Solo dígitos; devuelve '' si tiene menos de 8 caracteres. */
function normalizarPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.length >= 8 ? digits : '';
}

/** Teléfono más frecuente en un array de citas; null si ninguna lo tiene. */
function telefonoMasFrecuente(citasDocs) {
  const freq = {};
  for (const c of citasDocs) {
    const t = normalizarPhone(c.clienteTelefono);
    if (t) freq[t] = (freq[t] || 0) + 1;
  }
  const entries = Object.entries(freq);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍  Buscando usuarios de Aura sin teléfono...');
  console.log(COMMIT
    ? '🚀  MODO COMMIT — escribe a Firestore'
    : '🧪  DRY RUN — pasá --commit para escribir');
  console.log('');

  const usersSnap = await colUsers.get();

  const sinTelefono = usersSnap.docs
    .map(d => ({ _docId: d.id, ...d.data() }))
    .filter(u => {
      const esPasivo = u.uid && u.uid === u._docId;
      return !esPasivo && !normalizarPhone(u.telefono);
    });

  console.log(`📊  Total users:     ${usersSnap.size}`);
  console.log(`⚠   Sin teléfono:   ${sinTelefono.length}`);
  console.log('');

  if (!sinTelefono.length) {
    console.log('✅  No hay usuarios sin teléfono. ¡Nada que hacer!');
    process.exit(0);
  }

  const fixes    = [];
  const sinDatos = [];

  for (const user of sinTelefono) {
    if (!user.email) {
      sinDatos.push({ uid: user._docId, reason: 'sin email' });
      continue;
    }

    const citasSnap = await colCitas
      .where('clienteEmail', '==', user.email)
      .get();

    if (citasSnap.empty) {
      sinDatos.push({ uid: user._docId, email: user.email, reason: 'sin citas' });
      continue;
    }

    const citasDocs = citasSnap.docs.map(d => d.data());
    const telefono  = telefonoMasFrecuente(citasDocs);

    if (!telefono) {
      sinDatos.push({ uid: user._docId, email: user.email, reason: 'citas sin clienteTelefono' });
      continue;
    }

    fixes.push({
      uid:        user._docId,
      email:      user.email,
      nombre:     (user.nombre || '').trim(),
      telefono,
      citasCount: citasDocs.length,
    });
  }

  // Mostrar resumen
  console.log(`✅  Con solución:   ${fixes.length}`);
  console.log(`❓  Sin datos:      ${sinDatos.length}`);
  console.log('');

  if (fixes.length) {
    console.log('Cambios a aplicar:');
    fixes.forEach(f =>
      console.log(
        `  • ${f.email.padEnd(42)} → tel: ${f.telefono}${f.nombre ? `  (nombre: "${f.nombre}")` : ''}  [${f.citasCount} cita${f.citasCount !== 1 ? 's' : ''}]`
      )
    );
    console.log('');
  }

  if (sinDatos.length) {
    console.log('Sin solución (no se modificarán):');
    sinDatos.forEach(s =>
      console.log(`  • ${(s.email || s.uid).padEnd(42)} → ${s.reason}`)
    );
    console.log('');
  }

  if (!COMMIT) {
    console.log('💡  Para aplicar los cambios:');
    console.log(`    node migraciones/fix-aura-users-sin-telefono.js --commit\n`);
    process.exit(0);
  }

  // Aplicar en batches
  let actualizados = 0;
  const errores    = [];

  for (let i = 0; i < fixes.length; i += BATCH_SIZE) {
    const chunk = fixes.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const f of chunk) {
      batch.update(colUsers.doc(f.uid), {
        telefono:  f.telefono,
        updatedAt: TS(),
      });

      batch.set(colClientes.doc(f.telefono), {
        nombre:    f.nombre || null,
        email:     f.email,
        updatedAt: TS(),
      }, { merge: true });
    }

    try {
      await batch.commit();
      actualizados += chunk.length;
      process.stdout.write(`\r  ✓ ${actualizados}/${fixes.length} usuarios actualizados...`);
    } catch (e) {
      console.error(`\n  ❌ Batch falló: ${e.message}`);
      errores.push(e.message);
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('  ✅  Migración completada');
  console.log(`  Actualizados:  ${actualizados}`);
  console.log(`  Sin datos:     ${sinDatos.length}`);
  if (errores.length) console.log(`  Errores:       ${errores.length}`);
  console.log('═══════════════════════════════════════════\n');

  process.exit(0);
}

main().catch(e => {
  console.error('❌  Error fatal:', e);
  process.exit(1);
});
