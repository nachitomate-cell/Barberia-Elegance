/* ═══════════════════════════════════════════════════════════════
 * limpiar-errores-ruido.js
 *
 * Borra de system_errors los registros que NO son bugs de la app:
 * scripts inyectados por navegadores (Firefox iOS, autofill de Safari,
 * webviews de Instagram/TikTok), IndexedDB bajo presión de memoria, etc.
 *
 * El filtro del logger (js/utils/error-logger.js) solo aplica hacia
 * adelante; esto limpia lo que quedó registrado antes.
 *
 * Los patrones se LEEN de error-logger.js en vez de copiarse, para que
 * no se desincronicen: si mañana agregas uno allá, este script lo
 * respeta solo.
 *
 * Uso:
 *   node scripts/limpiar-errores-ruido.js            (dry-run)
 *   node scripts/limpiar-errores-ruido.js --commit
 * ═══════════════════════════════════════════════════════════════ */
const path  = require('path');
const fs    = require('fs');
const admin = require('firebase-admin');

const ROOT = path.resolve(__dirname, '..');
const sa = require(path.join(ROOT, 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const COMMIT = process.argv.includes('--commit');

// ── Patrones: única fuente de verdad = el logger ──
function patronesDelLogger() {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'utils', 'error-logger.js'), 'utf8');
  const m = src.match(/const IGNORE_PATTERNS = \[([\s\S]*?)\];/);
  if (!m) throw new Error('No pude leer IGNORE_PATTERNS de error-logger.js');
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
}

function esRuido(msg, pats) {
  const s = String(msg || '').trim();
  if (!s || s === 'undefined' || s === 'null') return true;
  return pats.some(p => s.includes(p));
}

async function main() {
  const pats = patronesDelLogger();
  console.log(`\nPatrones leídos del logger: ${pats.length}`);
  if (!COMMIT) console.log('⚠  DRY-RUN (usa --commit para borrar)\n');

  const snap = await db.collection('system_errors').get();
  console.log(`Registros en system_errors: ${snap.size}\n`);

  const aBorrar = [];
  const porMensaje = new Map();
  snap.forEach(doc => {
    const d = doc.data();
    if (!esRuido(d.message, pats)) return;
    aBorrar.push(doc.ref);
    const k = String(d.message || '(vacío)').slice(0, 70);
    porMensaje.set(k, (porMensaje.get(k) || 0) + 1);
  });

  if (!aBorrar.length) { console.log('✓ No hay ruido que limpiar.\n'); return; }

  console.log('Se borrarían (agrupado por mensaje):');
  [...porMensaje.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([m, n]) => console.log(`  ${String(n).padStart(4)} × ${m}`));

  const quedan = snap.size - aBorrar.length;
  console.log(`\nTotal a borrar: ${aBorrar.length}   ·   quedan (errores reales): ${quedan}`);

  if (COMMIT) {
    for (let i = 0; i < aBorrar.length; i += 400) {
      const batch = db.batch();
      aBorrar.slice(i, i + 400).forEach(ref => batch.delete(ref));
      await batch.commit();
      process.stdout.write(`\r  borrados ${Math.min(i + 400, aBorrar.length)}/${aBorrar.length}`);
    }
    console.log('\n✓ Listo.\n');
  } else {
    console.log('\nNada borrado (dry-run).\n');
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
