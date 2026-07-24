/**
 * auditar-logins.js
 *
 * Barrido de sanidad post-limpieza de barberos:
 *
 *   Enumera todos los users de Firebase Auth y, para cada uno,
 *   determina qué rol y en qué tenant(s) recibiría al hacer login
 *   según la lógica de AuthContext.jsx:
 *
 *     1) Superadmin (SUPERADMIN_EMAIL)                  → admin en TODO
 *     2) Brand admin (BRAND_ADMINS del código)          → admin en sus tenants
 *     3) Doc `barberos/{uid}` presente en algún tenant  → rol del doc
 *          - Si es link-doc (_mainDocId), rol del main
 *     4) Fallback custom claims { role, tenantId }      → si role in {admin,barbero}
 *     5) Sino                                            → 'barbero' silencioso
 *
 * Reporta:
 *   - Users sin doc en ningún tenant y sin claims válidos (login degradado).
 *   - Users cuyo doc principal está archivado (login funciona pero degradado).
 *   - Users cuyo link-doc apunta a un main que no existe o está archivado.
 *   - Estadística general por tenant.
 *
 * NO escribe nada — puro reporte.
 *
 * Uso:
 *   node migraciones/auditar-logins.js
 *   node migraciones/auditar-logins.js --verbose        # detalla todos los users
 */

'use strict';

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const VERBOSE = process.argv.includes('--verbose');

const SA_PATH = path.join(__dirname, '..', 'service-account.json');
let credential;
if (fs.existsSync(SA_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SA_PATH, 'utf8')));
} else {
  credential = admin.credential.applicationDefault();
}
admin.initializeApp({ credential, projectId: 'barberia-elegance' });
const db   = admin.firestore();
const auth = admin.auth();

// Espejo de AuthContext.jsx — mantener sincronizado
const SUPERADMIN_EMAIL = 'ignaciiio.mate@gmail.com';
const BRAND_ADMINS = {
  'administracionkronnos@gmail.com': ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
  'claudio.burgos91@gmail.com':      ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
  'grupo.kratos.spa@gmail.com':      ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
};

async function listarUsers() {
  const users = [];
  let pageToken;
  do {
    const res = await auth.listUsers(1000, pageToken);
    users.push(...res.users);
    pageToken = res.pageToken;
  } while (pageToken);
  return users;
}

