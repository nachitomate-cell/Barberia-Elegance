'use strict';
/**
 * test-cinturon-presentacion.js — cinturón 7: presentarse en el primer mensaje.
 * Reclamo Kronnos 07-08: el bot saludaba "Hola Juan" pelado y el cliente no
 * sabía que hablaba con un asistente. Prueba pura, sin Firestore ni API.
 *
 * Uso: node scripts/test-cinturon-presentacion.js
 */
const Module = require('module');

// Doble de los require pesados de cerebro.js: solo se prueba la función pura.
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === 'firebase-admin')                 return { firestore: Object.assign(() => ({ collection: () => ({}), doc: () => ({}) }), { FieldValue: {}, Timestamp: {} }) };
  if (req === 'firebase-functions')             return { logger: { info: () => {}, warn: () => {}, error: () => {} } };
  if (req === '@anthropic-ai/sdk')              return class {};
  if (req === '../chat-horas-disponibles')      return { _buscarDisponibilidad: async () => ({}), _barberoLibreParaSlot: async () => null, _ahoraChile: () => ({ fecha: '2026-08-07', mins: 600, hhmm: '10:00' }), _atiendeEseDia: async () => ({}) };
  if (req === '../lib/calendario')              return { lineasCalendario: () => [], conDiaSemana: () => ({ dia: 'jueves', fecha: '2026-08-07' }), DIAS_SEMANA: [] };
  if (req === '../lib/metrics')                 return { logAiUsage: async () => {} };
  if (req === '../lib/ai-presupuesto')          return { puedeGastar: async () => ({ ok: true }) };
  if (req === '../lib/wa-plan.js' || req === '../lib/wa-plan') return { derivarWaPlan: () => ({}) };
  if (req === '../lib/bot-negocio')             return { logBotNegocio: async () => {} };
  if (req === '../lib/wa-uso')                  return { abrirConversacion: async () => ({}) };
  if (req === './cuota')                        return { registrarSaliente: async () => {}, limiteConversaciones: () => 0, conversacionesHoy: async () => 0, registrarConversacion: async () => {}, capDiario: () => 999, salientesHoy: async () => 0, registrarRechazo: () => {} };
  if (req === './client')                       return {};
  return origLoad.apply(this, [req, ...rest]);
};

const { _asegurarPresentacion: fx } = require('../functions/evolution/cerebro');

const P = { agente: 'Hermes', local: 'Kronnos Studio Peñablanca' };
let fallas = 0;
const caso = (nombre, ok) => { console.log(`${ok ? '✅' : '❌'} ${nombre}`); if (!ok) fallas++; };

// 1) Saludo con nombre del cliente → se conserva y la presentación entra después
const r1 = fx('¡Hola Juan! 👋\n\nEntendido, buscas Corte Masculino.', P);
caso('conserva "¡Hola Juan!" y agrega la presentación',
  r1.startsWith('¡Hola Juan! 👋\nSoy *Hermes*, el asistente de citas de Kronnos Studio Peñablanca 🤖\n\nEntendido'));

// 2) Sin saludo → presentación encabeza
const r2 = fx('Tenemos cupos hoy a las 16:00.', P);
caso('sin saludo, la presentación encabeza',
  r2.startsWith('¡Hola! Soy *Hermes*, el asistente de citas') && r2.includes('16:00'));

// 3) Ya se presentó solo → no se toca
const t3 = '¡Hola! Soy Hermes, el asistente de citas de Kronnos Studio Peñablanca 👋 ¿Qué necesitas?';
caso('si ya trae el nombre, no se toca', fx(t3, P) === t3);

// 4) Nombre en minúsculas también cuenta
caso('detecta el nombre aunque venga en minúsculas', fx('hola, soy hermes y te ayudo', P) === 'hola, soy hermes y te ayudo');

// 5) Local sin nombre de agente configurado → no hace nada
caso('sin agente configurado no inventa nada', fx('Hola, ¿qué necesitas?', null) === 'Hola, ¿qué necesitas?');

// 6) Saludo "Buenas tardes" también se respeta
const r6 = fx('Buenas tardes 👋\n\n¿Para qué día quieres la hora?', P);
caso('respeta "Buenas tardes" como saludo',
  r6.startsWith('Buenas tardes 👋\nSoy *Hermes*'));

console.log(fallas ? `\n❌ ${fallas} casos fallaron` : '\n✅ Cinturón de presentación en orden');
process.exit(fallas ? 1 : 0);
