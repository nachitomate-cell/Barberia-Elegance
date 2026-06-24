'use strict';

// functions/bioo-admin-bootstrap.js
// ─────────────────────────────────────────────────────────────────────────────
//  BIOO · BOOTSTRAP DE ADMINS
//
//  HTTP endpoint server-to-server (gated por BIOO_PROVISION_SECRET, el mismo
//  secreto que usa biooProvision) para setear `isAdmin` en una bio. Reusable
//  para promover/quitar admins desde una terminal sin tocar la consola de
//  Firestore.
//
//  POST /setBioAdmin
//    Header: x-bioo-secret: <BIOO_PROVISION_SECRET>
//    Body:   { username: string, isAdmin: boolean }
//    Resp:   { ok: true, username, isAdmin } | { error: string }
//
//  DEPLOY:
//    firebase deploy --only functions:setBioAdmin
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const BIOO_PROVISION_SECRET = defineSecret('BIOO_PROVISION_SECRET');

const db = () => admin.firestore();

exports.setBioAdmin = onRequest(
  { cors: true, region: 'us-central1', secrets: [BIOO_PROVISION_SECRET] },
  async (req, res) => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

      const secret = req.get('x-bioo-secret') || (req.body && req.body.secret) || '';
      if (!secret || secret !== BIOO_PROVISION_SECRET.value()) {
        return res.status(401).json({ error: 'no_autorizado' });
      }

      const b = req.body || {};
      const username = String(b.username || '').trim().toLowerCase();
      if (!username) return res.status(400).json({ error: 'falta_username' });
      const isAdmin = b.isAdmin === true;

      const ref = db().collection('bios').doc(username);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'bio_no_encontrada', username });

      await ref.set({ isAdmin }, { merge: true });
      logger.info(`[admin-bootstrap] bios/${username}.isAdmin → ${isAdmin}`);
      return res.status(200).json({ ok: true, username, isAdmin });
    } catch (err) {
      logger.error('[admin-bootstrap] error', err);
      return res.status(500).json({ error: 'error_interno' });
    }
  },
);
