'use strict';

// functions/campana-reactivacion.js
// ─────────────────────────────────────────────────────────────────
//  CAMPAÑA DE REACTIVACIÓN — clientes dormidos
//
//  Cron diario 10:00 AM America/Santiago.
//  Para cada tenant que tenga config `_marketing/reactivacion.enabled = true`:
//    1. Lee config: diasInactivo (default 30), mensaje, throttleDias (default 60)
//    2. Busca clientes con `ultimaVisita < hoy - diasInactivo`
//    3. Excluye los que recibieron una campaña en últimos `throttleDias`
//    4. Para cada cliente con fcmToken válido: manda push y marca
//       `ultimaCampanaReactivacion: today`.
//
//  Config esperado en Firestore — tenants/{tid}/_marketing/reactivacion:
//    enabled:       boolean
//    diasInactivo:  number (default 30)
//    mensaje:       string (default genérico)
//    throttleDias:  number (default 60) — no re-enviar al mismo cliente
//
//  DEPLOY:
//    firebase deploy --only functions:campanaReactivacion
// ─────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { writeNotifLog } = require('./lib/notif-log');

const db        = admin.firestore();
const messaging = admin.messaging();

const TIMEZONE = 'America/Santiago';

// Mismo listado de tenants que cumpleanos.js. Si agregás un tenant nuevo
// con clientes, añadilo acá también.
const TENANTS = [
  { id: 'elegance',            clientesPath: 'clientes',                              configPath: '_marketing/reactivacion'                              },
  { id: 'gitana',              clientesPath: 'tenants/gitana/clientes',               configPath: 'tenants/gitana/_marketing/reactivacion'               },
  { id: 'ferraza',             clientesPath: 'tenants/ferraza/clientes',              configPath: 'tenants/ferraza/_marketing/reactivacion'              },
  { id: 'chameleon',           clientesPath: 'tenants/chameleon/clientes',            configPath: 'tenants/chameleon/_marketing/reactivacion'            },
  { id: 'aura',                clientesPath: 'tenants/aura/clientes',                 configPath: 'tenants/aura/_marketing/reactivacion'                 },
  { id: 'lumen',               clientesPath: 'tenants/lumen/clientes',                configPath: 'tenants/lumen/_marketing/reactivacion'                },
  { id: 'mapubarbershop',      clientesPath: 'tenants/mapubarbershop/clientes',       configPath: 'tenants/mapubarbershop/_marketing/reactivacion'       },
  { id: 'delnero',             clientesPath: 'tenants/delnero/clientes',              configPath: 'tenants/delnero/_marketing/reactivacion'              },
  { id: 'marcelo_hairdressing',clientesPath: 'tenants/marcelo_hairdressing/clientes', configPath: 'tenants/marcelo_hairdressing/_marketing/reactivacion' },
  { id: 'machos',              clientesPath: 'tenants/machos/clientes',               configPath: 'tenants/machos/_marketing/reactivacion'               },
  { id: 'infinity',            clientesPath: 'tenants/infinity/clientes',             configPath: 'tenants/infinity/_marketing/reactivacion'             },
  { id: 'sionbarberia',        clientesPath: 'tenants/sionbarberia/clientes',         configPath: 'tenants/sionbarberia/_marketing/reactivacion'         },
  { id: 'kronnos_penablanca',  clientesPath: 'tenants/kronnos_penablanca/clientes',   configPath: 'tenants/kronnos_penablanca/_marketing/reactivacion'   },
  { id: 'kronnos_limache',     clientesPath: 'tenants/kronnos_limache/clientes',      configPath: 'tenants/kronnos_limache/_marketing/reactivacion'      },
  { id: 'kronnos_woman',       clientesPath: 'tenants/kronnos_woman/clientes',        configPath: 'tenants/kronnos_woman/_marketing/reactivacion'        },
  { id: 'yugen',               clientesPath: 'tenants/yugen/clientes',                configPath: 'tenants/yugen/_marketing/reactivacion'                },
];

// Devuelve YYYY-MM-DD en zona Santiago, con offsetDays opcional.
function getSantiagoDateISO(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year:  'numeric',
    month: '2-digit',
    day:   '2-digit',
  }).format(d);
}

