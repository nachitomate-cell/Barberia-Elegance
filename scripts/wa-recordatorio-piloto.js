'use strict';

// scripts/wa-recordatorio-piloto.js
// ─────────────────────────────────────────────────────────────────
// Configura el PILOTO del recordatorio 24h por el canal oficial de
// Meta (plantilla `recordatorio_cita`, número de plataforma).
//
// Deja el sistema listo pero DORMIDO: `templatesEnabled` sigue en
// false hasta que la plantilla esté APPROVED y tú lo decidas. Sin
// ese flag global no se envía ni una plantilla, así que correr esto
// no gatilla ningún mensaje ni ningún cobro.
//
// Qué hace:
//   1. _system/whatsapp_notif.templateRecordatorio = 'recordatorio_cita'
//   2. wa_notif/delnero.planRecordatorio = true      (el piloto)
//   3. wa_notif/kronnos_*.planCliente   = false      (ver abajo)
//
// El punto 3 importa: los tres Kronnos quedaron con planCliente:true
// desde julio, cuando se preparó el nivel pagado que nunca se activó.
// Si encendemos templatesEnabled con eso puesto, Kronnos empieza a
// mandar confirmaciones al reservar ANTES del piloto. Se apagan acá
// y se vuelven a encender en el rollout.
//
// Uso:
//   node scripts/wa-recordatorio-piloto.js --status   → solo muestra
//   node scripts/wa-recordatorio-piloto.js            → aplica
//   node scripts/wa-recordatorio-piloto.js --go-live  → enciende templatesEnabled
// ─────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const PILOTO      = 'delnero';
const TEMPLATE    = 'recordatorio_cita';
const A_NEUTRALIZAR = ['kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'];

const soloStatus = process.argv.includes('--status');
const goLive     = process.argv.includes('--go-live');

async function mostrar() {
  const sys = (await db.doc('_system/whatsapp_notif').get()).data() || {};
  console.log('\n_system/whatsapp_notif:');
  console.log('  templatesEnabled     =', sys.templatesEnabled === true);
  console.log('  templateCita         =', sys.templateCita || '—');
  console.log('  templateRecordatorio =', sys.templateRecordatorio || '—');
  console.log('  templateLang         =', sys.templateLang || 'es');

  const refs = await db.collection('wa_notif').listDocuments();
  console.log('\nwa_notif:');
  for (const r of refs) {
    const d = (await r.get()).data() || {};
    console.log(`  ${r.id.padEnd(22)} planCliente=${String(d.planCliente === true).padEnd(5)} planRecordatorio=${d.planRecordatorio === true}`);
  }
  console.log('');
}

(async () => {
  if (soloStatus) { await mostrar(); process.exit(0); }

  if (goLive) {
    await db.doc('_system/whatsapp_notif').set({ templatesEnabled: true }, { merge: true });
    console.log('🚀 templatesEnabled = TRUE. El recordatorio empieza a salir en el próximo ciclo (cada 30 min, 09:00–21:00 Chile).');
    await mostrar();
    process.exit(0);
  }

  // 1. Plantilla de recordatorio en la config global.
  await db.doc('_system/whatsapp_notif').set({
    templateRecordatorio: TEMPLATE,
    templateLang: 'es',
  }, { merge: true });
  console.log(`✓ templateRecordatorio = ${TEMPLATE}`);

  // 2. El tenant del piloto.
  const nombre = (await db.doc(`tenants/${PILOTO}`).get()).data()?.nombre || PILOTO;
  await db.doc(`wa_notif/${PILOTO}`).set({
    planRecordatorio: true,
    nombreLocal: nombre,
  }, { merge: true });
  console.log(`✓ wa_notif/${PILOTO}.planRecordatorio = true  (local: ${nombre})`);

  // 3. Neutralizar el plan pagado heredado de Kronnos hasta el rollout.
  for (const tid of A_NEUTRALIZAR) {
    const ref = db.doc(`wa_notif/${tid}`);
    if (!(await ref.get()).exists) continue;
    await ref.set({ planCliente: false }, { merge: true });
    console.log(`✓ wa_notif/${tid}.planCliente = false  (se re-enciende en el rollout)`);
  }

  await mostrar();
  console.log('Listo. El sistema queda armado pero DORMIDO (templatesEnabled sigue en false).');
  console.log('Cuando la plantilla esté APPROVED: node scripts/wa-recordatorio-piloto.js --go-live\n');
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
