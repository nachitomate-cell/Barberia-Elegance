/* ═══════════════════════════════════════════════════════════════
 * migrar-rol-jefe-a-admin.js
 *
 * El rol 'jefe' era sinónimo de 'admin': en las ~34 condiciones del
 * código siempre aparecían juntos (`rol === 'jefe' || rol === 'admin'`)
 * y no había un solo lugar donde hicieran cosas distintas. Se elimina
 * el sinónimo, pero PRIMERO hay que migrar los datos: si se simplifica
 * el código antes, quien tenga 'jefe' deja de recibir notificaciones.
 *
 * Uso:
 *   node scripts/migrar-rol-jefe-a-admin.js          (dry-run)
 *   node scripts/migrar-rol-jefe-a-admin.js --commit
 * ═══════════════════════════════════════════════════════════════ */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const COMMIT = process.argv.includes('--commit');

async function tenantIds() {
  const [sys, ten] = await Promise.all([
    db.collection('_system').get(),
    db.collection('tenants').get(),
  ]);
  const ids = new Set(['elegance']);
  sys.forEach(d => ids.add(d.id));
  ten.forEach(d => ids.add(d.id));
  return [...ids].sort();
}

const barberosCol = (tid) => (tid === 'elegance' ? 'barberos' : `tenants/${tid}/barberos`);

async function main() {
  if (!COMMIT) console.log('\n⚠  DRY-RUN (usa --commit para escribir)\n');

  let encontrados = 0, migrados = 0;

  for (const tid of await tenantIds()) {
    let snap;
    try { snap = await db.collection(barberosCol(tid)).where('rol', '==', 'jefe').get(); }
    catch { continue; }
    if (snap.empty) continue;

    for (const doc of snap.docs) {
      const b = doc.data();
      encontrados++;
      console.log(`${tid.padEnd(20)} ${String(b.nombre || doc.id).padEnd(24)} jefe → admin${b.activo === false ? '  [inactivo]' : ''}`);
      if (COMMIT) {
        await doc.ref.update({
          rol: 'admin',
          // Rastro por si hay que auditar de dónde salió el cambio.
          rolMigradoDesde: 'jefe',
          rolMigradoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
        migrados++;
      }
    }
  }

  console.log(`\nEncontrados con rol 'jefe': ${encontrados}`);
  console.log(COMMIT ? `Migrados a 'admin': ${migrados}\n` : 'Nada escrito (dry-run).\n');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
