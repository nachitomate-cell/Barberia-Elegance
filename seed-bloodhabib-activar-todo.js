/**
 * seed-bloodhabib-activar-todo.js
 * ─────────────────────────────────────────────────────────────
 *  Activa las últimas piezas para que el demo se vea vivo:
 *    1) Tienda   → productosActivos:true (doble-write config/ui + configuracion/main)
 *    2) Lookbook → lookbookActivo:true en config/ui
 *    3) Fotos de servicio → toma imágenes ya subidas al lookbook y las
 *       asigna al `imagen` de los 5 servicios principales (los que más se
 *       ven en la agenda pública). Reusa los tokens permanentes de
 *       Storage — no descarga ni re-sube nada.
 *    4) Anuncio en /dashboard → crea tenants/bloodhabib/config/anuncio
 *       con banner promocional del "Servicio Full Habib" (imagen del
 *       lookbook, estilo degradado, CTA a la agenda).
 *
 *  Uso: node seed-bloodhabib-activar-todo.js
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))),
  projectId:  'barberia-elegance',
});
const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;
const TENANT = 'bloodhabib';

// Asignación servicio → shortcode de la publicación de IG. Elegidas por
// afinidad temática: la publicación más reciente para el corte más pedido,
// los reels para servicios "de proceso" (barba, facial). Si el cliente sube
// fotos reales de cada servicio, solo hay que reemplazar la `imagen` desde
// /gestion-interna/servicios.
const SERVICIO_A_IG = {
  'bh-corte-cabello':      'ig_DbblyzPyHxT',
  'bh-corte-barba':        'ig_DXu7JP2klLH',
  'bh-full-habib':         'ig_DWPeoapgQ7N',   // foto (no reel) para el banner
  'bh-barba':              'ig_DXneeaKguGI',
  'bh-corte-facial':       'ig_DXFsJ68jQtz',
};

async function activarTienda() {
  console.log('\n── 1) Tienda ─────────────────────────────────');
  const payload = { productosActivos: true, updatedAt: TS() };
  await Promise.all([
    db.doc(`tenants/${TENANT}/config/ui`).set(payload, { merge: true }),
    db.doc(`tenants/${TENANT}/configuracion/main`).set({ productosActivos: true }, { merge: true }),
  ]);
  console.log('  ✓ config/ui.productosActivos = true');
  console.log('  ✓ configuracion/main.productosActivos = true');
}

async function activarLookbook() {
  console.log('\n── 2) Lookbook ───────────────────────────────');
  await db.doc(`tenants/${TENANT}/config/ui`).set(
    { lookbookActivo: true, updatedAt: TS() },
    { merge: true },
  );
  console.log('  ✓ config/ui.lookbookActivo = true');
}

async function agregarFotosServicios() {
  console.log('\n── 3) Fotos de servicio ──────────────────────');

  // Traemos las URLs (con token) del lookbook — así no hardcodeamos tokens.
  const lookSnap = await db.collection(`tenants/${TENANT}/lookbook`).get();
  const urlPorId = {};
  lookSnap.docs.forEach(d => { urlPorId[d.id] = d.data().url; });

  const batch = db.batch();
  let asignados = 0;
  for (const [servicioId, shortcodeId] of Object.entries(SERVICIO_A_IG)) {
    const url = urlPorId[shortcodeId];
    if (!url) { console.error(`  ✗ ${servicioId}: falta ${shortcodeId} en lookbook`); continue; }
    batch.set(
      db.doc(`tenants/${TENANT}/servicios/${servicioId}`),
      { imagen: url, updatedAt: TS() },
      { merge: true },
    );
    console.log(`  ✓ ${servicioId.padEnd(20)} ← ${shortcodeId}`);
    asignados++;
  }
  await batch.commit();
  console.log(`  ${asignados}/${Object.keys(SERVICIO_A_IG).length} servicios con foto.`);
  return urlPorId;
}

async function crearAnuncioBanner(urlPorId) {
  console.log('\n── 4) Anuncio en /dashboard ──────────────────');
  const imagen = urlPorId['ig_DWPeoapgQ7N'] || urlPorId['ig_DbblyzPyHxT'];
  await db.doc(`tenants/${TENANT}/config/anuncio`).set({
    activo:      true,
    titulo:      'Vive el Servicio Full Habib',
    descripcion: 'Nuevo · $30.000',
    ctaTexto:    'Reservar mi lugar',
    ctaUrl:      '/index.html',
    estilo:      'degradado',
    imagen,
    updatedAt:   TS(),
  }, { merge: true });
  console.log(`  ✓ config/anuncio: "Vive el Servicio Full Habib" ($30.000)`);
  console.log(`     Imagen: ${imagen ? imagen.slice(0, 80) + '…' : '(sin imagen)'}`);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   Blood Habib — Activar tienda + lookbook +      ║');
  console.log('║   fotos servicio + banner dashboard              ║');
  console.log('╚══════════════════════════════════════════════════╝');

  await activarTienda();
  await activarLookbook();
  const urlPorId = await agregarFotosServicios();
  await crearAnuncioBanner(urlPorId);

  console.log('\n✅ Todo activado.\n');
  process.exit(0);
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
