#!/usr/bin/env node
// scripts/metricas-marketing.mjs
// ─────────────────────────────────────────────────────────────────
//  METRICAS PARA POSTS DE INSTAGRAM (@synaptechspa)
//  Recorre todos los tenants en vivo y calcula:
//   1. % de citas reservadas fuera de horario laboral
//   2. % de clientes recurrentes (≥2 citas)
//   3. Rating promedio en Google Reviews
//
//  La métrica 4 (tiempo de reserva) requiere instrumentar 2 eventos
//  en el cliente. Ver nota al final del archivo.
//
//  Uso:  node scripts/metricas-marketing.mjs
//        node scripts/metricas-marketing.mjs --tenant aura
// ─────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import admin from 'firebase-admin';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sa = JSON.parse(readFileSync(join(ROOT, 'service-account.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TIMEZONE = 'America/Santiago';

// Tenants EN VIVO (mismo orden que google-reviews-sync.js, sin los pre-launch).
const ALL_TENANTS = [
  'elegance', 'ferraza', 'gitana', 'chameleon', 'mapubarbershop',
  'lumen', 'delnero', 'marcelo_hairdressing', 'aura', 'machos',
  'infinity', 'sionbarberia',
];
// (deluxeperfumes, omegastudio, memphis los dejo fuera: catálogo/no agenda)

// Filtro CLI: --tenant <id>
const cliTenantIdx = process.argv.indexOf('--tenant');
const TENANTS = cliTenantIdx > -1 ? [process.argv[cliTenantIdx + 1]] : ALL_TENANTS;

// Path helpers (elegance vive en la raíz; el resto bajo tenants/{tid}/)
const citasPath  = t => (t === 'elegance' ? 'citas' : `tenants/${t}/citas`);
const reviewsRef = t => (t === 'elegance'
  ? db.collection('settings').doc('googleReviews')
  : db.collection('tenants').doc(t).collection('settings').doc('googleReviews'));

// Hora local Chile (0-23) desde un Timestamp Firestore
const fmtHour = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE, hour: '2-digit', hour12: false,
});
function horaLocal(ts) {
  if (!ts || typeof ts.toDate !== 'function') return null;
  const h = parseInt(fmtHour.format(ts.toDate()), 10);
  return Number.isFinite(h) ? h % 24 : null;
}

// Identificador estable de cliente: email > telefono > clienteId
function clientKey(c) {
  const e = (c.clienteEmail || '').trim().toLowerCase();
  if (e) return `e:${e}`;
  const tel = (c.clienteTelefono || '').replace(/\D/g, '');
  if (tel) return `t:${tel.slice(-9)}`; // últimos 9 dígitos (ignora código país)
  if (c.clienteId) return `i:${c.clienteId}`;
  return null;
}

// Ventanas "fuera de horario" — reporto 2 cortes para que elijas el más vendedor
const FUERA_AMPLIA  = h => h >= 20 || h < 9;   // 20:00 – 09:00 (13h)
const FUERA_SUENO   = h => h >= 23 || h < 7;   // 23:00 – 07:00 (8h, "mientras dormías")

async function analizarTenant(tid) {
  const snap = await db.collection(citasPath(tid)).get();
  const docs = snap.docs.map(d => d.data());

  let onlineTotal = 0, onlineConFecha = 0, fueraAmplia = 0, fueraSueno = 0;
  const clientesCount = new Map();

  for (const c of docs) {
    // origen: por defecto reserva_online si está ausente (ver firebaseUtils.js:547)
    const esOnline = !c.origen || c.origen === 'reserva_online';
    if (!esOnline) continue;
    onlineTotal++;

    const h = horaLocal(c.creadoEn);
    if (h !== null) {
      onlineConFecha++;
      if (FUERA_AMPLIA(h)) fueraAmplia++;
      if (FUERA_SUENO(h))  fueraSueno++;
    }

    const k = clientKey(c);
    if (k) clientesCount.set(k, (clientesCount.get(k) || 0) + 1);
  }

  const clientesUnicos    = clientesCount.size;
  const clientesRecurrentes = [...clientesCount.values()].filter(n => n >= 2).length;

  // Rating Google
  let rating = null, totalReviews = null;
  try {
    const r = await reviewsRef(tid).get();
    if (r.exists) {
      rating = r.data().rating ?? null;
      totalReviews = r.data().totalReviews ?? null;
    }
  } catch { /* ignore */ }

  return {
    tid,
    citasTotal: docs.length,
    onlineTotal,
    onlineConFecha,
    fueraAmplia,
    fueraSueno,
    clientesUnicos,
    clientesRecurrentes,
    rating,
    totalReviews,
  };
}

