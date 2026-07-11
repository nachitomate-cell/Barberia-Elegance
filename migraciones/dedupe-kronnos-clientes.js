/**
 * dedupe-kronnos-clientes.js
 *
 * Variante kronnos del dedupe de clientes. Cubre DOS patrones:
 *
 *  A) real + legacy(s) — igual que dedupe-chameleon-clientes.js pero
 *     sede-aware: además de sellos/historial fusiona `sellosPorSede`
 *     (sumando por sede) para no perder el cálculo de sede predominante.
 *
 *  B) legacy + legacy — el caso actual de kronnos (61 emails): el import
 *     de AgendaPro creó DOS docs para la misma persona porque venía con
 *     dos teléfonos distintos en el origen (typos, formatos: p.ej.
 *     +56902124537 vs +56992124537). Nadie se ha registrado aún.
 *     Estrategia: elegir un SOBREVIVIENTE y fusionar el resto en él.
 *       Sobreviviente = mejor teléfono:
 *         1º móvil chileno válido (569XXXXXXXX) y sin flag telefonoNoChileno
 *         2º más sellosHistoricos
 *         3º teléfono más largo (con código de país)
 *     Al fusionar: suma sellos + sellosPorSede, concatena historialSellos,
 *     guarda telefonosAnteriores[], limpia posibleDuplicado, y borra los
 *     docs perdedores de users/ y clientes/.
 *
 * El dedupe automático al registrarse (CF dedupeOnCreateTenant) encontrará
 * después UN solo legacy por email y lo fusionará al perfil real (la CF ya
 * fusiona sellosPorSede tras el patch de 2026-07-11).
 *
 * Uso:
 *   node migraciones/dedupe-kronnos-clientes.js            → DRY RUN
 *   node migraciones/dedupe-kronnos-clientes.js --commit   → ejecuta
 *   (acepta --tenant=<id> por si otra marca multi-sede lo necesita)
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const TENANT_ID = (process.argv.find(a => a.startsWith('--tenant=')) || '--tenant=kronnos').split('=')[1];
const COMMIT    = process.argv.includes('--commit');

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
const FieldValue = admin.firestore.FieldValue;

const usersCol    = db.collection(`tenants/${TENANT_ID}/users`);
const clientesCol = db.collection(`tenants/${TENANT_ID}/clientes`);

function isLegacy(doc) {
  const d = doc.data();
  const idTelefono = /^\+?\d{8,15}$/.test(doc.id);
  return d.uid === doc.id || idTelefono;
}

function normalizePhone(p) { return (p || '').replace(/\D/g, ''); }

function esMovilChilenoValido(doc) {
  const d = doc.data();
  if (d.telefonoNoChileno) return false;
  const n = normalizePhone(d.telefono || doc.id);
  return /^569\d{8}$/.test(n) || /^9\d{8}$/.test(n);
}

// Suma los sellosPorSede de `src` sobre el acumulador `acc` (objeto plano).
function acumularSedes(acc, src) {
  const sps = src && src.sellosPorSede;
  if (sps && typeof sps === 'object') {
    Object.entries(sps).forEach(([sede, n]) => {
      const v = Number(n) || 0;
      if (v) acc[sede] = (acc[sede] || 0) + v;
    });
  }
  return acc;
}

/** Construye el update de fusión de `perdedores` sobre el doc `ganador`. */
function buildMerge(ganadorData, perdedores) {
  const sellosHist = perdedores.reduce((s, l) => s + (Number(l.data().sellosHistoricos) || 0), 0);
  const sellosDisp = perdedores.reduce((s, l) => s + (Number(l.data().sellosDisponibles) || 0), 0);
  const stamps     = perdedores.reduce((s, l) => s + (Number(l.data().stamps)            || 0), 0);
  const historial  = perdedores.flatMap(l => l.data().historialSellos || []);
  const fechaOrig  = perdedores.map(l => l.data().fechaRegistroOriginal).filter(Boolean)[0];
  const telsPrev   = perdedores.map(l => l.data().telefono || l.id).filter(t => t && t !== ganadorData.telefono);
  const sedes      = perdedores.reduce((acc, l) => acumularSedes(acc, l.data()), {});

  const upd = {
    dedupedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    posibleDuplicado:      FieldValue.delete(),
    posibleDuplicadoRazon: FieldValue.delete(),
  };
  if (sellosHist) upd.sellosHistoricos  = FieldValue.increment(sellosHist);
  if (sellosDisp) upd.sellosDisponibles = FieldValue.increment(sellosDisp);
  if (stamps)     upd.stamps            = FieldValue.increment(stamps);
  if (historial.length) upd.historialSellos = FieldValue.arrayUnion(...historial);
  if (fechaOrig && !ganadorData.fechaRegistroOriginal) upd.fechaRegistroOriginal = fechaOrig;
  if (telsPrev.length) upd.telefonosAnteriores = FieldValue.arrayUnion(...telsPrev);
  Object.entries(sedes).forEach(([sede, n]) => { upd[`sellosPorSede.${sede}`] = FieldValue.increment(n); });

  return { upd, resumen: { sellosHist, sellosDisp, stamps, historial: historial.length, sedes, telsPrev } };
}

