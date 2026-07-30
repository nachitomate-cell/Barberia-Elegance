'use strict';

// scripts/wa-plantillas-estado.js
// ─────────────────────────────────────────────────────────────────
// ¿Meta ya aprobó las plantillas? Consulta el estado real en la WABA.
//
// El token sale del secret de Firebase, NO del repo. Si no tienes la
// CLI logueada, exporta WHATSAPP_TOKEN a mano antes de correrlo.
//
// Estados posibles:
//   PENDING   → en revisión (utility suele tardar minutos–horas)
//   APPROVED  → lista para enviarse
//   REJECTED  → mira `rejected_reason` y corrige el texto
//   PAUSED / DISABLED → Meta la frenó por mala calidad (muchos bloqueos)
//
// Uso:
//   node scripts/wa-plantillas-estado.js
//   node scripts/wa-plantillas-estado.js --watch    → revisa cada 60s
// ─────────────────────────────────────────────────────────────────

const { execSync } = require('child_process');

// WABA REAL del número +56 9 6589 7142. OJO: NO es la del número de
// prueba (1029922782857180) — ese fue un bug histórico, ver el runbook.
const WABA = '1585275879793911';

function token() {
  if (process.env.WHATSAPP_TOKEN) return process.env.WHATSAPP_TOKEN.trim();
  try {
    return execSync('firebase functions:secrets:access WHATSAPP_TOKEN', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_) {
    console.error('✗ No pude leer WHATSAPP_TOKEN.');
    console.error('  Loguéate con `firebase login`, o exporta WHATSAPP_TOKEN a mano.');
    process.exit(1);
  }
}

const ICONO = {
  APPROVED: '✅', PENDING: '⏳', REJECTED: '❌',
  PAUSED: '⏸️ ', DISABLED: '🚫',
};

async function consultar(tok) {
  const url = `https://graph.facebook.com/v23.0/${WABA}/message_templates`
    + `?fields=name,status,category,language,rejected_reason,quality_score`
    + `&access_token=${encodeURIComponent(tok)}`;
  const res  = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`✗ Graph ${res.status}: ${body?.error?.message || 'sin detalle'}`);
    if (body?.error?.code === 190) console.error('  El token expiró o fue revocado — regenera el permanente.');
    process.exit(1);
  }
  return body.data || [];
}

function pintar(plantillas) {
  const ahora = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date());

  console.log(`\n🗂  Plantillas de la WABA ${WABA}   (${ahora} Chile)\n`);
  for (const p of plantillas) {
    const ic = ICONO[p.status] || '  ';
    console.log(`  ${ic} ${String(p.name).padEnd(24)} ${String(p.status).padEnd(9)} ${p.category || ''} · ${p.language || ''}`);
    if (p.status === 'REJECTED' && p.rejected_reason && p.rejected_reason !== 'NONE') {
      console.log(`       motivo del rechazo: ${p.rejected_reason}`);
    }
    const q = p.quality_score && p.quality_score.score;
    if (q && q !== 'UNKNOWN') console.log(`       calidad: ${q}`);
  }
  console.log('');
  return plantillas;
}

(async () => {
  const tok   = token();
  const watch = process.argv.includes('--watch');
  const objetivo = 'recordatorio_cita';

  // Sin process.exit(): en Windows, salir de golpe justo después del fetch
  // dispara un assert de libuv (UV_HANDLE_CLOSING). Dejamos que Node cierre solo.
  if (!watch) { pintar(await consultar(tok)); return; }

  console.log(`Vigilando "${objetivo}" cada 60s. Ctrl+C para salir.`);
  for (;;) {
    const plantillas = pintar(await consultar(tok));
    const p = plantillas.find(x => x.name === objetivo);
    if (p && p.status === 'APPROVED') {
      console.log(`🎉 "${objetivo}" quedó APROBADA.\n`);
      console.log('Siguiente paso:  node scripts/wa-recordatorio-piloto.js --go-live\n');
      process.exit(0);
    }
    if (p && p.status === 'REJECTED') {
      console.log(`❌ "${objetivo}" fue RECHAZADA (${p.rejected_reason}). Hay que corregir el texto y reenviarla.\n`);
      process.exit(1);
    }
    await new Promise(r => setTimeout(r, 60000));
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
