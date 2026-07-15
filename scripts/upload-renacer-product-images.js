/**
 * scripts/upload-renacer-product-images.js
 *
 * Descarga imágenes reales (LoremFlickr — fotos CC de Flickr filtradas por
 * keyword) para cada producto demo de Renacer, las sube a Firebase Storage
 * bajo tenants/renacer/productos/demo/<docId>.jpg y actualiza el doc en
 * tenants/renacer/productos/{id} con `imagen` (URL pública) + `imagenPath`.
 *
 * Solo actualiza productos que aún no tienen `imagen`. Ejecutar cuando el
 * cliente entregue las fotos oficiales para reemplazar.
 *
 * Uso:
 *   node scripts/upload-renacer-product-images.js            # dry-run
 *   node scripts/upload-renacer-product-images.js --commit   # aplica
 */

'use strict';

const admin  = require('firebase-admin');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const https  = require('https');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'service-account.json');
let credential;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')));
  console.log('🔑 Usando service-account.json');
} else {
  credential = admin.credential.applicationDefault();
  console.log('🔑 Usando Application Default Credentials');
}

admin.initializeApp({
  credential,
  projectId:     'barberia-elegance',
  storageBucket: 'barberia-elegance.firebasestorage.app',
});

const db     = admin.firestore();
const bucket = admin.storage().bucket();
const TS     = admin.firestore.FieldValue.serverTimestamp;

const TENANT_ID = 'renacer';
const COMMIT    = process.argv.includes('--commit');

// Palabras clave para LoremFlickr por producto. Se eligen por familia
// (barba, cabello, skincare) — cada producto usa 2-3 tags que juntos
// aterrizan en fotos coherentes.
function keywordFor(product) {
  const n = (product.nombre || '').toLowerCase();
  const cat = (product.categoria || '').toLowerCase();
  if (n.includes('pomada'))       return 'pomade,barber,hair';
  if (n.includes('cera'))          return 'hair,wax,barber';
  if (n.includes('aceite') && n.includes('barba')) return 'beard,oil,grooming';
  if (n.includes('bálsamo') || n.includes('post-afeit')) return 'aftershave,barber';
  if (n.includes('shampoo'))       return 'shampoo,haircare,bottle';
  if (n.includes('acondicionador'))return 'conditioner,haircare,bottle';
  if (n.includes('mascarilla'))    return 'haircare,cosmetics';
  if (n.includes('sérum') && n.includes('térmico')) return 'serum,haircare';
  if (n.includes('crema') && n.includes('facial')) return 'skincare,cream,cosmetics';
  if (n.includes('sérum') && n.includes('vitamin')) return 'skincare,serum,cosmetics';
  if (cat === 'estética')          return 'cosmetics,skincare';
  if (cat === 'peluquería')        return 'haircare,cosmetics';
  return 'grooming,barber';
}

// slugify liviano — para nombrar archivos limpios.
function slugify(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function downloadImage(url, attempt = 1) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, res => {
      // LoremFlickr responde con 302 a una ruta RELATIVA (/cache/...).
      // Hay que resolverla contra el origin para no romper con "Invalid URL".
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(downloadImage(next, attempt));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} para ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', err => {
      if (attempt < 3) {
        console.warn(`  · Reintento ${attempt + 1} tras error: ${err.message}`);
        setTimeout(() => resolve(downloadImage(url, attempt + 1)), 800);
      } else {
        reject(err);
      }
    });
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
  });
}

async function uploadOne(product) {
  const slug   = slugify(product.nombre) || product.id;
  // `lock` fijo por doc → mismo docId siempre pide la misma foto (idempotente).
  const lock   = parseInt(product.id.slice(0, 6).replace(/[^0-9a-f]/gi, '') || '1', 36) % 1000;
  const kw     = keywordFor(product);
  const srcUrl = `https://loremflickr.com/600/600/${encodeURIComponent(kw)}?lock=${lock}`;
  const bucketPath = `tenants/${TENANT_ID}/productos/demo/${slug}.jpg`;

  console.log(`  ↓ ${product.nombre.padEnd(38)} kw=[${kw}] lock=${lock}`);
  const buf = await downloadImage(srcUrl);
  if (!buf || buf.length < 2048) throw new Error(`imagen muy chica (${buf.length}b) — probable placeholder de error`);

  if (!COMMIT) return { slug, bucketPath, srcUrl, size: buf.length, url: '(dry-run)' };

  // Token de descarga = mismo patrón que Firebase SDK. Lo persistimos en
  // metadata.firebaseStorageDownloadTokens para poder construir la URL
  // pública con `alt=media&token=…`.
  const token = crypto.randomUUID();
  await bucket.file(bucketPath).save(buf, {
    contentType: 'image/jpeg',
    resumable:   false,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(bucketPath)}?alt=media&token=${token}`;
  return { slug, bucketPath, srcUrl, size: buf.length, url };
}

async function main() {
  console.log(`\n📷 Renacer — imágenes demo para productos`);
  console.log(`   Tenant: ${TENANT_ID}`);
  console.log(`   Bucket: ${bucket.name}`);
  console.log(`   Modo:   ${COMMIT ? '✍️  COMMIT' : '🧪 DRY-RUN'}\n`);

  const snap = await db.collection('tenants').doc(TENANT_ID).collection('productos').get();
  console.log(`🔥 ${snap.size} productos en Firestore.\n`);

  const targets = snap.docs.filter(d => {
    const dat = d.data();
    return !dat.imagen; // no pisamos fotos existentes
  });

  if (!targets.length) {
    console.log('✅ Todos los productos ya tienen imagen. Nada que hacer.\n');
    process.exit(0);
  }

  console.log(`📌 A actualizar: ${targets.length}\n`);

  const results = [];
  for (const doc of targets) {
    const product = { id: doc.id, ...doc.data() };
    try {
      const r = await uploadOne(product);
      results.push({ ...r, id: doc.id });
    } catch (e) {
      console.error(`  ✗ ${product.nombre}: ${e.message}`);
    }
  }

  if (!COMMIT) {
    console.log(`\n🧪 Dry-run — ${results.length} descargas verificadas. Ejecutar con --commit para subir + persistir.\n`);
    process.exit(0);
  }

  // Batch update de Firestore con URL + path.
  const batch = db.batch();
  for (const r of results) {
    const ref = db.collection('tenants').doc(TENANT_ID).collection('productos').doc(r.id);
    batch.set(ref, { imagen: r.url, imagenPath: r.bucketPath, updatedAt: TS() }, { merge: true });
  }
  await batch.commit();

  console.log(`\n✅ ${results.length} productos con imagen. URLs de ejemplo:`);
  results.slice(0, 3).forEach(r => console.log(`   · ${r.slug}: ${r.url.slice(0, 120)}...`));
  console.log('');
}

main().catch(err => { console.error('❌ Error:', err); process.exit(1); });
