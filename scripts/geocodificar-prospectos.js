#!/usr/bin/env node
'use strict';

/*
 * geocodificar-prospectos.js
 *
 * Dirección → lat/lng para los docs de `_synaptechProspectos` que aún no
 * tienen coordenadas. Alimenta el mapa de la pestaña ops → Prospección.
 *
 * Nominatim (OSM): gratis, sin API key, con dos condiciones que acá se
 * respetan — User-Agent identificable y máximo ~1 req/s. Si una dirección
 * no calza, se reintenta sin los sufijos de local/piso/oficina; si aun así
 * no hay resultado, el doc queda sin coords (aparece en la lista, no en el
 * mapa) y se informa al final.
 *
 * Idempotente: los que ya tienen lat/lng se saltan.
 *
 * Uso:  node scripts/geocodificar-prospectos.js
 */

const path  = require('path');
const admin = require('firebase-admin');

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
  console.error('Faltan credenciales admin.');
  process.exit(1);
}
admin.initializeApp(creds ? { credential: admin.credential.cert(creds) } : undefined);
const db = admin.firestore();

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function nominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'SynapTech-Prospeccion/1.0 (hola@synaptechspa.cl)' } });
  const j = await res.json().catch(() => []);
  const hit = Array.isArray(j) && j[0];
  return hit && hit.lat ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

(async () => {
  const snap = await db.collection('_synaptechProspectos').get();
  let hechos = 0, saltados = 0;
  const sinResultado = [];

  for (const doc of snap.docs) {
    const p = doc.data() || {};
    // OJO: `Number(null)` es 0 (finito), así que un lat:null se colaba como
    // "ya geocodificado" y nunca se ubicaba — mordió con los prospectos de
    // Weibook. Hay que exigir que sea un number de verdad.
    const yaTiene = typeof p.lat === 'number' && Number.isFinite(p.lat) && typeof p.lng === 'number' && Number.isFinite(p.lng);
    if (yaTiene) { saltados++; continue; }
    if (!p.direccion) { sinResultado.push(`${doc.id} (sin dirección)`); continue; }

    const comuna = p.comuna || 'Providencia';
    let geo = await nominatim(`${p.direccion}, ${comuna}, Santiago, Chile`);
    await dormir(1100);
    if (!geo) {
      // "local 6", "piso 7, of 71" confunden al geocoder: se busca solo la calle.
      const base = p.direccion.replace(/,?\s*(local|piso|of\.?|oficina)\b.*$/i, '').trim();
      if (base && base !== p.direccion) {
        geo = await nominatim(`${base}, ${comuna}, Santiago, Chile`);
        await dormir(1100);
      }
    }
    if (!geo) { sinResultado.push(`${doc.id} ("${p.direccion}")`); continue; }

    await doc.ref.set({ lat: geo.lat, lng: geo.lng }, { merge: true });
    hechos++;
    console.log(`  📍 ${doc.id} → ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`);
  }

  console.log(`\nListo: ${hechos} geocodificados, ${saltados} ya tenían coords.`);
  if (sinResultado.length) {
    console.log(`Sin resultado (${sinResultado.length}):`);
    sinResultado.forEach((s) => console.log(`  - ${s}`));
  }
  process.exit(0);
})().catch((e) => { console.error('Geocodificación falló:', e); process.exit(1); });
