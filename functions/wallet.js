'use strict';

// functions/wallet.js
// ─────────────────────────────────────────────────────────────────
//  MÓDULO WALLETS — tarjetas de fidelidad Google Wallet (multi-tenant)
//
//  Exports:
//    walletStampImg          — HTTP: dibuja las estampas (heroImage). Público, sin secret.
//    walletProvisionarClase  — callable admin: crea/actualiza el LoyaltyClass del tenant.
//    walletGenerarPase       — callable cliente: crea su LoyaltyObject y devuelve el "Save" URL.
//    walletSyncSelloElegance — trigger users/{uid}: sincroniza el pase al cambiar sellos.
//    walletSyncSelloTenant   — trigger tenants/{tid}/users/{uid}: idem multi-tenant.
//
//  Los triggers de sync también avisan a Apple Wallet (APNs) si el
//  cliente guardó su pase en iPhone — ver wallet-apple.js.
//
//  Fuente de verdad = Firestore (users/{uid}.sellos*). El pase es espejo.
//  Config del tenant en {tid}/configuracion/wallet. Secret: WALLET_SA_KEY
//  (JSON completo de la service account wallet-issuer@barberia-elegance).
//
//  DEPLOY:
//    firebase deploy --only functions:walletStampImg,functions:walletProvisionarClase,\
//      functions:walletGenerarPase,functions:walletSyncSelloElegance,functions:walletSyncSelloTenant
// ─────────────────────────────────────────────────────────────────

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const core = require('./lib/wallet-core');
const citaLib = require('./lib/wallet-cita');   // próxima cita en el pase
const { renderStampStrip } = require('./lib/wallet-render');
// Apple Wallet: el sync de sellos también avisa a los iPhones (APNs).
const appleWallet = require('./wallet-apple');

const db = admin.firestore();
const WALLET_SA_KEY = defineSecret('WALLET_SA_KEY');
const SUPERADMINS = ['ignaciiio.mate@gmail.com'];

// ── Rutas por tenant (mismo criterio que sello-automatico / push-cliente) ──
const premiosCol   = (tid) => db.collection(tid === 'elegance' ? 'premios' : `tenants/${tid}/premios`);
const rangosRef    = (tid) => db.doc(tid === 'elegance' ? 'configuracion/rangos'  : `tenants/${tid}/configuracion/rangos`);
const walletCfgRef = (tid) => db.doc(tid === 'elegance' ? 'configuracion/wallet'  : `tenants/${tid}/configuracion/wallet`);
const userRef      = (tid, uid) => db.doc(tid === 'elegance' ? `users/${uid}` : `tenants/${tid}/users/${uid}`);
// Flag PAGADO (add-on): _billing/{tid}.walletActivo. Solo SynapTech (bootstrap)
// puede escribirlo (ver firestore.rules), el staff del tenant solo lo lee.
const billingRef   = (tid) => db.doc(`_billing/${tid}`);

function saKey() {
  return JSON.parse(WALLET_SA_KEY.value());
}

// ¿El local pagó el módulo Wallet? Gate de monetización, server-side.
async function walletActivo(tid) {
  try {
    const snap = await billingRef(tid).get();
    return snap.exists ? snap.data().walletActivo === true : false;
  } catch (_) { return false; }
}

async function leerPremios(tid) {
  try {
    const snap = await premiosCol(tid).get();
    return snap.docs.map((d) => d.data());
  } catch (_) { return []; }
}
async function leerRangosCfg(tid) {
  try {
    const snap = await rangosRef(tid).get();
    return snap.exists ? (snap.data().rangos || []) : [];
  } catch (_) { return []; }
}
async function leerWalletCfg(tid) {
  try {
    const snap = await walletCfgRef(tid).get();
    return snap.exists ? (snap.data() || {}) : {};
  } catch (_) { return {}; }
}

