'use strict';

/**
 * Regresión de ReservaCore.{formatearTelefonoLive, validarTelefono, sugerirCorreo}.
 *
 * firebaseUtils.js es un archivo de navegador: se carga con shims mínimos de
 * window/document/firebase/localStorage y se prueban las funciones puras.
 *
 * Casos de origen: incidente 2026-08-05 en kronnos_limache (reserva basura con
 * nombre "Hola", tel 88555885886, correo trefghut@mhhh.cpm) + los 85 correos
 * con dominio inválido que el barrido encontró en la plataforma.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..', 'firebaseUtils.js');

const almacen = new Map();
const sandbox = {
  console,
  window: {},
  document: { getElementById: () => null, addEventListener: () => {} },
  localStorage: {
    getItem: k => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => almacen.set(k, String(v)),
  },
  firebase: {
    firestore: Object.assign(() => ({ collection: () => ({ doc: () => ({}) }) }), {
      FieldValue: { serverTimestamp: () => '<ts>' },
    }),
  },
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox, { filename: 'firebaseUtils.js' });

const RC = sandbox.window.ReservaCore;   // el archivo lo publica en `window`
if (!RC) { console.error('No se pudo cargar ReservaCore'); process.exit(1); }

let ok = 0, fail = 0;
const eq = (etiqueta, real, esperado) => {
  const a = JSON.stringify(real), b = JSON.stringify(esperado);
  if (a === b) { ok++; console.log(`  ✓ ${etiqueta}`); }
  else { fail++; console.log(`  ✗ ${etiqueta}\n      esperado: ${b}\n      real:     ${a}`); }
};

const ESTRICTO = { validacionContactoEstricta: true };
const LAXO     = {};

console.log('\n══ Máscara en vivo ══');
eq('vacío no deja "+56" fantasma',   RC.formatearTelefonoLive(''),             '');
eq('solo basura → vacío',            RC.formatearTelefonoLive('abc'),          '');
eq('primer dígito',                  RC.formatearTelefonoLive('9'),            '+56 9');
eq('parcial',                        RC.formatearTelefonoLive('9123'),         '+56 9 123');
eq('completo',                       RC.formatearTelefonoLive('912345678'),    '+56 9 1234 5678');
eq('pegado con +56',                 RC.formatearTelefonoLive('+56912345678'), '+56 9 1234 5678');
eq('pegado con 56 sin +',            RC.formatearTelefonoLive('56912345678'),  '+56 9 1234 5678');
eq('pegado con espacios',            RC.formatearTelefonoLive('+56 9 1234 5678'), '+56 9 1234 5678');
// El caso del incidente: 11 dígitos que no son chilenos. La máscara los trunca
// a 9 y el resultado NO parte con 9 → validarTelefono estricto lo rechaza.
eq('EL CASO: 88555885886 se trunca', RC.formatearTelefonoLive('88555885886'),  '+56 8 8555 8858');

console.log('\n══ validarTelefono · flag ENCENDIDO ══');
eq('celular válido',        RC.validarTelefono('912345678', ESTRICTO).ok,   true);
eq('con prefijo +56',       RC.validarTelefono('+56912345678', ESTRICTO).ok, true);
eq('EL CASO 88555885886',   RC.validarTelefono('88555885886', ESTRICTO).ok, false);
eq('no parte con 9',        RC.validarTelefono('212345678', ESTRICTO).ok,   false);
eq('8 dígitos',             RC.validarTelefono('12345678', ESTRICTO).ok,    false);
eq('vacío',                 RC.validarTelefono('', ESTRICTO).ok,            false);

console.log('\n══ validarTelefono · flag APAGADO (piso histórico de index.html) ══');
eq('celular válido',        RC.validarTelefono('912345678', LAXO).ok,   true);
eq('EL CASO 88555885886',   RC.validarTelefono('88555885886', LAXO).ok, true);   // pasa: por eso existe el flag
eq('8 dígitos ya no pasa',  RC.validarTelefono('12345678', LAXO).ok,    false);
eq('vacío',                 RC.validarTelefono('', LAXO).ok,            false);

console.log('\n══ sugerirCorreo · typos reales encontrados en la plataforma ══');
const sug = e => { const r = RC.sugerirCorreo(e); return r ? r.sugerencia : null; };
eq('EL CASO trefghut@mhhh.cpm', sug('trefghut@mhhh.cpm'),        'trefghut@mhhh.com');
eq('gmail.con',                 sug('alejandro.campos21@gmail.con'), 'alejandro.campos21@gmail.com');
// .clm está a distancia 1 tanto de .com como de .cl, pero gmail.cl no existe
// como correo y la `l` es vecina de la `o` en el teclado: gana .com. El
// desempate lo da el ORDEN de _DOMINIOS_COMUNES (más popular primero).
eq('gmail.clm',                 sug('jorge.arancibia.s@gmail.clm'),  'jorge.arancibia.s@gmail.com');
eq('gmail.coms',                sug('seaceved@gmail.coms'),      'seaceved@gmail.com');
eq('gmail.com9',                sug('lucas@gmail.com9'),         'lucas@gmail.com');
eq('hotmail.con',               sug('hawk_bmx@hotmail.con'),     'hawk_bmx@hotmail.com');
eq('hotmail.comv',              sug('valeria@hotmail.comv'),     'valeria@hotmail.com');
eq('icloud.con',                sug('octnieleon@icloud.con'),    'octnieleon@icloud.com');
eq('gmai.com (letra faltante)', sug('juan@gmai.com'),            'juan@gmail.com');
eq('hotmial.com (transpuesta)', sug('juan@hotmial.com'),         'juan@hotmail.com');
eq('gmial.com (transpuesta)',   sug('juan@gmial.com'),           'juan@gmail.com');

console.log('\n══ sugerirCorreo · correos BUENOS no deben molestar ══');
for (const bueno of [
  'ignaciiio.mate@gmail.com', 'polincasada@hotmail.com', 'sergio.matus@aky.cl',
  'jeremy.brame@epfedu.fr', 'karim.drozd@gmx.de', 'prospect20@yandex.ru',
  'andrejimmy@yahoo.fr', 'alguien@uc.cl', 'alguien@midominiopropio.io',
]) eq(`sin sugerencia: ${bueno}`, RC.sugerirCorreo(bueno), null);

console.log('\n══ sugerirCorreo · sospechoso pero sin propuesta razonable ══');
eq('xd@xd.xd no inventa nada',   RC.sugerirCorreo('xd@xd.xd'),
   { sugerencia: null, motivo: 'tld-desconocido' });
eq('sin @ → null (lo ve validarCorreo)', RC.sugerirCorreo('asdf'), null);
eq('sin punto en dominio → null',        RC.sugerirCorreo('a@b'),  null);

console.log(`\n══ ${ok} OK · ${fail} fallos ══`);
process.exit(fail ? 1 : 0);
