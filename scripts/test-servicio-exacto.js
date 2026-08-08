#!/usr/bin/env node
/**
 * test-servicio-exacto.js — el bot no puede adivinar QUÉ servicio quiso el
 * cliente.
 *
 * Caso real (kronnos_limache, 08-08-2026). Vilma escribió "corte masculino y
 * corte femenino". Limache es barbería: no tiene corte femenino, eso es de
 * Kronnos Woman. El bot no se lo dijo — le agendó un "Corte Escolar" (el de
 * niños, $12.990) como si fuera lo que pidió, código FM6-5SW. El dueño tuvo
 * que rehacer la cita a mano por la mañana.
 *
 * Dos defectos, los dos cubiertos acá:
 *
 *   1. `matchServicio` resolvía la coincidencia parcial con `.find()`, o sea
 *      el PRIMER doc de la colección. En Limache "corte" a secas calzaba con
 *      cinco servicios distintos y devolvía uno al azar — incluida una
 *      promoción de lunes a jueves, con otro precio y otra duración.
 *   2. Cuando el servicio no existía se devolvía "no encontrado" + la lista
 *      del catálogo, que en la práctica es una invitación a que el modelo
 *      elija uno. Ahora el motivo lo prohíbe con todas sus letras y, si lo
 *      pedido es de otra sede de la marca, deriva.
 *
 * Se prueba la decisión pura, sin Firestore ni red.
 *
 * Uso:  npm run test:servicio
 */
const Module = require('module');

const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin')                 return { firestore: () => ({ collection: () => ({}), doc: () => ({}) }) };
  if (req === 'firebase-functions')             return { logger: { info(){}, warn(){}, error(){} } };
  if (req === 'firebase-admin/firestore')       return { FieldValue: {}, Timestamp: {} };
  if (req === '@anthropic-ai/sdk')              return function () { return {}; };
  if (req === '../chat-horas-disponibles')      return { _buscarDisponibilidad: async () => ({}), _barberoLibreParaSlot: async () => null, _ahoraChile: () => ({ fecha: '2026-08-08', mins: 600, hhmm: '10:00' }), _atiendeEseDia: async () => ({}) };
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

const matchServicio       = cerebro._matchServicio;
const serviciosParecidos  = cerebro._serviciosParecidos;
const derivarASedeHermana = cerebro._derivarASedeHermana;

// El catálogo REAL de kronnos_limache el día del incidente, en el orden en que
// lo devuelve Firestore. El orden importa: es lo que hacía ganar al equivocado.
const LIMACHE = [
  { id: 'AkQ4mPtLG8Rur818aBzQ', nombre: 'Corte Masculino (Promocion) Lunes a Jueves', precio: 11990, duracion: 45 },
  { id: 'UTb27L3txKNaHqtmOqYl', nombre: 'Pack Full KRONNOS',      precio: 29990, duracion: 90 },
  { id: 'barba-premium',        nombre: 'Barba Premium',          precio: 15990, duracion: 35 },
  { id: 'barba-simple',         nombre: 'Barba Simple',           precio: 12990, duracion: 30 },
  { id: 'corte-barba',          nombre: 'Corte y Barba',          precio: 20990, duracion: 60 },
  { id: 'corte-bebe',           nombre: 'Corte Bebé',             precio: 10990, duracion: 30 },
  { id: 'corte-escolar',        nombre: 'Corte Escolar',          precio: 12990, duracion: 30 },
  { id: 'corte-masculino',      nombre: 'Corte Masculino',        precio: 14990, duracion: 45 },
  { id: 'pack-toallas-calientes', nombre: 'Pack Toallas Calientes', precio: 24990, duracion: 60 },
  { id: 'perfilado-ceja',       nombre: 'Perfilado Ceja',         precio: 3000,  duracion: 10 },
  { id: 'precision-masculino',  nombre: 'Precisión Masculino',    precio: 16990, duracion: 50 },
];

let fallos = 0;
const ok  = m => console.log('  ✓ ' + m);
const mal = m => { console.log('  ✗ ' + m); fallos++; };

function esperar(pedido, esperado, porQue) {
  const r = matchServicio(LIMACHE, pedido);
  const got = r ? r.nombre : null;
  if (got === esperado) ok(`"${pedido}" → ${got === null ? 'pregunta cuál' : got}`);
  else mal(`"${pedido}" → ${got === null ? 'null' : got} · esperaba ${esperado === null ? 'null' : esperado} — ${porQue}`);
}

console.log('\n== 1. el nombre exacto siempre gana ==');
// "Corte Masculino" es substring de "Corte Masculino (Promocion) Lunes a
// Jueves": sin la prioridad del exacto, el cliente se lleva la promoción.
esperar('Corte Masculino', 'Corte Masculino', 'el exacto debe ganarle al que lo contiene');
esperar('corte masculino', 'Corte Masculino', 'la comparación normaliza mayúsculas');
esperar('Corte Escolar',   'Corte Escolar',   'exacto');
esperar('perfilado ceja',  'Perfilado Ceja',  'exacto normalizado');

