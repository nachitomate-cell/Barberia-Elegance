'use strict';

/**
 * scripts/import-barbersclub-productos.js
 * ─────────────────────────────────────────────────────────────────
 *  Carga el catálogo de productos de barbersclub.cl a Firestore
 *  en tenants/barbersclub/productos.
 *
 *  Fuente: https://www.barbersclub.cl/shop (extraído el 2026-07-07).
 *  Schema alineado con admin-panel/src/views/Productos.jsx:15 (EMPTY).
 *
 *  DRY-RUN por default. Requiere --commit para escribir.
 *
 *  Uso:
 *    node scripts/import-barbersclub-productos.js
 *    node scripts/import-barbersclub-productos.js --commit
 *
 *  Opciones:
 *    --commit         Ejecuta las escrituras. Sin este flag = dry-run.
 *    --service=<x>    Ruta al service-account.json.
 *                     Default: ./service-account.json
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
const fs   = require('fs');

const argv       = process.argv.slice(2);
const commit     = argv.includes('--commit');
const serviceArg = argv.find(a => a.startsWith('--service='));

const TENANT       = 'barbersclub';
const SERVICE_PATH = serviceArg ? serviceArg.split('=')[1] : path.resolve(__dirname, '..', 'service-account.json');

if (!fs.existsSync(SERVICE_PATH)) {
  console.error(`ERROR: service-account no existe: ${SERVICE_PATH}`);
  process.exit(1);
}

/**
 * Normaliza URL de Wix Static: los thumbnails que sirve el sitio
 * vienen a 147×147 con /v1/fill/... transform, muy pequeños para
 * card de producto. Reescribimos a 600×600 manteniendo el CDN.
 */
function upgradeWixImage(url) {
  return url.replace(
    /\/v1\/fill\/w_\d+,h_\d+,[^/]+\//,
    '/v1/fill/w_600,h_600,al_c,q_85,enc_avif,quality_auto/'
  );
}

// Fuente: https://www.barbersclub.cl/shop
const PRODUCTOS = [
  { nombre: 'Crema para Peinar (Forming Paste) x 100grs',    precio: 19990, categoria: 'Peinar',      imagen: 'https://static.wixstatic.com/media/542a8a_81c62ad10b14468e958ec836fe688f1f~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_81c62ad10b14468e958ec836fe688f1f~mv2.jpg' },
  { nombre: 'Crema para Peinar (Forming Paste) x 50grs',     precio: 14490, categoria: 'Peinar',      imagen: 'https://static.wixstatic.com/media/542a8a_81c62ad10b14468e958ec836fe688f1f~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_81c62ad10b14468e958ec836fe688f1f~mv2.jpg' },
  { nombre: 'Cera para pelo (Old Wax Extra Fuerte) x 100grs', precio: 19990, categoria: 'Cera',        imagen: 'https://static.wixstatic.com/media/542a8a_dd1a033a4d4b459db101c8de1e2144e6~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_dd1a033a4d4b459db101c8de1e2144e6~mv2.jpg' },
  { nombre: 'Cera para pelo (Old Wax Extra Fuerte) x 50grs',  precio: 14490, categoria: 'Cera',        imagen: 'https://static.wixstatic.com/media/542a8a_dd1a033a4d4b459db101c8de1e2144e6~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_dd1a033a4d4b459db101c8de1e2144e6~mv2.jpg' },
  { nombre: 'Cera para pelo (Old Wax Suave) x 100grs',        precio: 19990, categoria: 'Cera',        imagen: 'https://static.wixstatic.com/media/542a8a_1dc9f4f88bb64258b0935f28f7930159~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_1dc9f4f88bb64258b0935f28f7930159~mv2.jpg' },
  { nombre: 'Cera para pelo (Old Wax Suave) x 50grs',         precio: 14490, categoria: 'Cera',        imagen: 'https://static.wixstatic.com/media/542a8a_1dc9f4f88bb64258b0935f28f7930159~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_1dc9f4f88bb64258b0935f28f7930159~mv2.jpg' },
  { nombre: 'Cera para pelo (Old Wax Fuerte) x 100grs',       precio: 19990, categoria: 'Cera',        imagen: 'https://static.wixstatic.com/media/542a8a_b8882d173c5f48d3a5321ee643559398~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_b8882d173c5f48d3a5321ee643559398~mv2.jpg' },
  { nombre: 'Cera para pelo (Old Wax Fuerte) x 50grs',        precio: 14490, categoria: 'Cera',        imagen: 'https://static.wixstatic.com/media/542a8a_b8882d173c5f48d3a5321ee643559398~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_b8882d173c5f48d3a5321ee643559398~mv2.jpg' },
  { nombre: 'Crema para Peinar Pomada Brillante x 100grs',    precio: 19990, categoria: 'Peinar',      imagen: 'https://static.wixstatic.com/media/542a8a_892ca1d1bd024643bc1b40e80e455bb1~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_892ca1d1bd024643bc1b40e80e455bb1~mv2.jpg' },
  { nombre: 'Crema para Peinar Pomada Brillante x 50grs',     precio: 14490, categoria: 'Peinar',      imagen: 'https://static.wixstatic.com/media/542a8a_892ca1d1bd024643bc1b40e80e455bb1~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_892ca1d1bd024643bc1b40e80e455bb1~mv2.jpg' },
  { nombre: 'Crema para Peinar Pomada Opaca x 100grs',        precio: 19990, categoria: 'Peinar',      imagen: 'https://static.wixstatic.com/media/542a8a_36c7efa92b964fd680d8a12cfcd499ab~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_36c7efa92b964fd680d8a12cfcd499ab~mv2.jpg' },
  { nombre: 'Crema para Peinar Pomada Opaca x 50grs',         precio: 14490, categoria: 'Peinar',      imagen: 'https://static.wixstatic.com/media/542a8a_36c7efa92b964fd680d8a12cfcd499ab~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_36c7efa92b964fd680d8a12cfcd499ab~mv2.jpg' },
  { nombre: 'Shampoo para cabello x 250 ml',                  precio: 17990, categoria: 'Shampoo',     imagen: 'https://static.wixstatic.com/media/542a8a_adcb1ba449ec4f2a9024784f6c565d19~mv2.jpg/v1/fill/w_147,h_147,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/542a8a_adcb1ba449ec4f2a9024784f6c565d19~mv2.jpg' },
];

