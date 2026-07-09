#!/usr/bin/env node
/*
 * scripts/audit-aura-origen.js
 * ─────────────────────────────────────────────────────────────
 * Diagnóstico: por qué el panel AURA muestra pocas respuestas
 * comparado con el volumen real de citas.
 *
 * Lee las últimas 30 citas del tenant `aura` (per-sede si aplica)
 * y reporta:
 *   · Cuántas tienen `origenAdquisicion` populated
 *   · Distribución por campo `origen` (reserva_online, admin-panel, etc.)
 *   · Distribución por opción elegida (instagram/recomendacion/google/otra)
 *   · Fechas — para saber si el módulo estaba activo cuando se crearon
 *
 * Uso:
 *   node scripts/audit-aura-origen.js
 * ═══════════════════════════════════════════════════════════════ */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

async function main() {
  const tid = 'aura';
  const col = db.collection(`tenants/${tid}/citas`);

  // ── Config del módulo ─────────────────────────────────────
  const cfgSnap = await db.doc(`tenants/${tid}/configuracion/origen_pregunta`).get();
  console.log('═'.repeat(72));
  console.log(`CONFIG del módulo AURA · origen_pregunta`);
  console.log('═'.repeat(72));
  if (cfgSnap.exists) {
    const c = cfgSnap.data();
    console.log(`  activo:       ${c.activo}`);
    console.log(`  obligatorio:  ${c.obligatorio}`);
    console.log(`  opciones:     ${(c.opciones || []).length}`);
    (c.opciones || []).forEach(o => {
      console.log(`    · [${o.id}] "${o.label}"  activo=${o.activo !== false}${o.permitirTextoLibre ? '  +textoLibre' : ''}`);
    });
    const updMs = c.updatedAt?.toMillis?.() || cfgSnap.updateTime?.toMillis?.();
    if (updMs) console.log(`  updatedAt:    ${new Date(updMs).toISOString().slice(0, 19).replace('T', ' ')}`);
  } else {
    console.log('  (no existe el doc — módulo nunca fue configurado)');
  }
  console.log();

  const snap = await col.orderBy('creadoEn', 'desc').limit(30).get();
  if (snap.empty) {
    console.log('No hay citas en tenants/aura/citas');
    return;
  }

  const stats = {
    total: 0,
    conOrigen: 0,
    porOrigenField: {},   // reserva_online, admin-panel, barbero-page, web-mercadopago…
    porOpcion:      {},   // instagram, recomendacion, google, otra
    fechaMinima: null,
    fechaMaxima: null,
  };

  const filas = [];
  for (const d of snap.docs) {
    const c = d.data();
    stats.total += 1;
    const origenField = c.origen || '(sin origen)';
    stats.porOrigenField[origenField] = (stats.porOrigenField[origenField] || 0) + 1;

    if (c.origenAdquisicion?.id) {
      stats.conOrigen += 1;
      const opc = c.origenAdquisicion.id;
      stats.porOpcion[opc] = (stats.porOpcion[opc] || 0) + 1;
    }

    const creadoMs = c.creadoEn?.toMillis?.() || 0;
    if (creadoMs) {
      if (!stats.fechaMinima || creadoMs < stats.fechaMinima) stats.fechaMinima = creadoMs;
      if (!stats.fechaMaxima || creadoMs > stats.fechaMaxima) stats.fechaMaxima = creadoMs;
    }

    filas.push({
      id:     d.id,
      fecha:  c.fecha,
      creadoMs,
      cliente: c.clienteNombre?.slice(0, 20) || '?',
      origen: origenField,
      auraOpcion: c.origenAdquisicion?.id || '—',
      auraLabel:  c.origenAdquisicion?.label || '',
    });
  }

  // Corte de activación del módulo (obtenido del config si existe).
  const cfgActMs = cfgSnap.exists
    ? (cfgSnap.data().updatedAt?.toMillis?.() || cfgSnap.updateTime?.toMillis?.() || 0)
    : 0;

  const post = filas.filter(f => f.creadoMs && f.creadoMs >= cfgActMs);
  const pre  = filas.filter(f => f.creadoMs && f.creadoMs <  cfgActMs);
  const postConOrigen = post.filter(f => f.auraOpcion !== '—').length;

  console.log(`\n──  Ventana crítica: creadas DESPUÉS de activar el módulo  ──`);
  console.log(`  post-activación:      ${post.length}  (${postConOrigen} con respuesta)`);
  console.log(`  pre-activación:       ${pre.length}   (esperado sin respuesta)`);
  if (post.length > postConOrigen) {
    console.log(`  ⚠ ${post.length - postConOrigen} citas creadas DESPUÉS del activo sin respuesta AURA.`);
    console.log(`     → módulo obligatorio pero no se está pidiendo. Bug en el flujo.`);
  }

  console.log('═'.repeat(72));
  console.log(`AUDITORÍA AURA · últimas ${stats.total} citas (${tid})`);
  console.log('═'.repeat(72));
  console.log(`\nRespuestas AURA:  ${stats.conOrigen} / ${stats.total}  (${Math.round(stats.conOrigen / stats.total * 100)}%)`);

  console.log(`\nRango de creación:`);
  if (stats.fechaMinima) {
    console.log(`  desde  ${new Date(stats.fechaMinima).toISOString().slice(0, 19).replace('T', ' ')}`);
    console.log(`  hasta  ${new Date(stats.fechaMaxima).toISOString().slice(0, 19).replace('T', ' ')}`);
  }

  console.log(`\nDistribución por campo "origen" (de dónde vino la cita):`);
  Object.entries(stats.porOrigenField).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${String(k).padEnd(28)} ${v}`);
  });

  console.log(`\nDistribución de respuestas AURA:`);
  if (stats.conOrigen === 0) {
    console.log(`  (ninguna cita tiene origenAdquisicion — módulo no está capturando)`);
  } else {
    Object.entries(stats.porOpcion).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
      console.log(`  ${String(k).padEnd(28)} ${v}`);
    });
  }

  console.log('\nDetalle (últimas 30, ordenado por creación desc):');
  console.log('  creadoEn             | fecha_cita | cliente              | origen                  | aura');
  console.log('  ' + '-'.repeat(112));
  filas.forEach(f => {
    const cre = f.creadoMs ? new Date(f.creadoMs).toISOString().slice(0, 19).replace('T', ' ') : '(sin ts)          ';
    const flag = f.creadoMs >= cfgActMs ? ' ' : '·';
    console.log(`  ${flag}${cre} | ${(f.fecha || '?').padEnd(10)} | ${f.cliente.padEnd(20)} | ${f.origen.padEnd(23)} | ${f.auraOpcion}`);
  });
  console.log('  (· = pre-activación del módulo, esperado sin AURA)');
  console.log();
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
