#!/usr/bin/env node
'use strict';

/*
 * seed-prospectos-massiel.js
 *
 * Carga los prospectos del kit de Massiel (ventas-massiel/prospectos-
 * providencia.md) en `_synaptechProspectos`, la cartera que trabaja el
 * agente de prospección (functions/prospeccion.js + ops → Prospección).
 *
 * El markdown ES la fuente de verdad y se parsea acá mismo: copiar los 35
 * a un JSON sería una lista espejo esperando desincronizarse. Los bloques
 * del archivo tienen dos formatos de tabla (con y sin columna de notas) y
 * ambos se leen.
 *
 * Idempotente: el id es un slug del nombre; si el doc ya existe se salta
 * (no pisa estado ni toques de un prospecto ya trabajado).
 *
 * Uso:
 *   node scripts/seed-prospectos-massiel.js           # carga y resume
 *   node scripts/seed-prospectos-massiel.js --dry     # solo muestra el parseo
 */

const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const admin  = require('firebase-admin');

function cargarCreds() {
  const candidatos = [
    path.join(__dirname, '..', 'service-account.json'),
    path.join(__dirname, '..', 'functions', 'service-account.json'),
    path.join(__dirname, '..', 'admin-key.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);
  for (const p of candidatos) {
    try { return require(p); } catch (_) {}
  }
  return null;
}

const DRY = process.argv.includes('--dry');

const creds = cargarCreds();
if (!DRY && !creds && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Faltan credenciales admin. Setea GOOGLE_APPLICATION_CREDENTIALS o coloca service-account.json en functions/.');
  process.exit(1);
}
if (!DRY) admin.initializeApp(creds ? { credential: admin.credential.cert(creds) } : undefined);

const MD = path.join(__dirname, '..', 'ventas-massiel', 'prospectos-providencia.md');

const slug = (s) => String(s)
  .toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/** Filas de tabla markdown → prospectos. Acepta 4 o 5 columnas. */
function parsear(md) {
  const out = [];
  let prioridad = '';
  for (const linea of md.split('\n')) {
    const mTitulo = linea.match(/^##\s+(.+)$/);
    if (mTitulo) { prioridad = mTitulo[1].replace(/[🔥⚡💡]/gu, '').trim(); continue; }

    if (!/^\|\s*\d+\s*\|/.test(linea)) continue;   // solo filas numeradas
    const celdas = linea.split('|').map((c) => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);
    if (celdas.length < 4) continue;

    const limpiar = (s) => String(s || '').replace(/\*\*/g, '').trim();
    const [, nombre, direccion, rubro, notasCol] = celdas.length >= 5
      ? [celdas[0], celdas[1], celdas[2], celdas[3], celdas[4]]
      : [celdas[0], celdas[1], celdas[2], celdas[3], ''];

    const notas = limpiar(notasCol);
    const igMatch = notas.match(/@([a-z0-9._]+)/i);
    out.push({
      negocio:   limpiar(nombre),
      direccion: limpiar(direccion),
      rubro:     limpiar(rubro).toLowerCase(),
      comuna:    'Providencia',
      instagram: igMatch ? igMatch[1].toLowerCase() : null,
      notas:     [notas, prioridad ? `Prioridad: ${prioridad}` : ''].filter(Boolean).join(' · '),
    });
  }
  return out;
}

(async () => {
  const md = fs.readFileSync(MD, 'utf-8');
  const prospectos = parsear(md);
  console.log(`Parseados ${prospectos.length} prospectos del kit Massiel.`);
  const conIG = prospectos.filter((p) => p.instagram);
  console.log(`Con Instagram detectado: ${conIG.length} (${conIG.map((p) => '@' + p.instagram).join(', ')})`);

  if (DRY) { console.table(prospectos.map((p) => ({ negocio: p.negocio, rubro: p.rubro, ig: p.instagram || '—' }))); return; }

  const db = admin.firestore();
  const { FieldValue } = require('firebase-admin/firestore');
  let creados = 0, existentes = 0;

  for (const p of prospectos) {
    const id = slug(p.negocio) || `p-${crypto.randomBytes(4).toString('hex')}`;
    const ref = db.collection('_synaptechProspectos').doc(id);
    if ((await ref.get()).exists) { existentes++; continue; }
    await ref.set({
      ...p,
      telefono: null, email: null,
      origen: 'massiel', estado: 'frio',
      emailsEnviados: 0, toques: [],
      optOutToken: crypto.randomBytes(12).toString('hex'),
      creadoEn: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    creados++;
    console.log(`  + ${id}`);
  }

  const snap = await db.collection('_synaptechProspectos').get();
  const funnel = {};
  snap.forEach((d) => { const e = (d.data() || {}).estado || '?'; funnel[e] = (funnel[e] || 0) + 1; });
  console.log(`\nListo: ${creados} creados, ${existentes} ya existían.`);
  console.log('Funnel actual:', JSON.stringify(funnel));
  process.exit(0);
})().catch((e) => { console.error('Seed falló:', e); process.exit(1); });
