'use strict';

// scripts/wa-recordatorio-test.js
// ─────────────────────────────────────────────────────────────────
// Cita FALSA para probar el recordatorio 24h por el canal oficial de
// Meta (plantilla `recordatorio_cita`) en el tenant piloto.
//
// La cita se crea con fecha de MAÑANA a propósito: el cron
// `recordatorioCitaMeta` busca exactamente `fecha == mañana` y manda
// un recordatorio por cita, una sola vez (marca waRecordatorioEnviado).
//
// El envío ocurre en el siguiente ciclo del cron: cada 30 minutos,
// entre las 09:00 y las 21:00 de Chile. Fuera de esa ventana no sale
// nada — es la misma disciplina anti-bloqueo del canal de Evolution.
//
// Uso:
//   node scripts/wa-recordatorio-test.js                      → crea (a tu número)
//   node scripts/wa-recordatorio-test.js 56912345678          → crea a otro número
//   node scripts/wa-recordatorio-test.js --estado             → qué hay y en qué va
//   node scripts/wa-recordatorio-test.js --limpiar            → borra las de prueba
// ─────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const { FieldValue } = admin.firestore;

const TENANT     = 'delnero';
const FONO_DEMO  = '56983568212';          // el de Ignacio
const MARCA      = '_testRecordatorio';

const citasCol = () => db.collection(`tenants/${TENANT}/citas`);

const fechaChile = (offset = 0) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(Date.now() + offset * 86400000));

const args    = process.argv.slice(2);
const limpiar = args.includes('--limpiar');
const estado  = args.includes('--estado');
const fono    = (args.find(a => /^\d{11,}$/.test(a)) || FONO_DEMO);

async function mostrarEstado() {
  const snap = await citasCol().where(MARCA, '==', true).get();
  if (snap.empty) { console.log('\nNo hay citas de prueba.\n'); return; }

  console.log(`\n${snap.size} cita(s) de prueba en ${TENANT}:\n`);
  for (const doc of snap.docs) {
    const c = doc.data();
    console.log(`  ${doc.id}`);
    console.log(`    ${c.fecha} ${c.hora} · ${c.clienteNombre} · ${c.clienteTelefono}`);
    console.log(`    estado=${c.estado}  recordatorioEnviado=${c.waRecordatorioEnviado === true}`);
    if (c.waClienteConfirmoEn) console.log('    ✅ el cliente CONFIRMÓ');
    if (c.waClienteCanceloEn)  console.log('    🚫 el cliente CANCELÓ');

    const pend = await db.doc(`wa_cita_pendiente/${c.clienteTelefono}`).get();
    console.log(`    pendiente en wa_cita_pendiente: ${pend.exists ? 'sí (esperando respuesta)' : 'no'}`);
  }
  console.log('');
}

(async () => {
  if (estado) { await mostrarEstado(); process.exit(0); }

  if (limpiar) {
    const snap = await citasCol().where(MARCA, '==', true).get();
    for (const doc of snap.docs) {
      const tel = doc.data().clienteTelefono;
      await doc.ref.delete();
      if (tel) await db.doc(`wa_cita_pendiente/${tel}`).delete().catch(() => {});
      console.log(`✓ borrada ${doc.id}`);
    }
    console.log(`\n${snap.size} cita(s) de prueba eliminadas.\n`);
    process.exit(0);
  }

  const sys = (await db.doc('_system/whatsapp_notif').get()).data() || {};
  const wa  = (await db.doc(`wa_notif/${TENANT}`).get()).data() || {};

  const cita = {
    clienteNombre:   'Prueba Recordatorio',
    clienteTelefono: fono,
    servicioNombre:  'Corte + Barba',
    barbero:         'Barbero Demo',
    fecha:           fechaChile(1),        // MAÑANA
    hora:            '15:30',
    precio:          15000,
    estado:          'Reservada',
    waOptIn:         true,                 // consentimiento explícito
    [MARCA]:         true,
    createdAt:       FieldValue.serverTimestamp(),
  };

  const ref = await citasCol().add(cita);
  console.log(`\n✓ Cita de prueba creada → tenants/${TENANT}/citas/${ref.id}`);
  console.log(`  ${cita.fecha} a las ${cita.hora} · destino ${fono}\n`);

  console.log('Estado de los candados:');
  console.log(`  templatesEnabled          = ${sys.templatesEnabled === true}${sys.templatesEnabled === true ? '' : '   ← DORMIDO, no se enviará nada'}`);
  console.log(`  templateRecordatorio      = ${sys.templateRecordatorio || '—'}`);
  console.log(`  ${TENANT}.planRecordatorio  = ${wa.planRecordatorio === true}`);
  console.log(`  waOptIn en la cita        = true\n`);

  if (sys.templatesEnabled === true) {
    console.log('El recordatorio sale en el próximo ciclo del cron (≤30 min, 09:00–21:00 Chile).');
    console.log('Responde SÍ o NO al WhatsApp y revisa con --estado que la cita haya cambiado.\n');
  } else {
    console.log('Para encender: node scripts/wa-recordatorio-piloto.js --go-live\n');
  }
  console.log(`Limpiar después:  node scripts/wa-recordatorio-test.js --limpiar\n`);
  process.exit(0);
})().catch(e => { console.error('✗ Error:', e.message); process.exit(1); });
