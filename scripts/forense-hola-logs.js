'use strict';

/**
 * Forense parte 3: Cloud Logging. La cita fue borrada de Firestore, pero los
 * triggers (confirmacionCita, FCM, aviso staff, upsertCliente) dejaron log.
 * Busca cualquier entrada que mencione al cliente en las últimas 48h.
 */

const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const PROJECT = 'barberia-elegance';
const KEY = path.resolve(__dirname, '..', 'service-account.json');

const TERMINOS = ['trefghut', '88555885886', 'mhhh.cpm', 'ac_00ba69644d428c4bd7', '555885886'];

(async () => {
  const auth = new GoogleAuth({
    keyFile: KEY,
    scopes: ['https://www.googleapis.com/auth/logging.read',
             'https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();

  const desde = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  const orTerms = TERMINOS.map(t => `"${t}"`).join(' OR ');
  const filtro = `timestamp >= "${desde}" AND (${orTerms})`;

  console.log('══ Filtro ══');
  console.log(filtro, '\n');

  let pageToken;
  let total = 0;
  do {
    const res = await client.request({
      url: 'https://logging.googleapis.com/v2/entries:list',
      method: 'POST',
      data: {
        resourceNames: [`projects/${PROJECT}`],
        filter: filtro,
        orderBy: 'timestamp asc',
        pageSize: 200,
        ...(pageToken ? { pageToken } : {}),
      },
    });
    const entries = res.data.entries || [];
    for (const e of entries) {
      total++;
      const fn = (e.resource && e.resource.labels &&
        (e.resource.labels.function_name || e.resource.labels.service_name)) || e.logName.split('/').pop();
      const msg = e.textPayload
        || (e.jsonPayload ? JSON.stringify(e.jsonPayload) : '')
        || (e.protoPayload ? JSON.stringify(e.protoPayload) : '');
      console.log(`[${e.timestamp}] (${e.severity || ''}) ${fn}`);
      console.log('   ', String(msg).slice(0, 2000));
      console.log('');
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  console.log(`── ${total} entradas con rastro del cliente ──`);

  // Segunda pasada: TODO lo de kronnos_limache en la ventana 15:50–16:40 UTC de hoy
  console.log('\n══ Ventana 2026-08-05 15:50→16:40 UTC · menciones a kronnos_limache ══');
  const f2 = `timestamp >= "2026-08-05T15:50:00Z" AND timestamp <= "2026-08-05T16:40:00Z" AND "kronnos_limache"`;
  let pt2, n2 = 0;
  do {
    const res = await client.request({
      url: 'https://logging.googleapis.com/v2/entries:list',
      method: 'POST',
      data: {
        resourceNames: [`projects/${PROJECT}`],
        filter: f2, orderBy: 'timestamp asc', pageSize: 200,
        ...(pt2 ? { pageToken: pt2 } : {}),
      },
    });
    for (const e of res.data.entries || []) {
      n2++;
      const fn = (e.resource && e.resource.labels &&
        (e.resource.labels.function_name || e.resource.labels.service_name)) || '';
      const msg = e.textPayload || (e.jsonPayload ? JSON.stringify(e.jsonPayload) : '');
      console.log(`[${e.timestamp}] ${fn}: ${String(msg).slice(0, 700)}`);
    }
    pt2 = res.data.nextPageToken;
  } while (pt2);
  console.log(`── ${n2} entradas ──`);
})().catch(e => {
  console.error('ERROR:', e.message);
  if (e.response && e.response.data) console.error(JSON.stringify(e.response.data, null, 2));
  process.exit(1);
});