// Schema espejo de Productos.jsx:15 (EMPTY).
function toFirestoreDoc(p, orden) {
  return {
    nombre:         p.nombre,
    descripcion:    '',
    precio:         p.precio,
    precioOriginal: null,
    marca:          'Barbers Club',
    categoria:      p.categoria || null,
    stock:          '',
    imagen:         upgradeWixImage(p.imagen),
    imagenPath:     '',
    activo:         true,
    precioCosto:    '',
    stockMinimo:    '',
    orden,
  };
}

async function main() {
  console.log('══════════════════════════════════════════════════════════');
  console.log(` Import barbersclub productos → tenants/${TENANT}/productos`);
  console.log('══════════════════════════════════════════════════════════');
  console.log(`Modo: ${commit ? '🔴 COMMIT (escribe a Firestore)' : '🟢 DRY-RUN (solo preview)'}`);
  console.log(`Productos a cargar: ${PRODUCTOS.length}\n`);

  // Preview
  for (let i = 0; i < PRODUCTOS.length; i++) {
    const p = PRODUCTOS[i];
    const doc = toFirestoreDoc(p, i);
    console.log(`  ${String(i + 1).padStart(2, '0')}. ${doc.nombre.padEnd(52)} $${doc.precio.toLocaleString('es-CL')}  [${doc.categoria}]`);
  }
  console.log();

  if (!commit) {
    console.log('🟢 Dry-run: no se escribió a Firebase. Usa --commit para persistir.');
    return;
  }

  console.log('🔴 Modo COMMIT: inicializando Firebase Admin SDK…\n');
  const admin = require('firebase-admin');
  const serviceAccount = require(SERVICE_PATH);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  const { FieldValue } = admin.firestore;

  console.log(`⚠️  Vas a crear ${PRODUCTOS.length} productos en tenants/${TENANT}/productos.`);
  console.log('⚠️  Ctrl+C para abortar en los próximos 5 segundos…\n');
  await new Promise(r => setTimeout(r, 5000));

  const col = db.collection(`tenants/${TENANT}/productos`);
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (let i = 0; i < PRODUCTOS.length; i++) {
    const ref = col.doc(); // autoID, mismo patrón que addDoc en Productos.jsx:767
    batch.set(ref, {
      ...toFirestoreDoc(PRODUCTOS[i], i),
      createdAt: now,
      updatedAt: now,
      importSource: 'barbersclub.cl/shop',
    });
  }

  try {
    await batch.commit();
    console.log(`✓ ${PRODUCTOS.length} productos escritos exitosamente.`);
  } catch (err) {
    console.error(`✗ Error al escribir batch: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
