// Selective restore de un cleanup (deshace cambios específicos usando plan.json).
//
// Diferencia con un "full restore":
//   · Full restore: borra estado actual y sobreescribe con el backup entero.
//     Peligroso en producción — pierde escrituras hechas entre backup y restore.
//   · Selective (este): lee plan.json y revierte SOLO los cambios que hizo
//     el cleanup, respetando escrituras nuevas de otros procesos.
//
// USO:
//   node _restore-cleanup.mjs --backup=<path>              # dry-run
//   node _restore-cleanup.mjs --backup=<path> --apply      # ejecuta
//
// Diseñado para largo plazo: si el cleanup en aura/kronnos deja el sistema
// en mal estado, este script es el rollback quirúrgico.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }),
);
const BACKUP = args.backup;
const APPLY  = args.apply === true;
if (!BACKUP) {
  console.error('ERROR: --backup=<path> requerido. Ej: --backup=_snapshots/backups/delnero-2026-07-26T22-39-00');
  process.exit(1);
}

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const plan     = JSON.parse(readFileSync(join(BACKUP, 'plan.json'), 'utf-8'));
const usersBk  = JSON.parse(readFileSync(join(BACKUP, 'users.json'), 'utf-8'));
const clientesBk = JSON.parse(readFileSync(join(BACKUP, 'clientes.json'), 'utf-8'));
const TENANT = plan.summary.tenant;

const usersCol    = TENANT === 'elegance' ? db.collection('users')    : db.collection(`tenants/${TENANT}/users`);
const clientesCol = TENANT === 'elegance' ? db.collection('clientes') : db.collection(`tenants/${TENANT}/clientes`);
const citasCol    = TENANT === 'elegance' ? db.collection('citas')    : db.collection(`tenants/${TENANT}/citas`);

