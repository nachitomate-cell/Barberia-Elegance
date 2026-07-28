'use strict';

// functions/wallet-registro.js
// ─────────────────────────────────────────────────────────────────
//  REGISTRO PÚBLICO DE CLIENTE FINAL — cierra el ciclo Wallo standalone.
//
//  Flujo: cliente escanea QR del local → landing pública en
//  wallets.bioo.cl/r/{slug} → llena nombre + tel + email + fecha nac
//  → esta CF crea/reusa el user en Firebase Auth + escribe el doc en
//  tenants/{tid}/users/{uid} + provisiona pase Google + link Apple.
//  La landing detecta iOS/Android y muestra el botón apropiado.
//
//  HTTP público (sin auth Firebase). Rate limit blando por IP + email
//  duplicate check para evitar spam. Idempotente: si el email ya
//  existe en el tenant, reusa el uid y actualiza datos.
//
//  Exports:
//    walletRegistrarCliente — HTTP POST (JSON body)
//
//  DEPLOY:
//    firebase deploy --only functions:walletRegistrarCliente
// ─────────────────────────────────────────────────────────────────

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const core = require('./lib/wallet-core');
const apple = require('./lib/wallet-apple-core');

const db = admin.firestore();
const WALLET_SA_KEY = defineSecret('WALLET_SA_KEY');
const APPLE_PASS_CERT = defineSecret('APPLE_PASS_CERT');
const APPLE_PASS_KEY = defineSecret('APPLE_PASS_KEY');

// Path helpers (mismo criterio que wallet.js: elegance sin prefijo).
const premiosCol   = (tid) => db.collection(tid === 'elegance' ? 'premios' : `tenants/${tid}/premios`);
const rangosRef    = (tid) => db.doc(tid === 'elegance' ? 'configuracion/rangos' : `tenants/${tid}/configuracion/rangos`);
const walletCfgRef = (tid) => db.doc(tid === 'elegance' ? 'configuracion/wallet' : `tenants/${tid}/configuracion/wallet`);
const usersCol     = (tid) => db.collection(tid === 'elegance' ? 'users' : `tenants/${tid}/users`);
const billingRef   = (tid) => db.doc(`_billing/${tid}`);
const tenantRef    = (tid) => db.doc(`tenants/${tid}`);

const APPLE_LINK_TTL_MS = 15 * 60 * 1000;
const applePasesCol = () => db.collection('apple_wallet_passes');
const appleLinksCol = () => db.collection('apple_wallet_links');

