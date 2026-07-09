'use strict';

/**
 * scripts/analyze-tenant-volume.js
 * ─────────────────────────────────────────────────────────────────
 *  Analiza el volumen de citas de un tenant para dimensionar features
 *  como el WhatsApp bot (¿cuántos mensajes/mes justifican el costo?).
 *
 *  Reporta por tenant: citas totales, breakdown por mes (últimos 6),
 *  breakdown por estado, mensajes estimados (asumiendo 1-2 chats por cita),
 *  y costo estimado del bot (Meta Cloud API + Claude Haiku).
 *
 *  Uso:
 *    node scripts/analyze-tenant-volume.js aura chameleon
 *    node scripts/analyze-tenant-volume.js aura chameleon yugen  (varios)
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
const fs   = require('fs');

const SERVICE_PATH = path.resolve(__dirname, '..', 'service-account.json');
if (!fs.existsSync(SERVICE_PATH)) {
  console.error(`ERROR: service-account no existe: ${SERVICE_PATH}`);
  process.exit(1);
}

const tenantIds = process.argv.slice(2);
if (!tenantIds.length) {
  console.error('Uso: node scripts/analyze-tenant-volume.js <tenantId> [tenantId...]');
  process.exit(1);
}

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(SERVICE_PATH)) });
const db = admin.firestore();

// Path helper (elegance vive en la raíz, resto bajo tenants/{tid}/)
function citasCol(tid) {
  return tid === 'elegance'
    ? db.collection('citas')
    : db.collection('tenants').doc(tid).collection('citas');
}
function barberosCol(tid) {
  return tid === 'elegance'
    ? db.collection('barberos')
    : db.collection('tenants').doc(tid).collection('barberos');
}
function usersCol(tid) {
  return tid === 'elegance'
    ? db.collection('users')
    : db.collection('tenants').doc(tid).collection('users');
}

function monthKey(fechaStr) {
  // fecha: 'YYYY-MM-DD' o Timestamp — devolvemos 'YYYY-MM'
  if (typeof fechaStr === 'string' && fechaStr.length >= 7) return fechaStr.slice(0, 7);
  return null;
}

async function analyzeTenant(tenantId) {
  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(` ${tenantId.toUpperCase()}`);
  console.log(`══════════════════════════════════════════════════════════`);

  // ── Citas totales
  const [citasSnap, barberosSnap, usersSnap] = await Promise.all([
    citasCol(tenantId).get(),
    barberosCol(tenantId).get(),
    usersCol(tenantId).get(),
  ]);

  const citas = citasSnap.docs.map(d => d.data());
  const barberos = barberosSnap.docs.map(d => d.data()).filter(b => !b._mainDocId);
  const usersActivos = usersSnap.size;
  const totalCitas = citas.length;

  console.log(`  Miembros del equipo:      ${barberos.length}`);
  console.log(`  Usuarios en users col:    ${usersActivos.toLocaleString('es-CL')}`);
  console.log(`  Citas TOTALES en Firestore: ${totalCitas.toLocaleString('es-CL')}`);

  // ── Breakdown por mes (últimos 12)
  const byMonth = {};
  const byEstado = {};
  for (const c of citas) {
    const m = monthKey(c.fecha);
    if (m) byMonth[m] = (byMonth[m] || 0) + 1;
    const e = c.estado || 'sin-estado';
    byEstado[e] = (byEstado[e] || 0) + 1;
  }

  // Filtrar últimos 6 meses relativo a hoy
  const hoy = new Date();
  const last6 = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    last6.push({ mes: key, citas: byMonth[key] || 0 });
  }

  console.log(`\n  ── Últimos 6 meses ──`);
  let sum6 = 0;
  for (const { mes, citas: n } of last6) {
    const bar = '█'.repeat(Math.round(n / 10));
    console.log(`    ${mes}  ${String(n).padStart(4)}  ${bar}`);
    sum6 += n;
  }
  const promMensual = Math.round(sum6 / 6);
  console.log(`    ────────────────────`);
  console.log(`    Promedio mensual (últimos 6 meses): ${promMensual}`);

  console.log(`\n  ── Estados ──`);
  for (const [e, n] of Object.entries(byEstado).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${e.padEnd(20)} ${String(n).padStart(5)}  ${((n / totalCitas) * 100).toFixed(1)}%`);
  }

  // ── Estimacion WhatsApp bot ──
  // Asumimos que por cada cita hay ~1.5 conversaciones de WA (agenda + reconfirm/duda)
  // Y ademas hay ~30% mensajes "curiosos que no reservan" (¿precio?, ¿horario?)
  const chatsCitas    = Math.round(promMensual * 1.5);
  const chatsCuriosos = Math.round(promMensual * 0.5);
  const totalChats    = chatsCitas + chatsCuriosos;

  // Cloud API Meta: gratis primeras 1000/mes, después $0.03 USD c/u
  const chatsFree = Math.min(totalChats, 1000);
  const chatsPaid = Math.max(0, totalChats - 1000);
  const costoMetaUsd = chatsPaid * 0.03;

  // Claude Haiku: ~500 tokens in + 200 out por respuesta
  // Precios Haiku 4.5: $0.80/M input, $4/M output
  const tokensIn  = totalChats * 500;
  const tokensOut = totalChats * 200;
  const costoLlmUsd = (tokensIn / 1_000_000) * 0.80 + (tokensOut / 1_000_000) * 4;

  const costoTotalUsd = costoMetaUsd + costoLlmUsd;

  console.log(`\n  ── Proyección WhatsApp bot ──`);
  console.log(`    Chats/mes estimados:      ${totalChats.toLocaleString('es-CL')}`);
  console.log(`      · Ligados a citas:      ${chatsCitas}`);
  console.log(`      · Curiosos (no reserva): ${chatsCuriosos}`);
  console.log(`    Costos:`);
  console.log(`      · Meta Cloud API:       $${costoMetaUsd.toFixed(2)} USD  (${chatsFree} free + ${chatsPaid} pagos)`);
  console.log(`      · Claude Haiku 4.5:     $${costoLlmUsd.toFixed(2)} USD`);
  console.log(`      · TOTAL variable:       $${costoTotalUsd.toFixed(2)} USD/mes`);

  // Sugerencias de precio
  const precioBasico = 15;
  const precioPro    = 25;
  console.log(`\n  ── Margen si vendemos ──`);
  console.log(`    Tier básico  ($${precioBasico}/mes):  margen ${((1 - costoTotalUsd / precioBasico) * 100).toFixed(1)}%  →  $${(precioBasico - costoTotalUsd).toFixed(2)} neto/mes`);
  console.log(`    Tier PRO     ($${precioPro}/mes):  margen ${((1 - costoTotalUsd / precioPro) * 100).toFixed(1)}%  →  $${(precioPro - costoTotalUsd).toFixed(2)} neto/mes`);

  return {
    tenantId,
    barberos: barberos.length,
    usuarios: usersActivos,
    totalCitas,
    promMensual,
    chatsMes: totalChats,
    costoUsdMes: costoTotalUsd,
    ultimosMeses: last6,
  };
}

async function main() {
  const results = [];
  for (const tid of tenantIds) {
    try {
      results.push(await analyzeTenant(tid));
    } catch (e) {
      console.error(`\n✗ Error en ${tid}: ${e.message}`);
    }
  }

  if (results.length > 1) {
    console.log(`\n\n══════════════════════════════════════════════════════════`);
    console.log(` RESUMEN CONSOLIDADO`);
    console.log(`══════════════════════════════════════════════════════════`);
    console.log(`  Tenant       Citas/mes   Chats/mes   Costo/mes   Margen T.básico`);
    console.log(`  ─────────    ──────────  ──────────  ──────────  ───────────────`);
    for (const r of results) {
      console.log(
        `  ${r.tenantId.padEnd(12)} ${String(r.promMensual).padStart(9)}   ${String(r.chatsMes).padStart(8)}    $${r.costoUsdMes.toFixed(2).padStart(6)}      $${(15 - r.costoUsdMes).toFixed(2)}`
      );
    }
    const totalRecurrente = results.length * 15;
    const totalCosto = results.reduce((s, r) => s + r.costoUsdMes, 0);
    console.log(`  ─────────────────────────────────────────────────────────`);
    console.log(`  Si ${results.length} tenants toman tier básico ($15/mes): $${totalRecurrente} recurrente, $${totalCosto.toFixed(2)} costo, $${(totalRecurrente - totalCosto).toFixed(2)} neto/mes`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
