/**
 * seed-mapu-barberos.js
 * Crea los documentos de barberos de Mapu Barber Shop en Firestore.
 * Ejecutar una sola vez: node seed-mapu-barberos.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const DEFAULT_HORARIO = () => ({
  '0': { activo: false, inicio: '09:00', fin: '20:00', descansos: [] },
  '1': { activo: true,  inicio: '09:00', fin: '20:00', descansos: [] },
  '2': { activo: true,  inicio: '09:00', fin: '20:00', descansos: [] },
  '3': { activo: true,  inicio: '09:00', fin: '20:00', descansos: [] },
  '4': { activo: true,  inicio: '09:00', fin: '20:00', descansos: [] },
  '5': { activo: true,  inicio: '09:00', fin: '20:00', descansos: [] },
  '6': { activo: true,  inicio: '09:00', fin: '14:00', descansos: [] },
});

const BARBEROS = [
  // ── Ambas sucursales (sin sucursalId) ───────────────────────────
  { id: 'luka-araya',          nombre: 'Luka Araya'          },
  { id: 'ivi-soto',            nombre: 'Ivi Soto'            },
  { id: 'felipe-vergara',      nombre: 'Felipe Vergara'      },
  { id: 'lucia-fuentes',       nombre: 'Lucia Fuentes'       },
  { id: 'santiago-echeverria', nombre: 'Santiago Echeverria' },
  { id: 'jonathan-chamorro',   nombre: 'Jonathan Chamorro'   },
  // ── Solo Valparaíso ─────────────────────────────────────────────
  { id: 'fernanda-soudre',     nombre: 'Fernanda Soudre',    sucursalId: 'valparaiso' },
  // ── Solo Viña del Mar ───────────────────────────────────────────
  { id: 'renato-perez',        nombre: 'Renato Perez',       sucursalId: 'vinadelmar' },
  { id: 'daniela-ramirez',     nombre: 'Daniela Ramirez',    sucursalId: 'vinadelmar' },
  { id: 'ian-alcalde',         nombre: 'Ian Alcalde',        sucursalId: 'vinadelmar' },
  { id: 'gabriel-apablaza',    nombre: 'Gabriel Apablaza',   sucursalId: 'vinadelmar' },
];

async function seed() {
  const col = db.collection('tenants/mapubarbershop/barberos');

  for (const b of BARBEROS) {
    const { id, ...data } = b;
    const doc = {
      nombre:       data.nombre,
      especialidad: '',
      foto:         '',
      email:        '',
      whatsapp:     '',
      comision:     0,
      serviciosIds: [],
      disponible:   true,
      horario:      DEFAULT_HORARIO(),
      ausencias:    [],
      createdAt:    new Date().toISOString(),
      ...(data.sucursalId ? { sucursalId: data.sucursalId } : {}),
    };

    await col.doc(id).set(doc);
    console.log(`✓ ${data.nombre}${data.sucursalId ? ` (${data.sucursalId})` : ' (ambas)'}`);
  }

  console.log('\n✅ Todos los barberos creados en tenants/mapubarbershop/barberos');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
