/**
 * Crea una cita de PRUEBA para validar el botón "Añadir a Google Calendar"
 * en dashboard.html (club Elegance). Mañana 11:00, Corte Tradicional, Maxi.
 *
 * Esquema espejado de FDB.addCita() en firebaseUtils.js.
 *
 *   node scripts/crear-cita-prueba.js            # DRY-RUN
 *   node scripts/crear-cita-prueba.js --apply    # escribe en Firestore
 *
 *   node scripts/crear-cita-prueba.js --apply --delete   # borra la última cita test creada
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const args   = process.argv.slice(2);
const APPLY  = args.includes('--apply');
const DELETE = args.includes('--delete');

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'service-account.json'), 'utf8'))
  ),
  projectId: 'barberia-elegance',
});
const db  = admin.firestore();
const FV  = admin.firestore.FieldValue;

// ── Parámetros del test ─────────────────────────────────────────
const TENANT_ID    = 'elegance'; // ← colección plana en root
const CLIENTE_EMAIL = 'ignaciiio.mate@gmail.com';
const CLIENTE_UID   = '2T8cPwontUOGbfKtDSbyW7vuTwy1';

// Cita: mañana 11:00, Corte Tradicional con Maxi (40 min)
const HOY    = new Date();
const MANANA = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() + 1);
const FECHA  = `${MANANA.getFullYear()}-${String(MANANA.getMonth()+1).padStart(2,'0')}-${String(MANANA.getDate()).padStart(2,'0')}`;
const HORA   = '11:00';

const CITA_DATA = {
  fecha:            FECHA,
  hora:             HORA,
  clienteNombre:    'Ignacio Mateluna',
  clienteTelefono:  '+56983568212',
  clienteEmail:     CLIENTE_EMAIL,
  servicioId:       'srv-2',
  servicioNombre:   'Corte Tradicional',
  duracionServicio: 40,
  duracion:         40,
  precio:           10990,
  barbero:          'Maxi',
  barberoId:        'oQicdNhcCwbTFXU7NyNyfNeeXqZ2',
  estado:           'Confirmada',
  nota:             '🧪 Cita de prueba — feature "Añadir a Google Calendar"',
  origen:           'test_calendar_feature',
};

// ── Paths multi-tenant (elegance = root) ────────────────────────
function col(name) {
  return TENANT_ID === 'elegance'
    ? db.collection(name)
    : db.collection('tenants').doc(TENANT_ID).collection(name);
}

function lockIdFor(barberoId, fecha, hora) {
  const safeH = (hora || '').replace(':', '');
  const safeB = String(barberoId || 'any').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeB}_${fecha}_${safeH}`;
}

async function eliminarCitasTest() {
  const snap = await col('citas')
    .where('clienteEmail', '==', CLIENTE_EMAIL)
    .where('origen', '==', 'test_calendar_feature')
    .get();
  if (snap.empty) { console.log('Sin citas de prueba para borrar.'); return; }
  for (const d of snap.docs) {
    const data = d.data();
    if (data.slotLockId) {
      await col('slotLocks').doc(data.slotLockId).delete().catch(() => {});
    }
    await d.ref.delete();
    console.log(`🗑️  Borrada cita ${d.id} (${data.fecha} ${data.hora})`);
  }
}

async function crearCita() {
  const lockId = lockIdFor(CITA_DATA.barberoId, FECHA, HORA);
  const lockRef = col('slotLocks').doc(lockId);
  const citaRef = col('citas').doc();
  const citaId  = citaRef.id;

  // Pre-flight: si el slot ya tiene lock → escojo +30 min hasta encontrar libre
  let intento = 0;
  let horaFinal = HORA;
  let lockFinal = lockId;
  while (intento < 6) {
    const existing = await col('slotLocks').doc(lockFinal).get();
    if (!existing.exists) break;
    intento++;
    const [hh, mm] = horaFinal.split(':').map(Number);
    const newMins = hh * 60 + mm + 30;
    horaFinal = `${String(Math.floor(newMins / 60)).padStart(2, '0')}:${String(newMins % 60).padStart(2, '0')}`;
    lockFinal = lockIdFor(CITA_DATA.barberoId, FECHA, horaFinal);
  }
  if (intento > 0) {
    console.log(`⚠️  Slot ${HORA} ocupado, usando ${horaFinal}.`);
    CITA_DATA.hora = horaFinal;
  }

  const finalCita = {
    ...CITA_DATA,
    slotLockId: lockFinal,
    creadoEn:   FV.serverTimestamp(),
  };
  const finalLock = {
    citaId,
    fecha:     FECHA,
    hora:      CITA_DATA.hora,
    barberoId: CITA_DATA.barberoId,
    duracion:  CITA_DATA.duracionServicio,
    creadoEn:  FV.serverTimestamp(),
  };

  console.log('\n📋 Cita a crear:');
  console.log(JSON.stringify({ id: citaId, ...finalCita, creadoEn: '<serverTs>' }, null, 2));
  console.log('\n🔒 SlotLock:');
  console.log(`  ${lockFinal}`);

  if (!APPLY) {
    console.log('\n👀 DRY-RUN — no se escribió nada. Usa --apply para confirmar.');
    return;
  }

  await db.runTransaction(async (tx) => {
    const ref = col('slotLocks').doc(lockFinal);
    const snap = await tx.get(ref);
    if (snap.exists) throw new Error('Slot tomado entre el pre-flight y el commit. Reintenta.');
    tx.set(ref, finalLock);
    tx.set(citaRef, finalCita);
  });

  console.log(`\n✅ Cita creada: ${citaId}`);
  console.log(`   Path: ${col('citas').path}/${citaId}`);
  console.log(`\nAbre http://localhost:5500/dashboard.html, inicia sesión con ${CLIENTE_EMAIL}`);
  console.log(`y deberías ver "Tu Próxima Cita" con el botón "Añadir a Google Calendar".`);
}

(async () => {
  if (DELETE) {
    if (!APPLY) { console.error('❌ Para borrar usa --apply --delete'); process.exit(1); }
    await eliminarCitasTest();
    process.exit(0);
  }
  await crearCita();
  process.exit(0);
})().catch(err => { console.error('❌', err); process.exit(1); });
