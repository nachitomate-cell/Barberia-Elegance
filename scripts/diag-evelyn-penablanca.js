/**
 * diag-evelyn-penablanca.js — reproduce la llamada consultar_disponibilidad
 * que hizo el bot (07-08: "Evelyn no tiene cupos disponibles") contra los
 * datos VIVOS de kronnos_penablanca, con el mismo motor de functions/.
 *
 * Solo lectura. Uso: node scripts/diag-evelyn-penablanca.js
 */
const path = require('path');
// firebase-admin desde functions/ (misma razón que auditar-citas-imposibles.js)
const FUNCS = path.join(__dirname, '..', 'functions');
const admin = require(require.resolve('firebase-admin', { paths: [FUNCS] }));
const key = require('../service-account.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

const {
  _buscarDisponibilidad: buscarDisponibilidad,
  _atiendeEseDia: atiendeEseDia,
  _ahoraChile: ahoraChile,
} = require('../functions/chat-horas-disponibles');

const TID = 'kronnos_penablanca';
const norm = (s) => String(s || '').toLowerCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

async function main() {
  const ahora = ahoraChile();
  console.log(`\nAhora Chile: ${ahora.fecha} ${ahora.hhmm || ''}\n`);

  // ── 1) Todos los docs de barberos que suenen a Evelyn ──
  const barbSnap = await db.collection(`tenants/${TID}/barberos`).get();
  const evelyns = [];
  const equipoElegible = [];
  barbSnap.forEach(d => {
    const b = d.data() || {};
    const visible = !b._mainDocId && b.esQA !== true && b.disponible !== false && b.activo !== false
      && !(b.rol === 'admin' && b.mostrarEnAgenda !== true);
    if (visible) equipoElegible.push({ id: d.id, nombre: b.nombre });
    if (/evel/i.test(norm(b.nombre))) evelyns.push({ id: d.id, ...b });
  });

  console.log('Equipo elegible (lo que ve matchProfesional):');
  equipoElegible.forEach(b => console.log(`  · ${b.nombre}  [${b.id}]`));

  console.log(`\nDocs "Evelyn" encontrados: ${evelyns.length}`);
  for (const b of evelyns) {
    console.log(`\n─── ${b.nombre} [${b.id}] ───`);
    console.log(`  _mainDocId:      ${b._mainDocId || '—'}`);
    console.log(`  activo:          ${b.activo}`);
    console.log(`  disponible:      ${b.disponible}`);
    console.log(`  rol:             ${b.rol || '—'}  mostrarEnAgenda: ${b.mostrarEnAgenda}`);
    console.log(`  esQA:            ${b.esQA || false}`);
    const ids = Array.isArray(b.serviciosIds) ? b.serviciosIds : null;
    console.log(`  serviciosIds:    ${ids ? `${ids.length} → ${JSON.stringify(ids)}` : '(ausente = todos)'}`);
    console.log(`  horario (doc):   ${b.horario ? JSON.stringify(b.horario).slice(0, 400) : '—'}`);
    const cfg = await db.doc(`tenants/${TID}/barberos/${b.id}/configuracion/main`).get();
    console.log(`  cfg personal:    ${cfg.exists ? JSON.stringify(cfg.data()).slice(0, 400) : '—'}`);
  }

  // ── 2) Servicios que suenan a "corte" ──
  const svcSnap = await db.collection(`tenants/${TID}/servicios`).get();
  const servicios = [];
  svcSnap.forEach(d => {
    const s = d.data() || {};
    servicios.push({ id: d.id, nombre: String(s.nombre || '').trim(),
      duracion: Number(s.duracion || s.duracionServicio) || 30,
      activo: s.activo, dias: s.diasDisponibles || null });
  });
  console.log('\nServicios con "corte" o "niñ":');
  servicios.filter(s => /corte|nin/i.test(norm(s.nombre)))
    .forEach(s => console.log(`  · ${s.nombre}  [${s.id}]  ${s.duracion}min  activo:${s.activo}  dias:${JSON.stringify(s.dias)}`));

  // matchServicio del cerebro: exacto → incluye
  const matchServicio = (nombre) => {
    const n = norm(nombre);
    const activos = servicios.filter(s => s.activo !== false);
    return activos.find(s => norm(s.nombre) === n)
        || activos.find(s => norm(s.nombre).includes(n) || n.includes(norm(s.nombre)))
        || null;
  };

  // Reproducción del caso Juan Montero (07-08): profesional fijado + 2 personas
  for (const b of evelyns.filter(x => !x._mainDocId)) {
    const svcM = matchServicio('corte masculino');
    const r2 = await buscarDisponibilidad(TID, ahora.fecha, {
      durMin: svcM?.duracion || null, barberoId: b.id, servicioId: svcM?.id || null, personas: 2,
    });
    console.log(`\nbuscarDisponibilidad(${b.nombre}, Corte Masculino, personas=2):`);
    console.log(`  → fecha: ${r2.fecha}  slots: ${JSON.stringify(r2.slots)}`);
    const r3 = await buscarDisponibilidad(TID, ahora.fecha, {
      durMin: svcM?.duracion || null, servicioId: svcM?.id || null, personas: 2,
    });
    console.log(`buscarDisponibilidad(SIN profesional, Corte Masculino, personas=2):`);
    console.log(`  → fecha: ${r3.fecha}  slots: ${JSON.stringify(r3.slots)}`);
  }

  for (const b of evelyns.filter(x => !x._mainDocId)) {
    for (const pedirSvc of ['corte de cabello', null]) {
      const svc = pedirSvc ? matchServicio(pedirSvc) : null;
      if (pedirSvc && !svc) { console.log(`\n(matchServicio no encontró "${pedirSvc}")`); continue; }
      const tag = svc ? `servicio="${svc.nombre}" [${svc.id}]` : 'SIN servicio';
      const r = await buscarDisponibilidad(TID, ahora.fecha, {
        durMin: svc?.duracion || null,
        barberoId: b.id,
        servicioId: svc?.id || null,
        personas: 1,
      });
      console.log(`\nbuscarDisponibilidad(${b.nombre}, ${tag}):`);
      console.log(`  → fecha: ${r.fecha}  slots: ${JSON.stringify(r.slots)}`);
    }
    for (let i = 0; i < 4; i++) {
      const f = new Date(Date.UTC(...ahora.fecha.split('-').map((n, j) => j === 1 ? n - 1 : +n)));
      f.setUTCDate(f.getUTCDate() + i);
      const fecha = f.toISOString().slice(0, 10);
      const j = await atiendeEseDia(TID, fecha, b.id);
      console.log(`  atiendeEseDia ${fecha}: ${JSON.stringify(j)}`);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
