'use strict';

// functions/auditar-slotlocks-daily.js
// ─────────────────────────────────────────────────────────────────────────────
//  GUARDIÁN DIARIO DEL ESPEJO DE OCUPACIÓN (slotLocks)
//
//  La reserva pública NO puede leer /citas (requiere auth): lee `slotLocks`,
//  un espejo público. Cuando el espejo y la realidad se separan, cada vista
//  tiene razón sobre su propia fuente y el desacuerdo es INVISIBLE hasta que
//  un cliente se queja. Ya pasó dos veces:
//
//    · jul-2026 — "Bloqueo rango" creaba N candados y al desbloquear borraba
//      solo uno. 19 candados huérfanos en 4 locales.
//    · jul-2026 — el trigger liberarSlot* soltaba el candado al CANCELAR pero
//      se rendía si la cita se BORRABA. 33 candados huérfanos en 7 locales;
//      uno le tapó el 13:00 a un barbero de infinity por días.
//
//  Las dos veces el arreglo fue de raíz, y las dos veces el daño ya estaba
//  hecho y nadie lo vio hasta que alguien reclamó. Esto es la red de abajo:
//  corre todos los días, repara lo que puede y avisa lo que no.
//
//  DOS DIRECCIONES, TRATO DISTINTO A PROPÓSITO:
//
//    A) candado SIN respaldo (no hay cita viva ni bloqueo que lo cubra)
//       → SE BORRA SOLO. Es basura inequívoca y cada hora que sobrevive le
//         cuesta reservas al local. Repararlo no puede romper nada: la hora
//         estaba libre en la agenda del local de todas formas.
//
//    B) cita SIN candado (riesgo de doble reserva)
//       → SOLO SE AVISA, no se crea el candado. Crear uno de más bloquea una
//         hora que quizás sí está libre, y eso le cuesta plata al local. Ante
//         la duda, molestar a un humano antes que decidir por él.
//
//  DEPLOY:
//    firebase deploy --only functions:auditarSlotLocksDaily
// ─────────────────────────────────────────────────────────────────────────────

const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');
const { dispatchAdminPush } = require('./admin-push');

const db = admin.firestore();

const TIMEZONE   = 'America/Santiago';
const DIAS       = 30;    // ventana hacia adelante; el pasado ya no se reserva
const BODY_LIMIT = 240;

function hoySantiago() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());   // en-CA da YYYY-MM-DD
}

function sumarDias(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}

