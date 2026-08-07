'use strict';

/**
 * Forense: cita sospechosa en kronnos_limache.
 * Cliente "Hola" / tel 88555885886 / email trefghut@mhhh.cpm
 * La cita fue ELIMINADA por el local, así que buscamos los rastros que
 * sobreviven: doc de cliente, doc de user, slotLock huérfano, cuenta de Auth,
 * y si el mismo actor tocó otros tenants.
 */

const path = require('path');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(__dirname, '..', 'service-account.json'))),
});
const db = admin.firestore();
const auth = admin.auth();

const TEL   = '88555885886';
const SUF9  = TEL.slice(-9);
const EMAIL = 'trefghut@mhhh.cpm';
const NOMBRE = 'hola';

const norm = s => String(s || '').toLowerCase().trim();
const soloDig = s => String(s || '').replace(/\D/g, '');

function huele(obj) {
  const tel = soloDig(obj.clienteTelefono || obj.telefono || obj.phone || '');
  const mail = norm(obj.clienteEmail || obj.email || '');
  const nom = norm(obj.clienteNombre || obj.nombre || '');
  return (tel && (tel === TEL || tel.endsWith(SUF9)))
      || (mail && mail === EMAIL)
      || (mail && mail.endsWith('.cpm'))
      || (nom === NOMBRE);
}

function dump(prefix, id, d) {
  const keys = ['fecha', 'hora', 'clienteNombre', 'clienteTelefono', 'clienteEmail',
    'servicioNombre', 'barbero', 'barberoId', 'estado', 'origen', 'codigoCita',
    'slotLockId', 'userId', 'clienteUid', 'waOptIn', 'sucursalId', 'nombre',
    'telefono', 'email', 'creadoEn', 'fechaRegistro', 'origenAdquisicion',
    'visitas', 'totalCitas', 'sellos', 'uid'];
  const out = {};
  for (const k of keys) {
    if (d[k] === undefined) continue;
    out[k] = (d[k] && typeof d[k].toDate === 'function') ? d[k].toDate().toISOString() : d[k];
  }
  console.log(`  ${prefix} [${id}]`, JSON.stringify(out));
}

