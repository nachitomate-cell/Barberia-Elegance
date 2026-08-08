#!/usr/bin/env node
'use strict';

/*
 * importar-prospectos-weibook.js
 *
 * Importa a `_synaptechProspectos` los negocios de la V Región del directorio
 * PÚBLICO de Weibook (otra plataforma de agenda). Prospectos DORADOS igual que
 * los de AgendaPro: ya pagan por reservas online.
 *
 * ── Alcance y respeto (idéntico criterio que el importador de AgendaPro) ─────
 * SOLO superficies públicas que Weibook sirve a cualquier navegador:
 *   · book.weibook.co/sitemap.xml           → índice de negocios (branches)
 *   · book.weibook.co/ (home)               → buildId de Next.js
 *   · book.weibook.co/_next/data/{buildId}/branch/{slug}.json → detalle
 * NO se toca /api/ (está Disallow en su robots.txt), NO se falsifican headers
 * de origen, User-Agent honesto de navegador y ritmo moderado.
 *
 * Weibook NO tiene listado por ciudad para la V Región (solo La Serena y
 * Temuco), así que se recorren los ~427 "branch" del sitemap y se filtra por
 * country_code es-CL + comuna de la V Región (idCity.name es texto libre, el
 * match es tolerante).
 *
 * Idempotente: se salta slugs ya existentes.
 *
 * Uso:
 *   node scripts/importar-prospectos-weibook.js --dry
 *   node scripts/importar-prospectos-weibook.js
 */

const path   = require('path');
const crypto = require('crypto');
const admin  = require('firebase-admin');

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
if (!DRY && !creds && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Faltan credenciales admin.'); process.exit(1);
}
if (!DRY) admin.initializeApp(creds ? { credential: admin.credential.cert(creds) } : undefined);

const BASE = 'https://book.weibook.co';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

// Comunas de la V Región costera. `curauma` y `placilla` caen en Valparaíso.
const COMUNAS_V = ['vina del mar', 'valparaiso', 'concon', 'renaca', 'curauma', 'placilla',
  'quilpue', 'villa alemana', 'quillota', 'limache', 'olmue', 'casablanca', 'san antonio',
  'quintero', 'la calera', 'region valparaiso', 'region de valparaiso', 'v region'];
const RUBROS_OK = /barber|peluqu|salon|salón|estetic|estétic|belleza|spa|uña|una|manicure|pedicure|ceja|pestan|pestañ|depila|cosmet|maquilla|capilar|nail|tatua/i;

async function traer(url, json) {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': json ? 'application/json' : 'text/html' } });
      if (res.ok) return json ? await res.json() : await res.text();
      if (res.status === 429 || res.status >= 500) { process.stdout.write(` [${res.status}→60s] `); await dormir(60000); continue; }
      return null;                  // 404 = no es de acá, se salta sin ruido
    } catch (_) { await dormir(5000); }
  }
  return null;
}

function comunaDe(texto) {
  const n = norm(texto);
  const hit = COMUNAS_V.find((c) => n.includes(c));
  if (!hit) return null;
  // Etiqueta legible y consistente con el resto de la cartera.
  if (hit.includes('vina')) return 'Viña del Mar';
  if (hit === 'concon' || hit === 'renaca') return 'Viña del Mar';
  if (hit === 'curauma' || hit === 'placilla') return 'Curauma';
  if (hit.includes('valparaiso') || hit.includes('region')) return 'Valparaíso';
  return texto.split(/[-,]/)[0].trim().slice(0, 40) || 'Valparaíso';
}

