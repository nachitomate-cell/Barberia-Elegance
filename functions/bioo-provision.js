'use strict';

// functions/bioo-provision.js
// ─────────────────────────────────────────────────────────────────────────────
//  APROVISIONAMIENTO DE BIOS PARA INTEGRACIONES EXTERNAS (bioo.cl)
//
//  Permite que OTRO producto (p.ej. Club Patio Curauma, en su propio proyecto
//  Firebase) cree una página Link in Bio en bioo.cl YA PRELLENADA con los datos
//  del comercio (nombre, logo, WhatsApp, Instagram, web) y entregue al comercio
//  un enlace para "reclamarla" (tomar la propiedad) con su cuenta de Google.
//
//  Dos piezas:
//
//    1. biooProvision  (HTTP onRequest, server-to-server, secret compartido)
//       Crea bios/<handle> con uid:null (sin dueño aún) + un token de reclamo
//       privado en bio_claims/<token>. Devuelve { handle, claimUrl, publicUrl }.
//
//    2. biooClaim  (callable, requiere auth del comercio)
//       Lo invoca links/claim.html después de que el comercio inicia sesión
//       con Google. Verifica el token, asigna el uid como dueño del bio y crea
//       el índice bio_users/<uid>. A partir de ahí el comercio edita su bio en
//       bioo.cl/editor como cualquier usuario.
//
//  Las reglas de Firestore impiden que un cliente tome un bio con uid ajeno, por
//  eso el reclamo se hace server-side (el callable usa Admin SDK).
//
//  DEPLOY:
//    firebase deploy --only functions:biooProvision,functions:biooClaim
//  SECRET (mismo valor en el proyecto que consume, p.ej. Club Patio):
//    firebase functions:secrets:set BIOO_PROVISION_SECRET
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger }       = require('firebase-functions');
const admin            = require('firebase-admin');
const { FieldValue }   = require('firebase-admin/firestore');
const crypto           = require('crypto');

const db = admin.firestore();

const BIOO_PROVISION_SECRET = defineSecret('BIOO_PROVISION_SECRET');
// Service account (con clave privada) para firmar custom tokens LOCALMENTE.
// Evita el permiso IAM signBlob que la cuenta de cómputo (Gen2) no tiene.
const BIOO_ADMIN_SA = defineSecret('BIOO_ADMIN_SA');

const BIOO_BASE = 'https://bioo.cl';

// App secundaria inicializada con la service account → createCustomToken firma
// con la clave privada (sin llamar a la API de IAM).
let _signerApp = null;
function signerAuth() {
  if (!_signerApp) {
    const existing = admin.apps.find((a) => a && a.name === 'biooSigner');
    if (existing) { _signerApp = existing; }
    else {
      const sa = JSON.parse(BIOO_ADMIN_SA.value());
      _signerApp = admin.initializeApp({ credential: admin.credential.cert(sa) }, 'biooSigner');
    }
  }
  return _signerApp.auth();
}

// Handles que no se pueden tomar (deben coincidir con links/registro.html y editor.html)
const RESERVED = new Set([
  'registro', 'login', 'editor', 'admin', 'api', 'bio', 'dashboard', 'claim',
  'agenda', 'app', 'www', 'links', 'soporte', 'ayuda', 'help', 'about',
  'terminos', 'privacidad',
]);

// ── Helpers ────────────────────────────────────────────────────────────────

function normHandle(v) {
  return String(v || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '') // sin tildes
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')                     // solo chars válidos
    .replace(/^[._-]+/, '')                           // no empezar con símbolo
    .slice(0, 30);
}

function validHandle(v) {
  return typeof v === 'string'
    && v.length >= 3 && v.length <= 30
    && /^[a-z0-9][a-z0-9._-]{2,29}$/.test(v)
    && !RESERVED.has(v);
}

// ¿El handle ya está tomado? (colisión con bios self-serve o bio_handles de tenant)
async function handleTaken(handle) {
  const [b, h] = await Promise.all([
    db.collection('bios').doc(handle).get(),
    db.collection('bio_handles').doc(handle).get(),
  ]);
  return b.exists || h.exists;
}

