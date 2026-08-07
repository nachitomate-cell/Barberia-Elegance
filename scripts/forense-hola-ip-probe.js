'use strict';

/**
 * Sonda de permisos: ¿podemos leer la IP del visitante?
 * La IP nunca se guardó en Firestore, así que el único lugar donde vive es
 * el request log de Cloud Run de la callable `upsertCliente` (httpRequest.remoteIp).
 * Esto comprueba qué puede y qué no puede hacer la service-account.
 */

const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const PROJECT = 'barberia-elegance';
const KEY = path.resolve(__dirname, '..', 'service-account.json');

(async () => {
  const auth = new GoogleAuth({
    keyFile: KEY,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const probe = async (label, cfg) => {
    try {
      const r = await client.request(cfg);
      console.log(`  ✓ ${label}:`, JSON.stringify(r.data).slice(0, 700));
      return r.data;
    } catch (e) {
      const st = e.response && e.response.status;
      const msg = (e.response && e.response.data && e.response.data.error && e.response.data.error.message) || e.message;
      console.log(`  ✗ ${label}: [${st}] ${msg}`);
      return null;
    }
  };

  console.log('══ ¿Qué permisos tiene la service-account? ══');
  await probe('logging.logEntries.list', {
    url: 'https://logging.googleapis.com/v2/entries:list', method: 'POST',
    data: { resourceNames: [`projects/${PROJECT}`], filter: 'severity>=DEFAULT', pageSize: 1 },
  });

  await probe('testIamPermissions (proyecto)', {
    url: `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:testIamPermissions`,
    method: 'POST',
    data: { permissions: [
      'logging.logEntries.list', 'logging.privateLogEntries.list', 'logging.views.access',
      'resourcemanager.projects.getIamPolicy', 'resourcemanager.projects.setIamPolicy',
      'run.services.get',
    ] },
  });

  await probe('getIamPolicy del proyecto', {
    url: `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:getIamPolicy`,
    method: 'POST', data: {},
  });

  console.log('\n══ ¿Existe el request log de la callable? (necesita permiso) ══');
  await probe('run.googleapis.com/requests de upsertcliente', {
    url: 'https://logging.googleapis.com/v2/entries:list', method: 'POST',
    data: {
      resourceNames: [`projects/${PROJECT}`],
      filter: `logName="projects/${PROJECT}/logs/run.googleapis.com%2Frequests" ` +
              `AND resource.labels.service_name="upsertcliente" ` +
              `AND timestamp >= "2026-08-05T16:13:00Z" AND timestamp <= "2026-08-05T16:14:30Z"`,
      pageSize: 20,
    },
  });

  console.log('\n══ ¿Están activados los audit logs de acceso a datos de Firestore? ══');
  console.log('  (si lo estuvieran, la escritura directa de la cita también traería IP)');
  await probe('audit config del proyecto', {
    url: `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:getIamPolicy`,
    method: 'POST', data: { options: { requestedPolicyVersion: 3 } },
  });

  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
