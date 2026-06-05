/**
 * seed-delnero-set-admin.js
 * Assigns 'admin' role to Vicente Maira in tenant 'delnero'.
 * Updates main doc + link-doc (if exists), and syncs Firebase Auth custom claims.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
let credential;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')));
  console.log('🔑 Usando service-account.json');
} else {
  credential = admin.credential.applicationDefault();
  console.log('🔑 Usando Application Default Credentials');
}

admin.initializeApp({ credential, projectId: 'barberia-elegance' });

const db = admin.firestore();
const auth = admin.auth();
const TENANT_ID = 'delnero';
const NOMBRE_BUSCAR = 'vicente maira';

async function run() {
  console.log('\n==================================================');
  console.log('  Del Nero Barber - Asignar Rol Administrador');
  console.log('         Vicente Maira  ==>  admin');
  console.log('==================================================\n');

  // 1. Buscar todos los documentos del barbero en /tenants/delnero/barberos
  const colRef = db.collection('tenants').doc(TENANT_ID).collection('barberos');
  const snapshot = await colRef.get();

  if (snapshot.empty) {
    console.error('❌ No se encontraron barberos en el tenant delnero.');
    process.exit(1);
  }

  // Separar docs principales de docs de enlace (link-docs tienen _mainDocId)
  const mainDocs = [];
  const linkDocs = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data._mainDocId) {
      linkDocs.push({ id: doc.id, data });
    } else {
      mainDocs.push({ id: doc.id, data });
    }
  });

  // Buscar doc principal de Vicente Maira por nombre (case-insensitive)
  const mainDoc = mainDocs.find(d =>
    (d.data.nombre || '').toLowerCase().includes(NOMBRE_BUSCAR)
  );

  if (!mainDoc) {
    console.error(`❌ No se encontró ningún barbero con nombre "${NOMBRE_BUSCAR}" en delnero.`);
    console.log('\nBarberos disponibles:');
    mainDocs.forEach(d => console.log(`  - ${d.id}: ${d.data.nombre} (rol: ${d.data.rol})`));
    process.exit(1);
  }

  console.log(`✅ Barbero encontrado: ${mainDoc.data.nombre} (doc ID: ${mainDoc.id}, rol actual: ${mainDoc.data.rol})`);

  // 2. Actualizar doc principal con rol 'admin'
  await colRef.doc(mainDoc.id).set({ rol: 'admin' }, { merge: true });
  console.log(`✅ Doc principal actualizado: tenants/${TENANT_ID}/barberos/${mainDoc.id} → rol: admin`);

  // 3. Actualizar link-doc del barbero (si existe, vinculado por _mainDocId)
  const linkedDocs = linkDocs.filter(d => d.data._mainDocId === mainDoc.id);
  for (const linkDoc of linkedDocs) {
    await colRef.doc(linkDoc.id).set({ rol: 'admin' }, { merge: true });
    console.log(`✅ Link-doc actualizado: tenants/${TENANT_ID}/barberos/${linkDoc.id} → rol: admin`);
  }

  // 4. Sincronizar custom claims en Firebase Auth para cada UID vinculado
  const uidsToUpdate = [
    ...(mainDoc.data.uid ? [mainDoc.data.uid] : []),
    ...linkedDocs.map(d => d.data.uid).filter(Boolean),
  ];

  // Evitar duplicados
  const uniqueUids = [...new Set(uidsToUpdate)];

  if (uniqueUids.length === 0) {
    console.warn('⚠️ No se encontró UID de Firebase Auth en los documentos. Los claims no se actualizaron.');
    console.log('   Para que el rol surta efecto en la UI, el barbero deberá cerrar sesión y volver a ingresar.');
  } else {
    for (const uid of uniqueUids) {
      await auth.setCustomUserClaims(uid, { role: 'admin', tenantId: TENANT_ID });
      console.log(`✅ Custom claims actualizados para UID: ${uid} → { role: 'admin', tenantId: '${TENANT_ID}' }`);
    }
  }

  console.log('\n==================================================');
  console.log('              Resumen Final');
  console.log('==================================================');
  console.log(`Barbero:  ${mainDoc.data.nombre}`);
  console.log(`Tenant:   ${TENANT_ID}`);
  console.log(`Rol:      admin`);
  console.log(`Doc ID:   ${mainDoc.id}`);
  if (uniqueUids.length > 0) {
    console.log(`UID(s):   ${uniqueUids.join(', ')}`);
  }
  console.log('\n✅ Proceso completado exitosamente.');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Error catastrófico durante el proceso:', err.message);
  process.exit(1);
});