// Encuentra un handle libre a partir de uno sugerido (base, base2, base3, …)
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
  // Último recurso: sufijo aleatorio corto
  const cand = (base.slice(0, 25) + crypto.randomBytes(2).toString('hex'));
  return cand;
}

function blockId() {
  return 'b' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
}

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

// WhatsApp chileno: si vienen 9 dígitos, anteponemos 56.
function waNumber(raw) {
  let d = onlyDigits(raw);
  if (!d) return '';
  if (d.length === 9 && d[0] === '9') d = '56' + d;     // 9xxxxxxxx → 569xxxxxxxx
  else if (d.length === 8) d = '569' + d;               // 8 díg → 569…
  return d;
}

// Construye los bloques iniciales (todos tipo 'enlace' para máxima compatibilidad
// con el render público de u.html, independiente de tipos especiales).
function buildBloques({ whatsapp, instagram, website }) {
  const out = [];
  const wa = waNumber(whatsapp);
  if (wa) {
    out.push({
      id: blockId(),
      tipo: 'enlace',
      label: 'Escríbeme por WhatsApp',
      url: `https://wa.me/${wa}`,
      activo: true,
      featured: true,
    });
  }
  const ig = String(instagram || '').replace(/^@/, '').trim();
  if (ig) {
    out.push({
      id: blockId(),
      tipo: 'enlace',
      label: 'Síguenos en Instagram',
      url: `https://instagram.com/${ig}`,
      activo: true,
    });
  }
  let web = String(website || '').trim();
  if (web) {
    if (!/^https?:\/\//i.test(web)) web = 'https://' + web;
    out.push({
      id: blockId(),
      tipo: 'enlace',
      label: 'Visita nuestro sitio',
      url: web,
      activo: true,
    });
  }
  return out;
}

// ── 1. biooProvision (HTTP, secret compartido) ───────────────────────────────

exports.biooProvision = onRequest(
  { cors: true, region: 'us-central1', secrets: [BIOO_PROVISION_SECRET] },
  async (req, res) => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

      // Secret compartido (header o body) — esto NO es de cara al usuario.
      const secret = req.get('x-bioo-secret') || (req.body && req.body.secret) || '';
      if (!secret || secret !== BIOO_PROVISION_SECRET.value()) {
        return res.status(401).json({ error: 'no_autorizado' });
      }

      const b = req.body || {};
      const name = String(b.name || '').trim().slice(0, 80);
      if (!name) return res.status(400).json({ error: 'falta_nombre' });

      // El dueño se identifica por su EMAIL (la cuenta de Google con la que
      // inicia sesión en bioo.cl). Es el puente de identidad entre proyectos.
      const email = String(b.email || '').trim().toLowerCase();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ error: 'falta_email' });
      }

      // IDEMPOTENTE por email: si ya tiene un bio, lo devolvemos (no duplica).
      const idxRef  = db.collection('bio_email_owners').doc(email);
      const idxSnap = await idxRef.get();
      if (idxSnap.exists && idxSnap.data().handle) {
        const h = idxSnap.data().handle;
        return res.status(200).json({
          ok: true, already: true, handle: h,
          claimUrl: `${BIOO_BASE}/claim`,
          publicUrl: `${BIOO_BASE}/${encodeURIComponent(h)}`,
        });
      }

      // Handle: sugerido por el llamante o derivado del nombre.
      const handle = await freeHandle(b.handle || name);
      if (!validHandle(handle)) return res.status(400).json({ error: 'handle_invalido' });

      const titulo    = name;
      const subtitulo = String(b.description || '').trim().slice(0, 160);
      const avatar    = String(b.avatar || '').trim();
      const bloques   = buildBloques({
        whatsapp:  b.whatsapp,
        instagram: b.instagram,
        website:   b.website,
      });

      const now = FieldValue.serverTimestamp();

      // plan: 'free' | 'premium'. La personalización avanzada (temas/fondos/
      // animaciones) se reservará a 'premium' en el editor (fase 2).
      const plan = b.plan === 'premium' ? 'premium' : 'free';

      // Documento bio PRELLENADO, sin uid aún. `ownerEmail` reserva la propiedad:
      // quien inicie sesión en bioo.cl con ese email (verificado por Google) lo adopta.
      const bioDoc = {
        uid: null,
        ownerEmail: email,
        username: handle,
        perfil: { titulo, subtitulo, avatar, verified: false },
        bloques,
        theme: 'lime',
        plan,
        views: 0,
        clicks: {},
        source: String(b.source || 'externo'),
        provisionedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      const batch = db.batch();
      batch.set(db.collection('bios').doc(handle), bioDoc);
      // Índice privado email → handle (idempotencia + adopción por email).
      batch.set(idxRef, { handle, email, source: String(b.source || 'externo'), createdAt: now });
      await batch.commit();

      const claimUrl  = `${BIOO_BASE}/claim`;
      const publicUrl = `${BIOO_BASE}/${encodeURIComponent(handle)}`;

      logger.info(`[bioo] provisioned handle=${handle} email=${email} source=${b.source || 'externo'}`);
      return res.status(200).json({ ok: true, handle, claimUrl, publicUrl });
    } catch (err) {
      logger.error('[bioo] provision error:', err);
      return res.status(500).json({ error: 'error_interno' });
    }
  }
);

