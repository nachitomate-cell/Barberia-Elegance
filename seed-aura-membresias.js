/**
 * seed-aura-membresias.js — Inicialización de Planes de Suscripción en Firestore para AURA
 *
 * Crea el documento tenants/aura/configuracion/membresia con los 4 planes oficiales
 * extraídos directamente de la imagen de suscripciones mensuales de AURA.
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
    id: 'aura_2_cortes',
    nombre: '2 cortes al mes',
    precio: 29990,
    precioAnual: 299900,
    orden: 0,
    caracteristicas: [
      '2 cortes de cabello al mes (ideal cada 2 semanas)',
      'Especializado en mantener y perfeccionar tu degradado',
      'Realizado exclusivamente con máquina para transiciones limpias y precisas',
      'Conserva un look fresco, definido y con acabado profesional'
    ]
  },
  {
    id: 'aura_2_cortes_barba',
    nombre: '2 cortes y 2 arreglo de barba al mes',
    precio: 49990,
    precioAnual: 499900,
    orden: 1,
    caracteristicas: [
      '2 cortes de cabello profesional al mes',
      '2 arreglos o perfilados de barba al mes',
      'Ideal para mantener tu look prolijo todo el mes',
      'El pack definitivo de mantención de imagen'
    ]
  },
  {
    id: 'aura_4_cortes',
    nombre: '4 cortes al mes',
    precio: 49990,
    precioAnual: 499900,
    orden: 2,
    caracteristicas: [
      '4 cortes de cabello al mes (un corte semanal)',
      'Especializado en mantener y perfeccionar tu degradado',
      'Realizado exclusivamente con máquina para transiciones limpias y precisas',
      'Ideal para conservar un look fresco, definido y con acabado profesional'
    ]
  },
  {
    id: 'aura_2_perfilados_barba',
    nombre: '2 Perfilados Barba al mes',
    precio: 29990,
    precioAnual: 299900,
    orden: 3,
    caracteristicas: [
      '2 perfilados de barba al mes',
      'Mantén tu estilo limpio, definido y siempre en equilibrio',
      'Servicio profesional, práctico y pensado para tu mejor versión',
      'Perfilado al detalle para el cuidado diario'
    ]
  }
];

async function seedMembresias() {
  console.log('🌱 Inicializando planes de suscripción para AURA...');
  
  const docRef = db.collection('tenants').doc(TENANT_ID).collection('configuracion').doc('membresia');
  
  await docRef.set({
    subtitulo: 'Suscríbete a nuestras suscripciones mensuales para mantener tu estilo y degradado siempre impecable con atención preferencial.',
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