exports.campanaReactivacion = onSchedule(
  { schedule: '0 10 * * *', timeZone: TIMEZONE },
  async () => {
    const today = getSantiagoDateISO();
    logger.info(`[Reactivacion] Iniciando para ${today}`);

    let totalEnviados = 0;
    let totalTenants  = 0;

    for (const tenant of TENANTS) {
      // 1. Leer config del tenant
      let cfg;
      try {
        const cfgSnap = await db.doc(tenant.configPath).get();
        if (!cfgSnap.exists || cfgSnap.data().enabled !== true) {
          continue; // tenant no tiene la campaña habilitada
        }
        cfg = cfgSnap.data();
      } catch (err) {
        logger.warn(`[Reactivacion] ${tenant.id}: error leyendo config:`, err.message);
        continue;
      }

      totalTenants++;

      const diasInactivo = Number(cfg.diasInactivo) || 30;
      const throttleDias = Number(cfg.throttleDias) || 60;
      const mensaje      = cfg.mensaje || '¡Te extrañamos! Ya pasó un tiempo desde tu última visita. ¿Volvemos a vernos?';
      const titulo       = cfg.titulo  || 'Te extrañamos 💈';

      // Cutoff de inactividad (clientes sin venir desde esta fecha o antes)
      const cutoffInactivo = getSantiagoDateISO(-diasInactivo);
      const cutoffThrottle = getSantiagoDateISO(-throttleDias);

      const clientesCol = db.collection(tenant.clientesPath);
      let snap;
      try {
        // ultimaVisita guardada como ISO "YYYY-MM-DD". Para que el query
        // sirva sin index complejo, filtramos por <= cutoffInactivo y
        // hacemos throttle in-memory.
        snap = await clientesCol
          .where('ultimaVisita', '<=', cutoffInactivo)
          .where('ultimaVisita', '!=', null)
          .limit(500)
          .get();
      } catch (err) {
        // Fallback sin filtro compuesto si no hay índice
        try {
          snap = await clientesCol.limit(500).get();
        } catch (err2) {
          logger.warn(`[Reactivacion] ${tenant.id}: no se pudieron leer clientes:`, err2.message);
          continue;
        }
      }

      if (snap.empty) {
        logger.info(`[Reactivacion] ${tenant.id}: sin candidatos`);
        continue;
      }

      let enviadosTenant = 0;

      for (const cDoc of snap.docs) {
        const c = cDoc.data();
        const ultimaVisita = c.ultimaVisita;
        const fcmToken     = c.fcmToken;
        const ultimaCampana = c.ultimaCampanaReactivacion;

        // Filtros in-memory
        if (!ultimaVisita || ultimaVisita > cutoffInactivo) continue;
        if (!fcmToken) continue;
        if (ultimaCampana && ultimaCampana > cutoffThrottle) continue;

        // Mensaje personalizado con {nombre} si lo usa
        const nombreCorto = (c.nombre || '').split(' ')[0] || '';
        const bodyFinal = mensaje
          .replace(/\{nombre\}/g, nombreCorto)
          .replace(/\{dias\}/g, diasInactivo);

        try {
          await messaging.send({
            token: fcmToken,
            notification: { title: titulo, body: bodyFinal },
            data: { tipo: 'reactivacion', tenant: tenant.id },
          });
          await cDoc.ref.update({
            ultimaCampanaReactivacion: today,
          });
          await writeNotifLog(db, {
            tenantId: tenant.id,
            type:    'reactivacion',
            channel: 'fcm',
            status:  'sent',
            to:      { nombre: c.nombre, telefono: cDoc.id },
            meta:    { mensaje: bodyFinal, ultimaVisita },
          });
          enviadosTenant++;
          totalEnviados++;
        } catch (err) {
          // Si el token es inválido, marcarlo
          if (err.code === 'messaging/registration-token-not-registered') {
            await cDoc.ref.update({ fcmToken: null });
          }
          logger.warn(`[Reactivacion] ${tenant.id}/${cDoc.id} fallido:`, err.message);
        }
      }

      logger.info(`[Reactivacion] ${tenant.id}: ${enviadosTenant} push enviados`);
    }

    logger.info(`[Reactivacion] Total: ${totalEnviados} pushes en ${totalTenants} tenants`);
  },
);
