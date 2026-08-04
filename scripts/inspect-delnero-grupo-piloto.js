/**
 * Inspección previa al cierre del piloto de reservas en grupo en delnero.
 * NO modifica nada. Solo reporta:
 *   - Si existe tenants/delnero/barberos/barbero-prueba-grupo
 *   - Estado actual de configuracion/main.reservasGrupo
 *   - Citas futuras asignadas al barbero de prueba (para saber si hay que reasignar)
 *   - SlotLocks futuros con ese barberoId
 */
const admin = require('firebase-admin');
const path  = require('path');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TENANT = 'delnero';
const BID    = 'barbero-prueba-grupo';

(async () => {
  const base = db.collection('tenants').doc(TENANT);

  // 1) ¿Existe el barbero?
  const barbSnap = await base.collection('barberos').doc(BID).get();
  console.log('[1] barberos/' + BID + ' existe?', barbSnap.exists);
  if (barbSnap.exists) {
    const d = barbSnap.data();
    console.log('    →', {
      nombre: d.nombre, rol: d.rol, authUid: d.authUid,
      esQA: d.esQA, activo: d.activo, sucursalDefault: d.sucursalDefault,
    });
  }

  // 2) Toggle actual
  const cfg = await base.collection('configuracion').doc('main').get();
  const rg = cfg.exists ? (cfg.data().reservasGrupo || null) : null;
  console.log('[2] configuracion/main.reservasGrupo =', rg);

  // 3) Citas con ese barbero (filtro fecha en cliente para no exigir índice compuesto)
  const today = new Date().toISOString().slice(0, 10);
  const citasAll = await base.collection('citas')
    .where('barberoId', '==', BID)
    .get();
  const citasFut = citasAll.docs.filter(d => (d.data().fecha || '') >= today);
  const citasPas = citasAll.docs.filter(d => (d.data().fecha || '') < today);
  console.log('[3] citas totales con barberoId=' + BID + ':', citasAll.size,
              '(futuras:', citasFut.length, '· pasadas:', citasPas.length + ')');
  citasFut.forEach(doc => {
    const c = doc.data();
    console.log('    · FUT', doc.id, {
      fecha: c.fecha, hora: c.hora, cliente: c.clienteNombre,
      estado: c.estado, origen: c.origen, grupoId: c.grupoId || null,
    });
  });
  if (citasPas.length) {
    console.log('    (pasadas: no se listan; quedan en histórico intactas)');
  }

  // 4) SlotLocks (filtro fecha en cliente igual)
  const locksAll = await base.collection('slotLocks')
    .where('barberoId', '==', BID)
    .get();
  const locksFut = locksAll.docs.filter(d => (d.data().fecha || '') >= today);
  console.log('[4] slotLocks futuros con barberoId=' + BID + ':', locksFut.length,
              '(total incl. pasados:', locksAll.size + ')');
  locksFut.forEach(doc => {
    const l = doc.data();
    console.log('    →', doc.id, { fecha: l.fecha, hora: l.hora, citaId: l.citaId });
  });

  // 5) Espejos: doc de barbero puede tener authUid → hay que borrar espejos también
  if (barbSnap.exists && barbSnap.data().authUid) {
    const uid = barbSnap.data().authUid;
    const espejo = await base.collection('barberos')
      .where('authUid', '==', uid)
      .get();
    console.log('[5] docs con authUid=' + uid + ':', espejo.size);
    espejo.forEach(d => console.log('    →', d.id, { rol: d.data().rol, _mainDocId: d.data()._mainDocId }));
  }

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
