#!/usr/bin/env node
/**
 * test-alerta-sesion.js — Qué correo sale (y cuál NO) ante cada transición.
 *
 * El aviso de caída tiene dos formas de fallar y las dos son caras:
 *   · No avisar cuando bloquean el número → el local queda mudo días.
 *   · Avisar de más → se vuelve ruido, se ignora, y el aviso que sí importa
 *     se pierde entre los otros. Un flapping de sesión son decenas de
 *     transiciones en minutos.
 *
 * Por eso se prueba la MÁQUINA DE ESTADOS completa, incluida la que no manda
 * nada. Se ejecuta contra el módulo real con el mailer y Firestore fingidos:
 * no toca la red ni la base.
 *
 * Uso:  npm run test:alerta-sesion
 */
const path   = require('path');
const Module = require('module');

// ── Dobles de prueba, instalados ANTES de cargar el módulo ──
const enviados = [];
const escritos = [];

const origResolve = Module._resolveFilename;
const origLoad    = Module._load;
const FAKE = {
  mailer: {
    MAIL_SECRETS: [],
    enviarEmail: async (msg, opts) => { enviados.push({ ...msg, etiqueta: opts && opts.etiqueta }); },
  },
  admin: {
    firestore: () => ({ doc: (p) => ({ path: p, set: async (d) => { escritos.push({ p, d }); }, get: async () => ({ exists: false, data: () => ({}) }) }) }),
  },
  fns: { logger: { info(){}, warn(){}, error(){} } },
  ffs: { onDocumentWritten: () => () => {} },
  fst: { FieldValue: { serverTimestamp: () => '@ts', delete: () => '@del' } },
};

Module._load = function (req, parent, isMain) {
  if (req === 'firebase-admin')                    return FAKE.admin;
  if (req === 'firebase-functions')                return FAKE.fns;
  if (req === 'firebase-functions/v2/firestore')   return FAKE.ffs;
  if (req === 'firebase-admin/firestore')          return FAKE.fst;
  if (req === '../lib/mailer')                     return FAKE.mailer;
  return origLoad.call(this, req, parent, isMain);
};

const A = require(path.resolve(__dirname, '..', 'functions', 'evolution', 'alerta-sesion.js'));
Module._load = origLoad; Module._resolveFilename = origResolve;

const refFalsa = { set: async (d) => { escritos.push({ p: '(ref)', d }); } };

let fallos = 0;
async function caso(nombre, { antes, ahora }, espera) {
  enviados.length = 0; escritos.length = 0;
  await A._avisar({
    ref: refFalsa, antes, ahora,
    etiqueta: 'test', nombre: 'Local X',
    destinatarios: ['a@b.cl'],
    url: 'https://x', urlTexto: 'Abrir', esChip: false,
  });
  const real = enviados.length === 0 ? 'nada' : enviados[0].etiqueta;
  const ok = real === espera;
  if (!ok) fallos++;
  console.log(`${ok ? '  ok  ' : 'FAIL  '}${nombre.padEnd(52)} → ${real}${ok ? '' : `   (esperado ${espera})`}`);
  if (ok && enviados[0]) console.log(`        asunto: ${enviados[0].subject}`);
}

(async () => {
  const ON  = { estadoConexion: 'connected' };
  const OFF = (extra = {}) => ({ estadoConexion: 'disconnected', numeroVinculado: '56900000000', ...extra });

  console.log('\n== lo que DEBE avisar ==');
  await caso('conectado → caída sin código',            { antes: ON, ahora: OFF() },                       'test-caida');
  await caso('conectado → 401 (sesión cerrada/baneo)',  { antes: ON, ahora: OFF({ cierreStatusCode: 401 }) }, 'test-terminal');
  await caso('conectado → 403 (cuenta restringida)',    { antes: ON, ahora: OFF({ cierreStatusCode: 403 }) }, 'test-terminal');
  await caso('conectado → 402 (suspendida)',            { antes: ON, ahora: OFF({ cierreStatusCode: 402 }) }, 'test-terminal');
  await caso('caída avisada → reconectó',               { antes: { ...OFF(), alertaDesconexionEnviada: true }, ahora: ON }, 'test-recuperada');

  console.log('\n== lo que NO debe avisar (el ruido mata al aviso) ==');
  await caso('515 restart → es reconexión normal, no baneo', { antes: ON, ahora: OFF({ cierreStatusCode: 515 }) }, 'test-caida');
  await caso('segunda caída seguida (candado puesto)',  { antes: ON, ahora: OFF({ alertaDesconexionEnviada: true }) }, 'nada');
  await caso('desvinculación hecha desde el panel',     { antes: ON, ahora: OFF({ cierreManual: true }) },   'nada');
  await caso('seguía caído, sigue caído',               { antes: OFF(), ahora: OFF() },                      'nada');
  await caso('reconectó sin que se hubiera avisado',    { antes: OFF(), ahora: ON },                         'nada');
  await caso('qr → conectado (vinculación normal)',     { antes: { estadoConexion: 'qr' }, ahora: ON },      'nada');

  console.log('\n== clasificación de códigos ==');
  for (const [c, esp] of [[401, true], [402, true], [403, true], [428, false], [440, false], [515, false], [null, false]]) {
    const r = A._esTerminal(c);
    const ok = r === esp; if (!ok) fallos++;
    console.log(`${ok ? '  ok  ' : 'FAIL  '}código ${String(c).padEnd(6)} terminal=${r}`);
  }

  console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ todo OK');
  process.exit(fallos ? 1 : 0);
})();
