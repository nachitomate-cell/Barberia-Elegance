/**
 * seed-oren.js — Firestore para Oren Barber (oren) · multi-sucursal REAL
 *
 * Datos entregados por el cliente (21-jul-2026):
 *   · 2 sucursales: Reñaca (Lun-Dom 11-19) y Villa Alemana (Lun-Sáb 11-20).
 *   · Precios DISTINTOS por sucursal en Corte y Corte+Barba → campo
 *     `preciosSucursal` (lo resuelve _getPrecioEfectivo en la agenda).
 *   · Horario por sucursal → va en el `horario` de cada barbero (getConfigBarbero
 *     lo lee). "Cualquier barbero" une los barberos del local, así que respeta
 *     el horario (Villa Alemana no ofrece domingos).
 *   · Barbero Max atiende en ambas → 2 perfiles (uno por sucursal) con el
 *     horario de cada local; el cliente ve un solo "Barbero Max" por sucursal.
 *
 * Uso:  node seed-oren.js            (dry-run)
 *       node seed-oren.js --commit   (escribe)
 */
const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SA = path.join(__dirname, 'service-account.json');
admin.initializeApp({
  credential: fs.existsSync(SA)
    ? admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8')))
    : admin.credential.applicationDefault(),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

const TENANT_ID = 'oren';
const COMMIT    = process.argv.includes('--commit');
const col = (name) => db.collection('tenants').doc(TENANT_ID).collection(name);
const sep = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 52 - t.length))}`);

// ── Horarios por sucursal (0=Dom … 6=Sáb) ────────────────────────────────────
// Reñaca: Lunes a Domingo 11:00–19:00 (última agenda 19:00).
const HOR_RENACA = {};
for (let d = 0; d <= 6; d++) HOR_RENACA[String(d)] = { activo: true, inicio: '11:00', fin: '19:00', descansos: [] };
// Villa Alemana: Lunes a Sábado 11:00–20:00, domingo cerrado.
const HOR_VILLA = { '0': { activo: false } };
for (let d = 1; d <= 6; d++) HOR_VILLA[String(d)] = { activo: true, inicio: '11:00', fin: '20:00', descansos: [] };

// ── Sucursales ───────────────────────────────────────────────────────────────
const SUCURSALES = [
  { id: 'renaca', nombre: 'Oren Barber Reñaca',
    calle: 'Av. Borgoño 14580, Local 21 · Mall Plaza Reñaca', ciudad: 'Viña del Mar',
    mapsUrl: 'https://maps.google.com/?q=Mall+Plaza+Reñaca+Av+Borgoño+14580+Viña+del+Mar',
    googleReviewUrl: 'https://share.google/8d8Pyt32jRu5yTjbc', activo: true, orden: 0 },
  { id: 'villaalemana', nombre: 'Oren Barber Villa Alemana',
    calle: 'Av. Las Américas 498, Local 24 · Estación Las Américas', ciudad: 'Villa Alemana',
    mapsUrl: 'https://maps.google.com/?q=Av+Las+Américas+498+Villa+Alemana',
    googleReviewUrl: 'https://share.google/x0GYsWCEeau8lwKAh', activo: true, orden: 1 },
];

// ── Servicios (precio por sucursal donde aplica) ─────────────────────────────
const SERVICIOS = [
  { id: 'corte-cabello', nombre: 'Corte de Cabello', precio: 12000,
    preciosSucursal: { renaca: 13990, villaalemana: 12000 }, duracion: 45, categoria: 'Cortes', activo: true, orden: 0 },
  { id: 'corte-estudiantes', nombre: 'Corte Estudiantes (Mar y Mié)', precio: 10000,
    duracion: 45, categoria: 'Cortes', activo: true, orden: 1 },
  { id: 'corte-jubilados', nombre: 'Corte Jubilados (solo Reñaca)', precio: 10000,
    preciosSucursal: { renaca: 10000 }, duracion: 45, categoria: 'Cortes', activo: true, orden: 2 },
  { id: 'corte-barba', nombre: 'Corte + Barba', precio: 19990,
    preciosSucursal: { renaca: 23990, villaalemana: 19990 }, duracion: 80, categoria: 'Combos', activo: true, orden: 3 },
];

// ── Barberos (Barbero X, con sucursalId + horario del local) ─────────────────
const BARBEROS = [
  { id: 'oren-diego',      nombre: 'Barbero Diego',   sucursalId: 'renaca',       horario: HOR_RENACA, orden: 0 },
  { id: 'oren-daniel',     nombre: 'Barbero Daniel',  sucursalId: 'renaca',       horario: HOR_RENACA, orden: 1 },
  { id: 'oren-vicente',    nombre: 'Barbero Vicente', sucursalId: 'renaca',       horario: HOR_RENACA, orden: 2 },
  { id: 'oren-romero',     nombre: 'Barbero Romero',  sucursalId: 'renaca',       horario: HOR_RENACA, orden: 3 },
  { id: 'oren-max-renaca', nombre: 'Barbero Max',     sucursalId: 'renaca',       horario: HOR_RENACA, orden: 4 },
  { id: 'oren-max-villa',  nombre: 'Barbero Max',     sucursalId: 'villaalemana', horario: HOR_VILLA,  orden: 5 },
  { id: 'oren-pablo',      nombre: 'Barbero Pablo',   sucursalId: 'villaalemana', horario: HOR_VILLA,  orden: 6 },
].map(b => ({ ...b, foto: null, disponible: true, activo: true, rol: 'profesional' }));

// ── Config global (superset; los horarios por barbero restringen de verdad) ──
const CONFIG = {
  horarioInicio: '11:00', horarioFin: '20:00', intervaloMinutos: 30, slotDuration: 30,
  reservasActivas: true, minutosLimiteReagendar: 0,
  diasLaborales: [0, 1, 2, 3, 4, 5, 6],
  telefonoAdmin: '', diasBloqueados: [], colacion: null, diasConfig: {},
  multiSucursal: true, sucursales: SUCURSALES,
};

const PREMIOS = [
  { id: 'default', nombre: 'Corte Gratis', descripcion: 'Canjea 10 sellos por un corte de cabello gratis.', sellosRequeridos: 10, costoSellos: 10, activo: true },
];
const SYSTEM_DOC = { killSwitch: false, plan: 'pro', billingStatus: 'active', status: 'active' };

// Borra todos los docs de una colección (para limpiar la data demo previa antes
// de escribir la real). Seguro en oren: aún no tiene citas ni clientes reales.
async function wipe(name) {
  const snap = await col(name).get();
  if (!COMMIT) { console.log(`  🅳 borraría ${snap.size} docs viejos de ${name}`); return; }
  let b = db.batch(), n = 0;
  snap.forEach(d => { b.delete(d.ref); if (++n % 400 === 0) { b.commit(); b = db.batch(); } });
  if (n) await b.commit();
  console.log(`  🧹 ${n} docs viejos borrados de ${name}`);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Oren Barber (oren) — Seed REAL multi-sucursal   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Tenant: ${TENANT_ID}  |  Modo: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}\n`);

  sep('LIMPIEZA (data demo previa)');
  await wipe('servicios');
  await wipe('barberos');

  sep('CONFIGURACIÓN');
  if (COMMIT) await col('configuracion').doc('main').set({ ...CONFIG, updatedAt: TS() }, { merge: true });
  // Espejo de sucursales en settings/general: lo lee el hook useSucursales del
  // panel (dropdown de sede al editar un barbero en Equipo, vista Sucursales).
  if (COMMIT) await col('settings').doc('general').set({ sucursales: SUCURSALES, updatedAt: TS() }, { merge: true });
  console.log(`  ${COMMIT ? '✅' : '🅳'} /configuracion/main + /settings/general · ${SUCURSALES.length} sucursales`);
  SUCURSALES.forEach(s => console.log(`       · ${s.nombre} — ${s.ciudad}`));

  sep('SERVICIOS');
  { let b = db.batch(); for (const s of SERVICIOS) { const { id, ...d } = s; b.set(col('servicios').doc(id), { ...d, updatedAt: TS() }, { merge: true });
    const ps = d.preciosSucursal ? ` [R $${(d.preciosSucursal.renaca||'—').toLocaleString('es-CL')} · V $${(d.preciosSucursal.villaalemana||'—').toLocaleString('es-CL')}]` : ` $${d.precio.toLocaleString('es-CL')}`;
    console.log(`  → ${d.nombre}${ps} · ${d.duracion}min`); } if (COMMIT) await b.commit(); }
  console.log(`  ${COMMIT ? '✅' : '🅳'} ${SERVICIOS.length} servicios`);

  sep('BARBEROS');
  { let b = db.batch(); for (const x of BARBEROS) { const { id, ...d } = x; b.set(col('barberos').doc(id), { ...d, creadoEn: TS() }, { merge: true });
    const dias = Object.keys(d.horario).filter(k => d.horario[k].activo).length;
    console.log(`  → ${d.nombre.padEnd(16)} ${d.sucursalId.padEnd(13)} (${dias} días activos)`); } if (COMMIT) await b.commit(); }
  console.log(`  ${COMMIT ? '✅' : '🅳'} ${BARBEROS.length} perfiles de barbero (Max = 2, uno por sucursal)`);

  sep('PREMIOS');
  { let b = db.batch(); for (const p of PREMIOS) { const { id, ...d } = p; b.set(col('premios').doc(id), { ...d, creadoEn: TS() }, { merge: true }); } if (COMMIT) await b.commit(); }
  console.log(`  ${COMMIT ? '✅' : '🅳'} ${PREMIOS.length} premio(s)`);

  sep('_SYSTEM');
  if (COMMIT) await db.collection('_system').doc(TENANT_ID).set({ ...SYSTEM_DOC, updatedAt: TS() }, { merge: true });
  console.log(`  ${COMMIT ? '✅' : '🅳'} _system/${TENANT_ID} · plan=pro`);

  console.log(`\n${COMMIT ? '✅ Seed COMMIT completado.' : 'ℹ️  Dry-run: nada escrito. Corre con --commit.'}\n`);
  process.exit(0);
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
