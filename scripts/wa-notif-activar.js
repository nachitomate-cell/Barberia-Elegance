'use strict';

// scripts/wa-notif-activar.js
// ─────────────────────────────────────────────────────────────────
// Activa el módulo "Aviso de reservas al local" (WhatsApp gratis al
// dueño) escribiendo el doc global _system/whatsapp_notif. En cuanto
// `numero` queda seteado (y freeEnabled !== false), la Cloud Function
// waNotifEstado devuelve disponible:true y el panel deja de mostrar
// "se está habilitando" → todos los locales pueden activar.
//
// ⚠️ Corre esto SOLO cuando la infra Meta esté REAL, o el botón
// "Activar" aparecerá pero los mensajes fallarán:
//   1. Número dedicado registrado en WhatsApp Cloud API (Meta)
//   2. Secrets: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN
//   3. Webhook en Meta → URL de whatsappWebhook, suscrito a "messages"
//   4. Functions desplegadas (whatsappWebhook, notificarCitaWhatsApp*, waNotifEstado)
//
// Uso:
//   node scripts/wa-notif-activar.js --status         → solo muestra el doc actual
//   node scripts/wa-notif-activar.js 569XXXXXXXX       → activa (freeEnabled:true)
//   node scripts/wa-notif-activar.js 569XXXXXXXX --off → kill switch (freeEnabled:false)
// ─────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const REF = db.collection('_system').doc('whatsapp_notif');

(async () => {
  const args       = process.argv.slice(2);
  const soloStatus = args.includes('--status');
  const apagar     = args.includes('--off');
  // Número estilo Meta: dígitos, E.164 sin '+' (Chile: 569XXXXXXXX).
  const numero     = args.find(a => /^\d{8,15}$/.test(a)) || null;

  const snap   = await REF.get();
  const actual = snap.exists ? snap.data() : {};
  console.log('[wa-notif] doc actual (_system/whatsapp_notif):');
  console.log(JSON.stringify(actual, null, 2) || '{}');

  if (soloStatus) { process.exit(0); }

  if (!numero) {
    console.error('\n✗ Falta el número. Uso: node scripts/wa-notif-activar.js 569XXXXXXXX');
    process.exit(1);
  }

  const payload = {
    numero,
    freeEnabled:      !apagar,
    // No toggleamos el nivel pagado (plantillas al cliente) desde acá.
    templatesEnabled: actual.templatesEnabled === true,
    templateCita:     actual.templateCita || 'confirmacion_cita',
    templateLang:     actual.templateLang || 'es',
    updatedAt:        admin.firestore.FieldValue.serverTimestamp(),
  };

  await REF.set(payload, { merge: true });
  console.log(`\n✓ _system/whatsapp_notif actualizado → numero=${numero}  freeEnabled=${!apagar}`);
  console.log('  waNotifEstado.disponible pasará a true; el panel mostrará el módulo como activable.');
  process.exit(0);
})().catch(e => { console.error('✗ Error:', e.message); process.exit(1); });
