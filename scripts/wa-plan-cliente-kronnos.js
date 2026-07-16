'use strict';

// scripts/wa-plan-cliente-kronnos.js
// ─────────────────────────────────────────────────────────────────────────────
//  Activa el NIVEL PAGADO (confirmación al CLIENTE por plantilla WhatsApp) para
//  los tres locales de Kronnos. Deja la config LISTA pero el candado global
//  (templatesEnabled) SIGUE APAGADO hasta que Meta apruebe la plantilla.
//
//  Triple candado del envío (functions/whatsapp-notif.js):
//    1. _system/whatsapp_notif.templatesEnabled === true   (global) ← se flipea aparte tras aprobación
//    2. wa_notif/{tid}.planCliente === true                (por local) ← ESTE script
//    3. _system/whatsapp_notif.templateCita definido        (plantilla) ← ESTE script
//  + 4º candado: consentimiento del cliente (cita.waOptIn / wa_optout).
//
//  Uso:  node scripts/wa-plan-cliente-kronnos.js
// ─────────────────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const KRONNOS = ['kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'];
const TEMPLATE = 'confirmacion_cita';
const LANG = 'es';

(async () => {
  // 1) Config global: nombre + idioma de la plantilla. NO tocamos templatesEnabled
  //    (queda como esté; se enciende recién cuando la plantilla esté APPROVED).
  const sysRef = db.collection('_system').doc('whatsapp_notif');
  const sysBefore = (await sysRef.get()).data() || {};
  await sysRef.set({
    templateCita: TEMPLATE,
    templateLang: LANG,
    updatedAt:    FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`✓ _system/whatsapp_notif → templateCita='${TEMPLATE}', templateLang='${LANG}'`);
  console.log(`  (templatesEnabled se mantiene en: ${sysBefore.templatesEnabled === true ? 'true' : 'false/undefined'} — se flipea tras aprobación)`);

  // 2) planCliente por local Kronnos (crea el doc si no existe).
  for (const tid of KRONNOS) {
    const ref = db.collection('wa_notif').doc(tid);
    await ref.set({
      tenantId:         tid,
      planCliente:      true,
      planClienteDesde: FieldValue.serverTimestamp(),
    }, { merge: true });
    const d = (await ref.get()).data() || {};
    console.log(`✓ wa_notif/${tid} → planCliente=true  (estado free: ${d.estado || 'sin activar'})`);
  }

  console.log('\n════════ RESUMEN ════════');
  console.log(`Plantilla:      ${TEMPLATE} (${LANG})`);
  console.log(`Locales pagados: ${KRONNOS.join(', ')}`);
  console.log('Candado global (templatesEnabled): APAGADO → falta aprobar la plantilla en Meta.');
  console.log('Consentimiento: cita.waOptIn=true en reserva pública (deploy firebaseUtils) + opt-out STOP.');
  console.log('══════════════════════════');
  process.exit(0);
})().catch(e => { console.error('✗ Error:', e.code || '', e.message); process.exit(1); });
