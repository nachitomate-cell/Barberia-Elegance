/**
 * seed-bloodhabib-demo-cliente.js
 * ─────────────────────────────────────────────────────────────
 *  Crea un cliente demo para Blood Habib con historial vivo
 *  para que el /dashboard se vea "encendido" al mostrar el
 *  producto: sellos acumulados, rango GOLD, próxima cita,
 *  historial de cortes, canjes al alcance.
 *
 *  Usuario: probandoblood@gmail.com
 *  Perfil:  12 sellos históricos (rango GOLD) · 8 disponibles
 *  Citas:   8 completadas los últimos 4 meses + 1 upcoming
 *
 *  Uso: node seed-bloodhabib-demo-cliente.js
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))),
  projectId:  'barberia-elegance',
});

const db   = admin.firestore();
const auth = admin.auth();
const TS   = admin.firestore.FieldValue.serverTimestamp;

const TENANT_ID = 'bloodhabib';
const EMAIL     = 'probandoblood@gmail.com';
const NOMBRE    = 'Sebastián Cliente Demo';
const TELEFONO  = '+56900000000';

// Servicios reales de Blood Habib (ver seed-bloodhabib.js). Se elige un mix
// realista: cortes cada 3-4 semanas, algún combo, un color de vez en cuando.
const HIST_CITAS = [
  { id: 'bh-corte-barba',       nombre: 'Corte de cabello y perfilado de barba', precio: 22000, duracion: 60, diasAtras: 118 },
  { id: 'bh-corte-cabello',     nombre: 'Corte de cabello',                       precio: 14000, duracion: 45, diasAtras: 92  },
  { id: 'bh-corte-barba',       nombre: 'Corte de cabello y perfilado de barba', precio: 22000, duracion: 60, diasAtras: 66  },
  { id: 'bh-barba',             nombre: 'Perfilado de barba con paños calientes', precio: 14000, duracion: 30, diasAtras: 52  },
  { id: 'bh-full-habib',        nombre: 'Servicio full habib',                    precio: 30000, duracion: 60, diasAtras: 40  },
  { id: 'bh-corte-diseno',      nombre: 'Corte de cabello y diseño',              precio: 17000, duracion: 45, diasAtras: 26  },
  { id: 'bh-corte-cabello',     nombre: 'Corte de cabello',                       precio: 14000, duracion: 45, diasAtras: 12  },
  { id: 'bh-corte-facial',      nombre: 'Corte de cabello y limpieza facial',     precio: 17000, duracion: 60, diasAtras: 4   },
];

// Rotar entre los 3 barberos reales (Maurice más frecuente, muestra
// preferencia — así el "barbero recurrente" del dashboard tiene sentido).
const BARBEROS = [
  { id: 'bh-maurice',  nombre: 'Maurice Hinojosa'  },
  { id: 'bh-nicolas',  nombre: 'Nicolás Vidal'     },
  { id: 'bh-benjamin', nombre: 'Benjamín Ordenes'  },
];
const pickBarbero = i => BARBEROS[[0, 1, 0, 2, 0, 1, 0, 2][i]];

// Códigos XXX-XXX sin O/0/I/1/L (igual al genCodigoCita del código real).
const CODIGO = () => {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const R = n => Array.from({ length: n }, () => A[Math.floor(Math.random() * A.length)]).join('');
  return `${R(3)}-${R(3)}`;
};

async function ensureAuthUser() {
  console.log('\n── Firebase Auth ─────────────────────────────');
  let user;
  try {
    user = await auth.getUserByEmail(EMAIL);
    console.log(`  ↺ Usuario existente encontrado: ${user.uid}`);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    user = await auth.createUser({
      email:         EMAIL,
      emailVerified: true,
      displayName:   NOMBRE,
      // El club es passwordless (magic link). Igual dejamos un password
      // fuerte por si el ambiente lo pide; no se usa para login normal.
      password:      'DemoBH-' + Math.random().toString(36).slice(2, 12),
    });
    console.log(`  ✓ Usuario creado: ${user.uid}`);
  }
  return user.uid;
}

async function seedCliente(uid) {
  console.log('\n── /users doc (perfil + sellos) ──────────────');
  const now = new Date();
  const primeraVisita = new Date(now.getTime() - HIST_CITAS[0].diasAtras * 24 * 60 * 60 * 1000);

  // sellosHistoricos = 12 → rango GOLD (umbral 10). Sweet spot para demo:
  // muestra el badge Gold vivo con "faltan 13 para Platinum" en la barra.
  // sellosDisponibles = 8 → alcanza para canjear "perfilado gratis" (8) o
  // "limpieza facial de regalo" (6), pero le faltan 2 para "corte gratis" (10)
  // → conversación natural con el prospecto sobre cómo funciona el club.
  await db.doc(`tenants/${TENANT_ID}/users/${uid}`).set({
    email:             EMAIL,
    nombre:            NOMBRE,
    telefono:          TELEFONO,
    fechaNacimiento:   '1993-05-14',
    sellosDisponibles: 8,
    sellosHistoricos:  12,
    stamps:            8,   // legacy fallback
    barberoPreferidoId:   'bh-maurice',
    barberoPreferidoName: 'Maurice Hinojosa',
    servicioPreferidoId:  'bh-corte-barba',
    fechaRegistro:     admin.firestore.Timestamp.fromDate(primeraVisita),
    ultimaCita:        admin.firestore.Timestamp.fromDate(
      new Date(now.getTime() - HIST_CITAS[HIST_CITAS.length - 1].diasAtras * 24 * 60 * 60 * 1000),
    ),
    perfilCompleto:    true,
    amigos:            [],
    packsActivos:      [],
    origen:            'demo',
    updatedAt:         TS(),
  }, { merge: true });
  console.log(`  ✓ users/${uid} — 12 sellos histórico · 8 disponibles · GOLD tier`);
}

async function seedCitas(uid) {
  console.log('\n── /citas (8 completadas + 1 upcoming) ───────');
  const batch = db.batch();
  const col = db.collection(`tenants/${TENANT_ID}/citas`);
  const now = new Date();

  HIST_CITAS.forEach((srv, i) => {
    const fechaHora = new Date(now.getTime() - srv.diasAtras * 24 * 60 * 60 * 1000);
    // Ancla a las 15:00 hora local para que el "hora" y "fecha" se vean limpios.
    fechaHora.setHours(15, 0, 0, 0);
    const b = pickBarbero(i);
    const ref = col.doc();
    batch.set(ref, {
      estado:           'Completada',
      fechaHora:        admin.firestore.Timestamp.fromDate(fechaHora),
      fecha:            fechaHora.toISOString().slice(0, 10),
      hora:             '15:00',
      duracionMin:      srv.duracion,
      duracion:         srv.duracion,
      servicioId:       srv.id,
      servicioNombre:   srv.nombre,
      precio:           srv.precio,
      barberoId:        b.id,
      barbero:          b.nombre,
      barberoNombre:    b.nombre,
      clienteUid:       uid,
      clienteId:        uid,
      clienteEmail:     EMAIL,
      clienteNombre:    NOMBRE,
      clienteTelefono:  TELEFONO,
      codigoCita:       CODIGO(),
      creadoEn:         admin.firestore.Timestamp.fromDate(
        new Date(fechaHora.getTime() - 3 * 24 * 60 * 60 * 1000),   // reservada 3 días antes
      ),
      completadoEn:     admin.firestore.Timestamp.fromDate(
        new Date(fechaHora.getTime() + srv.duracion * 60 * 1000),  // marcada al finalizar
      ),
      origen:           'demo',
      sellosOtorgados:  true,   // evita que el trigger la re-cuente y sume sellos extra
    });
    console.log(`  ✓ ${fechaHora.toISOString().slice(0, 10)}  ${srv.nombre.padEnd(45)}  ${b.nombre}  $${srv.precio.toLocaleString('es-CL')}`);
  });

  // Próxima cita — 6 días adelante, con Maurice (su barbero preferido) para el "Full Habib".
  const proxima = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  proxima.setHours(16, 30, 0, 0);
  const refProx = col.doc();
  const proxCod = CODIGO();
  batch.set(refProx, {
    estado:           'Confirmada',
    fechaHora:        admin.firestore.Timestamp.fromDate(proxima),
    fecha:            proxima.toISOString().slice(0, 10),
    hora:             '16:30',
    duracionMin:      60,
    duracion:         60,
    servicioId:       'bh-full-habib',
    servicioNombre:   'Servicio full habib',
    precio:           30000,
    barberoId:        'bh-maurice',
    barbero:          'Maurice Hinojosa',
    barberoNombre:    'Maurice Hinojosa',
    clienteUid:       uid,
    clienteId:        uid,
    clienteEmail:     EMAIL,
    clienteNombre:    NOMBRE,
    clienteTelefono:  TELEFONO,
    codigoCita:       proxCod,
    creadoEn:         TS(),
    origen:           'demo',
  });
  console.log(`  ✓ ${proxima.toISOString().slice(0, 10)}  Servicio full habib (PRÓXIMA)              Maurice Hinojosa  $30.000  [${proxCod}]`);

  await batch.commit();
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   Blood Habib — Cliente demo (dashboard vivo)    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`   Tenant: ${TENANT_ID}   |   Email: ${EMAIL}`);

  const uid = await ensureAuthUser();
  await seedCliente(uid);
  await seedCitas(uid);

  console.log('\n✅ Demo cliente listo.');
  console.log(`   Ingresa a https://bloodhabib.synaptechspa.cl/dashboard con ${EMAIL}`);
  console.log('   (registro passwordless → magic link al correo).\n');
  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
