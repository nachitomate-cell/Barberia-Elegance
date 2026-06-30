/**
 * fix-yugen-users-sin-nombre.js
 *
 * Repara usuarios de Yügen que quedaron con nombre vacío en tenants/yugen/users.
 *
 * Causa: el flujo passwordless auto-creaba cuentas Firebase Auth sin pasar
 * nombre a ensureUserDoc(), dejando users.nombre = ''. (Fix forward ya aplicado
 * en registro.html — este script limpia los registros históricos afectados.)
 *
 * Mismo procedimiento que fix-aura-users-sin-nombre.js; sólo cambia el tenant.
 *
 * Estrategia:
 *   1. Lee todos los docs de tenants/yugen/users donde nombre es '' o falsy.
 *   2. Omite perfiles "pasivos" migrados de AgendaPro (uid === docId).
 *   3. Para cada usuario afectado busca citas en tenants/yugen/citas por email.
 *   4. Toma el clienteNombre más frecuente en esas citas como nombre canónico.
 *   5. También recupera telefono de las citas si el user doc no lo tenía.
 *   6. Actualiza users/{uid}.nombre (y telefono si faltaba).
 *   7. Si hay telefono, hace set merge en clientes/{phone} con el nombre corregido.
 *
 * Uso (desde la raíz del repo):
 *   node migraciones/fix-yugen-users-sin-nombre.js           → DRY RUN
 *   node migraciones/fix-yugen-users-sin-nombre.js --commit  → escribe
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const TENANT_ID  = 'yugen';
const COMMIT     = process.argv.includes('--commit');
// Cada fix escribe hasta 2 docs (users + clientes), así que el límite real
// de Firestore (500 ops/batch) nos da máximo 250 fixes por batch.
const BATCH_SIZE = 250;

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

/** Nombre más frecuente en un array de citas; null si ninguna tiene nombre. */
function nombreMasFrecuente(citasDocs) {
  const freq = {};
  for (const c of citasDocs) {
    const n = (c.clienteNombre || '').trim();
    if (n) freq[n] = (freq[n] || 0) + 1;
  }
  const entries = Object.entries(freq);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

/** Solo dígitos; devuelve '' si tiene menos de 8 caracteres. */
function normalizarPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.length >= 8 ? digits : '';
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍  Buscando usuarios de Yügen sin nombre...');
  console.log(COMMIT
    ? '🚀  MODO COMMIT — escribe a Firestore'
    : '🧪  DRY RUN — pasá --commit para escribir');
  console.log('');

  // 1. Leer todos los users del tenant
  const usersSnap = await colUsers.get();

  // Filtrar: solo Firebase Auth reales (uid ≠ docId) con nombre vacío
  const sinNombre = usersSnap.docs
    .map(d => ({ _docId: d.id, ...d.data() }))
    .filter(u => {
      const esPasivo = u.uid && u.uid === u._docId; // perfil legacy/migrado de AgendaPro
      return !esPasivo && (!u.nombre || !String(u.nombre).trim());
    });

  console.log(`📊  Total users:    ${usersSnap.size}`);
  console.log(`⚠   Sin nombre:     ${sinNombre.length}`);
  console.log('');

  if (!sinNombre.length) {
    console.log('✅  No hay usuarios sin nombre. ¡Nada que hacer!');
    process.exit(0);
  }

  // 2. Para cada user sin nombre, buscar citas por email
  const fixes    = []; // { uid, email, nombre, telefono, telefonoEraVacio, citasCount }
  const sinDatos = []; // { uid, email?, reason }

  for (const user of sinNombre) {
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
    const nombre    = nombreMasFrecuente(citasDocs);

    if (!nombre) {
      sinDatos.push({ uid: user._docId, email: user.email, reason: 'citas sin clienteNombre' });
      continue;
    }

    // Teléfono: preservar el del user doc si ya tenía uno; si no, recuperar de citas
    const telefonoOriginal = normalizarPhone(user.telefono);
    let telefono = telefonoOriginal;
    if (!telefono) {
      const citaConTel = citasDocs.find(c => normalizarPhone(c.clienteTelefono));
      if (citaConTel) telefono = normalizarPhone(citaConTel.clienteTelefono);
    }

    fixes.push({
      uid:              user._docId,
      email:            user.email,
      nombre,
      telefono,
      telefonoEraVacio: !telefonoOriginal, // true → recuperado de citas, incluir en update
      citasCount:       citasDocs.length,
    });
  }

  // 3. Mostrar resumen
  console.log(`✅  Con solución:   ${fixes.length}`);
  console.log(`❓  Sin datos:      ${sinDatos.length}`);
  console.log('');

  if (fixes.length) {
    console.log('Cambios a aplicar:');
    fixes.forEach(f => {
      const tel = f.telefono
        ? ` / tel${f.telefonoEraVacio ? ' (de citas)' : ''}: ${f.telefono}`
        : '';
      console.log(
        `  • ${f.email.padEnd(42)} → "${f.nombre}"${tel}  (${f.citasCount} cita${f.citasCount !== 1 ? 's' : ''})`
      );
    });
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
    console.log(`    node migraciones/fix-yugen-users-sin-nombre.js --commit\n`);
    process.exit(0);
  }

  // 4. Aplicar en batches
  let actualizados = 0;
  const errores    = [];

  for (let i = 0; i < fixes.length; i += BATCH_SIZE) {
    const chunk = fixes.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const f of chunk) {
      // users/{uid} — siempre actualizar nombre; telefono solo si faltaba
      const userUpdate = { nombre: f.nombre, updatedAt: TS() };
      if (f.telefonoEraVacio && f.telefono) userUpdate.telefono = f.telefono;
      batch.update(colUsers.doc(f.uid), userUpdate);

      // clientes/{phone} — set merge si tenemos teléfono (original o recuperado)
      if (f.telefono) {
        batch.set(colClientes.doc(f.telefono), {
          nombre:    f.nombre,
          email:     f.email,
          updatedAt: TS(),
        }, { merge: true });
      }
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