// ═══════════════════════════════════════════════════════════════
//  1) HTTP — imagen de estampas (heroImage). Estado en la URL.
//     ?f=<filled>&t=<target>&c=<hex sin #>. Público, cacheable.
// ═══════════════════════════════════════════════════════════════
exports.walletStampImg = onRequest({ region: 'us-central1', cors: true }, (req, res) => {
  try {
    const filled = parseInt(req.query.f, 10) || 0;
    const target = parseInt(req.query.t, 10) || 10;
    const accent = '#' + String(req.query.c || 'c9a84c').replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    const bg = req.query.bg ? '#' + String(req.query.bg).replace(/[^0-9a-fA-F]/g, '').slice(0, 6) : undefined;
    const icon = String(req.query.i || 'check').replace(/[^a-z]/g, '').slice(0, 12);
    // Hitos (opcional): "?h=3,5,10" → estrella en esas casillas intermedias.
    const hitos = String(req.query.h || '')
      .split(',')
      .map((x) => parseInt(x, 10))
      .filter((x) => Number.isFinite(x) && x >= 1 && x <= 40);
    const png = renderStampStrip({ filled, target, accent, bg, icon, hitos });
    // Estado inmutable por URL → cache larga (Google Wallet cachea por su lado).
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Content-Type', 'image/png');
    res.status(200).send(png);
  } catch (e) {
    logger.error('[Wallet img] error:', e);
    res.status(500).send('render error');
  }
});

