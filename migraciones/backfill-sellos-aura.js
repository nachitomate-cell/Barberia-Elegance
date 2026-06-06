/**
 * backfill-sellos-aura.js
 *
 * Agrega sellos faltantes a usuarios de Aura cuyas citas quedaron con
 * selloProcesadoTipo='sello' pero sin la entrada en historialSellos del
 * user doc (la CF procesó la cita pero no encontró el uid por formato
 * de teléfono diferente entre cita y user).
 *
 * Fuente de verdad: cita.selloProcesadoTipo == 'sello' + ausencia en
 * user.historialSellos[].citaId → sello faltante.
 *
 * Idempotente: no modifica citas que ya tienen su citaId en historialSellos.
 *
 * Uso (desde la raíz del repo):
 *   node migraciones/backfill-sellos-aura.js           → DRY RUN
 *   node migraciones/backfill-sellos-aura.js --commit  → escribe
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const TENANT_ID = 'aura';
const COMMIT    = process.argv.includes('--commit');

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
const db  = admin.firestore();
const INC = admin.firestore.FieldValue.increment;
const TS  = admin.firestore.Timestamp;
const ARR = admin.firestore.FieldValue.arrayUnion;

const colCitas = db.collection(`tenants/${TENANT_ID}/citas`);
const colUsers = db.collection(`tenants/${TENANT_ID}/users`);

async function main() {
  console.log('\n🔍  Buscando sellos faltantes en Aura...');
  console.log(COMMIT
    ? '🚀  MODO COMMIT — escribe a Firestore'
    : '🧪  DRY RUN — pasá --commit para escribir');
  console.log('');

  // 1. Todas las citas procesadas como sello
  const citasSnap = await colCitas.where('selloProcesadoTipo', '==', 'sello').get();
  console.log(`📊  Citas con selloProcesadoTipo=sello: ${citasSnap.size}`);

  // Agrupar por email
  const byEmail = {};
  citasSnap.docs.forEach(d => {
    const c = d.data();
    const email = (c.clienteEmail || '').toLowerCase().trim();
    if (!email) return;
    if (!byEmail[email]) byEmail[email] = [];
    byEmail[email].push({
      citaId:         d.id,
      fecha:          c.fecha         || '',
      servicioNombre: c.servicioNombre || c.servicio || '',
    });
  });

  // 2. Cruzar con users para detectar faltantes
  const fixes    = []; // { uid, citasFaltantes[] }
  const sinUser  = [];

  for (const [email, citas] of Object.entries(byEmail)) {
    const q = await colUsers.where('email', '==', email).limit(1).get();
    if (q.empty) { sinUser.push(email); continue; }

    const userDoc       = q.docs[0];
    const u             = userDoc.data();
    const historialIds  = new Set((u.historialSellos || []).map(h => h.citaId));
    const faltantes     = citas.filter(c => !historialIds.has(c.citaId));

    if (faltantes.length > 0) {
      fixes.push({ uid: userDoc.id, email, stamps: u.stamps || 0, faltantes });
    }
  }

  console.log(`⚠   Usuarios con sellos faltantes: ${fixes.length}`);
  console.log(`❓  Sin user doc:                   ${sinUser.length}`);
  console.log('');

  if (fixes.length) {
    console.log('Sellos a agregar:');
    fixes.forEach(f => {
      console.log(`  • ${f.email} (stamps actuales: ${f.stamps}) → +${f.faltantes.length} sello${f.faltantes.length > 1 ? 's' : ''}`);
      f.faltantes.forEach(c => console.log(`    - [${c.fecha}] ${c.servicioNombre}  (citaId: ${c.citaId})`));
    });
    console.log('');
  }

  if (!COMMIT) {
    console.log('💡  Para aplicar:');
    console.log(`    node migraciones/backfill-sellos-aura.js --commit\n`);
    process.exit(0);
  }

  // 3. Aplicar
  let ok = 0;
  const errores = [];

  for (const f of fixes) {
    try {
      const entradas = f.faltantes.map(c => ({
        citaId:         c.citaId,
        fecha:          c.fecha,
        servicioNombre: c.servicioNombre,
        tipo:           'suma',
        cantidad:       1,
        nota:           `Backfill: ${c.servicioNombre}`,
        procesadoEn:    TS.now(),
      }));

      await colUsers.doc(f.uid).update({
        sellosDisponibles: INC(f.faltantes.length),
        sellosHistoricos:  INC(f.faltantes.length),
        stamps:            INC(f.faltantes.length),
        ultimoSello:       TS.now().toDate().toISOString(),
        historialSellos:   ARR(...entradas),
        updatedAt:         TS.now(),
      });

      ok++;
      process.stdout.write(`\r  ✓ ${ok}/${fixes.length} usuarios actualizados...`);
    } catch (e) {
      console.error(`\n  ❌ ${f.email}: ${e.message}`);
      errores.push({ email: f.email, error: e.message });
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('  ✅  Backfill completado');
  console.log(`  Usuarios actualizados: ${ok}`);
  console.log(`  Sin user doc:          ${sinUser.length}`);
  if (errores.length) {
    console.log(`  Errores:               ${errores.length}`);
    errores.forEach(e => console.log(`    - ${e.email}: ${e.error}`));
  }
  console.log('═══════════════════════════════════════════\n');

  process.exit(0);
}

main().catch(e => {
  console.error('❌  Error fatal:', e);
  process.exit(1);
});
