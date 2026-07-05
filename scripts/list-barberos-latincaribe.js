/**
 * scripts/list-barberos-latincaribe.js
 * Read-only: lista todos los barberos del tenant latincaribe para poder mapear
 * nombre → doc ID antes de crear credenciales.
 *
 * Uso: node scripts/list-barberos-latincaribe.js
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SA = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8'))),
  projectId: 'barberia-elegance',
});

const db = admin.firestore();
const TENANT = 'latincaribe';

(async () => {
  const snap = await db.collection('tenants').doc(TENANT).collection('barberos').get();
  console.log(`\n📋 tenants/${TENANT}/barberos — ${snap.size} docs\n`);
  const rows = [];
  snap.forEach(d => {
    const x = d.data() || {};
    rows.push({
      id: d.id,
      nombre: x.nombre || '',
      email: x.email || '',
      uid: x.uid || '',
      activo: x.activo,
      _mainDocId: x._mainDocId || '',
    });
  });
  // Ordenar por nombre para leer fácil
  rows.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  console.log('DOC ID'.padEnd(28) + 'NOMBRE'.padEnd(22) + 'EMAIL'.padEnd(32) + 'UID');
  console.log('-'.repeat(110));
  for (const r of rows) {
    console.log(
      r.id.padEnd(28) +
      (r.nombre || '(sin nombre)').padEnd(22) +
      (r.email || '—').padEnd(32) +
      (r.uid || '—')
    );
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
