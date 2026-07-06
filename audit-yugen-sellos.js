/**
 * audit-yugen-sellos.js
 *
 * Cruza las citas Completadas con:
 *   - tenants/yugen/clientes/{tel_normalizado}   → sellos de "invitado"
 *   - tenants/yugen/users/{uid} (por telefono)   → sellos del Club
 *
 * Objetivo: contar cuántas citas con selloProcesadoTipo='sello' quedaron
 * con sello registrado en clientes/ pero NUNCA se espejaron a users/
 * (porque la CF no pudo resolver uid).
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();
const TENANT = 'yugen';

/* Normaliza teléfono a solo dígitos, tomando los últimos 9 (móvil CL). */
function normTel(raw) {
  const digs = String(raw || '').replace(/\D+/g, '');
  return digs.length >= 9 ? digs.slice(-9) : digs;
}

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`   Auditoría de sellos · Yūgen — profundidad completa`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1) Cargar todo lo relevante
  const [citasSnap, usersSnap, clientesSnap] = await Promise.all([
    db.collection(`tenants/${TENANT}/citas`).get(),
    db.collection(`tenants/${TENANT}/users`).get(),
    db.collection(`tenants/${TENANT}/clientes`).get(),
  ]);

  const citas    = citasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const users    = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const clientes = clientesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const completadas = citas.filter(c => String(c.estado || '').toLowerCase() === 'completada');

  // Indexar users por tel (últimos 9 dígitos) y por email
  const usersByTel = new Map();
  const usersByEmail = new Map();
  for (const u of users) {
    const t = normTel(u.telefono);
    if (t) usersByTel.set(t, u);
    if (u.email) usersByEmail.set(String(u.email).toLowerCase().trim(), u);
  }

  // Indexar clientes por tel
  const clientesByTel = new Map();
  for (const c of clientes) {
    const t = normTel(c.id || c.telefono);
    if (t) clientesByTel.set(t, c);
  }

  console.log(`Yugen · users registrados en el Club:  ${users.length}`);
  console.log(`Yugen · clientes (bucket por teléfono): ${clientes.length}`);
  console.log(`Yugen · citas totales:                 ${citas.length}`);
  console.log(`Yugen · citas Completadas:             ${completadas.length}\n`);

  console.log('════════════════ Cruce cita ↔ users/clientes ════════════════\n');

  const stats = {
    // La CF otorgó y también existe en users/ (todo OK)
    ok_espejado_users: [],
    // La CF otorgó en clientes/ pero cliente NO tiene cuenta users/
    solo_en_clientes_sin_user: [],
    // Cliente tiene user pero teléfono no coincidió → CF no lo espejó
    user_existe_pero_no_espejado: [],
    // Corte al Lápiz (no aplica sellos por diseño)
    corte_al_lapiz: [],
    // Sin teléfono
    sin_telefono: [],
  };

  for (const c of completadas) {
    if (c.corteLapiz === true) { stats.corte_al_lapiz.push(c); continue; }
    const tel = normTel(c.clienteTelefono);
    if (!tel) { stats.sin_telefono.push(c); continue; }

    const user     = usersByTel.get(tel);
    const cliente  = clientesByTel.get(tel);
    const sellosU  = user ? Number(user.sellosDisponibles ?? user.stamps ?? 0) : 0;
    const sellosC  = cliente ? Number(cliente.sellosDisponibles ?? 0) : 0;

    const enriched = { ...c, _tel: tel, _sellosUser: sellosU, _sellosCliente: sellosC, _userExiste: !!user, _clienteDoc: !!cliente };

    if (user && sellosU > 0) stats.ok_espejado_users.push(enriched);
    else if (!user)          stats.solo_en_clientes_sin_user.push(enriched);
    else if (user && sellosU === 0 && sellosC > 0) stats.user_existe_pero_no_espejado.push(enriched);
    else stats.solo_en_clientes_sin_user.push(enriched); // fallback
  }

  console.log(`✅ Sello OK (registrado en users/):                ${stats.ok_espejado_users.length}`);
  console.log(`⚠️  Cliente sin cuenta en el Club:                 ${stats.solo_en_clientes_sin_user.length}`);
  console.log(`🔴 Cliente CON cuenta pero teléfono desalineado:   ${stats.user_existe_pero_no_espejado.length}`);
  console.log(`✏️  Corte al Lápiz (crédito, no sella):            ${stats.corte_al_lapiz.length}`);
  console.log(`❔ Sin teléfono:                                    ${stats.sin_telefono.length}\n`);

  const printBucket = (label, arr) => {
    if (!arr.length) return;
    console.log(`──── ${label} ────`);
    for (const c of arr) {
      const fec = `${c.fecha} ${c.hora || ''}`.trim().padEnd(18);
      const cli = (c.clienteNombre || '—').padEnd(24).slice(0, 24);
      const tel = String(c._tel || '').padEnd(11);
      const sU  = String(c._sellosUser || 0).padStart(2);
      const sC  = String(c._sellosCliente || 0).padStart(2);
      const flag = c._userExiste ? 'USER-YES' : 'USER-NO ';
      console.log(`  · ${fec} ${cli} tel=${tel} users:${sU}  clientes:${sC}  ${flag}`);
    }
    console.log('');
  };

  printBucket('🔴 CON cuenta pero sellos no espejados a users/', stats.user_existe_pero_no_espejado);
  printBucket('⚠️  Sin cuenta en el Club (sellos en clientes/, sin usuario que los reclame)', stats.solo_en_clientes_sin_user);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   Fin de auditoría');
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
})().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
