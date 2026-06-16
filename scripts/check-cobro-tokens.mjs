#!/usr/bin/env node
// scripts/check-cobro-tokens.mjs
// ─────────────────────────────────────────────────────────────────
//  Verifica si un tenant recibiría el push de recordatorio de cobro.
//  Replica la lógica de functions/recordatorio-cobro.js (tokensAdmin +
//  cálculo de días) para saber, sin enviar nada, si el aviso llegaría.
//
//  Uso:  node scripts/check-cobro-tokens.mjs chameleon
// ─────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import admin from 'firebase-admin';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tid = process.argv[2] || 'chameleon';

const sa = JSON.parse(readFileSync(join(ROOT, 'service-account.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const fcmTokensColPath = t => (t === 'elegance' ? 'fcm_tokens' : `tenants/${t}/fcm_tokens`);
const barberosColPath  = t => (t === 'elegance' ? 'barberos'   : `tenants/${t}/barberos`);

const TIMEZONE = 'America/Santiago';
const DIAS_RECORDATORIO = new Set([-3, -1, 0, 1, 3, 8, 15]);

function santiagoHoyUTC() {
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  const [y, m, d] = dtf.format(new Date()).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
function parseFechaUTC(f) {
  const s = typeof f === 'string' ? f : (f && f.toDate ? f.toDate().toISOString().slice(0, 10) : null);
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

(async () => {
  console.log(`\n🔎 Verificando recordatorio de cobro para tenant: "${tid}"\n`);

  // 1. Doc de billing
  const billingSnap = await db.collection('_billing').doc(tid).get();
  if (!billingSnap.exists) { console.log('❌ No existe _billing/' + tid); process.exit(0); }
  const b = billingSnap.data();
  const hoyUTC = santiagoHoyUTC();
  const dueUTC = parseFechaUTC(b.fechaProximoPago);
  const dias = dueUTC !== null ? Math.round((hoyUTC - dueUTC) / 86400000) : null;

  console.log('── Estado de facturación ──────────────────────────');
  console.log(`  fechaProximoPago : ${b.fechaProximoPago ?? '(sin fecha)'}`);
  console.log(`  estadoPago       : ${b.estadoPago ?? '(no seteado)'}`);
  console.log(`  montoPendiente   : ${b.montoPendiente ?? '-'}`);
  console.log(`  días vs venc.    : ${dias === null ? 'N/A' : dias} ${dias === 0 ? '(vence hoy)' : dias > 0 ? '(atrasado)' : '(por vencer)'}`);
  console.log(`  ¿día de aviso?   : ${dias !== null && DIAS_RECORDATORIO.has(dias) ? '✅ sí' : '⚠️ no (hoy no toca push)'}`);
  console.log(`  ya enviado hoy   : ${b.ultimoRecordatorioPush === new Date(hoyUTC).toISOString().slice(0,10) ? 'sí (idempotente)' : 'no'}`);

  // 2. Tokens admin/jefe (misma lógica que la función)
  const [bSnap, tSnap] = await Promise.all([
    db.collection(barberosColPath(tid)).get(),
    db.collection(fcmTokensColPath(tid)).where('activo', '==', true).get(),
  ]);
  const uids = new Set();
  const adminList = [];
  bSnap.forEach(doc => {
    const x = doc.data();
    if (x.activo === false) return;
    if (x.rol === 'jefe' || x.rol === 'admin') {
      uids.add(doc.id); if (x.uid) uids.add(x.uid);
      adminList.push(`${x.nombre || '(sin nombre)'} [${x.rol}]`);
    }
  });
  const tokens = [];
  tSnap.forEach(doc => { const x = doc.data(); if (x.token && uids.has(x.uid)) tokens.push(doc.id); });

  console.log('\n── Destinatarios (admin/jefe) ─────────────────────');
  console.log(`  admins/jefes     : ${adminList.length ? adminList.join(', ') : '(ninguno)'}`);
  console.log(`  tokens activos   : ${tSnap.size} en total, ${tokens.length} de admin/jefe`);

  // 3. Veredicto
  console.log('\n── Veredicto ──────────────────────────────────────');
  if (!tokens.length) {
    console.log('  ❌ NO le llegaría el push: el admin/jefe no tiene notificaciones activas.');
    console.log('     (debe activarlas desde el panel para recibir avisos de cobro)');
  } else if (dias === null || !DIAS_RECORDATORIO.has(dias)) {
    console.log('  ⚠️ Tiene tokens, pero HOY no es día de aviso. Llegaría en el próximo día de la lista (-3,-1,0,+1,+3,+8,+15).');
  } else {
    console.log(`  ✅ SÍ le llegaría el push a ${tokens.length} dispositivo(s) en la corrida de las 10:00 AM (Santiago).`);
  }
  console.log('');
  process.exit(0);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
