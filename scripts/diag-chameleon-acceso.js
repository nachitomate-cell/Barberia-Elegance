'use strict';

// scripts/diag-chameleon-acceso.js — SOLO LECTURA
// Diagnóstico del reporte de Chameleon (07-08 19:46):
//   1. "No me acepta la clave y el correo de mi usuario de administración"
//   2. "Me salía el barbero David que ya habíamos eliminado hace tiempo"
// Lista los barberos del tenant (buscando a David y a los admins), y para
// cada email cruza el estado REAL en Firebase Auth (existe, disabled,
// último login, tokens revocados).

const admin = require('firebase-admin');
const path  = require('path');
admin.initializeApp({
  credential: admin.credential.cert(require(path.join(__dirname, '..', 'service-account.json'))),
});
const db = admin.firestore();

const TID = process.argv[2] || 'chameleon';

const fmt = (t) => {
  if (!t) return '—';
  if (typeof t === 'string') return t.replace('T', ' ').slice(0, 19);
  if (t.toDate) return t.toDate().toISOString().replace('T', ' ').slice(0, 19);
  return String(t);
};

(async () => {
  console.log(`\n══ Diagnóstico de acceso · tenant=${TID} ══\n`);

  // ── 1. Estado del tenant (kill switch / billing) ──
  const [sys, bill, tenant] = await Promise.all([
    db.doc(`_system/${TID}`).get(),
    db.doc(`_billing/${TID}`).get(),
    db.doc(`tenants/${TID}`).get(),
  ]);
  const s = sys.data() || {}, b = bill.data() || {}, t = tenant.data() || {};
  console.log(`_system: suspendido=${s.suspendido ?? s.killSwitch ?? '—'} · waAsistente=${s.waAsistente ?? '—'}`);
  console.log(`tenant:  status=${t.status || '—'} · _billing: estadoPago=${b.estadoPago || '—'} plan=${b.plan || '—'}\n`);

  // ── 2. Barberos del tenant (elegance = raíz) ──
  const colBarberos = TID === 'elegance' ? 'barberos' : `tenants/${TID}/barberos`;
  const snap = await db.collection(colBarberos).get();
  console.log(`barberos (${snap.size} docs):`);
  const filas = [];
  snap.forEach(d => {
    const x = d.data();
    filas.push({
      id: d.id, nombre: x.nombre || '—', email: (x.email || '').toLowerCase(),
      rol: x.rol || 'barbero', activo: x.activo, esQA: !!x.esQA,
      espejoDe: x._mainDocId || '', authUid: x.authUid || x.uid || '',
      creado: fmt(x.createdAt || x.creadoEn), actualizado: fmt(x.updatedAt),
    });
  });
  for (const f of filas.sort((a, b2) => (a.espejoDe ? 1 : 0) - (b2.espejoDe ? 1 : 0))) {
    console.log(`  · ${f.id.slice(0, 24).padEnd(24)} ${String(f.nombre).slice(0, 18).padEnd(18)} rol=${f.rol.padEnd(9)} activo=${String(f.activo).padEnd(9)}` +
      `${f.esQA ? ' QA' : ''}${f.espejoDe ? ` ESPEJO→${f.espejoDe.slice(0, 20)}` : ''}`);
    console.log(`      email=${f.email || '—'} · authUid=${f.authUid || '—'} · creado=${f.creado} · act=${f.actualizado}`);
  }

  // ── 3. Docs "David" (el eliminado que reapareció) ──
  const davids = filas.filter(f => /david/i.test(f.nombre));
  console.log(`\nDocs con nombre "David": ${davids.length ? davids.map(d => d.id).join(', ') : 'ninguno'}`);

  // ── 4. Estado en Firebase AUTH de cada email de staff ──
  console.log('\nFirebase Auth por email:');
  const emails = [...new Set(filas.map(f => f.email).filter(e => e.includes('@')))];
  for (const email of emails) {
    try {
      const u = await admin.auth().getUserByEmail(email);
      const prov = (u.providerData || []).map(p => p.providerId).join(',');
      console.log(`  · ${email}`);
      console.log(`      uid=${u.uid} · disabled=${u.disabled} · proveedores=[${prov}]`);
      console.log(`      creado=${fmt(u.metadata.creationTime)} · últimoLogin=${fmt(u.metadata.lastSignInTime)} · últimoRefresh=${fmt(u.metadata.lastRefreshTime)}`);
      if (u.tokensValidAfterTime) console.log(`      tokensRevocadosDesde=${fmt(u.tokensValidAfterTime)}`);
    } catch (e) {
      console.log(`  · ${email}  →  ❌ ${e.code || e.message}`);
    }
  }

  // ── 5. ¿Hay docs espejo huérfanos (apuntan a un principal que no existe)? ──
  const ids = new Set(filas.map(f => f.id));
  const huerfanos = filas.filter(f => f.espejoDe && !ids.has(f.espejoDe));
  console.log(`\nEspejos huérfanos (apuntan a un doc borrado): ${huerfanos.length ? '' : 'ninguno'}`);
  for (const h of huerfanos) console.log(`  · ${h.id} (${h.nombre}) → apunta a ${h.espejoDe} que NO existe`);

  process.exit(0);
})().catch(e => { console.error('❌', e); process.exit(1); });