async function main() {
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  AUDIT LOGINS post-dedupe`);
  console.log(`${'═'.repeat(72)}\n`);

  const [users, tenantRefs] = await Promise.all([
    listarUsers(),
    db.collection('tenants').listDocuments(),
  ]);
  const tenantIds = tenantRefs.map(r => r.id).sort();
  console.log(`  Users Firebase Auth : ${users.length}`);
  console.log(`  Tenants a chequear  : ${tenantIds.length}\n`);

  // Prefetch: para cada tenant, cargar TODOS los docs de barberos en memoria
  // (una sola pasada, más rápido que un getDoc por user × tenant).
  //   Estructura: tenantIdx[tid] = Map<docId, docData>
  const tenantIdx = {};
  for (const tid of tenantIds) {
    const snap = await db.collection(`tenants/${tid}/barberos`).get();
    const m = new Map();
    snap.docs.forEach(d => m.set(d.id, d.data()));
    tenantIdx[tid] = m;
  }

  // Análisis por user
  const problemas = {
    huerfanos:        [],  // sin doc en ningún tenant + sin claims válidos
    linkDocMainRoto:  [],  // link-doc → main no existe
    linkDocMainArch:  [],  // link-doc → main archivado
    docPrincArchivado:[],  // doc directo archivado
    docPrincInactivo: [],  // doc directo activo: false (sin _archived)
  };
  const okCount = { superadmin: 0, brandAdmin: 0, docDirecto: 0, linkDoc: 0, claimsFallback: 0, sinMatch: 0 };

  for (const u of users) {
    const email = (u.email || '').toLowerCase();
    const uid   = u.uid;

    if (email === SUPERADMIN_EMAIL) { okCount.superadmin++; continue; }
    if (BRAND_ADMINS[email])         { okCount.brandAdmin++; continue; }

    // Buscar doc por UID en cualquier tenant
    const matches = [];
    for (const tid of tenantIds) {
      const doc = tenantIdx[tid].get(uid);
      if (doc) matches.push({ tid, data: doc });
    }

    if (matches.length === 0) {
      // Chequear claims para saber si al menos hay fallback
      const claims = u.customClaims || {};
      const claimTid  = claims.tenantId;
      const claimRole = claims.role;
      if (claimTid && (claimRole === 'admin' || claimRole === 'barbero')) {
        okCount.claimsFallback++;
        if (VERBOSE) {
          console.log(`  ✓ ${email || uid} → sin doc, resuelve por claims: ${claimRole}@${claimTid}`);
        }
      } else {
        okCount.sinMatch++;
        problemas.huerfanos.push({ uid, email, claims });
      }
      continue;
    }

    // Analizar cada match
    for (const m of matches) {
      const d = m.data;
      if (d._mainDocId) {
        const mainDoc = tenantIdx[m.tid].get(d._mainDocId);
        if (!mainDoc) {
          problemas.linkDocMainRoto.push({ uid, email, tenant: m.tid, mainId: d._mainDocId });
        } else if (mainDoc._archived === true) {
          problemas.linkDocMainArch.push({ uid, email, tenant: m.tid, mainId: d._mainDocId, mainNombre: mainDoc.nombre });
        } else {
          okCount.linkDoc++;
        }
      } else if (d._archived === true) {
        problemas.docPrincArchivado.push({ uid, email, tenant: m.tid, docId: uid, nombre: d.nombre, rol: d.rol });
      } else if (d.activo === false) {
        problemas.docPrincInactivo.push({ uid, email, tenant: m.tid, docId: uid, nombre: d.nombre, rol: d.rol });
      } else {
        okCount.docDirecto++;
      }
    }
  }

  console.log(`${'─'.repeat(72)}`);
  console.log(`  RESULTADOS`);
  console.log(`${'─'.repeat(72)}`);
  console.log(`  ✓ Superadmin resuelto            : ${okCount.superadmin}`);
  console.log(`  ✓ Brand admin resuelto           : ${okCount.brandAdmin}`);
  console.log(`  ✓ Doc directo activo             : ${okCount.docDirecto}`);
  console.log(`  ✓ Link-doc → main activo         : ${okCount.linkDoc}`);
  console.log(`  ✓ Fallback claims válidos        : ${okCount.claimsFallback}`);
  console.log(`  · Sin match (degrada a barbero)  : ${okCount.sinMatch}`);
  console.log('');
  console.log(`  ⚠ Doc principal archivado        : ${problemas.docPrincArchivado.length}`);
  console.log(`  ⚠ Doc principal inactivo         : ${problemas.docPrincInactivo.length}`);
  console.log(`  ⚠ Link-doc → main archivado      : ${problemas.linkDocMainArch.length}`);
  console.log(`  ⚠ Link-doc → main INEXISTENTE    : ${problemas.linkDocMainRoto.length}`);
  console.log(`  ⚠ Huérfanos (login degradado)    : ${problemas.huerfanos.length}`);

  const flag = (arr, titulo, fmt) => {
    if (!arr.length) return;
    console.log(`\n  ── ${titulo} ──`);
    arr.forEach(x => console.log('    ' + fmt(x)));
  };

  flag(problemas.docPrincArchivado, 'Docs principales archivados (login funciona pero UI degrada)',
    x => `${x.email || x.uid}  →  tenants/${x.tenant}/barberos/${x.docId}  ·  "${x.nombre}"  ·  rol:${x.rol}`);
  flag(problemas.docPrincInactivo, 'Docs principales activo:false (sin _archived)',
    x => `${x.email || x.uid}  →  tenants/${x.tenant}/barberos/${x.docId}  ·  "${x.nombre}"  ·  rol:${x.rol}`);
  flag(problemas.linkDocMainArch, 'Link-docs cuyo main ESTÁ archivado (SSO roto)',
    x => `${x.email || x.uid}  →  tenants/${x.tenant}  ·  main archivado: "${x.mainNombre}"`);
  flag(problemas.linkDocMainRoto, 'Link-docs cuyo main NO existe (SSO huérfano)',
    x => `${x.email || x.uid}  →  tenants/${x.tenant}  ·  mainId inexistente: ${x.mainId}`);
  flag(problemas.huerfanos, 'Users Auth sin doc ni claims válidos (degradan a "barbero" al loguear)',
    x => `${x.email || x.uid}  ·  claims: ${JSON.stringify(x.claims || {})}`);

  const totalProbs =
    problemas.docPrincArchivado.length +
    problemas.docPrincInactivo.length +
    problemas.linkDocMainArch.length +
    problemas.linkDocMainRoto.length;

  console.log(`\n${'═'.repeat(72)}`);
  if (totalProbs === 0) {
    console.log(`  ✅ Ningún login se rompió por el dedupe.`);
  } else {
    console.log(`  ⚠️  ${totalProbs} caso(s) con impacto potencial — revisar arriba.`);
  }
  if (problemas.huerfanos.length > 0) {
    console.log(`  ℹ️  ${problemas.huerfanos.length} user(s) huérfano(s) — NO relacionado al dedupe,`);
    console.log(`     son cuentas viejas sin doc. Loguean como "barbero" silencioso.`);
  }
  console.log(`${'═'.repeat(72)}\n`);
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
