'use strict';

// functions/lib/bot-negocio.js
// Lo que el asistente de WhatsApp HIZO por el local, DERIVADO de las citas.
//
// ─────────────────────────── Por qué existe ───────────────────────────
// Hasta ahora estos números salían de `_metrics/bot_{tid}_{YYYY-MM}`, un
// contador que `logBotNegocio()` incrementa a mano en el momento del hecho,
// con `.catch(() => {})`. Un contador así no se puede reparar ni auditar:
//
//   · Si la escritura falla (cuota, red, función que muere antes), el evento
//     se pierde para siempre y nadie se entera — el catch se lo traga.
//   · Si el handler se reintenta, cuenta dos veces.
//   · Si la cita se borra desde el panel, el contador se queda arriba.
//   · Todo lo anterior a que se instrumentara el evento vale cero.
//
// El 02-08-2026 el contador estaba así en producción: delnero 2 citas reales
// del bot / contador en 0 · renacer 1 / 0 · kronnos_limache 2 / 3 · sion 0 / 1.
// Drift en LAS DOS direcciones. Y ese mismo número alimenta la comisión por
// cita del modelo híbrido, o sea que un contador roto factura mal.
//
// La cita es la fuente de la verdad y guarda su propia huella:
//
//   origen: 'wa_bot'          → la creó el asistente
//   reagendadaVia: 'wa_bot'   → el asistente la movió en vez de dejarla caer
//   canceladaVia: 'wa_bot'    → el cliente la canceló conversando con el bot
//   waClienteConfirmoEn       → respondió CONFIRMAR a la confirmación
//   waClienteCanceloEn        → avisó que no venía
//
// Derivar de ahí es idempotente, retroactivo y auditable: el número siempre
// cuadra con las citas que el dueño ve en su agenda. Misma lógica que
// [[feedback_listas_espejo]] — se derivan, nunca se copian.
//
// `logBotNegocio()` se sigue escribiendo (ops mira su historial y el trigger de
// alerta-gasto-ia escucha /_metrics), pero YA NO manda en ninguna pantalla.
//
// Excepción consciente: `optout` (bajas) NO se deriva. Vive en la colección
// global `wa_optout`, indexada por teléfono y sin tenant ni mes, así que el
// contador es su única fuente per-tenant. Es un número lateral —no factura ni
// encabeza ninguna tarjeta— y se lee tal cual desde el contador.

const admin = require('firebase-admin');
const { logger } = require('firebase-functions/v2');

const db = admin.firestore();

/** elegance tiene la agenda en la RAÍZ; el resto bajo tenants/{tid}. */
const citasCol = (tid) =>
  (tid === 'elegance' ? db.collection('citas') : db.collection(`tenants/${tid}/citas`));

/** Una cita que no va a pasar: no suma dinero ni cuenta como reserva viva. */
const caida = (c) => c.estado === 'Cancelada' || c.estado === 'NoAsistio';

/** Último día REAL del mes 'YYYY-MM' (un 31 fijo se come febrero entero). */
function finDeMes(mes) {
  const [y, m] = String(mes).split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/* El mismo asistente atiende por dos canales y las dos marcas cuentan igual.
   `wa_bot` es lo que escribía cuando WhatsApp era el único; `ig_bot` apareció
   con los mensajes directos de Instagram. Si esta lista se queda corta, lo que
   agenda el bot por el canal nuevo NO aparece en la tarjeta de valor del local
   —o sea, se lo cobramos y no se lo mostramos. */
const CANALES_BOT = ['wa_bot', 'ig_bot'];
const esDelBot = (v) => CANALES_BOT.includes(v);

const VACIO_MES = {
  agendadas: 0, agendadasVivas: 0, reubicadas: 0, canceladas: 0,
  confSi: 0, confNo: 0, dineroAgendado: 0, dineroSalvado: 0,
};

/**
 * Lo que el bot hizo en un mes, de una sola lectura de la agenda de ese mes.
 *
 * La ventana va por `fecha` (cuándo OCURRE la cita), no por cuándo se creó:
 * es el mes en que la plata entra a la caja, y así el conteo y el monto salen
 * del MISMO conjunto de citas. Con dos denominadores distintos la tarjeta
 * llegaba a decir "$180.000 en 0 citas".
 *
 * Devuelve `ok:false` si la lectura falló, para que la vista pueda distinguir
 * "se cayó" de "no hubo actividad" — un módulo roto que se muestra como cero
 * no lo reporta nadie.
 */
async function negocioDelMes(tid, mes) {
  try {
    const snap = await citasCol(tid)
      .where('fecha', '>=', `${mes}-01`)
      .where('fecha', '<=', finDeMes(mes))
      .get();

    const r = { ...VACIO_MES, ok: true };
    snap.forEach((d) => {
      const c = d.data() || {};
      const muerta = caida(c);
      const delBot = esDelBot(c.origen);
      const movida = esDelBot(c.reagendadaVia);

      if (delBot) { r.agendadas++; if (!muerta) r.agendadasVivas++; }
      if (movida) r.reubicadas++;
      if (esDelBot(c.canceladaVia)) r.canceladas++;
      if (c.waClienteConfirmoEn) r.confSi++;
      if (c.waClienteCanceloEn)  r.confNo++;

      // En pesos solo lo que de verdad entra: sin canceladas y sin cortesías.
      // Cobrarse en el discurso lo que no entró a la caja destruye la confianza
      // en el número, que es lo único que sostiene la renovación.
      if (muerta || c.cortesia === true) return;
      const monto = Number(c.precio) || 0;
      if (delBot) r.dineroAgendado += monto;
      if (movida) r.dineroSalvado  += monto;
    });
    return r;
  } catch (e) {
    logger.warn(`[bot-negocio] mes ${tid} ${mes}: ${e.message}`);
    return { ...VACIO_MES, ok: false };
  }
}

/**
 * Acumulado de SIEMPRE — el argumento de retención ("desde que trabaja
 * contigo…"). Se resuelve con count(), que cobra 1 lectura por cada 1.000
 * documentos contados: cinco agregaciones salen prácticamente gratis y no
 * dependen del tamaño de la agenda.
 *
 * Todas usan índices de un solo campo (automáticos): ninguna necesita índice
 * compuesto, así que esto no puede romperse por un deploy de índices. Los
 * `orderBy` sobre los timestamps son a propósito: Firestore excluye los docs
 * que no tienen el campo, que es justo el filtro que se busca.
 */
async function negocioHistorico(tid) {
  const col = citasCol(tid);
  // `in` y no `==`: el asistente marca `wa_bot` o `ig_bot` según por dónde le
  // hablaron, y las dos son él. Sigue siendo un índice de un solo campo.
  const consultas = [
    ['agendadas',  col.where('origen', 'in', CANALES_BOT)],
    ['reubicadas', col.where('reagendadaVia', 'in', CANALES_BOT)],
    ['canceladas', col.where('canceladaVia', 'in', CANALES_BOT)],
    ['confSi',     col.orderBy('waClienteConfirmoEn')],
    ['confNo',     col.orderBy('waClienteCanceloEn')],
  ];

  const out = { agendadas: 0, reubicadas: 0, canceladas: 0, confSi: 0, confNo: 0, ok: true };
  await Promise.all(consultas.map(async ([clave, q]) => {
    try {
      out[clave] = (await q.count().get()).data().count || 0;
    } catch (e) {
      out.ok = false;
      logger.warn(`[bot-negocio] histórico ${tid}.${clave}: ${e.message}`);
    }
  }));
  return out;
}

module.exports = { negocioDelMes, negocioHistorico, _citasCol: citasCol, _finDeMes: finDeMes };
