'use strict';

// functions/lib/calendario.js
// ─────────────────────────────────────────────────────────────────────────────
//  CALENDARIO MASTICADO PARA LOS PROMPTS DE TODOS LOS AGENTES.
//
//  Regla de la casa (02-08-2026): a un LLM JAMÁS se le deja calcular qué día
//  de la semana cae una fecha — son notoriamente malos en eso. El bot de
//  kronnos_penablanca bautizó al lunes 3 de agosto como "domingo", le aplicó
//  el horario dominical y le negó al cliente una hora de las 10:30 que SÍ
//  existía. Todo prompt que hable de fechas incluye estas líneas.
//
//  La HORA es parte de la misma regla (03-08-2026): tampoco se le deja
//  deducirla. El bot de los locales solo recibía la fecha, así que a las 10:07
//  —con el local recién por abrir— le dijo a un cliente que pedía hora "para
//  ahora" que "la mañana de hoy ya pasó" y le ofreció solo las 16:45 en
//  adelante. Sin saber qué hora es, el modelo la inventa a partir de los slots
//  que le devuelven las herramientas, y descarta en silencio los de más
//  temprano creyendo que ya pasaron.
//
//  Uso:  const { lineasCalendario } = require('./lib/calendario');
//        ...lineasCalendario(fechaHoy, horaHHMM)   // líneas del bloque variable
// ─────────────────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** { fecha:'YYYY-MM-DD', dia:'lunes', hablada:'lunes 3 de agosto' } para
 *  fechaStr + plusDias (aritmética en UTC, sin líos de TZ). */
function conDiaSemana(fechaStr, plusDias = 0) {
  const [y, m, d] = String(fechaStr).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + plusDias));
  const dia = DIAS_SEMANA[t.getUTCDay()];
  return {
    fecha:   t.toISOString().slice(0, 10),
    dia,
    hablada: `${dia} ${t.getUTCDate()} de ${MESES[t.getUTCMonth()]}`,
  };
}

/** Líneas estándar del bloque variable: hoy + tabla de los próximos 7 días, y
 *  —si se pasa `horaHHMM`— la hora actual con la prohibición de deducirla.
 *  @param {string} fechaHoy YYYY-MM-DD en Chile.
 *  @param {string} [horaHHMM] HH:MM en Chile. Omitirla deja el prompt sin hora:
 *    solo para agentes que no hablan de horas del día. */
function lineasCalendario(fechaHoy, horaHHMM) {
  const hoy = conDiaSemana(fechaHoy);
  const tabla = [];
  for (let i = 1; i <= 7; i++) {
    const x = conDiaSemana(fechaHoy, i);
    // Cada fila trae la fecha ISO Y la forma hablada ya armada. Con solo la ISO
    // el modelo componía él mismo el "4 de agosto" y se equivocaba de día
    // ("miércoles 4 de agosto" cuando el 4 era martes, 03-08): copiar no falla,
    // calcular sí.
    tabla.push(`${x.fecha} = ${x.hablada}`);
  }
  const lineas = [
    `Hoy es ${hoy.hablada} (${hoy.fecha}), hora de Chile.`,
    `Calendario de los próximos días — usa SIEMPRE esta tabla y JAMÁS calcules tú el día de la semana ni la escribas de memoria; COPIA la forma hablada tal cual: mañana ${tabla[0]} · ${tabla.slice(1).join(' · ')}.`,
  ];
  if (/^\d{2}:\d{2}$/.test(String(horaHHMM || ''))) {
    lineas.push(
      `AHORA son las ${horaHHMM} en Chile. Esta es la única hora válida: JAMÁS deduzcas qué hora es a partir de las horas libres que te devuelven las herramientas.`,
    );
  }
  return lineas;
}

module.exports = { DIAS_SEMANA, conDiaSemana, lineasCalendario };
