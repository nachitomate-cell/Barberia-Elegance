// Backfill de citas huérfanas — Task #15.
//
// Problema: citas pre-Fase 1 (o creadas cuando el CF client-side falló Y el
// trigger rescate aún no existía) tienen clienteUid=NULL y clienteId=NULL.
// Sus clientes no aparecen en users/ ni en clientes/, así que son invisibles
// en el buscador de agenda y en el panel /gestion-interna/clientes.
//
// Detectado en aura: 758 citas (97% del total) sin link. Probable patrón
// similar en oren, kronnos y otros tenants con historia.
//
// USO:
//   node _backfill-citas-huerfanas.mjs --tenant=aura              # dry-run
//   node _backfill-citas-huerfanas.mjs --tenant=aura --apply      # ejecuta
//   node _backfill-citas-huerfanas.mjs --tenant=aura --apply --limit=100
//   node _backfill-citas-huerfanas.mjs --tenant=aura --apply --concurrency=8
//
// ARGS:
//   --tenant=<id>       (obligatorio)
//   --apply             (opt-in; sin él, dry-run)
//   --limit=<n>         (opt; max citas a procesar, default 5000)
//   --concurrency=<n>   (opt; llamadas paralelas al upsert, default 5)
//
// LÓGICA:
//   Por cada cita sin clienteUid/userId Y con clienteNombre válido:
//     · Si tiene email o tel: llamar _upsertClienteCore → obtener uid canónico
//     · Actualizar la cita con { clienteUid, userId, backfilledAt }
//     · Si el cliente ya existe (email/tel match): reusa uid (no duplica)
//     · Si no existe: crea con docId 'ac_<hash>' (el upsert lo hace determinístico)
//
// SAFETY:
//   · Backup automático de citas afectadas antes de tocar
//   · Skip citas sin nombre O sin email+tel (no crear users basura)
//   · Skip citas con clienteNombre placeholder ("sin nombre", "cliente" solo)
//   · Concurrency limitada para no rate-limitar Firestore
//   · Fail-safe: cita huérfana ante error individual se salta, no aborta todo

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const TENANT = args.tenant;
const APPLY  = args.apply === true;
const LIMIT  = Number.isFinite(Number(args.limit)) ? Number(args.limit) : 5000;
const CONCURRENCY = Number.isFinite(Number(args.concurrency)) ? Number(args.concurrency) : 5;
if (!TENANT) { console.error('ERROR: --tenant=<id> requerido.'); process.exit(1); }

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const require = createRequire(import.meta.url);
const { _upsertClienteCore } = require('./upsert-cliente.js');

