/* ═══════════════════════════════════════════════════════════════
 * listar-emails-admin.js — Correos de administrador por tenant.
 *
 * Cruza TODAS las fuentes y las separa por confiabilidad, porque no
 * todas sirven como destinatario de notificaciones:
 *
 *   CONFIABLES (campos explícitos, puestos a propósito):
 *     · _billing/{tid}.emailCobro        → destinatario de cobro
 *     · tenants/{tid}.ownerEmail         → dueño, capturado en el alta
 *     · _system/{tid}.emailStaffCitas    → avisos de citas
 *
 *   NO CONFIABLE (referencial):
 *     · tenants/{tid}/barberos[rol=jefe|admin].email
 *       Son CREDENCIALES DE LOGIN. En varios locales están inventados
 *       (ej. juan@barberia.cl) porque solo servían para entrar al panel.
 *       No usar como destinatario sin confirmarlo con el local.
 *
 * Uso:  node scripts/listar-emails-admin.js
 * ═══════════════════════════════════════════════════════════════ */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const norm = (v) => {
  const arr = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
  return [...new Set(arr.map(e => String(e || '').trim().toLowerCase()).filter(e => e.includes('@')))];
};

async function main() {
  // ── Universo de tenants: unión de todas las colecciones raíz ──
  const [sysSnap, billSnap, tenSnap] = await Promise.all([
    db.collection('_system').get(),
    db.collection('_billing').get(),
    db.collection('tenants').get(),
  ]);

  const ids = new Set();
  sysSnap.forEach(d => ids.add(d.id));
  billSnap.forEach(d => ids.add(d.id));
  tenSnap.forEach(d => ids.add(d.id));
  ids.add('elegance'); // vive en la raíz, no bajo tenants/

  const sys  = Object.fromEntries(sysSnap.docs.map(d => [d.id, d.data()]));
  const bill = Object.fromEntries(billSnap.docs.map(d => [d.id, d.data()]));
  const ten  = Object.fromEntries(tenSnap.docs.map(d => [d.id, d.data()]));

  const filas = [];
  for (const tid of [...ids].sort()) {
    const barberosPath = tid === 'elegance' ? 'barberos' : `tenants/${tid}/barberos`;
    let jefes = [];
    try {
      const bs = await db.collection(barberosPath).get();
      bs.forEach(doc => {
        const b = doc.data();
        if (b.activo === false) return;
        if (b.rol === 'jefe' || b.rol === 'admin') {
          const e = String(b.email || '').trim().toLowerCase();
          if (e.includes('@')) jefes.push(`${e} (${b.nombre || doc.id})`);
        }
      });
    } catch (e) { jefes = [`⚠ error: ${e.message}`]; }

    filas.push({
      tid,
      nombre:     (sys[tid]?.nombre) || (ten[tid]?.nombre) || '',
      emailCobro: norm(bill[tid]?.emailCobro),
      ownerEmail: norm(ten[tid]?.ownerEmail),
      staffCitas: norm(sys[tid]?.emailStaffCitas),
      jefes:      [...new Set(jefes)],
      enBilling:  !!bill[tid],
      proxPago:   bill[tid]?.fechaProximoPago || '',
    });
  }

  // ── Salida ──
  console.log('\n═══ CORREOS DE ADMINISTRADOR POR TENANT ═══\n');
  for (const f of filas) {
    const cab = `${f.tid}${f.nombre ? `  —  ${f.nombre}` : ''}${f.enBilling ? '   [en _billing]' : ''}`;
    console.log('─'.repeat(Math.max(30, cab.length)));
    console.log(cab);
    if (f.emailCobro.length) console.log(`   ✅ emailCobro   : ${f.emailCobro.join(', ')}`);
    if (f.ownerEmail.length) console.log(`   ✅ ownerEmail   : ${f.ownerEmail.join(', ')}`);
    if (f.staffCitas.length) console.log(`   ✅ staffCitas   : ${f.staffCitas.join(', ')}`);
    if (f.jefes.length)      console.log(`   ⚠  barberos jefe/admin (login, puede ser falso):\n        ${f.jefes.join('\n        ')}`);
    if (!f.emailCobro.length && !f.ownerEmail.length && !f.staffCitas.length && !f.jefes.length) {
      console.log('   ✗ sin ningún correo registrado');
    }
  }

  // ── Resumen accionable: quién cobra y no tiene canal confiable ──
  console.log('\n\n═══ RIESGO DE COBRO (locales en _billing sin correo confiable) ═══\n');
  const enRiesgo = filas.filter(f => f.enBilling && !f.emailCobro.length && !f.ownerEmail.length);
  if (!enRiesgo.length) {
    console.log('  ✓ Todos los locales en _billing tienen emailCobro u ownerEmail.\n');
  } else {
    for (const f of enRiesgo) {
      const sugerencia = f.staffCitas[0] || (f.jefes[0] || '').split(' ')[0] || '(sin candidato)';
      console.log(`  • ${f.tid.padEnd(22)} próx.pago: ${String(f.proxPago || '—').padEnd(12)} candidato: ${sugerencia}`);
    }
    console.log(`\n  → Para cada uno: setear _billing/${'{tid}'}.emailCobro con el correo REAL del dueño.`);
    console.log('    (confírmalo con el local; no asumas el de barberos/)\n');
  }

  console.log(`Total tenants revisados: ${filas.length}\n`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