console.log('\n== 2. lo ambiguo se pregunta, no se rifa ==');
esperar('corte', null, 'calza con 5 servicios: elegir uno es rifar precio y duración');
esperar('barba', null, 'Barba Premium, Barba Simple y Corte y Barba');
esperar('pack',  null, 'Pack Full y Pack Toallas Calientes');
{
  const p = serviciosParecidos(LIMACHE, 'corte');
  if (p.length === 5) ok(`"corte" ofrece los 5 candidatos para preguntar: ${p.map(s => s.nombre).join(', ')}`);
  else mal(`"corte" devolvió ${p.length} candidatos, esperaba 5`);
}

console.log('\n== 3. un parcial único sí resuelve ==');
esperar('toallas calientes', 'Pack Toallas Calientes', 'un solo candidato');
esperar('precision',         'Precisión Masculino',    'un solo candidato');

console.log('\n== 4. lo que no existe NO se reemplaza ==');
// El caso Vilma. Antes esto devolvía null y el modelo elegía de la lista.
esperar('corte femenino', null, 'Limache no lo tiene: hay que decirlo, no sustituirlo');
esperar('manicure',       null, 'es de Kronnos Woman');
esperar('depilación',     null, 'es de Kronnos Woman');

console.log('\n== 5. derivación a la sede hermana ==');
for (const pedido of ['corte femenino', 'corte de mujer', 'manicure', 'pedicure', 'depilación de piernas', 'keratina', 'mechas']) {
  const d = derivarASedeHermana('kronnos_limache', pedido);
  if (d && /Kronnos Woman/.test(d) && /NO le ofrezcas un servicio parecido/.test(d)) ok(`"${pedido}" → deriva a Kronnos Woman y prohíbe sustituir`);
  else mal(`"${pedido}" no derivó a Kronnos Woman (devolvió: ${d || 'null'})`);
}
for (const pedido of ['corte masculino', 'barba premium', 'corte escolar']) {
  if (derivarASedeHermana('kronnos_limache', pedido) === null) ok(`"${pedido}" NO se deriva (es de esta sede)`);
  else mal(`"${pedido}" se derivó y no corresponde: es un servicio propio de Limache`);
}
// Un tenant sin sede hermana nunca deriva.
if (derivarASedeHermana('delnero', 'corte femenino') === null) ok('un tenant sin sede hermana no deriva nada');
else mal('delnero derivó y no tiene sede hermana');

console.log('\n== 6. entradas basura ==');
esperar('',            null, 'vacío');
esperar('   ',         null, 'solo espacios');
esperar('xyz123',      null, 'no se parece a nada');

console.log('\n== 7. cinturón del cierre: reconocer el "sí" del cliente ==');
const clienteAcepto = cerebro._clienteAcepto;
const REPIDE = cerebro._RE_REPIDE_CONFIRMAR;
// Los cuatro que dijo Vilma, más las formas habituales por WhatsApp.
for (const t of ['Si', 'Si agendado', 'Confirmo Si', 'Ese horario es perfecto', 'sí', 'Dale',
                 'dale nomás', 'Ok', 'listo', 'Sí por favor', 'agéndalo', 'Así está bien',
                 'Perfecto', 'me sirve', 'Sí, agéndalo']) {
  if (clienteAcepto(t)) ok(`"${t}" se lee como aceptación`);
  else mal(`"${t}" NO se leyó como aceptación y sí lo es`);
}
// Lo que NO es un sí: preguntas, cambios de tema y textos largos.
for (const t of ['No', 'A qué hora?', 'Cuánto sale?', 'Mejor mañana', 'Prefiero otra hora',
                 'Hola quiero saber si tienen hora disponible para el sábado en la tarde con Claudio si se puede']) {
  if (!clienteAcepto(t)) ok(`"${t.slice(0, 40)}${t.length > 40 ? '…' : ''}" NO es aceptación`);
  else mal(`"${t}" se leyó como aceptación y no lo es`);
}
// Lo que el bot no puede responder después de ese sí.
for (const t of ['¿Lo agendo?', 'Te confirmo: Vilma 12:30. ¿Lo agendo?', '¿Te lo confirmo?',
                 '¿Quieres que te lo agende?', '¿Procedo?']) {
  if (REPIDE.test(t)) ok(`"${t}" se detecta como volver a pedir permiso`);
  else mal(`"${t}" NO se detectó como repregunta de confirmación`);
}
for (const t of ['Listo, quedó agendada a las 12:30, código ABC-123.', '¿Para qué día lo necesitas?',
                 '¿Cuál de los cortes prefieres?']) {
  if (!REPIDE.test(t)) ok(`"${t.slice(0, 44)}…" NO es repregunta`);
  else mal(`"${t}" se marcó como repregunta y no lo es`);
}

console.log(fallos === 0 ? '\nOK — el bot pregunta o deriva, nunca adivina; y un sí cierra la cita.\n' : `\n${fallos} fallo(s)\n`);
process.exit(fallos ? 1 : 0);
