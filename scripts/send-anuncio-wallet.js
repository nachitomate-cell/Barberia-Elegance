'use strict';

// scripts/send-anuncio-wallet.js
// ─────────────────────────────────────────────────────────────────
// Broadcast de marketing del MÓDULO WALLET a todos los paneles
// (gestion-interna + agenda.html). Replica broadcastAnuncio con
// firebase-admin, sin depender de la sesión del navegador.
//
// Audiencia 'all' = admin (web-admin) + agenda (resto no-cliente).
// El click lleva a /gestion-interna/wallets → pantalla de venta.
// Copy externo: español neutro "tú", sin chilenismos.
// ─────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });

const db        = admin.firestore();
const messaging = admin.messaging();

const TITLE      = '📍 Nuevo: Wallet con geo-push';
const BODY       = 'Tus clientes llevan sus sellos en Google Wallet y su tarjeta aparece sola cuando pasan cerca de tu local. Toca para activarlo.';
const LINK       = '/gestion-interna/wallets';
const AUDIENCE   = 'all';
const CREATED_BY = 'ignaciiio.mate@gmail.com (script wallet)';

function isAudienceMatch(plataforma, audience) {
  if (plataforma === 'web-cliente') return false;
  if (audience === 'admin')  return plataforma === 'web-admin';
  if (audience === 'agenda') return plataforma !== 'web-admin';
  return true;
}

(async () => {
  console.log(`[send-anuncio-wallet] audience=${AUDIENCE}  title="${TITLE}"`);

  const campaignRef = db.collection('broadcast_campaigns').doc();
  await campaignRef.set({
    title:     TITLE,
    body:      BODY,
    link:      LINK,
    audience:  AUDIENCE,
    createdBy: CREATED_BY,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    totals:    { tokens: 0, enviados: 0, fallidos: 0 },
    status:    'running',
  });
  console.log(`[send-anuncio-wallet] campaign creada: ${campaignRef.id}`);

  const snap = await db.collectionGroup('fcm_tokens').where('activo', '==', true).get();
  const candidates = snap.docs
    .map(d => ({ id: d.id, ref: d.ref, data: d.data() }))
    .filter(({ data }) => !!data.token && isAudienceMatch(data.plataforma, AUDIENCE));

  console.log(`[send-anuncio-wallet] tokens candidatos: ${candidates.length} (de ${snap.size} activos)`);
  await campaignRef.update({ 'totals.tokens': candidates.length });

  if (!candidates.length) {
    await campaignRef.update({
      status:     'done',
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('[send-anuncio-wallet] no hay destinatarios. Fin.');
    process.exit(0);
  }

  const recipientsCol = campaignRef.collection('recipients');
  const invalidos = [];
  let enviados = 0, fallidos = 0;

  for (let i = 0; i < candidates.length; i += 50) {
    const chunk = candidates.slice(i, i + 50);
    await Promise.all(chunk.map(async ({ id, ref, data }) => {
      const tenantId = data.tenantId
        || (ref.path.startsWith('tenants/') ? ref.path.split('/')[1] : 'elegance');
      try {
        await messaging.send({
          token: data.token,
          notification: { title: TITLE, body: BODY },
          data: { tipo: 'broadcast_anuncio', campaignId: campaignRef.id, url: LINK },
          webpush: {
            headers: { Urgency: 'high' },
            notification: {
              icon:     '/icons/icon-192.png',
              badge:    '/icons/icon-192.png',
              tag:      'anuncio-' + campaignRef.id,
              renotify: true,
              vibrate:  [200, 100, 200],
            },
            fcmOptions: { link: LINK },
          },
        });
        enviados++;
        await recipientsCol.add({
          tokenId:    id,
          uid:        data.uid || data.userId || null,
          tenantId,
          plataforma: data.plataforma || null,
          status:     'sent',
          sentAt:     admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      } catch (err) {
        fallidos++;
        const code = err.errorInfo?.code || err.code || '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) {
          invalidos.push(ref);
        }
        await recipientsCol.add({
          tokenId:    id,
          uid:        data.uid || data.userId || null,
          tenantId,
          plataforma: data.plataforma || null,
          status:     'failed',
          error:      code || String(err.message || '').slice(0, 200),
          sentAt:     admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
    }));
    process.stdout.write(`  · progreso: ${Math.min(i + 50, candidates.length)}/${candidates.length}\r`);
  }
  console.log('');

  for (let i = 0; i < invalidos.length; i += 400) {
    const batch = db.batch();
    invalidos.slice(i, i + 400).forEach(r => batch.update(r, { activo: false }));
    await batch.commit().catch(() => {});
  }

  await campaignRef.update({
    'totals.enviados': enviados,
    'totals.fallidos': fallidos,
    status:     'done',
    finishedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[send-anuncio-wallet] enviados=${enviados}  fallidos=${fallidos}  desactivados=${invalidos.length}`);
  console.log(`[send-anuncio-wallet] campaign: ${campaignRef.id}`);
  process.exit(0);
})().catch(err => {
  console.error('[send-anuncio-wallet] error fatal:', err);
  process.exit(1);
});
