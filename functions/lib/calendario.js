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
//  Uso:  const { lineasCalendario } = require('./lib/calendario');
//        ...lineasCalendario(fechaHoy)   // 2 strings para el bloque variable
// ─────────────────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** { fecha:'YYYY-MM-DD', dia:'lunes' } para fechaStr + plusDias (aritmética en UTC, sin líos de TZ). */
function conDiaSemana(fechaStr, plusDias = 0) {
  const [y, m, d] = String(fechaStr).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + plusDias));
  return { fecha: t.toISOString().slice(0, 10), dia: DIAS_SEMANA[t.getUTCDay()] };
}

/** Las 2 líneas estándar del bloque variable: hoy + tabla de los próximos 7 días. */
function lineasCalendario(fechaHoy) {
  const hoy = conDiaSemana(fechaHoy);
  const tabla = [];
  for (let i = 1; i <= 7; i++) {
    const x = conDiaSemana(fechaHoy, i);
    tabla.push(`${x.dia} ${x.fecha}`);
  }
  return [
    `Hoy es ${hoy.dia} ${hoy.fecha} (hora de Chile).`,
    `Calendario de los próximos días — usa SIEMPRE esta tabla y JAMÁS calcules tú qué día de la semana cae una fecha: mañana ${tabla[0]} · ${tabla.slice(1).join(' · ')}.`,
  ];
}

module.exports = { DIAS_SEMANA, conDiaSemana, lineasCalendario };
