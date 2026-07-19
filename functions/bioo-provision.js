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

// Correos de SynapTech (mismos que firestore.rules). `biooEditorBridge` los
// rechaza: si el superadmin abre el Editor Premium desde el panel de un local,
// el puente identificaría por SU email y la página quedaría a su nombre.
const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];

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

// ── biooProvisionBarbero (CALLABLE) — admin/jefe crea bioo para un barbero ────
//  Distribución cautiva: cada barbería ya tiene N barberos en gestión-interna;
//  con un click el admin les provisiona un bioo.cl pre-llenado (nombre, foto,
//  WhatsApp, link a "Reservar conmigo"). El barbero después adopta el bioo
//  iniciando sesión con su email en bioo.cl/claim. Idempotente por barbero.
//
//  Caller: admin/jefe del tenant (verifica custom claims).
//  Input:  { tenantId, barberoId, tenantNombre, tenantDominio?, tenantInstagram? }
//  Output: { handle, publicUrl, claimUrl, already? }
exports.biooProvisionBarbero = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');

    const { tenantId, barberoId, tenantNombre, tenantDominio, tenantInstagram } = request.data || {};
    if (!tenantId || !barberoId) {
      throw new HttpsError('invalid-argument', 'Faltan tenantId o barberoId.');
    }

    // Authz: el caller debe ser admin/jefe del tenant. Custom claims primero,
    // fallback bootstrap (mismos correos que firestore.rules).
    const claims = auth.token || {};
    const isBootstrap = ['ignaciiio.mate@gmail.com']
      .includes(String(claims.email || '').toLowerCase());
    const isAdmin = (claims.tenantId === tenantId && claims.role === 'admin') || isBootstrap;
    if (!isAdmin) throw new HttpsError('permission-denied', 'Solo admin/jefe puede crear el bioo de un barbero.');

    // Ruta del doc según tenant (elegance vive en root, resto en /tenants/{tid}/).
    const barberoRoot = tenantId === 'elegance'
      ? db.collection('barberos').doc(barberoId)
      : db.collection('tenants').doc(tenantId).collection('barberos').doc(barberoId);

    let barberoSnap = await barberoRoot.get();
    if (!barberoSnap.exists) throw new HttpsError('not-found', 'Barbero no encontrado.');
    let barbero = barberoSnap.data() || {};

    // Si es doc-enlace (uid del barbero apuntando al principal), resolvemos.
    if (barbero._mainDocId) {
      const mainRef = tenantId === 'elegance'
        ? db.collection('barberos').doc(barbero._mainDocId)
        : db.collection('tenants').doc(tenantId).collection('barberos').doc(barbero._mainDocId);
      const mainSnap = await mainRef.get();
      if (mainSnap.exists) { barberoSnap = mainSnap; barbero = mainSnap.data() || {}; }
    }

    const writeRef = barberoSnap.ref;

    // Idempotente: si ya tiene biooHandle vigente, devolvemos.
    if (barbero.biooHandle) {
      const exists = await db.collection('bios').doc(barbero.biooHandle).get();
      if (exists.exists) {
        return {
          handle: barbero.biooHandle,
          publicUrl: `${BIOO_BASE}/${encodeURIComponent(barbero.biooHandle)}`,
          claimUrl: `${BIOO_BASE}/claim`,
          already: true,
        };
      }
      // El bio fue borrado fuera de banda — re-provisionamos.
    }

    const nombre = String(barbero.nombre || '').trim();
    const email = String(barbero.email || '').trim().toLowerCase();
    if (!nombre) throw new HttpsError('failed-precondition', 'El barbero no tiene nombre.');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new HttpsError('failed-precondition', 'El barbero no tiene email — agrégalo antes de crear el bioo.');
    }

    // Si su email ya tiene un bio reservado (por otra fuente), lo reusamos.
    const idxRef = db.collection('bio_email_owners').doc(email);
    const idxSnap = await idxRef.get();
    if (idxSnap.exists && idxSnap.data().handle) {
      const handle = idxSnap.data().handle;
      await writeRef.set({
        biooHandle: handle,
        biooPublicUrl: `${BIOO_BASE}/${encodeURIComponent(handle)}`,
        biooProvisionedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return {
        handle, publicUrl: `${BIOO_BASE}/${encodeURIComponent(handle)}`,
        claimUrl: `${BIOO_BASE}/claim`, already: true,
      };
    }

    // Sugerido: <nombre>-<tenant>. freeHandle dedup si colisiona.
    const baseHandle = `${nombre}-${tenantId}`;
    const handle = await freeHandle(baseHandle);
    if (!validHandle(handle)) throw new HttpsError('internal', 'No se pudo generar un handle válido.');

    // Plantilla de bloques.
    const bloques = [];
    const wa = waNumber(barbero.whatsapp);
    if (wa) {
      bloques.push({
        id: blockId(), tipo: 'enlace',
        label: 'Escríbeme por WhatsApp',
        url: `https://wa.me/${wa}`,
        activo: true, featured: true,
      });
    }
    // Reservar conmigo: link a la agenda del tenant. Si no llega dominio,
    // queda link al landing genérico — el barbero puede editarlo después.
    const dominio = String(tenantDominio || '').trim();
    if (dominio) {
      const reservaUrl = `https://${dominio.replace(/^https?:\/\//, '').replace(/\/$/, '')}/agenda?barbero=${encodeURIComponent(barberoSnap.id)}`;
      bloques.push({
        id: blockId(), tipo: 'enlace',
        label: `Reservar conmigo`,
        url: reservaUrl,
        activo: true,
      });
    }
    // Instagram del tenant (compartido por todo el equipo) si llega.
    const ig = String(tenantInstagram || '').replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '').trim();
    if (ig) {
      bloques.push({
        id: blockId(), tipo: 'enlace',
        label: `Síguenos en Instagram`,
        url: `https://instagram.com/${ig}`,
        activo: true,
      });
    }

    const now = FieldValue.serverTimestamp();
    const subtitulo = barbero.especialidad
      ? String(barbero.especialidad).slice(0, 160)
      : (tenantNombre ? `Profesional en ${String(tenantNombre).slice(0, 80)}` : '');

    // El barbero ya tiene cuenta Firebase Auth (mismo proyecto que bioo) con su
    // email+password del panel. Asignamos uid directo: cuando entra a bioo.cl
    // con su login del panel, ve su bio sin pasar por "claim por Google".
    const barberoUid = String(barbero.uid || barberoSnap.id || '').trim();

    const bioDoc = {
      uid: barberoUid || null,
      ownerEmail: email,                 // respaldo para claim por email si aplica
      username: handle,
      perfil: {
        titulo: nombre,
        subtitulo,
        avatar: String(barbero.foto || '').trim(),
        verified: false,
      },
      bloques,
      theme: 'lime',
      plan: 'free',
      views: 0,
      clicks: {},
      source: 'gestion-interna-barbero',
      provisionedBy: { uid: auth.uid, email: String(claims.email || '') },
      provisionedFor: { tenantId, barberoId: barberoSnap.id, barberoUid: barberoUid || null },
      provisionedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(db.collection('bios').doc(handle), bioDoc);
    batch.set(idxRef, { handle, email, source: 'gestion-interna-barbero', createdAt: now });
    // Si el barbero tiene uid válido, dejamos el mapeo uid→username listo para
    // que el editor lo cargue directo en el primer login (sin claim).
    if (barberoUid) {
      batch.set(db.collection('bio_users').doc(barberoUid), {
        username: handle,
        email,
        source: 'gestion-interna-barbero',
        createdAt: now,
      }, { merge: true });
    }
    batch.set(writeRef, {
      biooHandle: handle,
      biooPublicUrl: `${BIOO_BASE}/${encodeURIComponent(handle)}`,
      biooProvisionedAt: now,
    }, { merge: true });
    await batch.commit();

    logger.info(`[bioo] barbero provisionado handle=${handle} tenant=${tenantId} barbero=${barberoSnap.id}`);
    return {
      handle,
      publicUrl: `${BIOO_BASE}/${encodeURIComponent(handle)}`,
      claimUrl: `${BIOO_BASE}/claim`,
      already: false,
    };
  },
);

