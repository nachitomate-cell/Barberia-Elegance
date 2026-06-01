/**
 * fix-precios-clp.js — Corrige precios cargados como "dólares" a pesos chilenos (CLP)
 *
 * Detecta precios sospechosos en servicios y productos de un tenant:
 *   - con decimales (ej. 29.99)  → claramente NO son CLP
 *   - enteros menores a 1000     → casi seguro un "miles" mal tipeado
 * y los convierte multiplicando ×1000 (29.99 → 29990), igual que el seed.
 *
 * Uso:
 *   node fix-precios-clp.js                 # DRY-RUN sobre tenant "aura" (no escribe nada)
 *   node fix-precios-clp.js --tenant=aura   # elegir tenant
 *   node fix-precios-clp.js --apply         # aplicar los cambios de verdad
 *
 * Credenciales: usa ./service-account.json si existe, o Application Default Credentials.
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const args     = process.argv.slice(2);
const APPLY    = args.includes('--apply');
const TENANT   = (args.find(a => a.startsWith('--tenant=')) || '--tenant=aura').split('=')[1];

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

// Un precio es "sospechoso" si tiene decimales o es un entero positivo menor a 1000.
function esSospechoso(v) {
  if (typeof v !== 'number' || !isFinite(v) || v <= 0) return false;
  return (v % 1 !== 0) || v < 1000;
}
function aCLP(v) {
  return Math.round(v * 1000);
}

async function fixColeccion(nombreCol, campos) {
  const ref  = db.collection('tenants').doc(TENANT).collection(nombreCol);
  const snap = await ref.get();
  let cambiados = 0;

  for (const doc of snap.docs) {
    const data    = doc.data();
    const updates = {};

    for (const campo of campos) {
      const val = data[campo];
      if (esSospechoso(val)) updates[campo] = aCLP(val);
    }

    // Mapa preciosPorDia (solo en servicios)
    if (data.preciosPorDia && typeof data.preciosPorDia === 'object') {
      const ppd = {};
      let tocado = false;
      for (const [k, v] of Object.entries(data.preciosPorDia)) {
        if (esSospechoso(v)) { ppd[k] = aCLP(v); tocado = true; }
        else                 { ppd[k] = v; }
      }
      if (tocado) updates.preciosPorDia = ppd;
    }

    if (Object.keys(updates).length) {
      cambiados++;
      const resumen = Object.entries(updates)
        .filter(([k]) => k !== 'preciosPorDia')
        .map(([k, v]) => `${k}: ${data[k]} → ${v}`)
        .join(', ');
      console.log(`  • ${data.nombre || doc.id}  [${resumen}]${updates.preciosPorDia ? ' (+preciosPorDia)' : ''}`);
      if (APPLY) await ref.doc(doc.id).update(updates);
    }
  }
  console.log(`  ${cambiados} doc(s) ${APPLY ? 'actualizado(s)' : 'a actualizar'} en "${nombreCol}".\n`);
  return cambiados;
}

(async () => {
  console.log(`\n${APPLY ? '🚀 APLICANDO' : '🔍 DRY-RUN (no escribe)'} · tenant="${TENANT}"\n`);
  let total = 0;
  console.log('── Servicios ─────────────────────────────');
  total += await fixColeccion('servicios', ['precio']);
  console.log('── Productos ─────────────────────────────');
  total += await fixColeccion('productos', ['precio', 'precioOriginal', 'precioCosto']);

  if (!APPLY && total > 0) {
    console.log(`Revisá la lista de arriba. Si está OK, corré:\n  node fix-precios-clp.js --tenant=${TENANT} --apply\n`);
  } else if (total === 0) {
    console.log('✅ No se encontraron precios sospechosos. Nada que corregir.\n');
  } else {
    console.log('✅ Listo.\n');
  }
  process.exit(0);
})().catch(e => { console.error('❌ Error:', e); process.exit(1); });
