'use strict';

// functions/scripts/backfill-slotlocks.js
// ─────────────────────────────────────────────────────────────────
//  BACKFILL de slotLocks faltantes (one-off, admin).
//
//  Recorre TODOS los tenants (+ elegance raíz), busca citas ACTIVAS
//  con barbero y fecha >= hoy que NO tengan su candado público
//  (slotLocks) y lo crea. Así la reserva online deja de ofrecer horas
//  que en realidad están ocupadas.
//
//  No toca: citas canceladas, sobrecupos, ni locks que ya pertenezcan
//  a otra cita (doble agenda real).
//
//  USO (desde la carpeta functions/, donde está firebase-admin):
//    node scripts/backfill-slotlocks.js --dry      # solo reporta
//    node scripts/backfill-slotlocks.js            # aplica los cambios
//
//  Credenciales: ../service-account.json (proyecto barberia-elegance).
// ─────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');

const DRY = process.argv.includes('--dry');
const SA  = require(path.resolve(__dirname, '../../service-account.json'));

admin.initializeApp({ credential: admin.credential.cert(SA) });
const db = admin.firestore();
const { FieldValue } = require('firebase-admin/firestore');

const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD (UTC; sirve como piso seguro)

function lockIdFor(barberoId, fecha, hora) {
  const safeHora = String(hora || '').replace(':', '');
  const safeBid  = String(barberoId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeBid}_${fecha}_${safeHora}`;
}
function duracionDe(c) { return Number(c.duracionServicio ?? c.duracion) || 30; }
function debeTenerLock(c) {
  if (!c) return false;
  if ((c.estado || '').toLowerCase() === 'cancelada') return false;
  if (c.sobrecupo === true) return false;
  if (!c.barberoId || !c.fecha || !c.hora) return false;
  return true;
}

function colsDe(tenantId) {
  const root = tenantId === 'elegance';
  return {
    citas:     db.collection(root ? 'citas'     : `tenants/${tenantId}/citas`),
    slotLocks: db.collection(root ? 'slotLocks' : `tenants/${tenantId}/slotLocks`),
  };
}

async function procesarTenant(tenantId) {
  const { citas, slotLocks } = colsDe(tenantId);
  const snap = await citas.where('fecha', '>=', hoy).get().catch(e => {
    console.warn(`  [${tenantId}] no se pudo leer citas: ${e.message}`);
    return { docs: [] };
  });

  let creados = 0, yaOk = 0, ajenos = 0, omitidos = 0;

  for (const doc of snap.docs) {
    const cita = doc.data();
    if (!debeTenerLock(cita)) { omitidos++; continue; }

    const lockId  = lockIdFor(cita.barberoId, cita.fecha, cita.hora);
    const lockRef = slotLocks.doc(lockId);
    const lockSnap = await lockRef.get();

    if (lockSnap.exists) {
      const d = lockSnap.data() || {};
      if (d.citaId && d.citaId !== doc.id) { ajenos++; continue; }   // lock de otra cita (sobrecupo real)
      yaOk++;
      continue;
    }

    // Falta el candado → crearlo.
    const dur = duracionDe(cita);
    console.log(`  [${tenantId}] FALTA lock ${lockId}  ·  ${cita.fecha} ${cita.hora}  ·  ${cita.clienteNombre || '—'}  ·  ${cita.servicioNombre || '—'}  (dur ${dur})`);
    if (!DRY) {
      await lockRef.set({
        citaId:    doc.id,
        fecha:     cita.fecha,
        hora:      cita.hora,
        barberoId: cita.barberoId,
        duracion:  dur,
        creadoEn:  FieldValue.serverTimestamp(),
        origen:    'backfill',
      });
      if (cita.slotLockId !== lockId) await doc.ref.update({ slotLockId: lockId }).catch(() => {});
    }
    creados++;
  }

  if (creados || ajenos) {
    console.log(`  [${tenantId}] → ${DRY ? 'faltan' : 'creados'}: ${creados} · ok: ${yaOk} · ajenos(sobrecupo): ${ajenos} · omitidos: ${omitidos}`);
  }
  return creados;
}

(async () => {
  console.log(`\n== Backfill slotLocks ${DRY ? '(DRY RUN — no escribe)' : '(APLICANDO)'} · citas con fecha >= ${hoy} ==\n`);

  // elegance (raíz) + cada tenant bajo /tenants
  const tenantIds = ['elegance'];
  const tSnap = await db.collection('tenants').get();
  tSnap.docs.forEach(d => tenantIds.push(d.id));

  let total = 0;
  for (const tid of tenantIds) {
    total += await procesarTenant(tid);
  }

  console.log(`\n== Listo. ${DRY ? 'Faltarían' : 'Se crearon'} ${total} slotLock(s). ==\n`);
  process.exit(0);
})().catch(e => { console.error('Backfill error:', e); process.exit(1); });
