#!/usr/bin/env node
/**
 * auditar-slotlocks.js — ¿la agenda y la reserva pública dicen lo mismo?
 *
 * La agenda del panel lee /citas + /bloqueos. La reserva pública NO puede leer
 * citas (requiere auth): lee `slotLocks`, un espejo público. Cuando el espejo
 * se desincroniza, cada vista tiene razón sobre su propia fuente y el desacuerdo
 * es invisible hasta que un cliente se queja.
 *
 * Detecta las DOS direcciones, que tienen consecuencias opuestas:
 *
 *   A) candado SIN respaldo (no hay cita viva ni bloqueo que lo cubra)
 *      → la pública bloquea una hora que está libre. El cliente no puede
 *        reservar y el local no ve por qué. Se limpia con
 *        scripts/limpiar-slotlocks-huerfanos.js cuando viene de un bloqueo
 *        borrado.
 *
 *   B) cita SIN candado
 *      → la pública ofrece una hora ya tomada: riesgo de DOBLE RESERVA sobre
 *        el mismo profesional. Los sobrecupos se excluyen: por regla no llevan
 *        candado (slotLockId:null).
 *
 * Solo lee; no modifica nada.
 *
 * Uso:  node scripts/auditar-slotlocks.js [tenant|ALL] [dias]
 *       node scripts/auditar-slotlocks.js ALL 14
 */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TID  = process.argv[2] || 'ALL';
const DIAS = Number(process.argv[3] || 14);

const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };

// Solo días FUTUROS: el pasado no afecta lo que se puede reservar.
const fechas = [];
for (let i = 0; i < DIAS; i++) {
  const d = new Date(); d.setDate(d.getDate() + i);
  fechas.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
}

async function auditar(tid) {
  const barberos = (await db.collection(`tenants/${tid}/barberos`).get()).docs
    .map(d => ({ id: d.id, ...d.data() })).filter(b => !b._mainDocId);
  const nombre = id => (barberos.find(b => b.id === id) || {}).nombre || id;

  let totalA = 0, totalB = 0;
  const porBarbero = {};

  for (const fecha of fechas) {
    const [citasSnap, locksSnap, bloqSnap] = await Promise.all([
      db.collection(`tenants/${tid}/citas`).where('fecha', '==', fecha).get(),
      db.collection(`tenants/${tid}/slotLocks`).where('fecha', '==', fecha).get(),
      db.collection(`tenants/${tid}/bloqueos`).where('fecha', '==', fecha).get(),
    ]);
    const citas = citasSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.estado !== 'Cancelada');
    const locks = locksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const bloq  = bloqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const l of locks) {
      const porCita = citas.some(c => {
        if (String(c.barberoId) !== String(l.barberoId)) return false;
        const ini = toMin(c.hora), fin = ini + (Number(c.duracion || c.duracionServicio) || 30);
        const lm = toMin(l.hora);
        return lm >= ini && lm < fin;
      });
      const porBloq = bloq.some(b => {
        if (b.barberoId && String(b.barberoId) !== String(l.barberoId)) return false;
        if (b.todo_el_dia) return true;
        if (!b.hora_inicio || !b.hora_fin) return false;
        const lm = toMin(l.hora);
        return lm >= toMin(b.hora_inicio) && lm < toMin(b.hora_fin);
      });
      if (!porCita && !porBloq) {
        totalA++;
        const k = nombre(l.barberoId);
        (porBarbero[k] = porBarbero[k] || { A: [], B: [] }).A.push(
          `${fecha} ${l.hora}  (citaId=${l.citaId || '-'} bloqueoId=${l.bloqueoId || '-'})`);
      }
    }

    for (const c of citas) {
      if (!c.barberoId || c.sobrecupo === true) continue;
      const tiene = locks.some(l => String(l.barberoId) === String(c.barberoId) && l.hora === c.hora);
      if (!tiene) {
        totalB++;
        const k = nombre(c.barberoId);
        (porBarbero[k] = porBarbero[k] || { A: [], B: [] }).B.push(
          `${fecha} ${c.hora}  ${c.servicioNombre || ''} · ${c.clienteNombre || ''} (${c.estado || '-'})`);
      }
    }
  }

  if (totalA + totalB === 0) return { A: 0, B: 0 };

  console.log(`\n==== ${tid} ====`);
  for (const [b, d] of Object.entries(porBarbero)) {
    console.log(`  -- ${b}`);
    if (d.A.length) {
      console.log(`     A) ${d.A.length} candado(s) SIN respaldo -> la publica bloquea horas libres:`);
      d.A.slice(0, 8).forEach(x => console.log(`          ${x}`));
      if (d.A.length > 8) console.log(`          ... y ${d.A.length - 8} mas`);
    }
    if (d.B.length) {
      console.log(`     B) ${d.B.length} cita(s) SIN candado -> la publica ofrece horas ya tomadas:`);
      d.B.slice(0, 8).forEach(x => console.log(`          ${x}`));
      if (d.B.length > 8) console.log(`          ... y ${d.B.length - 8} mas`);
    }
  }
  return { A: totalA, B: totalB };
}

(async () => {
  // listDocuments(): los docs padre de /tenants no existen; un .get() se
  // saltaria casi todos los tenants.
  const tenants = TID === 'ALL'
    ? (await db.collection('tenants').listDocuments()).map(t => t.id)
    : [TID];
  console.log(`Auditando ${tenants.length} tenant(s) · ${fechas[0]} a ${fechas[fechas.length - 1]} (${DIAS} dias)`);

  let A = 0, B = 0, conProblemas = 0;
  for (const t of tenants) {
    try {
      const r = await auditar(t);
      if (r.A + r.B > 0) conProblemas++;
      A += r.A; B += r.B;
    } catch (e) { console.log(`  ${t}: error ${e.message}`); }
  }

  console.log('\n==== RESUMEN ====');
  console.log(`tenants con discrepancias: ${conProblemas} de ${tenants.length}`);
  console.log(`A) candados sin respaldo (bloquean horas libres): ${A}`);
  console.log(`B) citas sin candado (riesgo de doble reserva):   ${B}`);
  process.exit(A + B > 0 ? 1 : 0);
})();
