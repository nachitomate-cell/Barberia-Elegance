'use strict';

/**
 * Forense parte 2: el doc users/ac_00ba69644d428c4bd7 de kronnos_limache
 * completo, más los logs colaterales (mails, notificaciones, WA, errores)
 * de la ventana en que apareció.
 */

const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(__dirname, '..', 'service-account.json'))),
});
const db = admin.firestore();

const T = 'kronnos_limache';
const DOC = 'ac_00ba69644d428c4bd7';
const EMAIL = 'trefghut@mhhh.cpm';
const TEL = '88555885886';

const ser = v => {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  if (v && typeof v === 'object' && v._seconds != null) return new Date(v._seconds * 1000).toISOString();
  return v;
};
const serAll = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, ser(v)]));

(async () => {
  // ── A. ¿El docId confirma que vino por upsertCliente con ese email? ──
  console.log('══ A. Verificación de origen del docId ══');
  const hEmail = 'ac_' + crypto.createHash('sha1').update(`e:${EMAIL}`).digest('hex').slice(0, 18);
  const hTel   = 'ac_' + crypto.createHash('sha1').update(`t:${TEL}`).digest('hex').slice(0, 18);
  console.log('  hash por email:', hEmail, hEmail === DOC ? '← COINCIDE' : '');
  console.log('  hash por tel  :', hTel,   hTel === DOC ? '← COINCIDE' : '');

  // ── B. Doc completo ──
  console.log('\n══ B. tenants/' + T + '/users/' + DOC + ' ══');
  const snap = await db.doc(`tenants/${T}/users/${DOC}`).get();
  if (!snap.exists) { console.log('  NO EXISTE (ya fue borrado)'); }
  else console.log(JSON.stringify(serAll(snap.data()), null, 2));

  // subcolecciones del cliente (sellos, historial, packs...)
  const subs = await snap.ref.listCollections();
  for (const sc of subs) {
    const s = await sc.get();
    console.log(`  · sub ${sc.id}: ${s.size} docs`);
    s.forEach(d => console.log('     ', d.id, JSON.stringify(serAll(d.data()))));
  }

  // ── C. ¿Existe el mismo email/tel en otras colecciones del tenant? ──
  console.log('\n══ C. Colecciones del tenant ══');
  const cols = await db.doc(`tenants/${T}`).listCollections();
  console.log('  ', cols.map(c => c.id).join(', '));

  // ── D. Logs colaterales en ventana 2026-08-01 → hoy ──
  console.log('\n══ D. Logs colaterales ══');
  const desde = admin.firestore.Timestamp.fromMillis(Date.parse('2026-08-01T00:00:00Z'));
  const candidatas = ['mail', 'mails', 'notificaciones', 'notificacionesLog', 'notif_log',
    'errores', 'logs', 'waLogs', 'wa_log', 'aiUsage', 'ai_usage', 'chats',
    'eventos', 'auditoria', 'bookingAttempts', 'rateLimit'];
  const existentes = new Set(cols.map(c => c.id));
  for (const c of candidatas) {
    if (!existentes.has(c)) continue;
    try {
      const s = await db.collection(`tenants/${T}/${c}`).limit(400).get();
      const hits = [];
      s.forEach(d => {
        const raw = JSON.stringify(d.data()).toLowerCase();
        if (raw.includes('trefghut') || raw.includes('88555885886') || raw.includes('mhhh')) {
          hits.push([d.id, d.data()]);
        }
      });
      console.log(`  ${c}: ${s.size} docs revisados, ${hits.length} con rastro`);
      hits.forEach(([id, d]) => console.log('    !', id, JSON.stringify(serAll(d)).slice(0, 900)));
    } catch (e) { console.log(`  ${c}: error ${e.message}`); }
  }

  // ── E. Colección raíz `mail` (outbox de mailer) ──
  console.log('\n══ E. Outbox de correo (raíz) ══');
  for (const c of ['mail', 'mails', 'emails']) {
    try {
      const s = await db.collection(c).where('to', '==', EMAIL).limit(20).get();
      console.log(`  ${c}: ${s.size}`);
      s.forEach(d => console.log('    ', d.id, JSON.stringify(serAll(d.data())).slice(0, 600)));
    } catch (e) { /* colección no existe */ }
  }

  // ── F. ¿Otros users del tenant con pinta de basura? ──
  console.log('\n══ F. Users del tenant con pinta de spam/prueba ══');
  const us = await db.collection(`tenants/${T}/users`).get();
  console.log(`  ${us.size} users totales`);
  const basura = [];
  us.forEach(d => {
    const v = d.data();
    const mail = String(v.email || '').toLowerCase();
    const tel  = String(v.telefono || '').replace(/\D/g, '');
    const nom  = String(v.nombre || '').trim();
    const malMail = mail && !/\.(com|cl|net|org|es|io|co|mx|ar|pe)$/.test(mail);
    const malTel  = tel && !(tel.startsWith('569') || tel.startsWith('56') || tel.length === 9);
    const malNom  = nom.length <= 4 || /^(hola|test|prueba|asd|qwe|aaa|xxx)/i.test(nom);
    if (malMail || malTel || malNom) {
      basura.push({ id: d.id, nombre: v.nombre, email: v.email, telefono: v.telefono,
        creado: ser(v.createdAt || v.creadoEn || v.fechaRegistro),
        flags: [malMail && 'email-invalido', malTel && 'tel-invalido', malNom && 'nombre-sospechoso'].filter(Boolean) });
    }
  });
  basura.sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
  basura.forEach(b => console.log('   ', JSON.stringify(b)));
  console.log(`  → ${basura.length} sospechosos de ${us.size}`);

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
