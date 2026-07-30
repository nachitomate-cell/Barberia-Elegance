/**
 * test-mailer.js — verifica la convivencia Resend + Brevo de functions/lib/mailer.js
 * sin mandar un solo correo real: reemplaza global.fetch por un doble de prueba.
 *
 * Uso: node scripts/test-mailer.js       (o npm run test:mailer)
 */
'use strict';

process.env.RESEND_API_KEY = 're_fake_para_test';
process.env.BREVO_API_KEY  = 'xkeysib_fake_para_test';
// Sin contador diario: el test no debe tocar Firestore ni la red.
process.env.MAILER_SIN_TELEMETRIA = '1';

const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
try { admin.initializeApp({ projectId: 'test-mailer' }); } catch (_) {}

const { enviarEmail, _internos } = require('../functions/lib/mailer.js');

// ── Doble de prueba de fetch ─────────────────────────────────────────────────
let llamadas = [];
function stubFetch(respuestas) {
  llamadas = [];
  global.fetch = async (url, opts) => {
    const proveedor = url.includes('brevo') ? 'brevo' : 'resend';
    llamadas.push({ proveedor, url, body: JSON.parse(opts.body), headers: opts.headers });
    const r = respuestas[proveedor];
    if (typeof r === 'function') return r();
    return {
      ok: r.status < 300,
      status: r.status,
      json: async () => r.body || {},
      text: async () => JSON.stringify(r.body || {}),
    };
  };
}

const OK_RESEND = { status: 200, body: { id: 'res_123' } };
const OK_BREVO  = { status: 201, body: { messageId: 'brv_456' } };
const CUOTA_RESEND = { status: 429, body: { name: 'daily_quota_exceeded', message: 'You have reached your daily quota' } };
const CUOTA_BREVO  = { status: 402, body: { code: 'not_enough_credits' } };

// ── Mini runner ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, nombre, detalle) {
  if (cond) { pass++; console.log(`  ✓ ${nombre}`); }
  else { fail++; console.log(`  ✗ ${nombre}${detalle ? ' → ' + detalle : ''}`); }
}

const PAYLOAD = {
  from:    'Elegance Barbershop <citas@synaptechspa.cl>',
  to:      ['cliente@ejemplo.cl'],
  subject: 'Cita confirmada — Ñoño & Piñón',
  html:    '<p>Hola 👋</p>',
};

