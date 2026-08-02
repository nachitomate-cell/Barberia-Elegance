'use strict';

// functions/lib/texto-ilegible.js
// ─────────────────────────────────────────────────────────────────────────────
//  ¿Esto lo escribió una persona o un bolsillo?
//
//  Caso real (02-08-2026, agente de ventas): un lead mandó tres mensajes tipo
//  "Vccxfgttu2ugfhfmdqrufddjxdfhhgv…" y el bot contestó las tres veces con
//  toda la paciencia del mundo — gastando 3 de sus 12 respuestas del día, 3
//  salientes del número y 3 llamadas a Claude, en un teléfono en el bolsillo.
//
//  Heurística deliberadamente CONSERVADORA: es peor callar a un cliente real
//  que responderle a un bolsillo. Solo juzga mensajes largos, y por dos
//  señales muy marcadas — una "palabra" kilométrica sin espacios, o una
//  proporción de vocales imposible para el español (lo normal ronda 40-45%).
//  Verificado contra los 3 mensajes reales + 9 mensajes legítimos: 12/12.
// ─────────────────────────────────────────────────────────────────────────────

/** true si el texto parece tecleo al azar (no se juzgan mensajes cortos). */
function pareceIlegible(texto) {
  const t = String(texto || '').trim();
  if (t.length < 14) return false;
  if (t.split(/\s+/).some(p => p.length > 16)) return true;
  const letras = t.replace(/[^a-záéíóúüñ]/gi, '');
  if (letras.length < 14) return false;
  const vocales = (letras.match(/[aeiouáéíóúü]/gi) || []).length;
  return (vocales / letras.length) < 0.26;
}

/** Ilegibles seguidos que SÍ se contestan; del siguiente en adelante, silencio. */
const MAX_ILEGIBLES = 2;

module.exports = { pareceIlegible, MAX_ILEGIBLES };
