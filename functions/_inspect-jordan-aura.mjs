// Diagnosis Jordan Zamora en aura — cita completada sin sello.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const TENANT = 'aura';
const EMAIL  = 'jordanzamora.f@gmail.com';
const TEL    = '56966407094';
const SUF9   = TEL.slice(-9);

const usersCol = db.collection(`tenants/${TENANT}/users`);
const citasCol = db.collection(`tenants/${TENANT}/citas`);

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  DIAG · aura · jordanzamora.f@gmail.com · ${TEL}`);
console.log(`╚══════════════════════════════════════════════════════════════╝`);

// ── USERS: todas las variantes ─────────────────────────────────────
console.log(`\n── USERS/ (por email, emailLower, telefono, telefonoSuf9) ────`);
const seen = new Set(); const users = [];
for (const [field, val] of [
  ['email', EMAIL], ['emailLower', EMAIL],
  ['telefono', TEL], ['telefono', `+${TEL}`],
  ['telefonoSuf9', SUF9],
]) {
  const q = await usersCol.where(field, '==', val).get();
  for (const d of q.docs) if (!seen.has(d.id)) { seen.add(d.id); users.push(d); }
}
// docId numérico legado
try {
  const legacy = await usersCol.doc(TEL).get();
  if (legacy.exists && !seen.has(legacy.id)) { seen.add(legacy.id); users.push(legacy); }
} catch (_) {}

if (!users.length) {
  console.log('   ❌ NO existe user en users/ con este email o tel.');
} else {
  for (const d of users) {
    const u = d.data();
    const tag = d.id.startsWith('ac_') ? '📦 ac' : /^\d+$/.test(d.id) ? '☎️ tel' : '🔐 auth';
    console.log(`\n   ${tag}  ${d.id}`);
    console.log(`      nombre="${u.nombre || ''}"  email="${u.email || ''}"  tel="${u.telefono || ''}"  suf9=${u.telefonoSuf9 || '-'}`);
    console.log(`      sellosDisponibles=${u.sellosDisponibles ?? 0}  sellosHistoricos=${u.sellosHistoricos ?? 0}  stamps=${u.stamps ?? 0}`);
    console.log(`      historial len=${(u.historialSellos || []).length}`);
    if (u.fusionadoCon) console.log(`      ⚡ FUSIONADO CON: ${u.fusionadoCon}`);
    if (u.esLegacy)     console.log(`      esLegacy=true`);
    if (u.createdAt)    console.log(`      createdAt=${u.createdAt.toDate?.().toISOString()}`);
  }
}

// ── CITAS: buscar por uid + por tel ─────────────────────────────────
console.log(`\n── CITAS/ (por clienteUid + userId + clienteTelefono variantes) ─`);
const citaSeen = new Set(); const citas = [];
for (const u of users) {
  for (const field of ['clienteUid', 'userId']) {
    const q = await citasCol.where(field, '==', u.id).get();
    for (const d of q.docs) if (!citaSeen.has(d.id)) { citaSeen.add(d.id); citas.push(d); }
  }
}
for (const tv of [TEL, `+${TEL}`, `+56 9 ${TEL.slice(-8, -4)} ${TEL.slice(-4)}`]) {
  const q = await citasCol.where('clienteTelefono', '==', tv).get();
  for (const d of q.docs) if (!citaSeen.has(d.id)) { citaSeen.add(d.id); citas.push(d); }
}

if (!citas.length) {
  console.log('   ❌ NO se encontraron citas.');
} else {
  for (const d of citas) {
    const c = d.data();
    console.log(`\n   📅 ${d.id}  fecha=${c.fecha} ${c.hora || ''}  estado=${c.estado}`);
    console.log(`      cliente="${c.clienteNombre || ''}"  tel="${c.clienteTelefono || ''}"  email="${c.clienteEmail || ''}"`);
    console.log(`      clienteUid=${c.clienteUid || '—'}  userId=${c.userId || '—'}  clienteId=${c.clienteId || '—'}`);
    console.log(`      cortesia=${!!c.cortesia}  origen=${c.origen || '—'}`);
    if (c.selloProcesado) {
      console.log(`      ✅ selloProcesado=${c.selloProcesadoTipo || 'sí'} en ${c.selloProcesadoEn?.toDate?.().toISOString?.() || '?'}`);
    } else {
      console.log(`      ❌ selloProcesado FALSO/AUSENTE`);
    }
  }
}