(async () => {
  // ── 1. Cuentas de Auth con ese correo o parecidas ──────────────────────
  console.log('══ 1. Firebase Auth ══');
  try {
    const u = await auth.getUserByEmail(EMAIL);
    console.log('  ENCONTRADA:', JSON.stringify({
      uid: u.uid, email: u.email, phone: u.phoneNumber, displayName: u.displayName,
      creado: u.metadata.creationTime, ultimoLogin: u.metadata.lastSignInTime,
      providers: u.providerData.map(p => p.providerId), disabled: u.disabled,
    }));
  } catch (e) {
    console.log('  Sin cuenta Auth con', EMAIL, `(${e.code})`);
  }
  // barrido de cuentas con dominios basura / .cpm
  console.log('  ── barrido de cuentas con TLD inválido (.cpm/.con/.vom) ──');
  let pageToken, total = 0, sospechosas = 0;
  do {
    const res = await auth.listUsers(1000, pageToken);
    for (const u of res.users) {
      total++;
      const m = norm(u.email);
      if (/\.(cpm|con|vom|comm|coom)$/.test(m) || (u.phoneNumber && soloDig(u.phoneNumber).endsWith(SUF9))) {
        sospechosas++;
        console.log('   !', u.uid, u.email, u.phoneNumber || '', u.metadata.creationTime);
      }
    }
    pageToken = res.pageToken;
  } while (pageToken);
  console.log(`  (${total} cuentas revisadas, ${sospechosas} sospechosas)`);

  // ── 2. Barrido de TODOS los tenants ────────────────────────────────────
  console.log('\n══ 2. Barrido por tenant ══');
  const tenantRefs = await db.collection('tenants').listDocuments();
  const tenants = tenantRefs.map(r => r.id).sort();
  console.log(`  ${tenants.length} tenants: ${tenants.join(', ')}\n`);

  const hallazgos = [];

  for (const t of tenants) {
    const golpes = [];

    // citas vivas con ese teléfono / email / suf9
    for (const [campo, valor] of [
      ['clienteTelefono', TEL],
      ['clienteTelefonoSuf9', SUF9],
      ['clienteEmail', EMAIL],
    ]) {
      try {
        const s = await db.collection(`tenants/${t}/citas`).where(campo, '==', valor).get();
        s.forEach(d => golpes.push(['cita', d.id, d.data()]));
      } catch (_) {}
    }

    // clientes / users por doc id y por campo
    for (const col of ['clientes', 'users']) {
      for (const id of [TEL, SUF9, `+56${SUF9}`]) {
        try {
          const d = await db.doc(`tenants/${t}/${col}/${id}`).get();
          if (d.exists) golpes.push([col, d.id, d.data()]);
        } catch (_) {}
      }
      for (const [campo, valor] of [['telefono', TEL], ['email', EMAIL], ['telefonoSuf9', SUF9]]) {
        try {
          const s = await db.collection(`tenants/${t}/${col}`).where(campo, '==', valor).get();
          s.forEach(d => golpes.push([col, d.id, d.data()]));
        } catch (_) {}
      }
    }

    // slotLocks huérfanos (la cita se borró; el lock puede haber quedado)
    try {
      const s = await db.collection(`tenants/${t}/slotLocks`).get();
      s.forEach(d => {
        const v = d.data();
        if (huele(v)) golpes.push(['slotLock', d.id, v]);
      });
    } catch (_) {}

    if (golpes.length) {
      console.log(`── tenant: ${t} (${golpes.length} rastros)`);
      const vistos = new Set();
      for (const [tipo, id, data] of golpes) {
        const k = tipo + '/' + id;
        if (vistos.has(k)) continue;
        vistos.add(k);
        dump(tipo, id, data);
        hallazgos.push({ tenant: t, tipo, id });
      }
    }
  }

  // ── 3. kronnos_limache a fondo ─────────────────────────────────────────
  console.log('\n══ 3. kronnos_limache: contexto completo ══');
  const T = 'kronnos_limache';

  console.log('  ── citas creadas en las últimas 96h (todas) ──');
  const desde = admin.firestore.Timestamp.fromMillis(Date.now() - 96 * 3600 * 1000);
  try {
    const s = await db.collection(`tenants/${T}/citas`)
      .where('creadoEn', '>=', desde).orderBy('creadoEn', 'desc').get();
    console.log(`  ${s.size} citas`);
    s.forEach(d => dump('cita', d.id, d.data()));
  } catch (e) { console.log('  (query falló:', e.message, ')'); }

  console.log('\n  ── slotLocks del tenant (huérfanos = cita borrada) ──');
  try {
    const s = await db.collection(`tenants/${T}/slotLocks`).get();
    console.log(`  ${s.size} locks`);
    const citas = await db.collection(`tenants/${T}/citas`).get();
    const lockIdsVivos = new Set();
    citas.forEach(c => { const l = c.data().slotLockId; if (l) lockIdsVivos.add(l); });
    s.forEach(d => {
      if (!lockIdsVivos.has(d.id)) {
        console.log('   HUÉRFANO:', d.id, JSON.stringify(d.data()));
      }
    });
  } catch (e) { console.log('  (falló:', e.message, ')'); }

  console.log('\n  ── clientes creados en las últimas 96h ──');
  for (const col of ['clientes', 'users']) {
    for (const campo of ['creadoEn', 'fechaRegistro', 'createdAt']) {
      try {
        const s = await db.collection(`tenants/${T}/${col}`)
          .where(campo, '>=', desde).orderBy(campo, 'desc').limit(50).get();
        if (s.size) {
          console.log(`  ${col}.${campo}: ${s.size}`);
          s.forEach(d => dump(col, d.id, d.data()));
        }
      } catch (_) {}
    }
  }

  console.log('\n══ RESUMEN ══');
  console.log(JSON.stringify(hallazgos, null, 2));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
