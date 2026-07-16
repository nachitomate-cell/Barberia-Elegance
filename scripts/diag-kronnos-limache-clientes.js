'use strict';

// Diagnóstico: por qué kronnos.studio.spa@gmail.com no ve clientes en gestion-interna.

const path = require('path');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(__dirname, '..', 'service-account.json'))),
});
const db = admin.firestore();
const auth = admin.auth();

(async () => {
  const email = 'kronnos.studio.spa@gmail.com';
  const user = await auth.getUserByEmail(email);
  console.log('── Cuenta ──');
  console.log('uid:', user.uid);
  console.log('claims:', JSON.stringify(user.customClaims || {}));
  console.log('último login:', user.metadata.lastSignInTime);
  console.log('último refresh token:', user.metadata.lastRefreshTime);

  console.log('\n── Docs barberos ──');
  for (const t of ['kronnos', 'kronnos_limache', 'kronnos_penablanca', 'kronnos_woman']) {
    const snap = await db.doc(`tenants/${t}/barberos/${user.uid}`).get();
    console.log(`tenants/${t}/barberos/${user.uid}:`, snap.exists ? JSON.stringify(snap.data()) : 'NO EXISTE');
  }

  console.log('\n── Poblacion colecciones ──');
  for (const t of ['kronnos', 'kronnos_limache']) {
    for (const c of ['users', 'clientes']) {
      const agg = await db.collection(`tenants/${t}/${c}`).count().get();
      console.log(`tenants/${t}/${c}: ${agg.data().count} docs`);
    }
  }

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
