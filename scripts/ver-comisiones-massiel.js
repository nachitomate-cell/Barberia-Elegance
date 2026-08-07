#!/usr/bin/env node
'use strict';

/*
 * ver-comisiones-massiel.js
 *
 * Reporte de comisiones para vendedores externos SynapTech (Massiel es el
 * primer piloto). Consulta Firestore prod, cruza tenants con _billing y
 * calcula el bono al cierre + el recurring por cada mes activo (con tope
 * de 24 meses).
 *
 * Uso:
 *   node scripts/ver-comisiones-massiel.js               (default ref=massiel)
 *   node scripts/ver-comisiones-massiel.js otro-ref
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  MODELO DE COMISIONES · Definitivo desde 2026-08-05
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  Sin fijo por trial: solo se cobra cuando el cliente PAGA (activa plan).
 *
 *   Plan Básico  $29.900/mes  → $25.000 al cierre + $2.990/mes  × 24 meses
 *   Plan Pro     $49.900/mes  → $40.000 al cierre + $7.485/mes  × 24 meses
 *   Plan Full    $69.900/mes  → $55.000 al cierre + $10.485/mes × 24 meses
 *   Plan Anual   $399.000/año → $100.000 UNA VEZ (sin recurring)
 *
 *   La escalera de bonos sube $15.000 por peldaño (~80% de la primera
 *   mensualidad en los tres) y el recurring es 10% en Básico y 15% en los
 *   planes con IA (Pro y Full) — misma tasa a propósito: el Full ya carga
 *   el costo de IA en dos canales, subirla comería el margen premium.
 *
 *   Tope recurring: 24 meses desde la activación. Después, el cliente
 *   sigue siendo de SynapTech sin costo variable.
 *
 *  BONUS · Add-on Wallet ($9.990/mes)
 *   Si el tenant activa el módulo Wallet (Google + Apple Wallet + geo-push),
 *   Massiel gana +$5.000 UNA VEZ (bonus al cierre del add-on, no recurring).
 *   La idea: incentivarla a mencionarlo en TODO cierre porque es el gancho
 *   más "wow" del producto.
 *   ⚠️ Solo cuenta como VENTA de add-on: en Pro/Full/Anual la Wallet viene
 *   incluida en el plan, así que ahí no paga bonus (2026-08-07).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  📋 CÓMO SE PAGA
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   · Corte los días 30 de cada mes
 *   · Reporte por WhatsApp el día 1 siguiente con desglose
 *   · Transferencia hasta el día 5
 *   · Boleta de honorarios por el total
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ⚠️  REGLAS ANTI-FRAUDE
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   · El pago del cliente tiene que estar aprobado por Mercado Pago
 *   · Si el cliente pide devolución en 30 días → clawback del bono
 *   · Si cancela antes de 60 días → clawback 50% del bono
 *   · El tenant tiene que editar al menos 1 servicio real (prueba de uso)
 *
 *   Todo lo demás es limpio. Cada peso que aparece en el reporte es del
 *   vendedor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

const admin = require('firebase-admin');
const path  = require('path');

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

const creds = cargarCreds();
if (!creds && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Faltan credenciales admin. Setea GOOGLE_APPLICATION_CREDENTIALS o coloca service-account.json en functions/.');
  process.exit(1);
}
admin.initializeApp(creds ? { credential: admin.credential.cert(creds) } : undefined);
const db = admin.firestore();

const REF          = (process.argv[2] || 'massiel').toLowerCase();
const RECURRING_MESES_CAP = 24;
const BONO_WALLET  = 5_000;   // add-on Wallet: bonus único al activarse

const BONOS = {
  basico: 25_000,
  pro:    40_000,
  full:   55_000,
  anual: 100_000,
  // legacy
  individual: 25_000,
  local:      40_000,
};

const RECURRING_MENSUAL = {
  basico:  2_990,   // 10%
  pro:     7_485,   // 15%
  full:   10_485,   // 15% — misma tasa que Pro (planes con IA)
  anual:   0,   // el anual no tiene recurring — se pagó todo el bono al inicio
  // legacy
  individual: 2_990,
  local:      7_485,
};

// Aliases → nombre normalizado para reporte
const NORMALIZAR_PLAN = {
  basico: 'basico', pro: 'pro', full: 'full', anual: 'anual',
  individual: 'basico', local: 'pro',
};

const CLP = (n) => '$ ' + Math.round(n).toLocaleString('es-CL');

function planPretty(p) {
  return ({ basico: 'Básico', pro: 'Pro', full: 'Full', anual: 'Anual' })[NORMALIZAR_PLAN[p] || p] || '—';
}

async function main() {
  console.log(`\n╔══ Reporte comisiones · ref=${REF} · ${new Date().toLocaleDateString('es-CL')} ══════════════════════════╗\n`);

  const snap = await db.collection('tenants').where('refVendedor', '==', REF).get();
  if (snap.empty) {
    console.log(`  Sin tenants con ref=${REF} aún.\n`);
    process.exit(0);
  }

  const filas = [];
  const ahora = Date.now();

  for (const doc of snap.docs) {
    const t = doc.data();
    const slug = doc.id;
    const bill = await db.collection('_billing').doc(slug).get();
    const b = bill.exists ? bill.data() : {};

    const creado   = t.createdAt?.toMillis ? t.createdAt.toMillis() : null;
    const activado = t.activadoEn?.toMillis ? t.activadoEn.toMillis() : null;
    const diasVida = creado ? Math.floor((ahora - creado) / 86400000) : null;

    const planRaw   = String(b.plan || t.plan || 'free').toLowerCase();
    const planNorm  = NORMALIZAR_PLAN[planRaw] || null;
    const convertido = planNorm != null && b.estadoPago === 'al_dia';

    let bono = 0, recurringMensual = 0, recurringAcumulado = 0, mesesActivos = 0, mesesElegibles = 0;
    if (convertido && planNorm) {
      bono = BONOS[planRaw] || 0;
      recurringMensual = RECURRING_MENSUAL[planRaw] || 0;

      // Recurring: solo planes mensuales (no anual). Meses activos desde
      // activadoEn (si existe) o desde createdAt como fallback.
      if (planNorm !== 'anual') {
        const inicio = activado || creado || ahora;
        mesesActivos = Math.max(0, Math.floor((ahora - inicio) / (30 * 86400000)));
        // Tope 24 meses (el mes 1 es el bono, meses 2-25 son recurring = 24 meses)
        mesesElegibles = Math.min(RECURRING_MESES_CAP, Math.max(0, mesesActivos - 1));
        recurringAcumulado = mesesElegibles * recurringMensual;
      }
    }

    // Add-on Wallet: bonus $5.000 único al activarse. Se cuenta apenas
    // walletActivo=true (no exige que el plan base esté al día porque MP
    // puede aprobar el add-on antes que la mensualidad grande) — PERO solo
    // cuando fue una VENTA de add-on: en Pro/Full/Anual la Wallet viene
    // incluida en el plan y pagar bonus ahí sería una fuga (2026-08-07).
    const walletIncluidoEnPlan = ['pro', 'full', 'anual'].includes(planNorm);
    const walletActivo = b.walletActivo === true && !walletIncluidoEnPlan;
    const bonoWallet   = walletActivo ? BONO_WALLET : 0;

    const total = bono + recurringAcumulado + bonoWallet;

    filas.push({
      slug,
      nombre:      t.nombre || '—',
      diasVida:    diasVida != null ? diasVida : '?',
      status:      t.status || '—',
      estadoPago:  b.estadoPago || '—',
      plan:        planNorm ? planPretty(planNorm) : planRaw,
      convertido,
      bono,
      recurringMensual,
      mesesElegibles,
      recurringAcumulado,
      walletActivo,
      bonoWallet,
      total,
    });
  }

  console.log(`  Tenants con ref=${REF}: ${filas.length}\n`);
  console.log('  ┌─────────────────────────────┬───────────┬──────┬─────────┬───────┬──────────┬────────────┬────────┬────────────┐');
  console.log('  │ Slug                        │ Estado    │ Días │ Plan    │ Conv? │ Bono     │ Recurring  │ Wallet │ Total      │');
  console.log('  ├─────────────────────────────┼───────────┼──────┼─────────┼───────┼──────────┼────────────┼────────┼────────────┤');
  for (const f of filas.sort((a, b) => b.total - a.total)) {
    console.log('  │ ' + f.slug.padEnd(27) +
      ' │ ' + String(f.status).padEnd(9) +
      ' │ ' + String(f.diasVida).padStart(4) +
      ' │ ' + String(f.plan).padEnd(7) +
      ' │ ' + (f.convertido ? '  ✓  ' : '  -  ') +
      ' │ ' + CLP(f.bono).padStart(8) +
      ' │ ' + (f.recurringAcumulado
        ? `${CLP(f.recurringAcumulado).padStart(8)} (${f.mesesElegibles}m)`.padStart(10)
        : '        —').padStart(10) +
      ' │ ' + (f.walletActivo ? '💳 +5k' : '   —  ').padStart(6) +
      ' │ ' + CLP(f.total).padStart(10) + ' │');
  }
  console.log('  └─────────────────────────────┴───────────┴──────┴─────────┴───────┴──────────┴────────────┴────────┴────────────┘\n');

  const totales = filas.reduce((acc, f) => ({
    bono:        acc.bono + f.bono,
    recurring:   acc.recurring + f.recurringAcumulado,
    bonoWallet:  acc.bonoWallet + f.bonoWallet,
    walletCount: acc.walletCount + (f.walletActivo ? 1 : 0),
    total:       acc.total + f.total,
    conversiones: acc.conversiones + (f.convertido ? 1 : 0),
    porPlan:     {
      basico: acc.porPlan.basico + (f.plan === 'Básico' && f.convertido ? 1 : 0),
      pro:    acc.porPlan.pro    + (f.plan === 'Pro'    && f.convertido ? 1 : 0),
      full:   acc.porPlan.full   + (f.plan === 'Full'   && f.convertido ? 1 : 0),
      anual:  acc.porPlan.anual  + (f.plan === 'Anual'  && f.convertido ? 1 : 0),
    },
  }), { bono: 0, recurring: 0, bonoWallet: 0, walletCount: 0, total: 0, conversiones: 0, porPlan: { basico: 0, pro: 0, full: 0, anual: 0 } });

  console.log('  RESUMEN');
  console.log('  ──────────────────────────────────');
  console.log('  Tenants trackeados:       ' + filas.length);
  console.log('  Conversiones a plan:      ' + totales.conversiones +
    '  (Básico ' + totales.porPlan.basico + ' · Pro ' + totales.porPlan.pro + ' · Full ' + totales.porPlan.full + ' · Anual ' + totales.porPlan.anual + ')');
  console.log('  Tasa conversión:          ' + (filas.length ? Math.round(100 * totales.conversiones / filas.length) : 0) + '%');
  console.log('  Add-on Wallet activo:     ' + totales.walletCount +
    ' local' + (totales.walletCount === 1 ? '' : 'es') +
    (filas.length ? '  (' + Math.round(100 * totales.walletCount / filas.length) + '% attach rate)' : ''));
  console.log('  ──────────────────────────────────');
  console.log('  Bonos al cierre:          ' + CLP(totales.bono));
  console.log('  Recurring acumulado:      ' + CLP(totales.recurring));
  console.log('  Bonos Wallet:             ' + CLP(totales.bonoWallet));
  console.log('  ──────────────────────────────────');
  console.log('  TOTAL A PAGAR:            ' + CLP(totales.total));
  console.log();
  console.log('  📋 Recordatorio de pago:');
  console.log('  · Corte los días 30 · reporte WA día 1 · transferencia hasta día 5');
  console.log('  · Boleta de honorarios por el total mensual\n');

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