// ═══════════════════════════════════════════════════════════════
//  1b) HTTP — logo fallback (660x660) para cuando el dueño aún no
//      subió el suyo. Google Wallet EXIGE programLogo o rechaza el
//      LoyaltyClass con 400. Este endpoint pinta las iniciales del
//      negocio sobre un círculo del color acento, así el módulo
//      NUNCA falla por logo faltante durante el onboarding.
//
//      Uso: /walletFallbackLogo?text=BP&c=d4af37&bg=1a1207
//      · text: 1-3 letras (default 'B')
//      · c:    hex del texto (default blanco/negro según luminosidad del bg)
//      · bg:   hex del fondo (default #d4af37)
// ═══════════════════════════════════════════════════════════════
exports.walletFallbackLogo = onRequest({ region: 'us-central1', cors: true }, (req, res) => {
  try {
    const { createCanvas } = require('@napi-rs/canvas');
    const SZ = 660;
    const raw = String(req.query.text || 'B').toUpperCase().replace(/[^A-Z0-9ÑÁÉÍÓÚ]/g, '').slice(0, 3) || 'B';
    const bgHex = '#' + String(req.query.bg || 'd4af37').replace(/[^0-9a-fA-F]/g, '').slice(0, 6).padEnd(6, '0');
    // Color de texto: si viene por query úsalo, si no auto-contraste.
    const toRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const lum   = (h) => { const [r, g, b] = toRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
    const auto  = lum(bgHex) > 0.6 ? '#0b0b0b' : '#ffffff';
    const fgHex = req.query.c
      ? '#' + String(req.query.c).replace(/[^0-9a-fA-F]/g, '').slice(0, 6).padEnd(6, '0')
      : auto;

    const c = createCanvas(SZ, SZ);
    const ctx = c.getContext('2d');

    // Fondo circular con degradado suave (efecto premium simple).
    const grad = ctx.createLinearGradient(0, 0, SZ, SZ);
    // Sombreamos el color del centro un poco hacia negro/blanco según luminosidad.
    const mixHex = (h, target, amt) => {
      const a = toRgb(h);
      return '#' + a.map((v) => {
        const m = Math.round(v + (target - v) * amt);
        return Math.max(0, Math.min(255, m)).toString(16).padStart(2, '0');
      }).join('');
    };
    grad.addColorStop(0, mixHex(bgHex, lum(bgHex) > 0.6 ? 0 : 255, 0.12));
    grad.addColorStop(1, bgHex);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(SZ / 2, SZ / 2, SZ / 2, 0, Math.PI * 2);
    ctx.fill();

    // Anillo interior sutil para dar profundidad.
    ctx.strokeStyle = mixHex(bgHex, lum(bgHex) > 0.6 ? 0 : 255, 0.18);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(SZ / 2, SZ / 2, SZ / 2 - 14, 0, Math.PI * 2);
    ctx.stroke();

    // Texto centrado. Tamaño se ajusta al largo (1 letra grande, 3 letras chicas).
    const fontSize = raw.length === 1 ? 340 : raw.length === 2 ? 240 : 180;
    ctx.fillStyle = fgHex;
    ctx.font = `900 ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Ligera sombra para separar del fondo cuando los colores son parecidos.
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur  = 8;
    ctx.shadowOffsetY = 4;
    ctx.fillText(raw, SZ / 2, SZ / 2 + fontSize * 0.03);

    const png = c.toBuffer('image/png');
    // Cache larga: el output es puramente función de query.
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Content-Type', 'image/png');
    res.status(200).send(png);
  } catch (e) {
    logger.error('[Wallet fallback logo] error:', e);
    res.status(500).send('render error');
  }
});

// ═══════════════════════════════════════════════════════════════
//  2) CALLABLE (admin) — provisiona/actualiza el LoyaltyClass del tenant
// ═══════════════════════════════════════════════════════════════
exports.walletProvisionarClase = onCall(
  { region: 'us-central1', cors: true, secrets: [WALLET_SA_KEY] },
  async (request) => {
    const callerEmail  = (request.auth?.token?.email || '').toLowerCase();
    const callerRole   = request.auth?.token?.role;
    const callerTenant = request.auth?.token?.tenantId;
    const { tenantId, config } = request.data || {};

    if (!tenantId || typeof tenantId !== 'string') {
      throw new HttpsError('invalid-argument', 'tenantId requerido.');
    }
    const isSuperadmin  = SUPERADMINS.includes(callerEmail);
    // admin|jefe|recepcion del PROPIO tenant: el front (wallets.bioo.cl) ya
    // dejaba entrar a jefe y este gate lo rechazaba — quedaban a mitad de
    // camino. Recepción se sumó el 07-08 (pedido Kronnos: cada recepcionista
    // de sede edita la wallet de su local); diseñar la tarjeta no expone
    // números del negocio.
    const isTenantStaff = ['admin', 'jefe', 'recepcion'].includes(callerRole) && callerTenant === tenantId;
    if (!isSuperadmin && !isTenantStaff) {
      throw new HttpsError('permission-denied', 'Solo el equipo del local puede configurar el wallet.');
    }
    // Gate de add-on: sin pago no se puede provisionar (superadmin exento).
    if (!isSuperadmin && !(await walletActivo(tenantId))) {
      throw new HttpsError('failed-precondition', 'El módulo Wallet no está activo para este local. Contáctanos para activarlo.');
    }

    const cfg = config && typeof config === 'object' ? config : {};

    // Fallback de logo: Google Wallet exige programLogo o rechaza el
    // LoyaltyClass con 400. Si el dueño no lo subió, generamos uno con
    // sus iniciales sobre el color de acento — la clase nunca falla.
    if (!cfg.logoUrl) {
      try {
        const tSnap = await db.doc(`tenants/${tenantId}`).get();
        const tData = tSnap.exists ? tSnap.data() : {};
        const nombre = String(cfg.programName || tData.nombre || tenantId || 'B').trim();
        const iniciales = nombre
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map(w => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 3) || 'B';
        const bg = String(cfg.accent || cfg.bg || '#d4af37').replace('#', '');
        cfg.logoUrl = `https://us-central1-barberia-elegance.cloudfunctions.net/walletFallbackLogo?text=${encodeURIComponent(iniciales)}&bg=${bg}`;
        logger.info(`[Wallet] usando logo fallback para ${tenantId}: ${iniciales}`);
      } catch (e) {
        // Si algo raro pasa, dejamos que Google devuelva el 400 y el usuario lo ve.
        logger.warn(`[Wallet] fallback logo falló ${tenantId}: ${e.message}`);
      }
    }

    // Persistir config (branding, geo, color, enabled) para sync e imágenes.
    try {
      await walletCfgRef(tenantId).set(
        { ...cfg, updatedAt: admin.firestore.Timestamp.now() },
        { merge: true },
      );
    } catch (e) {
      logger.warn(`[Wallet] no se pudo guardar config (${tenantId}): ${e.message}`);
    }

    try {
      const cls = core.buildClass(tenantId, cfg);
      const result = await core.upsertClass(saKey(), cls);
      logger.info(`[Wallet] clase ${cls.id} ${result} by ${callerEmail}`);
      return { ok: true, classId: cls.id, result };
    } catch (e) {
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      logger.error(`[Wallet] provisionar clase (${tenantId}) falló: ${detail}`);
      throw new HttpsError('internal', 'No se pudo provisionar la tarjeta. Revisa los datos e intenta de nuevo.');
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  2b) CALLABLE (superadmin) — activa/desactiva el add-on por tenant
//      Add-on manual a la mensualidad: SynapTech lo enciende al cobrar.
//      Escribe _billing/{tid}.walletActivo (protegido por rules).
// ═══════════════════════════════════════════════════════════════
exports.walletActivarTenant = onCall({ region: 'us-central1', cors: true }, async (request) => {
  const callerEmail = (request.auth?.token?.email || '').toLowerCase();
  if (!SUPERADMINS.includes(callerEmail)) {
    throw new HttpsError('permission-denied', 'Solo SynapTech puede activar el módulo.');
  }
  const { tenantId, activo } = request.data || {};
  if (!tenantId || typeof tenantId !== 'string') {
    throw new HttpsError('invalid-argument', 'tenantId requerido.');
  }
  const on = activo !== false;
  await billingRef(tenantId).set(
    {
      walletActivo: on,
      walletDesde: on ? admin.firestore.Timestamp.now() : admin.firestore.FieldValue.delete(),
    },
    { merge: true },
  );
  // Al desactivar, apagamos el toggle del tenant para ocultar el botón al cliente.
  if (!on) {
    try { await walletCfgRef(tenantId).set({ enabled: false }, { merge: true }); } catch (_) {}
  }
  logger.info(`[Wallet] add-on tenant ${tenantId} walletActivo=${on} by ${callerEmail}`);
  return { ok: true, tenantId, walletActivo: on };
});

// ═══════════════════════════════════════════════════════════════
//  3) CALLABLE (cliente) — crea su LoyaltyObject y devuelve el Save URL
// ═══════════════════════════════════════════════════════════════
exports.walletGenerarPase = onCall(
  { region: 'us-central1', cors: true, secrets: [WALLET_SA_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const tenantId = (request.data?.tenantId || 'elegance').toString();

    const [uSnap, premios, rangosCfg, cfg] = await Promise.all([
      userRef(tenantId, uid).get(),
      leerPremios(tenantId),
      leerRangosCfg(tenantId),
      leerWalletCfg(tenantId),
    ]);
    if (!(await walletActivo(tenantId))) {
      throw new HttpsError('failed-precondition', 'El wallet no está disponible en este local.');
    }
    if (cfg.enabled === false) {
      throw new HttpsError('failed-precondition', 'El wallet no está activo para este local.');
    }
    const u = uSnap.exists ? uSnap.data() : {};
    const disp = Number(u.sellosDisponibles ?? u.stamps ?? 0);
    const hist = Number(u.sellosHistoricos ?? disp);
    const accent = cfg.accent || '#c9a84c';
    const bg = cfg.bg; const icon = cfg.stampIcon;
    const { filled, target, hitos } = core.stampState(disp, premios);
    const rango = core.rangoNombre(hist, rangosCfg);
    const accountName = u.nombre || u.displayName || 'Cliente';
    // Modo: sellos (default) | cashback | prepago. buildObject renderiza
    // según el modo — sellos muestra la strip de estampas, los otros dos
    // muestran saldo $. Config específica por modo se lee acá.
    const modo = (cfg.modo === 'cashback' || cfg.modo === 'prepago') ? cfg.modo : 'sellos';
    const cashbackDisponible = Number(u.cashbackDisponible) || 0;
    const cashbackPct = Number(cfg.cashback && cfg.cashback.porcentaje) || 5;
    const saldoPrepago = Number(u.saldoPrepago) || 0;
    const prepagoBonusPct = Number(cfg.prepago && cfg.prepago.bonusRecarga) || 0;

    try {
      const key = saKey();
      // Asegurar la clase (idempotente) por si el admin solo activó sin provisionar.
      await core.upsertClass(key, core.buildClass(tenantId, cfg));

      const cita = await citaLib.leerProximaCita(tenantId, uid);
      const obj = core.buildObject(tenantId, uid, {
        accountName, filled, target, hitos, premios, rango, accent, bg, icon,
        modo, cashbackDisponible, cashbackPct, saldoPrepago, prepagoBonusPct,
        proximaCita: cita
          ? { corta: citaLib.citaCorta(cita), larga: citaLib.citaLarga(cita) }
          : null,
        qrStaff: cfg.qrStaff === true,
        eventoEstado: cfg.eventoEstado,
        eventoFecha: cfg.eventoFecha,
        eventoInstrucciones: cfg.eventoInstrucciones,
        stripUrl: cfg.stripUrl,
      });
      await core.upsertObject(key, obj);

      // Guardar el vínculo en el user doc → habilita el sync automático.
      await userRef(tenantId, uid).set(
        { walletObjectId: obj.id, walletSavedAt: admin.firestore.Timestamp.now() },
        { merge: true },
      );

      const origin = request.rawRequest?.headers?.origin;
      const saveUrl = core.buildSaveUrl(key, {
        loyaltyObjects: [{ id: obj.id, classId: obj.classId }],
        origins: origin ? [origin] : undefined,
      });
      logger.info(`[Wallet] pase ${obj.id} generado (${filled}/${target}, ${rango})`);
      return { ok: true, saveUrl, objectId: obj.id };
    } catch (e) {
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      logger.error(`[Wallet] generar pase (${tenantId}/${uid}) falló: ${detail}`);
      throw new HttpsError('internal', 'No pudimos crear tu tarjeta. Reintenta en un momento.');
    }
  },
);

// ═══════════════════════════════════════════════════════════════
//  4) SYNC — al cambiar los sellos, actualiza el pase (espejo push-cliente)
//     Google: PATCH directo al objeto. Apple: bump + APNs (el iPhone
//     viene solo a buscar el .pkpass fresco a walletAppleWs).
// ═══════════════════════════════════════════════════════════════
async function syncPase(tenantId, uid, before, after) {
  const objectId = after?.walletObjectId;          // Google
  const appleSerial = after?.appleWalletSerial;    // Apple
  if (!objectId && !appleSerial) return; // el cliente aún no guardó tarjeta

  const dispAntes = Number(before?.sellosDisponibles ?? before?.stamps ?? 0);
  const dispDesp  = Number(after?.sellosDisponibles  ?? after?.stamps  ?? 0);
  const histAntes = Number(before?.sellosHistoricos ?? 0);
  const histDesp  = Number(after?.sellosHistoricos  ?? 0);
  // Modos transaccionales: watch saldo cashback + prepago además de sellos.
  const cbAntes = Number(before?.cashbackDisponible ?? 0);
  const cbDesp  = Number(after?.cashbackDisponible  ?? 0);
  const spAntes = Number(before?.saldoPrepago ?? 0);
  const spDesp  = Number(after?.saldoPrepago  ?? 0);
  if (dispAntes === dispDesp && histAntes === histDesp && cbAntes === cbDesp && spAntes === spDesp) return;

  if (objectId) {
    try {
      const [premios, rangosCfg, cfg] = await Promise.all([
        leerPremios(tenantId),
        leerRangosCfg(tenantId),
        leerWalletCfg(tenantId),
      ]);
      const accent = cfg.accent || '#c9a84c';
      const bg = cfg.bg; const icon = cfg.stampIcon;
      const modo = (cfg.modo === 'cashback' || cfg.modo === 'prepago') ? cfg.modo : 'sellos';
      const cashbackPct = Number(cfg.cashback && cfg.cashback.porcentaje) || 5;
      const prepagoBonusPct = Number(cfg.prepago && cfg.prepago.bonusRecarga) || 0;
      const { filled, target, hitos } = core.stampState(dispDesp, premios);
      const rango = core.rangoNombre(histDesp, rangosCfg);

      // Módulos: rango + explicación según modo (o recompensas en sellos).
      const textModules = [{ id: 'rango', header: 'Rango', body: rango }];
      // La próxima cita se relee acá aunque este sync lo dispare un sello:
      // textModulesData se manda COMPLETO y reemplaza el array entero, así
      // que omitirla borraría el módulo de la cita en el próximo sello.
      const citaSync = await citaLib.leerProximaCita(tenantId, uid);
      if (citaSync) {
        const larga = citaLib.citaLarga(citaSync);
        if (larga) textModules.push({ id: 'proximaCita', header: 'Tu próxima cita', body: larga });
      }
      if (modo === 'cashback') {
        textModules.push({ id: 'cashback', header: '¿Cómo funciona?',
          body: `Cada compra te devuelve ${cashbackPct}% en saldo Wallo. Úsalo cuando quieras — te lo descontamos al pagar.` });
      } else if (modo === 'prepago') {
        const bonusTxt = prepagoBonusPct > 0
          ? `Recarga saldo en el local y descuéntalo cuando pagues. Bonus ${prepagoBonusPct}% en cada recarga.`
          : `Recarga saldo en el local y úsalo cuando pagues. Sin fecha de vencimiento visible al cliente.`;
        textModules.push({ id: 'prepago', header: '¿Cómo funciona?', body: bonusTxt });
      } else {
        const recompensasBody = core.recompensasListText(premios);
        if (recompensasBody) textModules.push({ id: 'recompensas', header: 'Recompensas', body: recompensasBody });
      }

      // Balance del pase según modo — cashback/prepago muestran saldo $;
      // sellos mantiene "N/M" + strip.
      const balance = modo === 'cashback'
        ? core.formatCLP(cbDesp)
        : (modo === 'prepago'
            ? core.formatCLP(spDesp)
            : `${filled} / ${target}`);
      const label = (modo === 'cashback' || modo === 'prepago') ? 'Saldo' : 'Sellos';
      const patch = {
        loyaltyPoints: { label, balance: { string: balance } },
        textModulesData: textModules,
        // Frente del pase. El vacío explícito no es opcional: esto es un
        // PATCH y omitir el campo dejaría pegada una cita ya pasada.
        secondaryLoyaltyPoints: citaSync
          ? { label: 'Próxima cita', balance: { string: citaLib.citaCorta(citaSync) } }
          : { label: '', balance: { string: '' } },
        // QR de staff: solo donde el sello se suma escaneando (qrStaff:true).
        // Apagado NO basta con omitirlo — el pase ya emitido lo conserva —,
        // así que se pisa con BARCODE_TYPE_UNSPECIFIED, que es el valor de
        // la API para "sin código", y desaparece en el próximo sync.
        barcode: cfg.qrStaff === true
          ? {
            type: 'QR_CODE',
            value: core.staffBarcodeValue(tenantId, uid),
            alternateText: String(uid).slice(0, 8),
          }
          : { type: 'BARCODE_TYPE_UNSPECIFIED' },
        // Backfill del tap-away Wallo en pases ya emitidos.
        linksModuleData: { uris: [core.WALLO_LINK] },
      };
      // Sólo modo sellos actualiza la strip. Los modos transaccionales
      // (cashback/prepago) mantienen la hero como está (o inexistente).
      if (modo === 'sellos') {
        patch.heroImage = { sourceUri: { uri: core.stampImageUrl({ filled, target, accent, bg, icon, hitos }) } };
      }
      await core.patchObject(key, objectId, patch);

      // Hito: desbloqueó un premio nuevo → notificación automática al pase.
      if (dispDesp > dispAntes) {
        const nuevo = core.premioDesbloqueado(dispAntes, dispDesp, premios);
        if (nuevo) {
          await core.addMessage(key, objectId, {
            header: '🎁 ¡Premio disponible!',
            body: `Ya puedes canjear: ${nuevo.nombre}.`,
            id: `premio_${target}_${Date.now()}`.slice(0, 40),
          });
        }
      }
      logger.info(`[Wallet sync] ${objectId}: ${filled}/${target} (${rango})`);
    } catch (e) {
      // Google no puede bloquear el sync de Apple (y viceversa).
      logger.error(`[Wallet sync] Google (${objectId}):`, e.response?.data || e.message);
    }
  }

  if (appleSerial) {
    try {
      await appleWallet.notificarCambioPase(appleSerial);
    } catch (e) {
      logger.warn(`[Wallet sync] Apple (${appleSerial}): ${e.message}`);
    }
  }
}

exports.walletSyncSelloElegance = onDocumentWritten(
  { document: 'users/{uid}', region: 'us-central1', secrets: [WALLET_SA_KEY, ...appleWallet.APPLE_SECRETS] },
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return null;
    try { await syncPase('elegance', event.params.uid, event.data?.before?.data(), after); }
    catch (e) { logger.error(`[Wallet sync] elegance/${event.params.uid}:`, e.response?.data || e.message); }
    return null;
  },
);

exports.walletSyncSelloTenant = onDocumentWritten(
  { document: 'tenants/{tid}/users/{uid}', region: 'us-central1', secrets: [WALLET_SA_KEY, ...appleWallet.APPLE_SECRETS] },
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return null;
    try { await syncPase(event.params.tid, event.params.uid, event.data?.before?.data(), after); }
    catch (e) { logger.error(`[Wallet sync] ${event.params.tid}/${event.params.uid}:`, e.response?.data || e.message); }
    return null;
  },
);

/* ═══ Próxima cita en el pase ══════════════════════════════════════
   syncPase solo se dispara cuando cambian los sellos, así que sin este
   trigger la cita quedaría congelada al valor que tenía cuando el
   cliente ganó su último sello: agendar no la mostraría y cancelar no
   la borraría. Un pase que muestra una cita cancelada es peor que uno
   sin cita, porque el cliente se guía por él.

   Se dispara con CUALQUIER escritura de la cita (crear, reagendar,
   cancelar, completar) y sale barato: si el cliente no tiene pase
   guardado, es un solo get al user doc y corta.                      */
async function syncCitaEnPase(tenantId, uid) {
  if (!uid) return;
  const uSnap = await userRef(tenantId, uid).get();
  const u = uSnap.exists ? uSnap.data() : {};
  const objectId = u.walletObjectId;
  const appleSerial = u.appleWalletSerial;
  if (!objectId && !appleSerial) return;   // sin tarjeta guardada, nada que hacer

  const cita = await citaLib.leerProximaCita(tenantId, uid);

  if (objectId) {
    try {
      // Se re-arma textModulesData completo (rango + recompensas + cita)
      // porque el PATCH reemplaza el array entero: mandar solo la cita
      // borraría el rango y las recompensas del pase.
      const [premios, rangosCfg] = await Promise.all([
        leerPremios(tenantId),
        leerRangosCfg(tenantId),
      ]);
      const hist = Number(u.sellosHistoricos ?? u.sellosDisponibles ?? 0);
      const rango = core.rangoNombre(hist, rangosCfg);

      const textModules = [{ id: 'rango', header: 'Rango', body: rango }];
      if (cita) {
        const larga = citaLib.citaLarga(cita);
        if (larga) textModules.push({ id: 'proximaCita', header: 'Tu próxima cita', body: larga });
      }
      const recompensasBody = core.recompensasListText(premios);
      if (recompensasBody) textModules.push({ id: 'recompensas', header: 'Recompensas', body: recompensasBody });

      await core.patchObject(saKey(), objectId, {
        textModulesData: textModules,
        secondaryLoyaltyPoints: cita
          ? { label: 'Próxima cita', balance: { string: citaLib.citaCorta(cita) } }
          : { label: '', balance: { string: '' } },
      });
      logger.info(`[Wallet cita] ${objectId}: ${cita ? citaLib.citaCorta(cita) : 'sin cita'}`);
    } catch (e) {
      logger.error(`[Wallet cita] Google (${objectId}):`, e.response?.data || e.message);
    }
  }

  if (appleSerial) {
    // Apple regenera el .pkpass entero al recibir el aviso, y ahí
    // generarPkpass vuelve a leer la cita — no hay nada que mandarle.
    try { await appleWallet.notificarCambioPase(appleSerial); }
    catch (e) { logger.warn(`[Wallet cita] Apple (${appleSerial}): ${e.message}`); }
  }
}

/** uid del cliente de una cita, mirando antes y después del cambio: al
 *  cancelar hay que actualizar el pase del dueño de la cita BORRADA. */
function uidsDeCita(before, after) {
  const ids = new Set();
  for (const c of [before, after]) {
    const uid = c && (c.clienteUid || c.userId);
    if (uid) ids.add(String(uid));
  }
  return [...ids];
}

exports.walletCitaElegance = onDocumentWritten(
  { document: 'citas/{citaId}', region: 'us-central1', secrets: [WALLET_SA_KEY, ...appleWallet.APPLE_SECRETS] },
  async (event) => {
    const uids = uidsDeCita(event.data?.before?.data(), event.data?.after?.data());
    for (const uid of uids) {
      try { await syncCitaEnPase('elegance', uid); }
      catch (e) { logger.error(`[Wallet cita] elegance/${uid}:`, e.response?.data || e.message); }
    }
    return null;
  },
);

exports.walletCitaTenant = onDocumentWritten(
  { document: 'tenants/{tid}/citas/{citaId}', region: 'us-central1', secrets: [WALLET_SA_KEY, ...appleWallet.APPLE_SECRETS] },
  async (event) => {
    const uids = uidsDeCita(event.data?.before?.data(), event.data?.after?.data());
    for (const uid of uids) {
      try { await syncCitaEnPase(event.params.tid, uid); }
      catch (e) { logger.error(`[Wallet cita] ${event.params.tid}/${uid}:`, e.response?.data || e.message); }
    }
    return null;
  },
);
