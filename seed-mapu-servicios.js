/**
 * seed-mapu-servicios.js
 * Crea los servicios de Mapu Barber Shop en Firestore.
 * Ejecutar una sola vez: node seed-mapu-servicios.js
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const SA_PATH = path.join(__dirname, 'service-account.json');
admin.initializeApp({
  credential: fs.existsSync(SA_PATH)
    ? admin.credential.cert(JSON.parse(fs.readFileSync(SA_PATH, 'utf8')))
    : admin.credential.applicationDefault(),
  projectId: 'barberia-elegance',
});

const db  = admin.firestore();
const col = db.collection('tenants/mapubarbershop/servicios');

const SERVICIOS = [
  // ── Combos ─────────────────────────────────────────────────────────────────
  { id: 'mapu-c-01', nombre: 'Corte + Perfilado Barba Simple',      precio: 28000, duracion: 60,  categoria: 'Combos',           icono: 'ph-scissors',    orden: 0  },
  { id: 'mapu-c-02', nombre: 'Corte + Perfilado Barba Navaja',      precio: 30000, duracion: 75,  categoria: 'Combos',           icono: 'ph-scissors',    orden: 1  },
  { id: 'mapu-c-03', nombre: 'Corte + Rasurado Completo Barba',     precio: 34000, duracion: 75,  categoria: 'Combos',           icono: 'ph-scissors',    orden: 2  },
  { id: 'mapu-c-04', nombre: 'Rasurado Completo + Perfilado Navaja',precio: 35000, duracion: 75,  categoria: 'Combos',           icono: 'ph-scissors',    orden: 3  },
  { id: 'mapu-c-05', nombre: 'Rasurado Completo + Perfilado Simple',precio: 32500, duracion: 60,  categoria: 'Combos',           icono: 'ph-scissors',    orden: 4  },
  // ── Barba ──────────────────────────────────────────────────────────────────
  { id: 'mapu-b-01', nombre: 'Perfilado de Barba Simple',           precio: 16500, duracion: 35,  categoria: 'Barba',            icono: 'ph-user-focus',  orden: 5  },
  { id: 'mapu-b-02', nombre: 'Perfilado de Barba con Navaja',       precio: 18600, duracion: 45,  categoria: 'Barba',            icono: 'ph-user-focus',  orden: 6  },
  { id: 'mapu-b-03', nombre: 'Rasurado Completo de Barba',          precio: 22000, duracion: 45,  categoria: 'Barba',            icono: 'ph-user-focus',  orden: 7  },
  // ── Cortes ─────────────────────────────────────────────────────────────────
  { id: 'mapu-k-01', nombre: 'Corte de Cabello',                    precio: 18600, duracion: 45,  categoria: 'Cortes',           icono: 'ph-scissors',    orden: 8  },
  { id: 'mapu-k-02', nombre: 'Corte Precisión 100% Tijeras',        precio: 25000, duracion: 60,  categoria: 'Cortes',           icono: 'ph-scissors',    orden: 9  },
  { id: 'mapu-k-03', nombre: 'Cambio de Look',                      precio: 27000, duracion: 75,  categoria: 'Cortes',           icono: 'ph-magic-wand',  orden: 10 },
  { id: 'mapu-k-04', nombre: 'Corte y Mantención Cabello Largo',    precio: 24000, duracion: 60,  categoria: 'Cortes',           icono: 'ph-scissors',    orden: 11 },
  { id: 'mapu-k-05', nombre: 'Corte + Lavado Premium',              precio: 22000, duracion: 45,  categoria: 'Cortes',           icono: 'ph-scissors',    orden: 12 },
];

async function seed() {
  for (const s of SERVICIOS) {
    const { id, ...data } = s;
    await col.doc(id).set({
      ...data,
      activo:    true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✓ [${data.categoria.padEnd(12)}] ${data.nombre} — $${data.precio.toLocaleString('es-CL')} / ${data.duracion} min`);
  }

  console.log(`\n✅ ${SERVICIOS.length} servicios creados en tenants/mapubarbershop/servicios`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
