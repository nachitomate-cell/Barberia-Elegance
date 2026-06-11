/**
 * seed-latincaribe-servicios.js — Catálogo REAL de servicios de The Latin Caribe.
 *
 * 1. Borra los 16 servicios placeholder (srv-lc-01..16) clonados de Aura.
 * 2. Crea los servicios reales en sus 5 categorías:
 *    Cortes Premium · Cejas Premium · Barbas Premium · Diseños Freestyle · Platinados
 *
 * Reversible: re-ejecuta seed-latincaribe.js para volver a los placeholders.
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
const TS = admin.firestore.FieldValue.serverTimestamp;
const TENANT_ID = 'latincaribe';
const col = db.collection('tenants').doc(TENANT_ID).collection('servicios');

// IDs placeholder a eliminar (los creó seed-latincaribe.js)
const PLACEHOLDERS = Array.from({ length: 16 }, (_, i) => `srv-lc-${String(i + 1).padStart(2, '0')}`);

// ── Catálogo real ─────────────────────────────────────────────────────────────
const SERVICIOS = [
  // ── Cortes Premium ──
  { id: 'srv-lc-cp-1', categoria: 'Cortes Premium', icono: 'ph-scissors', precio: 15000, duracion: 30,
    nombre: 'Corte premium⭐️ sobre cupo⏰',
    descripcion: 'Después de las 9:00 pm el corte premium tendrá un precio de $15.000. A cualquier servicio se le sumará el agregado.' },
  { id: 'srv-lc-cp-2', categoria: 'Cortes Premium', icono: 'ph-scissors', precio: 17000, duracion: 47,
    nombre: 'Corte premium + cejas + diseño Freestyle 🔥',
    descripcion: 'Corte de cabello + cejas + diseño Freestyle, a partir de $17.000. Incluye bebida de cortesía o una mascarilla de puntos negros (opcional).' },
  { id: 'srv-lc-cp-3', categoria: 'Cortes Premium', icono: 'ph-scissors', precio: 18000, duracion: 50,
    nombre: 'Corte premium + Barba premium ⭐️',
    descripcion: 'Incluye tu corte de cabello + delineado y perfilado de barba, hidratación con aceite, y bebida de cortesía o mascarilla de puntos negros (opcional).' },
  { id: 'srv-lc-cp-4', categoria: 'Cortes Premium', icono: 'ph-scissors', precio: 20000, duracion: 60,
    nombre: 'Corte premium + Barba + cejas⭐️',
    descripcion: 'Incluye corte personalizado + delineado de cejas (con línea) + barba perfilada, ordenada e hidratada con aceite + bebida de cortesía o mascarilla de puntos negros (opcional).' },

  // ── Cejas Premium ──
  { id: 'srv-lc-cj-1', categoria: 'Cejas Premium', icono: 'ph-eye', precio: 7000, duracion: 10,
    nombre: 'Cejas premium⭐️',
    descripcion: 'Delineado de cejas + pigmentación.' },
  { id: 'srv-lc-cj-2', categoria: 'Cejas Premium', icono: 'ph-eye', precio: 3000, duracion: 5,
    nombre: 'Delineado de cejas⭐️',
    descripcion: 'Delineado de cejas.' },

  // ── Barbas Premium ──
  { id: 'srv-lc-bp-1', categoria: 'Barbas Premium', icono: 'ph-pen-nib', precio: 8000, duracion: 15,
    nombre: 'Barba Premium⭐️',
    descripcion: 'Delineado de barba, perfilado e hidratación con aceite.' },
  { id: 'srv-lc-bp-2', categoria: 'Barbas Premium', icono: 'ph-pen-nib', precio: 4000, duracion: 5,
    nombre: 'Depilado de barba⭐️',
    descripcion: 'Se retiran todos los vellos superficiales de la cara y se aplica aceite para hidratar.' },
  { id: 'srv-lc-bp-3', categoria: 'Barbas Premium', icono: 'ph-pen-nib', precio: 10000, duracion: 15,
    nombre: 'Barba + cejas Premium⭐️',
    descripcion: 'Incluye perfilado de barba y perfilado de cejas.' },

  // ── Diseños Freestyle ──
  { id: 'srv-lc-df-1', categoria: 'Diseños Freestyle', icono: 'ph-paint-brush', precio: 2000, duracion: 5,
    nombre: 'Diseño Freestyle🔥',
    descripcion: 'Diseños pequeños que se pueden utilizar en el corte de cabello para resaltar aún más el contraste del fade.' },
  { id: 'srv-lc-df-2', categoria: 'Diseños Freestyle', icono: 'ph-paint-brush', precio: 5000, duracion: 10,
    nombre: 'Diseño Freestyle🔥 premium⭐️',
    descripcion: 'Diseños complejos y elaborados, con alto contraste y amplitud en el fade.' },
  { id: 'srv-lc-df-3', categoria: 'Diseños Freestyle', icono: 'ph-paint-brush', precio: 15000, duracion: 60,
    nombre: 'Diseño Freestyle🔥 de categoría🌎',
    descripcion: 'Diseño freestyle más complejo, con pigmentación y estilos únicos para redes sociales.' },
  { id: 'srv-lc-df-4', categoria: 'Diseños Freestyle', icono: 'ph-paint-brush', precio: 25000, duracion: 120,
    nombre: 'Diseño Freestyle🔥 fuera de lo común🚀',
    descripcion: 'Diseño freestyle súper complejo y elaborado, con duración de hasta dos horas. Trabajo épico para redes sociales e impacto visual.' },

  // ── Platinados ──
  { id: 'srv-lc-pl-1', categoria: 'Platinados', icono: 'ph-drop', precio: 60000, duracion: 240,
    nombre: 'Mechas Platinadas🤍 50%',
    descripcion: 'Una cantidad reducida de mechas se extrae de un gorro de silicona, se decoloran y posteriormente se tinturan.' },
  { id: 'srv-lc-pl-2', categoria: 'Platinados', icono: 'ph-drop', precio: 70000, duracion: 240,
    nombre: 'Mechas Platinadas🤍 75%',
    descripcion: 'Una cantidad media de mechas se extrae de un gorro de silicona, se decoloran y posteriormente se tinturan.' },
  { id: 'srv-lc-pl-3', categoria: 'Platinados', icono: 'ph-drop', precio: 80000, duracion: 240,
    nombre: 'Mechas Platinadas🤍 90%',
    descripcion: 'Una cantidad abundante de mechas se extrae de un gorro de silicona, se decoloran y posteriormente se tinturan.' },
  { id: 'srv-lc-pl-4', categoria: 'Platinados', icono: 'ph-drop', precio: 85000, duracion: 250,
    nombre: 'Platinado semi global🤍',
    descripcion: 'Toda la parte superior del cabello se decolora, mientras los laterales y la parte posterior conservan su color natural; luego la parte superior se tintura para un resultado excepcional.' },
  { id: 'srv-lc-pl-5', categoria: 'Platinados', icono: 'ph-drop', precio: 95000, duracion: 300,
    nombre: 'Platinado global🤍',
    descripcion: 'Todo el cabello se decolora de raíz a punta y posteriormente se tintura para dejar un resultado impecable.' },
];

async function run() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   The Latin Caribe — Catálogo de servicios real  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // 1. Borrar placeholders
  const delBatch = db.batch();
  for (const id of PLACEHOLDERS) delBatch.delete(col.doc(id));
  await delBatch.commit();
  console.log(`🗑️  ${PLACEHOLDERS.length} servicios placeholder eliminados.\n`);

  // 2. Crear servicios reales
  const batch = db.batch();
  SERVICIOS.forEach((s, i) => {
    const { id, ...data } = s;
    batch.set(col.doc(id), { ...data, activo: true, orden: i, updatedAt: TS() }, { merge: true });
    console.log(`  → [${data.categoria}] ${data.nombre}  ·  ${data.duracion} min  ·  $${data.precio.toLocaleString('es-CL')}`);
  });
  await batch.commit();

  console.log(`\n✅ ${SERVICIOS.length} servicios creados en tenants/${TENANT_ID}/servicios`);
  process.exit(0);
}

run().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1); });
