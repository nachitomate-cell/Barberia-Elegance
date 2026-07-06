/**
 * backfill-users-telefonoSuf9.js
 *
 * Añade `telefonoSuf9` (últimos 9 dígitos del teléfono) a todos los users
 * de todos los tenants. La CF sellosTenant usa este campo como fallback
 * para resolver el uid cuando el teléfono viene con formato distinto.
 *
 * Idempotente: skip si el campo ya existe con el valor correcto.
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();

function normSuf9(raw) {
  const digs = String(raw || '').replace(/\D+/g, '');
  return digs.length >= 9 ? digs.slice(-9) : '';
}

async function processUsersCol(colPath, label) {
  const snap = await db.collection(colPath).get();
  let touched = 0, skipped = 0, sinTel = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const suf9 = normSuf9(d.telefono);
    if (!suf9) { sinTel++; continue; }
    if (d.telefonoSuf9 === suf9) { skipped++; continue; }
    await doc.ref.update({ telefonoSuf9: suf9 });
    touched++;
  }
  console.log(`  ${label.padEnd(30)}  toc=${touched}  skip=${skipped}  sinTel=${sinTel}  total=${snap.size}`);
  return { touched, skipped, sinTel, total: snap.size };
}

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   Backfill de telefonoSuf9 en users/ (todos los tenants)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1) Elegance root
  await processUsersCol('users', '/users (elegance)');

  // 2) Todos los tenants — .listDocuments() incluye docs sin fields (solo subcolecciones)
  const tenantDocRefs = await db.collection('tenants').listDocuments();
  const totals = { touched: 0, skipped: 0, sinTel: 0, total: 0 };
  for (const tRef of tenantDocRefs) {
    const result = await processUsersCol(`tenants/${tRef.id}/users`, `tenants/${tRef.id}/users`);
    totals.touched += result.touched;
    totals.skipped += result.skipped;
    totals.sinTel  += result.sinTel;
    totals.total   += result.total;
  }

  console.log('');
  console.log('═══ Totales (excluyendo elegance root) ═══');
  console.log(`  Actualizados:  ${totals.touched}`);
  console.log(`  Ya alineados:  ${totals.skipped}`);
  console.log(`  Sin teléfono:  ${totals.sinTel}`);
  console.log(`  Total users:   ${totals.total}\n`);

  process.exit(0);
})().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
