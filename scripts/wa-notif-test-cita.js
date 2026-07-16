'use strict';

// scripts/wa-notif-test-cita.js
// ─────────────────────────────────────────────────────────────────
// Crea (o borra) una CITA DE PRUEBA en el tenant elegance (colección
// top-level `citas`) para validar el trigger notificarCitaWhatsAppElegance.
// Sin clienteEmail ni clienteTelefono → el email de confirmación al
// cliente y el template pagado se saltan solos. Marca `_testWhatsApp:true`.
//
// Uso:
//   node scripts/wa-notif-test-cita.js            → crea y muestra el id
//   node scripts/wa-notif-test-cita.js --delete <id>  → borra la cita de prueba
// ─────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const args    = process.argv.slice(2);
  const delIdx  = args.indexOf('--delete');
  if (delIdx !== -1) {
    const id = args[delIdx + 1];
    if (!id) { console.error('✗ Falta el id. Uso: --delete <citaId>'); process.exit(1); }
    await db.collection('citas').doc(id).delete();
    console.log(`✓ Cita de prueba ${id} borrada.`);
    process.exit(0);
  }

  const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const cita = {
    clienteNombre:  'PRUEBA WhatsApp',
    servicioNombre: 'Corte de prueba',
    barbero:        'Barbero Demo',
    fecha:          hoy,
    hora:           '23:45',
    precio:         12000,
    estado:         'Reservada',
    _testWhatsApp:  true,
    createdAt:      admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection('citas').add(cita);
  console.log(`✓ Cita de prueba creada → citas/${ref.id}`);
  console.log('  El trigger notificarCitaWhatsAppElegance debería enviar el aviso al WhatsApp activado.');
  console.log(`  Para borrarla luego:  node scripts/wa-notif-test-cita.js --delete ${ref.id}`);
  process.exit(0);
})().catch(e => { console.error('✗ Error:', e.message); process.exit(1); });
