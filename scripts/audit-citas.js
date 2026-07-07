'use strict';

/**
 * scripts/audit-citas.js
 * ─────────────────────────────────────────────────────────────────
 *  Auditoría de citas y bloqueos de un tenant. Encuentra los docs
 *  rotos que crashean la agenda (hora/fecha null, bloqueos sin
 *  rango, etc.) y los reporta con detalle.
 *
 *  Read-only por default. Flags opcionales:
 *    --tenant=<id>       Default: lumen. Usa 'elegance' para root.
 *    --delete-junk       Borra docs sin barberoId Y sin clienteNombre.
 *    --fix-hora-vacia    Convierte hora=null/'' → hora='00:00' (permite
 *                        que aparezcan en la agenda para editarlas).
 *    --fix-fecha-vacia   Convierte fecha=null/'' → fecha del createdAt
 *                        cuando exista, sino la fecha de hoy.
 *    --out=<path>        Guarda el JSON detallado. Default:
 *                        scripts/audit-<tenant>-<timestamp>.json
 *
 *  Uso:
 *    node scripts/audit-citas.js                    (solo auditoría lumen)
 *    node scripts/audit-citas.js --tenant=ferraza
 *    node scripts/audit-citas.js --delete-junk      (repara)
 * ─────────────────────────────────────────────────────────────────
 */

const path  = require('path');
const fs    = require('fs');
const admin = require('firebase-admin');

