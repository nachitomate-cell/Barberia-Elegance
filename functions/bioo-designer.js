'use strict';

// functions/bioo-designer.js
// ─────────────────────────────────────────────────────────────────────────────
//  BIOO · MODO DISEÑADOR (superadmin diseña bios para clientes externos)
//
//  Flujo: tú diseñas la bio del cliente → la editas como si fueras el dueño →
//  generas un mensaje de WhatsApp con el link de activación → el cliente entra
//  a /claim, inicia sesión con Google con el mismo email y adopta el bio.
//
//  Tres callables, todas gateadas por bios/{username}.isAdmin === true (mismo
//  check que loadAdminKpis):
//
//    1. biooDesignerCreate       Crea bio con source:'designer', garantiza la
//                                cuenta Auth del dueño futuro (por email) y
//                                devuelve { editorUrl, claimUrl, publicUrl }.
//                                editorUrl = customToken para abrir editor YA.
//    2. biooDesignerImpersonate  Reusable: emite customToken para volver a
//                                editar un bio diseñado existente. Solo bios
//                                con source:'designer' (no se puede impersonar
//                                a usuarios normales de la plataforma).
//    3. biooDesignerHandover     Marca handedOverAt y devuelve mensaje WhatsApp
//                                prellenado + claimUrl. Idempotente: se puede
//                                reenviar; el claimUrl es estable.
//
//  La adopción real del bio sucede en biooClaim (sin cambios): cuando el
//  cliente entra a /claim e inicia sesión con Google, Firebase hace match por
//  email y reusa la cuenta Auth que esta función ya creó.
//
//  DEPLOY:
//    firebase deploy --only functions:biooDesignerCreate,functions:biooDesignerImpersonate,functions:biooDesignerHandover
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');
const crypto                 = require('crypto');

// Reusamos el firmador de bioo-provision para no crear dos apps secundarias con
// el mismo nombre (initializeApp colisionaría).
const { signerAuth } = require('./bioo-provision');

const BIOO_ADMIN_SA = defineSecret('BIOO_ADMIN_SA');

const db = () => admin.firestore();
const BIOO_BASE = 'https://bioo.cl';

// ── Helpers (duplicados intencionalmente de bioo-provision.js — son puros y
//    pequeños; consolidar prematuramente esconde dependencias) ───────────────

const RESERVED = new Set([
  'registro','login','editor','admin','api','bio','dashboard','claim','agenda',
  'app','www','links','soporte','ayuda','help','about','terminos','privacidad',
  'disenador','diseñador',
]);

function normHandle(v) {
  return String(v || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+/, '').slice(0, 30);
}
function validHandle(v) {
  return typeof v === 'string'
    && v.length >= 3 && v.length <= 30
    && /^[a-z0-9][a-z0-9._-]{2,29}$/.test(v)
    && !RESERVED.has(v);
}
async function handleTaken(h) {
  const [b, e] = await Promise.all([
    db().collection('bios').doc(h).get(),
    db().collection('bio_handles').doc(h).get(),
  ]);
  return b.exists || e.exists;
}
async function freeHandle(suggested) {
  let base = normHandle(suggested);
  if (base.length < 3) base = ('bio' + base).slice(0, 30);
  if (!validHandle(base)) base = 'bio' + base.replace(/[^a-z0-9]/g, '').slice(0, 24);
  if (!validHandle(base)) base = 'comercio';
  if (!(await handleTaken(base))) return base;
  for (let i = 2; i <= 99; i++) {
    const cand = (base.slice(0, 30 - String(i).length) + i);
    if (validHandle(cand) && !(await handleTaken(cand))) return cand;
  }
  return base.slice(0, 25) + crypto.randomBytes(2).toString('hex');
}
function blockId() { return 'b' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'); }
function onlyDigits(v) { return String(v || '').replace(/\D/g, ''); }
function waNumber(raw) {
  let d = onlyDigits(raw);
  if (!d) return '';
  if (d.length === 9 && d[0] === '9') d = '56' + d;
  else if (d.length === 8) d = '569' + d;
  return d;
}
function buildBloques({ whatsapp, instagram, website }) {
  const out = [];
  const wa = waNumber(whatsapp);
  if (wa) out.push({ id: blockId(), tipo: 'enlace', label: 'Escríbeme por WhatsApp', url: `https://wa.me/${wa}`, activo: true, featured: true });
  const ig = String(instagram || '').replace(/^@/, '').trim();
  if (ig) out.push({ id: blockId(), tipo: 'enlace', label: 'Síguenos en Instagram', url: `https://instagram.com/${ig}`, activo: true });
  let web = String(website || '').trim();
  if (web) {
    if (!/^https?:\/\//i.test(web)) web = 'https://' + web;
    out.push({ id: blockId(), tipo: 'enlace', label: 'Visita nuestro sitio', url: web, activo: true });
  }
  return out;
}

// Garantiza cuenta Firebase Auth para el email (idempotente). emailVerified:
// false porque la verificación real ocurre cuando el cliente entra con Google.
async function getOrCreateUserByEmail(email, displayName) {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') {
      return await admin.auth().createUser({
        email,
        emailVerified: false,
        displayName: displayName || undefined,
      });
    }
    throw e;
  }
}

