#!/usr/bin/env node
'use strict';

/*
 * test-prospeccion.js — humo del módulo de prospección SIN tocar leads reales.
 *
 * Qué prueba, en orden:
 *   1. Que functions/prospeccion.js carga entero (requires, constantes, deps).
 *   2. Que el texto de rescate y de reactivación salen bien formados.
 *   3. [con ANTHROPIC_API_KEY] Redacta un email y un DM de verdad para un
 *      prospecto de muestra y los imprime.
 *   4. [con RESEND_API_KEY y --enviar] Manda el email redactado al correo de
 *      Ignacio (nunca a un prospecto real desde acá).
 *   5. Funnel actual de _synaptechProspectos.
 *
 * Claves: se pasan por env. Para sacarlas de Secret Manager:
 *   npx firebase-tools functions:secrets:access ANTHROPIC_API_KEY
 *   npx firebase-tools functions:secrets:access RESEND_API_KEY
 *
 * Uso:
 *   node scripts/test-prospeccion.js            # 1,2,3,5
 *   node scripts/test-prospeccion.js --enviar   # + el correo de prueba a Ignacio
 */

const path  = require('path');
// El firebase-admin de functions/, no el de la raíz: prospeccion.js resuelve
// SU copia, y si acá se inicializa otra instancia el módulo carga sin app.
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

function cargarCreds() {
  const candidatos = [
    path.join(__dirname, '..', 'service-account.json'),
    path.join(__dirname, '..', 'functions', 'service-account.json'),
    path.join(__dirname, '..', 'admin-key.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);
  for (const p of candidatos) { try { return require(p); } catch (_) {} }
  return null;
}
const creds = cargarCreds();
if (!creds && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Faltan credenciales admin (service-account.json o GOOGLE_APPLICATION_CREDENTIALS).');
  process.exit(1);
}
admin.initializeApp(creds ? { credential: admin.credential.cert(creds) } : undefined);

const ENVIAR = process.argv.includes('--enviar');
let fallas = 0;
const ok   = (m) => console.log('  ✅', m);
const skip = (m) => console.log('  ⏭️ ', m);
const mal  = (m) => { console.error('  ❌', m); fallas++; };

const MUESTRA = {
  id: '_test', negocio: 'Barbería La Prueba', nombre: 'Ignacio', rubro: 'barbería',
  comuna: 'Providencia', instagram: 'synaptechspa', email: 'ignaciiio.mate@gmail.com',
  optOutToken: 'test', notas: 'Prospecto ficticio del smoke test. YA USA AgendaPro.',
};

(async () => {
  console.log('\n— 1. Carga del módulo —');
  let pros;
  try {
    pros = require('../functions/prospeccion.js');
    ok('functions/prospeccion.js cargó sin reventar (requires y constantes sanos)');
  } catch (e) { mal(`no cargó: ${e.message}`); process.exit(1); }
  for (const fn of ['prospeccionEstado', 'prospeccionAccion', 'prospeccionOptOut',
    'prospeccionRescateCron', 'prospeccionEmailCron', 'prospeccionReactivacionCron',
    'prospeccionSenalConversacion', 'prospeccionSenalLead']) {
    if (pros[fn]) ok(`exporta ${fn}`); else mal(`falta el export ${fn}`);
  }

  console.log('\n— 2. Textos masticados —');
  const rescate = pros._textoRescate('María José Pérez');
  if (rescate.includes('María José') === false && rescate.includes('María')) ok(`rescate usa solo el primer nombre: "${rescate.slice(0, 60)}…"`);
  else if (rescate.startsWith('¡Hola María')) ok(`rescate saluda por nombre: "${rescate.slice(0, 60)}…"`);
  else mal(`texto de rescate raro: ${rescate.slice(0, 80)}`);
  const sinNombre = pros._textoRescate('');
  if (sinNombre.startsWith('¡Hola!')) ok('rescate sin nombre no queda cojo');
  else mal(`rescate sin nombre: ${sinNombre.slice(0, 40)}`);

  console.log('\n— 3. Redacción con Claude —');
  const akey = process.env.ANTHROPIC_API_KEY;
  if (!akey) skip('sin ANTHROPIC_API_KEY en el env — me salto la redacción');
  let borrador = null;
  if (akey) {
    borrador = await pros._redactarEmail(MUESTRA, 1, akey);
    if (borrador && borrador.asunto && borrador.html) {
      ok(`email redactado — asunto: "${borrador.asunto}"`);
      console.log('  ── html ──\n' + borrador.html.replace(/^/gm, '  | '));
    } else mal('redactarEmail devolvió null (JSON inválido del modelo)');

    const dm = await pros._redactarDM(MUESTRA, akey);
    if (dm && dm.length > 40) {
      ok('DM redactado:');
      console.log(dm.replace(/^/gm, '  | '));
    } else mal(`DM vacío o demasiado corto: "${dm}"`);
  }

  console.log('\n— 4. Correo de prueba a Ignacio —');
  const rkey = process.env.RESEND_API_KEY;
  if (!ENVIAR)      skip('sin --enviar — no se manda nada');
  else if (!rkey)   mal('pediste --enviar pero falta RESEND_API_KEY en el env');
  else if (!borrador) mal('pediste --enviar pero no hay borrador (¿falló la redacción?)');
  else {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rkey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ignacio de SynapTech <hola@synaptechspa.cl>',
        to: ['ignaciiio.mate@gmail.com'],
        subject: `[PRUEBA prospección] ${borrador.asunto}`,
        html: borrador.html + '<hr><p style="font-size:12px;color:#888">Smoke test de functions/prospeccion.js — así se vería el correo 1 de la secuencia.</p>',
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.id) ok(`enviado a ignaciiio.mate@gmail.com (id ${j.id})`);
    else mal(`Resend respondió ${res.status}: ${JSON.stringify(j)}`);
  }

  console.log('\n— 5. Funnel de la cartera —');
  const snap = await admin.firestore().collection('_synaptechProspectos').get();
  const funnel = {};
  snap.forEach((d) => { const e = (d.data() || {}).estado || '?'; funnel[e] = (funnel[e] || 0) + 1; });
  console.log(`  ${snap.size} prospectos — ${JSON.stringify(funnel)}`);

  console.log(fallas ? `\n❌ ${fallas} falla(s)` : '\n✅ Humo limpio');
  process.exit(fallas ? 1 : 0);
})().catch((e) => { console.error('El test reventó:', e); process.exit(1); });
