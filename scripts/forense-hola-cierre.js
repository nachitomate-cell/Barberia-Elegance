'use strict';

/**
 * Forense parte 4 (cierre): ¿el cupo quedó libre?, ¿gastamos WhatsApp/IA en
 * este número falso?, ¿qué defensas anti-spam tiene kronnos_limache hoy?
 */

const path = require('path');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(__dirname, '..', 'service-account.json'))),
});
const db = admin.firestore();

const T = 'kronnos_limache';
const FECHA = '2026-08-05';
const HORA = '16:00';
const TEL = '88555885886';
const CITA_BORRADA = 'exO9REQedKNtbICnChdd';

const ser = v => (v && typeof v.toDate === 'function') ? v.toDate().toISOString() : v;

(async () => {
  console.log('══ 1. ¿La cita borrada dejó residuo? ══');
  const c = await db.doc(`tenants/${T}/citas/${CITA_BORRADA}`).get();
  console.log('  citas/' + CITA_BORRADA + ':', c.exists ? 'TODAVÍA EXISTE' : 'borrada ✓');

  console.log('\n══ 2. Estado del slot ' + FECHA + ' ' + HORA + ' ══');
  const s = await db.collection(`tenants/${T}/citas`)
    .where('fecha', '==', FECHA).where('hora', '==', HORA).get();
  console.log(`  ${s.size} cita(s) hoy a las ${HORA}:`);
  s.forEach(d => {
    const v = d.data();
    console.log('   ', d.id, JSON.stringify({
      cliente: v.clienteNombre, tel: v.clienteTelefono, email: v.clienteEmail,
      barbero: v.barbero, barberoId: v.barberoId, servicio: v.servicioNombre,
      estado: v.estado, origen: v.origen, precio: v.precio,
      slotLockId: v.slotLockId, creadoEn: ser(v.creadoEn),
    }));
  });

  const locks = await db.collection(`tenants/${T}/slotLocks`)
    .where('fecha', '==', FECHA).get();
  console.log(`  slotLocks de ${FECHA}:`);
  locks.forEach(d => {
    const v = d.data();
    if (v.hora === HORA) console.log('   ', d.id, JSON.stringify({ ...v, creadoEn: ser(v.creadoEn) }));
  });

  console.log('\n══ 3. ¿Se gastó WhatsApp / IA en el número falso? ══');
  for (const col of ['wa_conversaciones', 'wa_eventos', 'wa_uso', 'wa_cuota']) {
    try {
      const snap = await db.collection(`tenants/${T}/${col}`).get();
      const hits = [];
      snap.forEach(d => {
        const raw = (d.id + JSON.stringify(d.data())).toLowerCase();
        if (raw.includes('88555885886') || raw.includes('555885886') || raw.includes('trefghut')) {
          hits.push([d.id, d.data()]);
        }
      });
      console.log(`  ${col}: ${snap.size} docs, ${hits.length} con el número falso`);
      hits.forEach(([id, d]) => console.log('    !', id, JSON.stringify(d).slice(0, 500)));
    } catch (e) { console.log(`  ${col}: ${e.message}`); }
  }

  console.log('\n══ 4. Defensas activas en el booking público ══');
  const cfg = await db.doc(`tenants/${T}/configuracion/main`).get();
  const cd = cfg.exists ? cfg.data() : {};
  const rel = ['reservaMaxPorDia', 'reservaCooldownMin', 'correoObligatorio',
    'waConfirmActivo', 'requiereConfirmacion', 'reservasOnline', 'antiSpam'];
  for (const k of rel) console.log(`  ${k}:`, cd[k] === undefined ? '(sin definir → default)' : JSON.stringify(cd[k]));

  console.log('\n══ 5. ¿Cuántos "no-show fantasma" hay en el resto de tenants? ══');
  console.log('  (users creados por reserva pública con email de TLD inválido)');
  const tenants = (await db.collection('tenants').listDocuments()).map(r => r.id);
  const TLD_OK = /\.(com|cl|net|org|es|io|co|mx|ar|pe|dev|app|edu|gob|info|me)$/;
  let totalMalos = 0;
  for (const t of tenants) {
    const us = await db.collection(`tenants/${t}/users`).get();
    const malos = [];
    us.forEach(d => {
      const v = d.data();
      const m = String(v.email || '').toLowerCase().trim();
      if (m && m.includes('@') && !TLD_OK.test(m)) malos.push(`${v.nombre || '?'} <${m}>`);
    });
    if (malos.length) {
      totalMalos += malos.length;
      console.log(`  ${t} (${us.size} users): ${malos.length} → ${malos.slice(0, 6).join(' | ')}`);
    }
  }
  console.log(`  ── ${totalMalos} correos inválidos en total (cada uno = un rebote en Brevo) ──`);

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
