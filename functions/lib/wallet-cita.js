'use strict';

// functions/lib/wallet-cita.js
// ─────────────────────────────────────────────────────────────────
//  PRÓXIMA CITA EN EL PASE DE FIDELIDAD
//
//  Sin esto la tarjeta solo sirve en el mesón: el cliente la abre
//  cuando va a pagar y nunca más. Con la próxima cita adentro pasa a
//  ser algo que mira ENTRE visitas — y de paso el local ahorra un
//  recordatorio por WhatsApp.
//
//  Regla dura: el pase NO puede mentir. Una cita cancelada o
//  reagendada que queda pegada en la tarjeta es peor que no mostrar
//  nada, porque el cliente se guía por ella y llega a la hora
//  equivocada. Por eso `leerProximaCita` devuelve null explícito y
//  todos los que la pintan tienen que BORRAR el campo con ese null
//  (en Google un PATCH sin el campo lo deja intacto — mismo gotcha
//  que el barcode de staff).
//
//  Fecha en America/Santiago, no en UTC: las CFs corren en us-central1
//  y de noche allá ya es "mañana", lo que haría desaparecer la cita de
//  hoy antes de tiempo. Se reusa el helper de push-staff.js.
// ─────────────────────────────────────────────────────────────────

const admin = require('firebase-admin');
const { hoySantiago, rootDe } = require('./push-staff');

const db = admin.firestore();

// Único estado que representa una cita que todavía va a ocurrir.
// 'Completada' ya pasó; 'Cancelada' y 'NoAsistio' no van a ocurrir.
const ESTADO_VIGENTE = 'Confirmada';

const DIAS  = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const citasCol = (tenantId) => db.collection(`${rootDe(tenantId)}citas`);

/**
 * Próxima cita futura del cliente, o null si no tiene ninguna.
 *
 * Usa el índice compuesto que ya existe (clienteUid + estado + fecha).
 * No ordena por `hora` en la consulta a propósito: eso pediría un índice
 * nuevo y basta con traer las primeras del día y ordenarlas acá.
 *
 * @returns {{fecha:string, hora:string, servicio:string, profesional:string}|null}
 */
async function leerProximaCita(tenantId, uid) {
  if (!uid) return null;
  try {
    const snap = await citasCol(tenantId)
      .where('clienteUid', '==', uid)
      .where('estado', '==', ESTADO_VIGENTE)
      .where('fecha', '>=', hoySantiago())
      .orderBy('fecha', 'asc')
      .limit(5)
      .get();
    if (snap.empty) return null;

    const citas = snap.docs
      .map((d) => {
        const c = d.data() || {};
        return {
          fecha:       String(c.fecha || ''),
          hora:        String(c.hora || ''),
          servicio:    String(c.servicioNombre || '').slice(0, 60),
          profesional: String(c.barbero || '').slice(0, 40),
        };
      })
      .filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.fecha))
      // El índice ordena por fecha; dentro del mismo día desempata la hora.
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

    return citas[0] || null;
  } catch (e) {
    // Nunca romper la emisión del pase por no poder leer la agenda: sin
    // cita el pase sale igual, solo que sin ese campo.
    console.warn(`[wallet-cita] ${tenantId}/${uid}: ${e.message}`);
    return null;
  }
}

/** '2026-08-15' + '15:00' → '15 ago · 15:00' (cabe en el frente del pase). */
function citaCorta(cita) {
  if (!cita || !cita.fecha) return null;
  const [, mm, dd] = cita.fecha.split('-');
  const mes = MESES[Number(mm) - 1] || '';
  const dia = String(Number(dd));
  return cita.hora ? `${dia} ${mes} · ${cita.hora}` : `${dia} ${mes}`;
}

/** Texto largo para el reverso del pase / detalle de Google. */
function citaLarga(cita) {
  if (!cita || !cita.fecha) return null;
  const [yyyy, mm, dd] = cita.fecha.split('-').map(Number);
  // Mediodía UTC evita que el desfase horario corra el día al calcular
  // el nombre del día de la semana.
  const d = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
  const diaSemana = DIAS[d.getUTCDay()] || '';
  const mes = MESES[mm - 1] || '';
  let txt = `${diaSemana} ${Number(dd)} de ${mes}`;
  if (cita.hora)        txt += ` a las ${cita.hora}`;
  if (cita.servicio)    txt += `\n${cita.servicio}`;
  if (cita.profesional) txt += ` · con ${cita.profesional}`;
  return txt;
}

module.exports = {
  ESTADO_VIGENTE,
  leerProximaCita,
  citaCorta,
  citaLarga,
};
