'use strict';

// scripts/diag-staff-eliminar-practica.js
// E2E de staffEliminarAcceso contra el tenant de práctica:
//   1. Crea un barbero desechable COMPLETO (cuenta Auth + claims de practica
//      + doc principal + doc-espejo) — la anatomía exacta del caso David.
//   2. Llama la callable DESPLEGADA autenticado como el dueño de práctica.
//   3. Verifica: docs borrados, claims en null, tokens revocados.
// Limpia la cuenta desechable al final.

const path = require('path');
const F = path.join(__dirname, '..', 'functions');
const admin = require(require.resolve('firebase-admin', { paths: [F] }));
admin.initializeApp({ credential: admin.credential.cert(require(path.join(__dirname, '..', 'service-account.json'))) });
const db = admin.firestore();

const API_KEY = 'AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q';
const OWNER   = 'practica@synaptechspa.cl';
const PASS    = 'Practica7912';
const TID     = 'practica';
const EMAILF  = 'fantasma.diag@practica.local';

let fallos = 0;
const ok = (n, cond, extra) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${n}${cond ? '' : `  → ${String(extra ?? '')}`}`);
  if (!cond) fallos++;
};

(async () => {
  const col = db.collection(`tenants/${TID}/barberos`);

  // ── 1. Barbero desechable (anatomía del caso David) ──
  let user;
  try { user = await admin.auth().getUserByEmail(EMAILF); }
  catch (_) { user = await admin.auth().createUser({ email: EMAILF, password: 'Fantasma123', displayName: 'Fantasma Diag' }); }
  await admin.auth().setCustomUserClaims(user.uid, { role: 'barbero', tenantId: TID });
  const mainRef = col.doc('fantasma-diag');
  await mainRef.set({ nombre: 'Fantasma Diag', email: EMAILF, rol: 'barbero', activo: true, authUid: user.uid });
  await col.doc(user.uid).set({ _mainDocId: 'fantasma-diag', uid: user.uid, email: EMAILF, nombre: 'Fantasma Diag', rol: 'barbero', activo: true });
  console.log(`\n🧪 Fantasma creado: auth=${user.uid} + doc principal + espejo + claims`);

  // ── 2. Login como dueño de práctica y llamada a la callable real ──
  const login = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: OWNER, password: PASS, returnSecureToken: true }),
  }).then(r => r.json());
  if (!login.idToken) { console.error('❌ login dueño practica falló:', JSON.stringify(login.error || login)); process.exit(1); }

  const resp = await fetch('https://staffeliminaracceso-aveegdwhyq-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.idToken}` },
    body: JSON.stringify({ data: { tenantId: TID, docId: 'fantasma-diag' } }),
  });
  const crudo = await resp.text();
  let res;
  try { res = JSON.parse(crudo); }
  catch (_) { console.error(`❌ callable HTTP ${resp.status} — body: ${crudo.slice(0, 300)}`); process.exit(1); }
  console.log('respuesta callable:', JSON.stringify(res));
  ok('la callable respondió ok', res?.result?.ok === true, JSON.stringify(res));
  ok('borró los 2+ docs (principal + espejo)', (res?.result?.docsBorrados || 0) >= 2, res?.result?.docsBorrados);
  ok('cerró 1 cuenta (claims + tokens)', res?.result?.cuentasCerradas === 1, res?.result?.cuentasCerradas);

  // ── 3. Verificación directa ──
  const [m, e] = await Promise.all([mainRef.get(), col.doc(user.uid).get()]);
  ok('doc principal eliminado', !m.exists);
  ok('doc-espejo eliminado', !e.exists);
  const u2 = await admin.auth().getUser(user.uid);
  ok('claims en null', !u2.customClaims || !Object.keys(u2.customClaims).length, JSON.stringify(u2.customClaims));
  ok('tokens revocados (tokensValidAfterTime reciente)',
    u2.tokensValidAfterTime && (Date.now() - new Date(u2.tokensValidAfterTime).getTime()) < 5 * 60_000,
    u2.tokensValidAfterTime);

  // ── Limpieza ──
  await admin.auth().deleteUser(user.uid).catch(() => {});
  console.log(fallos ? `\n❌ ${fallos} fallo(s)` : '\n✅ Eliminar ahora elimina DE VERDAD: docs, claims y sesiones.');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('❌', e); process.exit(1); });