// ── Sanitizadores defensivos ──────────────────────────────────────
function saneNombre(v) {
  return String(v || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}
function saneEmail(v) {
  const e = String(v || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e.slice(0, 120);
}
function saneTelefono(v) {
  const digs = String(v || '').replace(/\D+/g, '');
  if (digs.length < 8 || digs.length > 15) return null;
  return digs;
}
function saneFechaNac(v) {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const now = new Date().getFullYear();
  if (y < 1900 || y > now) return null;
  return s;
}
function saneInstagram(v) {
  // Instagram handle: 1-30 chars, letras/números/. y _. Sin @ inicial ni URL.
  const raw = String(v || '').trim().replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
  if (!raw) return null;
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(raw)) return null;
  return raw.toLowerCase();
}

// ── Rate limit blando por IP + email (memoria in-process; suficiente
//    para MVP — sale un lote de spam y se contiene). Reset por deploy.
const _rateCache = new Map();
function rateHit(key, max = 5, windowMs = 60_000) {
  const now = Date.now();
  const arr = (_rateCache.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  _rateCache.set(key, arr);
  return arr.length > max;
}

// ── CORS mínimo (solo hosts propios + wildcard subdominio synaptechspa)
function setCors(res, origin) {
  const ok = origin && /^https:\/\/([a-z0-9-]+\.)?(bioo\.cl|synaptechspa\.cl|wallo\.cl)(:\d+)?$/i.test(origin);
  res.set('Access-Control-Allow-Origin', ok ? origin : 'https://wallets.bioo.cl');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
  res.set('Vary', 'Origin');
}

// ── Busca o crea el user de Firebase Auth por email ────────────────
async function upsertAuthUser(email, nombre) {
  try {
    const u = await admin.auth().getUserByEmail(email);
    return { uid: u.uid, creado: false };
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  const u = await admin.auth().createUser({
    email,
    emailVerified: false,
    displayName: nombre || undefined,
    disabled: false,
  });
  return { uid: u.uid, creado: true };
}

// ── Ensamble del pase Apple (mismo flujo interno que walletAppleGenerarLink,
//    pero corriendo dentro del mismo request para no depender de auth cliente).
async function generarLinkApple(tenantId, uid, ctx, saAppleReady) {
  if (!saAppleReady) return null;
  try {
    if (!apple.configurado()) return null;
    const serial = apple.serialFor(tenantId, uid);
    const paseRef = applePasesCol().doc(serial);
    const paseSnap = await paseRef.get();
    const authToken = (paseSnap.exists && paseSnap.data().token) || apple.nuevoAuthToken();
    const meta = { tenantId, uid, token: authToken };
    if (!paseSnap.exists) meta.updatedAt = Timestamp.now();
    await paseRef.set(meta, { merge: true });

    const token = require('crypto').randomBytes(24).toString('base64url');
    await appleLinksCol().doc(token).set({
      tenantId,
      uid,
      exp: Timestamp.fromMillis(Date.now() + APPLE_LINK_TTL_MS),
      createdAt: Timestamp.now(),
    });
    return `https://us-central1-barberia-elegance.cloudfunctions.net/walletApplePase?t=${token}`;
  } catch (e) {
    logger.warn(`[Registro] Apple link falló (${tenantId}/${uid}): ${e.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  META PÚBLICO del tenant (para la landing de registro).
//  Devuelve SOLO branding + flags (sin datos sensibles) para que
//  wallo-registro.html arme el hero antes del submit.
//  Rules de Firestore protegen _billing y configuracion/wallet →
//  desde una sesión sin auth no se pueden leer directo, por eso el
//  endpoint intermedio.
// ═══════════════════════════════════════════════════════════════
exports.walletTenantMeta = onRequest(
  { region: 'us-central1', cors: true },
  async (req, res) => {
    setCors(res, String(req.headers.origin || ''));
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }
    const tid = String((req.query && req.query.tid) || (req.body && req.body.tid) || '').trim();
    if (!tid) return res.status(400).json({ ok: false, error: 'tid_requerido' });

    try {
      const [tSnap, cfgSnap, bSnap] = await Promise.all([
        tenantRef(tid).get(),
        walletCfgRef(tid).get(),
        billingRef(tid).get(),
      ]);
      if (!tSnap.exists) return res.status(404).json({ ok: false, error: 'tenant_no_existe' });
      const t = tSnap.data();
      const cfg = cfgSnap.exists ? cfgSnap.data() : {};
      const b = bSnap.exists ? bSnap.data() : {};
      // Copy override que el dueño edita desde el estudio → sub-panel
      // "Página de registro". Devolvemos SOLO los que existen; la landing
      // aplica fallback a los defaults del template si faltan.
      const rc = (cfg.registroCopy && typeof cfg.registroCopy === 'object') ? cfg.registroCopy : {};
      const registroCopy = {
        heroTitulo:     String(rc.heroTitulo    || '').slice(0, 60) || null,
        formIntro:      String(rc.formIntro     || '').slice(0, 220) || null,
        botonTexto:     String(rc.botonTexto    || '').slice(0, 40) || null,
        exitoTitulo:    String(rc.exitoTitulo   || '').slice(0, 60) || null,
        exitoSub:       String(rc.exitoSub      || '').slice(0, 120) || null,
        terminosTexto:  String(rc.terminosTexto || '').slice(0, 280) || null,
      };
      // Toggles de campos del form.
      const rcamp = (cfg.registroCampos && typeof cfg.registroCampos === 'object') ? cfg.registroCampos : {};
      const registroCampos = {
        pedirFechaNac:       rcamp.pedirFechaNac !== false,       // default ON
        fechaNacObligatoria: rcamp.fechaNacObligatoria === true,  // default OFF
        pedirInstagram:      rcamp.pedirInstagram === true,       // default OFF
      };

      // Cache 60s en CDN — el branding cambia poco y ahorra hits en Firestore.
      res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
      return res.status(200).json({
        ok: true,
        tenant: {
          slug: tid,
          nombre: t.nombre || tid,
          logoUrl: cfg.logoUrl || t.logoUrl || null,
          bannerUrl: cfg.bannerUrl || null,
          accent: cfg.accent || '#c9a84c',
          bg: cfg.bg || '#0d0d0d',
          programName: cfg.programName || 'Club de Fidelidad',
        },
        registroCopy,
        registroCampos,
        // Flags necesarios para saber si la landing debe permitir registro.
        walletActivo: b.walletActivo === true,
        enabled: cfg.enabled !== false,
      });
    } catch (e) {
      logger.error(`[TenantMeta] ${tid}:`, e);
      return res.status(500).json({ ok: false, error: 'internal' });
    }
  },
);

exports.walletRegistrarCliente = onRequest(
  {
    region: 'us-central1',
    cors: true,
    secrets: [WALLET_SA_KEY, APPLE_PASS_CERT, APPLE_PASS_KEY],
    // Sin auth Firebase. La validación está en el body + rate limit + gate del tenant.
  },
  async (req, res) => {
    setCors(res, String(req.headers.origin || ''));
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

    try {
      const body = req.body || {};
      const tenantId = String(body.tenantId || '').trim();
      const nombre    = saneNombre(body.nombre);
      const email     = saneEmail(body.email);
      const telefono  = saneTelefono(body.telefono);
      const fechaNac  = saneFechaNac(body.fechaNacimiento);
      const instagram = saneInstagram(body.instagram);
      const acepto    = !!body.acepto;

      if (!tenantId) return res.status(400).json({ ok: false, error: 'tenantId_requerido' });
      if (!nombre)   return res.status(400).json({ ok: false, error: 'nombre_invalido' });
      if (!email)    return res.status(400).json({ ok: false, error: 'email_invalido' });
      if (!telefono) return res.status(400).json({ ok: false, error: 'telefono_invalido' });
      if (!acepto)   return res.status(400).json({ ok: false, error: 'debes_aceptar_terminos' });

      // Rate limit: 5 registros por IP/min y 3 por email/min. Suficiente para
      // MVP; si abusan, escala a Cloud Armor o captcha en un sprint futuro.
      const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
      if (ip && rateHit(`ip:${ip}`, 5, 60_000)) return res.status(429).json({ ok: false, error: 'demasiadas_solicitudes' });
      if (rateHit(`mail:${email}`, 3, 60_000)) return res.status(429).json({ ok: false, error: 'demasiadas_solicitudes' });

      // Gate: tenant existe + walletActivo. Además cargamos cfg para
      // aplicar reglas de campos (fechaNacObligatoria, etc).
      const [tSnap, bSnap, cfgEarly] = await Promise.all([
        tenantRef(tenantId).get(),
        billingRef(tenantId).get(),
        walletCfgRef(tenantId).get(),
      ]);
      if (!tSnap.exists) return res.status(404).json({ ok: false, error: 'tenant_no_existe' });
      const walletActivo = bSnap.exists && bSnap.data().walletActivo === true;
      if (!walletActivo) return res.status(403).json({ ok: false, error: 'wallet_no_activo' });
      const cfgReg = (cfgEarly.exists && cfgEarly.data().registroCampos) || {};
      if (cfgReg.fechaNacObligatoria === true && !fechaNac) {
        return res.status(400).json({ ok: false, error: 'fecha_nacimiento_requerida' });
      }

      // 1. Upsert Firebase Auth user por email.
      const { uid, creado } = await upsertAuthUser(email, nombre);

      // 2. Upsert doc en tenants/{tid}/users/{uid}. Mantenemos sellos si ya
      //    existía (idempotencia: registrarse de nuevo NO borra progreso).
      const uRef = usersCol(tenantId).doc(uid);
      const uPrev = await uRef.get();
      const suf9 = telefono.length >= 9 ? telefono.slice(-9) : telefono;
      const patch = {
        nombre,
        email,
        telefono,
        telefonoSuf9: suf9,
        ...(fechaNac  ? { fechaNacimiento: fechaNac } : {}),
        ...(instagram ? { instagram } : {}),
        origenRegistro: 'wallo-qr',
        actualizadoEn: FieldValue.serverTimestamp(),
      };
      if (!uPrev.exists) {
        patch.sellosDisponibles = 0;
        patch.sellosHistoricos = 0;
        patch.stamps = 0;
        patch.creadoEn = FieldValue.serverTimestamp();
      }
      await uRef.set(patch, { merge: true });

      // 3. Cargar contexto wallet (cfg + premios + rangos) para provisionar.
      const [cfgSnap, premiosSnap, rangosSnap] = await Promise.all([
        walletCfgRef(tenantId).get(),
        premiosCol(tenantId).get(),
        rangosRef(tenantId).get(),
      ]);
      const cfg = cfgSnap.exists ? cfgSnap.data() : {};
      if (cfg.enabled === false) {
        return res.status(403).json({ ok: false, error: 'wallet_no_publicada' });
      }
      const premios = premiosSnap.docs.map((d) => d.data());
      const rangosCfg = rangosSnap.exists ? (rangosSnap.data().rangos || []) : [];

      const uNow = (await uRef.get()).data() || {};
      const disp = Number(uNow.sellosDisponibles) || 0;
      const hist = Number(uNow.sellosHistoricos) || disp;
      const { filled, target, hitos } = core.stampState(disp, premios);
      const rango = core.rangoNombre(hist, rangosCfg);

      // 4. Provisionar Google Wallet LoyaltyObject + generar Save URL.
      let saveUrlGoogle = null;
      let googleObjectId = null;
      try {
        const saKey = JSON.parse(WALLET_SA_KEY.value());
        // Class idempotente (por si el tenant nunca provisionó y sale registrando cliente 0).
        await core.upsertClass(saKey, core.buildClass(tenantId, cfg));
        const obj = core.buildObject(tenantId, uid, {
          accountName: nombre,
          filled, target, hitos, premios, rango,
          accent: cfg.accent, bg: cfg.bg, icon: cfg.stampIcon,
        });
        await core.upsertObject(saKey, obj);
        googleObjectId = obj.id;
        saveUrlGoogle = core.buildSaveUrl(saKey, {
          loyaltyObjects: [{ id: obj.id, classId: obj.classId }],
        });
        // Marca en user doc para el sync automático (walletSyncSelloTenant).
        await uRef.set({
          walletObjectId: obj.id,
          walletSavedAt: Timestamp.now(),
        }, { merge: true });
      } catch (e) {
        const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
        logger.error(`[Registro] Google Wallet falló (${tenantId}/${uid}): ${detail}`);
      }

      // 5. Apple: mint del link (Safari abre "Añadir a Apple Wallet"). Silencioso si no hay certs.
      const urlApple = await generarLinkApple(tenantId, uid, {}, true);

      logger.info(`[Registro] ${tenantId}/${uid} · ${nombre} <${email}> · google=${!!saveUrlGoogle} apple=${!!urlApple} · ${creado ? 'nuevo' : 'existente'}`);

      return res.status(200).json({
        ok: true,
        uid,
        creado,
        cliente: { nombre, email, telefono },
        saveUrlGoogle,
        urlApple,
        tenant: {
          nombre: tSnap.data().nombre || tenantId,
          logoUrl: cfg.logoUrl || null,
          accent: cfg.accent || '#c9a84c',
          bg: cfg.bg || '#0d0d0d',
        },
      });
    } catch (e) {
      logger.error('[Registro] error inesperado:', e);
      return res.status(500).json({ ok: false, error: 'internal' });
    }
  },
);
