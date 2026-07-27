// Re-trigger de la cita canje que quedó packProcesado:true sin descontar,
// por el bug del legacy fusionado. Con la CF nueva, resolver del canónico.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const TENANT  = 'delnero';
const CITA_ID = '4TQuiN19zkTQdZShPmBw';

const ref = db.doc(`tenants/${TENANT}/citas/${CITA_ID}`);
const s = await ref.get();
if (!s.exists) { console.log('✗ cita no existe'); process.exit(1); }
const c = s.data();
console.log('Antes:', {estado:c.estado, packProcesado:c.packProcesado, packRefId:c.packRefId, consumeSesionPack:c.consumeSesionPack});

// Truco: bajar el estado a Confirmada, luego subirlo a Completada en otra
// escritura. Así el trigger onDocumentWritten dispara con transición
// Confirmada→Completada y la CF nueva reprocesa.
await ref.update({ estado: 'Confirmada', packProcesado: false });
await new Promise(r => setTimeout(r, 500));
await ref.update({ estado: 'Completada' });
console.log('Trigger disparado. Esperando 8s para que la CF ejecute...');
await new Promise(r => setTimeout(r, 8000));

const s2 = await ref.get();
console.log('Después:', {estado:s2.data().estado, packProcesado:s2.data().packProcesado});
