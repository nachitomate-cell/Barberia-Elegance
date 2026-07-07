// ── Helpers de sede (Kronnos multi-sede — Camino 1, D2) ──────────
// Calculan métricas por sede sobre la colección `sellos` del pool marca.
//
// Contrato esperado del documento sello (D5):
//   { uid: string, sedeId: 'penablanca' | 'limache' | 'woman', citaId, createdAt }
//
// Reglas cerradas con Dexter (2026-07-06):
//   • Los sellos suman entre sedes a nivel cliente-marca.
//   • El premio se canjea en la sede predominante (más sellos del cliente).
//   • Tiebreak A (empate): se canjea en la sede donde el cliente lo pide ese día.

import { KRONNOS_SEDES } from './tenantUtils';

// Suma sellos por sede. Devuelve { penablanca: n, limache: n, woman: n } (siempre las 3 keys).
// Ignora sellos con sedeId inválido (defensivo, por si D5 dejó algún dato inconsistente).
export function sellosPorSede(sellos = []) {
  const acc = KRONNOS_SEDES.reduce((o, s) => (o[s] = 0, o), {});
  for (const sello of sellos) {
    const sid = sello?.sedeId;
    if (sid && sid in acc) acc[sid] += 1;
  }
  return acc;
}

// Sede predominante = la que tiene más sellos del cliente.
// Devuelve sedeId (string) si hay líder único, null si empate o sin sellos.
// El caller (UI de canje) usa null para activar tiebreak A: el cliente elige o
// se canjea en la sede donde está pidiendo canjearlo.
export function sedePredominante(sellos = []) {
  const conteo = sellosPorSede(sellos);
  let max = 0, ganador = null, empate = false;
  for (const sedeId of KRONNOS_SEDES) {
    const n = conteo[sedeId];
    if (n > max)      { max = n; ganador = sedeId; empate = false; }
    else if (n === max && n > 0) { empate = true; }
  }
  if (max === 0) return null;   // sin sellos: no hay predominante
  if (empate)    return null;   // caller aplica tiebreak
  return ganador;
}

// Devuelve el array de sedeIds empatadas en el máximo (útil para tiebreak UI).
// Si no hay empate, devuelve [sedePredominante] o [] si no hay sellos.
export function sedesEmpatadas(sellos = []) {
  const conteo = sellosPorSede(sellos);
  let max = 0;
  for (const sedeId of KRONNOS_SEDES) if (conteo[sedeId] > max) max = conteo[sedeId];
  if (max === 0) return [];
  return KRONNOS_SEDES.filter(s => conteo[s] === max);
}

// Total de sellos del cliente (cross-sede) — para calcular rango y disponibilidad de premios.
export function sellosTotalMarca(sellos = []) {
  return sellos.reduce((n, s) => n + (s?.sedeId in { penablanca:1, limache:1, woman:1 } ? 1 : 0), 0);
}

// Resuelve la sede final de canje aplicando la regla 3 de Dexter + tiebreak A.
// - Si hay predominante único → esa sede.
// - Si empate → sedeCanjeSolicitada (donde el cliente está pidiendo canjear).
// Devuelve sedeId (string) o null si no se puede resolver (sin sellos y sin fallback).
export function sedeDeCanje(sellos = [], sedeCanjeSolicitada = null) {
  const predominante = sedePredominante(sellos);
  if (predominante) return predominante;
  // Empate o sin sellos: usa la sede donde el cliente pide canjear (tiebreak A).
  return sedeCanjeSolicitada || null;
}
