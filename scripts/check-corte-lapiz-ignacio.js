/**
 * Diagnóstico: por qué no se sumó la cuota Corte al Lápiz al usuario
 * ignaciiio.mate@gmail.com en yugen.
 *
 *   node scripts/check-corte-lapiz-ignacio.js
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'service-account.json'), 'utf8'))),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();
const TID = 'yugen';
const EMAIL = 'ignaciiio.mate@gmail.com';

(async () => {
  // 1. Buscar al user en tenants/yugen/users por email
  console.log(`\n▶ Buscando user "${EMAIL}" en tenants/${TID}/users…`);
  const usersQ = await db.collection(`tenants/${TID}/users`).where('email', '==', EMAIL).get();
  if (usersQ.empty) {
    console.log('  ✖ No existe en users por email. Buscando case-insensitive…');
    const all = await db.collection(`tenants/${TID}/users`).get();
    const match = all.docs.find(d => (d.data().email || '').toLowerCase() === EMAIL);
    if (!match) { console.log('  ✖ NO encontrado en users.'); }
    else        { console.log(`  ✔ Encontrado por scan: uid=${match.id}, nombre=${match.data().nombre}`); usersQ.docs.push(match); }
  } else {
    usersQ.docs.forEach(d => console.log(`  ✔ uid=${d.id}, nombre=${d.data().nombre}, tel=${d.data().telefono}`));
  }

  const uids = usersQ.docs.map(d => d.id);

  // 2. Ver membresía Corte al Lápiz
  console.log(`\n▶ Membresía Corte al Lápiz por uid…`);
  for (const uid of uids) {
    const cl = await db.doc(`tenants/${TID}/corteLapiz/${uid}`).get();
    if (cl.exists) {
      const x = cl.data();
      console.log(`  ✔ ${uid}: activo=${x.activo}, saldo=$${x.saldo}, servicios=${(x.servicios||[]).length}, telefonoNorm=${x.telefonoNorm}`);
    } else {
      console.log(`  ✖ ${uid}: NO existe doc corteLapiz`);
    }
  }

  // 2b. También buscar por telefonoNorm
  console.log(`\n▶ Todas las cuentas Corte al Lápiz del tenant…`);
  const allCL = await db.collection(`tenants/${TID}/corteLapiz`).get();
  allCL.docs.forEach(d => {
    const x = d.data();
    console.log(`  • ${d.id}: ${x.nombre || '(sin nombre)'} | activo=${x.activo} | saldo=$${x.saldo} | tel=${x.telefono}`);
  });

  // 3. Buscar últimas 5 citas del usuario en yugen
  console.log(`\n▶ Últimas citas en tenants/${TID}/citas con clienteEmail=${EMAIL}…`);
  const allCitas = await db.collection(`tenants/${TID}/citas`).get();
  const mias = allCitas.docs
    .filter(d => {
      const x = d.data();
      const em = (x.clienteEmail || '').toLowerCase();
      const uidMatch = uids.includes(x.clienteUid);
      return em === EMAIL || uidMatch;
    })
    .sort((a, b) => (b.data().fecha || '').localeCompare(a.data().fecha || ''))
    .slice(0, 8);

  if (mias.length === 0) console.log('  ✖ ninguna cita encontrada por email ni uid');
  mias.forEach(d => {
    const c = d.data();
    console.log(`  • ${d.id}`);
    console.log(`      fecha=${c.fecha} ${c.hora}  estado=${c.estado}  precio=${c.precio}  servicio=${c.servicioNombre || c.servicio}`);
    console.log(`      corteLapiz=${c.corteLapiz}  metodoPago=${c.metodoPago}  clienteUid=${c.clienteUid}  clienteEmail=${c.clienteEmail}  tel=${c.clienteTelefono}`);
    console.log(`      selloProcesado=${c.selloProcesado}  tipo=${c.selloProcesadoTipo}`);
  });

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
