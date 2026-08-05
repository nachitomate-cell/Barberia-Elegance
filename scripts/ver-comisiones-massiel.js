#!/usr/bin/env node
'use strict';

/*
 * ver-comisiones-massiel.js
 *
 * Reporte de trials creados por Massiel (o cualquier vendedor con ?ref=).
 * Consulta Firestore prod, cruza tenants con _billing, y estima comisión.
 *
 * Uso:
 *   node scripts/ver-comisiones-massiel.js               (default: ref=massiel)
 *   node scripts/ver-comisiones-massiel.js otro-ref
 *
 * Reglas de comisión (ver ventas-massiel/comisiones.md):
 *   - Fijo por trial válido: $3.000
 *   - Bonus one-time por plan activado:
 *       Individual ($29.900/mes) → $15.000
 *       Local      ($49.900/mes) → $25.000
 *   - Recurring 15% del pago mensual, meses 2-6 desde el alta.
 *   - Trial válido = 72h de vida + 1 servicio editado + email único.
 *
 * NOTA: los criterios de "servicio editado" y "email único" NO se validan
 * en este script (para eso hace falta cruzar con servicios y auditar
 * duplicados por email). Aquí se listan TODOS los trials y se marcan los
 * casos obvios de invalidez (< 72h de vida, tenant borrado).
 */

const admin = require('firebase-admin');
const path  = require('path');

// Buscar credenciales admin en las ubicaciones habituales del repo.
function cargarCreds() {
  const candidatos = [
    path.join(__dirname, '..', 'functions', 'service-account.json'),
    path.join(__dirname, '..', 'admin-key.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);
  for (const p of candidatos) {
    try {
      const c = require(p);
      return c;
    } catch (_) {}
  }
  return null;
}

const creds = cargarCreds();
if (!creds && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Faltan credenciales admin. Setea GOOGLE_APPLICATION_CREDENTIALS o coloca service-account.json en functions/.');
  process.exit(1);
}
admin.initializeApp(creds ? { credential: admin.credential.cert(creds) } : undefined);
const db = admin.firestore();

const REF        = (process.argv[2] || 'massiel').toLowerCase();
const FIJO       = 3_000;
const BONUS      = { individual: 15_000, local: 25_000 };
const MENSUAL    = { individual: 29_900, local: 49_900 };
const PCT_RECUR  = 0.15;

const CLP = (n) => '$ ' + Math.round(n).toLocaleString('es-CL');

async function main() {
  console.log(`\n╔══ Reporte comisiones · ref=${REF} ══════════════════════════╗\n`);

  const snap = await db.collection('tenants').where('refVendedor', '==', REF).get();
  if (snap.empty) {
    console.log(`  Sin trials con ref=${REF} aún.\n`);
    process.exit(0);
  }

  const filas = [];
  const ahora = Date.now();

  for (const doc of snap.docs) {
    const t = doc.data();
    const slug = doc.id;
    const bill = await db.collection('_billing').doc(slug).get();
    const b = bill.exists ? bill.data() : {};
    const creado = t.createdAt && t.createdAt.toMillis ? t.createdAt.toMillis() : null;
    const diasVida = creado ? Math.floor((ahora - creado) / 86400000) : null;

    const plan = String(b.plan || t.plan || 'free').toLowerCase();
    // Heurística: si el plan ya no es 'free' y el pago está activo, hay conversión.
    const convertido = plan !== 'free' && b.estadoPago && b.estadoPago !== 'trial';
    const tipoPlan = plan.includes('local') ? 'local' : (plan.includes('individual') ? 'individual' : null);

    // Fijo: solo si vivió al menos 72h (regla anti-fraude simplificada).
    const fijoValido = diasVida !== null && diasVida >= 3;
    const bonus = convertido && tipoPlan ? BONUS[tipoPlan] : 0;

    // Recurring: por cada mes activo entre el 2 y el 6, sumar 15% del plan mensual.
    let recurring = 0;
    if (convertido && tipoPlan && diasVida !== null) {
      const mesesActivos = Math.min(6, Math.floor(diasVida / 30));
      const mesesElegibles = Math.max(0, mesesActivos - 1); // meses 2..6
      recurring = mesesElegibles * MENSUAL[tipoPlan] * PCT_RECUR;
    }

    const total = (fijoValido ? FIJO : 0) + bonus + recurring;

    filas.push({
      slug,
      nombre:    t.nombre || '—',
      tipo:      t.tipo || '—',
      diasVida:  diasVida !== null ? diasVida : '?',
      status:    t.status || '—',
      estadoPago: b.estadoPago || '—',
      plan,
      convertido,
      fijoValido,
      fijo:      fijoValido ? FIJO : 0,
      bonus,
      recurring,
      total,
    });
  }

  // Print
  console.log('  Tenants creados con ref=' + REF + ': ' + filas.length + '\n');
  console.log('  ┌─────────────────────────────┬───────────┬──────┬──────────┬───────┬────────────┐');
  console.log('  │ Slug                        │ Estado    │ Días │ Plan     │ Conv? │ Comisión   │');
  console.log('  ├─────────────────────────────┼───────────┼──────┼──────────┼───────┼────────────┤');
  for (const f of filas.sort((a, b) => b.total - a.total)) {
    console.log('  │ ' + f.slug.padEnd(27) +
      ' │ ' + String(f.status).padEnd(9) +
      ' │ ' + String(f.diasVida).padStart(4) +
      ' │ ' + String(f.plan).padEnd(8) +
      ' │ ' + (f.convertido ? '  ✓  ' : '  -  ') +
      ' │ ' + CLP(f.total).padStart(10) + ' │');
  }
  console.log('  └─────────────────────────────┴───────────┴──────┴──────────┴───────┴────────────┘\n');

  const totales = filas.reduce((acc, f) => ({
    fijo: acc.fijo + f.fijo,
    bonus: acc.bonus + f.bonus,
    recurring: acc.recurring + f.recurring,
    total: acc.total + f.total,
    trialsValidos: acc.trialsValidos + (f.fijoValido ? 1 : 0),
    conversiones: acc.conversiones + (f.convertido ? 1 : 0),
  }), { fijo: 0, bonus: 0, recurring: 0, total: 0, trialsValidos: 0, conversiones: 0 });

  console.log('  RESUMEN');
  console.log('  ────────────────────────────────');
  console.log('  Trials creados:      ' + filas.length);
  console.log('  Trials válidos (>72h): ' + totales.trialsValidos);
  console.log('  Conversiones plan:   ' + totales.conversiones);
  console.log('  Tasa conversión:     ' + (filas.length ? Math.round(100 * totales.conversiones / filas.length) : 0) + '%');
  console.log('  ────────────────────────────────');
  console.log('  Fijo:                ' + CLP(totales.fijo));
  console.log('  Bonus planes:        ' + CLP(totales.bonus));
  console.log('  Recurring acumulado: ' + CLP(totales.recurring));
  console.log('  ────────────────────────────────');
  console.log('  TOTAL A PAGAR:       ' + CLP(totales.total));
  console.log();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
