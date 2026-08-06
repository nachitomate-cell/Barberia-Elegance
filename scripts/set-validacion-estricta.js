'use strict';

/**
 * Enciende/apaga la validación estricta de contacto en el booking público.
 *
 *   node scripts/set-validacion-estricta.js kronnos_limache on
 *   node scripts/set-validacion-estricta.js kronnos_limache off
 *   node scripts/set-validacion-estricta.js --listar
 *
 * Escribe configuracion/main.validacionContactoEstricta, que leen
 * ReservaCore.validarTelefono() y cablearValidacionContacto() en index.html y
 * barbero.html.
 *
 * ON  = el teléfono debe ser un celular chileno (9 dígitos, parte con 9).
 * OFF = piso histórico (9 dígitos cualquiera). Default si el campo no existe.
 *
 * En ambos casos la máscara y el chip de sugerencia de correo funcionan igual:
 * el flag solo cambia cuán estricto es el rechazo del teléfono en el submit.
 *
 * Rollout recomendado: encender en UN local, mirar una semana las reservas
 * `reserva_online` por día contra la línea base, y recién ahí el resto.
 */

const path = require('path');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(__dirname, '..', 'service-account.json'))),
});
const db = admin.firestore();

const CAMPO = 'validacionContactoEstricta';

const refConfig = tid => (tid === 'elegance'
  ? db.doc('configuracion/main')
  : db.doc(`tenants/${tid}/configuracion/main`));

(async () => {
  const [arg1, arg2] = process.argv.slice(2);

  if (!arg1 || arg1 === '--listar') {
    const ids = ['elegance', ...(await db.collection('tenants').listDocuments()).map(r => r.id)].sort();
    console.log('Estado de la validación estricta por local:\n');
    for (const tid of ids) {
      const s = await refConfig(tid).get();
      const v = s.exists ? s.data()[CAMPO] : undefined;
      const etiqueta = v === true ? 'ENCENDIDA' : (v === false ? 'apagada (explícito)' : 'apagada (default)');
      console.log(`  ${tid.padEnd(24)} ${etiqueta}`);
    }
    console.log('\nUso: node scripts/set-validacion-estricta.js <tenant> on|off');
    process.exit(0);
  }

  const tid = arg1;
  const modo = String(arg2 || '').toLowerCase();
  if (!['on', 'off'].includes(modo)) {
    console.error('Segundo argumento debe ser "on" u "off".');
    process.exit(1);
  }

  const ref = refConfig(tid);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`No existe ${ref.path}. ¿El tenant "${tid}" está bien escrito?`);
    process.exit(1);
  }

  const antes = snap.data()[CAMPO];
  await ref.set({ [CAMPO]: modo === 'on' }, { merge: true });

  console.log(`${ref.path}`);
  console.log(`  ${CAMPO}: ${antes === undefined ? '(sin definir)' : antes} → ${modo === 'on'}`);
  console.log('\nEfecto inmediato: lo leen las páginas públicas en la próxima carga.');
  console.log('No requiere deploy — es un dato, no código.');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
