/**
 * seed-mapu-premios-productos.js
 * Crea premios y productos de ejemplo para Mapu Barber Shop.
 * Ejecutar una sola vez: node seed-mapu-premios-productos.js
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SA_PATH = path.join(__dirname, 'service-account.json');
admin.initializeApp({
  credential: fs.existsSync(SA_PATH)
    ? admin.credential.cert(JSON.parse(fs.readFileSync(SA_PATH, 'utf8')))
    : admin.credential.applicationDefault(),
  projectId: 'barberia-elegance',
});

const db     = admin.firestore();
const TS     = admin.firestore.FieldValue.serverTimestamp;
const tenant = db.collection('tenants').doc('mapubarbershop');

// ── Premios ────────────────────────────────────────────────────────────────────
const PREMIOS = [
  {
    id: 'mapu-p-01',
    nombre:      'Corte de Cabello Gratis',
    descripcion: 'Canjea 10 sellos y obtén un corte de cabello completamente gratis.',
    costoSellos: 10,
    icono:       'ph-scissors',
  },
  {
    id: 'mapu-p-02',
    nombre:      'Perfilado de Barba Gratis',
    descripcion: 'Canjea 7 sellos y llévate un perfilado de barba sin costo.',
    costoSellos: 7,
    icono:       'ph-star',
  },
  {
    id: 'mapu-p-03',
    nombre:      'Combo Corte + Barba 50% Off',
    descripcion: 'Con 15 sellos obtienes un combo corte + perfilado de barba al 50% de descuento.',
    costoSellos: 15,
    icono:       'ph-tag',
  },
  {
    id: 'mapu-p-04',
    nombre:      'Producto Premium Gratis',
    descripcion: 'Canjea 12 sellos y llévate un producto de cuidado capilar premium a elección.',
    costoSellos: 12,
    icono:       'ph-gift',
  },
  {
    id: 'mapu-p-05',
    nombre:      'Servicio VIP — Rasurado Completo',
    descripcion: 'El máximo premio: 20 sellos te dan un rasurado completo con protocolo premium incluido.',
    costoSellos: 20,
    icono:       'ph-crown',
  },
];

// ── Productos ──────────────────────────────────────────────────────────────────
const PRODUCTOS = [
  {
    id: 'mapu-prod-01',
    nombre:      'Pomada Mate Fuerte',
    descripcion: 'Fijación fuerte con acabado mate. Ideal para estilos estructurados y cortes clásicos.',
    precio:      9900,
    stock:       15,
    imagen:      '',
    imagenPath:  '',
  },
  {
    id: 'mapu-prod-02',
    nombre:      'Cera Brillante Premium',
    descripcion: 'Fijación media con acabado brillante. Perfecta para looks pulidos y formales.',
    precio:      8500,
    stock:       12,
    imagen:      '',
    imagenPath:  '',
  },
  {
    id: 'mapu-prod-03',
    nombre:      'Aceite de Barba Hidratante',
    descripcion: 'Aceite natural para barba que suaviza, hidrata y da brillo. Aroma amaderado.',
    precio:      11900,
    stock:       10,
    imagen:      '',
    imagenPath:  '',
  },
  {
    id: 'mapu-prod-04',
    nombre:      'Shampoo para Barba',
    descripcion: 'Limpieza profunda específica para barba. Evita la picazón y el ressecamiento.',
    precio:      7900,
    stock:       8,
    imagen:      '',
    imagenPath:  '',
  },
  {
    id: 'mapu-prod-05',
    nombre:      'Bálsamo Post-Afeitado',
    descripcion: 'Calma la piel después del afeitado. Reduce el enrojecimiento y el ardor.',
    precio:      8900,
    stock:       10,
    imagen:      '',
    imagenPath:  '',
  },
  {
    id: 'mapu-prod-06',
    nombre:      'Polvo Voluminizador',
    descripcion: 'Da textura y volumen sin pesar el cabello. Ideal para estilos desenfadados.',
    precio:      10500,
    stock:       6,
    imagen:      '',
    imagenPath:  '',
  },
];

async function seed() {
  // ── Premios ──────────────────────────────────────────────────────────────────
  console.log('\n── Premios ─────────────────────────────────────────────');
  const premiosCol = tenant.collection('premios');
  for (const p of PREMIOS) {
    const { id, ...data } = p;
    await premiosCol.doc(id).set({ ...data, createdAt: TS(), updatedAt: TS() });
    console.log(`✓ [${data.costoSellos} sellos] ${data.nombre}`);
  }

  // ── Productos ─────────────────────────────────────────────────────────────────
  console.log('\n── Productos ───────────────────────────────────────────');
  const productosCol = tenant.collection('productos');
  for (const p of PRODUCTOS) {
    const { id, ...data } = p;
    await productosCol.doc(id).set({ ...data, createdAt: TS(), updatedAt: TS() });
    console.log(`✓ $${data.precio.toLocaleString('es-CL').padStart(7)} | stock ${String(data.stock).padStart(2)} | ${data.nombre}`);
  }

  console.log(`\n✅ ${PREMIOS.length} premios y ${PRODUCTOS.length} productos creados en tenants/mapubarbershop`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
