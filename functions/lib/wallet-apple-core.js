'use strict';

// functions/lib/wallet-apple-core.js
// ─────────────────────────────────────────────────────────────────
//  NÚCLEO APPLE WALLET (multi-tenant) — espejo de wallet-core.js
//
//  A diferencia de Google (API central), en Apple el pase es un archivo
//  .pkpass que NOSOTROS firmamos y servimos. Identidad:
//    Pass Type ID único de SynapTech + serialNumber = {tenantId}_{uid}
//  (espejo del par LoyaltyClass/LoyaltyObject de Google).
//
//  Actualizaciones: el iPhone se registra en nuestro web service
//  (walletAppleWs) y se le avisa por APNs con payload vacío; el
//  dispositivo viene a buscar el .pkpass regenerado.
//
//  Autenticación: certificado del Pass Type ID (secrets APPLE_PASS_CERT
//  + APPLE_PASS_KEY, PEM) + intermedio WWDR G4 (assets/, público).
//  El MISMO certificado firma los pases y autentica contra APNs.
//
//  Igual que wallet-core: este módulo NO lee Firestore — recibe los
//  datos ya resueltos y produce el pase / los pushes.
// ─────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const http2 = require('http2');
const { PKPass } = require('passkit-generator');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { renderStampStrip, renderIcon } = require('./wallet-render');

// ── Identidad Apple (completar al terminar el enrollment) ─────────
//  TODO(Ignacio): cuando Apple apruebe la cuenta:
//   1. TEAM_ID: developer.apple.com/account → Membership details.
//   2. Crear el Pass Type ID con EXACTAMENTE este identifier (o
//      actualizar la constante si eliges otro).
const TEAM_ID = 'REEMPLAZAR_TEAM_ID';
const PASS_TYPE_ID = 'pass.cl.synaptechspa.fidelidad';

// Web service de actualizaciones (Apple le agrega /v1/... al final).
const WS_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/walletAppleWs';

const APNS_HOST = 'https://api.push.apple.com';

// ¿Ya se completaron los datos del enrollment? Gate para no emitir
// pases con Team ID placeholder.
function configurado() {
  return !/REEMPLAZAR/.test(TEAM_ID);
}

// Mismo saneo que wallet-core: [A-Za-z0-9] para serial estable.
function safe(s) {
  return String(s || '').replace(/[^A-Za-z0-9]/g, '');
}

function serialFor(tenantId, uid) {
  return `${safe(tenantId)}_${safe(uid)}`;
}

// authenticationToken del pase (spec Apple: mínimo 16 chars).
function nuevoAuthToken() {
  return crypto.randomBytes(20).toString('hex');
}