// ── biooOpenBarberoEditor (CALLABLE) — admin abre editor del barbero (SSO) ───
//  El admin/jefe del tenant puede entrar al editor del bioo de uno de sus
//  barberos sin pedirle credenciales. Firma un custom token para el UID del
//  barbero y devuelve la URL bioo.cl/claim?ct=<token> que loguea al editor
//  como ese barbero. Útil para que el admin deje la página lista en 2 min.
//
//  Authz: caller debe ser admin/jefe del tenant del barbero (custom claims).
exports.biooOpenBarberoEditor = onCall(
  { region: 'us-central1', cors: true, secrets: [BIOO_ADMIN_SA] },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const { tenantId, barberoId } = request.data || {};
    if (!tenantId || !barberoId) throw new HttpsError('invalid-argument', 'Faltan tenantId o barberoId.');

    const claims = auth.token || {};
    const isBootstrap = ['ignaciiio.mate@gmail.com']
      .includes(String(claims.email || '').toLowerCase());
    const isAdmin = (claims.tenantId === tenantId && claims.role === 'admin') || isBootstrap;
    if (!isAdmin) throw new HttpsError('permission-denied', 'Solo admin/jefe puede abrir el editor del bioo.');

    const root = tenantId === 'elegance'
      ? db.collection('barberos').doc(barberoId)
      : db.collection('tenants').doc(tenantId).collection('barberos').doc(barberoId);
    let snap = await root.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Barbero no encontrado.');
    let data = snap.data() || {};
    if (data._mainDocId) {
      const mainRef = tenantId === 'elegance'
        ? db.collection('barberos').doc(data._mainDocId)
        : db.collection('tenants').doc(tenantId).collection('barberos').doc(data._mainDocId);
      const mainSnap = await mainRef.get();
      if (mainSnap.exists) { snap = mainSnap; data = mainSnap.data() || {}; }
    }
    const barberoUid = String(data.uid || snap.id || '').trim();
    if (!barberoUid) throw new HttpsError('failed-precondition', 'El barbero no tiene cuenta de Auth.');

    // Auto-reparación: bioos creados antes del refactor uid-directo pueden tener
    // uid:null. Al abrir el editor, conectamos uid + bio_users (idempotente).
    const handle = data.biooHandle || '';
    if (handle) {
      const bioRef = db.collection('bios').doc(handle);
      const bioSnap = await bioRef.get();
      if (bioSnap.exists) {
        const bio = bioSnap.data() || {};
        if (!bio.uid || bio.uid !== barberoUid) {
          const now = FieldValue.serverTimestamp();
          const batch = db.batch();
          batch.update(bioRef, { uid: barberoUid, updatedAt: now });
          batch.set(db.collection('bio_users').doc(barberoUid), {
            username: handle,
            email: String(data.email || '').trim().toLowerCase(),
            source: 'gestion-interna-barbero',
            createdAt: now,
          }, { merge: true });
          await batch.commit();
          logger.info(`[bioo] repaired uid for barbero=${snap.id} handle=${handle}`);
        }
      }
    }

    // Custom token firmado con la service account dedicada (sin IAM signBlob).
    const customToken = await signerAuth().createCustomToken(barberoUid);
    const editorUrl = `${BIOO_BASE}/claim?ct=${encodeURIComponent(customToken)}`;
    logger.info(`[bioo] admin SSO editor barbero=${snap.id} uid=${barberoUid} tenant=${tenantId}`);
    return { editorUrl, handle: handle || null };
  },
);

