/**
 * scripts/seed-omega-lookbook.js
 *
 * Rehospeda las últimas fotos públicas del perfil de Instagram
 * @omegastudio.cl en Firebase Storage y crea los docs correspondientes en
 * `tenants/omega/lookbook`. Reusa el mismo shape que instagram-sync.js
 * (source='instagram', instagramId, url, permalink, order, categoria…) para
 * que el Lookbook del panel y el widget del /dashboard lo consuman igual que
 * los tenants con OAuth conectado.
 *
 * Se rehospeda a Storage porque las URLs del CDN de IG caducan en horas
 * (`oh=...&oe=UNIX_TIMESTAMP`). Al bajar → subir a Storage la URL queda
 * permanente. Sin OAuth no se puede refrescar automáticamente cuando IG rota
 * las URLs, así que este es el camino correcto para un tenant sin token.
 *
 * Los items se leen desde C:/tmp/omega-ig-posts.json (12 posts scrapeados
 * del perfil público con playwright).
 *
 * Uso:
 *   node scripts/seed-omega-lookbook.js           # dry-run
 *   node scripts/seed-omega-lookbook.js --commit  # descarga, sube, escribe
 */

const admin  = require('firebase-admin');
const fs     = require('fs');
const path   = require('path');
const https  = require('https');

const SA = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential:     admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8'))),
  projectId:      'barberia-elegance',
  storageBucket:  'barberia-elegance.firebasestorage.app',
});

const db     = admin.firestore();
const TS     = admin.firestore.Timestamp;
const bucket = admin.storage().bucket();

const TENANT_ID = 'omega';
const COMMIT    = process.argv.includes('--commit');
const POSTS = JSON.parse(fs.readFileSync('C:/tmp/omega-ig-posts.json', 'utf8'));

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} at ${url.slice(0, 80)}…`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  console.log(`\n${COMMIT ? '🟢 COMMIT' : '🟡 DRY-RUN'} — ingiriendo ${POSTS.length} posts de IG en tenants/${TENANT_ID}/lookbook`);

  const col = db.collection(`tenants/${TENANT_ID}/lookbook`);

  // Limpieza: borrar docs source='instagram' previos para no acumular basura
  // (los docs manuales quedan intactos).
  const prev = await col.where('source', '==', 'instagram').get();
  if (!prev.empty) {
    console.log(`  ⌫ ${prev.size} docs IG previos a borrar`);
    if (COMMIT) {
      const batch = db.batch();
      prev.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }

  let order = 1;
  for (const p of POSTS) {
    const storagePath = `tenants/${TENANT_ID}/lookbook/ig_${p.instagramId}.jpg`;
    let publicUrl;

    if (COMMIT) {
      try {
        const buf = await download(p.thumb);
        const file = bucket.file(storagePath);
        // Token pseudo-aleatorio determinista simple
        const token = require('crypto').randomBytes(16).toString('hex');
        await file.save(buf, {
          metadata: {
            contentType: 'image/jpeg',
            metadata: { firebaseStorageDownloadTokens: token },
          },
        });
        publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
        console.log(`  ✓ [${String(order).padStart(2, '0')}] ${p.instagramId} → ${(buf.length / 1024).toFixed(0)} KB`);
      } catch (e) {
        console.log(`  ✗ [${String(order).padStart(2, '0')}] ${p.instagramId} FALLÓ: ${e.message}`);
        order++;
        continue;
      }
    } else {
      publicUrl = `(sería) https://firebasestorage…/${storagePath}`;
      console.log(`  · [${String(order).padStart(2, '0')}] ${p.instagramId.padEnd(15)} ${p.isReel ? 'REEL' : 'FOTO'}  ${p.permalink}`);
    }

    if (COMMIT) {
      await col.doc(`ig_${p.instagramId}`).set({
        url:          publicUrl,
        mediaType:    p.isReel ? 'VIDEO' : 'IMAGE',
        thumbnailUrl: p.isReel ? publicUrl : null,
        videoUrl:     null,   // sin OAuth no tengo el mp4; tap sobre la card abre el permalink
        permalink:    p.permalink,
        titulo:       '',
        categoria:    '',
        source:       'instagram',
        instagramId:  p.instagramId,
        caption:      p.alt || '',
        timestamp:    '',
        order:        order,
        creadoEn:     TS.now(),
      });
    }
    order++;
  }

  console.log(COMMIT ? `\n✅ ${POSTS.length} posts subidos y registrados.` : '\n⏸️  Dry-run. Correr con --commit para persistir.');
  process.exit(0);
})();
