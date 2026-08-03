'use strict';

// functions/alerta-stock.js
// ─────────────────────────────────────────────────────────────────
//  ALERTA DE STOCK CRÍTICO (push al panel + email al dueño)
//
//  Hasta ahora la alerta de inventario era solo el banner del panel
//  (Productos.jsx calcula stock <= stockMinimo al abrir la vista):
//  si nadie abría el panel, nadie se enteraba. Este trigger vigila
//  cada escritura sobre `productos` y, cuando un producto CRUZA a
//  stock crítico (antes no lo era, ahora sí), avisa de inmediato:
//
//    · Push FCM  → tokens del panel (fcm_tokens activo=true) de
//                  barberos con rol admin o recepcion (recepción
//                  gestiona inventario). Mismo patrón que
//                  alertas-financieras.js.
//    · Email     → destinatarios EXPLÍCITOS por tenant:
//                    _system/{tid}.emailAlertaStock = 'a@x.cl' | ['a@x.cl', ...]
//                  Fallback: emailStaffCitas (ya opt-in y con correos
//                  reales definidos por Ignacio). `false` apaga el
//                  email del todo. Sin flag ni fallback → solo push.
//
//  ⚠️ Nunca usar los emails de los docs barberos como destinatarios:
//  no son casillas reales (ver aviso-cita-staff.js).
//
//  Anti-spam:
//    · Solo transición no-crítico → crítico (no re-avisa mientras
//      siga bajo el mínimo, ni al crear docs — los seeds crean de a
//      decenas).
//    · Cooldown de 6h por producto (`_alertaStockEn` en el doc) para
//      el ping-pong venta → anulación → venta del mismo día. Esa
//      escritura no re-dispara el aviso porque no cambia stock ni
//      stockMinimo (no hay transición).
//
//  Deploy:
//    firebase deploy --only functions:alertaStockTenant,functions:alertaStockElegance
// ─────────────────────────────────────────────────────────────────

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');

const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');
const { getTenantConfig }           = require('./lib/tenant-mail-config');
const { writeNotifLog }             = require('./lib/notif-log');

const db        = admin.firestore();
const messaging = admin.messaging();
const REGION    = 'us-central1';
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

// Misma definición que el banner del panel (Productos.jsx): el mínimo
// tiene que estar configurado; sin stockMinimo no existe la alerta.
function esCritico(d) {
  return d
    && d.stockMinimo !== undefined && d.stockMinimo !== null && d.stockMinimo !== ''
    && Number(d.stock) <= Number(d.stockMinimo);
}

// Tokens FCM activos de barberos admin/recepcion del tenant.
// Espejo de getAdminTokens en alertas-financieras.js + recepción,
// porque inventario es parte de su pega (ver project_rol_recepcion).
async function tokensDelPanel(root) {
  try {
    const [barbSnap, tokSnap] = await Promise.all([
      db.collection(`${root}barberos`).where('rol', 'in', ['admin', 'recepcion']).get(),
      db.collection(`${root}fcm_tokens`).where('activo', '==', true).get(),
    ]);
    const uids = new Set();
    barbSnap.forEach(d => {
      uids.add(d.id);
      if (d.data().uid) uids.add(d.data().uid);
    });
    const tokens = [];
    tokSnap.forEach(d => {
      if (uids.has(d.data().uid)) tokens.push(d.data().token);
    });
    return tokens.filter(Boolean);
  } catch (e) {
    logger.warn(`[AlertaStock] tokens de ${root || 'elegance'}: ${e.message}`);
    return [];
  }
}

// Destinatarios explícitos del tenant. emailAlertaStock manda; false lo
// apaga; ausente cae a emailStaffCitas (mismo formato string | array).
async function destinatariosEmail(tenantId) {
  try {
    const doc = await db.doc(`_system/${tenantId}`).get();
    if (!doc.exists) return [];
    const data = doc.data();
    if (data.emailAlertaStock === false) return [];
    const raw = data.emailAlertaStock ?? data.emailStaffCitas;
    const lista = Array.isArray(raw) ? raw : (typeof raw === 'string' ? [raw] : []);
    return [...new Set(
      lista.map(e => String(e || '').trim().toLowerCase()).filter(e => e.includes('@'))
    )];
  } catch (e) {
    logger.warn(`[AlertaStock] No se pudo leer _system/${tenantId}: ${e.message}`);
    return [];
  }
}