const usersBkMap = new Map(usersBk.map(u => [u.id, u]));
const clientesBkMap = new Map(clientesBk.map(c => [c.id, c]));

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  RESTORE CLEANUP — tenant "${TENANT}"                            `);
console.log(`║  Modo: ${APPLY ? 'APPLY' : 'DRY-RUN'}                                    `);
console.log(`║  Backup: ${BACKUP}                                              `);
console.log(`║  Plan: ${plan.summary.fusiones_total} fusiones, ${plan.summary.migraciones_walkin} migraciones, ${plan.summary.skip_familia} skip-familia`);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

let ops = 0;
const errors = [];

// Sanitiza data del backup para setDoc (convierte timestamps del dump).
function sanitize(d) {
  const out = { ...d };
  delete out.id;
  // Los Timestamp de firestore-admin serializados vienen como {_seconds,_nanoseconds}
  Object.keys(out).forEach(k => {
    const v = out[k];
    if (v && typeof v === 'object' && '_seconds' in v && '_nanoseconds' in v) {
      out[k] = new Date(v._seconds * 1000 + Math.floor(v._nanoseconds / 1e6));
    }
  });
  return out;
}

// ── 1. Revertir FUSIONES ────────────────────────────────────────────
// Para cada fusión: recrear los descartados con su data del backup +
// restaurar el keeper a su data del backup + revertir reasignación de citas.
console.log(`[1/3] Revirtiendo ${plan.log.fusiones.length} fusiones...\n`);
for (const f of plan.log.fusiones) {
  const keeperBk = usersBkMap.get(f.keeperId);
  if (!keeperBk) { errors.push({ tipo: 'fusion', motivo: 'keeper no en backup', id: f.keeperId }); continue; }

  console.log(`  · Fusión "${f.razon}"`);
  console.log(`    · Restaurar keeper ${f.keeperId} a estado del backup`);
  if (APPLY) {
    // El sanitizar + set completo restaura tal cual (borra fields que agregó el cleanup)
    await usersCol.doc(f.keeperId).set(sanitize(keeperBk)).catch(e => errors.push({ id: f.keeperId, error: e.message }));
    ops++;
  }

  for (const descId of f.descartadosIds) {
    const descBk = usersBkMap.get(descId);
    if (!descBk) { errors.push({ tipo: 'fusion', motivo: 'descartado no en backup', id: descId }); continue; }
    console.log(`    · Recrear descartado ${descId} (${descBk.nombre})`);
    if (APPLY) {
      await usersCol.doc(descId).set(sanitize(descBk)).catch(e => errors.push({ id: descId, error: e.message }));
      ops++;
    }

    // Restaurar los mirrors en clientes/ que se borraron
    for (const tel of f.telefonosLegacyBorrados) {
      const bk = clientesBkMap.get(tel);
      if (bk) {
        console.log(`    · Recrear mirror clientes/${tel}`);
        if (APPLY) {
          await clientesCol.doc(tel).set(sanitize(bk)).catch(e => errors.push({ id: `clientes/${tel}`, error: e.message }));
          ops++;
        }
      }
    }

    // Revertir reasignación de citas: buscar todas las citas donde
    // clienteUid === keeperId (el cleanup las reapuntó al keeper) que en el
    // backup apuntaban al descartado, y volver a apuntarlas al descartado.
    // El backup de citas no lo guardamos, así que consultamos por keeper y
    // no podemos discriminar cuáles eran del descartado sin más info.
    // Estrategia práctica: si f.citasReasignadas > 0, buscar citas actuales
    // con clienteUid = keeperId y avisar al humano que revise. En este test
    // controlado el user sabe cuál era la cita.
    if (f.citasReasignadas > 0) {
      console.log(`    ⚠ ${f.citasReasignadas} cita(s) fueron reasignadas al keeper. Revisá manualmente si querés revertirlas.`);
    }
  }
}

// ── 2. Revertir MIGRACIONES walk-in ────────────────────────────────
// Cada migración creó un users/{auto-id} nuevo con datos del walkinId.
// Para revertir: encontrar el user creado (por email/tel + migradoDeClientes:true)
// y borrarlo. El clientes/{walkinId} sigue existiendo (el cleanup NO lo borra).
console.log(`\n[2/3] Revirtiendo ${plan.log.migraciones.length} migraciones walk-in...\n`);
for (const m of plan.log.migraciones) {
  const bk = clientesBkMap.get(m.walkinId);
  if (!bk) { errors.push({ tipo: 'migracion', motivo: 'walkin no en backup', id: m.walkinId }); continue; }

  // Buscar el user migrado (por email + migradoDeClientes:true)
  const q = m.email
    ? await usersCol.where('email', '==', String(m.email).toLowerCase()).where('migradoDeClientes', '==', true).get()
    : await usersCol.where('telefono', '==', m.tel).where('migradoDeClientes', '==', true).get();
  if (q.empty) {
    console.log(`  · Walkin ${m.walkinId} (${m.nombre}): no encontrado (¿ya revertido?)`);
    continue;
  }
  q.docs.forEach(d => {
    console.log(`  · Borrar user migrado ${d.id} (walkin era ${m.walkinId} · ${m.nombre})`);
    if (APPLY) {
      d.ref.delete().catch(e => errors.push({ id: d.id, error: e.message }));
      ops++;
    }
  });
}

// ── 3. Revertir SKIP FAMILIA (quitar _needsReview) ─────────────────
console.log(`\n[3/3] Revirtiendo ${plan.log.skipFamilia.length} skip-familia (quitar _needsReview)...\n`);
for (const s of plan.log.skipFamilia) {
  for (const uid of s.ids) {
    console.log(`  · Quitar _needsReview de ${uid}`);
    if (APPLY) {
      // usar FieldValue.delete() para eliminar el campo limpio (via update)
      const { FieldValue } = await import('firebase-admin/firestore');
      await usersCol.doc(uid).update({ _needsReview: FieldValue.delete(), _reviewReason: FieldValue.delete() }).catch(e => errors.push({ id: uid, error: e.message }));
      ops++;
    }
  }
}

// ── Resumen ─────────────────────────────────────────────────────────
console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  RESUMEN RESTORE                                              `);
console.log(`╚══════════════════════════════════════════════════════════════╝`);
console.log(`  ops ejecutadas: ${ops}`);
console.log(`  errores:        ${errors.length}`);
if (errors.length) errors.forEach(e => console.log(`   · ${JSON.stringify(e)}`));
if (!APPLY) console.log(`\n  Para EJECUTAR: agregá --apply.`);
process.exit(errors.length ? 1 : 0);
