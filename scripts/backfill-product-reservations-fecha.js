'use strict';

// scripts/backfill-product-reservations-fecha.js
// ─────────────────────────────────────────────────────────────────
// Rellena el campo `fecha` (YYYY-MM-DD, zona America/Santiago) en los
// product_reservations históricos que NO lo tienen — venta rápida vieja
// que se guardaba sin `fecha`. Sin ese campo quedan invisibles en Métricas
// e Inicio (que filtran product_reservations por `fecha >= …`).
//
// SEGURO: solo AGREGA el campo `fecha` (no cambia montos ni estados) y solo
// sobre ventas REALES (status delivered/confirmed/completed/paid) — NUNCA
// las reservas 'pending' del cliente (que no son ventas). Idempotente: salta
// las que ya tienen `fecha`.
//
// Uso:
//   node scripts/backfill-product-reservations-fecha.js --dry   (solo cuenta)
//   node scripts/backfill-product-reservations-fecha.js         (aplica)
// ─────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');
const sa    = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const DRY = process.argv.includes('--dry');
const VENDIDO = new Set(['delivered', 'confirmed', 'completed', 'paid']);

// "YYYY-MM-DD" en zona Chile (en-CA formatea ISO). Deriva la fecha local real
// de la venta, consistente con cómo la escribe la venta rápida nueva.
function fechaChile(ts) {
  const d = ts && ts.toDate ? ts.toDate() : null;
  if (!d) return null;
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

function col(tid) {
  return tid === 'elegance'
    ? db.collection('product_reservations')
    : db.collection(`tenants/${tid}/product_reservations`);
}

async function tenantIds() {
  const ids = ['elegance'];
  for (const t of await db.collection('tenants').listDocuments()) ids.push(t.id);
  return ids;
}

(async () => {
  const tenants = await tenantIds();
  let totFix = 0, totSkip = 0;
  for (const tid of tenants) {
    let snap;
    try { snap = await col(tid).get(); } catch { continue; }
    if (snap.empty) continue;

    let fix = 0, skip = 0, batch = db.batch(), n = 0;
    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.fecha) { skip++; continue; }                 // ya tiene fecha
      if (!VENDIDO.has(d.status)) { skip++; continue; }  // no es una venta real
      const fecha = fechaChile(d.createdAt) || fechaChile(d.updatedAt);
      if (!fecha) { skip++; continue; }                  // sin timestamp → no podemos derivar
      if (!DRY) {
        batch.update(doc.ref, { fecha });
        if (++n === 400) { await batch.commit(); batch = db.batch(); n = 0; }
      }
      fix++;
    }
    if (!DRY && n > 0) await batch.commit();
    if (fix || skip) console.log(`  ${tid}: ${fix} ${DRY ? 'a rellenar' : 'rellenados'} · ${skip} saltados`);
    totFix += fix; totSkip += skip;
  }
  console.log(`\n${DRY ? '[DRY-RUN]' : '[APLICADO]'} total: ${totFix} ${DRY ? 'se rellenarían' : 'rellenados'} · ${totSkip} saltados.`);
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
