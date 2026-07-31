#!/usr/bin/env node
/**
 * test-link-legacy.js — a quién puede absorber el auto-merge del club, y a quién NO.
 *
 * Fusionar mal es peor que no fusionar: el doc absorbido queda con
 * `fusionadoCon` y el panel lo esconde (useClubUsers lo filtra), así que el
 * cliente desaparece del buscador de la agenda y de Clientes sin que nadie
 * toque nada. Además su cita queda apuntando al userId del otro, o sea que
 * sus sellos se los lleva un humano distinto.
 *
 * Pasó de verdad: Sophia Perez y Emilio valverde comparten el +56962446486
 * (oren, 31-jul-2026). upsertCliente les dio un doc a cada uno — correos
 * distintos = personas distintas — y este trigger lo deshizo 28 minutos
 * después, buscando solo por teléfono.
 *
 * Se prueba la decisión pura, sin Firestore ni red.
 *
 * Uso:  npm run test:link-legacy
 */
const Module = require('module');

// ── Dobles de prueba, instalados ANTES de cargar el módulo ──
const origLoad = Module._load;
Module._load = function (req, parent, isMain) {
  if (req === 'firebase-admin')                     return { firestore: () => ({ collection: () => ({}) }) };
  if (req === 'firebase-functions')                 return { logger: { info(){}, warn(){}, error(){} } };
  if (req === 'firebase-functions/v2/firestore')    return { onDocumentCreated: () => () => {} };
  if (req === 'firebase-admin/firestore')           return { FieldValue: { serverTimestamp: () => '@ts', increment: n => n, arrayUnion: (...a) => a } };
  return origLoad.apply(this, arguments);
};

const { _decidirFusion: decidirFusion } = require('../functions/link-legacy-on-auth');

Module._load = origLoad;

let fallos = 0;
function caso(titulo, nuevo, candidato, esperado) {
  const r = decidirFusion(nuevo, candidato);
  const ok = r.fusionable === esperado;
  if (!ok) fallos++;
  console.log(`  ${ok ? '✓' : '✗'} ${titulo}`);
  if (!ok) console.log(`      esperaba fusionable=${esperado}, salió ${r.fusionable} (${r.motivo})`);
  else if (!esperado) console.log(`      └ ${r.motivo}`);
}

console.log('\n╔═══ link-legacy · a quién absorbe el registro al club ═══╗\n');

console.log('NO debe fusionar:');

caso(
  'dos personas con el mismo teléfono y correos distintos (Sophia / Emilio)',
  { uid: 'ac_652698d633a43fb4a6', email: 'rvalverdeborquez@gmail.com' },
  { uid: 'ac_9b02ccef0cd622428c', data: { nombre: 'Sophia Perez', email: 'sophia.ppbode@gmail.com', telefono: '+56962446486' } },
  false,
);

caso(
  'un cliente del club que no es legacy (docId de Auth, sin marca)',
  { uid: 'AbCdEfGhIjKlMnOpQrStUvWxYz12', email: 'nuevo@gmail.com' },
  { uid: 'ZyXwVuTsRqPoNmLkJiHgFeDcBa34', data: { nombre: 'Otro socio', email: 'nuevo@gmail.com' } },
  false,
);

caso(
  'un doc que ya fue absorbido por otra cuenta',
  { uid: 'AbCdEfGhIjKlMnOpQrStUvWxYz12', email: 'juan@gmail.com' },
  { uid: 'ac_1111111111111111', data: { nombre: 'Juan', email: 'juan@gmail.com', fusionadoCon: 'OtRoUiDdEfIrEbAsEaUtH1234567' } },
  false,
);

caso(
  'reintento del mismo trigger (at-least-once): ya fusionado conmigo, no se repite',
  { uid: 'AbCdEfGhIjKlMnOpQrStUvWxYz12', email: 'juan@gmail.com' },
  { uid: 'ac_4444444444444444', data: { nombre: 'Juan', email: 'juan@gmail.com', fusionadoCon: 'AbCdEfGhIjKlMnOpQrStUvWxYz12' } },
  false,
);

console.log('\nSÍ debe fusionar:');

caso(
  'walk-in con teléfono y sin correo → el mismo humano se registra al club',
  { uid: 'AbCdEfGhIjKlMnOpQrStUvWxYz12', email: 'juan@gmail.com' },
  { uid: 'ac_2222222222222222', data: { nombre: 'Juan Pérez', telefono: '+56911111111' } },
  true,
);

caso(
  'legacy migrado de AgendaPro (docId = teléfono), mismo correo',
  { uid: 'AbCdEfGhIjKlMnOpQrStUvWxYz12', email: 'juan@gmail.com' },
  { uid: '56911111111', data: { nombre: 'Juan Pérez', email: 'juan@gmail.com', telefono: '+56911111111' } },
  true,
);

caso(
  'registro sin correo (passwordless por teléfono) sobre un walk-in con correo',
  { uid: 'AbCdEfGhIjKlMnOpQrStUvWxYz12', email: '' },
  { uid: 'ac_3333333333333333', data: { nombre: 'Juan Pérez', email: 'juan@gmail.com', telefono: '+56911111111' } },
  true,
);

console.log(`\n${fallos === 0 ? '✅ Todo en orden.' : `❌ ${fallos} caso(s) fallando.`}\n`);
process.exit(fallos === 0 ? 0 : 1);
