// _qa-manual-inspect.mjs — Inspector para las pruebas E2E manuales de Fase 3.C.
//
// USO:
//   node _qa-manual-inspect.mjs                     # busca por email/tel default
//   node _qa-manual-inspect.mjs --email=x --tel=y   # override
//
// Muestra:
//   · Users en tenants/delnero/users que matcheen email o tel
//   · Citas en tenants/delnero/citas del cliente (clienteUid o clienteTelefono)
//   · Cualquier doc en tenants/delnero/clientes/ (debería ser 0 post Fase 3.C)

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const EMAIL = (args.email || 'manual.qa.fase3c@test.local').toLowerCase();
const TEL   = args.tel   || '569555003707';
const TENANT = 'delnero';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const usersCol    = db.collection(`tenants/${TENANT}/users`);
const citasCol    = db.collection(`tenants/${TENANT}/citas`);
const clientesCol = db.collection(`tenants/${TENANT}/clientes`);

function short(v, n = 60) {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s?.length > n ? s.slice(0, n) + '…' : s;
}

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  QA INSPECT — ${TENANT}`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Tel:   ${TEL}`);

  // ── USERS ────────────────────────────────────────────────────────
  console.log(`\n── users/ (email + tel + telefonoSuf9) ────────────────────────`);
  const suf9 = TEL.replace(/\D/g, '').slice(-9);
  const seen = new Set();
  const users = [];

  const qE = await usersCol.where('email', '==', EMAIL).get();
  for (const d of qE.docs) if (!seen.has(d.id)) { seen.add(d.id); users.push(d); }
  const qEL = await usersCol.where('emailLower', '==', EMAIL).get();
  for (const d of qEL.docs) if (!seen.has(d.id)) { seen.add(d.id); users.push(d); }
  const qT = await usersCol.where('telefono', '==', TEL).get();
  for (const d of qT.docs) if (!seen.has(d.id)) { seen.add(d.id); users.push(d); }
  const qS = await usersCol.where('telefonoSuf9', '==', suf9).get();
  for (const d of qS.docs) if (!seen.has(d.id)) { seen.add(d.id); users.push(d); }

  if (users.length === 0) {
    console.log(`   (ninguno)`);
  } else {
    for (const d of users) {
      const u = d.data();
      const isAuthUid = !d.id.startsWith('ac_') && !/^\d+$/.test(d.id);
      const tag = d.id.startsWith('ac_') ? '📦 ac' : isAuthUid ? '🔐 auth' : '☎️ tel';
      console.log(`\n   ${tag}  ${d.id}`);
      console.log(`      nombre=${short(u.nombre)}  email=${short(u.email)}  tel=${short(u.telefono)}`);
      console.log(`      sellos disponibles=${u.sellosDisponibles ?? 0}  históricos=${u.sellosHistoricos ?? 0}  stamps=${u.stamps ?? 0}`);
      console.log(`      historial len=${(u.historialSellos || []).length}  packs=${(u.packsActivos || []).length}`);
      if (u.fusionadoCon) console.log(`      ⚡ FUSIONADO CON: ${u.fusionadoCon}`);
      if (u.nextSuggestionDate) console.log(`      recordatorio: next=${u.nextSuggestionDate.toDate?.().toISOString?.().split('T')[0]} avg=${u.avgIntervalDias}d notif=${u.notificacionesActivas}`);
    }
  }

  // ── CITAS ────────────────────────────────────────────────────────
  console.log(`\n── citas/ (por uid + por tel) ─────────────────────────────────`);
  const citaSeen = new Set();
  const citas = [];
  for (const u of users) {
    const q = await citasCol.where('clienteUid', '==', u.id).get();
    for (const d of q.docs) if (!citaSeen.has(d.id)) { citaSeen.add(d.id); citas.push(d); }
    const qU = await citasCol.where('userId', '==', u.id).get();
    for (const d of qU.docs) if (!citaSeen.has(d.id)) { citaSeen.add(d.id); citas.push(d); }
  }
  // Fallback por teléfono (variantes)
  const telVariants = new Set([TEL, `+${TEL}`, `+56 9 ${TEL.slice(-8, -4)} ${TEL.slice(-4)}`]);
  for (const v of telVariants) {
    const q = await citasCol.where('clienteTelefono', '==', v).get();
    for (const d of q.docs) if (!citaSeen.has(d.id)) { citaSeen.add(d.id); citas.push(d); }
  }

  if (citas.length === 0) {
    console.log(`   (ninguna)`);
  } else {
    for (const d of citas) {
      const c = d.data();
      console.log(`\n   📅 ${d.id}  fecha=${c.fecha} ${c.hora || ''}  estado=${c.estado}`);
      console.log(`      cliente="${c.clienteNombre || ''}"  tel="${c.clienteTelefono || ''}"  email="${c.clienteEmail || ''}"`);
      console.log(`      clienteUid=${c.clienteUid || '—'}  userId=${c.userId || '—'}  userIdLegacy=${c.userIdLegacy || '—'}`);
      console.log(`      servicio="${c.servicioNombre || c.servicio || ''}"  precio=${c.precio || '—'}`);
      if (c.selloProcesado) console.log(`      ✅ selloProcesado=${c.selloProcesadoTipo || 'sí'}  en ${c.selloProcesadoEn?.toDate?.().toISOString?.() || '?'}`);
      if (c.rescatadoPorTrigger) console.log(`      🚑 rescatado por trigger`);
    }
  }

  // ── CLIENTES (invariante: debe ser 0) ────────────────────────────
  console.log(`\n── clientes/ (invariante: debe ser 0) ─────────────────────────`);
  const cliSeen = new Set();
  const clis = [];
  const qCE = await clientesCol.where('email', '==', EMAIL).get();
  for (const d of qCE.docs) if (!cliSeen.has(d.id)) { cliSeen.add(d.id); clis.push(d); }
  const qCT = await clientesCol.where('telefono', '==', TEL).get();
  for (const d of qCT.docs) if (!cliSeen.has(d.id)) { cliSeen.add(d.id); clis.push(d); }
  try {
    const dByPhoneId = await clientesCol.doc(TEL).get();
    if (dByPhoneId.exists && !cliSeen.has(dByPhoneId.id)) { cliSeen.add(dByPhoneId.id); clis.push(dByPhoneId); }
  } catch (_) {}

  if (clis.length === 0) {
    console.log(`   ✅ vacío (invariante OK)`);
  } else {
    console.log(`   ❌ ${clis.length} doc(s) en clientes/ — NO deberían existir post Fase 3.C:`);
    for (const d of clis) {
      const c = d.data();
      console.log(`      ${d.id}  nombre="${c.nombre}"  sellosD=${c.sellosDisponibles}  historial=${(c.historial||[]).length}`);
    }
  }

  console.log(`\n───────────────────────────────────────────────────────────────\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
