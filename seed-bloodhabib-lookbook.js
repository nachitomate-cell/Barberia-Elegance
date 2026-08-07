/**
 * seed-bloodhabib-lookbook.js
 * ─────────────────────────────────────────────────────────────
 *  Trae los últimos posts públicos de @bloodhabib.barbershop
 *  (previamente extraídos con /c/tmp/cdp-ig-extract.js → JSON en
 *  /c/tmp/ig-bloodhabib-posts.json), descarga cada miniatura del
 *  CDN de IG (URL firmada que caduca), la sube a Firebase Storage
 *  bajo tenants/bloodhabib/lookbook/ (URL permanente) y crea las
 *  entradas Firestore como `source: 'manual'`.
 *
 *  Por qué manual y no source:'instagram': el sync automático de
 *  IG requiere OAuth (token en _system/instagram_bloodhabib) que
 *  hoy Blood Habib no tiene. `source:'manual'` significa "estas
 *  fotos las curó un humano" y el cron nunca las tocará.
 *
 *  Uso: node seed-bloodhabib-lookbook.js
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');
const https = require('https');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
admin.initializeApp({
  credential:     admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))),
  projectId:      'barberia-elegance',
  storageBucket:  'barberia-elegance.firebasestorage.app',
});

const db     = admin.firestore();
const bucket = admin.storage().bucket();
const TS     = admin.firestore.FieldValue.serverTimestamp;
const TENANT = 'bloodhabib';

const POSTS_JSON = 'C:/tmp/ig-bloodhabib-posts.json';
const posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8'));

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} ${url.slice(0, 80)}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function ensureLookbookCleared() {
  // Limpia lookbook previo (por si hubo intentos anteriores) para no duplicar.
  const snap = await db.collection(`tenants/${TENANT}/lookbook`).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log(`  ↺ Purgados ${snap.size} docs de lookbook previos.`);
}

async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   Blood Habib — Lookbook desde Instagram         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`   Posts detectados: ${posts.length}\n`);

  await ensureLookbookCleared();

  // Nos quedamos con los primeros 8 (los más recientes de la grilla).
  const seleccion = posts.slice(0, 8);

  let order = 100;   // Empieza alto para que quede sobre posibles manuales.
  for (const p of seleccion) {
    try {
      console.log(`\n· ${p.type} ${p.shortcode}`);
      const buf = await download(p.url);
      console.log(`  ↓ descargado (${(buf.length / 1024).toFixed(1)} KB)`);

      const dest = `tenants/${TENANT}/lookbook/ig_${p.shortcode}.jpg`;
      const file = bucket.file(dest);
      // Token descarga: idéntico al patrón de otros uploads del panel — con
      // firebaseStorageDownloadTokens el URL público con ?token= sirve para
      // siempre sin necesidad de reglas Storage extra.
      const token = require('crypto').randomUUID();
      await file.save(buf, {
        contentType: 'image/jpeg',
        metadata: { metadata: { firebaseStorageDownloadTokens: token } },
      });
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
      console.log(`  ↑ subido a Storage`);

      const isReel = p.type === 'reel';
      const doc = {
        url,
        mediaType:    isReel ? 'VIDEO' : 'IMAGE',
        thumbnailUrl: url,
        videoUrl:     null,        // No re-hospedamos videos (pesados); reel abre el permalink.
        permalink:    p.permalink,
        titulo:       '',          // Sin caption real; se puede editar en el panel.
        categoria:    'Fade',      // Categoría default (editable desde /gestion-interna/lookbook).
        source:       'manual',    // Marca curación humana → el cron IG NO la sobrescribe.
        instagramId:  null,
        caption:      p.alt || '',
        timestamp:    '',
        order:        order--,
        creadoEn:     TS(),
        origen:       'seed-ig-anon',
        shortcode:    p.shortcode,
      };

      await db.doc(`tenants/${TENANT}/lookbook/ig_${p.shortcode}`).set(doc);
      console.log(`  ✓ Firestore ig_${p.shortcode} listo`);
    } catch (e) {
      console.error(`  ✗ ${p.shortcode}: ${e.message}`);
    }
  }

  console.log('\n✅ Lookbook sembrado. Revísalo en /gestion-interna/lookbook o en la app pública.\n');
  process.exit(0);
}

seed().catch(e => { console.error('\n❌', e.message); process.exit(1); });
