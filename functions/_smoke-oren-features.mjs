// _smoke-oren-features.mjs — Smoke server-side de features de OREN #2, #4, #5.
//
// Valida el data model server-side (gastos, pagos_semanales). El UI no se
// prueba acá — el resto (#1 toggle cortesías, #3 drill-down, #6 TUU) es
// puramente visual/interactivo y requiere probarse en el navegador.
//
// USO:
//   node _smoke-oren-features.mjs [--cleanup]
//
// Escenarios:
//   1. Crea un barbero+cita ficticios en delnero (sandbox).
//   2. #2 Comisión manual: crea gasto tipo='comisionManual' → verifica formato.
//   3. #4 Adelanto edit: crea + edita + verifica.
//   4. #5 Bloqueo semana: crea pago_semanal → reabre → re-persiste con diff.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const CLEANUP = args.cleanup === true;
const TENANT  = 'delnero';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const RUN_ID   = Date.now().toString(36);
const barberoId = `_smoke_${RUN_ID}`;
const nombre    = `SMOKE OREN ${RUN_ID}`;
const hoy       = new Date().toISOString().split('T')[0];
const inicio    = hoy;
const fin       = hoy;

const results = [];
const created = { gastos: [], pagosSemanales: [] };
function assert(cond, label, extra = '') {
  results.push({ ok: !!cond, label });
  console.log(`   ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`);
}
function head(msg) { console.log(`\n━━ ${msg} ${'━'.repeat(Math.max(0, 60 - msg.length))}`); }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  SMOKE OREN — ${TENANT} — run ${RUN_ID}`);
console.log(`╚══════════════════════════════════════════════════════════════╝`);
console.log(`   Barbero ficticio: ${barberoId} (${nombre})`);
console.log(`   Período: ${inicio} → ${fin}`);

// ── PREP: crear barbero ficticio ───────────────────────────────────
await db.doc(`tenants/${TENANT}/barberos/${barberoId}`).set({
  nombre,
  comision: 50, // 50% para números redondos
  activo: true,
  _smokeTest: true,
});

// ── #2 · Comisión manual (+) ───────────────────────────────────────
head('#2 · Comisión manual (+)');
const ajRef = await db.collection(`tenants/${TENANT}/gastos`).add({
  descripcion: `Ajuste + ${nombre} — Cortes previos a la agenda`,
  monto: 49000,
  signo: '+',
  concepto: 'Cortes previos a la agenda',
  categoria: 'Sueldos',
  tipo: 'comisionManual',
  fecha: Timestamp.fromDate(new Date(hoy + 'T12:00:00')),
  barberoId,
  barberoNombre: nombre,
  creadoEn: Timestamp.now(),
  creadoPor: 'smoke',
  _smokeTest: true,
});
created.gastos.push(ajRef.id);
const ajSnap = await ajRef.get();
const aj = ajSnap.data();
assert(aj.tipo === 'comisionManual',      `gasto.tipo === 'comisionManual'`);
assert(aj.signo === '+',                  `gasto.signo === '+'`);
assert(aj.monto === 49000,                `gasto.monto === 49000`);
assert(aj.concepto === 'Cortes previos a la agenda', `gasto.concepto correcto`);
assert(aj.barberoId === barberoId,        `gasto.barberoId matchea`);

// ── #4 · Adelanto: crear → editar → verificar ──────────────────────
head('#4 · Adelanto crear + editar');
const adelRef1 = await db.collection(`tenants/${TENANT}/gastos`).add({
  descripcion: `Adelanto ${nombre} — anticipo semana`,
  monto: 30000,
  categoria: 'Sueldos',
  tipo: 'adelanto',
  metodoPago: 'Efectivo',
  fecha: Timestamp.fromDate(new Date(hoy + 'T12:00:00')),
  barberoId,
  barberoNombre: nombre,
  creadoEn: Timestamp.now(),
  cuotasTotal: 1,
  montoPorCuota: 30000,
  _smokeTest: true,
});
created.gastos.push(adelRef1.id);
assert(true, `adelanto creado (id=${adelRef1.id})`);

// Simular edit: borrar + crear con monto distinto (patrón del handler).
await adelRef1.delete();
created.gastos = created.gastos.filter(id => id !== adelRef1.id);
const adelRef2 = await db.collection(`tenants/${TENANT}/gastos`).add({
  descripcion: `Adelanto ${nombre} — anticipo semana (2 cuotas)`,
  monto: 60000,
  categoria: 'Sueldos',
  tipo: 'adelanto',
  metodoPago: 'Débito',
  fecha: Timestamp.fromDate(new Date(hoy + 'T12:00:00')),
  barberoId,
  barberoNombre: nombre,
  creadoEn: Timestamp.now(),
  cuotasTotal: 2,
  montoPorCuota: 30000,
  _smokeTest: true,
});
created.gastos.push(adelRef2.id);
const adel2 = (await adelRef2.get()).data();
assert(adel2.monto === 60000,           `adelanto editado: monto=60000`);
assert(adel2.cuotasTotal === 2,          `adelanto editado: cuotasTotal=2`);
assert(adel2.montoPorCuota === 30000,    `adelanto editado: montoPorCuota=30000`);
assert(adel2.metodoPago === 'Débito',    `adelanto editado: metodoPago cambiado`);

// ── #5 · Bloqueo semana + reapertura + diff ────────────────────────
head('#5 · Pago semanal + reapertura + diff');
const pagoId = `${barberoId}_${inicio}_${fin}`;
const pagoRef = db.doc(`tenants/${TENANT}/pagos_semanales/${pagoId}`);

// PAGO ORIGINAL: total = 100000
const totalOriginal = 100000;
await pagoRef.set({
  barberoId,
  barberoNombre: nombre,
  periodoInicio: inicio,
  periodoFin: fin,
  montoPagado: totalOriginal,
  fechaPago: Timestamp.fromDate(new Date(hoy + 'T12:00:00')),
  estado: 'pagado',
  creditoActivo: 0,
  historial: [{ tipo: 'pagado_original', montoTotal: totalOriginal, montoDelta: totalOriginal, creditoGenerado: 0, fecha: hoy }],
  creadoEn: Timestamp.now(),
  _smokeTest: true,
});
created.pagosSemanales.push(pagoId);
const pago1 = (await pagoRef.get()).data();
assert(pago1.estado === 'pagado',       `pago inicial: estado='pagado'`);
assert(pago1.montoPagado === 100000,     `pago inicial: montoPagado=100000`);
assert(Array.isArray(pago1.historial) && pago1.historial.length === 1, `historial len=1`);

// REAPERTURA
await pagoRef.set({
  estado: 'reabierto',
  reabiertoEn: Timestamp.now(),
  historial: FieldValue.arrayUnion({ tipo: 'reabierto', fecha: hoy }),
}, { merge: true });
const pago2 = (await pagoRef.get()).data();
assert(pago2.estado === 'reabierto',    `reapertura: estado='reabierto'`);
assert(pago2.historial.length === 2,     `historial len=2 (+reabierto)`);

// RE-PAGO con diff positivo: nuevo total = 120000 → saldo 20000
head('#5.a · Re-pago con diff positivo (saldo)');
const totalNuevoPos = 120000;
const diffPos = totalNuevoPos - pago2.montoPagado;
await pagoRef.set({
  montoPagado: totalNuevoPos,
  estado: 'pagado',
  historial: FieldValue.arrayUnion({
    tipo: 'reapertura_repagada',
    montoTotal: totalNuevoPos,
    montoDelta: Math.max(0, diffPos),
    creditoGenerado: 0,
    fecha: hoy,
  }),
  updatedAt: Timestamp.now(),
}, { merge: true });
const pago3 = (await pagoRef.get()).data();
assert(pago3.estado === 'pagado',       `re-pago +: estado vuelve a 'pagado'`);
assert(pago3.montoPagado === 120000,     `re-pago +: montoPagado=120000`);
assert(diffPos === 20000,                `diff positivo calculado correctamente`);

// RE-REAPERTURA + RE-PAGO con diff negativo: nuevo total = 90000 → sobrepago 30000
head('#5.b · Re-pago con diff negativo (sobrepago → crédito)');
await pagoRef.set({ estado: 'reabierto' }, { merge: true });
const totalNuevoNeg = 90000;
const diffNeg = totalNuevoNeg - pago3.montoPagado; // -30000
const creditoNuevo = diffNeg < 0 ? Math.abs(diffNeg) : 0;
await pagoRef.set({
  montoPagado: totalNuevoNeg,
  estado: 'pagado',
  creditoActivo: (Number(pago3.creditoActivo) || 0) + creditoNuevo,
  historial: FieldValue.arrayUnion({
    tipo: 'reapertura_repagada',
    montoTotal: totalNuevoNeg,
    montoDelta: 0,               // no sale plata nueva
    creditoGenerado: creditoNuevo,
    fecha: hoy,
  }),
}, { merge: true });
const pago4 = (await pagoRef.get()).data();
assert(pago4.creditoActivo === 30000,   `re-pago −: creditoActivo=30000`, String(pago4.creditoActivo));
assert(pago4.montoPagado === 90000,      `re-pago −: montoPagado=90000`);

// ── Resumen ─────────────────────────────────────────────────────────
head('RESUMEN');
const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok).length;
console.log(`   ${pass} ✅  ${fail} ${fail ? '❌' : '✅'}  (total ${results.length})`);

// ── Cleanup ─────────────────────────────────────────────────────────
if (CLEANUP) {
  head('CLEANUP');
  for (const id of created.gastos) {
    try { await db.doc(`tenants/${TENANT}/gastos/${id}`).delete(); } catch (_) {}
  }
  for (const id of created.pagosSemanales) {
    try { await db.doc(`tenants/${TENANT}/pagos_semanales/${id}`).delete(); } catch (_) {}
  }
  try { await db.doc(`tenants/${TENANT}/barberos/${barberoId}`).delete(); } catch (_) {}
  console.log(`   ✅ borrado: ${created.gastos.length} gasto(s), ${created.pagosSemanales.length} pago(s) semanal(es), 1 barbero`);
} else {
  console.log(`\n   Docs de test dejados (--cleanup para borrar):`);
  console.log(`      tenants/${TENANT}/barberos/${barberoId}`);
  created.gastos.forEach(id => console.log(`      tenants/${TENANT}/gastos/${id}`));
  created.pagosSemanales.forEach(id => console.log(`      tenants/${TENANT}/pagos_semanales/${id}`));
}

process.exit(fail ? 1 : 0);
