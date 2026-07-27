// Diagnóstico de 3 clientes en aura sin sellos pese a tener citas completadas.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const TENANT = 'aura';
const casos = [
  { nombre: 'Osvaldo Vargas',  email: 'osvaldo.vargas@vtr.net',           tel: '+56961922113' },
  { nombre: 'Luciano Ornella', email: 'l.ornella131@gmail.com',           tel: '+56926333194' },
  { nombre: 'Joaquin Lopez',   email: 'joaquin.lopez.arevalo@gmail.com',  tel: '+56975755460' },
];

const usersCol = db.collection(`tenants/${TENANT}/users`);
const citasCol = db.collection(`tenants/${TENANT}/citas`);

for (const caso of casos) {
  const digs = caso.tel.replace(/\D+/g, '');
  const suf9 = digs.slice(-9);
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  ${caso.nombre.padEnd(30)}  ${caso.email}`);
  console.log(`║  tel=${caso.tel}  suf9=${suf9}`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);

  // ── USERS
  const seen = new Set(); const users = [];
  for (const [field, val] of [
    ['email', caso.email], ['emailLower', caso.email.toLowerCase()],
    ['telefono', caso.tel], ['telefono', digs], ['telefonoSuf9', suf9],
  ]) {
    const q = await usersCol.where(field, '==', val).get();
    for (const d of q.docs) if (!seen.has(d.id)) { seen.add(d.id); users.push(d); }
  }

  console.log(`\n USERS/`);
  if (!users.length) console.log('   ❌ ninguno');
  else for (const d of users) {
    const u = d.data();
    const tag = d.id.startsWith('ac_') ? '📦 ac  ' : /^\d+$/.test(d.id) ? '☎️ tel ' : d.id.startsWith('+') ? '📞 legacy-plus' : '🔐 auth';
    console.log(`   ${tag} ${d.id}`);
    console.log(`      nombre="${u.nombre || ''}"  email="${u.email || ''}"  tel="${u.telefono || ''}"  suf9=${u.telefonoSuf9 || '-'}`);
    console.log(`      sellosDisp=${u.sellosDisponibles ?? 0}  hist=${u.sellosHistoricos ?? 0}  stamps=${u.stamps ?? 0}`);
    console.log(`      historialSellos len=${(u.historialSellos || []).length}`);
    if (u.fusionadoCon) console.log(`      ⚡ fusionadoCon: ${u.fusionadoCon}`);
  }

  // ── CITAS
  const citaSeen = new Set(); const citas = [];
  for (const u of users) {
    for (const f of ['clienteUid', 'userId']) {
      const q = await citasCol.where(f, '==', u.id).get();
      for (const d of q.docs) if (!citaSeen.has(d.id)) { citaSeen.add(d.id); citas.push(d); }
    }
  }
  for (const tv of [caso.tel, digs, `+${digs}`]) {
    const q = await citasCol.where('clienteTelefono', '==', tv).get();
    for (const d of q.docs) if (!citaSeen.has(d.id)) { citaSeen.add(d.id); citas.push(d); }
  }

  console.log(`\n CITAS/  (${citas.length})`);
  const completadas = citas.filter(d => d.data().estado === 'Completada');
  console.log(`   Completadas: ${completadas.length}`);
  for (const d of completadas) {
    const c = d.data();
    console.log(`   📅 ${d.id}  ${c.fecha} ${c.hora}  clienteUid=${c.clienteUid || '—'}  selloProcesado=${c.selloProcesado ? c.selloProcesadoTipo : 'NO'}  cortesia=${!!c.cortesia}`);
  }
}
