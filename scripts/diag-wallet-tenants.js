'use strict';

/**
 * scripts/diag-wallet-tenants.js
 * ─────────────────────────────────────────────────────────────────
 *  Radiografía del módulo Wallet por tenant. Responde la única
 *  pregunta que importa: ¿en cuántos locales la tarjeta EXISTE de
 *  verdad para el cliente final?
 *
 *  Un tenant necesita TRES cosas para que el botón aparezca:
 *    1. `_billing/{tid}.walletActivo = true`  → el add-on está pagado
 *       (lo exige el gate server-side de walletProvisionarClase y
 *        walletGenerarPase).
 *    2. `configuracion/wallet.enabled = true` → visible al cliente
 *       (lo mira fidelidad.js para pintar los botones).
 *    3. La LoyaltyClass provisionada en Google (se infiere de que la
 *       config tenga programName/accent: el estudio la persiste junto
 *       con la llamada a walletProvisionarClase).
 *
 *  Además cuenta pases realmente emitidos: `walletObjectId` (Google) y
 *  `appleWalletSerial` (Apple) en los docs de usuario.
 *
 *  Enumera tenants con listDocuments() — `tenants/{tid}` son docs
 *  fantasma (sin campos) y un .get() los omite.
 *
 *  Uso:  node scripts/diag-wallet-tenants.js
 * ─────────────────────────────────────────────────────────────────
 */

const path  = require('path');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(__dirname, '..', 'service-account.json'))),
});
const db = admin.firestore();

const C = {
  gris:  (s) => `\x1b[90m${s}\x1b[0m`,
  verde: (s) => `\x1b[32m${s}\x1b[0m`,
  rojo:  (s) => `\x1b[31m${s}\x1b[0m`,
  ama:   (s) => `\x1b[33m${s}\x1b[0m`,
  neg:   (s) => `\x1b[1m${s}\x1b[0m`,
};

/** Cuenta docs de una colección que tengan un campo presente.
    orderBy() descarta implícitamente los docs sin ese campo y usa el
    índice de campo único que Firestore crea solo. */
async function contarCon(ref, campo) {
  try {
    const snap = await ref.orderBy(campo).count().get();
    return snap.data().count;
  } catch (_) {
    return null; // índice ausente o colección inexistente
  }
}

/** `pre` es el prefijo de path: '' para elegance (raíz) o `tenants/{tid}/`. */
async function estadoDe(tid, pre) {
  const [billing, cfgWallet, sys, general] = await Promise.all([
    db.doc(`_billing/${tid}`).get().catch(() => null),
    db.doc(`${pre}configuracion/wallet`).get().catch(() => null),
    db.doc(`_system/${tid}`).get().catch(() => null),
    db.doc(`${pre}settings/general`).get().catch(() => null),
  ]);

  const b   = (billing  && billing.exists)   ? billing.data()   : {};
  const cfg = (cfgWallet && cfgWallet.exists) ? cfgWallet.data() : null;
  const s   = (sys && sys.exists) ? sys.data() : {};

  const usersRef = db.collection(`${pre}users`);
  const [google, apple, totalUsers] = await Promise.all([
    contarCon(usersRef, 'walletObjectId'),
    contarCon(usersRef, 'appleWalletSerial'),
    usersRef.count().get().then(r => r.data().count).catch(() => null),
  ]);

  return {
    tid,
    operativo:   s.operativo !== false,
    walletActivo: b.walletActivo === true,
    plan:        b.plan || b.planWa || '',
    cfg,
    enabled:     !!(cfg && cfg.enabled),
    tieneGeo:    !!(cfg && cfg.location && cfg.location.lat),
    geoRadius:   cfg && cfg.geoRadius,
    google, apple, totalUsers,
    nombre: (general && general.exists && general.data().nombre) || '',
  };
}

(async () => {
  console.log(C.neg('\n═══ Estado del módulo Wallet por tenant ═══\n'));

  const tenantRefs = await db.collection('tenants').listDocuments();
  const tids = tenantRefs.map(r => r.id).sort();

  // elegance vive en la raíz, no bajo tenants/. Si además existe un doc
  // tenants/elegance se ignora: la fuente de verdad de ese local es la raíz.
  const objetivos = [{ tid: 'elegance', pre: '' }]
    .concat(tids.filter(t => t !== 'elegance').map(tid => ({ tid, pre: `tenants/${tid}/` })));

  console.log(C.gris(`Tenants encontrados: ${tids.length} (+ elegance en raíz)\n`));

  const filas = [];
  for (const o of objetivos) {
    try {
      filas.push(await estadoDe(o.tid, o.pre));
    } catch (e) {
      console.log(C.rojo(`  ! ${o.tid}: ${e.message}`));
    }
  }

  const pad = (s, n) => String(s === null || s === undefined ? '' : s).padEnd(n);
  console.log(
    C.neg(pad('TENANT', 22) + pad('OPER', 6) + pad('ADD-ON', 8) +
          pad('VISIBLE', 9) + pad('CONFIG', 8) + pad('GEO', 6) +
          pad('GOOGLE', 8) + pad('APPLE', 7) + 'USERS')
  );
  console.log(C.gris('─'.repeat(82)));

  const listos = [], candidatos = [], sinConfig = [];

  for (const f of filas) {
    const si = (v) => (v ? C.verde('sí') : C.rojo('no'));
    console.log(
      pad(f.tid, 22) +
      pad(f.operativo ? '·' : 'off', 6) +
      pad(f.walletActivo ? C.verde('sí') : C.rojo('NO'), 8 + 9) +
      pad(f.enabled ? C.verde('sí') : C.rojo('NO'), 9 + 9) +
      pad(f.cfg ? C.verde('sí') : C.ama('—'), 8 + 9) +
      pad(f.tieneGeo ? C.verde('sí') : C.ama('—'), 6 + 9) +
      pad(f.google === null ? '?' : f.google, 8) +
      pad(f.apple === null ? '?' : f.apple, 7) +
      (f.totalUsers === null ? '?' : f.totalUsers)
    );

    if (!f.operativo) continue;
    if (f.walletActivo && f.enabled) listos.push(f);
    else if (f.totalUsers > 0) candidatos.push(f);
    if (!f.cfg) sinConfig.push(f.tid);
  }

  console.log('');
  console.log(C.neg('Resumen'));
  console.log(`  Tenants con la tarjeta VIVA para el cliente: ${listos.length ? C.verde(listos.map(f => f.tid).join(', ')) : C.rojo('NINGUNO')}`);
  console.log(`  Pases Google emitidos en total: ${filas.reduce((a, f) => a + (f.google || 0), 0)}`);
  console.log(`  Pases Apple emitidos en total:  ${filas.reduce((a, f) => a + (f.apple || 0), 0)}`);
  console.log('');
  console.log(C.neg('Candidatos a provisionar') + C.gris(' (operativos, con clientes, sin wallet viva)'));
  candidatos
    .sort((a, b) => (b.totalUsers || 0) - (a.totalUsers || 0))
    .forEach(f => {
      const falta = [];
      if (!f.walletActivo) falta.push('add-on');
      if (!f.cfg)          falta.push('config/clase');
      if (!f.enabled)      falta.push('visibilidad');
      console.log(`  ${pad(f.tid, 22)} ${pad(f.totalUsers + ' clientes', 16)} falta: ${C.ama(falta.join(' + '))}`);
    });

  console.log('');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
