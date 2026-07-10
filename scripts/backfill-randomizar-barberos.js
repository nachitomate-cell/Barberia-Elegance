/**
 * backfill-randomizar-barberos.js
 * ─────────────────────────────────────────────────────────────────────────
 * Escribe `randomizarBarberos: true` EXPLÍCITO en configuracion/main de los
 * tenants que aleatorizaban por la whitelist legacy de index.html, para que
 * el campo pase a ser la ÚNICA fuente de verdad y el toggle del panel
 * (gestión-interna/equipo) refleje siempre la realidad.
 *
 * Contexto del bug: el toggle mostraba "desactivado" (campo ausente) pero la
 * reserva pública igual aleatorizaba por el fallback legacy. Tras este
 * backfill se elimina la whitelist de index.html.
 *
 * REGLA: solo escribe si el campo NO existe. Si un dueño ya lo fijó en
 * true/false explícito (p.ej. Aura apagándolo hoy), se respeta y se salta.
 *
 * USO:  node scripts/backfill-randomizar-barberos.js
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();

// Espejo exacto de _legacyRandomTenants en index.html (_renderBarberos).
// 'elegance' vive en la colección raíz /configuracion (no bajo /tenants).
const LEGACY_TENANTS = [
  'elegance', 'aura', 'latincaribe', 'lumen', 'machos', 'sionbarberia',
  'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman',
];

function cfgRef(tid) {
  return tid === 'elegance'
    ? db.collection('configuracion').doc('main')
    : db.collection('tenants').doc(tid).collection('configuracion').doc('main');
}

async function run() {
  console.log('── Backfill randomizarBarberos (solo si el campo está ausente) ──\n');
  for (const tid of LEGACY_TENANTS) {
    const ref  = cfgRef(tid);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  ⚠ ${tid}: configuracion/main NO existe — saltado`);
      continue;
    }
    const actual = snap.data().randomizarBarberos;
    if (typeof actual === 'boolean') {
      console.log(`  → ${tid}: ya explícito (${actual}) — respetado, sin cambios`);
      continue;
    }
    await ref.set({ randomizarBarberos: true }, { merge: true });
    console.log(`  ✅ ${tid}: randomizarBarberos = true (backfilled)`);
  }
  console.log('\n✅ Backfill completado.');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
