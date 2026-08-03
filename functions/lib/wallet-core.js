'use strict';

// functions/lib/wallet-core.js
// ─────────────────────────────────────────────────────────────────
//  NÚCLEO GOOGLE WALLET (multi-tenant)
//
//  Issuer único de SynapTech: 3388000000023126417. Todas las clases y
//  objetos cuelgan de él:
//    LoyaltyClass  = {issuer}.{tenantId}           (branding + geo-push)
//    LoyaltyObject = {issuer}.{tenantId}_{uid}      (sellos del cliente)
//
//  Autenticación: service account wallet-issuer@barberia-elegance
//  (secret WALLET_SA_KEY, JSON completo). Scope wallet_object.issuer.
//
//  El pase es un ESPEJO de Firestore (users/{uid}.sellos*). Este módulo
//  no lee Firestore: recibe los datos ya resueltos y habla con la API.
// ─────────────────────────────────────────────────────────────────

const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { geofencePointsMulti, locationsFromConfig } = require('./wallet-geo');

const ISSUER_ID = '3388000000023126417';
const API = 'https://walletobjects.googleapis.com/walletobjects/v1';
const SCOPE = 'https://www.googleapis.com/auth/wallet_object.issuer';

// Marca del producto (bola de nieve): cada pase emitido lleva un tap-away a
// wallo.cl/crea. Cuando un cliente le muestra su tarjeta a un amigo, ese
// amigo (que puede ser dueño de otro local) llega al wizard en 1 toque.
// Es marketing compuesto, invisible y gratis — la tarjeta se autopromociona.
const WALLO_LINK = {
  uri: 'https://wallo.cl/crea',
  description: 'Wallo · Crea tu tarjeta digital',
  id: 'wallo-crea',
};

// Endpoint HTTP que dibuja las estampas (ver walletStampImg en wallet.js).
// El estado va en la URL → Google Wallet cachea cada combinación.
const IMG_BASE = `https://us-central1-barberia-elegance.cloudfunctions.net/walletStampImg`;

// Los IDs de Wallet solo admiten [A-Za-z0-9._-]. Saneamos tenant/uid.
function safe(s) {
  return String(s || '').replace(/[^A-Za-z0-9]/g, '');
}

function classIdFor(tenantId) {
  return `${ISSUER_ID}.${safe(tenantId)}`;
}

function objectIdFor(tenantId, uid) {
  return `${ISSUER_ID}.${safe(tenantId)}_${safe(uid)}`;
}

// ── Auth client (cacheado por client_email) ───────────────────────
const _authCache = new Map();
async function authClient(saKey) {
  const key = saKey.client_email;
  if (_authCache.has(key)) return _authCache.get(key);
  const auth = new GoogleAuth({
    credentials: { client_email: saKey.client_email, private_key: saKey.private_key },
    scopes: [SCOPE],
  });
  const client = await auth.getClient();
  _authCache.set(key, client);
  return client;
}

// ── URL de la imagen de estampas para un estado dado ──────────────
function stampImageUrl({ filled, target, accent, bg, icon, hitos }) {
  const c = String(accent || '#c9a84c').replace('#', '');
  let url = `${IMG_BASE}?f=${Math.max(0, filled | 0)}&t=${Math.max(1, target | 0)}&c=${encodeURIComponent(c)}`;
  if (bg) url += `&bg=${encodeURIComponent(String(bg).replace('#', ''))}`;
  if (icon && icon !== 'check') url += `&i=${encodeURIComponent(icon)}`;
  // Hitos intermedios (⭐ en esas casillas). Filtramos <target y unicos.
  if (Array.isArray(hitos) && hitos.length) {
    const t = Math.max(1, target | 0);
    const hs = Array.from(new Set(hitos.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x >= 1 && x < t)))
      .sort((a, b) => a - b);
    if (hs.length) url += `&h=${hs.join(',')}`;
  }
  return url;
}