async function main() {
  console.log(`🎯 Tenant: ${TENANT_ID}`);
  console.log(COMMIT ? '🚀 MODO COMMIT — escribe cambios a Firestore' : '🧪 DRY RUN — no se escribe nada (pasá --commit para ejecutar)');
  console.log('');

  const snap = await usersCol.get();
  const porEmail = new Map();
  let sinEmail = 0;
  snap.forEach(d => {
    const e = (d.data().email || '').toLowerCase().trim();
    if (!e) { sinEmail++; return; }
    if (!porEmail.has(e)) porEmail.set(e, []);
    porEmail.get(e).push(d);
  });

  const grupos = [...porEmail.entries()].filter(([, docs]) => docs.length > 1);
  console.log(`📥 Leídos ${snap.size} docs en users/ (${sinEmail} sin email, se ignoran)`);
  console.log(`🔍 ${grupos.length} emails con perfiles duplicados\n`);

  let fusionados = 0, skipped = 0, borradosClientes = 0;
  const contadorPatron = { realLegacy: 0, legacyLegacy: 0 };

  for (const [email, docs] of grupos) {
    const reales   = docs.filter(d => !isLegacy(d));
    const legacies = docs.filter(d =>  isLegacy(d));

    let ganador, perdedores, patron;

    if (reales.length === 1 && legacies.length >= 1) {
      patron     = 'A: real+legacy';
      ganador    = reales[0];
      perdedores = legacies;
    } else if (reales.length === 0 && legacies.length >= 2) {
      patron = 'B: legacy+legacy (import)';
      // Sobreviviente: móvil chileno válido > más sellos > teléfono más largo.
      const orden = [...legacies].sort((a, b) => {
        const va = esMovilChilenoValido(a) ? 1 : 0;
        const vb = esMovilChilenoValido(b) ? 1 : 0;
        if (va !== vb) return vb - va;
        const sa = Number(a.data().sellosHistoricos) || 0;
        const sb = Number(b.data().sellosHistoricos) || 0;
        if (sa !== sb) return sb - sa;
        return normalizePhone(b.data().telefono || b.id).length - normalizePhone(a.data().telefono || a.id).length;
      });
      ganador    = orden[0];
      perdedores = orden.slice(1);
    } else {
      console.log(`📧 ${email}\n   ⚠ ${reales.length} reales · ${legacies.length} legacy — caso raro, NO se toca.`);
      skipped++;
      continue;
    }

    const { upd, resumen } = buildMerge(ganador.data(), perdedores);
    const telefonosBorrar = [...new Set(perdedores.flatMap(l => [l.data().telefono, l.id]).map(normalizePhone).filter(Boolean))];

    console.log(`📧 ${email}  [${patron}]`);
    docs.forEach(d => {
      const c = d.data();
      const tag = d.id === ganador.id ? '★ GANA ' : '  borra';
      console.log(`   ${tag} ${d.id.padEnd(30)} tel=${(c.telefono || '—').padEnd(16)} sellos=${c.sellosHistoricos ?? 0} ${c.telefonoNoChileno ? '(tel no chileno)' : ''}`);
    });
    const sedesTxt = Object.keys(resumen.sedes).length ? ` sedes=${JSON.stringify(resumen.sedes)}` : '';
    console.log(`   → +${resumen.sellosHist} hist · +${resumen.sellosDisp} disp${sedesTxt} · borra ${telefonosBorrar.length} doc(s) en clientes/`);

    if (COMMIT) {
      const batch = db.batch();
      batch.set(ganador.ref, upd, { merge: true });
      perdedores.forEach(l => batch.delete(l.ref));
      telefonosBorrar.forEach(tel => batch.delete(clientesCol.doc(tel)));
      await batch.commit();
      console.log('   ✅ APLICADO');
    }
    fusionados++;
    borradosClientes += telefonosBorrar.length;
    contadorPatron[patron.startsWith('A') ? 'realLegacy' : 'legacyLegacy']++;
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`  ${COMMIT ? '✅ Dedup completo' : '🧪 Dry run completo'}`);
  console.log(`  Grupos fusionados: ${fusionados} (A real+legacy: ${contadorPatron.realLegacy} · B legacy+legacy: ${contadorPatron.legacyLegacy})`);
  console.log(`  Skipped:           ${skipped}`);
  console.log(`  Docs clientes/ a borrar: ${borradosClientes}`);
  console.log('═══════════════════════════════════════');
  if (!COMMIT) console.log('\n💡 Para ejecutar de verdad:\n   node migraciones/dedupe-kronnos-clientes.js --commit');
  process.exit(0);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
