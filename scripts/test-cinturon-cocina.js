'use strict';

// scripts/test-cinturon-cocina.js
// ─────────────────────────────────────────────────────────────────────────────
//  El cliente nunca debe enterarse de cómo funciona el bot por dentro.
//
//  Auditoría del 06-08-2026: un cliente de renacer que solo preguntaba si su
//  hora estaba bien recibió esto, literal:
//
//    "Tienes razón. Revisé mi respuesta y cometí un error: asumí que la cita
//     estaba confirmada sin haber llamado a la herramienta correspondiente"
//
//  El re-prompt del cinturón de acciones termina con "Este aviso es interno: no
//  lo menciones ni te disculpes por él" — y el modelo lo mencionó igual. Una
//  instrucción no es un candado: hace falta un filtro de salida.
//
//  Este guard fija las dos mitades del filtro:
//   1. Lo que TIENE que atajar: la fuga real y sus variantes.
//   2. Lo que NO puede tocar: disculparse por un precio mal dicho es humano, y
//      una barbería puede hablar de sus herramientas de trabajo sin que eso
//      sea una fuga. Un filtro que se pasa de listo censura respuestas buenas.
//
//  Uso: npm run test:cocina
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');

// Se prueba la decisión pura, sin Firestore ni red — mismo arranque que
// test-cinturon-accion.js.
const Module = require('module');
const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin')                 return { firestore: () => ({ collection: () => ({}), doc: () => ({}) }) };
  if (req === 'firebase-functions')             return { logger: { info(){}, warn(){}, error(){} } };
  if (req === 'firebase-admin/firestore')       return { FieldValue: {}, Timestamp: {} };
  if (req === '@anthropic-ai/sdk')              return function () { return {}; };
  if (req === '../chat-horas-disponibles')      return { _buscarDisponibilidad: async () => ({}), _barberoLibreParaSlot: async () => null, _ahoraChile: () => ({ fecha: '2026-08-06', mins: 600, hhmm: '10:00' }), _atiendeEseDia: async () => ({}) };
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

const RE = cerebro._RE_COCINA;
let fallos = 0;
const ok = (n, cond, extra) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${n}${cond ? '' : `  → ${extra}`}`);
  if (!cond) fallos++;
};

console.log('\n🚫 Fugas que hay que atajar');
const FUGAS = [
  ['la fuga real de renacer (06-08-2026)',
   'Tienes razón. Revisé mi respuesta y cometí un error: asumí que la cita estaba confirmada sin haber llamado a la herramienta correspondiente.'],
  ['menciona que no llamó a la herramienta',
   'Disculpa, no llamé a la herramienta de agenda antes de responderte.'],
  ['nombra "la herramienta correspondiente"',
   'Debí usar la herramienta correspondiente para verificarlo.'],
  ['habla de sus instrucciones',
   'Mis instrucciones me piden confirmar antes de responder.'],
  ['delata el aviso interno',
   'Recibí un aviso interno de que debía revisar eso.'],
  ['se declara un modelo',
   'Como modelo de lenguaje, no puedo confirmar esa cita.'],
  ['se declara una IA',
   'Como una IA, no tengo forma de saberlo.'],
  ['dice que revisó su propia respuesta',
   'Revisé mi respuesta y no era correcta.'],
];
for (const [nombre, txt] of FUGAS) ok(nombre, RE.test(txt), `no la detecta: "${txt.slice(0, 60)}…"`);

console.log('\n✅ Respuestas legítimas que NO se pueden censurar');
const BUENAS = [
  ['disculparse por un precio mal dicho',
   'Perdona, cometí un error con el precio: el Corte Masculino son $14.990.'],
  ['hablar de herramientas de barbería',
   'Usamos herramientas profesionales y productos de primera calidad 💈'],
  ['confirmar una cita normal',
   '¡Listo, Pablo! Tu cita quedó el sábado 15 a las 16:30 con Yender. Código JN4-XNS.'],
  ['ofrecer horas',
   'Tengo cupo para hoy: 16:45, 17:00 o 17:15. ¿Cuál te acomoda?'],
  ['derivar al local sin explicar mecánica',
   'Eso lo coordina el equipo en el local, les aviso para que te escriban.'],
  ['decir que revisa la agenda',
   'Dame un momento que reviso la agenda y te confirmo 🙏'],
  ['el rescate del cinturón de acciones',
   'Dame un momento que lo reviso bien y te confirmo 🙏'],
  ['el rescate del propio filtro',
   'Dame un segundo que reviso tu cita y te confirmo 🙏'],
];
for (const [nombre, txt] of BUENAS) ok(nombre, !RE.test(txt), `la censura sin motivo: "${txt.slice(0, 60)}…"`);

console.log('\n🔁 El rescate no le pide al cliente que repita');
// Pablo escribió nombre, servicio, profesional, hora y fecha en un solo
// mensaje y se le respondió "¿me dices qué necesitas exactamente?". El chat
// terminó en pausa, con alguien del local entrando a mano.
// Se miran solo las CADENAS, no los comentarios: la explicación de por qué se
// quitó ese texto lo cita, y sin quitar los comentarios el guard se acusaba a
// sí mismo.
const src = require('fs').readFileSync(
  path.join(__dirname, '..', 'functions', 'evolution', 'cerebro.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok('no volvió el "¿me dices qué necesitas exactamente?"',
  !/me dices qué necesitas exactamente/i.test(src),
  'ese texto le pide al cliente que repita lo que acaba de escribir');

console.log(fallos === 0
  ? '\n✅ La cocina se queda adentro y las respuestas buenas pasan.\n'
  : `\n❌ ${fallos} problema(s) en el filtro.\n`);
process.exit(fallos ? 1 : 0);
