#!/usr/bin/env node
'use strict';

/*
 * resumen-prospeccion-wsp.js
 *
 * Arma el estado de la cartera de prospección (`_synaptechProspectos`) y se lo
 * manda a Ignacio por su WhatsApp comercial (56983568212, chip de ventas
 * instance_plat_ventas). El mismo dato se ve en ops → 🚀 Prospección; esto es
 * el empujón "no dependas de estar mirando la pantalla".
 *
 * Secrets: EVOLUTION_API_URL / EVOLUTION_API_KEY por env. Para sacarlos:
 *   npx firebase-tools functions:secrets:access EVOLUTION_API_URL
 *   npx firebase-tools functions:secrets:access EVOLUTION_API_KEY
 *
 * Uso:
 *   node scripts/resumen-prospeccion-wsp.js          # arma y ENVÍA
 *   node scripts/resumen-prospeccion-wsp.js --dry    # solo imprime el texto
 */

const path  = require('path');
const admin = require('firebase-admin');

function cargarCreds() {
  const cs = [
    path.join(__dirname, '..', 'service-account.json'),
    path.join(__dirname, '..', 'functions', 'service-account.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);
  for (const p of cs) { try { return require(p); } catch (_) {} }
  return null;
}
const DRY = process.argv.includes('--dry');
const creds = cargarCreds();
if (!creds && !process.env.GOOGLE_APPLICATION_CREDENTIALS) { console.error('Faltan credenciales admin.'); process.exit(1); }
admin.initializeApp(creds ? { credential: admin.credential.cert(creds) } : undefined);

const IGNACIO = '56983568212';
const INSTANCIA = 'instance_plat_ventas';
const ORIGEN_LBL = { massiel: 'Kit Massiel', osm: 'OpenStreetMap', agendapro: 'AgendaPro ⚡', weibook: 'Weibook ⚡', manual: 'a mano', lead: 'inbound' };

(async () => {
  const snap = await admin.firestore().collection('_synaptechProspectos').get();
  const ps = snap.docs.map((d) => d.data() || {});
  const activos = ps.filter((p) => !['descartado', 'optout'].includes(p.estado));

  const cont = (arr, key) => arr.reduce((m, p) => { const k = key(p) || '?'; m[k] = (m[k] || 0) + 1; return m; }, {});
  const porOrigen = cont(activos, (p) => p.origen);
  const porComuna = cont(activos, (p) => p.comuna);
  const porEstado = cont(ps, (p) => p.estado);
  const dorados = activos.filter((p) => p.origen === 'agendapro' || p.origen === 'weibook' || /agendapro|weibook/i.test(p.notas || '')).length;
  const conIG  = activos.filter((p) => p.instagram).length;
  const conTel = activos.filter((p) => p.telefono).length;
  const conMapa = activos.filter((p) => Number.isFinite(Number(p.lat))).length;

  const orden = (obj, labels) => Object.entries(obj).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  · ${(labels && labels[k]) || k}: ${v}`).join('\n');

  const texto = [
    '🚀 *Prospección — estado de la cartera*',
    '',
    `📊 *${activos.length}* prospectos activos${porEstado.descartado || porEstado.optout ? ` (+${(porEstado.descartado || 0) + (porEstado.optout || 0)} fuera)` : ''}`,
    `⚡ *${dorados}* dorados (ya usan agenda: AgendaPro/Weibook)`,
    `📸 ${conIG} con Instagram · 💬 ${conTel} con teléfono · 🗺 ${conMapa} en el mapa`,
    '',
    '*Por fuente:*',
    orden(porOrigen, ORIGEN_LBL),
    '',
    '*Por zona:*',
    orden(porComuna),
    '',
    '*Embudo:*',
    `  🧊 ${porEstado.frio || 0} fríos · 📨 ${porEstado.contactado || 0} contactados · 💬 ${porEstado.respondio || 0} respondieron · 🤝 ${porEstado.reunion || 0} reunión`,
    '',
    'Detalle y mapa en ops → 🚀 Prospección.',
  ].join('\n');

  if (DRY) { console.log(texto); return; }

  const url = process.env.EVOLUTION_API_URL, key = process.env.EVOLUTION_API_KEY;
  if (!url || !key) { console.error('Faltan EVOLUTION_API_URL / EVOLUTION_API_KEY en el env.'); console.log('\n--- texto ---\n' + texto); process.exit(1); }
  const { crearCliente } = require(path.join(__dirname, '..', 'functions', 'evolution', 'client'));
  const cli = crearCliente({ baseUrl: url, apiKey: key });
  await cli.enviarTexto(INSTANCIA, IGNACIO, texto);
  console.log('✅ Resumen enviado al WhatsApp de Ignacio.\n');
  console.log(texto);
  process.exit(0);
})().catch((e) => { console.error('Resumen falló:', e); process.exit(1); });