(async () => {
  // 1. buildId de Next.js (cambia en cada deploy): del __NEXT_DATA__ de la home.
  const home = await traer(BASE + '/', false);
  const buildId = home && (home.match(/"buildId":"([^"]+)"/) || [])[1];
  if (!buildId) { console.error('No pude leer el buildId de Weibook.'); process.exit(1); }
  console.log('buildId:', buildId);
  await dormir(1000);

  // 2. Sitemap → slugs de "branch" (negocios con slug legible).
  const xml = await traer(BASE + '/sitemap.xml', false);
  if (!xml) { console.error('No pude bajar el sitemap.'); process.exit(1); }
  const branches = [...new Set((xml.match(/\/branch\/[^<]+/g) || []).map((u) => u.replace('/branch/', '').trim()))];
  console.log(`${branches.length} branches en el sitemap. Revisando cuáles son de la V Región…`);

  // 3. Detalle por branch, filtrando es-CL + comuna V Región.
  const encontrados = [];
  for (let i = 0; i < branches.length; i++) {
    const s = branches[i];
    const j = await traer(`${BASE}/_next/data/${buildId}/branch/${encodeURIComponent(s)}.json`, true);
    await dormir(1500);
    process.stdout.write(`\r  ${i + 1}/${branches.length} · ${encontrados.length} en V Región   `);
    const info = j && j.pageProps && j.pageProps.info && j.pageProps.info.dataInfo;
    if (!info) continue;
    const cc = (info.id_countrie && info.id_countrie.country_code) || '';
    if (norm(cc) !== 'es-cl' && norm(cc) !== 'cl') continue;
    const lugar = `${(info.idCity && info.idCity.name) || ''} ${info.address || ''} ${info.zone || ''}`;
    const comuna = comunaDe(lugar);
    if (!comuna) continue;
    const rubro = (Array.isArray(info.categoriesBusiness) ? info.categoriesBusiness.join(' ') : '') || '';
    if (rubro && !RUBROS_OK.test(rubro) && !RUBROS_OK.test(info.name || '')) continue;
    const ig = String(info.instagram || '').match(/([a-z0-9._]{2,30})\/?$/i);
    encontrados.push({
      slug: info.px_url || s, negocio: (info.name || s).trim(),
      direccion: info.address || '', comuna,
      rubro: (rubro || 'belleza').toLowerCase().slice(0, 40),
      telefono: String(info.telephone || '').replace(/\D/g, '').replace(/^0+/, '') || null,
      instagram: ig ? ig[1].toLowerCase() : null,
      rating: info.rating_average || null,
    });
  }
  console.log(`\n${encontrados.length} negocios de la V Región en Weibook.`);

  if (DRY) {
    const porC = {};
    encontrados.forEach((n) => { porC[n.comuna] = (porC[n.comuna] || 0) + 1; });
    console.log('por comuna:', JSON.stringify(porC));
    console.table(encontrados.slice(0, 25).map((n) => ({ negocio: n.negocio.slice(0, 26), comuna: n.comuna, ig: n.instagram || '—', tel: n.telefono || '—' })));
    return;
  }

  const db = admin.firestore();
  const { FieldValue } = admin.firestore;
  const { cargarClientes, esCliente } = require('./lib-clientes-existentes');
  const clientes = await cargarClientes(db);
  let creados = 0, existentes = 0, conIG = 0, conTel = 0, clientesSaltados = 0;
  for (const n of encontrados) {
    if (esCliente(clientes, n.negocio, n.instagram)) {
      console.log(`  — ${n.negocio}: ya es cliente, no se prospecta`);
      clientesSaltados++; continue;
    }
    const id = `wb-${slug(n.negocio)}`.slice(0, 66) || `wb-${crypto.randomBytes(4).toString('hex')}`;
    const ref = db.collection('_synaptechProspectos').doc(id);
    if ((await ref.get()).exists) { existentes++; continue; }
    if (n.instagram) conIG++;
    if (n.telefono) conTel++;
    await ref.set({
      negocio: n.negocio, direccion: n.direccion, comuna: n.comuna, rubro: n.rubro,
      lat: null, lng: null,   // Weibook no da coords; se geocodifica aparte
      instagram: n.instagram, telefono: n.telefono ? (n.telefono.startsWith('56') ? n.telefono : '56' + n.telefono) : null,
      email: null,
      notas: ['⚡ usa Weibook', n.rating ? `${n.rating}★` : '', 'directorio weibook'].filter(Boolean).join(' · '),
      origen: 'weibook', estado: 'frio',
      emailsEnviados: 0, toques: [],
      optOutToken: crypto.randomBytes(12).toString('hex'),
      creadoEn: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    creados++;
  }
  console.log(`\nListo: ${creados} creados, ${existentes} ya existían, ${clientesSaltados} eran clientes. ${conIG} con Instagram, ${conTel} con teléfono.`);
  console.log('Recuerda: node scripts/geocodificar-prospectos.js para ubicarlos en el mapa.');
  process.exit(0);
})().catch((e) => { console.error('\nImportación Weibook falló:', e); process.exit(1); });
