'use strict';

// scripts/send-anuncio-reels.js
// ─────────────────────────────────────────────────────────────────
// Anuncio único a TODO el staff (gestion-interna + agenda.html):
// "Ya puedes sincronizar reels y publicaciones de Instagram".
//
// Basado en send-anuncio-agenda.js. La diferencia es la audiencia
// 'staff': incluye web-admin (gestion-interna) Y todo lo demás que
// no sea web-cliente (agenda.html y otros paneles internos).
// ─────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });

const db        = admin.firestore();
const messaging = admin.messaging();

const TITLE      = 'Nuevo: sincroniza tus reels de Instagram';
const BODY       = 'Conecta tu cuenta y tus últimos 30 posts (fotos, álbumes y reels) entran solos al Lookbook.';
const LINK       = '/gestion-interna/instagram';
const AUDIENCE   = 'staff'; // gestion-interna + agenda.html (todo excepto web-cliente)
const CREATED_BY = 'ignaciiio.mate@gmail.com (script anuncio reels)';

// 'staff' incluye a todos los tokens del equipo (admin, jefes, barberos)
// en gestion-interna Y agenda.html; excluye clientes finales.
function isAudienceMatch(plataforma, audience) {
  if (plataforma === 'web-cliente') return false;
  if (audience === 'admin')  return plataforma === 'web-admin';
  if (audience === 'agenda') return plataforma !== 'web-admin';
  if (audience === 'staff')  return true; // web-admin + web-agenda
  return true;
}

(async () => {
  console.log(`[send-anuncio-reels] audience=${AUDIENCE}  title="${TITLE}"`);

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
  console.log(`[send-anuncio-reels] campaign creada: ${campaignRef.id}`);

  const snap = await db.collectionGroup('fcm_tokens').where('activo', '==', true).get();
  const candidates = snap.docs
    .map(d => ({ id: d.id, ref: d.ref, data: d.data() }))
    .filter(({ data }) => !!data.token && isAudienceMatch(data.plataforma, AUDIENCE));

  const porPlataforma = candidates.reduce((acc, { data }) => {
    const p = data.plataforma || '(sin plataforma)';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  console.log(`[send-anuncio-reels] tokens candidatos: ${candidates.length} (de ${snap.size} activos)`);
  console.log(`[send-anuncio-reels] breakdown por plataforma:`, porPlataforma);
  await campaignRef.update({ 'totals.tokens': candidates.length });

  if (!candidates.length) {
    await campaignRef.update({
      status:     'done',
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('[send-anuncio-reels] no hay destinatarios. Fin.');
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

  console.log(`[send-anuncio-reels] enviados=${enviados}  fallidos=${fallidos}  desactivados=${invalidos.length}`);
  console.log(`[send-anuncio-reels] campaign: ${campaignRef.id}`);
  process.exit(0);
})().catch(err => {
  console.error('[send-anuncio-reels] error fatal:', err);
  process.exit(1);
});