// ── 2. biooClaim (callable) — el emprendedor toma posesión de su bio ──────────
//  Lo invoca links/claim.html tras iniciar sesión con Google. La posesión se
//  resuelve por EMAIL: si existe un bio reservado para el email del usuario
//  (ownerEmail), lo adopta. (Conserva soporte de token por compatibilidad.)
exports.biooClaim = onCall({ region: 'us-central1' }, async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');

  const uid   = auth.uid;
  const email = ((auth.token && auth.token.email) || '').trim().toLowerCase();
  const token = String((request.data && request.data.token) || '');

  const userRef  = db.collection('bio_users').doc(uid);
  const userSnap = await userRef.get();

  // 1) Resolver el handle a adoptar.
  let handle = null;
  let viaToken = false;
  if (token) {
    const c = await db.collection('bio_claims').doc(token).get();
    if (c.exists && !c.data().used) { handle = c.data().handle; viaToken = true; }
  }
  if (!handle && email) {
    const idx = await db.collection('bio_email_owners').doc(email).get();
    if (idx.exists && idx.data().handle) handle = idx.data().handle;
  }
  // 2) ¿Ya es dueño de algún bio? (login repetido)
  if (!handle) {
    if (userSnap.exists && userSnap.data().username) {
      return { ok: true, handle: userSnap.data().username, already: true };
    }
    throw new HttpsError('not-found', 'No encontramos una página asociada a tu cuenta.');
  }

  const bioRef   = db.collection('bios').doc(handle);
  const claimRef = viaToken ? db.collection('bio_claims').doc(token) : null;

  return db.runTransaction(async (tx) => {
    const bioSnap = await tx.get(bioRef);
    if (!bioSnap.exists) throw new HttpsError('not-found', 'La página no existe.');
    const bio = bioSnap.data();

    // Ya es suya → idempotente.
    if (bio.uid && bio.uid === uid) return { ok: true, handle, already: true };
    if (bio.uid && bio.uid !== uid) {
      throw new HttpsError('failed-precondition', 'Esta página ya tiene otro dueño.');
    }
    // Seguridad: por email, el email autenticado debe coincidir con ownerEmail.
    if (!viaToken && bio.ownerEmail && email && bio.ownerEmail !== email) {
      throw new HttpsError('permission-denied', 'Esta página está reservada para otra cuenta.');
    }

    const now = FieldValue.serverTimestamp();
    tx.update(bioRef, { uid, updatedAt: now });
    tx.set(userRef, { username: handle, email, claimedFrom: bio.source || 'externo', createdAt: now }, { merge: true });
    if (claimRef) tx.update(claimRef, { used: true, claimedBy: uid, claimedAt: now });

    return { ok: true, handle, already: false };
  });
});

