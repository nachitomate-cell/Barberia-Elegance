/**
 * update-renacer-images.js — inyecta imagenUrl en tenants/renacer/servicios/*
 *
 * Lee la carpeta local renacer/servicios/ (34 archivos .webp descargados de
 * AgendaPro y re-encoded a WebP calidad 82). Para cada archivo cuyo slug
 * coincida con un doc en Firestore, hace un update `merge: true` inyectando
 * SOLO el campo `imagenUrl: /renacer/servicios/{slug}.webp`. No toca precio,
 * duración, categoría ni ninguna otra propiedad.
 *
 * Modo por defecto: dry-run (imprime lo que haría, no escribe).
 * Con --commit: aplica los updates reales a producción.
 *
 * Uso:
 *   node update-renacer-images.js           # dry-run
 *   node update-renacer-images.js --commit  # escribe a Firestore
 */

'use strict';

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

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

const db         = admin.firestore();
const TS         = admin.firestore.FieldValue.serverTimestamp;
const DEL        = admin.firestore.FieldValue.delete();
const TENANT_ID  = 'renacer';
const COMMIT     = process.argv.includes('--commit');
const IMG_DIR    = path.join(__dirname, 'renacer', 'servicios');
const URL_PREFIX = '/renacer/servicios';
// Convención del cliente: `index.html:10043` lee `s.imagen` (NO `imagenUrl`).
// Escribimos ambos: `imagen` (correcto) + `imagenUrl` marcado para delete si
// existía de una corrida previa que usó el nombre equivocado.
const FIELD      = 'imagen';

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Renacer — inyectar imagenUrl en servicios       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Tenant: ${TENANT_ID}  |  Modo: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`);
  console.log(`Fuente local: ${path.relative(__dirname, IMG_DIR)}/\n`);

  if (!fs.existsSync(IMG_DIR)) {
    console.error(`❌ No existe ${IMG_DIR}. Correr download primero.`);
    process.exit(1);
  }

  const files = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.webp')).sort();
  console.log(`📁 ${files.length} archivos .webp en disco.\n`);

  const col = db.collection('tenants').doc(TENANT_ID).collection('servicios');
  const existingSnap = await col.get();
  const existingIds = new Set(existingSnap.docs.map(d => d.id));
  console.log(`🔥 ${existingIds.size} docs en tenants/${TENANT_ID}/servicios.\n`);

  const matched  = [];
  const orphans  = [];  // archivo local sin doc en Firestore
  for (const f of files) {
    const slug = f.replace(/\.webp$/, '');
    if (existingIds.has(slug)) matched.push(slug);
    else orphans.push(slug);
  }

  console.log(`── PLAN ──────────────────────────────────────────`);
  console.log(`  Servicios a actualizar (match slug↔doc): ${matched.length}`);
  console.log(`  Archivos huérfanos (sin doc Firestore):  ${orphans.length}`);
  if (orphans.length) {
    console.log('  ⚠️  Huérfanos:');
    orphans.forEach(s => console.log(`     · ${s}.webp`));
  }
  console.log('');

  let batch = db.batch();
  let opCount = 0;
  for (const slug of matched) {
    const url = `${URL_PREFIX}/${slug}.webp`;
    const ref = col.doc(slug);
    batch.set(ref, { [FIELD]: url, imagenUrl: DEL, updatedAt: TS() }, { merge: true });
    console.log(`  → ${slug.padEnd(50)} · ${FIELD}=${url}`);
    opCount++;
    // Firestore batch limit is 500 ops; split if needed (safety, not expected here)
    if (opCount % 400 === 0 && COMMIT) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (COMMIT) {
    if (opCount % 400 !== 0) await batch.commit();
    console.log(`\n✅ ${matched.length} servicios actualizados en Firestore.`);
  } else {
    console.log(`\n🅳🆁🆈 ${matched.length} servicios PLANIFICADOS (sin escritura). Correr con --commit para aplicar.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
