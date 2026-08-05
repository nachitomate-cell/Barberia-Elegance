/**
 * seed-alfamen-productos.js — Carga catálogo de productos de prueba para Alfa Men.
 *
 * Toma los 9 productos que Elegance ya tiene en Firestore (marcas L3VEL3 y
 * Nishman, gama de barbería importada) y los replica bajo tenants/alfamen/
 * productos/ con precios de mercado chileno realistas (los originales tenían
 * casi todos precio 0). Reutiliza las imágenes de Storage de Elegance —
 * mismas URLs, no hay copia de archivos.
 *
 * Uso: node seed-alfamen-productos.js
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SA = path.join(__dirname, 'service-account.json');
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8'))), projectId: 'barberia-elegance' });

const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;
const TENANT_ID = 'alfamen';
const tenantRef = db.collection('tenants').doc(TENANT_ID);
const col = (name) => tenantRef.collection(name);

// Base: 9 productos de Elegance (URLs de imágenes reales), con:
//   · precio de mercado chileno actualizado (importado gama media-alta)
//   · categoría asignada según tipo de producto
//   · marca explícita
//   · stock inicial razonable para arrancar
//   · precio de costo estimado (60% del venta) para que Comisiones/Márgenes
//     tengan datos verosímiles desde el día 1
const PRODUCTOS = [
  // ── L3VEL3 (marca gringa, gama media-alta) ────────────────────────────
  {
    id: 'l3vel3-matte-putty',
    nombre: 'L3VEL3 Matte Putty',
    marca: 'L3VEL3',
    categoria: 'Peinado',
    descripcion: 'Masilla de fijación fuerte y acabado completamente mate. Se utiliza para lograr looks muy naturales y texturizados, dando la impresión de que no llevas ningún producto aplicado.',
    imagen: 'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339352953_688835717_1002362832216852_1054647894637141225_n.jpg?alt=media&token=86200c52-1dd3-49e0-80ac-ff2d3f5b9d84',
    precio: 22000, precioCosto: 13000, stock: 10, stockMinimo: 3, activo: true,
  },
  {
    id: 'l3vel3-paste',
    nombre: 'L3VEL3 Paste',
    marca: 'L3VEL3',
    categoria: 'Peinado',
    descripcion: 'Pasta de peinado con fijación firme y acabado mate. Ideal para aportar textura y volumen, manteniendo el cabello en su lugar sin dejarlo rígido, pegajoso ni con aspecto húmedo.',
    imagen: 'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339278942_692447222_1682489793093882_4264514267853551734_n.jpg?alt=media&token=a560c4da-496b-4138-9866-628afd677c9d',
    precio: 22000, precioCosto: 13000, stock: 10, stockMinimo: 3, activo: true,
  },
  {
    id: 'l3vel3-pomade',
    nombre: 'L3VEL3 Pomade',
    marca: 'L3VEL3',
    categoria: 'Peinado',
    descripcion: 'Pomada clásica de acabado brillante y pulido con buena fijación. La opción para peinados clásicos, slick back o degradados muy definidos.',
    imagen: 'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339309103_688925431_938370372327099_5108581816863624889_n.jpg?alt=media&token=343b22d6-3157-4244-a25a-0ce60ab5c4ea',
    precio: 22000, precioCosto: 13000, stock: 8, stockMinimo: 3, activo: true,
  },
  {
    id: 'l3vel3-forming-cream',
    nombre: 'L3VEL3 Forming Cream',
    marca: 'L3VEL3',
    categoria: 'Peinado',
    descripcion: 'Crema formadora que proporciona una fijación media y un brillo natural. Perfecta para estilos más sueltos y flexibles que quieras reacomodar con las manos a lo largo del día.',
    imagen: 'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339242459_684280475_2055051721716151_2908765271490305126_n.jpg?alt=media&token=22aaa06e-bfee-46eb-ace5-8a4db8f8f181',
    precio: 22000, precioCosto: 13000, stock: 8, stockMinimo: 3, activo: true,
  },
  {
    id: 'l3vel3-aftershave-fresh',
    nombre: 'L3VEL3 Aftershave Cologne "Fresh"',
    marca: 'L3VEL3',
    categoria: 'After Shave',
    descripcion: 'Colonia after shave diseñada para aplicarse después del afeitado. Calma, hidrata y revitaliza la piel reduciendo la irritación de la navaja. Perfil aromático fresco, limpio y revitalizante.',
    imagen: 'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339442972_684163789_1049085067443872_3072686142081223635_n.jpg?alt=media&token=b6f2633e-20d1-4a81-b9ff-a16dccb1edc2',
    precio: 16000, precioCosto: 9500, stock: 6, stockMinimo: 2, activo: true,
  },
  {
    id: 'l3vel3-aftershave-flame',
    nombre: 'L3VEL3 Aftershave Cologne "Flame"',
    marca: 'L3VEL3',
    categoria: 'After Shave',
    descripcion: 'Colonia after shave que calma, hidrata y revitaliza la piel tras el afeitado. Notas más intensas, cálidas y amaderadas para quienes buscan una fragancia con carácter.',
    imagen: 'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339373075_685496544_1488418015975731_9120326152668709284_n.jpg?alt=media&token=3f738005-d1d0-4125-8c41-de78890f3c79',
    precio: 16000, precioCosto: 9500, stock: 6, stockMinimo: 2, activo: true,
  },

  // ── Nishman (marca turca, gama profesional) ────────────────────────────
  {
    id: 'nishman-s1-black-widow',
    nombre: 'Nishman S1 Black Widow',
    marca: 'Nishman',
    categoria: 'Peinado',
    descripcion: 'Cera de efecto telaraña con fijación extra fuerte y aroma intenso a colonia masculina. Ideal para peinados de larga duración con máximo control.',
    imagen: 'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339180788_684478192_955335497521126_7974138679348882942_n.png?alt=media&token=bc9e9bb2-7191-4983-b91e-d3d8baacd56c',
    precio: 18000, precioCosto: 10500, stock: 8, stockMinimo: 3, activo: true,
  },
  {
    id: 'nishman-s3-blue-web',
    nombre: 'Nishman S3 Blue Web',
    marca: 'Nishman',
    categoria: 'Peinado',
    descripcion: 'Cera de textura fibrosa y fijación fuerte. Comparte el efecto telaraña de la S1 pero con perfil aromático fresco y toques afrutados.',
    imagen: 'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778337891307_689380752_1032805926077827_5173361570325935804_n.png?alt=media&token=abf3b598-1fdf-46e4-9bbf-2ec85966f384',
    precio: 18000, precioCosto: 10500, stock: 8, stockMinimo: 3, activo: true,
  },
  {
    id: 'nishman-s4-argan',
    nombre: 'Nishman S4 Argan',
    marca: 'Nishman',
    categoria: 'Peinado',
    descripcion: 'Cera de peinado enriquecida con extracto de aceite de argán. Ofrece la misma tecnología de la línea Nishman con un ligero acondicionamiento adicional para el cabello.',
    imagen: 'https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/productos%2F1778339133209_685103004_2012953566236369_8094435847563949826_n.jpg?alt=media&token=65a81faf-0471-4bd7-b11d-e28a975d2aad',
    precio: 20000, precioCosto: 12000, stock: 6, stockMinimo: 2, activo: true,
  },
];

async function seed() {
  console.log(`\n── PRODUCTOS (${PRODUCTOS.length}) ──`);

  // Limpieza previa: si ya se corrió el seed, saco los docs con el mismo id
  // para no acumular basura si se cambia el catálogo.
  const existentes = await col('productos').get();
  if (!existentes.empty) {
    const ids = new Set(PRODUCTOS.map(p => p.id));
    const acoplar = existentes.docs.filter(d => ids.has(d.id));
    console.log(`  → ${acoplar.length} docs existentes se van a mergear; ${existentes.size - acoplar.length} quedan intactos.`);
  }

  const batch = db.batch();
  for (const p of PRODUCTOS) {
    const { id, ...data } = p;
    batch.set(col('productos').doc(id), {
      ...data,
      updatedAt: TS(),
      createdAt: TS(),
    }, { merge: true });
    console.log(`  · [${data.categoria}] ${data.nombre} — $${data.precio.toLocaleString('es-CL')} · stock ${data.stock}`);
  }
  await batch.commit();
  console.log(`\n✅ ${PRODUCTOS.length} productos cargados en tenants/${TENANT_ID}/productos/`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
