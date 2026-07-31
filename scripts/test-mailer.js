/**
 * test-mailer.js — verifica los CUATRO canales de functions/lib/mailer.js
 * sin mandar un solo correo real: reemplaza global.fetch por un doble de prueba.
 *
 * Uso: node scripts/test-mailer.js       (o npm run test:mailer)
 */
'use strict';

process.env.RESEND_API_KEY      = 're_fake_sy';
process.env.BREVO_API_KEY       = 'xkeysib-fake_sy';
process.env.BREVO_BIOO_API_KEY  = 'xkeysib-fake_bioo';
process.env.RESEND_BIOO_API_KEY = 're_fake_bioo';
// Sin contador diario: el test no debe tocar Firestore ni la red.
process.env.MAILER_SIN_TELEMETRIA = '1';

const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
try { admin.initializeApp({ projectId: 'test-mailer' }); } catch (_) {}

const RUTA = '../functions/lib/mailer.js';
let { enviarEmail, _internos, CANALES } = require(RUTA);

/** Instancia limpia: borra el estado de "canal caído" entre bloques. */
function recargar() {
  delete require.cache[require.resolve(RUTA)];
  const m = require(RUTA);
  enviarEmail = m.enviarEmail; _internos = m._internos; CANALES = m.CANALES;
  return m.enviarEmail;
}

// ── Doble de prueba de fetch ─────────────────────────────────────────────────
// El stub distingue CUENTAS, no solo proveedores: dos canales pueden hablar con
// la misma API y hay que poder hacer fallar uno y no el otro.
let llamadas = [];
function stubFetch(respuestas) {
  llamadas = [];
  global.fetch = async (url, opts) => {
    const esBrevo = url.includes('brevo');
    const key = esBrevo ? opts.headers['api-key']
                        : String(opts.headers.Authorization || '').replace('Bearer ', '');
    const canal = key.includes('bioo') ? (esBrevo ? 'brevo_bioo' : 'resend_bioo')
                                       : (esBrevo ? 'brevo_sy'   : 'resend_sy');
    llamadas.push({ canal, body: JSON.parse(opts.body) });
    const r = respuestas[canal] || respuestas._defecto || { status: 200, body: {} };
    return {
      ok: r.status < 300,
      status: r.status,
      json: async () => r.body || {},
      text: async () => JSON.stringify(r.body || {}),
    };
  };
}

const OK_RESEND     = { status: 200, body: { id: 'res_1' } };
const OK_BREVO      = { status: 201, body: { messageId: 'brv_1' } };
const CUOTA_RESEND  = { status: 429, body: { name: 'daily_quota_exceeded', message: 'daily quota' } };
const CUOTA_BREVO   = { status: 402, body: { code: 'not_enough_credits' } };
const IP_BLOQUEADA  = { status: 401, body: { code: 'unauthorized', message: 'unrecognised IP address' } };
const TODO_OK       = { brevo_sy: OK_BREVO, brevo_bioo: OK_BREVO, resend_sy: OK_RESEND, resend_bioo: OK_RESEND };

// ── Mini runner ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, nombre, detalle) {
  if (cond) { pass++; console.log(`  ✓ ${nombre}`); }
  else { fail++; console.log(`  ✗ ${nombre}${detalle ? ' → ' + detalle : ''}`); }
}

const CITA = {
  from:    'Elegance Barbershop <citas@synaptechspa.cl>',
  to:      ['cliente@ejemplo.cl'],
  subject: 'Cita confirmada — Ñoño & Piñón',
  html:    '<p>Hola 👋</p>',
};
const DESDE_BIOO = { ...CITA, from: 'bioo <hola@bioo.cl>' };

