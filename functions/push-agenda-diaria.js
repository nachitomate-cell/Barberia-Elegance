'use strict';

// functions/push-agenda-diaria.js
// ─────────────────────────────────────────────────────────────────
//  PUSH DIARIOS AL PROFESIONAL (agenda.html) — todos los locales
//
//  1) RESUMEN DE MI DÍA — cron 08:30 Santiago. A cada barbero CON citas
//     hoy: cuántas son, primera y última hora. Quien no tiene citas no
//     recibe nada (cero ruido).
//
//  2) CITAS DE HOY SIN CERRAR — cron 21:00 Santiago. Solo a quien tiene
//     citas del día en pie (Pendiente/Confirmada, mismo criterio que el
//     banner por-cerrar de agenda.html) cuya hora de término ya pasó.
//     Complementa el recordatorio masivo de los viernes: este es diario
//     y DIRIGIDO — sin pendientes, sin push.
//
//  Ambos excluyen citas QA (origenQA) y barberos fantasma (esQA), y
//  calculan "hoy" en America/Santiago (a las 21:00 Chile ya es mañana
//  en UTC — usar new Date() acá rompería la fecha).
//
//  Piloto delnero 2026-08-02 → rollout general 2026-08-03 (todos los
//  tenants vía listaTenants, elegance raíz incluido).
//
//  DEPLOY:
//    firebase deploy --only functions:pushResumenDia,functions:pushCierreDiario
// ─────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { writeNotifLog } = require('./lib/notif-log');
const {
  TIMEZONE, hoySantiago, minutosAhoraSantiago, listaTenants,
  mapaBarberos, tokensActivos, tokensDeBarbero, enviarPushStaff,
} = require('./lib/push-staff');

const db = admin.firestore();

// Mismo criterio que el banner por-cerrar de agenda.html.
const EN_PIE = ['Confirmada', 'Pendiente'];

async function citasDeHoy(root) {
  const snap = await db.collection(`${root}citas`)
    .where('fecha', '==', hoySantiago()).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => !c.origenQA);
}

function agruparPorBarbero(citas) {
  const porBarbero = new Map();
  for (const c of citas) {
    if (!c.barberoId) continue;
    if (!porBarbero.has(c.barberoId)) porBarbero.set(c.barberoId, []);
    porBarbero.get(c.barberoId).push(c);
  }
  return porBarbero;
}

/** ¿La cita ya terminó? (hora + duración vs reloj Santiago) — copia del criterio de agenda.html. */
function citaYaTermino(c, minutosAhora) {
  const [hh, mm] = String(c.hora || '00:00').split(':').map(Number);
  const dur = parseInt(c.duracionServicio || c.duracion || 30, 10);
  return (hh * 60 + (mm || 0)) + (isNaN(dur) ? 30 : dur) <= minutosAhora;
}

async function enviarPorBarbero({ root, tid, porBarbero, arma, tipo, dryRun }) {
  const [mapa, porUid] = await Promise.all([mapaBarberos(root), tokensActivos(root)]);
  const resumen = [];
  for (const [barberoId, citas] of porBarbero) {
    const entry = mapa.get(barberoId);
    if (!entry) continue; // barbero QA o borrado
    const { title, body } = arma(entry, citas);
    if (dryRun) { resumen.push({ barbero: entry.nombre, citas: citas.length, title, body, dryRun: true }); continue; }

    const tokens = tokensDeBarbero(entry, porUid);
    if (!tokens.length) { resumen.push({ barbero: entry.nombre, citas: citas.length, enviados: 0, sinTokens: true }); continue; }

    const link = `/agenda/${barberoId}`;
    const r = await enviarPushStaff({ tokens, title, body, link, tag: `${tipo}-${tid}-${barberoId}` });
    await writeNotifLog(db, {
      tenantId: tid, type: tipo, channel: 'push',
      status: r.successCount ? 'sent' : 'failed',
      to: { nombre: entry.nombre },
      meta: { citas: String(citas.length) },
    });
    resumen.push({ barbero: entry.nombre, citas: citas.length, enviados: r.successCount });
  }
  return resumen;
}

// ═══ 1) RESUMEN DE MI DÍA (08:30) ═══════════════════════════════════

async function resumenDia({ dryRun = false } = {}) {
  const out = [];
  for (const { id: tid, root } of await listaTenants()) {
    try {
    const citas = (await citasDeHoy(root)).filter(c => EN_PIE.includes(c.estado));
    if (!citas.length) continue;
    const porBarbero = agruparPorBarbero(citas);
    porBarbero.forEach(l => l.sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || ''))));

    const r = await enviarPorBarbero({
      root, tid, porBarbero, tipo: 'push_resumen_dia', dryRun,
      arma: (entry, lista) => {
        const n = lista.length;
        const primera = lista[0]?.hora || '';
        const ultima  = lista[n - 1]?.hora || '';
        return {
          title: `📅 Hoy tienes ${n} cita${n === 1 ? '' : 's'}`,
          body: n === 1
            ? `A las ${primera}. ¡Buen día!`
            : `La primera a las ${primera} y la última a las ${ultima}. ¡Buen día!`,
        };
      },
    });
    logger.info(`[resumen-dia] ${tid}: ${JSON.stringify(r)}`);
    out.push({ tid, barberos: r });
    // Un tenant con datos raros no puede frenar al resto.
    } catch (e) { logger.error(`[resumen-dia] ${tid}:`, e.message); out.push({ tid, error: e.message }); }
  }
  return out;
}

exports.pushResumenDia = onSchedule(
  { schedule: '30 8 * * *', timeZone: TIMEZONE, region: 'us-central1', timeoutSeconds: 300 },
  async () => {
    try { await resumenDia(); }
    catch (e) { logger.error('[resumen-dia]', e.message); throw e; }
  },
);

// ═══ 2) CITAS DE HOY SIN CERRAR (21:00) ═════════════════════════════

async function cierreDiario({ dryRun = false } = {}) {
  const ahora = minutosAhoraSantiago();
  const out = [];
  for (const { id: tid, root } of await listaTenants()) {
    try {
    const sinCerrar = (await citasDeHoy(root))
      .filter(c => EN_PIE.includes(c.estado) && citaYaTermino(c, ahora));
    if (!sinCerrar.length) continue;
    const porBarbero = agruparPorBarbero(sinCerrar);

    const r = await enviarPorBarbero({
      root, tid, porBarbero, tipo: 'push_cierre_dia', dryRun,
      arma: (entry, lista) => {
        const n = lista.length;
        return {
          title: `⏰ Tienes ${n} cita${n === 1 ? '' : 's'} de hoy sin cerrar`,
          body: 'Márcalas como completadas: cada cierre suma el sello del cliente y tu comisión.',
        };
      },
    });
    logger.info(`[cierre-dia] ${tid}: ${JSON.stringify(r)}`);
    out.push({ tid, barberos: r });
    // Un tenant con datos raros no puede frenar al resto.
    } catch (e) { logger.error(`[cierre-dia] ${tid}:`, e.message); out.push({ tid, error: e.message }); }
  }
  return out;
}

exports.pushCierreDiario = onSchedule(
  { schedule: '0 21 * * *', timeZone: TIMEZONE, region: 'us-central1', timeoutSeconds: 300 },
  async () => {
    try { await cierreDiario(); }
    catch (e) { logger.error('[cierre-dia]', e.message); throw e; }
  },
);

// Núcleos expuestos para pruebas locales (scripts one-off, no producción).
exports._test = { resumenDia, cierreDiario };