// ── 3. biooEditorSession (HTTP, secret) — SSO entre proyectos ─────────────────
//  El emprendedor YA está autenticado en el producto externo (Club Patio). En vez
//  de hacerlo iniciar sesión otra vez en bioo.cl, Club Patio (que verificó su
//  identidad) pide aquí un CUSTOM TOKEN de Firebase para la cuenta de bioo del
//  emprendedor (identificada por su email). La página puente lo usa con
//  signInWithCustomToken y lo deja dentro del editor ya logueado.
//
//  Confía en el secret compartido: quien lo posee (el backend de Club Patio) ya
//  autenticó al usuario. Solo emite token para emails con un bio aprovisionado.

async function getOrCreateUserByEmail(email, displayName) {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') {
      return await admin.auth().createUser({
        email,
        emailVerified: true,
        displayName: displayName || undefined,
      });
    }
    throw e;
  }
}

exports.biooEditorSession = onRequest(
  { cors: true, region: 'us-central1', secrets: [BIOO_PROVISION_SECRET, BIOO_ADMIN_SA] },
  async (req, res) => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

      const secret = req.get('x-bioo-secret') || (req.body && req.body.secret) || '';
      if (!secret || secret !== BIOO_PROVISION_SECRET.value()) {
        return res.status(401).json({ error: 'no_autorizado' });
      }

      const b = req.body || {};
      const email = String(b.email || '').trim().toLowerCase();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ error: 'falta_email' });
      }

      // Resolver handle (del cuerpo o por índice de email).
      let handle = normHandle(b.handle || '');
      if (!handle) {
        const idx = await db.collection('bio_email_owners').doc(email).get();
        if (idx.exists && idx.data().handle) handle = idx.data().handle;
      }
      if (!handle) return res.status(404).json({ error: 'sin_bio' });

      const bioRef  = db.collection('bios').doc(handle);
      const bioSnap = await bioRef.get();
      if (!bioSnap.exists) return res.status(404).json({ error: 'sin_bio' });
      const bio = bioSnap.data();

      // Seguridad: el email debe coincidir con el dueño reservado.
      if (bio.ownerEmail && bio.ownerEmail !== email) {
        return res.status(403).json({ error: 'email_no_coincide' });
      }

      // uid dueño: si ya está, se respeta; si no, se obtiene/crea por email.
      let ownerUid = bio.uid || null;
      if (!ownerUid) {
        const user = await getOrCreateUserByEmail(email, (bio.perfil && bio.perfil.titulo) || handle);
        ownerUid = user.uid;
      }

      const now   = FieldValue.serverTimestamp();
      const batch = db.batch();
      if (!bio.uid) batch.update(bioRef, { uid: ownerUid, updatedAt: now });
      batch.set(db.collection('bio_users').doc(ownerUid), { username: handle, email, createdAt: now }, { merge: true });
      await batch.commit();

      const customToken = await signerAuth().createCustomToken(ownerUid);
      const editUrl = `${BIOO_BASE}/claim?ct=${encodeURIComponent(customToken)}`;

      logger.info(`[bioo] editor session handle=${handle} email=${email}`);
      return res.status(200).json({ ok: true, handle, customToken, editUrl });
    } catch (err) {
      logger.error('[bioo] editor session error:', err);
      return res.status(500).json({ error: 'error_interno' });
    }
  }
);

// ── 4. provisionPartnerUser (HTTP, secret) — White-glove SSO en 1 sola llamada ─
//  Combina provisión + custom token: crea (si hace falta) la cuenta de Auth y el
//  bio del comercio, y devuelve un customToken para entrar al editor con 1 clic
//  (sin pasar por /claim). Pensado para partners (Club Patio) que YA autenticaron
//  al usuario en su propia app.
//
//  Auth:  Authorization: Bearer <BIOO_PROVISION_SECRET>   (o header x-bioo-secret)
//  Body:  { email, storeName, handle? }
//  Resp:  { success: true, customToken, handle }

