/**
 * seed-oren.js — Inicialización Firestore para Oren Barber (oren) · DEMO multi-sucursal
 *
 * Marca real (Instagram @orenbarbercl): 2 sucursales — Reñaca y Villa Alemana.
 * Servicios y barberos son DEMO realista para la reunión de venta; se
 * reemplazan por los reales del cliente al cerrar el trato.
 *
 * Crea bajo tenants/oren/:
 *   · configuracion/main    · horario Lun–Dom 10:00–20:00 · slot 30 · multiSucursal
 *   · servicios/{id}        · catálogo de barbería (Cortes, Barba, Combos, Club, Extras)
 *   · barberos/{id}         · 5 profesionales (3 Reñaca, 2 Villa Alemana) con sucursalId
 *   · premios/default       · 10 sellos → Corte Gratis
 * Y bajo _system/oren:  killSwitch, plan, billingStatus
 *
 * Uso:
 *   node seed-oren.js            # dry-run
 *   node seed-oren.js --commit   # escribe en Firestore
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

// ── Sucursales (espejo de config.js) ─────────────────────────────────────────
const SUCURSALES = [
  { id: 'renaca',       nombre: 'Oren Barber Reñaca',        calle: 'Plaza Reñaca, Local 21', ciudad: 'Reñaca',        activo: true, orden: 0 },
  { id: 'villaalemana', nombre: 'Oren Barber Villa Alemana', calle: 'Las Américas 2487',      ciudad: 'Villa Alemana', activo: true, orden: 1 },
];

// ── Servicios (DEMO realista de barbería) ────────────────────────────────────
const SERVICIOS = [
  { id: 'corte-de-cabello',    nombre: 'Corte de Cabello',        precio: 12000, duracion: 40, categoria: 'Cortes',  activo: true, orden: 0 },
  { id: 'corte-diseno',        nombre: 'Corte + Diseño (Freestyle)', precio: 15000, duracion: 45, categoria: 'Cortes',  activo: true, orden: 1 },
  { id: 'corte-nino',          nombre: 'Corte Niño',              precio: 10000, duracion: 30, categoria: 'Cortes',  activo: true, orden: 2 },
  { id: 'perfilado-barba',     nombre: 'Perfilado de Barba',      precio: 8000,  duracion: 30, categoria: 'Barba',   activo: true, orden: 3 },
  { id: 'afeitado-clasico',    nombre: 'Afeitado Clásico a Toalla', precio: 10000, duracion: 30, categoria: 'Barba',   activo: true, orden: 4 },
  { id: 'corte-barba',         nombre: 'Corte + Barba',           precio: 18000, duracion: 60, categoria: 'Combos',  activo: true, orden: 5 },
  { id: 'corte-barba-cejas',   nombre: 'Corte + Barba + Cejas',   precio: 21000, duracion: 70, categoria: 'Combos',  activo: true, orden: 6 },
  { id: 'club-premium',        nombre: 'Club Premium (Corte + Barba · mensual)', precio: 25000, duracion: 60, categoria: 'Club', activo: true, orden: 7 },
  { id: 'club-senior',         nombre: 'Club Senior (Corte + Cejas · jubilados)', precio: 9000, duracion: 40, categoria: 'Club', activo: true, orden: 8 },
  { id: 'perfilado-cejas',     nombre: 'Perfilado de Cejas',      precio: 4000,  duracion: 15, categoria: 'Extras',  activo: true, orden: 9 },
  { id: 'lavado-peinado',      nombre: 'Lavado + Peinado',        precio: 6000,  duracion: 20, categoria: 'Extras',  activo: true, orden: 10 },
  { id: 'mascarilla-facial',   nombre: 'Mascarilla Facial (Black Mask)', precio: 8000, duracion: 20, categoria: 'Extras', activo: true, orden: 11 },
];

// ── Barberos (con sucursalId, espejo de config.js) ───────────────────────────
const BARBEROS = [
  { id: 'oren-matias',    nombre: 'Matías',    foto: null, disponible: true, activo: true, rol: 'profesional', sucursalId: 'renaca',       orden: 0 },
  { id: 'oren-cristobal', nombre: 'Cristóbal', foto: null, disponible: true, activo: true, rol: 'profesional', sucursalId: 'renaca',       orden: 1 },
  { id: 'oren-franco',    nombre: 'Franco',    foto: null, disponible: true, activo: true, rol: 'profesional', sucursalId: 'renaca',       orden: 2 },
  { id: 'oren-benjamin',  nombre: 'Benjamín',  foto: null, disponible: true, activo: true, rol: 'profesional', sucursalId: 'villaalemana', orden: 3 },
  { id: 'oren-ignacio',   nombre: 'Ignacio',   foto: null, disponible: true, activo: true, rol: 'profesional', sucursalId: 'villaalemana', orden: 4 },
];

const CONFIG = {
  horarioInicio:          '10:00',
  horarioFin:             '20:00',
  intervaloMinutos:       30,
  slotDuration:           30,
  reservasActivas:        true,
  minutosLimiteReagendar: 0,
  diasLaborales:          [0, 1, 2, 3, 4, 5, 6], // Lun–Dom
  telefonoAdmin:          '',
  diasBloqueados:         [],
  colacion:               null,
  diasConfig:             {},
  multiSucursal:          true,
  sucursales:             SUCURSALES,
};

const PREMIOS = [
  { id: 'default', nombre: 'Corte Gratis', descripcion: 'Canjea 10 sellos por un corte de cabello gratis.', sellosRequeridos: 10, costoSellos: 10, activo: true },
];

const SYSTEM_DOC = { killSwitch: false, plan: 'pro', billingStatus: 'active', status: 'active' };

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Oren Barber (oren) — Seed DEMO multi-sucursal   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Tenant: ${TENANT_ID}  |  Modo: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}\n`);

  sep('CONFIGURACIÓN');
  if (COMMIT) await col('configuracion').doc('main').set({ ...CONFIG, updatedAt: TS() }, { merge: true });
  console.log(`  ${COMMIT ? '✅' : '🅳'} /configuracion/main · Lun–Dom 10–20 · slot 30 · ${SUCURSALES.length} sucursales`);

  sep('SERVICIOS');
  { let b = db.batch(); for (const s of SERVICIOS) { const { id, ...d } = s; b.set(col('servicios').doc(id), { ...d, updatedAt: TS() }, { merge: true }); console.log(`  → [${d.categoria}] ${d.nombre} · $${d.precio.toLocaleString('es-CL')} · ${d.duracion}min`); } if (COMMIT) await b.commit(); }
  console.log(`  ${COMMIT ? '✅' : '🅳'} ${SERVICIOS.length} servicios`);

  sep('BARBEROS');
  { let b = db.batch(); for (const x of BARBEROS) { const { id, ...d } = x; b.set(col('barberos').doc(id), { ...d, creadoEn: TS() }, { merge: true }); console.log(`  → ${d.nombre} (${d.sucursalId})`); } if (COMMIT) await b.commit(); }
  console.log(`  ${COMMIT ? '✅' : '🅳'} ${BARBEROS.length} barberos`);

  sep('PREMIOS');
  { let b = db.batch(); for (const p of PREMIOS) { const { id, ...d } = p; b.set(col('premios').doc(id), { ...d, creadoEn: TS() }, { merge: true }); } if (COMMIT) await b.commit(); }
  console.log(`  ${COMMIT ? '✅' : '🅳'} ${PREMIOS.length} premio(s)`);

  sep('_SYSTEM');
  if (COMMIT) await db.collection('_system').doc(TENANT_ID).set({ ...SYSTEM_DOC, updatedAt: TS() }, { merge: true });
  console.log(`  ${COMMIT ? '✅' : '🅳'} _system/${TENANT_ID} · plan=pro · killSwitch=false`);

  console.log(`\n${COMMIT ? '✅ Seed COMMIT completado.' : 'ℹ️  Dry-run: nada escrito. Corre con --commit.'}\n`);
  process.exit(0);
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
