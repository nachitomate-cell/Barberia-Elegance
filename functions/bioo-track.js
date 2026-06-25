'use strict';

// functions/bioo-track.js
// ─────────────────────────────────────────────────────────────────────────────
//  BIOO — tracking de clicks por bloque.
//
//  Endpoint HTTPS público (no callable, así sirve para navigator.sendBeacon).
//  Recibe {username, blockId, tipo?} y suma 1 al contador del bloque.
//
//  Storage:
//    bios/{username}/blockStats/{blockId}
//      count: int          — total de clicks (FieldValue.increment)
//      lastClickAt: ts     — último click
//      tipo: string        — tipo del bloque (cacheado para filtros)
//      firstClickAt: ts    — primer click (set una vez)
//
//  Anti-abuse:
//    - Rate-limit blando: ignora si la misma IP/UA pegó al mismo blockId
//      en los últimos 5 segundos (cache en memoria, best-effort por
//      instancia).
//    - Valida que la bio exista (lookup ligero a bios/{username}).
//
//  DEPLOY:
//    firebase deploy --only functions:biooTrackClick
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest }  = require('firebase-functions/v2/https');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const db = admin.firestore();

// Rate-limit best-effort en memoria. Si el contenedor recicla, se pierde —
// está bien, es solo para mitigar dobles clicks accidentales / bots tontos.
const recentClicks = new Map(); // key: ip|ua|username|blockId → ts
const RATE_WINDOW_MS = 5_000;

function clean(s, max = 80) {
  return String(s || '').trim().slice(0, max);
}

exports.biooTrackClick = onRequest(
  {
    cors: true,         // Llamado desde bioo.cl/<handle> (otro origen permitido).
    region: 'us-central1',
    invoker: 'public',
    timeoutSeconds: 10,
    maxInstances: 50,
  },
  async (req, res) => {
    // Solo POST (sendBeacon usa POST con Content-Type text/plain por defecto).
    if (req.method !== 'POST' && req.method !== 'OPTIONS') {
      res.status(405).send('Method not allowed');
      return;
    }
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    let body = req.body;
    // sendBeacon manda el body como text/plain con el JSON crudo dentro.
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const username = clean(body.username, 50).toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const blockId  = clean(body.blockId, 60).replace(/[^a-zA-Z0-9_-]/g, '');
    const tipo     = clean(body.tipo, 20);
    const ua       = clean(req.headers['user-agent'] || '', 100);
    const ip       = clean((req.headers['x-forwarded-for'] || '').split(',')[0], 45);

    if (!username || username.length < 3 || !blockId) {
      res.status(400).json({ ok: false, error: 'bad-input' });
      return;
    }

    // Rate-limit en memoria
    const key = `${ip}|${ua}|${username}|${blockId}`;
    const now = Date.now();
    const last = recentClicks.get(key) || 0;
    if (now - last < RATE_WINDOW_MS) {
      res.status(202).json({ ok: true, throttled: true });
      return;
    }
    recentClicks.set(key, now);
    // GC ligero — evita que el Map crezca infinito.
    if (recentClicks.size > 5000) {
      const cutoff = now - RATE_WINDOW_MS * 4;
      for (const [k, t] of recentClicks) if (t < cutoff) recentClicks.delete(k);
    }

    // Validar que la bio exista (lookup barato).
    try {
      const bioSnap = await db.collection('bios').doc(username).get();
      if (!bioSnap.exists) {
        res.status(404).json({ ok: false, error: 'bio-not-found' });
        return;
      }
    } catch (err) {
      logger.error('[bioo:track] lookup bio falló:', err.message);
      res.status(500).json({ ok: false, error: 'lookup-failed' });
      return;
    }

    // Increment del contador (merge → crea o actualiza).
    try {
      const ref = db.collection('bios').doc(username).collection('blockStats').doc(blockId);
      await ref.set({
        count: FieldValue.increment(1),
        lastClickAt: FieldValue.serverTimestamp(),
        ...(tipo ? { tipo } : {}),
      }, { merge: true });
    } catch (err) {
      logger.error(`[bioo:track] increment falló u=${username} b=${blockId}:`, err.message);
      res.status(500).json({ ok: false, error: 'write-failed' });
      return;
    }

    res.status(202).json({ ok: true });
  },
);
