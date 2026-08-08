#!/usr/bin/env node
'use strict';

/*
 * importar-prospectos-agendapro.js
 *
 * Importa a `_synaptechProspectos` los negocios del marketplace PÚBLICO de
 * AgendaPro Chile para la V Región. Son prospectos DORADOS: ya pagan por
 * agenda online, así que conocen el problema y están dispuestos a pagar —
 * exactamente el perfil que Massiel scrapeaba a mano (ver ventas-massiel).
 *
 * ── Alcance y respeto ──────────────────────────────────────────────────────
 * SOLO se leen las páginas SSR públicas de agendapro.com (lo que sirve a
 * cualquier navegador, sin login, sin cookies, sin API key):
 *   · /mp/cl/map_search/new?mapBounds=...  → lista por caja geográfica
 *   · /site/cl/{slug}/{companyId}          → detalle (teléfono + Instagram)
 * NO se tocan sus microservicios internos ni se falsifican headers de origen:
 * el dato de contacto que se toma es el que el propio negocio PUBLICA para que
 * lo contacten sus clientes. Rate-limit suave (>=700ms) para no cargar el sitio.
 *
 * El marketplace topa a 50 por caja y su `page=2` se ignora, así que la
 * V Región se TESELA en cuadrículas chicas y se deduplica por companyId.
 *
 * Idempotente: se salta docs cuyo slug ya existe. No pisa nada trabajado.
 *
 * Uso:
 *   node scripts/importar-prospectos-agendapro.js --dry   # lista, no escribe
 *   node scripts/importar-prospectos-agendapro.js         # importa + enriquece
 *   node scripts/importar-prospectos-agendapro.js --no-detalle   # sin tel/IG
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
const DRY        = process.argv.includes('--dry');
const SIN_DETALLE = process.argv.includes('--no-detalle');
const creds = cargarCreds();
if (!DRY && !creds && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Faltan credenciales admin.'); process.exit(1);
}
if (!DRY) admin.initializeApp(creds ? { credential: admin.credential.cert(creds) } : undefined);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

// Caja de la V Región costera, teselada en pasos de ~2.7 km. El sitio nos
// devolvió 429 con teselas cada 750 ms (08-08): la señal es "baja el ritmo",
// así que se obedece con esperas largas (ESPERA_MS) y backoff de 60 s.
const BBOX = { swLat: -33.13, swLng: -71.64, neLat: -32.93, neLng: -71.47 };
const PASO = 0.025;
const ESPERA_MS = 2500;

// Solo negocios que atienden con hora en el rubro belleza — el marketplace
// también lista centros médicos, dojos e inspecciones técnicas, que no son
// prospecto. Un rubro que no calce ni parezca belleza se descarta.
const RUBROS_OK = /barber|peluqu|salon|salón|estetic|estétic|belleza|spa|uña|manicure|pedicure|ceja|depila|cosmet|maquilla|capilar|nail/i;

function teselas() {
  const out = [];
  for (let lat = BBOX.swLat; lat < BBOX.neLat; lat += PASO) {
    for (let lng = BBOX.swLng; lng < BBOX.neLng; lng += PASO) {
      out.push({ swLat: +lat.toFixed(4), swLng: +lng.toFixed(4),
                 neLat: +(lat + PASO).toFixed(4), neLng: +(lng + PASO).toFixed(4) });
    }
  }
  return out;
}

async function traer(url) {
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
      if (res.ok) return await res.text();
      // 429 = el sitio pide que bajemos el ritmo: se espera 60 s y se reintenta,
      // en vez de martillar. Nunca es un error a ignorar.
      if (res.status === 429 || res.status >= 500) {
        process.stdout.write(res.status === 429 ? ' [429→espero 60s] ' : ` [${res.status}] `);
        await dormir(60000); continue;
      }
      return null;
    } catch (_) { await dormir(5000); }
  }
  return null;
}

// El flight stream trae los objetos con las comillas escapadas (\"campo\").
// Se desescapan y se leen con regex acotadas por objeto de negocio.
function parsearLista(html) {
  const txt = html.replace(/\\"/g, '"');
  const negocios = [];
  // Cada negocio empieza en "companyId": y trae sus campos cerca.
  const re = /"companyId":(\d+)/g;
  let m;
  const idxs = [];
  while ((m = re.exec(txt))) idxs.push({ id: m[1], pos: m.index });
  for (let i = 0; i < idxs.length; i++) {
    const desde = idxs[i].pos;
    const hasta = i + 1 < idxs.length ? idxs[i + 1].pos : Math.min(desde + 4000, txt.length);
    const bloque = txt.slice(Math.max(0, desde - 1200), hasta);
    const g = (re2) => (bloque.match(re2) || [])[1] || '';
    const nombre = g(/"companyName":"([^"]+)"/);
    if (!nombre) continue;
    negocios.push({
      companyId: idxs[i].id,
      negocio: nombre.trim(),
      webAddress: g(/"webAddress":"([^"]*)"/),
      direccionFull: g(/"addressString":"([^"]*)"/),
      rubro: (g(/"economicSectors":\["([^"]*)"/) || 'estética').toLowerCase(),
      lat: parseFloat(g(/"lat":(-?\d+\.\d+)/)) || null,
      lng: parseFloat(g(/"lng":(-?\d+\.\d+)/)) || null,
      reviews: g(/"reviewsQuantity":(\d+)/),
      rating: g(/"reviewsAverage":(\d+(?:\.\d+)?)/),
    });
  }
  return negocios;
}

// De "58, Álvarez, Viña del Mar, Valparaíso" → calle + comuna.
function partirDireccion(full) {
  const p = String(full || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!p.length) return { direccion: '', comuna: '' };
  const comuna = p.length >= 2 ? p[p.length - 2] : '';
  const direccion = p.slice(0, Math.max(1, p.length - 2)).join(', ');
  return { direccion, comuna };
}

async function enriquecer(n) {
  if (SIN_DETALLE || !n.webAddress) return {};
  const html = await traer(`https://agendapro.com/site/cl/${n.webAddress}/${n.companyId}`);
  await dormir(750);
  if (!html) return {};
  const txt = html.replace(/\\"/g, '"');
  const tel = (txt.match(/"phone":"(\+?56\d{8,9})"/) || [])[1] || '';
  const ig  = (txt.match(/instagram\.com\/([a-z0-9._]{2,30})/i) || [])[1] || '';
  return {
    telefono: tel.replace(/\D/g, '').replace(/^56?/, '56') || null,
    instagram: ig && !['p', 'reel', 'explore'].includes(ig.toLowerCase()) ? ig.toLowerCase() : null,
  };
}

(async () => {
  const cajas = teselas();
  console.log(`Teselando la V Región en ${cajas.length} cajas…`);
  const porId = new Map();
  for (let i = 0; i < cajas.length; i++) {
    const b = cajas[i];
    const mb = encodeURIComponent(JSON.stringify(b));
    const html = await traer(`https://agendapro.com/mp/cl/map_search/new?mapBounds=${mb}`);
    await dormir(750);
    if (!html) { process.stdout.write('·'); continue; }
    for (const n of parsearLista(html)) if (!porId.has(n.companyId)) porId.set(n.companyId, n);
    process.stdout.write(`\r  caja ${i + 1}/${cajas.length} · ${porId.size} negocios únicos   `);
  }
  console.log('');

  const negocios = [...porId.values()].map((n) => {
    const { direccion, comuna } = partirDireccion(n.direccionFull);
    return { ...n, direccion, comuna };
  })
    .filter((n) => n.lat && n.lng)
    // Solo belleza: el marketplace también lista centros médicos, dojos e
    // inspecciones técnicas, que no son prospecto.
    .filter((n) => RUBROS_OK.test(n.rubro) || RUBROS_OK.test(n.negocio))
    // Nombres basura: cuando el negocio no puso nombre, AgendaPro muestra su
    // email. No es un prospecto presentable.
    .filter((n) => !/@|^\s*$/.test(n.negocio) && /[a-záéíóúñ]/i.test(n.negocio));
  console.log(`${negocios.length} negocios de belleza con coordenadas.`);

  if (DRY) {
    const porC = {};
    negocios.forEach((n) => { porC[n.comuna || '?'] = (porC[n.comuna || '?'] || 0) + 1; });
    console.log('por comuna:', JSON.stringify(porC));
    console.table(negocios.slice(0, 20).map((n) => ({ negocio: n.negocio.slice(0, 28), comuna: n.comuna, rubro: n.rubro, rating: n.rating })));
    return;
  }

  const db = admin.firestore();
  const { FieldValue } = admin.firestore;
  const { cargarClientes, esCliente } = require('./lib-clientes-existentes');
  const clientes = await cargarClientes(db);
  let creados = 0, existentes = 0, conIG = 0, conTel = 0, clientesSaltados = 0;
  for (const n of negocios) {
    if (esCliente(clientes, n.negocio, null)) {
      console.log(`  — ${n.negocio}: ya es cliente, no se prospecta`);
      clientesSaltados++; continue;
    }
    const id = `ap-${slug(n.negocio)}-${n.companyId}`.slice(0, 70);
    const ref = db.collection('_synaptechProspectos').doc(id);
    if ((await ref.get()).exists) { existentes++; continue; }
    const extra = await enriquecer(n);
    if (extra.instagram && esCliente(clientes, n.negocio, extra.instagram)) { clientesSaltados++; continue; }
    if (extra.instagram) conIG++;
    if (extra.telefono) conTel++;
    const notas = ['⚡ usa AgendaPro',
      n.reviews ? `${n.reviews} reseñas (${n.rating}★)` : '',
      `marketplace agendapro`].filter(Boolean).join(' · ');
    await ref.set({
      negocio: n.negocio, direccion: n.direccion, comuna: n.comuna || 'Valparaíso',
      rubro: n.rubro, lat: n.lat, lng: n.lng,
      instagram: extra.instagram || null, telefono: extra.telefono || null, email: null,
      notas, origen: 'agendapro', estado: 'frio',
      emailsEnviados: 0, toques: [],
      optOutToken: crypto.randomBytes(12).toString('hex'),
      creadoEn: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    creados++;
    process.stdout.write(`\r  importando… ${creados} creados (${conIG} con IG, ${conTel} con tel)   `);
  }
  console.log(`\n\nListo: ${creados} creados, ${existentes} ya existían, ${clientesSaltados} eran clientes. ${conIG} con Instagram, ${conTel} con teléfono.`);
  process.exit(0);
})().catch((e) => { console.error('\nImportación falló:', e); process.exit(1); });
