'use strict';

/**
 * scripts/set-storage-cache-headers.js
 * ─────────────────────────────────────────────────────────────────
 *  Aplica Cache-Control a archivos EXISTENTES en Firebase Storage,
 *  para que el navegador los cachee agresivamente y no los re-descargue
 *  cada vez que se abre una vista (agenda, equipo, panel del cliente).
 *
 *  Es el complemento del fix en el frontend: los nuevos uploads ya salen
 *  con cacheControl seteado, pero las fotos ya subidas no lo tienen.
 *
 *  DRY-RUN por default. Requiere --commit para escribir.
 *
 *  Uso:
 *    # Ver qué haría (todas las carpetas):
 *    node scripts/set-storage-cache-headers.js
 *
 *    # Aplicar cambios reales:
 *    node scripts/set-storage-cache-headers.js --commit
 *
 *    # Solo una carpeta específica:
 *    node scripts/set-storage-cache-headers.js --prefix=barberos/ --commit
 *    node scripts/set-storage-cache-headers.js --prefix=tenants/aura/barberos/ --commit
 *
 *  Opciones:
 *    --commit           Ejecuta las escrituras. Sin este flag = dry-run.
 *    --prefix=<path>    Prefijo de path para filtrar (default: todos).
 *    --service=<x>      Ruta al service-account.json.
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
const fs   = require('fs');

const argv       = process.argv.slice(2);
const commit     = argv.includes('--commit');
const prefixArg  = argv.find(a => a.startsWith('--prefix='));
const serviceArg = argv.find(a => a.startsWith('--service='));

const SERVICE_PATH = serviceArg ? serviceArg.split('=')[1] : path.resolve(__dirname, '..', 'service-account.json');
const PREFIX_FILTER = prefixArg ? prefixArg.split('=')[1] : '';

if (!fs.existsSync(SERVICE_PATH)) {
  console.error(`ERROR: service-account no existe: ${SERVICE_PATH}`);
  process.exit(1);
}

// ── Rutas objetivo — tienen path con timestamp único, así que es seguro
//    aplicarles cacheControl immutable de 1 año. Fotos de barberos, productos,
//    lookbook, gift cards, marketing banners, servicio favorito.
//    IMPORTANT: excluir paths fijos (tv-bg.*, servicios/*/imagen.jpg) para no
//    romper la actualización de esos assets — se cachean por 1 día en su lugar.
const IMMUTABLE_PREFIXES = [
  'barberos/',
  'tenants/',   // cubre tenants/{tid}/barberos, /productos, /marketing, /lookbook, /gift-cards, /servicio_favorito, /publicidad_tv
  'lookbook/',
  'marketing/',
  'giftCards/',
  'servicio_favorito/',
  'productos/',
];

// Paths con nombre fijo — cache 1 día en vez de immutable para que se
// refresque cuando el user sube uno nuevo.
const SHORT_CACHE_MATCHERS = [
  /\/tv-bg\.[a-z]+$/i,
  /\/servicios\/[^/]+\/imagen\.jpg$/i,
];

function isImmutablePath(name) {
  return IMMUTABLE_PREFIXES.some(p => name.startsWith(p));
}

function isShortCachePath(name) {
  return SHORT_CACHE_MATCHERS.some(rx => rx.test(name));
}

async function main() {
  console.log('══════════════════════════════════════════════════════════');
  console.log(' Set Cache-Control a archivos existentes de Firebase Storage');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`Modo: ${commit ? '🔴 COMMIT (aplica cambios reales)' : '🟢 DRY-RUN (solo preview)'}`);
  if (PREFIX_FILTER) console.log(`Filtro: prefix="${PREFIX_FILTER}"\n`);
  else console.log();

  const admin = require('firebase-admin');
  const serviceAccount = require(SERVICE_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
  });

  const bucket = admin.storage().bucket();
  console.log(`Bucket: ${bucket.name}\n`);

  console.log('Listando archivos…');
  const [files] = await bucket.getFiles({ prefix: PREFIX_FILTER });
  console.log(`✓ ${files.length} archivos encontrados\n`);

  let inmutablesSkipped = 0;
  let shortsSkipped     = 0;
  let noTargetSkipped   = 0;
  let inmutablesUpdated = 0;
  let shortsUpdated     = 0;
  let errores          = 0;

  const BATCH = 20;
  for (let i = 0; i < files.length; i += BATCH) {
    const chunk = files.slice(i, i + BATCH);
    await Promise.all(chunk.map(async (file) => {
      const name = file.name;
      // Priorizar SHORT_CACHE_MATCHERS: los paths fijos (tv-bg.*,
      // servicios/*/imagen.jpg) matchean tanto el prefijo tenants/ como el
      // regex de short-cache. Sin esto, se aplicaba immutable a paths que se
      // sobrescriben, rompiendo la actualizacion del asset.
      const targetShort     = isShortCachePath(name);
      const targetImmutable = !targetShort && isImmutablePath(name);
      if (!targetImmutable && !targetShort) {
        noTargetSkipped++;
        return;
      }
      const targetCache = targetImmutable
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=86400';

      // Skip si ya tiene el mismo valor
      const [metadata] = await file.getMetadata();
      if (metadata.cacheControl === targetCache) {
        if (targetImmutable) inmutablesSkipped++;
        else shortsSkipped++;
        return;
      }

      if (!commit) {
        console.log(`  [DRY] ${name}  →  ${targetCache}`);
        if (targetImmutable) inmutablesUpdated++;
        else shortsUpdated++;
        return;
      }

      try {
        await file.setMetadata({ cacheControl: targetCache });
        if (targetImmutable) inmutablesUpdated++;
        else shortsUpdated++;
        process.stdout.write(`\r  actualizados: ${inmutablesUpdated + shortsUpdated}`);
      } catch (err) {
        errores++;
        console.error(`\n  ✗ ${name}: ${err.message}`);
      }
    }));
  }
  process.stdout.write('\n\n');

  console.log('══════════════════════════════════════════════════════════');
  console.log(' Resumen');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Actualizados con cache immutable (1 año): ${inmutablesUpdated}`);
  console.log(`  Actualizados con cache corto (1 día):     ${shortsUpdated}`);
  console.log(`  Saltados (ya tenían el valor correcto):   ${inmutablesSkipped + shortsSkipped}`);
  console.log(`  Saltados (no aplican):                    ${noTargetSkipped}`);
  console.log(`  Errores:                                  ${errores}`);
  if (!commit) console.log('\n🟢 Dry-run: no se escribió a Firebase. Usa --commit para persistir.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