const citasCol = TENANT === 'elegance' ? db.collection('citas') : db.collection(`tenants/${TENANT}/citas`);

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupPath = join('_snapshots/backfill', `${TENANT}-${ts}`);
if (!existsSync(backupPath)) mkdirSync(backupPath, { recursive: true });

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  BACKFILL CITAS HUÉRFANAS — tenant "${TENANT}"                     `);
console.log(`║  Modo: ${APPLY ? 'APPLY (ejecuta)' : 'DRY-RUN (solo plan)'}                    `);
console.log(`║  Backup: ${backupPath}                                              `);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

// Fetch citas
console.log('[1/3] Fetch citas...');
const allSnap = await citasCol.get();
console.log(`      Total citas: ${allSnap.size}`);

// Filtro citas candidatas
const candidatas = [];
const skipStats = { conUid: 0, sinNombre: 0, nombrePlaceholder: 0, sinEmailNiTel: 0 };
const NOMBRE_PLACEHOLDER = /^(sin\s+nombre|cliente|s\/n|anonimo|anónimo|test)\.?$/i;

allSnap.docs.forEach(d => {
  const c = d.data();
  if (c.clienteUid || c.userId) { skipStats.conUid++; return; }
  const nombre = (c.clienteNombre || '').trim();
  if (!nombre) { skipStats.sinNombre++; return; }
  if (NOMBRE_PLACEHOLDER.test(nombre)) { skipStats.nombrePlaceholder++; return; }
  const email = (c.clienteEmail || '').trim();
  const tel   = (c.clienteTelefono || '').trim();
  if (!email && !tel) { skipStats.sinEmailNiTel++; return; }
  candidatas.push({ id: d.id, ref: d.ref, data: c });
});

console.log(`      Skipped:`);
console.log(`        · ya tienen clienteUid: ${skipStats.conUid}`);
console.log(`        · sin clienteNombre:    ${skipStats.sinNombre}`);
console.log(`        · nombre placeholder:   ${skipStats.nombrePlaceholder}`);
console.log(`        · sin email ni tel:     ${skipStats.sinEmailNiTel}`);
console.log(`      Candidatas a backfill:    ${candidatas.length}`);

// Backup
writeFileSync(join(backupPath, 'candidatas.json'), JSON.stringify(candidatas.map(c => ({ id: c.id, ...c.data })), null, 2));
console.log(`      ✓ Backup en ${backupPath}/candidatas.json\n`);

// Procesar con concurrency limitada
const toProcess = candidatas.slice(0, LIMIT);
console.log(`[2/3] ${APPLY ? 'Ejecutando' : 'Simulando'} backfill (${toProcess.length} citas, concurrency=${CONCURRENCY})...`);

const log = { linkeadas: [], errores: [], porMatchedBy: { email: 0, tel: 0, 'tel-diff-email': 0, 'tel-ambiguo': 0, none: 0 } };
let done = 0;

async function procesarCita(cita) {
  const { id, ref, data } = cita;
  const nombre = data.clienteNombre.trim();
  const email  = (data.clienteEmail || '').trim();
  const tel    = (data.clienteTelefono || '').trim();

  try {
    // Pasar dryRun al upsert: sin él, el CF ejecuta escrituras reales
    // aunque el script esté en modo dry-run. Con dryRun=true el CF retorna
    // el uid que USARÍA (para docs existentes) o null (para docs nuevos).
    const res = await _upsertClienteCore({
      tenantId: TENANT,
      nombre,
      email,
      telefono: tel,
      dryRun: !APPLY,
    });
    // En dry-run + create, uid viene null → skipear con log pero no error.
    const uid = res?.uid;
    if (!uid) {
      if (!APPLY && res?.wouldCreate) {
        log.linkeadas.push({ citaId: id, uid: '(dry-run-would-create)', matchedBy: 'none', wasCreated: true, cliente: nombre });
        log.porMatchedBy.none = (log.porMatchedBy.none || 0) + 1;
        return;
      }
      log.errores.push({ citaId: id, error: 'upsert sin uid' });
      return;
    }

    const matchedBy = res.matchedBy || 'none';
    log.porMatchedBy[matchedBy] = (log.porMatchedBy[matchedBy] || 0) + 1;
    const entry = { citaId: id, uid, matchedBy, wasCreated: res.wasCreated, cliente: nombre };
    log.linkeadas.push(entry);

    if (APPLY) {
      await ref.update({
        clienteUid: uid,
        userId:     uid,
        backfilledAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (e) {
    log.errores.push({ citaId: id, cliente: nombre, error: e.message });
  } finally {
    done++;
    if (done % 50 === 0) console.log(`      ${done}/${toProcess.length} procesadas`);
  }
}

// Concurrency simple con pool
async function runPool(items, worker, concurrency) {
  const executing = new Set();
  for (const item of items) {
    const p = worker(item).finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= concurrency) await Promise.race(executing);
  }
  await Promise.all(executing);
}
await runPool(toProcess, procesarCita, CONCURRENCY);

// Resumen
console.log(`\n[3/3] Resumen`);
const summary = {
  tenant: TENANT,
  timestamp: ts,
  mode: APPLY ? 'apply' : 'dry-run',
  citas_total: allSnap.size,
  candidatas: candidatas.length,
  procesadas: toProcess.length,
  linkeadas: log.linkeadas.length,
  errores: log.errores.length,
  matchedBy_email: log.porMatchedBy.email || 0,
  matchedBy_tel:   log.porMatchedBy.tel   || 0,
  matchedBy_none:  log.porMatchedBy.none  || 0,
  users_creados:  log.linkeadas.filter(x => x.wasCreated).length,
  users_reusados: log.linkeadas.filter(x => !x.wasCreated).length,
  skip: skipStats,
  backup_path: backupPath,
};
writeFileSync(join(backupPath, 'plan.json'), JSON.stringify({ summary, log }, null, 2));

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  RESUMEN                                                      ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
Object.entries(summary).forEach(([k, v]) => {
  if (typeof v === 'object' && v !== null) return; // skip nested
  console.log(`  ${k.padEnd(20)}: ${v}`);
});
console.log(`\n  Log detallado: ${backupPath}/plan.json`);
if (log.errores.length) {
  console.log(`\n  Primeros 5 errores:`);
  log.errores.slice(0, 5).forEach(e => console.log(`    · ${JSON.stringify(e)}`));
}
if (!APPLY) console.log(`\n  Para EJECUTAR: agregá --apply.`);
process.exit(log.errores.length > toProcess.length * 0.1 ? 1 : 0);
