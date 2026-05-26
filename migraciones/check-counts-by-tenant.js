/**
 * check-counts-by-tenant.js
 *
 * Diagnostica el conteo real de clientes por tenant en Firestore.
 * Sirve para verificar si dos tenants reportan el mismo numero por
 * coincidencia o por algun bug de data isolation.
 *
 * Uso:
 *   node migraciones/check-counts-by-tenant.js
 *
 * Sin --commit ni flags: es de solo lectura, seguro.
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const TENANTS = ['aura', 'chameleon', 'elegance', 'ferraza', 'gitana', 'mapubarbershop', 'marcelo_hairdressing'];

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'service-account.json');
let credential;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')));
} else {
  credential = admin.credential.applicationDefault();
}
admin.initializeApp({ credential, projectId: 'barberia-elegance' });
const db = admin.firestore();

async function main() {
  console.log('Contando docs por tenant...\n');
  console.log('TENANT'.padEnd(28), 'CLIENTES'.padStart(10), 'USERS'.padStart(10), 'CITAS'.padStart(10));
  console.log('─'.repeat(60));

  for (const tid of TENANTS) {
    const isElegance = tid === 'elegance';
    const clientesPath = isElegance ? 'clientes' : `tenants/${tid}/clientes`;
    const usersPath    = isElegance ? 'users'    : `tenants/${tid}/users`;
    const citasPath    = isElegance ? 'citas'    : `tenants/${tid}/citas`;

    const [cSnap, uSnap, ciSnap] = await Promise.all([
      db.collection(clientesPath).count().get().catch(() => ({ data: () => ({ count: '?' }) })),
      db.collection(usersPath).count().get().catch(() => ({ data: () => ({ count: '?' }) })),
      db.collection(citasPath).count().get().catch(() => ({ data: () => ({ count: '?' }) })),
    ]);
    console.log(
      tid.padEnd(28),
      String(cSnap.data().count).padStart(10),
      String(uSnap.data().count).padStart(10),
      String(ciSnap.data().count).padStart(10),
    );
  }

  console.log('\n--- Sample de nombres para verificar si son distintos ---\n');
  for (const tid of ['aura', 'chameleon']) {
    const isElegance = tid === 'elegance';
    const usersPath  = isElegance ? 'users' : `tenants/${tid}/users`;
    const snap = await db.collection(usersPath).limit(5).get();
    console.log(`[${tid}] primeros 5 nombres en users/:`);
    snap.docs.forEach(d => {
      const data = d.data();
      console.log(`  - ${d.id.padEnd(20)} → ${data.nombre || '(sin nombre)'} · ${data.email || ''}`);
    });
    console.log('');
  }

  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
