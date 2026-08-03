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
const { geofencePointsMulti, locationsFromConfig } = require('./wallet-geo');

// ── Identidad Apple (completar al terminar el enrollment) ─────────
//  TODO(Ignacio): cuando Apple apruebe la cuenta:
//   1. TEAM_ID: developer.apple.com/account → Membership details.
//   2. Crear el Pass Type ID con EXACTAMENTE este identifier (o
//      actualizar la constante si eliges otro).
const TEAM_ID = '69M5S8Q9K8';
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
/**
 * Descarga una imagen y la deja a la medida exacta que pide Apple.
 *
 * Se usa para el strip de los pases de evento: es el ÚNICO lugar del pase donde
 * cabe arte propio. Apple no permite tipografías, títulos ni fondos con capas —
 * todo lo decorativo tiene que entrar en esta banda.
 *
 * Se recorta al centro en vez de deformar: un barril estirado se nota.
 */
async function fetchImagenExacta(url, ancho, alto) {
  if (!url || !/^https?:\/\//i.test(String(url))) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const img = await loadImage(Buffer.from(await res.arrayBuffer()));
    const canvas = createCanvas(ancho, alto);
    const ctx = canvas.getContext('2d');
    // cover: llena la banda y recorta el sobrante, centrado.
    const escala = Math.max(ancho / img.width, alto / img.height);
    const dw = img.width * escala;
    const dh = img.height * escala;
    ctx.drawImage(img, (ancho - dw) / 2, (alto - dh) / 2, dw, dh);
    return canvas.toBuffer('image/png');
  } catch (_) {
    return null;
  }
}

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

// Lista textual de recompensas por hito (espejo de recompensasListText de
// wallet-core.js) — igual formato para consistencia entre pases.
function recompensasListText(premios) {
  const list = (premios || [])
    .filter((p) => Number(p.costoSellos) > 0 && (p.activo === undefined || p.activo === true))
    .map((p) => ({ costo: Number(p.costoSellos), nombre: String(p.nombre || 'Premio').slice(0, 60) }))
    .sort((a, b) => a.costo - b.costo);
  if (!list.length) return null;
  return list.map((p) => `Sello ${p.costo} · ${p.nombre}`).join('\n');
}

// ── Campos del storeCard según el modo del tenant ─────────────────
//
// modo 'evento' — pase de participación (ferias, sorteos, lanzamientos).
// No es una tarjeta de fidelidad: no hay sellos que juntar ni rango que
// subir, sino la confirmación de que la persona quedó dentro. Mostrar
// "SELLOS 0/10" en una entrada a un sorteo confunde más de lo que aporta.
//
// Cualquier otro modo mantiene la tarjeta de sellos de siempre, así que
// los tenants existentes no cambian en nada.
function camposPorModo({ modo, accountName, filled, target, rango, cfg, proximaCita }) {
  if (modo === 'evento') {
    return {
      headerFields: [
        { key: 'estado', label: 'ESTADO', value: cfg.eventoEstado || 'Participando', changeMessage: '%@' },
      ],
      secondaryFields: [
        { key: 'participante', label: 'PARTICIPANTE', value: accountName || 'Invitado' },
        ...(cfg.eventoFecha
          ? [{ key: 'cuando', label: 'CUÁNDO', value: cfg.eventoFecha }]
          : []),
      ],
    };
  }
  return {
    headerFields: [
      { key: 'sellos', label: 'SELLOS', value: `${filled} / ${target}`, changeMessage: 'Sellos: %@' },
    ],
    secondaryFields: [
      { key: 'cliente', label: 'CLIENTE', value: accountName || 'Cliente' },
      { key: 'rango', label: 'RANGO', value: rango || 'Silver', changeMessage: 'Nuevo rango: %@' },
    ],
    // Fila propia bajo los secundarios. Sin cita agendada el array va vacío
    // y iOS simplemente no dibuja la fila — el .pkpass se regenera entero en
    // cada actualización, así que acá no existe el riesgo de dato pegado que
    // sí tiene el PATCH de Google.
    auxiliaryFields: proximaCita
      ? [{
          key: 'proximaCita',
          label: 'PRÓXIMA CITA',
          value: proximaCita.corta,
          changeMessage: 'Tu próxima cita: %@',
        }]
      : [],
  };
}

