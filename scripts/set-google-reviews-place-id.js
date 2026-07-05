/**
 * Escribe el placeId de Google Places para un tenant en Firestore.
 *
 * Uso:
 *   node scripts/set-google-reviews-place-id.js <tenantId> <placeId>
 *
 * Ejemplo:
 *   node scripts/set-google-reviews-place-id.js infinity ChIJxxxxxxxxxxxxxxxxxxxx
 *
 * Ruta escrita:
 *   - elegance:  settings/googleReviews
 *   - resto:     tenants/{tid}/settings/googleReviews
 *
 * Tras escribir el placeId:
 *   - El cron googleReviewsSyncScheduled correrá al día siguiente 06:00 UTC
 *     y traerá rating + hasta 5 reseñas desde Places API (New).
 *   - Para poblarlas AHORA, el superadmin puede invocar el callable
 *     googleReviewsSyncManual({ tenantId: '<tid>' }) desde el panel.
 */
const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const [,, tenantId, placeId] = process.argv;

if (!tenantId || !placeId) {
  console.error('Uso: node scripts/set-google-reviews-place-id.js <tenantId> <placeId>');
  process.exit(1);
}

if (!/^ChIJ[A-Za-z0-9_-]{15,}$/.test(placeId)) {
  console.error(`⚠  El placeId "${placeId}" no tiene el formato esperado (ChIJ...).`);
  console.error('   Verifica que lo copiaste desde la Place ID Finder de Google.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'service-account.json'), 'utf8'))),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();

const ref = tenantId === 'elegance'
  ? db.collection('settings').doc('googleReviews')
  : db.collection('tenants').doc(tenantId).collection('settings').doc('googleReviews');

(async () => {
  const before = await ref.get();
  const prev   = before.exists ? before.data() : {};
  console.log(`\n▶ Tenant: ${tenantId}`);
  console.log(`  Ruta:   ${ref.path}`);
  console.log(`  Antes:  placeId="${prev.placeId || '(vacío)'}"`);

  await ref.set({ placeId }, { merge: true });

  const after = await ref.get();
  console.log(`  Ahora:  placeId="${after.data().placeId}"`);
  console.log(`\n✓ placeId escrito.`);
  console.log(`\nSiguiente paso: invocar googleReviewsSyncManual desde el admin panel`);
  console.log(`(o esperar al cron diario de las 06:00 UTC) para poblar rating + reseñas.`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
