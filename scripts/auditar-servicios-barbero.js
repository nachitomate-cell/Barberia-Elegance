#!/usr/bin/env node
/**
 * auditar-servicios-barbero.js — citas asignadas a alguien que NO hace ese servicio.
 *
 * Pasó de verdad: renacer, 04-08. Kimberly reservó "Corte de Cabello Femenino"
 * eligiendo "Sin preferencia" y le tocó Yender, que tiene 8 servicios
 * habilitados y los 8 son masculinos. El filtro por `serviciosIds` existía
 * pero solo alimentaba el selector de profesional: la grilla de horas y la
 * auto-asignación trabajaban sobre la lista completa.
 *
 * El arreglo evita las próximas. Esto encuentra las que ya entraron, en TODOS
 * los tenants, para poder reasignarlas antes de que el cliente llegue y se
 * encuentre con que nadie puede atenderlo.
 *
 * Convención (la misma del panel y de la reserva): `serviciosIds` vacío o
 * ausente = ese profesional hace TODOS los servicios. Solo se reporta cuando
 * la lista existe y el servicio no está en ella.
 *
 * Solo lectura. No modifica nada.
 *
 * Uso:  node scripts/auditar-servicios-barbero.js [ALL|<tenantId>] [dias]
 */
const admin = require('firebase-admin');
const key = require('../service-account.json');
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

const ARG_TENANT = process.argv[2] || 'ALL';
const DIAS       = Number(process.argv[3]) || 60;

const hoyChile = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
};
const sumarDias = (f, n) => {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

(async () => {
  const desde = hoyChile();
  const hasta = sumarDias(desde, DIAS);
  console.log(`\n🔎 Citas con servicio que el profesional NO realiza`);
  console.log(`   Rango: ${desde} → ${hasta} (${DIAS} días)\n`);

  const tenants = ARG_TENANT === 'ALL'
    ? (await db.collection('tenants').listDocuments()).map(t => t.id)
    : [ARG_TENANT];

  let totalMal = 0, totalRevisadas = 0, tenantsConProblema = 0;

  for (const tid of tenants) {
    // Mapa de profesionales: docId canónico → { nombre, serviciosIds }.
    // Los docs-espejo (_mainDocId) apuntan al canónico, así que una cita
    // guardada con el uid se resuelve igual.
    const barbSnap = await db.collection(`tenants/${tid}/barberos`).get().catch(() => null);
    if (!barbSnap) continue;
    const porId = new Map();
    const alias = new Map();
    barbSnap.forEach(d => {
      const b = d.data() || {};
      if (b._mainDocId) { alias.set(d.id, b._mainDocId); return; }
      porId.set(d.id, { nombre: b.nombre || d.id, ids: Array.isArray(b.serviciosIds) ? b.serviciosIds.map(String) : null });
    });

    const svcSnap = await db.collection(`tenants/${tid}/servicios`).get().catch(() => null);
    const nombreSvc = new Map();
    if (svcSnap) svcSnap.forEach(d => nombreSvc.set(d.id, (d.data() || {}).nombre || d.id));

    const citas = await db.collection(`tenants/${tid}/citas`)
      .where('fecha', '>=', desde).where('fecha', '<=', hasta).get().catch(() => null);
    if (!citas) continue;

    const malas = [];
    citas.forEach(d => {
      const c = d.data() || {};
      if (['Cancelada', 'NoAsistio'].includes(c.estado)) return;
      if (!c.barberoId || !c.servicioId) return;
      totalRevisadas++;
      const canon = alias.get(c.barberoId) || c.barberoId;
      const prof = porId.get(canon);
      if (!prof) return;                 // profesional borrado: no es este problema
      if (!prof.ids || !prof.ids.length) return;  // vacío = hace todos
      if (prof.ids.includes(String(c.servicioId))) return;
      malas.push({
        id: d.id, fecha: c.fecha, hora: c.hora, cliente: c.clienteNombre || '—',
        prof: prof.nombre, servicio: c.servicioNombre || nombreSvc.get(c.servicioId) || c.servicioId,
        servicioId: c.servicioId, estado: c.estado, origen: c.origen || '(sin origen)',
      });
    });

    if (!malas.length) continue;
    tenantsConProblema++;
    totalMal += malas.length;
    console.log(`==== ${tid} — ${malas.length} cita(s) ====`);
    malas.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    malas.forEach(m => {
      console.log(`  ${m.fecha} ${String(m.hora).padEnd(5)}  ${String(m.prof).padEnd(18)} ← "${m.servicio}"`);
      console.log(`     cliente=${m.cliente}  estado=${m.estado}  origen=${m.origen}  citaId=${m.id}`);
    });
    console.log('');
  }

  console.log('==== RESUMEN ====');
  console.log(`  citas revisadas          : ${totalRevisadas}`);
  console.log(`  con servicio incompatible: ${totalMal}`);
  console.log(`  tenants afectados        : ${tenantsConProblema} de ${tenants.length}`);
  if (totalMal) {
    console.log('\n  Hay que reasignarlas a mano desde la agenda: el cliente llega y');
    console.log('  ese profesional no puede atenderlo.\n');
  } else {
    console.log('  Nada que reasignar.\n');
  }
  process.exit(0);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
