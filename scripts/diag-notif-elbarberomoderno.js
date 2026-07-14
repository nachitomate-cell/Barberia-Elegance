/**
 * Diagnóstico: notificaciones de citas del tenant elbarberomoderno.
 * Uso: node scripts/diag-notif-elbarberomoderno.js
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SA = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8'))),
  projectId: 'barberia-elegance',
});

const db = admin.firestore();
const TENANT = 'elbarberomoderno';

async function run() {
  // 1. Citas recientes (últimos 30 docs por creadoEn)
  const citasSnap = await db.collection(`tenants/${TENANT}/citas`)
    .orderBy('creadoEn', 'desc').limit(30).get();
  console.log(`\n=== ÚLTIMAS ${citasSnap.size} CITAS ===`);
  citasSnap.forEach(d => {
    const c = d.data();
    const creado = c.creadoEn?.toDate?.()?.toISOString?.() || '?';
    console.log(`- [${d.id}] ${c.clienteNombre || c.nombre} | ${c.fecha} ${c.hora} | barbero: ${c.barbero || c.barberoNombre || '?'} (id: ${c.barberoId || '-'}) | status: ${c.status || '-'} | creadoEn: ${creado}`);
  });

  // 2. Buscar a Juan Alexis específicamente
  const all = await db.collection(`tenants/${TENANT}/citas`).get();
  console.log(`\n=== CITAS QUE MATCHEAN "cespedes" (de ${all.size} totales) ===`);
  all.forEach(d => {
    const c = d.data();
    const nom = `${c.clienteNombre || ''} ${c.nombre || ''}`.toLowerCase();
    if (nom.includes('cespedes') || nom.includes('céspedes')) {
      const creado = c.creadoEn?.toDate?.()?.toISOString?.() || '?';
      console.log(`- [${d.id}]`, JSON.stringify({
        clienteNombre: c.clienteNombre || c.nombre,
        fecha: c.fecha, hora: c.hora,
        barbero: c.barbero || c.barberoNombre, barberoId: c.barberoId,
        status: c.status, creadoEn: creado,
      }));
    }
  });

  // 3. Barberos del tenant
  const barbSnap = await db.collection(`tenants/${TENANT}/barberos`).get();
  console.log(`\n=== BARBEROS (${barbSnap.size}) ===`);
  barbSnap.forEach(d => {
    const b = d.data();
    console.log(`- [${d.id}] ${b.nombre} | rol: ${b.rol || '-'} | uid: ${b.uid || '-'} | _mainDocId: ${b._mainDocId || '-'} | activo: ${b.activo !== false}`);
  });

  // 4. Tokens FCM del tenant
  const tokSnap = await db.collection(`tenants/${TENANT}/fcm_tokens`).get();
  console.log(`\n=== FCM TOKENS (${tokSnap.size}) ===`);
  tokSnap.forEach(d => {
    const t = d.data();
    const upd = (t.actualizadoEn || t.updatedAt || t.creadoEn)?.toDate?.()?.toISOString?.() || '?';
    console.log(`- [${d.id.slice(0, 18)}…] uid: ${t.uid || '-'} | barberoId: ${t.barberoId || '-'} | plataforma: ${t.plataforma || '-'} | activo: ${t.activo} | actualizado: ${upd}`);
  });

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