// ── pass.json (storeCard = el "LoyaltyObject" de Apple) ───────────
function buildPassJson({ uid, serial, authToken, accountName, filled, target, rango, cfg = {}, premios = [], proximaCita = null }) {
  const organizationName = cfg.issuerName || 'SynapTech';
  const esEvento = cfg.modo === 'evento';
  const campos = camposPorModo({ modo: cfg.modo, accountName, filled, target, rango, cfg, proximaCita });
  const p = {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    teamIdentifier: TEAM_ID,
    organizationName,
    description: esEvento
      ? `${cfg.programName || 'Evento'} — pase de participación`
      : `${cfg.programName || 'Club de Fidelidad'} — tarjeta de sellos`,
    serialNumber: serial,
    webServiceURL: WS_URL,
    authenticationToken: authToken,
    backgroundColor: hexToRgb(cfg.bg, '#0a0a0a'),
    // El blanco puro sobre un fondo cálido se ve frío y barato. Los tenants
    // que quieran un crema cálido lo definen en cfg.fg; el resto no cambia.
    foregroundColor: hexToRgb(cfg.fg, '#ffffff'),
    labelColor: hexToRgb(cfg.accent, '#c9a84c'),
    logoText: cfg.programName || 'Club de Fidelidad',
    sharingProhibited: true,
    storeCard: {
      // changeMessage → iOS notifica solo al actualizar el pase.
      headerFields: campos.headerFields,
      secondaryFields: campos.secondaryFields,
      auxiliaryFields: campos.auxiliaryFields || [],
      backFields: (function () {
        const arr = [
          esEvento
            ? {
                key: 'como',
                label: '¿Cómo funciona?',
                value: cfg.eventoInstrucciones
                  || 'Ya estás participando. Si sales sorteado te avisamos y este pase se actualiza solo — no necesitas hacer nada más.',
              }
            : {
                key: 'como',
                label: '¿Cómo funciona?',
                value: 'Junta sellos con cada visita y canjéalos por premios en el local. Tu tarjeta se actualiza sola.',
              },
        ];
        // Detalle de la cita (servicio y profesional): en el frente solo cabe
        // "15 ago · 15:00", así que el resto va al reverso.
        if (proximaCita && proximaCita.larga) {
          arr.push({ key: 'proximaCitaDetalle', label: 'Tu próxima cita', value: proximaCita.larga });
        }
        // Lista de recompensas por hito (si el local cargó premios). El
        // cliente ve qué gana en cada sello sin tener que preguntar.
        // En modo evento no hay premios por hito que listar: el premio es
        // el del sorteo, y va en el frente del pase.
        const recompensasBody = esEvento ? null : recompensasListText(premios);
        if (recompensasBody) {
          arr.push({ key: 'recompensas', label: 'Recompensas', value: recompensasBody });
        }
        // Tap-away a wallo.cl/crea: cuando el amigo del cliente ve la tarjeta
        // y toca el link del reverso, aterriza en el wizard de creación en
        // 1 toque. Motor viral compuesto — cada pase Apple es un cartel andante.
        arr.push({ key: 'wallo', label: 'Tarjeta digital', value: 'Wallo · Crea tu tarjeta digital gratis en wallo.cl/crea' });
        return arr;
      })(),
    },
  };

  // QR con el uid (espejo del accountId de Google) para canje en local.
  // Opt-in por tenant igual que en Google: solo tiene sentido donde el
  // sello se suma escaneando el pase. En un local con agenda lo pone la
  // cita completada, así que el QR sobra y se omite. Apple no renderiza
  // nada si `barcodes` no viene.
  if (cfg.qrStaff === true) {
    p.barcodes = [
      { format: 'PKBarcodeFormatQR', message: String(uid), messageEncoding: 'iso-8859-1', altText: 'Tu código de cliente' },
    ];
  }

  // Geo NATIVO de Apple: el pase aparece en pantalla bloqueada cerca
  // del local (espejo de locations del LoyaltyClass).
  // Centro + anillo de puntos si hay geoRadius (espejo del LoyaltyClass).
  const geoPts = geofencePointsMulti(locationsFromConfig(cfg));
  if (geoPts.length) {
    const relevantText = cfg.geoMensaje || `Estás cerca de ${organizationName} 💈 Muestra tu tarjeta y suma sellos.`;
    p.locations = geoPts.map((pt) => ({ ...pt, relevantText }));
  }
  return p;
}

// ── Construye y FIRMA el .pkpass → Buffer listo para servir ───────
//  certs = { wwdr, signerCert, signerKey } (PEM strings).
async function crearPkpass({ certs, uid, serial, authToken, datos }) {
  const { accountName, filled, target, rango, cfg = {}, premios = [], hitos = [], proximaCita = null } = datos || {};
  const accent = cfg.accent || '#c9a84c';
  const bg = cfg.bg || '#0a0a0a';

  const passJson = buildPassJson({ uid, serial, authToken, accountName, filled, target, rango, cfg, premios, proximaCita });

  // Strip de estampas (storeCard: 375×123 pts) — mismo dibujo que Google,
  // con hitos ⭐ para consistencia visual entre los dos wallets.
  const strip = (mult) => renderStampStrip({
    filled, target, accent, bg, icon: cfg.stampIcon, hitos,
    width: 375 * mult, height: 123 * mult,
  });

  const buffers = {
    'pass.json': Buffer.from(JSON.stringify(passJson)),
    'icon.png': renderIcon({ size: 29, accent, bg, icon: cfg.stampIcon }),
    'icon@2x.png': renderIcon({ size: 58, accent, bg, icon: cfg.stampIcon }),
    'icon@3x.png': renderIcon({ size: 87, accent, bg, icon: cfg.stampIcon }),
  };

  if (cfg.modo === 'evento') {
    // En evento no hay sellos que dibujar. Si el tenant subió arte propio, va
    // acá: es el único lugar del pase donde Apple permite una imagen grande.
    // Sin arte, el pase queda limpio sobre el color de fondo.
    if (cfg.stripUrl) {
      const [s1, s2, s3] = await Promise.all([
        fetchImagenExacta(cfg.stripUrl, 375, 123),
        fetchImagenExacta(cfg.stripUrl, 750, 246),
        fetchImagenExacta(cfg.stripUrl, 1125, 369),
      ]);
      if (s1 && s2 && s3) {
        buffers['strip.png'] = s1;
        buffers['strip@2x.png'] = s2;
        buffers['strip@3x.png'] = s3;
      }
    }
  } else {
    buffers['strip.png'] = strip(1);
    buffers['strip@2x.png'] = strip(2);
    buffers['strip@3x.png'] = strip(3);
  }

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