function pct(a, b) {
  if (!b) return null;
  return Math.round((a / b) * 1000) / 10; // un decimal
}

function fmtPct(p) {
  return p === null ? '   —  ' : `${p.toFixed(1).padStart(5)}%`;
}

function fmtRating(r, n) {
  if (r === null || r === undefined) return '   —';
  return `${r.toFixed(2)} ★ (${n ?? 0})`;
}

(async () => {
  console.log(`\n📊 Métricas marketing · ${TENANTS.length} tenant(s) · ${new Date().toISOString().slice(0,10)}\n`);

  const rows = [];
  for (const tid of TENANTS) {
    try {
      rows.push(await analizarTenant(tid));
    } catch (e) {
      console.error(`✗ ${tid}: ${e.message}`);
    }
  }

  // ── Tabla por tenant ───────────────────────────────────────────
  console.log('Tenant                 │ Citas │ Online │ %FueraAmplia │ %Sueño │ Únicos │ %Recurr │ Google');
  console.log('───────────────────────┼───────┼────────┼──────────────┼────────┼────────┼─────────┼──────────────');
  for (const r of rows) {
    const pAmplia = pct(r.fueraAmplia, r.onlineConFecha);
    const pSueno  = pct(r.fueraSueno,  r.onlineConFecha);
    const pRec    = pct(r.clientesRecurrentes, r.clientesUnicos);
    console.log(
      `${r.tid.padEnd(22)} │ ${String(r.citasTotal).padStart(5)} │ ${String(r.onlineTotal).padStart(6)} │  ${fmtPct(pAmplia)}     │ ${fmtPct(pSueno)} │ ${String(r.clientesUnicos).padStart(6)} │ ${fmtPct(pRec)} │ ${fmtRating(r.rating, r.totalReviews)}`
    );
  }

  // ── Totales agregados (la cifra que va al post de IG) ──────────
  const total = rows.reduce((a, r) => ({
    citas: a.citas + r.citasTotal,
    online: a.online + r.onlineTotal,
    onlineFecha: a.onlineFecha + r.onlineConFecha,
    fueraAmplia: a.fueraAmplia + r.fueraAmplia,
    fueraSueno: a.fueraSueno + r.fueraSueno,
    unicos: a.unicos + r.clientesUnicos,
    recurr: a.recurr + r.clientesRecurrentes,
  }), { citas:0, online:0, onlineFecha:0, fueraAmplia:0, fueraSueno:0, unicos:0, recurr:0 });

  // Solo ratings reales (>0). rating=0 = "sin data" en doc inicializado.
  const ratingsValidos = rows.filter(r => typeof r.rating === 'number' && r.rating > 0);
  const ratingPromedio = ratingsValidos.length
    ? ratingsValidos.reduce((s, r) => s + r.rating, 0) / ratingsValidos.length
    : null;
  // Promedio ponderado por # de reseñas (más honesto si hay tenants con pocas reseñas)
  const reviewsTotales = ratingsValidos.reduce((s, r) => s + (r.totalReviews || 0), 0);
  const ratingPonderado = reviewsTotales
    ? ratingsValidos.reduce((s, r) => s + r.rating * (r.totalReviews || 0), 0) / reviewsTotales
    : null;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' 🎯 RESUMEN AGREGADO (listo para post)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Citas totales registradas .......... ${total.citas}`);
  console.log(`  Reservas online ..................... ${total.online}`);
  console.log(`  Clientes únicos ..................... ${total.unicos}`);
  console.log('');
  console.log('  📅 % reservas FUERA DE HORARIO (20:00–09:00):');
  console.log(`     ${fmtPct(pct(total.fueraAmplia, total.onlineFecha))}  (${total.fueraAmplia}/${total.onlineFecha})`);
  console.log('  💤 % reservas MIENTRAS DORMÍAS (23:00–07:00):');
  console.log(`     ${fmtPct(pct(total.fueraSueno, total.onlineFecha))}  (${total.fueraSueno}/${total.onlineFecha})`);
  console.log('');
  console.log('  🔁 % clientes RECURRENTES (≥2 citas):');
  console.log(`     ${fmtPct(pct(total.recurr, total.unicos))}  (${total.recurr}/${total.unicos})`);
  console.log('');
  console.log('  ⭐ Rating Google Reviews:');
  console.log(`     ${ratingPromedio ? ratingPromedio.toFixed(2) : '—'} ★ promedio simple   ·   ${ratingPonderado ? ratingPonderado.toFixed(2) : '—'} ★ promedio ponderado por # reseñas`);
  console.log(`     ${reviewsTotales} reseñas en total  ·  ${ratingsValidos.length}/${rows.length} barberías con datos de Google`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Pistas de copy automáticas ─────────────────────────────────
  // Filtro de muestra mínima para que el gancho sea estadísticamente creíble.
  const MIN_CITAS = 30;
  const MIN_CLIENTES = 30;
  const conMuestra = rows.filter(r => r.onlineConFecha >= MIN_CITAS);
  const conClientes = rows.filter(r => r.clientesUnicos >= MIN_CLIENTES);
  const topFuera = [...conMuestra].sort((a, b) => (pct(b.fueraAmplia, b.onlineConFecha) || 0) - (pct(a.fueraAmplia, a.onlineConFecha) || 0))[0];
  const topRecurr = [...conClientes].sort((a, b) => (pct(b.clientesRecurrentes, b.clientesUnicos) || 0) - (pct(a.clientesRecurrentes, a.clientesUnicos) || 0))[0];
  const topRating = [...rows].filter(r => r.rating && r.rating > 0 && (r.totalReviews || 0) >= 10).sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0))[0];

  console.log(`💡 Mejor caso por métrica (muestras ≥${MIN_CITAS} citas / ≥${MIN_CLIENTES} clientes / ≥10 reseñas):`);
  if (topFuera)  console.log(`   · Fuera de horario  → ${topFuera.tid}: ${fmtPct(pct(topFuera.fueraAmplia, topFuera.onlineConFecha))} de las ${topFuera.onlineConFecha} reservas online entraron entre 20:00 y 09:00`);
  if (topRecurr) console.log(`   · Recurrencia       → ${topRecurr.tid}: ${fmtPct(pct(topRecurr.clientesRecurrentes, topRecurr.clientesUnicos))} de ${topRecurr.clientesUnicos} clientes volvieron al menos 2 veces`);
  if (topRating) console.log(`   · Rating Google     → ${topRating.tid}: ${topRating.rating.toFixed(2)} ★ con ${topRating.totalReviews} reseñas`);
  console.log('');

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

// ─────────────────────────────────────────────────────────────────
//  NOTA · Métrica 4 (tiempo promedio de reserva)
//  Requiere capturar en el cliente:
//    - timestamp al abrir la app / paso inicial del flujo
//    - timestamp al confirmar la cita
//  Sugerencia: persistir el primero en sessionStorage al cargar
//  agenda.html, y al confirmar guardar en la cita un campo
//  tiempoReservaMs = Date.now() - sessionStorage.start.
//  Una semana de data ya basta para sacar un promedio creíble.
// ─────────────────────────────────────────────────────────────────