// Lee el secret desde Authorization: Bearer, x-bioo-secret o body.secret.
function readPartnerSecret(req) {
  const authH = req.get('authorization') || req.get('Authorization') || '';
  const bearer = authH.startsWith('Bearer ') ? authH.slice(7).trim() : '';
  return bearer || req.get('x-bioo-secret') || (req.body && req.body.secret) || '';
}

exports.provisionPartnerUser = onRequest(
  { cors: true, region: 'us-central1', secrets: [BIOO_PROVISION_SECRET, BIOO_ADMIN_SA] },
  async (req, res) => {
    try {
      if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

      // Seguridad: solo el backend del partner (posee el secret) puede llamar.
      const secret = readPartnerSecret(req);
      if (!secret || secret !== BIOO_PROVISION_SECRET.value()) {
        return res.status(401).json({ success: false, error: 'no_autorizado' });
      }

      const b = req.body || {};
      const email = String(b.email || '').trim().toLowerCase();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ success: false, error: 'falta_email' });
      }
      const storeName = String(b.storeName || '').trim().slice(0, 80) || 'Mi comercio';

      // 1. Usuario en Firebase Auth (busca por email; si no existe, lo crea).
      const user = await getOrCreateUserByEmail(email, storeName);
      const uid = user.uid;

      // 2. ¿Ya tiene bio? (idempotente por email — no duplica páginas).
      const idxRef = db.collection('bio_email_owners').doc(email);
      const idxSnap = await idxRef.get();
      let handle = (idxSnap.exists && idxSnap.data().handle) || '';
      const now = FieldValue.serverTimestamp();

      if (!handle) {
        // 3. White-glove: crear bio nuevo, ya con dueño (uid), tema premium,
        //    título = storeName y un bloque de ejemplo.
        handle = await freeHandle(b.handle || storeName);
        if (!validHandle(handle)) return res.status(400).json({ success: false, error: 'handle_invalido' });

        const bloques = [{
          id: blockId(),
          tipo: 'enlace',
          label: 'Mi primer enlace ✨',
          url: 'https://bioo.cl',
          activo: true,
          featured: true,
        }];

        const bioDoc = {
          uid,                          // dueño inmediato (SSO white-glove, sin /claim)
          ownerEmail: email,
          username: handle,
          perfil: { titulo: storeName, subtitulo: '', avatar: '', verified: false, partner: 'patio-curauma', showPartnerBadge: true },
          bloques,
          theme: 'sunset',              // tema premium por defecto
          plan: 'premium',
          views: 0,
          clicks: {},
          source: String(b.source || 'partner'),
          provisionedAt: now,
          createdAt: now,
          updatedAt: now,
        };

        const batch = db.batch();
        batch.set(db.collection('bios').doc(handle), bioDoc);
        batch.set(idxRef, { handle, email, source: String(b.source || 'partner'), createdAt: now });
        batch.set(db.collection('bio_users').doc(uid), { username: handle, email, createdAt: now }, { merge: true });
        await batch.commit();
        logger.info(`[bioo] provisionPartnerUser NUEVO handle=${handle} email=${email}`);
      } else {
        // 3b. Ya existía: asegurar que el uid quede como dueño + índice bio_users.
        const bioRef = db.collection('bios').doc(handle);
        const bioSnap = await bioRef.get();
        if (bioSnap.exists && !bioSnap.data().uid) {
          const batch = db.batch();
          batch.update(bioRef, { uid, updatedAt: now });
          batch.set(db.collection('bio_users').doc(uid), { username: handle, email, createdAt: now }, { merge: true });
          await batch.commit();
        }
        logger.info(`[bioo] provisionPartnerUser EXISTENTE handle=${handle} email=${email}`);
      }

      // 4. Custom token firmado con la service account dedicada (evita IAM signBlob).
      const customToken = await signerAuth().createCustomToken(uid);

      return res.status(200).json({ success: true, customToken, handle });
    } catch (err) {
      logger.error('[bioo] provisionPartnerUser error:', err);
      return res.status(500).json({ success: false, error: 'error_interno' });
    }
  }
);
