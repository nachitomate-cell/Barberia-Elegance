/* ═══════════════════════════════════════════════════════════════
 * set-email-avisos.js — Correo oficial de avisos por tenant.
 *
 * Escribe settings/general.emailAvisos (elegance en la raíz; el resto
 * bajo tenants/{tid}/). Es el destinatario de los avisos del sistema
 * (mensualidad). El dueño puede cambiarlo después desde
 * /gestion-interna → Configuración → "Correo para avisos".
 *
 * NO toca los correos de barberos/ (credenciales de login).
 * Los tenants que no están en la lista se dejan intactos.
 *
 * Uso:
 *   node scripts/set-email-avisos.js --dry     (muestra qué haría)
 *   node scripts/set-email-avisos.js --commit  (escribe)
 * ═══════════════════════════════════════════════════════════════ */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// Correos oficiales entregados por el dueño de la plataforma (19-jul-2026).
const EMAILS = {
  chameleon:          'marialaurascn0602@gmail.com',
  aura:               'aurasalon221@gmail.com',
  elegance:           'sergio.mherrera10@gmail.com',
  kronnos_penablanca: 'claudio.burgos91@gmail.com',
  kronnos_limache:    'dexterjoric@gmail.com',
  kronnos_woman:      'grupo.kratos.spa@gmail.com',
  infinity:           'infinitystudio0223@gmail.com',
  yugen:              'contacto.yugenstudio@gmail.com',
  latincaribe:        'joshidalgo.jg@gmail.com',
  lumen:              'harcutbarberia@gmail.com',   // D'Jones
};

const settingsPath = (tid) => (tid === 'elegance' ? 'settings/general' : `tenants/${tid}/settings/general`);
const COMMIT = process.argv.includes('--commit');

async function main() {
  if (!COMMIT) console.log('\n⚠  DRY-RUN (usa --commit para escribir)\n');

  for (const [tid, email] of Object.entries(EMAILS)) {
    const ref = db.doc(settingsPath(tid));
    const snap = await ref.get();
    const actual = snap.exists ? (snap.data().emailAvisos || '') : '';
    const existeDoc = snap.exists;

    const estado = !existeDoc ? 'CREA DOC'
                 : actual === email ? 'ya estaba'
                 : actual ? `reemplaza "${actual}"`
                 : 'nuevo';

    console.log(`${tid.padEnd(20)} → ${email.padEnd(34)} [${estado}]`);

    if (COMMIT && actual !== email) {
      await ref.set({ emailAvisos: email }, { merge: true });
    }
  }

  console.log(COMMIT ? '\n✓ Escrito.\n' : '\nNada escrito (dry-run).\n');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
