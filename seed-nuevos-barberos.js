/**
 * seed-nuevos-barberos.js
 * Crea en Firebase Auth + Firestore los 5 barberos que existen sin datos:
 *   Joaquin, Amiri, Jesus, Checho, Maxi
 *
 * Uso:
 *   1. Asegúrate de tener service-account.json en la raíz del proyecto, O bien
 *      haber ejecutado "firebase login" para usar ADC.
 *   2. node seed-nuevos-barberos.js
 *
 * Contraseña inicial de cada barbero: Elegance2025!
 * (Deben cambiarla en el primer inicio de sesión)
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

let credential;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')));
  console.log('Usando service-account.json');
} else {
  credential = admin.credential.applicationDefault();
  console.log('Usando Application Default Credentials (firebase login)');
}

admin.initializeApp({ credential, projectId: 'barberia-elegance' });

const db   = admin.firestore();
const auth = admin.auth();
const TS   = admin.firestore.FieldValue.serverTimestamp;

const PASSWORD_INICIAL = 'Elegance2025!';
const LOCAL_ID         = 'elegance';

// ── Datos de cada barbero ────────────────────────────────────────────────────
const BARBEROS = [
  {
    nombre:      'Joaquin',
    email:       'joaquin.elegancebarbershop@gmail.com',
    especialidad: 'Cortes modernos y degradados',
    telefono:    '56912345601',
    rol:         'barbero',
    orden:       1,
  },
  {
    nombre:      'Amiri',
    email:       'amiri.elegancebarbershop@gmail.com',
    especialidad: 'Afro y texturas',
    telefono:    '56912345602',
    rol:         'barbero',
    orden:       2,
  },
  {
    nombre:      'Jesus',
    email:       'jesus.elegancebarbershop@gmail.com',
    especialidad: 'Barba y perfilados',
    telefono:    '56912345603',
    rol:         'barbero',
    orden:       3,
  },
  {
    nombre:      'Checho',
    email:       'checho.elegancebarbershop@gmail.com',
    especialidad: 'Clásicos y pompadour',
    telefono:    '56912345604',
    rol:         'barbero',
    orden:       4,
  },
  {
    nombre:      'Maxi',
    email:       'maxi.elegancebarbershop@gmail.com',
    especialidad: 'Skin fades y diseños',
    telefono:    '56912345605',
    rol:         'barbero',
    orden:       5,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
async function crearOActualizarAuth(barbero) {
  try {
    // Intenta obtener usuario existente por email
    const existing = await auth.getUserByEmail(barbero.email).catch(() => null);
    if (existing) {
      console.log(`  Auth ya existe: ${barbero.email} → UID: ${existing.uid}`);
      return existing.uid;
    }

    // Crear nueva cuenta
    const user = await auth.createUser({
      email:         barbero.email,
      emailVerified: false,
      password:      PASSWORD_INICIAL,
      displayName:   barbero.nombre,
      disabled:      false,
    });
    console.log(`  Auth creada:   ${barbero.email} → UID: ${user.uid}`);
    return user.uid;

  } catch (e) {
    console.error(`  ERROR Auth para ${barbero.email}:`, e.message);
    return null;
  }
}

async function upsertFirestore(uid, barbero) {
  try {
    const docRef = db.collection('barberos').doc(uid);
    const snap   = await docRef.get();

    // Construir el documento completo
    const data = {
      uid:          uid,
      nombre:       barbero.nombre,
      email:        barbero.email,
      especialidad: barbero.especialidad,
      telefono:     barbero.telefono,
      local:        LOCAL_ID,
      rol:          barbero.rol,
      activo:       true,
      foto:         '',
      orden:        barbero.orden,
      updatedAt:    TS(),
    };

    if (!snap.exists) {
      data.creadoEn = TS();
      await docRef.set(data);
      console.log(`  Firestore creado para ${barbero.nombre} (${uid})`);
    } else {
      // Actualiza solo los campos faltantes/vacíos para no pisar datos existentes
      await docRef.set(data, { merge: true });
      console.log(`  Firestore actualizado para ${barbero.nombre} (${uid})`);
    }

  } catch (e) {
    console.error(`  ERROR Firestore para ${barbero.nombre}:`, e.message);
  }
}

// ── Buscar documentos existentes sin datos (nombre vacío o uid nulo) ─────────
async function encontrarDocSinDatos() {
  const snap = await db.collection('barberos').get();
  const sinDatos = snap.docs.filter(d => {
    const data = d.data();
    return !data.nombre || !data.email;
  });
  console.log(`\nDocumentos en /barberos sin datos completos: ${sinDatos.length}`);
  sinDatos.forEach(d => console.log(`  ID: ${d.id} → ${JSON.stringify(d.data())}`));
  return sinDatos;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Elegance — Seed Nuevos Barberos (Joaquin/Amiri/     ║');
  console.log('║  Jesus/Checho/Maxi)                                  ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Diagnóstico previo
  await encontrarDocSinDatos();

  console.log('\n── Procesando barberos ─────────────────────────────────\n');

  for (const barbero of BARBEROS) {
    console.log(`\n▸ ${barbero.nombre} (${barbero.email})`);

    // 1. Crear/verificar cuenta en Auth
    const uid = await crearOActualizarAuth(barbero);
    if (!uid) {
      console.warn(`  Saltando Firestore: no se pudo obtener UID para ${barbero.nombre}`);
      continue;
    }

    // 2. Crear/actualizar documento en Firestore
    await upsertFirestore(uid, barbero);
  }

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  ✅  Proceso completado                               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('\nContraseña inicial de todos los barberos: Elegance2025!');
  console.log('Emails asignados:');
  BARBEROS.forEach(b => console.log(`  ${b.nombre.padEnd(10)} → ${b.email}`));
  console.log('\nRecuerda actualizar los emails reales desde el panel Admin → Barberos.\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error:', err.message);

  if (err.message?.includes('Application Default Credentials') ||
      err.message?.includes('could not be obtained')) {
    console.log('\n👉 Solución: ejecuta "firebase login" en la terminal y vuelve a correr este script.');
    console.log('   O descarga service-account.json desde Firebase Console → Configuración del');
    console.log('   proyecto → Cuentas de servicio → Generar nueva clave privada.\n');
  }

  process.exit(1);
});
