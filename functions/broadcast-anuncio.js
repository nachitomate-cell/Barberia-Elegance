'use strict';

// functions/broadcast-anuncio.js
// ─────────────────────────────────────────────────────────────────
//  BROADCAST DE ANUNCIO (callable, solo superadmin)
//
//  Manda una notificación push a TODOS los admins y barberos del
//  panel (gestion-interna + agenda.html). No incluye clientes del
//  Club. Crea un registro central de la campaña con un sub-doc por
//  cada destinatario para auditar a quién le llegó y a quién no.
//
//  Firestore:
//    broadcast_campaigns/{id}                 — metadata + totales
//    broadcast_campaigns/{id}/recipients/{x}  — un doc por token
//
//  Deploy:
//    firebase deploy --only functions:broadcastAnuncio
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com'];

/** Decide si un token de fcm_tokens cae dentro de la audiencia pedida.
 *  - 'web-cliente' NUNCA entra (este broadcast es interno).
 *  - 'admin'  → solo plataforma === 'web-admin' (gestion-interna).
 *  - 'agenda' → resto NO-cliente (agenda.html y legados sin plataforma).
 *  - 'all'    → admin + agenda (todo lo que no es cliente).
 */
function isAudienceMatch(plataforma, audience) {
  if (plataforma === 'web-cliente') return false;
  if (audience === 'admin')  return plataforma === 'web-admin';
  if (audience === 'agenda') return plataforma !== 'web-admin';
  return true;
}

exports.broadcastAnuncio = onCall(
  { region: 'us-central1', timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    const email = (request.auth?.token?.email || '').toLowerCase();
    if (!BOOTSTRAP_ADMINS.includes(email)) {
      throw new HttpsError('permission-denied', 'No autorizado.');
    }

    const db        = admin.firestore();
    const messaging = admin.messaging();

    const title    = String(request.data?.title || '').trim();
    const body     = String(request.data?.body  || '').trim();
    const link     = String(request.data?.link  || '/gestion-interna/').trim() || '/gestion-interna/';
    const audience = String(request.data?.audience || 'all').trim();

    if (!title || !body) throw new HttpsError('invalid-argument', 'title y body son requeridos.');
    if (!['all', 'admin', 'agenda'].includes(audience)) {
      throw new HttpsError('invalid-argument', 'audience inválido (admin|agenda|all).');
    }

    // 1) Crear doc central de la campaña (estado "running").
    const campaignRef = db.collection('broadcast_campaigns').doc();
    await campaignRef.set({
      title, body, link, audience,
      createdBy: email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      totals:    { tokens: 0, enviados: 0, fallidos: 0 },
      status:    'running',
    });

    // 2) Reunir tokens vía collectionGroup. Filtramos plataforma en código
    //    porque los tokens viejos de agenda.html no tienen ese campo.
    let candidates = [];
    try {
      const snap = await db.collectionGroup('fcm_tokens').where('activo', '==', true).get();
      candidates = snap.docs
        .map(d => ({ id: d.id, ref: d.ref, data: d.data() }))
        .filter(({ data }) => !!data.token && isAudienceMatch(data.plataforma, audience));
    } catch (e) {
      logger.error('[Broadcast] error leyendo tokens:', e);
      await campaignRef.update({ status: 'failed', error: e.message }).catch(() => {});
      throw new HttpsError('internal', 'Error leyendo tokens: ' + e.message);
    }

    await campaignRef.update({ 'totals.tokens': candidates.length });

    if (!candidates.length) {
      await campaignRef.update({
        status: 'done',
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, campaignId: campaignRef.id, totals: { tokens: 0, enviados: 0, fallidos: 0 } };
    }

    // 3) Enviar en tandas de 50 (FCM admite 500 pero somos conservadores).
    const recipientsCol = campaignRef.collection('recipients');
    const invalidos = []; // refs a desactivar luego
    let enviados = 0, fallidos = 0;

    for (let i = 0; i < candidates.length; i += 50) {
      const chunk = candidates.slice(i, i + 50);
      await Promise.all(chunk.map(async ({ id, ref, data }) => {
        const tenantId = data.tenantId
          || (ref.path.startsWith('tenants/') ? ref.path.split('/')[1] : 'elegance');
        try {
          await messaging.send({
            token: data.token,
            notification: { title, body },
            // 'url' es el campo que leen ambos service workers (root /sw.js
            // y /gestion-interna/firebase-messaging-sw.js) al manejar el clic.
            data: { tipo: 'broadcast_anuncio', campaignId: campaignRef.id, url: link },
            webpush: {
              headers: { Urgency: 'high' },
              notification: {
                icon:     '/icons/icon-192.png',
                badge:    '/icons/icon-192.png',
                tag:      'anuncio-' + campaignRef.id,
                renotify: true,
                vibrate:  [200, 100, 200],
              },
              fcmOptions: { link },
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
          if (code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/invalid-argument') {
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
    }

    // 4) Desactivar tokens muertos (en bloques de 400 ops por batch).
    for (let i = 0; i < invalidos.length; i += 400) {
      const batch = db.batch();
      invalidos.slice(i, i + 400).forEach(r => batch.update(r, { activo: false }));
      await batch.commit().catch(() => {});
    }

    // 5) Cerrar la campaña con totales finales.
    await campaignRef.update({
      'totals.enviados': enviados,
      'totals.fallidos': fallidos,
      status:     'done',
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(
      `[Broadcast] ${campaignRef.id}: ${enviados}/${candidates.length}, desactivados ${invalidos.length}`
    );
    return {
      ok: true,
      campaignId: campaignRef.id,
      totals: { tokens: candidates.length, enviados, fallidos },
    };
  }
);