const aMin = (t) => {
  const [h, m] = String(t || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Audita un tenant. Devuelve { huerfanos: [refs], sinCandado: [desc] }.
 * Misma lógica de solape que scripts/auditar-slotlocks.js — si una cambia, la
 * otra tiene que cambiar igual.
 */
async function auditarTenant(tid, desde, hasta) {
  const col = (n) => db.collection(`tenants/${tid}/${n}`);
  // Rango sobre un solo campo: no necesita índice compuesto.
  const [citasSnap, locksSnap, bloqSnap] = await Promise.all([
    col('citas').where('fecha', '>=', desde).where('fecha', '<=', hasta).get(),
    col('slotLocks').where('fecha', '>=', desde).where('fecha', '<=', hasta).get(),
    col('bloqueos').where('fecha', '>=', desde).where('fecha', '<=', hasta).get(),
  ]);

  const citas = citasSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(c => String(c.estado || '').toLowerCase() !== 'cancelada');
  const locks = locksSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
  const bloq  = bloqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const huerfanos = [];
  for (const l of locks) {
    const porCita = citas.some(c => {
      if (String(c.barberoId) !== String(l.barberoId)) return false;
      if (c.fecha !== l.fecha) return false;
      const ini = aMin(c.hora);
      const fin = ini + (Number(c.duracion || c.duracionServicio) || 30);
      const lm  = aMin(l.hora);
      return lm >= ini && lm < fin;
    });
    const porBloq = bloq.some(b => {
      if (b.fecha !== l.fecha) return false;
      if (b.barberoId && String(b.barberoId) !== String(l.barberoId)) return false;
      if (b.todo_el_dia) return true;
      if (!b.hora_inicio || !b.hora_fin) return false;
      const lm = aMin(l.hora);
      return lm >= aMin(b.hora_inicio) && lm < aMin(b.hora_fin);
    });
    if (!porCita && !porBloq) huerfanos.push(l);
  }

  const sinCandado = [];
  for (const c of citas) {
    // El sobrecupo NO lleva candado por regla (slotLockId: null).
    if (!c.barberoId || c.sobrecupo === true) continue;
    const tiene = locks.some(l =>
      String(l.barberoId) === String(c.barberoId) && l.fecha === c.fecha && l.hora === c.hora);
    if (!tiene) sinCandado.push(`${c.fecha} ${c.hora} · ${c.clienteNombre || 's/n'}`);
  }

  return { huerfanos, sinCandado };
}

// Se exporta para poder probar la detección sin esperar al cron ni desplegar.
// Ver scripts/test-auditor-slotlocks.js.
exports._auditarTenant = auditarTenant;

exports.auditarSlotLocksDaily = onSchedule(
  // 05:00: antes de que abra cualquier local, así el espejo llega sano al día.
  { schedule: '0 5 * * *', timeZone: TIMEZONE, region: 'us-central1' },
  async () => {
    const desde = hoySantiago();
    const hasta = sumarDias(desde, DIAS);

    // listDocuments(): los docs padre de /tenants no existen y un .get() se
    // saltaría casi todos los tenants.
    const tenants = (await db.collection('tenants').listDocuments()).map(t => t.id);

    let reparados = 0;
    const conProblema = [];
    const avisos = [];

    for (const tid of tenants) {
      let r;
      try {
        r = await auditarTenant(tid, desde, hasta);
      } catch (e) {
        logger.warn(`[SlotLocks] ${tid}: no se pudo auditar: ${e.message}`);
        continue;
      }

      // A) reparar
      if (r.huerfanos.length) {
        let batch = db.batch(), ops = 0;
        for (const l of r.huerfanos) {
          batch.delete(l.ref);
          if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
        }
        if (ops) await batch.commit();
        reparados += r.huerfanos.length;
        conProblema.push(`${tid}: ${r.huerfanos.length} candado(s) liberados`);
        logger.info(`[SlotLocks] ${tid}: ${r.huerfanos.length} huérfanos borrados`,
          { horas: r.huerfanos.map(l => `${l.fecha} ${l.hora}`).slice(0, 20) });
      }

      // B) avisar, no tocar
      if (r.sinCandado.length) {
        avisos.push(`${tid}: ${r.sinCandado.length} cita(s) sin candado`);
        logger.warn(`[SlotLocks] ${tid}: citas SIN candado (riesgo de doble reserva)`,
          { citas: r.sinCandado.slice(0, 20) });
      }
    }

    if (!reparados && !avisos.length) {
      logger.info(`[SlotLocks] espejo sano en ${tenants.length} tenants (${desde} → ${hasta})`);
      return null;   // silencio: no se molesta a nadie si está todo bien
    }

    const partes = [];
    if (reparados)      partes.push(`${reparados} candado(s) huérfanos liberados`);
    if (avisos.length)  partes.push(`${avisos.length} local(es) con citas sin candado`);
    let body = [...conProblema, ...avisos].join(' · ');
    if (body.length > BODY_LIMIT) body = partes.join(' · ');

    try {
      await dispatchAdminPush(db, admin.messaging(), {
        title: '🔒 Espejo de horas: revisado',
        body,
        url: '/admin/',
        tag: 'slotlocks-audit-daily',
        data: {
          tipo: 'slotlocks_audit',
          reparados: String(reparados),
          detalle: [...conProblema, ...avisos].join('\n'),
        },
      });
    } catch (e) {
      // No se relanza: si el push falla, el Scheduler no debe re-encolar una
      // auditoría que YA reparó (borraría dos veces y avisaría de nuevo).
      logger.error('[SlotLocks] no se pudo notificar al superadmin:', e.message);
    }
    return null;
  },
);
