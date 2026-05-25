/**
 * seed-aura-barberos-creds.js
 * Creates Firebase Auth accounts for Aura Salon barbers and updates their Firestore profiles.
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

const BARBEROS = [
  { id: 'aura-manolito', nombre: 'Manolito', email: 'manolito@aurasalon.cl', password: 'AuraManolito2026!' },
  { id: 'aura-jocce',    nombre: 'Jocce Garcia (JG)', email: 'jocce@aurasalon.cl', password: 'AuraJocce2026!' },
  { id: 'aura-chiky',    nombre: 'Chiky barber', email: 'chiky@aurasalon.cl', password: 'AuraChiky2026!' },
  { id: 'aura-matiaz',   nombre: 'Matiaz cutz', email: 'matiaz@aurasalon.cl', password: 'AuraMatiaz2026!' },
  { id: 'aura-lina',     nombre: 'Lina', email: 'lina@aurasalon.cl', password: 'AuraLina2026!' },
];

async function seed() {
  console.log('\n==================================================');
  console.log('       Aura Salon Barbers - Credential Seeder');
  console.log('==================================================\n');

  const results = [];

  for (const b of BARBEROS) {
    console.log(`Procesando a ${b.nombre}...`);
    let authUser = null;
    let created = false;

    // 1. Crear o recuperar usuario de Firebase Auth
    try {
      authUser = await auth.createUser({
        email: b.email,
        password: b.password,
        displayName: b.nombre,
      });
      created = true;
      console.log(`  → Usuario Auth CREADO con éxito para: ${b.email}`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        // Si ya existe, lo recuperamos y actualizamos la contraseña para asegurarnos de que sea la correcta
        authUser = await auth.getUserByEmail(b.email);
        await auth.updateUser(authUser.uid, {
          password: b.password,
          displayName: b.nombre,
        });
        console.log(`  → Usuario Auth ya existía. Contraseña ACTUALIZADA para: ${b.email}`);
      } else {
        console.error(`  ❌ Error al procesar Auth de ${b.nombre}:`, error.message);
        continue;
      }
    }

    // 2. Vincular y guardar en Firestore
    try {
      const docRef = db.collection('tenants').doc(TENANT_ID).collection('barberos').doc(b.id);
      const snap = await docRef.get();

      const updateData = {
        email: b.email.toLowerCase().trim(),
        activo: true,
        disponible: true,
        nombre: b.nombre,
        rol: 'profesional',
      };

      if (!snap.exists) {
        // Si por alguna razón no existía el documento, lo creamos
        await docRef.set(updateData);
        console.log(`  → Documento Firestore CREADO: tenants/aura/barberos/${b.id}`);
      } else {
        // Si ya existía, añadimos/actualizamos la propiedad email
        await docRef.update(updateData);
        console.log(`  → Documento Firestore ACTUALIZADO: tenants/aura/barberos/${b.id}`);
      }

      // 3. Crear también el documento de enlace PWA UID si no existe
      // Esto hace que ensureBarberoUidDoc sea redundante pero es ultra-seguro
      const uidDocRef = db.collection('tenants').doc(TENANT_ID).collection('barberos').doc(authUser.uid);
      await uidDocRef.set({
        activo: true,
        uid: authUser.uid,
        email: b.email.toLowerCase().trim(),
        _mainDocId: b.id,
        rol: 'profesional',
        nombre: b.nombre,
      }, { merge: true });
      console.log(`  → Enlace de UID creado en Firestore para UID: ${authUser.uid}`);

      results.push({
        nombre: b.nombre,
        email: b.email,
        password: b.password,
        uid: authUser.uid,
      });

    } catch (error) {
      console.error(`  ❌ Error al guardar datos en Firestore de ${b.nombre}:`, error.message);
    }
  }

  console.log('\n==================================================');
  console.log('       Resumen de Cuentas y Credenciales');
  console.log('==================================================\n');

  console.log(String.prototype.padEnd ? 
    'Nombre'.padEnd(20) + 'Correo Electrónico'.padEnd(30) + 'Contraseña' :
    'Nombre\t\tCorreo\t\tContraseña'
  );
  console.log('-'.repeat(70));

  for (const r of results) {
    console.log(String.prototype.padEnd ?
      r.nombre.padEnd(20) + r.email.padEnd(30) + r.password :
      `${r.nombre}\t\t${r.email}\t\t${r.password}`
    );
  }

  console.log('\n✅ Proceso finalizado con éxito.');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error catastrófico durante el proceso:', err.message);
  process.exit(1);
});
