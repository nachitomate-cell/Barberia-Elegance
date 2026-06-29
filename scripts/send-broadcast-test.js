#!/usr/bin/env node
'use strict';

/* send-broadcast-test.js — Lanza una campaña real de prueba.
   Usa el service-account del proyecto (admin SDK) y replica la
   lógica de functions/broadcast-anuncio.js para que el resultado
   quede registrado en /broadcast_campaigns igual que si lo hubiera
   enviado un superadmin desde /admin. */

const admin = require('firebase-admin');
const sa    = require('../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db        = admin.firestore();
const messaging = admin.messaging();

const TITLE = '☀️ Modo claro del panel — pase de polish';
const BODY  = 'Probamos el modo claro de punta a punta: tarjetas blancas con bordes definidos, sidebar más legible con el módulo activo marcado, colores sólidos en los estados de citas (verde, rojo, azul, ámbar) y switch entre modos instantáneo. Activálo con el botón ☀️/🌙 del sidebar.';
const LINK  = '/gestion-interna/inicio';
const AUDIENCE = 'all'; // admin + agenda, NO clientes

function isAudienceMatch(plataforma, audience) {
  if (plataforma === 'web-cliente') return false;
  if (audience === 'admin')  return plataforma === 'web-admin';
  if (audience === 'agenda') return plataforma !== 'web-admin';
  return true;
}

(async () => {
  const campaignRef = db.collection('broadcast_campaigns').doc();
  await campaignRef.set({
    title: TITLE, body: BODY, link: LINK, audience: AUDIENCE,
    createdBy: 'ignaciiio.mate@gmail.com (script test)',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    totals:    { tokens: 0, enviados: 0, fallidos: 0 },
    status:    'running',
  });
  console.log(`[Broadcast] campaign ${campaignRef.id} creada — leyendo tokens…`);

  const snap = await db.collectionGroup('fcm_tokens').where('activo', '==', true).get();
  const candidates = snap.docs
    .map(d => ({ id: d.id, ref: d.ref, data: d.data() }))
    .filter(({ data }) => !!data.token && isAudienceMatch(data.plataforma, AUDIENCE));

  await campaignRef.update({ 'totals.tokens': candidates.length });
  console.log(`[Broadcast] ${candidates.length} tokens elegibles (admin + agenda, sin clientes).`);

  if (!candidates.length) {
    await campaignRef.update({ status: 'done', finishedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log('[Broadcast] nada que enviar.');
    return;
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
          tokenId: id, uid: data.uid || data.userId || null, tenantId,
          plataforma: data.plataforma || null,
          status: 'sent', sentAt: admin.firestore.FieldValue.serverTimestamp(),
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
          tokenId: id, uid: data.uid || data.userId || null, tenantId,
          plataforma: data.plataforma || null,
          status: 'failed', error: code || String(err.message || '').slice(0, 200),
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
    }));
  }

  for (let i = 0; i < invalidos.length; i += 400) {
    const batch = db.batch();
    invalidos.slice(i, i + 400).forEach(r => batch.update(r, { activo: false }));
    await batch.commit().catch(() => {});
  }

  await campaignRef.update({
    'totals.enviados': enviados,
    'totals.fallidos': fallidos,
    status: 'done',
    finishedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`\n[Broadcast] ✓ ${enviados}/${candidates.length} enviados | ${fallidos} fallidos | ${invalidos.length} tokens muertos desactivados`);
  console.log(`[Broadcast] campaignId = ${campaignRef.id}\n`);

  // Reporte detallado: a quiénes les llegó (uid + tenant + plataforma)
  const recSnap = await recipientsCol.get();
  const rows = recSnap.docs.map(d => d.data());
  const sent   = rows.filter(r => r.status === 'sent');
  const failed = rows.filter(r => r.status === 'failed');

  console.log('─── ENVIADOS ──────────────────────────────────────');
  for (const r of sent) {
    const plat = r.plataforma || '(agenda/legacy)';
    console.log(`  ✓ ${r.tenantId.padEnd(20)} uid=${(r.uid || '—').slice(0, 28).padEnd(28)} [${plat}]`);
  }
  if (failed.length) {
    console.log('\n─── FALLIDOS ──────────────────────────────────────');
    for (const r of failed) {
      console.log(`  ✗ ${r.tenantId.padEnd(20)} uid=${(r.uid || '—').slice(0, 28).padEnd(28)} ${r.error || ''}`);
    }
  }

  // Resumen por tenant + plataforma
  const byTenant = {};
  for (const r of sent) {
    if (!byTenant[r.tenantId]) byTenant[r.tenantId] = { admin: 0, agenda: 0 };
    if (r.plataforma === 'web-admin') byTenant[r.tenantId].admin++;
    else byTenant[r.tenantId].agenda++;
  }
  console.log('\n─── RESUMEN POR TENANT ────────────────────────────');
  for (const [tid, x] of Object.entries(byTenant).sort()) {
    console.log(`  ${tid.padEnd(20)} → ${x.admin} admin · ${x.agenda} agenda/barbero`);
  }

  // UIDs únicos
  const uids = new Set(sent.map(r => r.uid).filter(Boolean));
  console.log(`\n  Total tokens enviados: ${enviados}`);
  console.log(`  UIDs únicos alcanzados: ${uids.size}`);
})().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
