/**
 * seed-alfamen-instagram.js
 * ─────────────────────────────────────────────────────────────────
 *  Carga los últimos posts (reels) de @barberia.alfamen al lookbook.
 *
 *  Lee C:/tmp/alfamen-ig-posts.json (generado por scrape-ig-alfamen.js),
 *  descarga cada thumbnail del CDN de IG a alfamen/instagram/{id}.webp,
 *  y crea docs en tenants/alfamen/lookbook con el mismo schema que produce
 *  instagram-sync.js (source='instagram' pero SIN token — funcionan las
 *  fotos ya descargadas y el permalink real).
 *
 *  IMPORTANTE: como no hay conexión OAuth de IG para alfamen, el cron
 *  `instagramSyncScheduled` NO va a refrescar estos posts. Al guardar el
 *  thumbnail LOCAL en /alfamen/instagram/ evitamos que las URLs del CDN
 *  caduquen (que era el bug del band-aid original).
 *
 *  Uso:
 *    node scrape-ig-alfamen.js         (Playwright CDP)
 *    node seed-alfamen-instagram.js
 */

const admin  = require('firebase-admin');
const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const { spawnSync } = require('child_process');

const REPO_ROOT = __dirname;
const IG_DIR    = path.join(REPO_ROOT, 'alfamen', 'instagram');
const SCRAPE_JSON = 'C:/tmp/alfamen-ig-posts.json';
const FFMPEG = 'C:/Users/56983/devtools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe';

const SA = path.join(REPO_ROOT, 'service-account.json');
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8'))), projectId: 'barberia-elegance' });
const db = admin.firestore();
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const TENANT_ID = 'alfamen';
const col = db.collection('tenants').doc(TENANT_ID).collection('lookbook');

fs.mkdirSync(IG_DIR, { recursive: true });

function download(url, out) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.instagram.com/' },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, out).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const ws = fs.createWriteStream(out);
      res.pipe(ws);
      ws.on('finish', () => { ws.close(); resolve(out); });
      ws.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

function idFromPermalink(url) {
  const m = url.match(/\/(reel|p)\/([^/?]+)/);
  return m ? m[2] : null;
}

async function main() {
  if (!fs.existsSync(SCRAPE_JSON)) {
    console.error('❌ Falta ' + SCRAPE_JSON + '. Corre primero: node C:/tmp/scrape-ig-alfamen.js');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(SCRAPE_JSON, 'utf8'));

  // Filtrar solo los del feed real de @barberia.alfamen (IG mezcla sugeridos
  // de otros perfiles cuando termina el grid).
  const posts = data.posts.filter(p => p.permalink.includes('/barberia.alfamen/'));
  console.log(`Posts filtrados: ${posts.length} (de ${data.posts.length} scrapeados)\n`);

  const items = [];
  for (const p of posts) {
    const id = idFromPermalink(p.permalink);
    if (!id) continue;
    const jpg  = path.join(IG_DIR, id + '.jpg');
    const webp = path.join(IG_DIR, id + '.webp');
    try {
      if (!fs.existsSync(webp)) {
        console.log('↓', id, '←', p.src.slice(0, 80));
        await download(p.src, jpg);
        // Convertir a webp cuadrado 800x800 (mismo tratamiento que las fotos
        // de barberos). ffmpeg escala cover el frame de IG.
        const r = spawnSync(FFMPEG, ['-v', 'error', '-y', '-i', jpg,
          '-vf', 'scale=800:800:force_original_aspect_ratio=increase,crop=800:800',
          '-quality', '82', webp]);
        if (r.status !== 0) { console.error('  ffmpeg err:', r.stderr.toString().slice(0, 200)); continue; }
        fs.unlinkSync(jpg);
      } else {
        console.log('·', id, 'ya existe');
      }
      items.push({ id, permalink: p.permalink, alt: p.alt, url: '/alfamen/instagram/' + id + '.webp' });
    } catch (e) {
      console.error('  ✗', id, e.message);
    }
  }

  console.log(`\n${items.length} thumbnails listos en /alfamen/instagram/\n`);
  if (items.length === 0) { console.log('No hay nada que subir.'); process.exit(0); }

  // Limpieza: borrar TODOS los docs de source=instagram anteriores
  // (previene duplicados si se re-corre el scrape con nuevos posts).
  const oldSnap = await col.where('source', '==', 'instagram').get();
  if (!oldSnap.empty) {
    console.log(`Limpiando ${oldSnap.size} docs anteriores…`);
    const cleanBatch = db.batch();
    oldSnap.docs.forEach(d => cleanBatch.delete(d.ref));
    await cleanBatch.commit();
  }

  // Base order: debajo de los posts manuales existentes (si hay).
  const topSnap = await col.orderBy('order', 'desc').limit(1).get();
  const maxOrder = topSnap.empty ? 0 : (topSnap.docs[0].data().order ?? 0);
  console.log(`Order base: ${maxOrder}`);

  const batch = db.batch();
  items.forEach((it, i) => {
    const ref = col.doc('ig_' + it.id);
    batch.set(ref, {
      url:          it.url,
      mediaType:    'VIDEO',
      thumbnailUrl: it.url,
      videoUrl:     null,
      permalink:    it.permalink,
      titulo:       '',
      categoria:    '',
      source:       'instagram',
      instagramId:  it.id,
      caption:      it.alt || '',
      timestamp:    '',
      order:        maxOrder + i + 1,
      creadoEn:     Timestamp.now(),
    });
    console.log('  →', ref.path);
  });
  await batch.commit();

  console.log(`\n✅ ${items.length} posts cargados en tenants/${TENANT_ID}/lookbook/`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