function buildEmailHtml(cfg, producto, panelUrl) {
  const stock  = Number(producto.stock) || 0;
  const minimo = Number(producto.stockMinimo) || 0;
  const agotado = stock <= 0;
  const color  = cfg.color || '#DAA520';
  const nombre = producto.nombre || 'Producto sin nombre';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0f1115;border-radius:12px;overflow:hidden;border:1px solid #262a33;">
    <div style="background:${cfg.headerBg || '#161a22'};padding:20px 24px;border-bottom:2px solid ${color};">
      <p style="margin:0;color:${color};font-size:13px;letter-spacing:1px;text-transform:uppercase;">${cfg.nombre}</p>
      <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;">${agotado ? 'Producto agotado' : 'Stock crítico en inventario'}</h1>
    </div>
    <div style="padding:24px;color:#c9ced8;font-size:14px;line-height:1.6;">
      <p style="margin:0 0 16px;"><strong style="color:#ffffff;">${nombre}</strong>${producto.marca ? ` · ${producto.marca}` : ''}</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="padding:10px 14px;background:#161a22;border-radius:8px 0 0 8px;">Stock actual</td>
          <td style="padding:10px 14px;background:#161a22;text-align:right;color:${agotado ? '#f87171' : '#fbbf24'};font-weight:bold;">${stock}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;">Stock mínimo configurado</td>
          <td style="padding:10px 14px;text-align:right;color:#ffffff;">${minimo}</td>
        </tr>
      </table>
      <p style="margin:0 0 20px;">${agotado
        ? 'El producto quedó sin unidades: no podrá venderse hasta reponer.'
        : 'El producto llegó al mínimo configurado. Conviene gestionar la reposición antes de que se agote.'}</p>
      <a href="${panelUrl}" style="display:inline-block;background:${color};color:#0f1115;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;">Abrir Productos en el panel</a>
    </div>
    <div style="padding:14px 24px;background:#0b0d11;color:#5b6270;font-size:11px;">
      Aviso automático de inventario · ${cfg.nombre}
    </div>
  </div>`;
}

async function procesarCambioProducto(tenantId, root, productoId, before, after) {
  // Borrado, o creación (los seeds crean en masa): no avisar.
  if (!after || !before) return;
  // Solo el cruce hacia crítico. Mientras siga crítico no se re-avisa,
  // y la marca _alertaStockEn tampoco dispara (no cambia la criticidad).
  if (!esCritico(after) || esCritico(before)) return;

  const alertaPrevia = after._alertaStockEn?.toMillis?.() || 0;
  if (Date.now() - alertaPrevia < COOLDOWN_MS) {
    logger.info(`[AlertaStock] ${tenantId}/${productoId}: en cooldown, no se re-avisa`);
    return;
  }

  const stock   = Number(after.stock) || 0;
  const agotado = stock <= 0;
  const nombre  = after.nombre || productoId;
  const titulo  = agotado ? `📦 Agotado: ${nombre}` : `📦 Stock crítico: ${nombre}`;
  const cuerpo  = agotado
    ? 'Quedan 0 unidades. Repone para poder seguir vendiéndolo.'
    : `Quedan ${stock} unidades (mínimo ${Number(after.stockMinimo)}). Revisa Productos para reponer.`;

  // ── Push a los paneles instalados ──────────────────────────────
  const tokens = await tokensDelPanel(root);
  if (tokens.length) {
    try {
      const res = await messaging.sendEachForMulticast({
        notification: { title: titulo, body: cuerpo },
        data: { tenantId, kind: 'alerta-stock', productoId },
        webpush: {
          headers: { Urgency: agotado ? 'high' : 'normal' },
          notification: {
            title: titulo,
            body:  cuerpo,
            icon:  '/gestion-interna/pwa-192.png',
            badge: '/gestion-interna/pwa-192.png',
            tag:   `alerta-stock-${productoId}`,
            renotify: true,
          },
          fcmOptions: { link: '/gestion-interna/productos' },
        },
        tokens,
      });
      logger.info(`[AlertaStock] ${tenantId} · "${nombre}" push ok=${res.successCount} fail=${res.failureCount}`);
      await writeNotifLog(db, {
        tenantId,
        type:    'push_stock_critico',
        channel: 'push',
        status:  res.successCount > 0 ? 'sent' : 'failed',
        meta:    { productoId, producto: nombre, stock: String(stock) },
      });
    } catch (e) {
      logger.error(`[AlertaStock] ${tenantId} push falló:`, e.message);
    }
  } else {
    logger.info(`[AlertaStock] ${tenantId}: sin tokens de panel para avisar`);
  }

  // ── Email al dueño (opt-in explícito) ──────────────────────────
  const destinatarios = await destinatariosEmail(tenantId);
  if (destinatarios.length) {
    try {
      const cfg = await getTenantConfig(tenantId, logger);
      const base = (cfg.dashboardUrl || `https://${tenantId}.synaptechspa.cl/dashboard`).replace(/\/dashboard$/, '');
      const html = buildEmailHtml(cfg, after, `${base}/gestion-interna/productos`);
      await enviarEmail(
        { from: cfg.from, to: destinatarios, subject: `${titulo.replace('📦 ', '')} · ${cfg.nombre}`, html },
        { grupo: 'interno', etiqueta: 'alerta-stock' },
      );
      logger.info(`[AlertaStock] ${tenantId} · email a ${destinatarios.join(', ')}`);
      await writeNotifLog(db, {
        tenantId,
        type:    'email_stock_critico',
        channel: 'email',
        status:  'sent',
        to:      { email: destinatarios.join(', ') },
        meta:    { productoId, producto: nombre, stock: String(stock) },
      });
    } catch (e) {
      logger.error(`[AlertaStock] ${tenantId} email falló:`, e.message);
      await writeNotifLog(db, {
        tenantId,
        type:    'email_stock_critico',
        channel: 'email',
        status:  'failed',
        to:      { email: destinatarios.join(', ') },
        error:   e.message,
        meta:    { productoId, producto: nombre },
      });
    }
  }

  // Cooldown: marca en el doc. No re-dispara el aviso (no hay transición).
  await db.doc(`${root}productos/${productoId}`).set({
    _alertaStockEn: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}

exports.alertaStockTenant = onDocumentWritten(
  { document: 'tenants/{tenantId}/productos/{productoId}', region: REGION, secrets: [...MAIL_SECRETS] },
  async (event) => {
    const { tenantId, productoId } = event.params;
    try {
      await procesarCambioProducto(
        tenantId,
        `tenants/${tenantId}/`,
        productoId,
        event.data?.before?.exists ? event.data.before.data() : null,
        event.data?.after?.exists  ? event.data.after.data()  : null,
      );
    } catch (e) {
      logger.error(`[AlertaStock] ${tenantId}/${productoId}:`, e);
    }
    return null;
  },
);

// Elegance legacy: sus productos viven en la colección raíz /productos.
exports.alertaStockElegance = onDocumentWritten(
  { document: 'productos/{productoId}', region: REGION, secrets: [...MAIL_SECRETS] },
  async (event) => {
    const { productoId } = event.params;
    try {
      await procesarCambioProducto(
        'elegance',
        '',
        productoId,
        event.data?.before?.exists ? event.data.before.data() : null,
        event.data?.after?.exists  ? event.data.after.data()  : null,
      );
    } catch (e) {
      logger.error(`[AlertaStock] elegance/${productoId}:`, e);
    }
    return null;
  },
);

exports._test = { esCritico, destinatariosEmail, buildEmailHtml };
