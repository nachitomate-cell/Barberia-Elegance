'use strict';

/**
 * Saca la IP del visitante que creó la cita "Hola" en kronnos_limache.
 *
 * La IP NUNCA se guardó en Firestore (ni la cita ni upsertCliente la
 * persisten). El único lugar donde vive es el request log de Cloud Run de la
 * callable `upsertCliente`, que el navegador del visitante llamó a las
 * 2026-08-05T16:13:41.8Z justo antes de escribir la cita.
 *
 * REQUISITO: la service-account necesita rol de lectura de logs. Hoy NO lo
 * tiene (403 "Permission denied for all log views"). Concedelo así:
 *
 *   Consola → IAM y administración → IAM → conceder acceso
 *   Principal: firebase-adminsdk-fbsvc@barberia-elegance.iam.gserviceaccount.com
 *   Rol:       Visualizador de registros  (roles/logging.viewer)
 *
 * o con gcloud:
 *   gcloud projects add-iam-policy-binding barberia-elegance \
 *     --member=serviceAccount:firebase-adminsdk-fbsvc@barberia-elegance.iam.gserviceaccount.com \
 *     --role=roles/logging.viewer
 *
 * Después: node scripts/forense-hola-ip.js
 * (y conviene QUITAR el rol al terminar).
 */

const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const PROJECT = 'barberia-elegance';
const KEY = path.resolve(__dirname, '..', 'service-account.json');

// Ventana ±90s alrededor de la llamada a upsertCliente (16:13:41.848Z).
const DESDE = '2026-08-05T16:12:30Z';
const HASTA = '2026-08-05T16:15:00Z';

// Servicios que el navegador del visitante tocó directamente. Los triggers de
// Firestore (confirmacionCita, notificarCita…) NO sirven: los invoca Google,
// no el cliente, así que su IP es interna.
const SERVICIOS = ['upsertcliente'];

(async () => {
  const auth = new GoogleAuth({ keyFile: KEY, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();

  const filtro =
    `logName="projects/${PROJECT}/logs/run.googleapis.com%2Frequests" ` +
    `AND resource.labels.service_name=(${SERVICIOS.map(s => `"${s}"`).join(' OR ')}) ` +
    `AND timestamp >= "${DESDE}" AND timestamp <= "${HASTA}"`;

  console.log('══ Filtro ══\n' + filtro + '\n');

  let pageToken, n = 0;
  try {
    do {
      const res = await client.request({
        url: 'https://logging.googleapis.com/v2/entries:list',
        method: 'POST',
        data: {
          resourceNames: [`projects/${PROJECT}`],
          filter: filtro, orderBy: 'timestamp asc', pageSize: 100,
          ...(pageToken ? { pageToken } : {}),
        },
      });
      for (const e of res.data.entries || []) {
        n++;
        const h = e.httpRequest || {};
        const svc = (e.resource && e.resource.labels && e.resource.labels.service_name) || '';
        console.log(`[${e.timestamp}] ${svc}`);
        console.log('   IP        :', h.remoteIp || '(sin dato)');
        console.log('   userAgent :', h.userAgent || '(sin dato)');
        console.log('   método    :', h.requestMethod || '', h.status || '');
        console.log('   referer   :', h.referer || '(sin dato)');
        console.log('   latencia  :', h.latency || '');
        console.log('');
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);

    console.log(`── ${n} peticiones en la ventana ──`);
    if (n === 0) {
      console.log('Sin entradas: o los request logs de Cloud Run están apagados,');
      console.log('o la ventana no coincide. Ampliar DESDE/HASTA y reintentar.');
    } else {
      console.log('La petición del visitante es la de 16:13:41–16:13:42.');
      console.log('Las demás en esa ventana son de otros locales (mismo servicio compartido).');
    }
  } catch (e) {
    const st = e.response && e.response.status;
    const msg = (e.response && e.response.data && e.response.data.error && e.response.data.error.message) || e.message;
    console.error(`ERROR [${st}]: ${msg}`);
    if (st === 403) console.error('\n→ Falta roles/logging.viewer en la service-account. Ver cabecera de este archivo.');
    process.exit(1);
  }
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