// Authz: el caller debe ser admin de la plataforma bioo (misma señal que usa
// loadAdminKpis → bios/{username}.isAdmin === true). Devuelve datos del admin
// para auditoría.
async function assertCallerIsAdmin(uid) {
  const us = await db().collection('bio_users').doc(String(uid)).get();
  const username = us.exists ? us.data().username : null;
  if (!username) throw new HttpsError('permission-denied', 'Tu cuenta no tiene una bio asociada.');
  const bio = await db().collection('bios').doc(String(username)).get();
  const isAdmin = bio.exists && bio.data().isAdmin === true;
  if (!isAdmin) throw new HttpsError('permission-denied', 'Solo administradores de bioo pueden diseñar para clientes.');
  return { adminUid: uid, adminHandle: username };
}

// ── 1. biooDesignerCreate ─────────────────────────────────────────────────────
exports.biooDesignerCreate = onCall(
  { region: 'us-central1', cors: true, secrets: [BIOO_ADMIN_SA] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const { adminUid, adminHandle } = await assertCallerIsAdmin(request.auth.uid);

    const b = request.data || {};
    const name = String(b.name || '').trim().slice(0, 80);
    if (!name) throw new HttpsError('invalid-argument', 'Falta el nombre del cliente.');
    const email = String(b.email || '').trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new HttpsError('invalid-argument', 'Falta o es inválido el email del cliente.');
    }
    const whatsapp   = String(b.whatsapp || '').trim();
    const instagram  = String(b.instagram || '').trim();
    const website    = String(b.website || '').trim();
    const wantHandle = String(b.handle || '').trim();
    const plan       = b.plan === 'premium' ? 'premium' : 'free';
    const theme      = String(b.theme || 'lime');
    const subtitulo  = String(b.description || '').trim().slice(0, 160);
    const avatar     = String(b.avatar || '').trim();

    // Idempotente por email: si ya tiene un bio (cualquier fuente), no duplicamos.
    // Asegura uid + cuenta Auth si no estaba, y devuelve customToken para editar.
    const idxRef  = db().collection('bio_email_owners').doc(email);
    const idxSnap = await idxRef.get();
    if (idxSnap.exists && idxSnap.data().handle) {
      const handle = idxSnap.data().handle;
      const user = await getOrCreateUserByEmail(email, name);
      const bioRef  = db().collection('bios').doc(handle);
      const bioSnap = await bioRef.get();
      if (bioSnap.exists && !bioSnap.data().uid) {
        const now = FieldValue.serverTimestamp();
        const batch = db().batch();
        batch.update(bioRef, { uid: user.uid, updatedAt: now });
        batch.set(db().collection('bio_users').doc(user.uid), { username: handle, email, createdAt: now }, { merge: true });
        await batch.commit();
      }
      const customToken = await signerAuth().createCustomToken(user.uid);
      logger.info(`[bioo-designer] reuse handle=${handle} email=${email} admin=${adminHandle}`);
      return {
        ok: true, already: true, handle,
        publicUrl: `${BIOO_BASE}/${encodeURIComponent(handle)}`,
        claimUrl:  `${BIOO_BASE}/claim?h=${encodeURIComponent(handle)}`,
        editorUrl: `${BIOO_BASE}/claim?ct=${encodeURIComponent(customToken)}`,
      };
    }

    const handle = await freeHandle(wantHandle || name);
    if (!validHandle(handle)) throw new HttpsError('internal', 'No se pudo generar un handle válido.');

    // Garantizamos cuenta de Auth para el dueño futuro YA. Cuando el cliente
    // entre a /claim con Google con el mismo email, Firebase hace email-match
    // y reusa esta misma cuenta — no quedan duplicados.
    const user = await getOrCreateUserByEmail(email, name);
    const ownerUid = user.uid;

    const bloques = buildBloques({ whatsapp, instagram, website });
    const now = FieldValue.serverTimestamp();

    const bioDoc = {
      uid: ownerUid,
      ownerEmail: email,
      username: handle,
      perfil: { titulo: name, subtitulo, avatar, verified: false },
      bloques,
      theme,
      plan,
      views: 0,
      clicks: {},
      source: 'designer',
      designedBy: { uid: adminUid, handle: adminHandle },
      designStatus: 'borrador',
      handoverPhone: waNumber(whatsapp) || '',
      createdAt: now,
      updatedAt: now,
      provisionedAt: now,
    };

    const batch = db().batch();
    batch.set(db().collection('bios').doc(handle), bioDoc);
    batch.set(idxRef, { handle, email, source: 'designer', createdAt: now });
    batch.set(db().collection('bio_users').doc(ownerUid), { username: handle, email, source: 'designer', createdAt: now }, { merge: true });
    await batch.commit();

    const customToken = await signerAuth().createCustomToken(ownerUid);
    logger.info(`[bioo-designer] created handle=${handle} email=${email} admin=${adminHandle}`);

    return {
      ok: true, already: false, handle,
      publicUrl: `${BIOO_BASE}/${encodeURIComponent(handle)}`,
      claimUrl:  `${BIOO_BASE}/claim?h=${encodeURIComponent(handle)}`,
      editorUrl: `${BIOO_BASE}/claim?ct=${encodeURIComponent(customToken)}`,
    };
  }
);

