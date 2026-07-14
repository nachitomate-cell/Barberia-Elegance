/**
 * Push de prueba SOLO a Jhoseth Morales (tenant elbarberomoderno).
 * Uso: node scripts/push-prueba-jhoseth.js
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SA = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8'))),
  projectId: 'barberia-elegance',
});

const db = admin.firestore();
const TENANT = 'elbarberomoderno';
const UID_JHOSETH = 'hUhn679sJohmz1iLfgClQAbvxqi2';

async function run() {
  const snap = await db.collection(`tenants/${TENANT}/fcm_tokens`)
    .where('activo', '==', true)
    .where('uid', '==', UID_JHOSETH)
    .get();

  const tokens = [...new Set(
    snap.docs.map(d => d.data())
      .filter(t => t.plataforma !== 'web-cliente')
      .map(t => t.token)
      .filter(Boolean)
  )];

  console.log(`Tokens activos de Jhoseth: ${tokens.length}`);
  if (!tokens.length) { console.log('Sin tokens. Abortando.'); process.exit(1); }

  const tag = 'prueba-' + Date.now();
  const title = 'Prueba de notificaciones';
  const body = 'Todo en orden: así te llegarán las nuevas reservas. Puedes ignorar este mensaje.';

  const res = await admin.messaging().sendEachForMulticast({
    notification: { title, body },
    data: { url: '/gestion-interna/agenda', tag },
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        title, body,
        icon:  '/gestion-interna/pwa-192.png',
        badge: '/gestion-interna/pwa-192.png',
        vibrate: [200, 100, 200],
        tag,
      },
      fcmOptions: { link: '/gestion-interna/agenda' },
    },
    tokens,
  });

  console.log(`Resultado: ${res.successCount} OK, ${res.failureCount} errores`);
  res.responses.forEach((r, i) => {
    if (!r.success) console.log(`- Token ${i}: ${r.error?.code || r.error}`);
  });
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
