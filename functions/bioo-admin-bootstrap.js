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
      const secret = req.get('x-bioo-secret') || (req.body && req.body.secret) || req.query.secret || '';
      if (!secret || secret !== BIOO_PROVISION_SECRET.value()) {
        return res.status(401).json({ error: 'no_autorizado' });
      }

      // ── GET ?inspect=username — diagnostico: estado del enlace uid↔bio ──
      if (req.method === 'GET' && req.query.inspect) {
        const username = String(req.query.inspect).trim().toLowerCase();
        const email    = String(req.query.email || '').trim().toLowerCase();
        const bioSnap  = await db().collection('bios').doc(username).get();
        const bio      = bioSnap.exists ? bioSnap.data() : null;
        const bioUid   = bio ? bio.uid : null;
        const userDoc  = bioUid ? (await db().collection('bio_users').doc(String(bioUid)).get()).data() : null;

        let byEmailUid = null, byEmailUserDoc = null;
        if (email) {
          try {
            const userRec = await admin.auth().getUserByEmail(email);
            byEmailUid = userRec.uid;
            byEmailUserDoc = (await db().collection('bio_users').doc(byEmailUid).get()).data() || null;
          } catch { /* sin cuenta */ }
        }

        return res.status(200).json({
          bio: bio ? {
            exists: true,
            uid: bio.uid || null,
            ownerEmail: bio.ownerEmail || null,
            isAdmin: bio.isAdmin === true,
            username: bio.username || null,
          } : { exists: false },
          bio_users_linked_by_bio_uid: userDoc || null,
          ...(email ? {
            email_lookup: {
              email,
              auth_uid: byEmailUid,
              bio_users_for_that_uid: byEmailUserDoc,
            },
          } : {}),
        });
      }

      if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

      const b = req.body || {};
      const op = String(b.op || 'set-admin');

      // ── op: set-active-bio — repunta bio_users/{uid}.username ──
      if (op === 'set-active-bio') {
        const uid      = String(b.uid || '').trim();
        const username = String(b.username || '').trim().toLowerCase();
        if (!uid || !username) return res.status(400).json({ error: 'falta_uid_o_username' });
        const bio = await db().collection('bios').doc(username).get();
        if (!bio.exists) return res.status(404).json({ error: 'bio_no_encontrada', username });
        if (bio.data().uid && bio.data().uid !== uid) {
          return res.status(409).json({ error: 'bio_pertenece_a_otro_uid', bioUid: bio.data().uid });
        }
        await db().collection('bio_users').doc(uid).set({ username }, { merge: true });
        logger.info(`[admin-bootstrap] bio_users/${uid}.username → ${username}`);
        return res.status(200).json({ ok: true, op, uid, username });
      }

      // ── op: delete-bio — borra bios/{u} + subcolecciones + handles asociados ──
      if (op === 'delete-bio') {
        const username = String(b.username || '').trim().toLowerCase();
        if (!username) return res.status(400).json({ error: 'falta_username' });
        const bioRef = db().collection('bios').doc(username);
        const snap = await bioRef.get();
        if (!snap.exists) return res.status(404).json({ error: 'bio_no_encontrada', username });
        const data = snap.data() || {};

        // Recursive delete: incluye subcolecciones (secrets, purchases, leads).
        await db().recursiveDelete(bioRef);

        // Limpia índices accesorios.
        await db().collection('bio_handles').doc(username).delete().catch(() => {});
        if (data.ownerEmail) {
          await db().collection('bio_email_owners').doc(String(data.ownerEmail)).delete().catch(() => {});
        }
        logger.info(`[admin-bootstrap] borrado bios/${username} + subcolecciones`);
        return res.status(200).json({ ok: true, op, username, ownerEmail: data.ownerEmail || null });
      }

      // ── op: set-admin (default) — toggle bios/{u}.isAdmin ──
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
      return res.status(500).json({ error: 'error_interno', message: err.message });
    }
  },
);
