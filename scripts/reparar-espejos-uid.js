/* ═════════════════════════════════════════════════════════════════
 * reparar-espejos-uid.js
 *
 * El panel resuelve el rol leyendo barberos/{uid} (doc-espejo con
 * _mainDocId → doc principal). La CF superadminCrearStaff crea ambos,
 * pero cuentas dadas de alta por flujos antiguos quedaron SOLO con
 * `authUid` en el doc principal, sin espejo → AuthContext cae a
 * 'barbero' y un admin pierde el sidebar completo (caso real:
 * admin@infinitystudio.cl, 2026-07-19).
 *
 * Busca en todos los tenants docs de barberos con authUid cuyo
 * espejo barberos/{authUid} no existe, y lo crea con la misma forma
 * que la CF ({_mainDocId, uid, email, nombre, rol, activo}).
 *
 * Uso:
 *   node scripts/reparar-espejos-uid.js           (dry-run)
 *   node scripts/reparar-espejos-uid.js --commit
 * ═════════════════════════════════════════════════════════════════ */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const COMMIT = process.argv.includes('--commit');

async function tenantIds() {
  const [sys, ten] = await Promise.all([
    db.collection('_system').get(),
    db.collection('tenants').get(),
  ]);
  const ids = new Set(['elegance']);
  sys.forEach(d => ids.add(d.id));
  ten.forEach(d => ids.add(d.id));
  return [...ids].sort();
}

const barberosCol = (tid) => (tid === 'elegance' ? 'barberos' : `tenants/${tid}/barberos`);

async function main() {
  if (!COMMIT) console.log('\n⚠  DRY-RUN (usa --commit para escribir)\n');

  const faltantes = [];
  for (const tid of await tenantIds()) {
    const snap = await db.collection(barberosCol(tid)).get().catch(() => null);
    if (!snap || snap.empty) continue;
    const ids = new Set(snap.docs.map(d => d.id));
    snap.forEach(d => {
      const x = d.data();
      // Doc principal con cuenta vinculada pero sin espejo por UID.
      if (x._mainDocId) return;               // ya es un espejo
      if (!x.authUid) return;                 // sin cuenta vinculada
      if (x.authUid === d.id) return;         // el doc principal YA es el del uid
      if (ids.has(x.authUid)) return;         // espejo existe
      faltantes.push({ tid, mainId: d.id, uid: x.authUid, email: x.email || '', nombre: x.nombre || '', rol: x.rol || 'barbero' });
    });
  }

  if (!faltantes.length) {
    console.log('✓ Sin espejos faltantes: todas las cuentas vinculadas resuelven su rol.\n');
    return;
  }

  console.log(`Espejos faltantes: ${faltantes.length}\n`);
  for (const f of faltantes) {
    console.log(`  ${f.tid.padEnd(16)} ${f.mainId.padEnd(24)} rol=${f.rol.padEnd(8)} uid=${f.uid}  ${f.email}`);
    if (COMMIT) {
      await db.collection(barberosCol(f.tid)).doc(f.uid).set({
        _mainDocId: f.mainId,
        uid:    f.uid,
        email:  f.email,
        nombre: f.nombre,
        rol:    f.rol,
        activo: true,
      }, { merge: true });
    }
  }
  console.log(COMMIT ? '\n✓ Espejos creados.\n' : '\n(dry-run: nada escrito)\n');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
