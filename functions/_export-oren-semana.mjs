// _export-oren-semana.mjs — Export CSV de citas de la semana para OREN.
//
// USO:
//   node _export-oren-semana.mjs                       # semana actual
//   node _export-oren-semana.mjs --desde=2026-07-14 --hasta=2026-07-20
//
// Output: oren-citas-{desde}_a_{hasta}.csv en el cwd. Codificación UTF-8 con
// BOM para que Excel Chile lo abra bien. Separador ';' (Excel es-CL default).
//
// Columnas: fecha, hora, sede, barbero, cliente, telefono, servicio,
//           precio, estado, corteLapiz, propinaMonto, id.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';

const TENANT = 'oren';

// ── Args ────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

// Rango: semana actual = lunes → domingo (Chile). Hoy = 2026-07-26 (dom).
function isoDate(d) { return d.toISOString().split('T')[0]; }
function lunesDeLaSemana(d) {
  const day = d.getDay();            // 0=dom .. 6=sab
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d); m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}
const hoy    = new Date();
const lun    = lunesDeLaSemana(hoy);
const dom    = new Date(lun); dom.setDate(lun.getDate() + 6);
const DESDE  = args.desde || isoDate(lun);
const HASTA  = args.hasta || isoDate(dom);

// ── Firestore ───────────────────────────────────────────────────────
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  EXPORT CITAS OREN — ${DESDE} → ${HASTA}`);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

// ── Lookup: barberos y sucursales ───────────────────────────────────
const barberosSnap = await db.collection(`tenants/${TENANT}/barberos`).get();
const barberoNombre = new Map();
for (const d of barberosSnap.docs) {
  const b = d.data();
  barberoNombre.set(d.id, b.nombre || b.displayName || d.id);
}
console.log(`   Barberos cargados: ${barberoNombre.size}`);

const cfgSnap = await db.doc(`tenants/${TENANT}/configuracion/main`).get();
const sucursales = cfgSnap.exists ? (cfgSnap.data().sucursales || []) : [];
const sedeNombre = new Map();
for (const s of sucursales) sedeNombre.set(s.id, s.nombre || s.id);
console.log(`   Sucursales cargadas: ${sedeNombre.size}`);

// ── Query citas ─────────────────────────────────────────────────────
const citasSnap = await db.collection(`tenants/${TENANT}/citas`)
  .where('fecha', '>=', DESDE)
  .where('fecha', '<=', HASTA)
  .get();

// Sort en memoria: fecha asc, hora asc (evita índice compuesto fecha+hora).
const citaDocs = citasSnap.docs.slice().sort((a, b) => {
  const da = a.data(), db_ = b.data();
  const cmp = String(da.fecha || '').localeCompare(String(db_.fecha || ''));
  return cmp !== 0 ? cmp : String(da.hora || '').localeCompare(String(db_.hora || ''));
});

console.log(`   Citas encontradas: ${citaDocs.length}`);

// ── Escape CSV ──────────────────────────────────────────────────────
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ── Armar rows ──────────────────────────────────────────────────────
const HEADERS = [
  'fecha', 'hora', 'sede', 'barbero', 'cliente', 'telefono',
  'servicio', 'precio', 'estado', 'corteLapiz', 'propinaMonto', 'id',
];

const rows = [HEADERS.join(';')];
for (const d of citaDocs) {
  const c = d.data();
  rows.push([
    c.fecha       || '',
    c.hora        || '',
    c.sucursalNombre || sedeNombre.get(c.sucursalId) || sedeNombre.get(c.sedeId) || c.sucursalId || c.sedeId || '',
    barberoNombre.get(c.barberoId) || c.barberoNombre || c.barberoId || '',
    c.clienteNombre || c.nombre || '',
    c.clienteTelefono || '',
    c.servicioNombre || c.servicio || '',
    c.precio      ?? '',
    c.estado      || '',
    c.corteLapiz  ? 'sí' : '',
    c.propinaMonto ?? c.propina ?? '',
    d.id,
  ].map(csvCell).join(';'));
}

// ── Escribir CSV (UTF-8 con BOM, para Excel es-CL) ──────────────────
const BOM = '﻿';
const filename = `oren-citas-${DESDE}_a_${HASTA}.csv`;
writeFileSync(filename, BOM + rows.join('\r\n') + '\r\n', 'utf-8');

console.log(`\n   ✅ CSV escrito: ${filename}`);
console.log(`   ${rows.length - 1} fila(s) de datos + 1 header\n`);
