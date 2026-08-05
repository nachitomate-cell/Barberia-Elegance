#!/usr/bin/env node
/**
 * test-cinturon-accion.js — el bot no puede decir que hizo algo que no hizo.
 *
 * Es el fallo que más caro salió, y el que más veces se repitió el 04-08:
 *
 *   · "¡Perfecto! Ve directo al local. Araceli te atiende" — sin cita creada
 *     y con Araceli bloqueada el día entero. El cliente estaba a 5 minutos.
 *   · "Dale, te agendo" / "Listo, te agendo" — y no agendó (Romina, Ceci).
 *   · "No encuentro una cita a nombre de Maximiano Reitz" — nunca buscó por
 *     nombre: esa herramienta no existe.
 *
 * La regla llevaba días escrita en el prompt. El modelo se la saltaba igual,
 * así que ahora la hace cumplir el código: si el texto afirma una acción y
 * ninguna herramienta devolvió ok:true en ese turno, se fuerza corrección y,
 * si reincide, la respuesta se descarta.
 *
 * También cubre los precios: lo que el bot nombre tiene que existir en el
 * catálogo, con el mismo método que ya se usa para las horas.
 *
 * Se prueba la decisión pura, sin Firestore ni red.
 *
 * Uso:  npm run test:cinturon-accion
 */
const Module = require('module');

const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin')                 return { firestore: () => ({ collection: () => ({}), doc: () => ({}) }) };
  if (req === 'firebase-functions')             return { logger: { info(){}, warn(){}, error(){} } };
  if (req === 'firebase-admin/firestore')       return { FieldValue: {}, Timestamp: {} };
  if (req === '@anthropic-ai/sdk')              return function () { return {}; };
  if (req === '../chat-horas-disponibles')      return { _buscarDisponibilidad: async () => ({}), _barberoLibreParaSlot: async () => null, _ahoraChile: () => ({ fecha: '2026-08-05', mins: 600, hhmm: '10:00' }), _atiendeEseDia: async () => ({}) };
  if (req === '../lib/metrics')                 return { logWaSend: async () => {}, logAiUsage: async () => {}, logBotNegocio: async () => {}, logCinturon: async () => {} };
  if (req === '../lib/ai-presupuesto')          return { puedeGastar: async () => ({ ok: true }) };
  if (req === '../lib/wa-plan')                 return { incluyeBot: () => true, incluyeRecordatorios: () => true };
  if (req === '../upsert-cliente')              return { _upsertClienteCore: async () => ({}) };
  if (req === '../lib/wa-consent')              return { detectarStop: () => false, detectarReactivar: () => false, registrarOptOut: async () => {}, registrarOptIn: async () => {} };
  if (req === './cuota')                        return { registrarSaliente: async () => {}, limiteConversaciones: () => 0, conversacionesHoy: async () => 0, registrarConversacion: async () => {}, capDiario: () => 0, salientesHoy: async () => 0 };
  return origLoad.apply(this, arguments);
};
const cerebro = require('../functions/evolution/cerebro');
Module._load = origLoad;

const { _RE_ACCION: RE_ACCION, _huboAccionReal: huboAccionReal,
        _preciosPermitidos: preciosPermitidos, _preciosInventados: preciosInventados } = cerebro;

const toolOk   = (obj) => ({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: JSON.stringify({ ok: true, ...obj }) }] });
const toolFail = (obj) => ({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: JSON.stringify({ ok: false, ...obj }) }] });
const toolInfo = (obj) => ({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: JSON.stringify(obj) }] });

let fallos = 0;
const chk = (ok, d) => { if (!ok) { fallos++; console.log('      ✗ ' + d); } return ok; };
const casos = [];
const caso = (t, fn) => casos.push([t, fn]);

/* ── Detectar la afirmación ── */

caso('reconoce las frases exactas que fallaron', () => {
  const reales = [
    '¡Perfecto! Ve directo al local. Araceli te atiende. 👋',
    'Dale, te agendo. Pero necesito tu nombre para la reserva.',
    'Tu cita quedó agendada: - *Código*: EZK-ZGA',
    '¡Listo, te la cambié a las 12:00!',
    'Perfecto, listo. Te esperamos hoy a las 12:00.',
  ];
  reales.forEach(t => chk(RE_ACCION.test(t), `no detectó: "${t.slice(0, 45)}"`));
});

