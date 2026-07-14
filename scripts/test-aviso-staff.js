/**
 * Prueba del aviso de cita al staff (aviso-cita-staff.js) sin crear citas:
 * resuelve destinatarios reales del tenant y envía el email de muestra
 * al correo indicado (no al staff).
 *
 * Uso: RESEND_API_KEY=re_xxx node scripts/test-aviso-staff.js correo@destino.cl
 */
// Misma instancia de firebase-admin que usa el módulo bajo prueba
const admin = require('../functions/node_modules/firebase-admin');
const fs = require('fs');
const path = require('path');

const SA = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8'))),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();

const { _test } = require('../functions/aviso-cita-staff.js');
const TENANT = 'elbarberomoderno';
const DESTINO = process.argv[2];
const API_KEY = process.env.RESEND_API_KEY;

async function run() {
  if (!DESTINO || !API_KEY) { console.error('Falta destino o RESEND_API_KEY'); process.exit(1); }

  const citaFake = {
    clienteNombre:  'Cliente de Prueba (SynapTech)',
    servicioNombre: 'Corte de prueba',
    fecha: '2026-07-15',
    hora:  '10:00',
    barbero: 'Jhoseth Morales',
    barberoId: 'jhoseth-morales',
  };

  const destinatariosReales = await _test.destinatariosConfigurados(TENANT);
  console.log('Destinatarios configurados en _system (explícitos):', destinatariosReales);

  const cfg  = await _test.brandingDe(TENANT);
  console.log('Branding:', cfg.nombre, '| from:', cfg.from);

  const html = _test.buildStaffHtml({
    cfg, cita: citaFake,
    panelUrl: String(cfg.dashboardUrl || '').replace(/\/dashboard\/?$/, '/gestion-interna/agenda'),
  });

  const r = await _test.sendResend(API_KEY, {
    from: cfg.from,
    to: [DESTINO],
    subject: `📅 Nueva cita — ${citaFake.fecha} ${citaFake.hora} · ${citaFake.clienteNombre} [PRUEBA]`,
    html,
  });
  console.log('Email de prueba enviado a', DESTINO, '— id:', r.id);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