// ── Estado de estampas (espejo de leerProxPremio en push-cliente.js) ──
//  Devuelve {filled, target} para el saldo actual: la tarjeta se llena
//  hacia el PRÓXIMO premio no alcanzado (o el mayor si ya los superó).
function stampState(sellosDisp, premios) {
  const disp = Math.max(0, Number(sellosDisp) || 0);
  const arr = (premios || [])
    .map((p) => Number(p.costoSellos))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (!arr.length) return { filled: Math.min(disp, 10), target: 10, hitos: [] };
  const proximo = arr.find((c) => disp < c);
  const target = proximo != null ? proximo : arr[arr.length - 1];
  // Hitos = premios anteriores al target (⭐ intermedias en la tira).
  // El target ya se pinta con ⭐ por su lado (isPrize en el renderer).
  const hitos = arr.filter((c) => c < target);
  return { filled: Math.min(disp, target), target, hitos };
}

// ── ¿Cruzó a un premio nuevo? (espejo de desbloqueoNuevo) ─────────
function premioDesbloqueado(dispAntes, dispDesp, premios) {
  const arr = (premios || [])
    .filter((p) => Number(p.costoSellos) > 0)
    .sort((a, b) => Number(a.costoSellos) - Number(b.costoSellos));
  const ganadoDe = (n) => [...arr].reverse().find((p) => n >= Number(p.costoSellos)) || null;
  const antes = ganadoDe(dispAntes);
  const desp = ganadoDe(dispDesp);
  if (desp && (!antes || antes.nombre !== desp.nombre)) return desp;
  return null;
}

