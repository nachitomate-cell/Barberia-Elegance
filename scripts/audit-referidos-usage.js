'use strict';

/**
 * scripts/audit-referidos-usage.js
 * ─────────────────────────────────────────────────────────────────
 *  Reporta uso del programa de referidos B2C por tenant:
 *   - Cuántos users tienen referralCode
 *   - Cuántos usaron un referralCode al registrarse (referredByCode)
 *   - Cuántos completaron el flujo (referralRewardsGranted)
 *   - Config del programa: activo? qué recompensas?
 *   - Estado de los users en pending_first_visit (potencial no realizado)
 *
 *  Uso:
 *    node scripts/audit-referidos-usage.js aura chameleon yugen elegance
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
const fs = require('fs');

const SERVICE_PATH = path.resolve(__dirname, '..', 'service-account.json');
if (!fs.existsSync(SERVICE_PATH)) {
  console.error(`ERROR: service-account no existe: ${SERVICE_PATH}`);
  process.exit(1);
}

const tenantIds = process.argv.slice(2);
if (!tenantIds.length) {
  console.error('Uso: node scripts/audit-referidos-usage.js <tid> [tid...]');
  process.exit(1);
}

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(SERVICE_PATH)) });
const db = admin.firestore();

function usersCol(tid) {
  return tid === 'elegance' ? db.collection('users') : db.collection('tenants').doc(tid).collection('users');
}
function settingsGeneralRef(tid) {
  return tid === 'elegance' ? db.doc('settings/general') : db.doc(`tenants/${tid}/settings/general`);
}

async function auditTenant(tid) {
  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(` ${tid.toUpperCase()}`);
  console.log(`══════════════════════════════════════════════════════════`);

  const [usersSnap, setSnap] = await Promise.all([
    usersCol(tid).get(),
    settingsGeneralRef(tid).get(),
  ]);

  const rp = setSnap.exists ? (setSnap.data()?.referralProgram || {}) : {};
  const activo = rp.enabled === true;
  console.log(`  Programa activo: ${activo ? '🟢 SI' : '🔴 NO'}`);
  if (activo) {
    const rrDor = rp.recompensaReferidor;
    const rrDo  = rp.recompensaReferido;
    console.log(`  Recompensa REFERIDOR: ${rrDor ? `${rrDor.categoria || '?'} — ${rrDor.textoDinamico || '(sin texto)'}` : '(no configurada)'}`);
    console.log(`  Recompensa REFERIDO:  ${rrDo  ? `${rrDo.categoria  || '?'} — ${rrDo.textoDinamico  || '(sin texto)'}` : '(no configurada)'}`);
  }

  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const conCodigo         = users.filter(u => u.referralCode).length;
  const usaronCodigo      = users.filter(u => u.referredByCode).length;
  const conRecompensa     = users.filter(u => u.referralRewardsGranted === true).length;
  const pendientes        = users.filter(u => u.referredByCode && !u.referralRewardsGranted).length;

  console.log(`\n  Users totales:                    ${users.length.toLocaleString('es-CL')}`);
  console.log(`  Con referralCode generado:        ${conCodigo}  (${((conCodigo/users.length)*100).toFixed(0)}%)`);
  console.log(`  Se registraron CON código de otro: ${usaronCodigo}`);
  console.log(`    · Con recompensa otorgada:      ${conRecompensa}`);
  console.log(`    · Pendientes (no completaron):  ${pendientes}`);

  if (usaronCodigo > 0) {
    // Top referidores: contar cuántos referredByCode apuntan a cada código
    const contByCode = {};
    users.filter(u => u.referredByCode).forEach(u => {
      contByCode[u.referredByCode] = (contByCode[u.referredByCode] || 0) + 1;
    });
    const codesTop = Object.entries(contByCode).sort((a,b) => b[1]-a[1]).slice(0, 5);
    if (codesTop.length) {
      console.log(`\n  ── Top 5 códigos más usados ──`);
      for (const [code, n] of codesTop) {
        // Buscar quién es dueño de ese código
        const owner = users.find(u => u.referralCode === code);
        const nombre = owner?.nombre || '(desconocido)';
        console.log(`    ${code.padEnd(12)}  ${n} referidos  ← ${nombre}`);
      }
    }
  }
}

async function main() {
  for (const tid of tenantIds) {
    try {
      await auditTenant(tid);
    } catch (e) {
      console.error(`✗ Error en ${tid}: ${e.message}`);
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
