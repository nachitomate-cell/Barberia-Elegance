// send-test-email.js — Crea una cita real en Firestore con TU email.
// Esto dispara el trigger `confirmacionCitaTenant` que envía el email
// de confirmación con el código de cita (vía Resend).
//
// Útil para PROBAR cómo se ve el email en tu inbox sin pasar por el
// flujo de booking público completo.
//
// Uso:
//   cd tests
//   EMAIL=ignaciiio.mate@gmail.com node send-test-email.js
//   EMAIL=ignaciiio.mate@gmail.com TENANT=elegance node send-test-email.js
//
// Pre-requisitos:
//   - tests/.firebase-admin-key.json existe
//   - Cloud Function `confirmacionCitaTenant` desplegada
//   - Secret RESEND_API_KEY configurado en la function

'use strict';

const fs   = require('fs');
const path = require('path');

const EMAIL  = process.env.EMAIL  || 'ignaciiio.mate@gmail.com';
const TENANT = process.env.TENANT || 'kronnos_penablanca';
const NOMBRE = process.env.NOMBRE || 'Ignacio';

const KEY_FILE = path.join(__dirname, '.firebase-admin-key.json');

if (!fs.existsSync(KEY_FILE)) {
  console.error('\n✗ Falta .firebase-admin-key.json en tests/');
  console.error('  Descarga: https://console.firebase.google.com/project/barberia-elegance');
  console.error('           /settings/serviceaccounts/adminsdk → Generate new private key');
  console.error(`  Guardar como: ${KEY_FILE}\n`);
  process.exit(1);
}

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(KEY_FILE)) });
const db = admin.firestore();

function citasCol(tid) {
  return tid === 'elegance'
    ? db.collection('citas')
    : db.collection('tenants').doc(tid).collection('citas');
}

function generarCodigoTest() {
  const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = 'T'; // T = test
  for (let i = 0; i < 5; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code.slice(0, 3) + '-' + code.slice(3);
}

function fechaFutura(diasOffset = 5) {
  const d = new Date(Date.now() + diasOffset * 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

(async () => {
  const codigo = generarCodigoTest();
  const cita = {
    fecha:            fechaFutura(5),
    hora:             '16:30',
    clienteNombre:    NOMBRE,
    clienteTelefono:  '56983568212',
    clienteEmail:     EMAIL,
    servicioNombre:   'Corte de prueba (test email)',
    duracionServicio: 30,
    precio:           12990,
    barbero:          'Test Barbero',
    barberoId:        'test-barbero',
    estado:           'Pendiente',
    codigoCita:       codigo,
    _testRun:         true,
    creadoEn:         admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log('\n' + '═'.repeat(64));
  console.log('Enviando email de prueba');
  console.log('═'.repeat(64));
  console.log(`Tenant:    ${TENANT}`);
  console.log(`Email:     ${EMAIL}`);
  console.log(`Nombre:    ${NOMBRE}`);
  console.log(`Fecha:     ${cita.fecha} ${cita.hora}`);
  console.log(`Código:    ${codigo}`);
  console.log('═'.repeat(64) + '\n');

  try {
    const ref = await citasCol(TENANT).add(cita);
    console.log(`✓ Cita creada: id=${ref.id}`);
    console.log(`✓ Trigger confirmacionCitaTenant disparado.`);
    console.log(`✓ Revisá tu inbox en ${EMAIL} (puede tardar 30s–1min).`);
    console.log(`\nℹ Si NO llega el email:`);
    console.log(`  · Revisá logs en Firebase Console → Functions → confirmacionCitaTenant`);
    console.log(`  · Verificá que TENANT_CONFIG en confirmacion-cita.js tenga "${TENANT}"`);
    console.log(`  · Confirmá que RESEND_API_KEY está seteado como secret`);
    console.log(`\nℹ La cita queda en Firestore con _testRun:true.`);
    console.log(`  Para eliminarla: corré "node cleanup-test-citas.js"`);
    console.log(`  O probá cancelarla por el código ${codigo} desde el chat.\n`);
    process.exit(0);
  } catch (err) {
    console.error('✗ Error creando cita:', err.message);
    process.exit(1);
  }
})();
