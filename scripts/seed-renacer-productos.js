/**
 * scripts/seed-renacer-productos.js
 *
 * Siembra un catálogo de productos DE DEMOSTRACIÓN bajo
 *   tenants/renacer/productos/{docId}
 * y activa la pestaña "Productos" del /dashboard escribiendo
 *   tenants/renacer/config/ui.productosActivos = true
 *   tenants/renacer/configuracion/main.productosActivos = true
 * (los dos flags que la vista admin-panel/Productos.jsx respeta).
 *
 * Uso:
 *   node scripts/seed-renacer-productos.js            # dry-run
 *   node scripts/seed-renacer-productos.js --commit   # escribir
 *
 * Ajustar/borrar cuando el cliente entregue fotos y precios reales
 * (los precios son placeholders alineados al mercado chileno de retail
 * de peluquería/barbería 2026).
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'service-account.json');
let credential;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')));
  console.log('🔑 Usando service-account.json');
} else {
  credential = admin.credential.applicationDefault();
  console.log('🔑 Usando Application Default Credentials');
}

admin.initializeApp({ credential, projectId: 'barberia-elegance' });

const db  = admin.firestore();
const TS  = admin.firestore.FieldValue.serverTimestamp;

const TENANT_ID = 'renacer';
const COMMIT    = process.argv.includes('--commit');

// Catálogo demo: 10 productos que cubren peluquería, barbería y estética
// para que la pestaña del club se vea llena al mostrarla en pitch.
const PRODUCTOS = [
  {
    nombre:      'Pomada Modeladora Fijación Media',
    descripcion: 'Textura ligera para peinados naturales con brillo controlado. Ideal para cortes clásicos y quiff.',
    precio:      12990,
    marca:       'Renacer Studio',
    categoria:   'Barbería',
    stock:       24,
    stockMinimo: 5,
    precioCosto: 6500,
  },
  {
    nombre:      'Cera Mate Fijación Fuerte',
    descripcion: 'Acabado seco tipo mate, ideal para texturizar y separar mechones. Larga duración sin residuo.',
    precio:      13990,
    marca:       'Renacer Studio',
    categoria:   'Barbería',
    stock:       18,
    stockMinimo: 5,
    precioCosto: 7200,
  },
  {
    nombre:      'Aceite Nutritivo para Barba',
    descripcion: 'Blend de argán, jojoba y almendras. Suaviza, hidrata y perfuma la barba sin dejarla grasosa.',
    precio:      15990,
    marca:       'Renacer Studio',
    categoria:   'Barbería',
    stock:       12,
    stockMinimo: 4,
    precioCosto: 8000,
  },
  {
    nombre:      'Bálsamo Post-Afeitado Calmante',
    descripcion: 'Calma, refresca y cierra el poro después del afeitado con navaja. Con aloe vera y mentol suave.',
    precio:      11990,
    marca:       'Renacer Studio',
    categoria:   'Barbería',
    stock:       15,
    stockMinimo: 4,
    precioCosto: 5800,
  },
  {
    nombre:      'Shampoo Fortificante Uso Diario',
    descripcion: 'Limpia sin resecar y fortalece el cabello desde la raíz. Apto para todo tipo de cabello, 300ml.',
    precio:      9990,
    marca:       'Renacer Care',
    categoria:   'Peluquería',
    stock:       30,
    stockMinimo: 6,
    precioCosto: 4200,
  },
  {
    nombre:      'Acondicionador Reparador Puntas',
    descripcion: 'Sella puntas abiertas y devuelve suavidad. Fórmula con keratina y aceite de coco, 300ml.',
    precio:      10990,
    marca:       'Renacer Care',
    categoria:   'Peluquería',
    stock:       26,
    stockMinimo: 6,
    precioCosto: 4800,
  },
  {
    nombre:      'Mascarilla Hidratación Profunda',
    descripcion: 'Tratamiento semanal para cabellos secos o teñidos. Restaura brillo y elasticidad, 250ml.',
    precio:      14990,
    marca:       'Renacer Care',
    categoria:   'Peluquería',
    stock:       14,
    stockMinimo: 3,
    precioCosto: 7500,
  },
  {
    nombre:      'Sérum Protector Térmico',
    descripcion: 'Protege el cabello del calor de secador y plancha hasta 230°C. Deja brillo espejo sin apelmazar.',
    precio:      13990,
    marca:       'Renacer Care',
    categoria:   'Peluquería',
    stock:       10,
    stockMinimo: 3,
    precioCosto: 6800,
  },
  {
    nombre:      'Crema Facial Hidratante Diaria',
    descripcion: 'Fórmula ligera con ácido hialurónico y niacinamida. Hidrata sin dejar sensación grasa.',
    precio:      16990,
    marca:       'Renacer Beauty',
    categoria:   'Estética',
    stock:       8,
    stockMinimo: 3,
    precioCosto: 8900,
  },
  {
    nombre:      'Sérum Vitamina C Antioxidante',
    descripcion: 'Ilumina, unifica el tono y protege del daño ambiental. Ideal complemento a limpieza facial.',
    precio:      19990,
    marca:       'Renacer Beauty',
    categoria:   'Estética',
    stock:       6,
    stockMinimo: 2,
    precioCosto: 10500,
  },
];

async function main() {
  const productosRef = db.collection('tenants').doc(TENANT_ID).collection('productos');
  const configUiRef  = db.collection('tenants').doc(TENANT_ID).collection('config').doc('ui');
  const configMain   = db.collection('tenants').doc(TENANT_ID).collection('configuracion').doc('main');

  console.log(`\n📦 Renacer — seed de ${PRODUCTOS.length} productos demo`);
  console.log(`   Ruta: tenants/${TENANT_ID}/productos/*`);
  console.log(`   Activar pestaña: config/ui.productosActivos + configuracion/main.productosActivos = true`);
  console.log(`   Modo: ${COMMIT ? '✍️  COMMIT (escribe Firestore)' : '🧪 DRY-RUN (solo imprime)'}\n`);

  PRODUCTOS.forEach((p, i) => {
    console.log(
      `  ${String(i + 1).padStart(2, '0')}. ${p.nombre.padEnd(38)}` +
      ` $${p.precio.toLocaleString('es-CL').padStart(6)}` +
      `  stock=${String(p.stock).padStart(2)}  [${p.categoria}]`
    );
  });

  if (!COMMIT) {
    console.log('\n🧪 Dry-run — no se escribió nada. Ejecutá con --commit para persistir.\n');
    return;
  }

  const batch = db.batch();
  PRODUCTOS.forEach(p => {
    const ref = productosRef.doc();
    batch.set(ref, {
      ...p,
      imagen:     null,          // el cliente subirá fotos desde el panel
      imagenPath: '',
      activo:     true,
      createdAt:  TS(),
      updatedAt:  TS(),
    });
  });
  batch.set(configUiRef,  { productosActivos: true }, { merge: true });
  batch.set(configMain,   { productosActivos: true }, { merge: true });
  await batch.commit();

  console.log(`\n✅ Sembrados ${PRODUCTOS.length} productos + activada la pestaña Productos.\n`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
