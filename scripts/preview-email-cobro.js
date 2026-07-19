/* ═══════════════════════════════════════════════════════════════
 * preview-email-cobro.js — Envía el aviso de mensualidad a un correo
 * para revisarlo por diseño.
 *
 * Usa la MISMA plantilla que la Cloud Function
 * (functions/lib/email-cobro-template.js), así que lo que llega es
 * idéntico a lo que reciben los locales.
 *
 * La API key sale del secret de Firebase:
 *   npx firebase-tools functions:secrets:access RESEND_API_KEY
 *
 * Uso:
 *   RESEND_API_KEY=... node scripts/preview-email-cobro.js correo@dominio.cl
 *   RESEND_API_KEY=... node scripts/preview-email-cobro.js correo@dominio.cl --dias -3
 * ═══════════════════════════════════════════════════════════════ */
const path = require('path');
const { buildMensaje, buildEmailHtml } =
  require(path.resolve(__dirname, '..', 'functions', 'lib', 'email-cobro-template.js'));

const TO      = process.argv[2];
const diasArg = process.argv.indexOf('--dias');
const DIAS    = diasArg > -1 ? Number(process.argv[diasArg + 1]) : -3;
const MONTO   = 25000;
const KEY     = process.env.RESEND_API_KEY;

if (!TO || !TO.includes('@')) { console.error('Falta el correo destino.'); process.exit(1); }
if (!KEY) { console.error('Falta RESEND_API_KEY en el entorno.'); process.exit(1); }

async function main() {
  const { title, body } = buildMensaje(DIAS, MONTO);
  const html = buildEmailHtml({
    title, body,
    tid: 'lumen',
    nombreLocal: "D'Jones Barbería",
  });

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'SynapTech <cobros@synaptechspa.cl>',
      to:      [TO],
      subject: `[PREVIEW] ${title}`,
      html,
    }),
  });
  const out = await res.json();
  if (!res.ok) { console.error('✗ Resend:', res.status, JSON.stringify(out)); process.exit(1); }

  console.log(`✓ Enviado a ${TO}`);
  console.log(`  variante: dias=${DIAS}  →  "${title}"`);
  console.log(`  id: ${out.id || '(sin id)'}`);
}

main().catch(e => { console.error(e); process.exit(1); });
