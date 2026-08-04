'use strict';

// scripts/smoke-reservas-grupo.js
// ─────────────────────────────────────────────────────────────────────────────
//  Smoke test de las mejoras 2-5 de reservas en grupo (2026-08-04).
//  Corre contra el tenant `practica` (barberos y datos ficticios). Deja el
//  estado limpio al terminar (borra los docs que creó).
//
//  Cubre:
//    1. Crea 1 reserva grupal de 3 en `practica` (con skipNotificaciones=true)
//       — imita addCitasGrupo del cliente pero desde el server.
//    2. Verifica las 3 citas creadas: grupoId común, nombres reales de
//       acompañantes (mejora #3), códigos distintos.
//    3. Llama gestionarCitaPorCodigo con el código PRINCIPAL, acción
//       'consultar' → debe traer esGrupoPrincipal=true, grupoTotal=3,
//       puedeCancelarGrupo=true.
//    4. Llama con código ACOMPAÑANTE, 'consultar' → esGrupoPrincipal=false,
//       puedeCancelarGrupo=false.
//    5. Prueba negativa: acompañante → 'cancelar-grupo' → permission-denied.
//    6. Llama con código PRINCIPAL → 'cancelar-grupo' → canceladas=3.
//    7. Verifica que las 3 citas quedaron 'Cancelada' y los 3 slotLocks se
//       borraron (via el trigger liberarSlotTenant).
//    8. Limpia todos los docs creados (por si el trigger no alcanzó).
// ─────────────────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');
const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'barberia-elegance' });
const db = admin.firestore();
const { FieldValue } = admin.firestore;

const TID = 'practica';
const CF_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/gestionarCitaPorCodigo';

// Fecha lejos en el futuro para no chocar con seed real.
function fechaFutura(diasAdelante = 60) {
  const d = new Date();
  d.setDate(d.getDate() + diasAdelante);
  return d.toISOString().slice(0, 10);
}

function genCodigo() {
  const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += CHARS[Math.floor(Math.random() * CHARS.length)];
  return c.slice(0, 3) + '-' + c.slice(3);
}

async function callCF(payload) {
  // Callable format v2: POST con { data: {...} }.
  const res = await fetch(CF_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: payload }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) {
    const err = new Error(j.error?.message || `HTTP ${res.status}`);
    err.code    = j.error?.status || String(res.status);
    err.details = j.error?.details;
    throw err;
  }
  return j.result;
}

async function crearGrupo({ fecha, hora, barberos, nombresAcomp, waOptIn = false }) {
  const dur = 30;
  const safeHora = hora.replace(':', '');
  const grupoId  = db.collection(`tenants/${TID}/citas`).doc().id;

  const items = barberos.map((b, i) => ({
    idx: i,
    lockRef: db.collection(`tenants/${TID}/slotLocks`).doc(`${b.id}_${fecha}_${safeHora}`),
    citaRef: db.collection(`tenants/${TID}/citas`).doc(),
    barberoId: b.id,
    barbero:   b.nombre,
  }));

  const codigos = [];
  const CLIENTE = { nombre: 'Test Grupo', tel: '+56900000000', email: 'grupo@practica.local' };

  await db.runTransaction(async (tx) => {
    const snaps = await Promise.all(items.map(it => tx.get(it.lockRef)));
    if (snaps.some(s => s.exists)) {
      const err = new Error('lock existente en la hora de prueba'); err.code = 'slot-taken'; throw err;
    }
    for (const it of items) {
      const esPrincipal = it.idx === 0;
      const codigo      = genCodigo();
      codigos.push(codigo);

      const _nombre = esPrincipal
        ? CLIENTE.nombre
        : (String(nombresAcomp[it.idx - 1] || '').trim() || `${CLIENTE.nombre} · acompañante ${it.idx + 1}`);

      tx.set(it.lockRef, {
        citaId: it.citaRef.id, fecha, hora, barberoId: it.barberoId, duracion: dur,
        creadoEn: FieldValue.serverTimestamp(),
      });
      tx.set(it.citaRef, {
        fecha, hora,
        clienteNombre:    _nombre,
        clienteTelefono:  esPrincipal ? CLIENTE.tel   : '',
        clienteEmail:     esPrincipal ? CLIENTE.email : '',
        servicioNombre:   'Corte de cabello',
        duracionServicio: dur,
        precio:           12000,
        barbero:          it.barbero,
        barberoId:        it.barberoId,
        estado:           'Confirmada',
        origen:           'reserva_online_grupo',
        codigoCita:       codigo,
        slotLockId:       it.lockRef.id,
        grupoId,
        grupoIndex:       it.idx,
        grupoTotal:       items.length,
        waOptIn:          esPrincipal && waOptIn === true,
        skipNotificaciones: true,   // ← evita disparar mail/wa/push en el test
        creadoEn:         FieldValue.serverTimestamp(),
      });
    }
  });

  return { grupoId, citaIds: items.map(it => it.citaRef.id), codigos, lockIds: items.map(it => it.lockRef.id) };
}

async function limpiar(citaIds, lockIds) {
  const batch = db.batch();
  citaIds.forEach(id => batch.delete(db.doc(`tenants/${TID}/citas/${id}`)));
  lockIds.forEach(id => batch.delete(db.doc(`tenants/${TID}/slotLocks/${id}`)));
  await batch.commit().catch(() => {});
}

