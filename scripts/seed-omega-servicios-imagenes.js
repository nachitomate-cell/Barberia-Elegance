/**
 * scripts/seed-omega-servicios-imagenes.js
 *
 * Asigna imágenes a los 13 servicios de omega reusando fotos ya existentes
 * en el repo (renacer/servicios/*.webp) y en Storage (tenants/yugen/servicios).
 * Se elige por afinidad temática: corte, corte+barba, barba, limpieza facial,
 * cejas, color, ondulación. Ver [[checklist-tenant-nuevo]] — el campo es
 * `imagen` para el paso 1 de la reserva pública.
 *
 * Uso:
 *   node scripts/seed-omega-servicios-imagenes.js           # dry-run
 *   node scripts/seed-omega-servicios-imagenes.js --commit  # escribe
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SA = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8'))),
  projectId: 'barberia-elegance',
});

const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;
const TENANT_ID = 'omega';
const COMMIT    = process.argv.includes('--commit');

// URLs de Storage de yugen (barbería masculina premium; misma vibe que omega).
const YUGEN = (id) =>
  `https://firebasestorage.googleapis.com/v0/b/barberia-elegance.firebasestorage.app/o/tenants%2Fyugen%2Fservicios%2Fsrv-yg-${id}%2Fimagen.jpg?alt=media`;

const IMAGENES = {
  // Servicios omega → mejor imagen disponible.
  'srv-o-01': '/renacer/servicios/perfilado-de-cejas-masculino.webp',   // Perfilado cejas
  'srv-o-02': YUGEN('01'),                                              // Corte de Cabello
  'srv-o-03': '/renacer/servicios/corte-masculino-perfilado-de-cejas.webp', // Corte + cejas
  'srv-o-04': YUGEN('05'),                                              // Corte + limpieza facial
  'srv-o-05': YUGEN('04'),                                              // Corte + barba tradicional
  'srv-o-06': '/renacer/servicios/corte-masculino-barba.webp',          // Corte + barba express
  'srv-o-07': YUGEN('07'),                                              // Servicio full (corte+barba+limpieza)
  'srv-o-08': YUGEN('02'),                                              // Barba tradicional
  'srv-o-09': '/renacer/servicios/perfilado-de-barba.webp',             // Barba exprés
  'srv-o-10': YUGEN('03'),                                              // Limpieza facial
  'srv-o-11': '/renacer/servicios/ondulacion-permanente.webp',          // Ondulación permanente
  'srv-o-12': '/renacer/servicios/visos-dimension-capilar.webp',        // Visos color
  'srv-o-13': '/renacer/servicios/cobertura-de-canas-premium-sin-amoniaco.webp', // Color global
};

(async () => {
  console.log(`\n${COMMIT ? '🟢 COMMIT' : '🟡 DRY-RUN'} — asignando imágenes a los servicios de tenants/${TENANT_ID}/servicios`);

  const col = db.collection(`tenants/${TENANT_ID}/servicios`);

  for (const [id, imagen] of Object.entries(IMAGENES)) {
    const doc = col.doc(id);
    const snap = await doc.get();
    if (!snap.exists) {
      console.log(`  ⚠ ${id} no existe — se salta.`);
      continue;
    }
    const nombre = snap.data().nombre || '(sin nombre)';
    console.log(`  · ${id.padEnd(10)} ${nombre.padEnd(38)} → ${imagen.slice(0, 70)}${imagen.length > 70 ? '…' : ''}`);
    if (COMMIT) {
      await doc.set({ imagen, updatedAt: TS() }, { merge: true });
    }
  }

  console.log(COMMIT ? '\n✅ Escrito.' : '\n⏸️  Dry-run. Correr con --commit para persistir.');
  process.exit(0);
})();
