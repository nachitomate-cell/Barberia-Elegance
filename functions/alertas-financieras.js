'use strict';

// functions/alertas-financieras.js
// ─────────────────────────────────────────────────────────────────
//  ALERTAS FINANCIERAS INTELIGENTES (push diario para admin/jefe)
//
//  Cron 09:00 America/Santiago. Para cada tenant calcula 3 señales
//  y manda una notificación push agregada solo cuando hay algo que
//  contar (no spam diario).
//
//  Señales:
//    1. Ayer cero ingresos        → push crítico
//    2. Ticket promedio bajó >15% → push amarillo
//    3. Vas <70% de la meta y       → push amarillo
//       quedan <10 días del mes
//
//  Tokens: tomamos los uids de barberos con rol admin/jefe y
//  filtramos fcm_tokens donde activo=true.
//
//  DEPLOY:
//    firebase deploy --only functions:alertasFinancierasDaily
// ─────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');

const db        = admin.firestore();
const messaging = admin.messaging();

const TIMEZONE = 'America/Santiago';

// Mismo listado que cumpleanos.js. Cuando agregues un tenant, súmalo acá.
// `elegance` vive en raíz (legacy). El resto en tenants/{id}/...
const TENANTS = [
  { id: 'elegance',             root: ''                              },
  { id: 'gitana',               root: 'tenants/gitana/'               },
  { id: 'ferraza',              root: 'tenants/ferraza/'              },
  { id: 'chameleon',            root: 'tenants/chameleon/'            },
  { id: 'aura',                 root: 'tenants/aura/'                 },
  { id: 'lumen',                root: 'tenants/lumen/'                },
  { id: 'mapubarbershop',       root: 'tenants/mapubarbershop/'       },
  { id: 'delnero',              root: 'tenants/delnero/'              },
  { id: 'marcelo_hairdressing', root: 'tenants/marcelo_hairdressing/' },
  { id: 'machos',               root: 'tenants/machos/'               },
  { id: 'infinity',             root: 'tenants/infinity/'             },
  { id: 'sionbarberia',         root: 'tenants/sionbarberia/'         },
];

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtCLP = v => '$' + Math.round(v || 0).toLocaleString('es-CL');

/**
 * Tokens FCM activos cuyo uid pertenece a un barbero con rol admin o jefe.
 * Hacemos 2 queries y cruzamos en memoria (en general son ≤10 barberos).
 */
async function getAdminTokens(root) {
  const barberosCol = db.collection(`${root}barberos`);
  const tokensCol   = db.collection(`${root}fcm_tokens`);
  try {
    const [barbSnap, tokSnap] = await Promise.all([
      barberosCol.where('rol', 'in', ['admin', 'jefe']).get(),
      tokensCol.where('activo', '==', true).get(),
    ]);
    const adminUids = new Set();
    barbSnap.forEach(d => {
      const b = d.data();
      adminUids.add(d.id);
      if (b.uid) adminUids.add(b.uid);
    });
    const tokens = [];
    tokSnap.forEach(d => {
      const data = d.data();
      if (adminUids.has(data.uid)) tokens.push(data.token);
    });
    return tokens;
  } catch (err) {
    logger.warn(`[Alertas] No se pudieron leer tokens admin para ${root}: ${err.message}`);
    return [];
  }
}