// ── Rango por sellos históricos (espejo de calcTier / _rangoIdDe) ──
const RANGO_DEFAULTS = { silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
function rangoNombre(historicos, rangosCfg) {
  const h = Number(historicos) || 0;
  const id = h >= 25 ? 'platinum' : h >= 10 ? 'gold' : 'silver';
  const custom = (rangosCfg || []).find((r) => r.id === id);
  return (custom && custom.nombre) || RANGO_DEFAULTS[id];
}

// ── Constructores de recursos ─────────────────────────────────────
function buildClass(tenantId, cfg = {}) {
  const cls = {
    id: classIdFor(tenantId),
    issuerName: cfg.issuerName || 'SynapTech',
    programName: cfg.programName || 'Club de Fidelidad',
    reviewStatus: 'UNDER_REVIEW',
    hexBackgroundColor: (cfg.bg || '#0a0a0a'),
    // Tap-away a wallo.cl/crea (ver WALLO_LINK arriba). El link se muestra
    // como "Wallo · Crea tu tarjeta digital" en el pase.
    linksModuleData: { uris: [WALLO_LINK] },
  };
  if (cfg.logoUrl) cls.programLogo = { sourceUri: { uri: cfg.logoUrl } };
  // Geo-push: centro + anillo de puntos si hay geoRadius (ver wallet-geo.js).
  const geoPts = geofencePointsMulti(locationsFromConfig(cfg));
  if (geoPts.length) cls.locations = geoPts;
  return cls;
}

// Formato del QR del pase — lo lee la app /staff para sumar sellos.
// Prefix propio (SPTW = SynapTech Wallet) para distinguirlo de otros QR.
function staffBarcodeValue(tenantId, uid) {
  return `SPTW:${safe(tenantId)}:${safe(uid)}`;
}

// Formatea CLP sin decimales (ej: 5400 → "$5.400"). Apple/Google Wallet
// renderizan strings arbitrarios en loyaltyPoints — no hay tipo money nativo.
function formatCLP(n) {
  const v = Math.max(0, Math.round(Number(n) || 0));
  return '$' + v.toLocaleString('es-CL');
}

// modo: 'sellos' (default) | 'cashback' | 'prepago'.
// - sellos:   balance "N/M" + strip de estampas (heroImage renderer).
// - cashback: balance "$X" (cashbackDisponible), sin strip. Módulo "¿Cómo funciona?"
// - prepago:  balance "$X" (saldoPrepago), sin strip. Módulo "¿Cómo funciona?"
//   Coexisten: el dueño elige uno por tenant. Todo lo demás (QR, tap-away,
//   sync) es idéntico entre modos.
function buildObject(tenantId, uid, opts) {
  const {
    accountName, rango, accent, bg, icon, hitos, premios,
    // Sellos (default)
    filled, target,
    // Cashback
    modo, cashbackDisponible, cashbackPct,
    // Prepago
    saldoPrepago, prepagoBonusPct,
    // QR de staff — opt-in por tenant (configuracion/wallet.qrStaff).
    qrStaff,
    // Próxima cita del cliente (o null si no tiene ninguna agendada).
    proximaCita,
  } = opts || {};
  const esCashback = modo === 'cashback';
  const esPrepago  = modo === 'prepago';
  // Pase de participación (ferias, sorteos): no hay saldo ni sellos que
  // mostrar, solo la confirmación de que la persona quedó dentro.
  const esEvento   = modo === 'evento';

  const obj = {
    id: objectIdFor(tenantId, uid),
    classId: classIdFor(tenantId),
    state: 'ACTIVE',
    accountId: String(uid),
    accountName: accountName || 'Cliente',
    linksModuleData: { uris: [WALLO_LINK] },
  };

  // El QR solo sirve donde el sello se suma A MANO escaneando el pase
  // (locales wallet-only, app /staff). En un local con agenda el sello lo
  // pone sello-automatico.js al completar la cita, así que el QR es
  // decoración que confunde al cliente. Por eso es opt-in: sin el flag,
  // la tarjeta sale limpia.
  if (qrStaff === true) {
    obj.barcode = {
      type: 'QR_CODE',
      value: staffBarcodeValue(tenantId, uid),
      alternateText: String(uid).slice(0, 8),
    };
  }

  if (esEvento) {
    obj.loyaltyPoints = {
      label: 'Estado',
      balance: { string: opts.eventoEstado || 'Participando' },
    };
    // Google acepta una imagen ancha (1032×336 recomendado). Es el equivalente
    // del strip de Apple y el único lugar con espacio para arte del evento.
    if (opts.stripUrl) {
      obj.heroImage = { sourceUri: { uri: opts.stripUrl } };
    }
  } else if (esCashback) {
    obj.loyaltyPoints = { label: 'Saldo', balance: { string: formatCLP(cashbackDisponible) } };
  } else if (esPrepago) {
    obj.loyaltyPoints = { label: 'Saldo', balance: { string: formatCLP(saldoPrepago) } };
  } else {
    // Sellos (comportamiento default histórico).
    obj.loyaltyPoints = { label: 'Sellos', balance: { string: `${filled} / ${target}` } };
    obj.heroImage = { sourceUri: { uri: stampImageUrl({ filled, target, accent, bg, icon, hitos }) } };
  }

  // Próxima cita en el FRENTE del pase, junto al saldo de sellos. Es lo que
  // convierte la tarjeta en algo que se mira entre visitas y no solo en la
  // caja. Va en secondaryLoyaltyPoints porque es el único slot delantero que
  // ofrece la API; la decisión previa de no usar ese campo era para no meter
  // ahí el crédito de Corte al Lápiz (plata), no la agenda.
  //
  // El else NO es opcional: patchObject manda un PATCH real, así que omitir
  // el campo deja pegada la cita anterior y el pase pasaría a mentirle al
  // cliente cuando cancela o reagenda. Mismo gotcha que el barcode.
  if (!esEvento) {
    obj.secondaryLoyaltyPoints = proximaCita
      ? { label: 'Próxima cita', balance: { string: proximaCita.corta } }
      : { label: '', balance: { string: '' } };
  }

  const modules = [];
  // El rango es del programa de fidelidad; en un pase de evento no significa nada.
  if (rango && !esEvento) modules.push({ id: 'rango', header: 'Rango', body: rango });
  // Detalle de la cita (servicio y profesional) — no cabe en el frente.
  if (proximaCita && proximaCita.larga && !esEvento) {
    modules.push({ id: 'proximaCita', header: 'Tu próxima cita', body: proximaCita.larga });
  }
  if (esEvento) {
    if (opts.eventoFecha) modules.push({ id: 'cuando', header: 'Cuándo', body: opts.eventoFecha });
    modules.push({
      id: 'evento',
      header: '¿Cómo funciona?',
      body: opts.eventoInstrucciones
        || 'Ya estás participando. Si sales sorteado te avisamos y este pase se actualiza solo — no necesitas hacer nada más.',
    });
  }
  if (esCashback && cashbackPct) {
    modules.push({
      id: 'cashback',
      header: '¿Cómo funciona?',
      body: `Cada compra te devuelve ${cashbackPct}% en saldo Wallo. Úsalo cuando quieras — te lo descontamos al pagar.`,
    });
  }
  if (esPrepago) {
    const bonusTxt = prepagoBonusPct > 0
      ? `Recarga saldo en el local y descuéntalo cuando pagues. Bonus ${prepagoBonusPct}% en cada recarga.`
      : `Recarga saldo en el local y úsalo cuando pagues. Sin fecha de vencimiento visible al cliente.`;
    modules.push({ id: 'prepago', header: '¿Cómo funciona?', body: bonusTxt });
  }
  const recompensasBody = recompensasListText(premios);
  if (!esCashback && !esPrepago && !esEvento && recompensasBody) {
    modules.push({ id: 'recompensas', header: 'Recompensas', body: recompensasBody });
  }
  if (modules.length) obj.textModulesData = modules;
  return obj;
}

// Texto humano con la lista de recompensas por hito. Devuelve null si no
// hay premios definidos, para que buildObject no meta un módulo vacío.
// Ordena por costoSellos asc; corta nombres largos para no romper el pase.
function recompensasListText(premios) {
  const list = (premios || [])
    .filter((p) => Number(p.costoSellos) > 0 && (p.activo === undefined || p.activo === true))
    .map((p) => ({ costo: Number(p.costoSellos), nombre: String(p.nombre || 'Premio').slice(0, 60) }))
    .sort((a, b) => a.costo - b.costo);
  if (!list.length) return null;
  return list.map((p) => `Sello ${p.costo} · ${p.nombre}`).join('\n');
}

// ── CRUD contra la API (upsert idempotente por GET→PUT / POST) ─────
async function _upsert(saKey, resource, kind) {
  const client = await authClient(saKey);
  const url = `${API}/${kind}/${resource.id}`;
  try {
    await client.request({ url, method: 'GET' });
    await client.request({ url, method: 'PUT', data: resource });
    return 'updated';
  } catch (e) {
    if (e.response && e.response.status === 404) {
      await client.request({ url: `${API}/${kind}`, method: 'POST', data: resource });
      return 'created';
    }
    throw e;
  }
}

const upsertClass = (saKey, cls) => _upsert(saKey, cls, 'loyaltyClass');
const upsertObject = (saKey, obj) => _upsert(saKey, obj, 'loyaltyObject');

// PATCH parcial del objeto (sync de sellos/rango/heroImage).
async function patchObject(saKey, objectId, partial) {
  const client = await authClient(saKey);
  await client.request({
    url: `${API}/loyaltyObject/${objectId}`,
    method: 'PATCH',
    data: partial,
  });
}

// Mensaje/notificación al pase (hitos). Google lo empuja a los dispositivos
// que tengan el pase guardado.
async function addMessage(saKey, objectId, { header, body, id }) {
  const client = await authClient(saKey);
  await client.request({
    url: `${API}/loyaltyObject/${objectId}/addMessage`,
    method: 'POST',
    data: { message: { header, body, id: id || `m_${header}`.slice(0, 40), messageType: 'TEXT' } },
  });
}

// ── JWT "Save to Google Wallet" (RS256 con la private key de la SA) ──
function buildSaveUrl(saKey, { loyaltyObjects, loyaltyClasses, origins }) {
  const claims = {
    iss: saKey.client_email,
    aud: 'google',
    typ: 'savetowallet',
    payload: {},
  };
  if (loyaltyClasses && loyaltyClasses.length) claims.payload.loyaltyClasses = loyaltyClasses;
  if (loyaltyObjects && loyaltyObjects.length) claims.payload.loyaltyObjects = loyaltyObjects;
  if (origins && origins.length) claims.origins = origins;
  const token = jwt.sign(claims, saKey.private_key, { algorithm: 'RS256' });
  return `https://pay.google.com/gp/v/save/${token}`;
}

module.exports = {
  ISSUER_ID,
  WALLO_LINK,
  classIdFor,
  objectIdFor,
  stampImageUrl,
  stampState,
  premioDesbloqueado,
  rangoNombre,
  buildClass,
  buildObject,
  upsertClass,
  upsertObject,
  patchObject,
  addMessage,
  buildSaveUrl,
  staffBarcodeValue,
  recompensasListText,
  formatCLP,
};