async function run() {
  console.log('\n── 1. Parseo de remitente y destinatarios ──');
  const f1 = _internos.parseFrom('Elegance Barbershop <citas@synaptechspa.cl>');
  ok(f1.nombre === 'Elegance Barbershop' && f1.email === 'citas@synaptechspa.cl', 'separa "Nombre <email>"');
  ok(_internos.parseFrom('citas@synaptechspa.cl').email === 'citas@synaptechspa.cl', 'acepta email pelado');
  ok(_internos.parseFrom("D'Jones Barber <citas@synaptechspa.cl>").nombre === "D'Jones Barber", 'respeta apóstrofes');
  ok(_internos.normalizarDestinatarios('a@b.cl').length === 1, 'to como string → array');
  ok(_internos.normalizarDestinatarios(['a@b.cl', 'c@d.cl']).length === 2, 'to como array');

  console.log('\n── 2. Dominio del remitente ──');
  ok(_internos.dominioDe('X <a@BIOO.CL>') === 'bioo.cl', 'normaliza a minúsculas');
  ok(_internos.puedeMandarDesde('resend_bioo', 'bioo.cl'), 'resend_bioo tiene bioo.cl');
  ok(!_internos.puedeMandarDesde('resend_bioo', 'synaptechspa.cl'), 'resend_bioo NO tiene synaptechspa.cl');
  ok(_internos.puedeMandarDesde('brevo_bioo', 'synaptechspa.cl'), 'brevo_bioo sí tiene los dos dominios');
  ok(_internos.puedeMandarDesde('brevo_sy', 'mail.synaptechspa.cl'), 'un subdominio entra por su dominio raíz');

  console.log('\n── 3. Grupo citas: las dos cuentas Brevo, y se reparten ──');
  const usados = new Set();
  for (let i = 0; i < 40; i++) {
    stubFetch(TODO_OK);
    const r = await enviarEmail(CITA, { grupo: 'citas', etiqueta: 'test' });
    usados.add(r.canal);
  }
  ok(usados.has('brevo_sy') && usados.has('brevo_bioo'),
     'reparte entre brevo_sy y brevo_bioo (600/día reales)', [...usados].join(','));
  ok(!usados.has('resend_sy'), 'no toca Resend mientras Brevo responda');

  console.log('\n── 4. Grupo interno: Resend primero ──');
  stubFetch(TODO_OK);
  let r = await enviarEmail(CITA, { grupo: 'interno', etiqueta: 'test' });
  ok(r.canal === 'resend_sy', 'el goteo interno va por la cuota chica', r.canal);

  console.log('\n── 5. Traducción a Brevo ──');
  stubFetch({ ...TODO_OK, resend_sy: CUOTA_RESEND });
  await enviarEmail(CITA, { grupo: 'citas', etiqueta: 'test' });
  const b = llamadas[0].body;
  ok(b.sender.email === 'citas@synaptechspa.cl' && b.sender.name === 'Elegance Barbershop', 'from → sender');
  ok(Array.isArray(b.to) && b.to[0].email === 'cliente@ejemplo.cl', 'to → [{email}]');
  ok(b.htmlContent === CITA.html, 'html → htmlContent');
  ok(b.subject === 'Cita confirmada — Ñoño & Piñón', 'el asunto conserva tildes y ñ');

  console.log('\n── 6. Una cuenta Brevo agotada → la otra la cubre ──');
  recargar();
  stubFetch({ ...TODO_OK, brevo_sy: CUOTA_BREVO });
  const canales6 = [];
  for (let i = 0; i < 6; i++) {
    canales6.push((await enviarEmail(CITA, { grupo: 'citas', etiqueta: 'test' })).canal);
  }
  ok(canales6.every(c => c === 'brevo_bioo'), 'todo sale por brevo_bioo', canales6.join(','));
  ok(!canales6.includes('resend_sy'), 'sin bajar a Resend: todavía hay Brevo disponible');

  console.log('\n── 7. Los 600 agotados → cae a Resend ──');
  recargar();
  stubFetch({ ...TODO_OK, brevo_sy: CUOTA_BREVO, brevo_bioo: CUOTA_BREVO });
  r = await enviarEmail(CITA, { grupo: 'citas', etiqueta: 'test' });
  ok(r.ok && r.canal === 'resend_sy', 'la cita igual se confirma', JSON.stringify(r));

  console.log('\n── 8. Nunca se manda desde un dominio no autenticado ──');
  recargar();
  stubFetch(TODO_OK);
  const canales8 = [];
  for (let i = 0; i < 12; i++) {
    canales8.push((await enviarEmail(DESDE_BIOO, { grupo: 'bioo', etiqueta: 'test' })).canal);
  }
  ok(canales8.every(c => c === 'resend_bioo' || c === 'brevo_bioo'),
     'un from @bioo.cl solo sale por canales con bioo.cl', [...new Set(canales8)].join(','));

  recargar();
  stubFetch(TODO_OK);
  // Un from @bioo.cl en grupo 'citas' SÍ debe salir: brevo_bioo está en ese
  // grupo y tiene bioo.cl autenticado. Los grupos ordenan, el dominio filtra.
  r = await enviarEmail(DESDE_BIOO, { grupo: 'citas', etiqueta: 'test' });
  ok(r.ok && r.canal === 'brevo_bioo', 'el filtro de dominio no bloquea de más', JSON.stringify(r));

  recargar();
  stubFetch(TODO_OK);
  // Dominio que NINGUNA cuenta tiene autenticado: acá sí hay que frenar. Si se
  // intentara, Brevo respondería 201 y el correo moriría en silencio.
  r = await enviarEmail({ ...CITA, from: 'X <hola@dominio-ajeno.cl>' },
                        { grupo: 'citas', etiqueta: 'test', silencioso: true });
  ok(!r.ok && /dominio/.test(r.error), 'falla claro en vez de mandar algo que no llegaría', r.error);
  ok(llamadas.length === 0, 'y ni siquiera intenta el envío');

  console.log('\n── 9. IP no autorizada (401) → no descarta el correo ──');
  recargar();
  stubFetch({ ...TODO_OK, brevo_sy: IP_BLOQUEADA, brevo_bioo: IP_BLOQUEADA });
  r = await enviarEmail(CITA, { grupo: 'citas', etiqueta: 'test' });
  ok(r.ok && r.canal === 'resend_sy', 'el 401 es falla del canal, no del mensaje', JSON.stringify(r));

  console.log('\n── 10. Destinatario en la blocklist de Brevo ──');
  recargar();
  stubFetch({ ...TODO_OK,
    brevo_sy:   { status: 400, body: { code: 'invalid_parameter', message: 'Contact is blacklisted' } },
    brevo_bioo: { status: 400, body: { code: 'invalid_parameter', message: 'Contact is blacklisted' } } });
  r = await enviarEmail(CITA, { grupo: 'citas', etiqueta: 'test' });
  ok(r.ok && r.canal === 'resend_sy', 'quien se dio de baja igual recibe su confirmación', JSON.stringify(r));

  console.log('\n── 11. Error de validación no se propaga a los demás canales ──');
  recargar();
  stubFetch({ ...TODO_OK,
    brevo_sy:   { status: 422, body: { name: 'validation_error', message: 'Invalid `to`' } },
    brevo_bioo: { status: 422, body: { name: 'validation_error', message: 'Invalid `to`' } } });
  r = await enviarEmail(CITA, { grupo: 'citas', etiqueta: 'test', silencioso: true });
  ok(!r.ok, 'un 422 falla en vez de quemar cuota de los otros');
  ok(llamadas.length === 1, 'se detuvo en el primer canal', `llamadas=${llamadas.length}`);

  console.log('\n── 12. Canal sin key configurada se ignora ──');
  const guardada = process.env.RESEND_BIOO_API_KEY;
  process.env.RESEND_BIOO_API_KEY = 'PENDIENTE';   // cuenta que aún no existe
  recargar();
  stubFetch(TODO_OK);
  const canales12 = [];
  for (let i = 0; i < 8; i++) {
    canales12.push((await enviarEmail(DESDE_BIOO, { grupo: 'bioo', etiqueta: 'test' })).canal);
  }
  ok(canales12.every(c => c === 'brevo_bioo'),
     'un placeholder no cuenta como key: el grupo sigue andando por el otro canal',
     [...new Set(canales12)].join(','));
  process.env.RESEND_BIOO_API_KEY = guardada;

  console.log('\n── 13. Todos caídos ──');
  recargar();
  stubFetch({ brevo_sy: CUOTA_BREVO, brevo_bioo: CUOTA_BREVO, resend_sy: CUOTA_RESEND, resend_bioo: CUOTA_RESEND });
  r = await enviarEmail(CITA, { grupo: 'citas', etiqueta: 'test', silencioso: true });
  ok(!r.ok && /brevo/.test(r.error) && /resend/.test(r.error), 'silencioso devuelve ok:false con el detalle');

  stubFetch({ brevo_sy: CUOTA_BREVO, brevo_bioo: CUOTA_BREVO, resend_sy: CUOTA_RESEND, resend_bioo: CUOTA_RESEND });
  let lanzo = false;
  try { await enviarEmail(CITA, { grupo: 'citas', etiqueta: 'test' }); } catch (_) { lanzo = true; }
  ok(lanzo, 'sin silencioso, lanza y decide el caller');

  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} pass · ${fail} fail\n`);
  process.exit(fail === 0 ? 0 : 1);
}

run().catch(e => { console.error(e); process.exit(1); });
