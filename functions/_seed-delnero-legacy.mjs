// Siembra un "cliente legacy AgendaPro" en delnero para testear el peek
// dryRun de registro.html. El usuario debe registrarse con ese email y
// verificar: (1) spinner muestra "heredarás X sellos", (2) post-registro
// el CF trigger fusiona los sellos y borra el legacy.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = 'delnero';
const EMAIL = 'peek.test.delnero@gmail.com';
const TEL   = '+56988177744';
const NOMBRE_LEGACY = 'Peek Test Delnero (Legacy)';

// Doc legacy: uid === docId === telefono normalizado (patrón AgendaPro)
const docId = TEL.replace(/\D/g, '');  // '56988177744'
const ref = db.doc(`tenants/${T}/users/${docId}`);
await ref.set({
  uid:                   docId,   // uid === docId → marca de legacy
  nombre:                NOMBRE_LEGACY,
  email:                 EMAIL,
  telefono:              TEL,
  sellosHistoricos:      9,
  sellosDisponibles:     5,
  stamps:                5,
  importedFrom:          'agendapro',
  fechaRegistroOriginal: '10/09/2025',
  creadoEn:              new Date(),
});
console.log(`✓ Legacy sembrado en delnero`);
console.log(`  docId: ${docId}`);
console.log(`  email: ${EMAIL}`);
console.log(`  tel:   ${TEL}`);
console.log(`  sellos: 9 hist / 5 disp`);
console.log(`\n─── Ahora, en el navegador ───`);
console.log(`  1. Abrir registro de delnero (subdominio o ?local=delnero)`);
console.log(`  2. En "Crear cuenta", usar exactamente:`);
console.log(`     email    = ${EMAIL}`);
console.log(`     telefono = ${TEL}   (o cualquier variante como 988177744)`);
console.log(`     nombre   = <lo que quieras>`);
console.log(`  3. Al pulsar "Crear cuenta", el spinner debe cambiar a:`);
console.log(`     "Creando cuenta... (heredarás 9 sellos)"`);
console.log(`  4. Post-registro: dashboard debe mostrar 5 sellos disponibles.`);