// ── CLI ──────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const tenantArg   = argv.find(a => a.startsWith('--tenant='));
const outArg      = argv.find(a => a.startsWith('--out='));
const TENANT      = tenantArg ? tenantArg.split('=')[1] : 'lumen';
const DELETE_JUNK = argv.includes('--delete-junk');
const FIX_HORA    = argv.includes('--fix-hora-vacia');
const FIX_FECHA   = argv.includes('--fix-fecha-vacia');
const OUT_PATH    = outArg
  ? outArg.split('=')[1]
  : path.resolve(__dirname, `audit-${TENANT}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);

// ── Init ─────────────────────────────────────────────────────────
const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const isRoot = TENANT === 'elegance';
const CITAS_PATH    = isRoot ? 'citas'    : `tenants/${TENANT}/citas`;
const BLOQUEOS_PATH = isRoot ? 'bloqueos' : `tenants/${TENANT}/bloqueos`;

// ── Validators ───────────────────────────────────────────────────
const RE_HORA  = /^([01]?\d|2[0-3]):[0-5]\d$/;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const isValidHora  = h => typeof h === 'string' && RE_HORA.test(h);
const isValidFecha = f => typeof f === 'string' && RE_FECHA.test(f);

// ── Categorizador ────────────────────────────────────────────────
function categorizarCita(d) {
  const issues = [];
  if (!isValidHora(d.hora))            issues.push('hora_invalida');
  if (!isValidFecha(d.fecha))          issues.push('fecha_invalida');
  if (!d.barberoId)                    issues.push('sin_barberoId');
  if (!d.clienteNombre)                issues.push('sin_clienteNombre');
  if (!d.servicioNombre && !d.servicio) issues.push('sin_servicio');
  if (d.estado == null)                issues.push('sin_estado');
  return issues;
}

function categorizarBloqueo(d) {
  const issues = [];
  if (!isValidFecha(d.fecha))          issues.push('fecha_invalida');
  if (!d.todo_el_dia) {
    if (!isValidHora(d.hora_inicio))   issues.push('hora_inicio_invalida');
    if (!isValidHora(d.hora_fin))      issues.push('hora_fin_invalida');
  }
  if (!d.barberoId && !d.aplicaATodos) issues.push('sin_barberoId');
  return issues;
}

// ── Main ─────────────────────────────────────────────────────────
(async () => {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`AUDITORÍA DE AGENDA · tenant "${TENANT}"`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`Modo    : ${(DELETE_JUNK || FIX_HORA || FIX_FECHA) ? '🔴 REPARACIÓN' : '🟢 SOLO LECTURA'}`);
  if (DELETE_JUNK) console.log('          --delete-junk (borra docs sin barbero ni cliente)');
  if (FIX_HORA)    console.log('          --fix-hora-vacia (asigna 00:00 a las sin hora)');
  if (FIX_FECHA)   console.log('          --fix-fecha-vacia (asigna fecha del createdAt/hoy)');
  console.log(`Path    : ${CITAS_PATH}`);
  console.log(`Output  : ${OUT_PATH}`);
  console.log(`${'═'.repeat(70)}\n`);

  // ─── CITAS ─────────────────────────────────────────────────────
  console.log(`Leyendo ${CITAS_PATH}…`);
  const citasSnap = await db.collection(CITAS_PATH).get();
  console.log(`  ${citasSnap.size} citas totales.`);

  const citasRotas = [];
  const buckets = { hora_invalida: 0, fecha_invalida: 0, sin_barberoId: 0, sin_clienteNombre: 0, sin_servicio: 0, sin_estado: 0, junk_total: 0 };

  citasSnap.docs.forEach(doc => {
    const d = doc.data();
    const issues = categorizarCita(d);
    if (!issues.length) return;
    issues.forEach(k => { buckets[k] = (buckets[k] || 0) + 1; });
    const isJunk = issues.includes('sin_barberoId') && issues.includes('sin_clienteNombre');
    if (isJunk) buckets.junk_total++;
    citasRotas.push({
      id:        doc.id,
      path:      doc.ref.path,
      issues,
      isJunk,
      hora:      d.hora ?? null,
      fecha:     d.fecha ?? null,
      barberoId: d.barberoId ?? null,
      cliente:   d.clienteNombre ?? null,
      servicio:  d.servicioNombre ?? d.servicio ?? null,
      estado:    d.estado ?? null,
      createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? null,
    });
  });

  // ─── BLOQUEOS ──────────────────────────────────────────────────
  console.log(`Leyendo ${BLOQUEOS_PATH}…`);
  let bloqueosSnap;
  try {
    bloqueosSnap = await db.collection(BLOQUEOS_PATH).get();
    console.log(`  ${bloqueosSnap.size} bloqueos totales.`);
  } catch (_) {
    bloqueosSnap = { size: 0, docs: [] };
    console.log(`  (colección no existe)`);
  }

  const bloqueosRotos = [];
  const bloqueosBuckets = { fecha_invalida: 0, hora_inicio_invalida: 0, hora_fin_invalida: 0, sin_barberoId: 0 };

  bloqueosSnap.docs.forEach(doc => {
    const d = doc.data();
    const issues = categorizarBloqueo(d);
    if (!issues.length) return;
    issues.forEach(k => { bloqueosBuckets[k] = (bloqueosBuckets[k] || 0) + 1; });
    bloqueosRotos.push({
      id:          doc.id,
      path:        doc.ref.path,
      issues,
      todo_el_dia: !!d.todo_el_dia,
      hora_inicio: d.hora_inicio ?? null,
      hora_fin:    d.hora_fin ?? null,
      fecha:       d.fecha ?? null,
      barberoId:   d.barberoId ?? null,
    });
  });

  // ─── Reparaciones (solo con flags) ─────────────────────────────
  let deleted = 0, fixedHora = 0, fixedFecha = 0;

  if (DELETE_JUNK) {
    const junk = citasRotas.filter(c => c.isJunk);
    console.log(`\n🔴 Borrando ${junk.length} citas junk (sin barbero ni cliente)…`);
    for (let i = 0; i < junk.length; i += 400) {
      const batch = db.batch();
      junk.slice(i, i + 400).forEach(c => batch.delete(db.doc(c.path)));
      await batch.commit();
      deleted += Math.min(400, junk.length - i);
    }
    console.log(`  ✓ ${deleted} eliminados.`);
  }

  if (FIX_HORA) {
    const sinHora = citasRotas.filter(c => c.issues.includes('hora_invalida') && !c.isJunk);
    console.log(`\n🔧 Fixeando ${sinHora.length} citas con hora inválida → 00:00`);
    for (let i = 0; i < sinHora.length; i += 400) {
      const batch = db.batch();
      sinHora.slice(i, i + 400).forEach(c => batch.update(db.doc(c.path), {
        hora: '00:00',
        _fixedBy: 'audit-citas.js',
        _fixedAt: admin.firestore.FieldValue.serverTimestamp(),
      }));
      await batch.commit();
      fixedHora += Math.min(400, sinHora.length - i);
    }
    console.log(`  ✓ ${fixedHora} reparados.`);
  }

  if (FIX_FECHA) {
    const sinFecha = citasRotas.filter(c => c.issues.includes('fecha_invalida') && !c.isJunk);
    const hoy = new Date().toISOString().slice(0, 10);
    console.log(`\n🔧 Fixeando ${sinFecha.length} citas con fecha inválida → createdAt o hoy (${hoy})`);
    for (let i = 0; i < sinFecha.length; i += 400) {
      const batch = db.batch();
      sinFecha.slice(i, i + 400).forEach(c => {
        const fecha = c.createdAt ? c.createdAt.slice(0, 10) : hoy;
        batch.update(db.doc(c.path), {
          fecha,
          _fixedBy: 'audit-citas.js',
          _fixedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      fixedFecha += Math.min(400, sinFecha.length - i);
    }
    console.log(`  ✓ ${fixedFecha} reparados.`);
  }

  // ─── Reporte ───────────────────────────────────────────────────
  const reporte = {
    tenant:  TENANT,
    ranAt:   new Date().toISOString(),
    citas: {
      total:   citasSnap.size,
      rotas:   citasRotas.length,
      buckets,
      docs:    citasRotas,
    },
    bloqueos: {
      total:   bloqueosSnap.size,
      rotos:   bloqueosRotos.length,
      buckets: bloqueosBuckets,
      docs:    bloqueosRotos,
    },
    reparaciones: { deleted, fixedHora, fixedFecha },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(reporte, null, 2));

  // ─── Resumen consola ──────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`);
  console.log('RESUMEN');
  console.log(`${'═'.repeat(70)}`);
  console.log(`Citas totales     : ${citasSnap.size}`);
  console.log(`Citas rotas       : ${citasRotas.length}  (${(citasRotas.length/citasSnap.size*100).toFixed(1)}%)`);
  console.log(`  ├─ sin hora     : ${buckets.hora_invalida || 0}`);
  console.log(`  ├─ sin fecha    : ${buckets.fecha_invalida || 0}`);
  console.log(`  ├─ sin barberoId: ${buckets.sin_barberoId || 0}`);
  console.log(`  ├─ sin cliente  : ${buckets.sin_clienteNombre || 0}`);
  console.log(`  ├─ sin servicio : ${buckets.sin_servicio || 0}`);
  console.log(`  ├─ sin estado   : ${buckets.sin_estado || 0}`);
  console.log(`  └─ JUNK total   : ${buckets.junk_total || 0}  (sin barbero Y sin cliente → borrables)`);
  console.log('');
  console.log(`Bloqueos totales  : ${bloqueosSnap.size}`);
  console.log(`Bloqueos rotos    : ${bloqueosRotos.length}`);
  console.log(`  ├─ fecha inválida       : ${bloqueosBuckets.fecha_invalida || 0}`);
  console.log(`  ├─ hora_inicio inválida : ${bloqueosBuckets.hora_inicio_invalida || 0}`);
  console.log(`  ├─ hora_fin inválida    : ${bloqueosBuckets.hora_fin_invalida || 0}`);
  console.log(`  └─ sin barberoId        : ${bloqueosBuckets.sin_barberoId || 0}`);
  if (DELETE_JUNK || FIX_HORA || FIX_FECHA) {
    console.log('');
    console.log(`Reparaciones      :`);
    console.log(`  ├─ eliminados   : ${deleted}`);
    console.log(`  ├─ hora fixeada : ${fixedHora}`);
    console.log(`  └─ fecha fixeada: ${fixedFecha}`);
  }
  console.log('');
  console.log(`Reporte JSON      : ${OUT_PATH}`);

  // ─── Primeros 5 ejemplos de cada categoría ─────────────────────
  if (citasRotas.length) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log('EJEMPLOS DE CITAS ROTAS (primeras 5)');
    console.log(`${'─'.repeat(70)}`);
    citasRotas.slice(0, 5).forEach((c, i) => {
      console.log(`\n[${i+1}] ${c.id}`);
      console.log(`    issues   : ${c.issues.join(', ')}${c.isJunk ? '  (JUNK)' : ''}`);
      console.log(`    hora     : ${JSON.stringify(c.hora)}`);
      console.log(`    fecha    : ${JSON.stringify(c.fecha)}`);
      console.log(`    barbero  : ${c.barberoId || '(sin)'}`);
      console.log(`    cliente  : ${c.cliente || '(sin)'}`);
      console.log(`    servicio : ${c.servicio || '(sin)'}`);
      console.log(`    estado   : ${c.estado || '(sin)'}`);
      console.log(`    createdAt: ${c.createdAt || '(sin)'}`);
    });
  }

  console.log(`\n${'═'.repeat(70)}\n`);
  process.exit(0);
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
