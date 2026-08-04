/**
 * Cierra el piloto de reservas en grupo en delnero:
 *   1) Borra tenants/delnero/barberos/barbero-prueba-grupo (verificado sin citas
 *      futuras ni slotLocks activos).
 *   2) Apaga configuracion/main.reservasGrupo → enabled: false. Deja maxPersonas
 *      guardado por si se quiere volver a activar más adelante.
 *
 * NO toca el user de Auth 9ESyaCvgbqTV7OIYgptg6ZHmBci2 (borrarlo es
 * irreversible y el histórico de la cita pasada lo referencia).
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

  // Reverificación rápida: si aparecieron citas o locks futuros desde la
  // última inspección, abortamos.
  const today = new Date().toISOString().slice(0, 10);
  const [citasSnap, locksSnap] = await Promise.all([
    base.collection('citas').where('barberoId', '==', BID).get(),
    base.collection('slotLocks').where('barberoId', '==', BID).get(),
  ]);
  const citasFut = citasSnap.docs.filter(d => (d.data().fecha || '') >= today);
  const locksFut = locksSnap.docs.filter(d => (d.data().fecha || '') >= today);
  if (citasFut.length || locksFut.length) {
    console.error('[abort] hay citas o locks FUTUROS con ese barbero.',
      'citas:', citasFut.length, 'locks:', locksFut.length);
    process.exit(2);
  }

  const barbRef = base.collection('barberos').doc(BID);
  const cfgRef  = base.collection('configuracion').doc('main');

  await db.runTransaction(async (tx) => {
    const [b, c] = await Promise.all([tx.get(barbRef), tx.get(cfgRef)]);
    if (b.exists) tx.delete(barbRef);
    if (c.exists) {
      const cur = c.data().reservasGrupo || {};
      tx.update(cfgRef, {
        reservasGrupo: { enabled: false, maxPersonas: Number(cur.maxPersonas) || 3 },
      });
    }
  });

  console.log('[ok] borrado tenants/delnero/barberos/' + BID);
  console.log('[ok] configuracion/main.reservasGrupo.enabled = false');
  console.log('[nota] Auth user 9ESyaCvgbqTV7OIYgptg6ZHmBci2 SE MANTIENE.');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
