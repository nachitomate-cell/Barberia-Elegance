/**
 * seed-aura-membresias.js — Inicialización de Planes de Suscripción en Firestore para AURA
 *
 * Crea el documento tenants/aura/configuracion/membresia con los 3 planes oficiales
 * alineados con los servicios y precios de AURA.
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

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
const TENANT_ID = 'aura';

const PLANES_AURA = [
  {
    id: 'aura_bronze',
    nombre: 'Pase Bronce',
    precio: 29990,
    precioAnual: 299900,
    orden: 0,
    caracteristicas: [
      '2 Cortes de Cabello Profesional al mes',
      '1 Lavado capilar premium de cortesía',
      'Bebestible de cortesía en cada visita',
      '10% de descuento en productos de peinado'
    ]
  },
  {
    id: 'aura_silver',
    nombre: 'Pase Plata',
    precio: 49990,
    precioAnual: 499900,
    orden: 1,
    caracteristicas: [
      '2 Cortes de Cabello Profesional al mes',
      '2 Perfilados y arreglo de barba al mes',
      'Ritual de paños calientes en cada servicio',
      '15% de descuento en productos de peinado',
      'Acceso prioritario a reservas'
    ]
  },
  {
    id: 'aura_gold',
    nombre: 'Pase Oro',
    precio: 49990,
    precioAnual: 499900,
    orden: 2,
    caracteristicas: [
      '4 Cortes de Cabello Profesional al mes',
      'Lavado capilar premium con masaje',
      '2 Bebestibles de cortesía en cada visita',
      '20% de descuento en productos de peinado',
      'Atención preferencial sin tiempo de espera'
    ]
  }
];

async function seedMembresias() {
  console.log('🌱 Inicializando planes de suscripción para AURA...');
  
  const docRef = db.collection('tenants').doc(TENANT_ID).collection('configuracion').doc('membresia');
  
  await docRef.set({
    subtitulo: 'Suscríbete al Club Aura para acceder a servicios ilimitados, masajes capilares y experiencias premium con trato preferencial.',
    planes: PLANES_AURA,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  console.log('✅ Documento tenants/aura/configuracion/membresia creado con éxito.');
  console.log('📦 Planes seeded:');
  PLANES_AURA.forEach(p => {
    console.log(`  → [${p.nombre}] $${p.precio.toLocaleString('es-CL')}/mes - ${p.caracteristicas.length} beneficios.`);
  });
}

seedMembresias().catch(err => {
  console.error('❌ Error al ejecutar el seeding:', err);
});