async function run() {
  console.log('\n── 1. Parseo del remitente y destinatarios ──');
  const f1 = _internos.parseFrom('Elegance Barbershop <citas@synaptechspa.cl>');
  ok(f1.nombre === 'Elegance Barbershop' && f1.email === 'citas@synaptechspa.cl',
     'separa "Nombre <email>"', JSON.stringify(f1));
  const f2 = _internos.parseFrom('citas@synaptechspa.cl');
  ok(f2.nombre === '' && f2.email === 'citas@synaptechspa.cl', 'acepta email pelado');
  const f3 = _internos.parseFrom("D'Jones Barber <citas@synaptechspa.cl>");
  ok(f3.nombre === "D'Jones Barber", 'respeta apóstrofes y tildes en el nombre');
  ok(_internos.normalizarDestinatarios('a@b.cl').length === 1, 'to como string → array');
  ok(_internos.normalizarDestinatarios(['a@b.cl', 'c@d.cl']).length === 2, 'to como array');

  console.log('\n── 2. Ruta feliz por cada canal ──');
  stubFetch({ resend: OK_RESEND, brevo: OK_BREVO });
  let r = await enviarEmail(PAYLOAD, { primario: 'resend', etiqueta: 'test' });
  ok(r.ok && r.proveedor === 'resend' && r.id === 'res_123', 'primario resend → usa Resend', JSON.stringify(r));
  ok(llamadas.length === 1, 'no gasta una request de más');

  stubFetch({ resend: OK_RESEND, brevo: OK_BREVO });
  r = await enviarEmail(PAYLOAD, { primario: 'brevo', etiqueta: 'test' });
  ok(r.ok && r.proveedor === 'brevo' && r.id === 'brv_456', 'primario brevo → usa Brevo', JSON.stringify(r));

  console.log('\n── 3. Traducción del payload a Brevo ──');
  const b = llamadas[0].body;
  ok(b.sender.email === 'citas@synaptechspa.cl' && b.sender.name === 'Elegance Barbershop',
     'from → sender {name,email}', JSON.stringify(b.sender));
  ok(Array.isArray(b.to) && b.to[0].email === 'cliente@ejemplo.cl', 'to → [{email}]');
  ok(b.htmlContent === PAYLOAD.html, 'html → htmlContent');
  ok(b.subject === 'Cita confirmada — Ñoño & Piñón', 'el asunto conserva tildes y ñ');
  ok(llamadas[0].headers['api-key'] === 'xkeysib_fake_para_test', 'Brevo autentica con header api-key');
  ok(!('Authorization' in llamadas[0].headers), 'no filtra el Bearer de Resend a Brevo');

  console.log('\n── 4. Failover Resend agotado → Brevo ──');
  stubFetch({ resend: CUOTA_RESEND, brevo: OK_BREVO });
  r = await enviarEmail(PAYLOAD, { primario: 'resend', etiqueta: 'test' });
  ok(r.ok && r.proveedor === 'brevo', 'sin cuota en Resend, el correo igual sale por Brevo', JSON.stringify(r));
  ok(llamadas.length === 2, 'intentó Resend y luego Brevo');

  console.log('\n── 5. Resend agotado queda marcado (no se reintenta) ──');
  stubFetch({ resend: CUOTA_RESEND, brevo: OK_BREVO });
  r = await enviarEmail(PAYLOAD, { primario: 'resend', etiqueta: 'test' });
  ok(r.ok && r.proveedor === 'brevo', 'segundo envío también sale');
  ok(llamadas.length === 1 && llamadas[0].proveedor === 'brevo',
     'ya no gasta una request en el canal agotado', `llamadas=${llamadas.map(l => l.proveedor).join(',')}`);

  console.log('\n── 6. Failover en la otra dirección (Brevo → Resend) ──');
  // Nueva instancia del módulo: limpia el estado de "agotado" del bloque anterior.
  delete require.cache[require.resolve('../functions/lib/mailer.js')];
  const { enviarEmail: enviar2 } = require('../functions/lib/mailer.js');
  stubFetch({ resend: OK_RESEND, brevo: CUOTA_BREVO });
  r = await enviar2(PAYLOAD, { primario: 'brevo', etiqueta: 'test' });
  ok(r.ok && r.proveedor === 'resend', 'sin créditos en Brevo, cae a Resend', JSON.stringify(r));

  console.log('\n── 7. Los dos caídos ──');
  stubFetch({ resend: CUOTA_RESEND, brevo: CUOTA_BREVO });
  r = await enviar2(PAYLOAD, { primario: 'resend', etiqueta: 'test', silencioso: true });
  ok(!r.ok && /resend/i.test(r.error) && /brevo/i.test(r.error),
     'modo silencioso devuelve ok:false con los dos errores', r.error);

  stubFetch({ resend: CUOTA_RESEND, brevo: CUOTA_BREVO });
  let lanzo = false;
  try { await enviar2(PAYLOAD, { primario: 'resend', etiqueta: 'test' }); } catch (_) { lanzo = true; }
  ok(lanzo, 'sin modo silencioso, lanza (el caller decide qué hacer)');

  console.log('\n── 8. Error de validación no se reintenta en el otro canal ──');
  delete require.cache[require.resolve('../functions/lib/mailer.js')];
  const { enviarEmail: enviar3 } = require('../functions/lib/mailer.js');
  stubFetch({
    resend: { status: 422, body: { name: 'validation_error', message: 'Invalid `to` field' } },
    brevo:  OK_BREVO,
  });
  r = await enviar3(PAYLOAD, { primario: 'resend', etiqueta: 'test', silencioso: true });
  ok(!r.ok, 'un 422 falla en vez de quemar cuota del otro proveedor');
  ok(llamadas.length === 1, 'no llamó a Brevo por un email inválido',
     `llamadas=${llamadas.map(l => l.proveedor).join(',')}`);

  console.log('\n── 9. Brevo con IP no autorizada (401) → cae a Resend ──');
  // Caso real: Brevo trae activado "Authorised IPs" y rechaza con 401 desde las
  // IPs dinámicas de Cloud Functions. Es falla del PROVEEDOR, no del mensaje:
  // el correo tiene que salir igual por el otro canal.
  delete require.cache[require.resolve('../functions/lib/mailer.js')];
  const { enviarEmail: enviar4 } = require('../functions/lib/mailer.js');
  const IP_NO_AUTORIZADA = { status: 401, body: {
    code: 'unauthorized',
    message: 'We have detected you are using an unrecognised IP address',
  } };
  stubFetch({ brevo: IP_NO_AUTORIZADA, resend: OK_RESEND });
  r = await enviar4(PAYLOAD, { primario: 'brevo', etiqueta: 'test' });
  ok(r.ok && r.proveedor === 'resend', 'el 401 de Brevo NO descarta el correo: sale por Resend', JSON.stringify(r));

  stubFetch({ brevo: IP_NO_AUTORIZADA, resend: OK_RESEND });
  r = await enviar4(PAYLOAD, { primario: 'brevo', etiqueta: 'test' });
  ok(llamadas.length === 1 && llamadas[0].proveedor === 'resend',
     'y deja de golpear a Brevo el resto del día',
     `llamadas=${llamadas.map(l => l.proveedor).join(',')}`);

  console.log('\n── 10. Cliente en la blocklist de Brevo → sale por Resend ──');
  // Si un cliente apretó "darse de baja" alguna vez, Brevo lo bloquea. Su cita
  // igual tiene que confirmarse: Resend no comparte esa blocklist.
  delete require.cache[require.resolve('../functions/lib/mailer.js')];
  const { enviarEmail: enviar5 } = require('../functions/lib/mailer.js');
  stubFetch({
    brevo:  { status: 400, body: { code: 'invalid_parameter', message: 'Contact is blacklisted' } },
    resend: OK_RESEND,
  });
  r = await enviar5(PAYLOAD, { primario: 'brevo', etiqueta: 'test' });
  ok(r.ok && r.proveedor === 'resend',
     'un destinatario bloqueado en Brevo no pierde su confirmación', JSON.stringify(r));
  ok(llamadas.length === 2, 'intentó Brevo y luego Resend');

  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} pass · ${fail} fail\n`);
  process.exit(fail === 0 ? 0 : 1);
}

run().catch(e => { console.error(e); process.exit(1); });
