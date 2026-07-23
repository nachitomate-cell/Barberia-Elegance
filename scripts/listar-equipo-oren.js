/**
 * listar-equipo-oren.js — Enumera TODO el equipo del tenant oren
 * (barberos, admins, jefes) y muestra el email de Auth de cada uno.
 * Además lista todos los Auth users con claim tenantId:'oren' que NO
 * tengan doc en Firestore (huérfanos → login válido pero sin acceso).
 */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db   = admin.firestore();
const auth = admin.auth();

const TENANT_ID = 'oren';
const barberosCol = () => db.collection('tenants').doc(TENANT_ID).collection('barberos');

async function main() {
  console.log(`\n╔═══ Equipo del tenant ${TENANT_ID} ═══╗\n`);

  // 1) Todos los docs de tenants/oren/barberos
  const snap = await barberosCol().get();
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Deduplica por UID (los docs "principales" y los "espejo por UID" son la
  // misma persona). Preferimos el doc principal (el que NO tiene _mainDocId).
  const byUid = new Map();
  for (const s of all) {
    if (!s.uid) { byUid.set(`doc:${s.id}`, s); continue; }
    const prev = byUid.get(s.uid);
    if (!prev || (prev._mainDocId && !s._mainDocId)) byUid.set(s.uid, s);
  }

  const rows = Array.from(byUid.values()).sort((a, b) => {
    const pri = { admin: 0, jefe: 1, barbero: 2 };
    const ra = pri[String(a.rol || '').toLowerCase()] ?? 9;
    const rb = pri[String(b.rol || '').toLowerCase()] ?? 9;
    if (ra !== rb) return ra - rb;
    return (a.nombre || '').localeCompare(b.nombre || '');
  });

  console.log(`  Personas únicas en Firestore: ${rows.length}\n`);
  const uidsEnDoc = new Set();
  for (const s of rows) {
    if (s.uid) uidsEnDoc.add(s.uid);
    let authEmail = '—', authDisabled = false, claims = {};
    if (s.uid) {
      try {
        const u = await auth.getUser(s.uid);
        authEmail = u.email || '—';
        authDisabled = u.disabled;
        claims = u.customClaims || {};
      } catch (e) { authEmail = `(auth error: ${e.code || e.message})`; }
    }
    const rol = String(s.rol || '—').toUpperCase();
    console.log(`  · [${rol}] ${s.nombre || '(sin nombre)'}`);
    console.log(`      docId          : ${s.id}`);
    console.log(`      sucursalScope  : ${s.sucursalScope || '(sin scope — ve TODAS)'}`);
    console.log(`      activo         : ${s.activo}`);
    console.log(`      uid            : ${s.uid || '—'}`);
    console.log(`      email (doc)    : ${s.email || '—'}`);
    console.log(`      email (Auth)   : ${authEmail}${authDisabled ? '  (DISABLED)' : ''}`);
    console.log(`      Auth claims    : ${JSON.stringify(claims)}`);
    console.log('');
  }

  // 2) Auth users con claim tenantId:'oren' que NO estén en Firestore
  console.log(`\n  🔎 Auth users con tenantId="${TENANT_ID}" sin doc en Firestore:`);
  let huerfanos = 0, page = null;
  do {
    const res = await auth.listUsers(1000, page || undefined);
    for (const u of res.users) {
      const claims = u.customClaims || {};
      if (claims.tenantId !== TENANT_ID) continue;
      if (uidsEnDoc.has(u.uid)) continue;
      huerfanos++;
      console.log(`     · uid=${u.uid}  email=${u.email || '—'}  claims=${JSON.stringify(claims)}${u.disabled ? '  (DISABLED)' : ''}`);
    }
    page = res.pageToken;
  } while (page);
  if (huerfanos === 0) console.log('     (ninguno)\n');
}

main().catch(e => { console.error('\n✗ ERROR:', e); process.exit(1); });