// ── 4. biooEditorBridge (CALLABLE) — SSO 1-click desde gestión-interna ────────
//  El usuario YA está autenticado en el panel (mismo proyecto Firebase). Con su
//  sesión, este callable asegura/crea su bio en bioo.cl (idempotente por email) y
//  devuelve un customToken para abrir bioo.cl/editor?token=... sin re-login.
//  No usa el secreto compartido: la identidad la prueba Firebase Auth.
exports.biooEditorBridge = onCall(
  { region: 'us-central1', cors: true, secrets: [BIOO_ADMIN_SA] },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const callerUid = auth.uid;
    const email = String((auth.token && auth.token.email) || '').trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new HttpsError('failed-precondition', 'Tu cuenta no tiene un correo asociado.');
    }
    const name = String((request.data && request.data.name) || '').trim().slice(0, 80);
    const wantHandle = (request.data && request.data.handle) || '';

    // ⚠️ BLINDAJE (auditoría 2026-07-16). Dos incidentes reales que este guard cierra:
    //
    //  1) SLUGS BASURA: el panel pasa `handle: cfg.handle`, que es el MISMO handle
    //     que ya registró en `bio_handles`. Como handleTaken() mira los dos
    //     namespaces, freeHandle() lo veía "tomado" y acuñaba `<handle>2`, `<handle>5`…
    //     en silencio. Ahora: si el handle pedido está tomado por OTRO dueño,
    //     fallamos explícito en vez de inventar uno nuevo.
    //
    //  2) EL SUPERADMIN SE LLEVABA LA BIO DEL CLIENTE: el puente identifica por
    //     el email del que abre el panel. Si SynapTech abre el panel de un local,
    //     se auto-creaba/asignaba la bio a su cuenta personal. Ahora se rechaza.
    if (BOOTSTRAP_EMAILS.includes(email)) {
      throw new HttpsError(
        'failed-precondition',
        'Estás con la cuenta de SynapTech. El Editor Premium se abre con la cuenta del local (si no, la página quedaría a tu nombre).',
      );
    }

    const now = FieldValue.serverTimestamp();
    const idxRef = db.collection('bio_email_owners').doc(email);
    const idxSnap = await idxRef.get();
    let handle = (idxSnap.exists && idxSnap.data().handle) ? idxSnap.data().handle : null;
    let ownerUid = callerUid;

    if (handle) {
      const bioRef = db.collection('bios').doc(handle);
      const bioSnap = await bioRef.get();
      if (bioSnap.exists) {
        const bio = bioSnap.data();
        if (bio.ownerEmail && bio.ownerEmail !== email) {
          throw new HttpsError('permission-denied', 'Ese bioo pertenece a otra cuenta.');
        }
        ownerUid = bio.uid || callerUid;
        const batch = db.batch();
        if (!bio.uid) batch.update(bioRef, { uid: ownerUid, updatedAt: now });
        batch.set(db.collection('bio_users').doc(ownerUid), { username: handle, email, createdAt: now }, { merge: true });
        await batch.commit();
      } else {
        handle = null; // el índice apuntaba a un bio borrado → re-provisionar
      }
    }

    if (!handle) {
      // ── AUTO-SANADO: la bio pedida ya existe y es SUYA (por email), pero el
      // índice bio_email_owners no la apuntaba (así se produjo el desastre del
      // 2026-07-16: un seed creó bios/<h> sin índice → el puente creyó que el
      // handle era ajeno y acuñó <h>2). En vez de inventar otra, la adoptamos.
      const desired = normHandle(wantHandle || '');
      if (desired && validHandle(desired)) {
        const dRef  = db.collection('bios').doc(desired);
        const dSnap = await dRef.get();
        if (dSnap.exists) {
          const d = dSnap.data();
          if (d.ownerEmail && d.ownerEmail === email) {
            const adoptedUid = d.uid || callerUid;
            const b = db.batch();
            if (!d.uid) b.update(dRef, { uid: adoptedUid, updatedAt: now });
            b.set(idxRef, { handle: desired, email, source: 'gestion-interna', createdAt: now }, { merge: true });
            b.set(db.collection('bio_users').doc(adoptedUid), { username: desired, email, createdAt: now }, { merge: true });
            await b.commit();
            const tok = await signerAuth().createCustomToken(adoptedUid);
            logger.info(`[bioo] editor bridge ADOPTA handle=${desired} email=${email}`);
            return { customToken: tok, handle: desired, publicUrl: BIOO_BASE + '/' + encodeURIComponent(desired) };
          }
          // Existe y es de OTRA cuenta → error claro, NO acuñamos <h>2.
          throw new HttpsError(
            'already-exists',
            `El nombre "bioo.cl/${desired}" ya pertenece a otra cuenta. Elige otro nombre en tu panel antes de abrir el Editor Premium.`,
          );
        }
      }

      handle = await freeHandle(wantHandle || name || email.split('@')[0]);
      // freeHandle:110 (último recurso) no valida → lo validamos acá.
      if (!validHandle(handle)) {
        throw new HttpsError('internal', 'No se pudo generar un nombre válido para tu página.');
      }
      const bioDoc = {
        uid: callerUid,
        ownerEmail: email,
        username: handle,
        perfil: { titulo: name || handle, subtitulo: '', avatar: '', cover: '', verified: false },
        bloques: [],
        source: 'gestion-interna',
        createdAt: now,
        updatedAt: now,
      };
      // ⚠️ `create()` y NO `set({merge:true})`: entre handleTaken() y este commit
      // otro flujo puede haber acuñado el mismo handle (TOCTOU). Con merge, este
      // set le INYECTABA uid+ownerEmail encima = robo de la bio ajena. create()
      // falla si el doc ya existe.
      try {
        await db.collection('bios').doc(handle).create(bioDoc);
      } catch (e) {
        logger.warn(`[bioo] carrera al acuñar handle=${handle}: ${e.message}`);
        throw new HttpsError('aborted', 'Ese nombre se ocupó recién. Reintenta en unos segundos.');
      }
      const batch = db.batch();
      batch.set(idxRef, { handle, email, source: 'gestion-interna', createdAt: now }, { merge: true });
      batch.set(db.collection('bio_users').doc(callerUid), { username: handle, email, createdAt: now }, { merge: true });
      await batch.commit();
      ownerUid = callerUid;
    }

    const customToken = await signerAuth().createCustomToken(ownerUid);
    logger.info(`[bioo] editor bridge handle=${handle} email=${email}`);
    return { customToken, handle, publicUrl: BIOO_BASE + '/' + encodeURIComponent(handle) };
  },
);

// Reusado por bioo-designer.js para firmar custom tokens sin re-inicializar el
// app secundario (signerAuth mantiene un singleton interno).
exports.signerAuth = signerAuth;
