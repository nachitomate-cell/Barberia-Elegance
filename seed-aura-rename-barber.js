/**
 * seed-aura-rename-barber.js
 * Renames professional "Lina" to "Maximiliano" for Aura Salon.
 * Handles Firebase Auth deletion (Lina), creation (Maximiliano), and Firestore updates.
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
const TENANT_ID = 'aura';

const OLD_EMAIL = 'lina@aurasalon.cl';
const NEW_EMAIL = 'maximiliano@aurasalon.cl';
const BARBER_ID = 'aura-lina'; // We keep this ID to preserve existing appointments
const NEW_NAME = 'Maximiliano';
const NEW_PASSWORD = 'AuraMaximiliano2026!';

async function run() {
  console.log('\n==================================================');
  console.log('      Aura Salon - Renombrar Profesional');
  console.log('         Lina  ==>  Maximiliano');
  console.log('==================================================\n');

  // 1. Eliminar cuenta de Auth antigua (lina@aurasalon.cl)
  try {
    const oldUser = await auth.getUserByEmail(OLD_EMAIL);
    if (oldUser) {
      await auth.deleteUser(oldUser.uid);
      console.log(`🗑️ Cuenta antigua de Auth eliminada para: ${OLD_EMAIL}`);

      // Eliminar el documento de enlace PWA UID antiguo en Firestore
      await db.collection('tenants').doc(TENANT_ID).collection('barberos').doc(oldUser.uid).delete();
      console.log(`🗑️ Documento de enlace UID antiguo eliminado para UID: ${oldUser.uid}`);
    }
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`ℹ️ La cuenta antigua (${OLD_EMAIL}) no existía en Auth.`);
    } else {
      console.warn(`⚠️ Error al intentar eliminar cuenta antigua:`, error.message);
    }
  }

  // 2. Crear nueva cuenta de Auth para Maximiliano
  let authUser = null;
  try {
    authUser = await auth.createUser({
      email: NEW_EMAIL,
      password: NEW_PASSWORD,
      displayName: NEW_NAME,
    });
    console.log(`✅ Cuenta de Auth creada para: ${NEW_EMAIL}`);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      authUser = await auth.getUserByEmail(NEW_EMAIL);
      await auth.updateUser(authUser.uid, {
        password: NEW_PASSWORD,
        displayName: NEW_NAME,
      });
      console.log(`✅ Cuenta de Auth ya existía. Contraseña restablecida para: ${NEW_EMAIL}`);
    } else {
      console.error(`❌ Error al crear cuenta de Auth para Maximiliano:`, error.message);
      process.exit(1);
    }
  }

  // 3. Actualizar perfil principal en Firestore (tenants/aura/barberos/aura-lina)
  try {
    const docRef = db.collection('tenants').doc(TENANT_ID).collection('barberos').doc(BARBER_ID);
    await docRef.set({
      nombre: NEW_NAME,
      email: NEW_EMAIL,
      activo: true,
      disponible: true,
      rol: 'profesional',
    }, { merge: true });
    console.log(`✅ Perfil de Firestore actualizado: tenants/aura/barberos/${BARBER_ID}`);
  } catch (error) {
    console.error(`❌ Error al actualizar perfil principal en Firestore:`, error.message);
    process.exit(1);
  }

  // 4. Crear documento de enlace UID nuevo en Firestore
  try {
    const uidDocRef = db.collection('tenants').doc(TENANT_ID).collection('barberos').doc(authUser.uid);
    await uidDocRef.set({
      activo: true,
      uid: authUser.uid,
      email: NEW_EMAIL,
      _mainDocId: BARBER_ID,
      rol: 'profesional',
      nombre: NEW_NAME,
    }, { merge: true });
    console.log(`✅ Enlace de UID creado en Firestore para UID: ${authUser.uid} → ${BARBER_ID}`);
  } catch (error) {
    console.error(`❌ Error al crear documento de enlace UID en Firestore:`, error.message);
    process.exit(1);
  }

  console.log('\n==================================================');
  console.log('       Resumen de Credenciales Actualizadas');
  console.log('==================================================\n');
  console.log(`Nombre:       ${NEW_NAME}`);
  console.log(`Correo:       ${NEW_EMAIL}`);
  console.log(`Contraseña:   ${NEW_PASSWORD}`);
  console.log(`UID Auth:     ${authUser.uid}`);
  console.log(`Firestore ID: ${BARBER_ID}`);
  console.log('\n✅ Proceso completado exitosamente.');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Error catastrófico durante el proceso:', err.message);
  process.exit(1);
});