async function calcularAlertasTenant(root) {
  const hoy = new Date();
  // Trabajamos con días en zona Santiago: la fecha de citas es YYYY-MM-DD
  // ya en horario local del local, no UTC. Está OK comparar como strings.
  const ayer  = new Date(hoy.getTime() - 86_400_000);
  const hace7 = new Date(hoy.getTime() - 7 * 86_400_000);
  const hace14= new Date(hoy.getTime() - 14 * 86_400_000);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes    = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const diasMes   = finMes.getDate();
  const diaActual = hoy.getDate();
  const diasRestantes = Math.max(0, diasMes - diaActual);

  const citasCol = db.collection(`${root}citas`);
  const confDoc  = db.doc(`${root}configuracion/main`);

  const [citasMesSnap, conf] = await Promise.all([
    citasCol.where('fecha', '>=', ymd(inicioMes)).get(),
    confDoc.get().catch(() => null),
  ]);

  const completadas = citasMesSnap.docs
    .map(d => d.data())
    .filter(c => c.estado === 'Completada');

  const ventasFechaSum = (desdeStr, hastaStr) => {
    let total = 0, count = 0;
    completadas.forEach(c => {
      if (!c.fecha) return;
      if (c.fecha < desdeStr || c.fecha > hastaStr) return;
      total += Number(c.precio) || 0;
      count++;
    });
    return { total, count };
  };

  const ventasAyer       = ventasFechaSum(ymd(ayer),  ymd(ayer));
  const ventas7d         = ventasFechaSum(ymd(hace7), ymd(ayer));
  const ventasPrev7d     = ventasFechaSum(ymd(hace14), ymd(new Date(hace7.getTime() - 86_400_000)));
  const ventasMes        = completadas.reduce((s, c) => s + (Number(c.precio) || 0), 0);

  const ticket7d     = ventas7d.count     ? ventas7d.total     / ventas7d.count     : 0;
  const ticketPrev7d = ventasPrev7d.count ? ventasPrev7d.total / ventasPrev7d.count : 0;
  const ticketDelta  = ticketPrev7d > 0 ? ((ticket7d - ticketPrev7d) / ticketPrev7d) * 100 : 0;

  const meta = conf?.exists ? Number(conf.data()?.metaMensualVentas) || 0 : 0;
  const proyeccion = diaActual > 0 ? (ventasMes / diaActual) * diasMes : 0;
  const pctProyeccion = meta > 0 ? (proyeccion / meta) * 100 : null;

  const alertas = [];

  if (ventasAyer.count === 0) {
    alertas.push({
      titulo: '⚠️ Ayer no hubo ingresos',
      cuerpo: 'No se completaron citas. Revisa la agenda y considera un mensaje a clientes inactivos.',
      severity: 'high',
    });
  } else if (ticketPrev7d > 0 && ticketDelta < -15) {
    alertas.push({
      titulo: '📉 Ticket promedio cayendo',
      cuerpo: `Tu ticket bajó ${Math.abs(ticketDelta).toFixed(0)}% en los últimos 7 días (de ${fmtCLP(ticketPrev7d)} a ${fmtCLP(ticket7d)}).`,
      severity: 'medium',
    });
  }

  if (pctProyeccion != null && pctProyeccion < 70 && diasRestantes < 10) {
    alertas.push({
      titulo: '🎯 Vas detrás de la meta del mes',
      cuerpo: `Proyectado: ${fmtCLP(proyeccion)} (${Math.round(pctProyeccion)}% de la meta). Quedan ${diasRestantes} días.`,
      severity: 'medium',
    });
  }

  return alertas;
}

async function enviarPush(tokens, alerta, tenantId) {
  if (!tokens.length) return { ok: 0, fail: 0 };
  const msg = {
    notification: { title: alerta.titulo, body: alerta.cuerpo },
    data: { tenantId, kind: 'alerta-financiera', severity: alerta.severity },
    webpush: {
      headers: { Urgency: alerta.severity === 'high' ? 'high' : 'normal' },
      notification: {
        title: alerta.titulo,
        body:  alerta.cuerpo,
        icon:  '/gestion-interna/pwa-192.png',
        badge: '/gestion-interna/pwa-192.png',
        tag:   'alerta-financiera',
        renotify: true,
      },
      fcmOptions: { link: '/gestion-interna/inicio' },
    },
    tokens,
  };
  try {
    const res = await messaging.sendEachForMulticast(msg);
    return { ok: res.successCount, fail: res.failureCount };
  } catch (err) {
    logger.error(`[Alertas] Error envío push:`, err);
    return { ok: 0, fail: tokens.length };
  }
}

exports.alertasFinancierasDaily = onSchedule(
  { schedule: '0 9 * * *', timeZone: TIMEZONE },
  async () => {
    let totalEnviadas = 0;
    for (const t of TENANTS) {
      try {
        const alertas = await calcularAlertasTenant(t.root);
        if (!alertas.length) {
          logger.info(`[Alertas] ${t.id}: sin alertas hoy`);
          continue;
        }
        const tokens = await getAdminTokens(t.root);
        if (!tokens.length) {
          logger.info(`[Alertas] ${t.id}: ${alertas.length} alerta(s) pero sin tokens admin`);
          continue;
        }
        for (const a of alertas) {
          const r = await enviarPush(tokens, a, t.id);
          totalEnviadas += r.ok;
          logger.info(`[Alertas] ${t.id} · "${a.titulo}" → ok=${r.ok} fail=${r.fail}`);
        }
      } catch (err) {
        logger.error(`[Alertas] ${t.id} falló:`, err);
      }
    }
    logger.info(`[Alertas] Pase diario completo. Total pushes enviados: ${totalEnviadas}`);
    return null;
  },
);
