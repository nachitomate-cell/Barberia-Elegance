#!/usr/bin/env node
'use strict';

/*
 * scrapear-prospectos-osm.js
 *
 * Llena `_synaptechProspectos` con barberías, peluquerías y estéticas REALES
 * de OpenStreetMap (Overpass API) para las zonas nuevas de prospección:
 * Viña del Mar, Valparaíso y Curauma. Vienen con coordenadas incluidas, así
 * que aparecen en el mapa de ops sin geocodificar; algunos traen además
 * teléfono, Instagram o sitio web.
 *
 * Curauma no es comuna (es un sector de Valparaíso), así que se recorta por
 * bounding box ANTES de consultar Valparaíso y sus negocios se etiquetan
 * "Curauma" — el orden de trabajo de Ignacio lo trata como zona propia.
 *
 * Idempotente doble: se salta docs cuyo slug ya existe Y osmId ya vistos.
 * Overpass es gratis: una consulta por zona, con pausa entre ellas.
 *
 * Uso:
 *   node scripts/scrapear-prospectos-osm.js          # scrapea y siembra
 *   node scripts/scrapear-prospectos-osm.js --dry    # solo muestra
 */

const path   = require('path');
const crypto = require('crypto');
const admin  = require('firebase-admin');

function cargarCreds() {
  const candidatos = [
    path.join(__dirname, '..', 'service-account.json'),
    path.join(__dirname, '..', 'functions', 'service-account.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);
  for (const p of candidatos) { try { return require(p); } catch (_) {} }
  return null;
}
const DRY = process.argv.includes('--dry');
const creds = cargarCreds();
if (!DRY && !creds && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Faltan credenciales admin.');
  process.exit(1);
}
if (!DRY) admin.initializeApp(creds ? { credential: admin.credential.cert(creds) } : undefined);

// Espejos públicos: el principal se satura seguido (504); kumi.systems suele
// tener más holgura. Se rota entre ellos en cada reintento.
const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

// SOLO cajas geográficas, jamás áreas por nombre: `area["name"="Valparaíso"]`
// se trajo el Valparaíso de São Paulo (Brasil) y sembró negocios a 2.400 km
// (mordió el 08-08: el mapa encuadraba medio continente). Una bbox no tiene
// homónimos. Bordes: Valpo/Viña se parten en Caleta Portales (~-71.55) y
// Curauma reclama primero su franja de la Ruta 68.
const ZONAS = [
  { comuna: 'Curauma',      bbox: '-33.20,-71.65,-33.06,-71.47' },   // Placilla + Curauma
  { comuna: 'Valparaíso',   bbox: '-33.10,-71.67,-33.00,-71.545' },  // Playa Ancha → Barón y cerros
  { comuna: 'Viña del Mar', bbox: '-33.10,-71.56,-32.93,-71.44' },   // Recreo → Reñaca + El Olivar
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => String(s)
  .toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

async function overpass(bbox) {
  const union = `nwr["shop"~"^(hairdresser|beauty)$"](${bbox});`;
  // 429 = "espera tu turno" y 5xx = servidor saturado: se rota de espejo y se
  // reintenta con paciencia en vez de morir a mitad de la lista.
  for (let intento = 0; intento < 6; intento++) {
    const url = OVERPASS_MIRRORS[intento % OVERPASS_MIRRORS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SynapTech-Prospeccion/1.0 (hola@synaptechspa.cl)',
        },
        body: 'data=' + encodeURIComponent(`[out:json][timeout:90];(${union});out center tags;`),
      });
      if (res.ok) return (await res.json()).elements || [];
      if (![429, 502, 503, 504].includes(res.status)) throw new Error(`Overpass ${res.status}`);
      console.log(`  (${new URL(url).hostname} respondió ${res.status}; reintento en 20 s…)`);
    } catch (e) {
      if (intento === 5) throw e;
      console.log(`  (${new URL(url).hostname} falló: ${e.message}; reintento en 20 s…)`);
    }
    await dormir(20000);
  }
  throw new Error('Overpass agotó los reintentos');
}

