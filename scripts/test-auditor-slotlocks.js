#!/usr/bin/env node
/**
 * test-auditor-slotlocks.js — ¿el guardián diario detecta de verdad?
 *
 * Un guard que nunca falla no sirve de nada. Esto planta a propósito los dos
 * desajustes que el espejo de ocupación puede tener y exige que los encuentre:
 *
 *   A) candado sin cita ni bloqueo detrás  → la pública bloquea una hora libre
 *   B) cita sin candado                    → la pública ofrece una hora tomada
 *
 * Y comprueba que NO invente hallazgos donde está todo bien (una cita con su
 * candado, y un sobrecupo que por regla no lleva candado).
 *
 * Corre sobre `sandbox` y en una fecha lejana; limpia todo al terminar, incluso
 * si algo falla.
 *
 * Uso:  npm run test:slotlocks
 */
const path = require('path');
const RAIZ = path.resolve(__dirname, '..');

// OJO: functions/ tiene su PROPIO node_modules. El módulo que se prueba hace
// `require('firebase-admin')` y resuelve al de functions/, que es otra
// instancia: inicializar el de la raíz no le sirve y falla con 'app/no-app'.
// Hay que inicializar exactamente el que él va a usar.
const admin = require(path.join(RAIZ, 'functions', 'node_modules', 'firebase-admin'));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(require(path.join(RAIZ, 'service-account.json'))) });
}
const db = admin.firestore();
const { _auditarTenant } = require(path.join(RAIZ, 'functions', 'auditar-slotlocks-daily.js'));

const TID   = 'sandbox';
const FECHA = '2027-03-11';          // lejos de cualquier agenda real
const BARB  = 'test-auditor';
const creados = [];

const nuevo = async (col, id, data) => {
  const ref = db.doc(`tenants/${TID}/${col}/${id}`);
  await ref.set(data);
  creados.push(ref);
  return ref;
};

let fallos = 0;
const ck = (ok, m) => { console.log((ok ? '  ✓ ' : '  ✗ ') + m); if (!ok) fallos++; };

(async () => {
  try {
    // A) candado sin nada detrás
    await nuevo('slotLocks', `${BARB}_${FECHA}_1000`,
      { fecha: FECHA, hora: '10:00', barberoId: BARB, citaId: 'cita_que_no_existe' });

    // B) cita sin candado
    await nuevo('citas', 'test_cita_sin_candado',
      { fecha: FECHA, hora: '11:00', barberoId: BARB, estado: 'Confirmada',
        clienteNombre: 'PRUEBA sin candado', duracion: 30 });

    // Sano: cita CON su candado — no debe aparecer en ningún hallazgo
    await nuevo('citas', 'test_cita_sana',
      { fecha: FECHA, hora: '12:00', barberoId: BARB, estado: 'Confirmada',
        clienteNombre: 'PRUEBA sana', duracion: 30 });
    await nuevo('slotLocks', `${BARB}_${FECHA}_1200`,
      { fecha: FECHA, hora: '12:00', barberoId: BARB, citaId: 'test_cita_sana' });

    // Sano: sobrecupo — por regla NO lleva candado, no debe contarse como B
    await nuevo('citas', 'test_sobrecupo',
      { fecha: FECHA, hora: '13:00', barberoId: BARB, estado: 'Confirmada',
        clienteNombre: 'PRUEBA sobrecupo', duracion: 30, sobrecupo: true });

    // Sano: cita CANCELADA con su candado — el candado sobra y debe salir en A
    await nuevo('citas', 'test_cita_cancelada',
      { fecha: FECHA, hora: '14:00', barberoId: BARB, estado: 'Cancelada',
        clienteNombre: 'PRUEBA cancelada', duracion: 30 });
    await nuevo('slotLocks', `${BARB}_${FECHA}_1400`,
      { fecha: FECHA, hora: '14:00', barberoId: BARB, citaId: 'test_cita_cancelada' });

    const r = await _auditarTenant(TID, FECHA, FECHA);
    const horasA = r.huerfanos.map(l => l.hora).sort();
    const textoB = r.sinCandado.join(' | ');

    console.log(`\ndetectados → huérfanos: [${horasA.join(', ')}]  sinCandado: ${r.sinCandado.length}`);

    ck(horasA.includes('10:00'), 'A) encuentra el candado sin cita detrás');
    ck(horasA.includes('14:00'), 'A) encuentra el candado de una cita CANCELADA');
    ck(!horasA.includes('12:00'), 'A) NO marca el candado de una cita viva');
    ck(textoB.includes('11:00'), 'B) encuentra la cita sin candado');
    ck(!textoB.includes('12:00'), 'B) NO marca la cita que sí tiene candado');
    ck(!textoB.includes('13:00'), 'B) NO marca el sobrecupo (por regla va sin candado)');
    ck(r.huerfanos.length === 2 && r.sinCandado.length === 1,
      `no inventa hallazgos de más (esperaba 2 y 1, dio ${r.huerfanos.length} y ${r.sinCandado.length})`);
  } finally {
    for (const ref of creados) await ref.delete().catch(() => {});
    console.log(`\n(limpieza: ${creados.length} docs de prueba borrados)`);
  }

  console.log(fallos === 0 ? '\nOK — el guardián detecta las dos direcciones\n' : `\n${fallos} fallo(s)\n`);
  process.exit(fallos ? 1 : 0);
})();
