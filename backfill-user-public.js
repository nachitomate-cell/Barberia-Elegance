/**
 * backfill-user-public.js — Crea/actualiza la colección PÚBLICA userPublic
 * a partir de users, para la función "comparar con un amigo".
 *
 * userPublic contiene SOLO campos no sensibles:
 *   { uid, nombre, nombreLower, emailLower, sellosHistoricos, photoURL }
 * Es legible por cualquier miembro autenticado; users sigue siendo privado.
 *
 * Cubre la colección root (elegance) y todas las de tenants/{tid}/users.
 *
 * Uso:
 *   node backfill-user-public.js            # DRY-RUN (no escribe nada)
 *   node backfill-user-public.js --apply    # aplica los cambios
 *
 * Credenciales: usa ./service-account.json si existe, o Application Default Credentials.
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const APPLY = process.argv.slice(2).includes('--apply');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
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

function normalizarNombre(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase().trim().replace(/\s+/g, ' ');
}

// Procesa una colección users → userPublic (mismo nivel/tenant).
async function backfillCol(usersCol, publicCol, label) {
  const snap = await usersCol.get();
  if (snap.empty) { console.log(`  ${label}: sin usuarios`); return { total: 0, escritos: 0 }; }

  let escritos = 0;
  let batch = db.batch();
  let ops = 0;

  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const nombre = d.nombre || '';
    const pub = {
      uid:              doc.id,
      nombre,
      nombreLower:      normalizarNombre(nombre),
      emailLower:       (d.email || '').toLowerCase(),
      sellosHistoricos: d.sellosHistoricos ?? d.stamps ?? 0,
      photoURL:         d.photoURL || null,
    };
    escritos++;
    if (APPLY) {
      batch.set(publicCol.doc(doc.id), pub, { merge: true });
      if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
    }
  }
  if (APPLY && ops > 0) await batch.commit();
  console.log(`  ${label}: ${escritos}/${snap.size} ${APPLY ? 'escritos' : '(dry-run)'}`);
  return { total: snap.size, escritos };
}

(async () => {
  console.log(APPLY ? '🚀 APLICANDO cambios…' : '👀 DRY-RUN (usa --apply para escribir)');

  let totalEscritos = 0;

  // 1. Root (elegance)
  console.log('\n• elegance (root)');
  const r = await backfillCol(db.collection('users'), db.collection('userPublic'), 'elegance');
  totalEscritos += r.escritos;

  // 2. Todos los tenants. OJO: los docs padre tenants/{id} no existen como
  // documentos (solo tienen subcolecciones), así que collection('tenants').get()
  // devuelve 0. listDocuments() sí lista esas referencias "fantasma".
  const tenantRefs = await db.collection('tenants').listDocuments();
  for (const t of tenantRefs) {
    const tid = t.id;
    if (tid === 'elegance') continue; // ya cubierto por la colección root
    console.log(`\n• ${tid}`);
    const res = await backfillCol(
      db.collection(`tenants/${tid}/users`),
      db.collection(`tenants/${tid}/userPublic`),
      tid,
    );
    totalEscritos += res.escritos;
  }

  console.log(`\n✅ Listo. ${totalEscritos} perfiles públicos ${APPLY ? 'escritos' : 'a escribir (dry-run)'}.`);
  process.exit(0);
})().catch(err => { console.error('❌ Error:', err); process.exit(1); });
