import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'delnero';

// 1. Corregir sellos duplicados del user Prueba Peek (÷2)
const userRef = db.doc(`tenants/${T}/users/WIUWABfYYnTK2v7fwGnG99MI6w53`);
const snap = await userRef.get();
if (snap.exists) {
  const d = snap.data();
  const hist = Number(d.sellosHistoricos || 0);
  const disp = Number(d.sellosDisponibles || 0);
  const stmp = Number(d.stamps || 0);
  await userRef.update({
    sellosHistoricos:  Math.floor(hist / 2),
    sellosDisponibles: Math.floor(disp / 2),
    stamps:            Math.floor(stmp / 2),
    correccionManualDedupeBug: true,
  });
  console.log(`✓ Corregido user existente: hist ${hist}→${Math.floor(hist/2)}, disp ${disp}→${Math.floor(disp/2)}, stamps ${stmp}→${Math.floor(stmp/2)}`);
}

// 2. Sembrar un NUEVO legacy con otro email/tel para reintentar el peek
const EMAIL2 = 'peek.test2@delnero.cl';
const TEL2   = '+56988277744';
const docId2 = TEL2.replace(/\D/g, '');
const ref2 = db.doc(`tenants/${T}/users/${docId2}`);
await ref2.set({
  uid:                   docId2,
  nombre:                'Peek Test 2 (Legacy)',
  email:                 EMAIL2,
  telefono:              TEL2,
  sellosHistoricos:      7,
  sellosDisponibles:     3,
  stamps:                3,
  importedFrom:          'agendapro',
  fechaRegistroOriginal: '05/06/2025',
  creadoEn:              new Date(),
});
console.log(`\n✓ Legacy #2 sembrado para retest`);
console.log(`  email: ${EMAIL2}`);
console.log(`  tel:   ${TEL2}`);
console.log(`  sellos: 7 hist / 3 disp`);
console.log(`\n─── Reintenta el flujo en el navegador ───`);
console.log(`  registro con:`);
console.log(`     email    = ${EMAIL2}`);
console.log(`     telefono = ${TEL2}`);
console.log(`     nombre   = <lo que quieras>`);
console.log(`  Esperado post-registro: 3 sellos disponibles (no 6)`);