// ── 2. biooDesignerImpersonate ────────────────────────────────────────────────
exports.biooDesignerImpersonate = onCall(
  { region: 'us-central1', cors: true, secrets: [BIOO_ADMIN_SA] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const { adminHandle } = await assertCallerIsAdmin(request.auth.uid);

    const handle = normHandle((request.data && request.data.handle) || '');
    if (!handle) throw new HttpsError('invalid-argument', 'Falta el handle.');

    const bioRef  = db().collection('bios').doc(handle);
    const bioSnap = await bioRef.get();
    if (!bioSnap.exists) throw new HttpsError('not-found', 'La bio no existe.');
    const bio = bioSnap.data() || {};

    // Solo bios source:'designer' se pueden impersonar — esto evita que un
    // admin de plataforma se loguee como cualquier usuario auto-registrado.
    if (bio.source !== 'designer') {
      throw new HttpsError('permission-denied', 'Solo se pueden impersonar bios diseñadas.');
    }
    const email = String(bio.ownerEmail || '').trim().toLowerCase();
    if (!email) throw new HttpsError('failed-precondition', 'La bio no tiene ownerEmail.');

    let ownerUid = bio.uid || null;
    if (!ownerUid) {
      const user = await getOrCreateUserByEmail(email, (bio.perfil && bio.perfil.titulo) || handle);
      ownerUid = user.uid;
      const now = FieldValue.serverTimestamp();
      const batch = db().batch();
      batch.update(bioRef, { uid: ownerUid, updatedAt: now });
      batch.set(db().collection('bio_users').doc(ownerUid), { username: handle, email, createdAt: now }, { merge: true });
      await batch.commit();
    }

    const customToken = await signerAuth().createCustomToken(ownerUid);
    logger.info(`[bioo-designer] impersonate handle=${handle} by=${adminHandle}`);
    return {
      ok: true, handle,
      editorUrl: `${BIOO_BASE}/claim?ct=${encodeURIComponent(customToken)}`,
    };
  }
);

// ── 3. biooDesignerHandover ───────────────────────────────────────────────────
exports.biooDesignerHandover = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const { adminHandle } = await assertCallerIsAdmin(request.auth.uid);

    const handle = normHandle((request.data && request.data.handle) || '');
    if (!handle) throw new HttpsError('invalid-argument', 'Falta el handle.');

    const bioRef  = db().collection('bios').doc(handle);
    const bioSnap = await bioRef.get();
    if (!bioSnap.exists) throw new HttpsError('not-found', 'La bio no existe.');
    const bio = bioSnap.data() || {};
    if (bio.source !== 'designer') {
      throw new HttpsError('permission-denied', 'Solo se pueden entregar bios diseñadas.');
    }

    const phone = waNumber((request.data && request.data.whatsapp) || bio.handoverPhone || '');
    const titulo = String((bio.perfil && bio.perfil.titulo) || handle);
    const claimUrl  = `${BIOO_BASE}/claim?h=${encodeURIComponent(handle)}`;
    const publicUrl = `${BIOO_BASE}/${encodeURIComponent(handle)}`;
    const ownerEmail = String(bio.ownerEmail || '').trim();

    const message =
      `¡Hola! Te dejé lista tu página bioo de ${titulo}: ${publicUrl}\n\n` +
      `Para activarla y editarla, entra acá e inicia sesión con Google` +
      (ownerEmail ? ` (con tu correo ${ownerEmail})` : '') + `:\n${claimUrl}`;

    const waLink = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    const now = FieldValue.serverTimestamp();
    const update = {
      // No degradamos 'reclamado' a 'entregado' si ya lo activó.
      designStatus: bio.designStatus === 'reclamado' ? 'reclamado' : 'entregado',
      handedOverAt: now,
      handedOverBy: adminHandle,
    };
    if (phone) update.handoverPhone = phone;
    await bioRef.set(update, { merge: true });

    logger.info(`[bioo-designer] handover handle=${handle} by=${adminHandle} phone=${phone || '-'}`);
    return { ok: true, handle, claimUrl, publicUrl, message, waLink };
  }
);