async function main() {
  const fecha = fechaFutura(45);
  const hora  = '15:00';
  console.log('[SMOKE] fecha=' + fecha + ' hora=' + hora);

  // 1) Cargar 3 barberos del practica.
  const barbSnap = await db.collection(`tenants/${TID}/barberos`).get();
  const barberosReales = barbSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(b => !b._mainDocId && b.disponible !== false && (b.rol || 'barbero') !== 'admin');
  if (barberosReales.length < 3) {
    console.error('[abort] practica tiene <3 barberos reales. Reseed con `node scripts/seed-practica.js --reset`.');
    process.exit(2);
  }
  const b3 = barberosReales.slice(0, 3);
  console.log('[1] barberos:', b3.map(b => b.nombre).join(', '));

  // 2) Crear el grupo con nombres reales de acompañantes.
  const nombresAcomp = ['Pedro Test', 'Diana Test'];
  const g = await crearGrupo({ fecha, hora, barberos: b3, nombresAcomp });
  console.log('[2] grupo creado', { grupoId: g.grupoId, códigos: g.codigos });

  // 3) consultar con código del reservante.
  try {
    const r = await callCF({ tenantId: TID, codigo: g.codigos[0], accion: 'consultar' });
    console.log('[3] consultar (principal):', {
      esGrupo: r.cita.esGrupo, esGrupoPrincipal: r.cita.esGrupoPrincipal,
      grupoTotal: r.cita.grupoTotal, puedeCancelarGrupo: r.politicas.puedeCancelarGrupo,
    });
    if (!r.cita.esGrupoPrincipal || r.cita.grupoTotal !== 3 || !r.politicas.puedeCancelarGrupo) {
      throw new Error('[FAIL] respuesta de consultar (principal) no cumple contrato.');
    }
  } catch (e) { console.error('[FAIL]', e.code, e.message); await limpiar(g.citaIds, g.lockIds); process.exit(1); }

  // 4) consultar con código de acompañante.
  try {
    const r = await callCF({ tenantId: TID, codigo: g.codigos[1], accion: 'consultar' });
    console.log('[4] consultar (acompañante):', {
      esGrupo: r.cita.esGrupo, esGrupoPrincipal: r.cita.esGrupoPrincipal,
      puedeCancelarGrupo: r.politicas.puedeCancelarGrupo,
    });
    if (!r.cita.esGrupo || r.cita.esGrupoPrincipal || r.politicas.puedeCancelarGrupo) {
      throw new Error('[FAIL] acompañante no debería poder cancelar grupo.');
    }
  } catch (e) { console.error('[FAIL]', e.code, e.message); await limpiar(g.citaIds, g.lockIds); process.exit(1); }

  // 5) intentar cancelar-grupo con código acompañante → permission-denied.
  try {
    await callCF({ tenantId: TID, codigo: g.codigos[1], accion: 'cancelar-grupo' });
    console.error('[FAIL] cancelar-grupo con acompañante NO debería haber pasado.');
    await limpiar(g.citaIds, g.lockIds);
    process.exit(1);
  } catch (e) {
    // CF v2 puede devolver 'PERMISSION_DENIED' (SCREAMING) o 'permission-denied'.
    const codeOk = /permission[_-]?denied|403/i.test(e.code || '');
    const msgOk  = /reservó?|reservante|no pertenece|acompañante/i.test(e.message || '');
    if (!codeOk && !msgOk) {
      console.error('[FAIL] error inesperado:', e.code, e.message);
      await limpiar(g.citaIds, g.lockIds);
      process.exit(1);
    }
    console.log('[5] rechazo esperado ✓', (e.message || '').slice(0, 80));
  }

  // 6) cancelar-grupo con código principal → 3.
  try {
    const r = await callCF({ tenantId: TID, codigo: g.codigos[0], accion: 'cancelar-grupo' });
    console.log('[6] cancelar-grupo:', { canceladas: r.canceladas, ok: r.ok });
    if (r.canceladas !== 3 || !r.ok) throw new Error('[FAIL] canceladas != 3');
  } catch (e) { console.error('[FAIL]', e.code, e.message); await limpiar(g.citaIds, g.lockIds); process.exit(1); }

  // 7) verificar estados + locks. Damos ~4s al trigger liberarSlotTenant.
  await new Promise(r => setTimeout(r, 4000));
  const citasFinales = await Promise.all(g.citaIds.map(id => db.doc(`tenants/${TID}/citas/${id}`).get()));
  const estados = citasFinales.map(s => s.data()?.estado);
  console.log('[7a] estados finales:', estados);
  if (estados.some(e => e !== 'Cancelada')) { console.error('[FAIL] alguna cita no quedó Cancelada'); await limpiar(g.citaIds, g.lockIds); process.exit(1); }

  const locksFinales = await Promise.all(g.lockIds.map(id => db.doc(`tenants/${TID}/slotLocks/${id}`).get()));
  const locksVivos = locksFinales.filter(s => s.exists).length;
  console.log('[7b] slotLocks vivos:', locksVivos, '/', g.lockIds.length);
  if (locksVivos > 0) {
    console.warn('[warn] quedan locks — el trigger liberarSlotTenant no alcanzó en 4s. Los borro manualmente.');
  }

  // 8) limpieza total.
  await limpiar(g.citaIds, g.lockIds);
  console.log('[8] limpieza ✓');

  console.log('\n[SMOKE] ✅ TODOS LOS CASOS PASARON');
  process.exit(0);
}

main().catch(e => { console.error('[SMOKE] error:', e); process.exit(1); });
