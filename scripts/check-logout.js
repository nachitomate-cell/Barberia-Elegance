#!/usr/bin/env node
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve('C:/Users/56983/OneDrive/Desktop/Barberia-Elegance/service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  // 1) VersionManager: cuándo se subió por última vez el timestamp global
  console.log('─'.repeat(60));
  console.log('1) VersionManager · _system/global_config');
  console.log('─'.repeat(60));
  const cfg = await db.doc('_system/global_config').get();
  if (cfg.exists) {
    const d = cfg.data();
    console.log('   forceRefreshTimestamp:', d.forceRefreshTimestamp);
    if (d.forceRefreshTimestamp) {
      console.log('   → equivale a:', new Date(d.forceRefreshTimestamp).toISOString().slice(0, 19).replace('T', ' '));
    }
    console.log('   updateTime del doc:  ', cfg.updateTime?.toDate?.().toISOString?.().slice(0, 19).replace('T', ' '));
  } else {
    console.log('   (no existe → no hay reloads forzados)');
  }

  // 2) Últimos errores registrados por ErrorBoundary (últimas 24h)
  console.log();
  console.log('─'.repeat(60));
  console.log('2) Últimos errores en system_errors (24h)');
  console.log('─'.repeat(60));
  const desde24h = new Date(Date.now() - 24 * 3600 * 1000);
  const errs = await db.collection('system_errors')
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(desde24h))
    .orderBy('timestamp', 'desc')
    .limit(15)
    .get();

  if (errs.empty) {
    console.log('   (sin errores en las últimas 24h)');
  } else {
    errs.docs.forEach((d, i) => {
      const e = d.data();
      const ts = e.timestamp?.toDate?.().toISOString?.().slice(0, 19).replace('T', ' ') || '?';
      const msg = (e.message || '').slice(0, 80);
      const url = (e.url || '').slice(-60);
      console.log(`   [${i + 1}] ${ts} · tenant=${e.tenantId || '?'}`);
      console.log(`       msg: ${msg}`);
      console.log(`       url: ...${url}`);
    });
  }

  // 3) Suspended status del kill switch del tenant
  console.log();
  console.log('─'.repeat(60));
  console.log('3) Kill switch (_system/{tenantId}.status)');
  console.log('─'.repeat(60));
  for (const tid of ['aura', 'elegance', 'kronnos']) {
    const s = await db.doc(`_system/${tid}`).get();
    console.log(`   ${tid.padEnd(15)} → ${s.exists ? (s.data().status || '(sin status)') : '(no existe)'}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
