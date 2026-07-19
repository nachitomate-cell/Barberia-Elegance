'use strict';

// scripts/migrar-passwordless-elegance-chameleon.js
// ─────────────────────────────────────────────────────────────────
//  MIGRACIÓN PASSWORDLESS — elegance + chameleon (2026-07-19)
//
//  Contexto: el Club es passwordless global desde 2026-07. El login
//  intenta la password interna del tenant (clubPassword() en
//  registro.html) — para elegance/chameleon es el DEFAULT
//  'AuraLoyaltyPassword2026!'. Las cuentas viejas con contraseña
//  propia fallan y el fallback les pide su contraseña antigua, que
//  nadie recuerda → no pueden entrar.
//
//  Este script resetea la contraseña de TODOS los usuarios del club
//  de ambos tenants a la password interna, para que el login
//  passwordless (solo email) les funcione de inmediato.
//
//  PROTECCIONES:
//   · NO toca cuentas con custom claims de staff (admin/jefe/barbero…)
//     — su contraseña real es su acceso a gestion-interna.
//   · NO toca superadmins.
//   · NO toca cuentas solo-Google (entran con el botón de Google).
//   · user-not-found en Auth (docs huérfanos) → se salta y reporta.
//
//  Efecto colateral esperado: a los reseteados se les cierran las
//  sesiones activas (revocación estándar de Firebase al cambiar
//  password) — al volver, entran solo con su email.
//
//  USO:  node scripts/migrar-passwordless-elegance-chameleon.js          (dry-run)
//        node scripts/migrar-passwordless-elegance-chameleon.js --aplicar
// ─────────────────────────────────────────────────────────────────

const path = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// Espejo de clubPassword() en registro.html: elegance y chameleon no
// tienen entrada propia → caen al default. NO cambiar (las cuentas
// passwordless nuevas de estos tenants ya se crearon con este valor).
const CLUB_PASSWORD = 'AuraLoyaltyPassword2026!';

const SUPERADMINS = ['ignaciiio.mate@gmail.com'];
const APLICAR = process.argv.includes('--aplicar');

const TENANTS = [
  { id: 'elegance', usersCol: 'users' },
  { id: 'chameleon', usersCol: 'tenants/chameleon/users' },
];

// Concurrencia moderada: Auth admite ~10 ops/s sin drama.
const LOTE = 5;

async function procesarTenant({ id, usersCol }) {
  console.log(`\n═══ Tenant ${id} (${usersCol}) ═══`);
  const snap = await db.collection(usersCol).get();
  console.log(`Docs de club: ${snap.size}`);

  const stats = { reseteados: 0, staff: 0, soloGoogle: 0, sinAuth: 0, sinEmail: 0, errores: 0 };
  const detalleStaff = [];

  const uids = snap.docs.map((d) => d.id);
  for (let i = 0; i < uids.length; i += LOTE) {
    const lote = uids.slice(i, i + LOTE);
    await Promise.all(lote.map(async (uid) => {
      let u;
      try {
        u = await admin.auth().getUser(uid);
      } catch (e) {
        if (e.code === 'auth/user-not-found') { stats.sinAuth += 1; return; }
        stats.errores += 1;
        console.warn(`  ! getUser(${uid}): ${e.message}`);
        return;
      }
      const email = (u.email || '').toLowerCase();
      if (!email) { stats.sinEmail += 1; return; }

      // Staff fuera: su contraseña real es el acceso al panel.
      const role = u.customClaims && u.customClaims.role;
      if (role || SUPERADMINS.includes(email)) {
        stats.staff += 1;
        detalleStaff.push(`${email} (${role || 'superadmin'})`);
        return;
      }

      // Solo-Google: no usan password para entrar, no hay nada que migrar.
      const providers = (u.providerData || []).map((p) => p.providerId);
      if (!providers.includes('password')) { stats.soloGoogle += 1; return; }

      if (APLICAR) {
        try {
          await admin.auth().updateUser(uid, { password: CLUB_PASSWORD });
          stats.reseteados += 1;
        } catch (e) {
          stats.errores += 1;
          console.warn(`  ! updateUser(${email}): ${e.message}`);
        }
      } else {
        stats.reseteados += 1; // dry-run: los que SE resetearían
      }
    }));
    if ((i / LOTE) % 20 === 0 && i > 0) console.log(`  … ${i}/${uids.length}`);
  }

  console.log(`${APLICAR ? 'Reseteados' : 'Se resetearían'}: ${stats.reseteados}`);
  console.log(`Saltados — staff: ${stats.staff} | solo Google: ${stats.soloGoogle} | sin cuenta Auth: ${stats.sinAuth} | sin email: ${stats.sinEmail} | errores: ${stats.errores}`);
  if (detalleStaff.length) console.log(`Staff protegido: ${detalleStaff.join(', ')}`);
  return stats;
}

(async () => {
  console.log(APLICAR
    ? '🔴 MODO APLICAR — se cambiarán contraseñas en Firebase Auth.'
    : '🟡 DRY-RUN — solo conteo, no se cambia nada. Agrega --aplicar para ejecutar.');
  const total = { reseteados: 0, staff: 0, soloGoogle: 0, sinAuth: 0, sinEmail: 0, errores: 0 };
  for (const t of TENANTS) {
    const s = await procesarTenant(t);
    Object.keys(total).forEach((k) => { total[k] += s[k]; });
  }
  console.log(`\n═══ TOTAL ═══`);
  console.log(total);
  process.exit(0);
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