// ── Colores: Apple exige formato rgb(r, g, b) en pass.json ────────
function hexToRgb(hex, fallback) {
  let s = String(hex || '').replace(/[^0-9a-fA-F]/g, '');
  if (s.length === 3) s = s.split('').map((x) => x + x).join('');
  if (s.length !== 6) s = String(fallback).replace('#', '');
  const n = parseInt(s, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

// ── Logo del tenant (cfg.logoUrl) → PNG contain 320×100 (@2x) ─────
//  Cualquier formato que decodifique canvas (png/jpg/webp). Si falla,
//  se omite: el pase muestra logoText igual (lo renderiza iOS).
async function fetchLogoPng(url) {
  if (!url || !/^https?:\/\//i.test(String(url))) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const img = await loadImage(Buffer.from(await res.arrayBuffer()));
    const out = { w: 320, h: 100 };
    const scale = Math.min(out.w / img.width, out.h / img.height, 1);
    const dw = Math.max(1, Math.round(img.width * scale));
    const dh = Math.max(1, Math.round(img.height * scale));
    const canvas = createCanvas(dw, dh);
    canvas.getContext('2d').drawImage(img, 0, 0, dw, dh);
    return canvas.toBuffer('image/png');
  } catch (_) {
    return null;
  }
}

// ── pass.json (storeCard = el "LoyaltyObject" de Apple) ───────────
function buildPassJson({ uid, serial, authToken, accountName, filled, target, rango, cfg = {} }) {
  const organizationName = cfg.issuerName || 'SynapTech';
  const p = {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    teamIdentifier: TEAM_ID,
    organizationName,
    description: `${cfg.programName || 'Club de Fidelidad'} — tarjeta de sellos`,
    serialNumber: serial,
    webServiceURL: WS_URL,
    authenticationToken: authToken,
    backgroundColor: hexToRgb(cfg.bg, '#0a0a0a'),
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: hexToRgb(cfg.accent, '#c9a84c'),
    logoText: cfg.programName || 'Club de Fidelidad',
    sharingProhibited: true,
    storeCard: {
      // changeMessage → iOS notifica solo al actualizar el pase.
      headerFields: [
        { key: 'sellos', label: 'SELLOS', value: `${filled} / ${target}`, changeMessage: 'Sellos: %@' },
      ],
      secondaryFields: [
        { key: 'cliente', label: 'CLIENTE', value: accountName || 'Cliente' },
        { key: 'rango', label: 'RANGO', value: rango || 'Silver', changeMessage: 'Nuevo rango: %@' },
      ],
      backFields: [
        {
          key: 'como',
          label: '¿Cómo funciona?',
          value: 'Junta sellos con cada visita y canjéalos por premios en el local. Tu tarjeta se actualiza sola.',
        },
        { key: 'powered', label: 'Tarjeta digital', value: 'Powered by SynapTech — synaptechspa.cl' },
      ],
    },
    // QR con el uid (espejo del accountId de Google) para canje en local.
    barcodes: [
      { format: 'PKBarcodeFormatQR', message: String(uid), messageEncoding: 'iso-8859-1', altText: 'Tu código de cliente' },
    ],
  };

  // Geo NATIVO de Apple: el pase aparece en pantalla bloqueada cerca
  // del local (espejo de locations del LoyaltyClass).
  const lat = Number(cfg.location && cfg.location.lat);
  const lng = Number(cfg.location && cfg.location.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    p.locations = [{
      latitude: lat,
      longitude: lng,
      relevantText: cfg.geoMensaje || `Estás cerca de ${organizationName} 💈 Muestra tu tarjeta y suma sellos.`,
    }];
  }
  return p;
}

// ── Construye y FIRMA el .pkpass → Buffer listo para servir ───────
//  certs = { wwdr, signerCert, signerKey } (PEM strings).
async function crearPkpass({ certs, uid, serial, authToken, datos }) {
  const { accountName, filled, target, rango, cfg = {} } = datos || {};
  const accent = cfg.accent || '#c9a84c';
  const bg = cfg.bg || '#0a0a0a';

  const passJson = buildPassJson({ uid, serial, authToken, accountName, filled, target, rango, cfg });

  // Strip de estampas (storeCard: 375×123 pts) — mismo dibujo que Google.
  const strip = (mult) => renderStampStrip({
    filled, target, accent, bg,
    width: 375 * mult, height: 123 * mult,
  });

  const buffers = {
    'pass.json': Buffer.from(JSON.stringify(passJson)),
    'icon.png': renderIcon({ size: 29, accent, bg }),
    'icon@2x.png': renderIcon({ size: 58, accent, bg }),
    'icon@3x.png': renderIcon({ size: 87, accent, bg }),
    'strip.png': strip(1),
    'strip@2x.png': strip(2),
    'strip@3x.png': strip(3),
  };

  const logo = await fetchLogoPng(cfg.logoUrl);
  if (logo) {
    buffers['logo.png'] = logo;
    buffers['logo@2x.png'] = logo;
  }

  const pass = new PKPass(buffers, {
    wwdr: certs.wwdr,
    signerCert: certs.signerCert,
    signerKey: certs.signerKey,
  });
  return pass.getAsBuffer();
}

// ── APNs: aviso de "hay pase nuevo" (payload vacío, topic = Pass Type ID)
//  Autentica con el MISMO certificado del pase (TLS de cliente).
//  Devuelve { ok, fail } — nunca rechaza (el sync no debe caerse por esto).
function pushApns({ certPem, keyPem, pushTokens = [] }) {
  if (!pushTokens.length) return Promise.resolve({ ok: 0, fail: 0 });

  return new Promise((resolve) => {
    const results = { ok: 0, fail: 0 };
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      try { client.close(); } catch (_) {}
      resolve(results);
    };

    let client;
    try {
      client = http2.connect(APNS_HOST, { cert: certPem, key: keyPem });
    } catch (e) {
      return resolve({ ok: 0, fail: pushTokens.length, error: e.message });
    }
    client.on('error', () => {
      results.fail = pushTokens.length - results.ok;
      done();
    });

    let pending = pushTokens.length;
    for (const token of pushTokens) {
      let status = 0;
      let counted = false;
      const req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        'apns-topic': PASS_TYPE_ID,
        'apns-push-type': 'alert',
      });
      req.setEncoding('utf8');
      req.on('response', (headers) => { status = headers[':status']; });
      req.on('error', () => {});
      req.on('close', () => {
        if (!counted) {
          counted = true;
          if (status === 200) results.ok += 1; else results.fail += 1;
        }
        if (--pending === 0) done();
      });
      req.end('{}');
    }

    // Red de seguridad: APNs sin respuesta no puede colgar la function.
    setTimeout(done, 8000);
  });
}

module.exports = {
  TEAM_ID,
  PASS_TYPE_ID,
  WS_URL,
  configurado,
  serialFor,
  nuevoAuthToken,
  buildPassJson,
  crearPkpass,
  pushApns,
};
