#!/usr/bin/env node
/**
 * test-cinturon-dia.js — que el bot no ofrezca las horas de OTRO día como si
 * fueran del día que pidió el cliente.
 *
 * Pasó de verdad: kronnos_woman, lunes 3-ago. El local estaba cerrado (Kelly
 * con día libre y a Ernesto le pusieron un bloqueo de todo el día a las
 * 15:37). `consultar_disponibilidad` devuelve el PRÓXIMO día con cupos, así
 * que contestó con las horas del martes y `es_hoy: false`. El modelo ignoró
 * ese campo y escribió "Perfecto, para hoy tengo: 16:00, 16:15, 17:30…".
 * La clienta insistió 26 turnos, dijo que sí cuatro veces y se fue sin hora:
 * cero citas creadas ese día.
 *
 * El cinturón de horas inventadas NO lo atrapa: esas horas SÍ salieron de la
 * herramienta. Lo que está mal es el día.
 *
 * Se prueba la decisión pura, sin Firestore ni red.
 *
 * Uso:  npm run test:cinturon-dia
 */
const Module = require('module');

const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin')                 return { firestore: () => ({ collection: () => ({}), doc: () => ({}) }) };
  if (req === 'firebase-functions')             return { logger: { info(){}, warn(){}, error(){} } };
  if (req === 'firebase-admin/firestore')       return { FieldValue: {}, Timestamp: {} };
  if (req === '@anthropic-ai/sdk')              return function () { return {}; };
  if (req === '../chat-horas-disponibles')      return { _buscarDisponibilidad: async () => ({}), _barberoLibreParaSlot: async () => null, _ahoraChile: () => ({ fecha: '2026-08-03', mins: 600 }) };
  if (req === '../lib/metrics')                 return { logWaSend: async () => {}, logAiUsage: async () => {}, logBotNegocio: async () => {} };
  if (req === '../lib/ai-presupuesto')          return { puedeGastar: async () => ({ ok: true }) };
  if (req === '../lib/wa-plan')                 return { incluyeBot: () => true, incluyeRecordatorios: () => true };
  if (req === '../upsert-cliente')              return { _upsertClienteCore: async () => ({}) };
  if (req === '../lib/wa-consent')              return { detectarStop: () => false, detectarReactivar: () => false, registrarOptOut: async () => {}, registrarOptIn: async () => {} };
  if (req === './cuota')                        return { registrarSaliente: async () => {}, limiteConversaciones: () => 0, conversacionesHoy: async () => 0, registrarConversacion: async () => {}, capDiario: () => 0, salientesHoy: async () => 0 };
  return origLoad.apply(this, arguments);
};

const cerebro = require('../functions/evolution/cerebro');
Module._load = origLoad;

const { _horasSegunDia: segunDia, _horasDeOtroDiaSinAclarar: sinAclarar, _horasInventadas: inventadas, _horasPermitidas: permitidas } = cerebro;

/* ── Constructores de historial ── */
const toolResult = (obj) => ({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: JSON.stringify(obj) }] });
const userMsg    = (t)   => ({ role: 'user', content: t });

// Lo que devolvió la herramienta ese lunes: horas del MARTES.
const DISPO_MARTES = {
  hay_cupos: true, fecha: '2026-08-04', es_hoy: false,
  cuando: 'mañana (martes 4 de agosto)',
  horas: ['16:00', '16:30', '17:00', '17:30', '18:00'],
};
const DISPO_HOY = {
  hay_cupos: true, fecha: '2026-08-03', es_hoy: true,
  cuando: 'hoy (lunes 3 de agosto)',
  horas: ['16:00', '16:30', '17:00'],
};

let fallos = 0;
function caso(titulo, messages, texto, esperado) {
  const r = sinAclarar(texto, segunDia(messages));
  const ok = JSON.stringify(r) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`  ${ok ? '✓' : '✗'} ${titulo}`);
  if (!ok) console.log(`      esperaba ${JSON.stringify(esperado)}, salió ${JSON.stringify(r)}`);
}

console.log('\n📅 cinturón 3 — horas de otro día ofrecidas como si fueran de hoy\n');

// ── El caso real ──
caso('el mensaje exacto de kronnos_woman queda atajado',
  [toolResult(DISPO_MARTES)],
  'Perfecto, para hoy tengo: 16:00, 16:30, 17:00, 17:30 o 18:00. ¿Cuál prefieres?',
  ['16:00', '16:30', '17:00', '17:30', '18:00']);

caso('ofrecer sin decir ningún día también se ataja',
  [toolResult(DISPO_MARTES)],
  'Tengo 16:00, 17:30 o 18:00. ¿Cuál te acomoda?',
  ['16:00', '17:30', '18:00']);

// ── Lo correcto NO se castiga (esto es lo que más importa: cero falsos positivos) ──
caso('si dice "mañana", pasa',
  [toolResult(DISPO_MARTES)],
  'Hoy ya no me queda nada 😕 Para mañana tengo 16:00 o 17:30. ¿Te sirve?',
  []);

caso('si nombra el día de la semana, pasa',
  [toolResult(DISPO_MARTES)],
  'Hoy está lleno. El martes tengo 16:00, 17:30 o 18:00.',
  []);

caso('si las horas SON de hoy, nunca se mete',
  [toolResult(DISPO_HOY)],
  'Perfecto, para hoy tengo: 16:00, 16:30 o 17:00. ¿Cuál prefieres?',
  []);

caso('sin consultas de disponibilidad, no se mete',
  [userMsg('¿A qué hora era mi cita?')],
  'Tu cita es hoy a las 16:00.',
  []);

caso('hora que viene de OTRA herramienta (su cita de hoy) no se confunde',
  [toolResult(DISPO_MARTES), toolResult({ citas: [{ cita_id: 'x', fecha: '2026-08-03', hora: '16:00', servicio: 'Corte' }] })],
  'Tu cita de hoy es a las 16:00.',
  []);

caso('hora que escribió el propio cliente no se le imputa al bot',
  [toolResult(DISPO_MARTES), userMsg('puede ser a las 17:30 hoy?')],
  'Déjame revisar las 17:30.',
  []);

caso('no ofrece horas: nada que atajar',
  [toolResult(DISPO_MARTES)],
  'Hoy no me queda disponibilidad. ¿Te reviso otro día?',
  []);

// ── Convivencia con el cinturón 2 ──
console.log('');
const msgs = [toolResult(DISPO_MARTES)];
const inv = inventadas('Tengo 16:00, 18:45 y 19:30 disponibles.', permitidas(msgs, [{ text: '' }]));
const okInv = JSON.stringify(inv) === JSON.stringify(['18:45', '19:30']);
if (!okInv) fallos++;
console.log(`  ${okInv ? '✓' : '✗'} el cinturón 2 sigue cazando las horas fabricadas (18:45, 19:30)`);
if (!okInv) console.log(`      salió ${JSON.stringify(inv)}`);

const soloDia = sinAclarar('Tengo 16:00 y 17:30.', segunDia(msgs));
const okSep = JSON.stringify(soloDia) === JSON.stringify(['16:00', '17:30']);
if (!okSep) fallos++;
console.log(`  ${okSep ? '✓' : '✗'} y el 3 caza las reales-pero-de-otro-día, que el 2 deja pasar`);

if (fallos) { console.log(`\n❌ ${fallos} caso(s) fallaron.\n`); process.exit(1); }
console.log('\n✅ Todo en orden — o nombra el día, o no ofrece la hora.\n');