function igDe(tags) {
  const crudo = tags['contact:instagram'] || tags.instagram || '';
  const m = String(crudo).match(/(?:instagram\.com\/)?@?([a-z0-9._]{2,30})\/?\s*$/i);
  return m ? m[1].toLowerCase() : null;
}
function telDe(tags) {
  const crudo = tags['contact:phone'] || tags.phone || '';
  const dig = String(crudo).split(';')[0].replace(/\D/g, '');
  if (/^56\d{9}$/.test(dig)) return dig;
  if (/^9\d{8}$/.test(dig))  return '56' + dig;
  return null;
}

function prospectoDe(el, comuna) {
  const t = el.tags || {};
  if (!t.name) return null;
  const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const direccion = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
  const notas = ['OSM', t.website || t['contact:website'] || null].filter(Boolean).join(' · ');
  return {
    osmId: `${el.type}/${el.id}`,
    negocio: String(t.name).slice(0, 120),
    direccion, comuna,
    rubro: t.shop === 'beauty' ? 'estética' : 'peluquería / barbería',
    instagram: igDe(t),
    telefono: telDe(t),
    email: (t['contact:email'] || t.email || '').toLowerCase().trim() || null,
    lat, lng, notas,
  };
}

(async () => {
  const vistos = new Set();      // osmIds ya tomados por una zona anterior
  const porZona = {};
  const todos = [];

  for (const z of ZONAS) {
    const els = await overpass(z.bbox);
    const zona = [];
    for (const el of els) {
      const p = prospectoDe(el, z.comuna);
      if (!p || vistos.has(p.osmId)) continue;   // Curauma reclama antes que Valparaíso
      vistos.add(p.osmId);
      zona.push(p);
    }
    porZona[z.comuna] = zona;
    todos.push(...zona);
    console.log(`${z.comuna}: ${zona.length} negocios (${zona.filter(p => p.instagram).length} con IG, ${zona.filter(p => p.telefono).length} con fono, ${zona.filter(p => p.email).length} con email)`);
    await dormir(10000);
  }

  if (DRY) {
    console.table(todos.map(p => ({ comuna: p.comuna, negocio: p.negocio.slice(0, 30), ig: p.instagram || '—', tel: p.telefono || '—' })));
    return;
  }

  const db = admin.firestore();
  const { FieldValue } = admin.firestore;
  let creados = 0, existentes = 0;
  const sinDireccion = [];
  for (const p of todos) {
    const id = slug(`${p.negocio}-${p.comuna}`) || `osm-${crypto.randomBytes(4).toString('hex')}`;
    const ref = db.collection('_synaptechProspectos').doc(id);
    if ((await ref.get()).exists) { existentes++; continue; }
    const { osmId, ...datos } = p;
    await ref.set({
      ...datos, osmId,
      origen: 'osm', estado: 'frio',
      emailsEnviados: 0, toques: [],
      optOutToken: crypto.randomBytes(12).toString('hex'),
      creadoEn: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    creados++;
    if (!p.direccion) sinDireccion.push({ ref, lat: p.lat, lng: p.lng });
  }

  // Los nodos de OSM rara vez traen addr:*: la calle se completa con
  // geocodificación INVERSA de Nominatim (1 req/s) para que "cómo llegar"
  // tenga texto y no solo coordenadas.
  console.log(`\nCompletando dirección de ${sinDireccion.length} sin calle…`);
  for (const s of sinDireccion) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${s.lat}&lon=${s.lng}&zoom=17`, {
        headers: { 'User-Agent': 'SynapTech-Prospeccion/1.0 (hola@synaptechspa.cl)' },
      });
      const j = await res.json().catch(() => ({}));
      const a = j.address || {};
      const calle = [a.road, a.house_number].filter(Boolean).join(' ');
      if (calle) await s.ref.set({ direccion: calle }, { merge: true });
    } catch (_) {}
    await dormir(1100);
  }
  console.log(`Listo: ${creados} creados, ${existentes} ya existían.`);
  process.exit(0);
})().catch((e) => { console.error('Scraping falló:', e); process.exit(1); });
