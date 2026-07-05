/**
 * audit-valeria-junio-2026.js
 *
 * Auditoría one-shot: identificar la(s) cita(s) que producen el descuadre
 * de $2.153.999 en los ingresos de Valeria Narvaez (D'Jones / tenant lumen)
 * durante junio 2026.
 *
 * Uso: node scripts/audit-valeria-junio-2026.js
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const TENANT_ID    = 'lumen';
const DESDE        = '2026-06-01';
const HASTA        = '2026-06-30';
// substring case-insensitive del nombre del barbero; pasar por CLI:
//   node scripts/audit-valeria-junio-2026.js valeria
const NOMBRE_BARB  = (process.argv[2] || 'valeria').toLowerCase();

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))),
  projectId:  'barberia-elegance',
});
const db = admin.firestore();

const fmt = n => `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`;

async function main() {
  console.log(`\n🔍 Auditando tenant='${TENANT_ID}', barbero~'${NOMBRE_BARB}', ${DESDE} → ${HASTA}\n`);

  const snap = await db.collection(`tenants/${TENANT_ID}/citas`)
    .where('fecha', '>=', DESDE)
    .where('fecha', '<=', HASTA)
    .get();

  console.log(`📥 Docs en ventana:              ${snap.size}`);

  const enRango = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Variantes del nombre "barbero" — mostramos qué valores únicos aparecen
  // para no perder ninguna cita por typo/formato.
  const barberosUnicos = [...new Set(enRango.map(c => c.barbero).filter(Boolean))];
  console.log(`👥 Barberos únicos en ventana:   ${barberosUnicos.length}`);
  barberosUnicos.forEach(b => console.log(`   • ${b}`));
  console.log('');

  const deValeria = enRango.filter(c =>
    (c.barbero || '').toLowerCase().includes(NOMBRE_BARB)
  );
  console.log(`💇 Citas con "${NOMBRE_BARB}" en barbero: ${deValeria.length}`);

  const completadas = deValeria.filter(c => c.estado === 'Completada');
  console.log(`✅ Completadas:                  ${completadas.length}`);
  console.log('');

  // Auditoría de montos irregulares
  const irregulares = [];
  let sumaPrecio = 0;

  completadas.forEach(c => {
    const precio = Number(c.precio) || 0;
    sumaPrecio += precio;
    const noEsMultiploDe100 = precio > 0 && (precio % 100 !== 0);
    const tieneDecimales    = precio !== Math.floor(precio);
    if (noEsMultiploDe100 || tieneDecimales) {
      irregulares.push({
        id:                 c.id,
        fecha:              c.fecha,
        hora:               c.hora,
        clienteNombre:      c.clienteNombre,
        servicioNombre:     c.servicioNombre,
        precio,
        descuentoPct:       c.descuentoPct  ?? c.descuento ?? null,
        descuentoMonto:     c.descuentoMonto ?? null,
        precioSinDescuento: c.precioSinDescuento ?? null,
        corteLapizRecargo:  c.corteLapizRecargo ?? null,
        productosReservados: c.productosReservados || null,
        propina:            c.propina ?? null,
        metodoPago:         c.metodoPago ?? null,
      });
    }
  });

  console.log(`💰 Suma total precio (completadas): ${fmt(sumaPrecio)}`);
  console.log(`⚠  Citas con monto irregular:      ${irregulares.length}`);
  console.log('');

  if (irregulares.length) {
    console.log('════════════════════════════════════════════════════════');
    console.log('  Detalle de citas con monto irregular:');
    console.log('════════════════════════════════════════════════════════');
    irregulares.forEach(c => {
      console.log(`\n  🆔 ${c.id}`);
      console.log(`     📅 ${c.fecha} ${c.hora || ''}`);
      console.log(`     👤 ${c.clienteNombre || '(sin nombre)'}`);
      console.log(`     💈 ${c.servicioNombre || '(sin servicio)'}`);
      console.log(`     💵 precio:              ${fmt(c.precio)} (raw: ${c.precio})`);
      if (c.precioSinDescuento != null) console.log(`     🏷  precioSinDescuento:  ${fmt(c.precioSinDescuento)}`);
      if (c.descuentoPct != null)       console.log(`     🎟  descuentoPct:        ${c.descuentoPct}`);
      if (c.descuentoMonto != null)     console.log(`     🎟  descuentoMonto:      ${fmt(c.descuentoMonto)}`);
      if (c.corteLapizRecargo != null)  console.log(`     ✏  corteLapizRecargo:   ${fmt(c.corteLapizRecargo)}`);
      if (c.propina != null)            console.log(`     💰 propina:             ${fmt(c.propina)}`);
      if (c.metodoPago)                 console.log(`     💳 metodoPago:          ${c.metodoPago}`);
      if (c.productosReservados)        console.log(`     🛒 productos:           ${JSON.stringify(c.productosReservados)}`);
    });
    console.log('\n════════════════════════════════════════════════════════\n');
  } else {
    console.log('✨  Ninguna cita completada tiene monto irregular en `precio`.');
  }

  // Distribución por método de pago (por si el descuadre viene de otra parte)
  const porMetodo = {};
  completadas.forEach(c => {
    const m = c.metodoPago || '(sin método)';
    porMetodo[m] = (porMetodo[m] || 0) + (Number(c.precio) || 0);
  });
  console.log('📊 Distribución por metodoPago:');
  Object.entries(porMetodo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([m, total]) => console.log(`   ${m.padEnd(18)} ${fmt(total)}`));
  console.log('');

  // Resumen de otros posibles montos adicionales (propinas, productos)
  const totalPropinas = completadas.reduce((s, c) => s + (Number(c.propina) || 0), 0);
  const totalProductos = completadas.reduce((s, c) => {
    const prods = c.productosReservados || [];
    return s + prods.reduce((ss, p) => ss + (Number(p.precio) || 0), 0);
  }, 0);
  console.log(`💰 Total propinas (completadas):    ${fmt(totalPropinas)}`);
  console.log(`🛒 Total productos reservados:      ${fmt(totalProductos)}`);
  console.log('');

  process.exit(0);
}

main().catch(e => {
  console.error('❌ Error fatal:', e);
  process.exit(1);
});
