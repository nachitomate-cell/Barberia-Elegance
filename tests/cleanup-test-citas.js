// cleanup-test-citas.js — Elimina todas las citas marcadas con _testRun:true
// de un tenant. Útil para limpiar después de pruebas con send-test-email.js
// que dejan citas en Firestore.

'use strict';

const fs   = require('fs');
const path = require('path');

const TENANT   = process.env.TENANT || 'kronnos_penablanca';
const KEY_FILE = path.join(__dirname, '.firebase-admin-key.json');

if (!fs.existsSync(KEY_FILE)) {
  console.error('Falta tests/.firebase-admin-key.json');
  process.exit(1);
}

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(KEY_FILE)) });
const db = admin.firestore();

function citasCol(tid) {
  return tid === 'elegance'
    ? db.collection('citas')
    : db.collection('tenants').doc(tid).collection('citas');
}

(async () => {
  console.log(`Cleanup citas _testRun en tenant=${TENANT}...`);
  const snap = await citasCol(TENANT).where('_testRun', '==', true).get();
  if (snap.empty) {
    console.log('  Ninguna cita de prueba encontrada.');
    process.exit(0);
  }
  console.log(`  ${snap.size} cita(s) a eliminar...`);
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log(`  ✓ ${snap.size} eliminada(s).`);
  process.exit(0);
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