caso('no se activa con respuestas normales', () => {
  const normales = [
    'Tenemos estas horas libres hoy: 16:00 · 17:30. ¿Cuál te acomoda?',
    'El Corte Masculino cuesta $12.990 y dura 45 minutos.',
    'Hoy no me queda disponibilidad. ¿Te reviso otro día?',
    '¡Hola! 👋 ¿En qué te puedo ayudar?',
    '¿Qué servicio buscas para mañana?',
  ];
  normales.forEach(t => chk(!RE_ACCION.test(t), `falso positivo: "${t.slice(0, 45)}"`));
});

/* ── Respaldo de la herramienta ── */

caso('con una tool ok:true, la afirmación es válida', () => {
  chk(huboAccionReal([toolOk({ codigo: 'ABC-123', hora: '16:00' })]) === true, 'no vio el ok:true');
});

caso('una tool que FALLÓ no respalda nada', () => {
  chk(huboAccionReal([toolFail({ motivo: 'Esa hora ya no está disponible.' })]) === false, 'tomó un ok:false como respaldo');
});

caso('consultar disponibilidad no es una acción', () => {
  chk(huboAccionReal([toolInfo({ hay_cupos: true, horas: ['16:00'] })]) === false, 'confundió una consulta con una acción');
});

caso('sin ninguna tool, no hay respaldo', () => {
  chk(huboAccionReal([{ role: 'user', content: 'hola' }]) === false, 'inventó respaldo');
});

caso('el caso de Daniel: manda al local sin nada detrás', () => {
  const texto = '¡Perfecto! Ve directo al local. Araceli te atiende. 👋';
  const hay = huboAccionReal([toolInfo({ hay_cupos: false })]);
  chk(RE_ACCION.test(texto) && !hay, 'no lo habría atajado');
});

/* ── Precios ── */

caso('un precio del catálogo pasa', () => {
  const sys = [{ text: 'CATÁLOGO: Corte Masculino — $12.990 (45 min)' }];
  const perm = preciosPermitidos([], sys);
  chk(preciosInventados('El Corte Masculino cuesta $12.990.', perm).length === 0, 'rechazó un precio real');
});

caso('un precio inventado se ataja', () => {
  const sys = [{ text: 'CATÁLOGO: Corte Masculino — $12.990 (45 min)' }];
  const perm = preciosPermitidos([], sys);
  const mal = preciosInventados('Te lo dejo en $9.990 por hoy.', perm);
  chk(mal.length === 1, `esperaba 1 inventado, salieron ${mal.length}`);
});

caso('el precio que dijo el CLIENTE no se le imputa al bot', () => {
  const perm = preciosPermitidos([{ role: 'user', content: 'tengo $20.000, me alcanza?' }], [{ text: '' }]);
  chk(preciosInventados('Con $20.000 te alcanza para el corte.', perm).length === 0, 'lo tomó como inventado');
});

caso('duraciones y números chicos no son precios', () => {
  const perm = preciosPermitidos([], [{ text: '' }]);
  chk(preciosInventados('Dura 45 minutos y quedan 3 cupos. Son $500 de vuelto.', perm).length === 0,
    'confundió minutos o cifras chicas con precios');
});

(async () => {
  console.log('\n🛡  cinturones 5 y 6 — no afirmar lo que no pasó, no inventar precios\n');
  for (const [t, fn] of casos) {
    const antes = fallos;
    try { await fn(); } catch (e) { fallos++; console.log(`      ✗ excepción: ${e.message}`); }
    console.log(`  ${fallos === antes ? '✓' : '✗'} ${t}`);
  }
  if (fallos) { console.log(`\n❌ ${fallos} comprobación(es) fallaron.\n`); process.exit(1); }
  console.log(`\n✅ ${casos.length} casos OK — sin respaldo de una herramienta, no se afirma nada.\n`);
})();
