/**
 * purge-yugen-users-vacios.js
 *
 * Borra docs basura en tenants/yugen/users que no se pueden recuperar:
 * los que NO tienen nombre, NI email, NI telefono, NI historial de sellos.
 * Son perfiles que se crearon vacíos en algún flujo previo y no representan
 * a un cliente identificable.
 *
 * Diferencia con fix-yugen-users-sin-nombre.js:
 *   - fix-* intenta REPARAR docs sin nombre buscando el nombre real en citas
 *     por email. Sirve cuando el doc tiene al menos email o teléfono.
 *   - purge-* (este script) BORRA docs que no tienen ninguna pista — no se
 *     puede saber quién es ese cliente, así que se elimina.
 *
 * Salvaguardas:
 *   1. Salta perfiles "pasivos" migrados (uid === docId).
 *   2. Salta cualquier doc que tenga AL MENOS uno de: nombre, email, telefono,
 *      sellosHistoricos, sellosDisponibles, stamps, historialSellos.
 *   3. Salta perfiles con uid en /tenants/yugen/corteLapiz (membresía activa).
 *   4. Modo dry-run por defecto.
 *
 * Uso:
 *   node migraciones/purge-yugen-users-vacios.js           → DRY RUN
 *   node migraciones/purge-yugen-users-vacios.js --commit  → borra
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const TENANT_ID  = 'yugen';
const COMMIT     = process.argv.includes('--commit');
const BATCH_SIZE = 400;

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

const colUsers      = db.collection(`tenants/${TENANT_ID}/users`);
const colCorteLapiz = db.collection(`tenants/${TENANT_ID}/corteLapiz`);

// Trim seguro para cualquier valor.
function isBlank(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (typeof v === 'number') return v === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function tieneAlgunDato(u) {
  return !isBlank(u.nombre)
      || !isBlank(u.email)
      || !isBlank(u.telefono)
      || !isBlank(u.sellosHistoricos)
      || !isBlank(u.sellosDisponibles)
      || !isBlank(u.stamps)
      || !isBlank(u.historialSellos)
      || !isBlank(u.displayName)
      || !isBlank(u.photoURL);
}

async function main() {
  console.log('\n🧹  Buscando docs vacíos en tenants/yugen/users...');
  console.log(COMMIT
    ? '🚀  MODO COMMIT — borra de Firestore'
    : '🧪  DRY RUN — pasá --commit para borrar');
  console.log('');

  const usersSnap = await colUsers.get();
  console.log(`📊  Total users:    ${usersSnap.size}`);

  // Set de uids con membresía Corte al Lápiz — no los tocamos jamás.
  const cortePromos = await colCorteLapiz.get();
  const corteUids   = new Set(cortePromos.docs.map(d => d.id));
  console.log(`🛡   Corte al Lápiz: ${corteUids.size} (intocables)`);

  const vacios = [];
  const pasivosSinDato = []; // legacy con id===uid pero también vacíos: los reportamos pero no borramos
  const conDatos = [];

  usersSnap.docs.forEach(d => {
    const data = d.data() || {};
    const id   = d.id;
    const esPasivo = data.uid && data.uid === id;
    const tieneDato = tieneAlgunDato(data);
    if (tieneDato) { conDatos.push(id); return; }
    if (corteUids.has(id)) { conDatos.push(id); return; }  // tiene membresía → no tocar
    if (esPasivo) { pasivosSinDato.push(id); return; }
    vacios.push({ id, data });
  });

  console.log('');
  console.log(`✅  Con datos:           ${conDatos.length}`);
  console.log(`⚠   Pasivos sin datos:   ${pasivosSinDato.length}  (legacy migrado — NO se borra)`);
  console.log(`❌  Vacíos a purgar:     ${vacios.length}`);
  console.log('');

  if (!vacios.length) {
    console.log('✨  Nada que purgar.');
    process.exit(0);
  }

  console.log('Sample (primeros 10):');
  vacios.slice(0, 10).forEach(v => {
    const claves = Object.keys(v.data).join(',') || '(sin campos)';
    console.log(`  • ${v.id.padEnd(36)} keys=[${claves}]`);
  });
  console.log('');

  if (!COMMIT) {
    console.log('💡  Para borrar:');
    console.log(`    node migraciones/purge-yugen-users-vacios.js --commit\n`);
    process.exit(0);
  }

  let borrados = 0;
  for (let i = 0; i < vacios.length; i += BATCH_SIZE) {
    const chunk = vacios.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(v => batch.delete(colUsers.doc(v.id)));
    await batch.commit();
    borrados += chunk.length;
    process.stdout.write(`\r  🗑  ${borrados}/${vacios.length} borrados...`);
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('  ✅  Purga completada');
  console.log(`  Borrados:  ${borrados}`);
  console.log('═══════════════════════════════════════════\n');
  process.exit(0);
}

main().catch(e => {
  console.error('❌  Error fatal:', e);
  process.exit(1);
});
