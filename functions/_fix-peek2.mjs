import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

// 1) Corregir user Prueba Peek 2
const userRef = db.doc(`tenants/${T}/users/cQdOrIjJ4ZX2C3KNaEZznVrM7JA3`);
const s = await userRef.get();
if (s.exists) {
  const d = s.data();
  await userRef.update({
    sellosHistoricos:  Math.floor((d.sellosHistoricos || 0) / 2),
    sellosDisponibles: Math.floor((d.sellosDisponibles || 0) / 2),
    stamps:            Math.floor((d.stamps || 0) / 2),
    correccionManualDedupeBug: true,
  });
  console.log(`✓ Corregido Prueba Peek 2: hist ${d.sellosHistoricos}→${Math.floor(d.sellosHistoricos/2)}, disp ${d.sellosDisponibles}→${Math.floor(d.sellosDisponibles/2)}`);
}

// 2) Sembrar legacy #3 con otro email/tel
const EMAIL3 = 'peek.test3@delnero.cl';
const TEL3   = '+56988377744';
const docId3 = TEL3.replace(/\D/g, '');
await db.doc(`tenants/${T}/users/${docId3}`).set({
  uid:                   docId3,
  nombre:                'Peek Test 3 (Legacy)',
  email:                 EMAIL3,
  telefono:              TEL3,
  sellosHistoricos:      8,
  sellosDisponibles:     4,
  stamps:                4,
  importedFrom:          'agendapro',
  fechaRegistroOriginal: '15/07/2025',
  creadoEn:              new Date(),
});
console.log(`\n✓ Legacy #3 sembrado`);
console.log(`  email: ${EMAIL3}`);
console.log(`  tel:   ${TEL3}`);
console.log(`  sellos: 8 hist / 4 disp`);
console.log(`\n─── Retest cuando avise que el deploy terminó ───`);
console.log(`  email    = ${EMAIL3}`);
console.log(`  telefono = ${TEL3}`);
console.log(`  Esperado: dashboard con 4 sellos disponibles (no 8)`);
