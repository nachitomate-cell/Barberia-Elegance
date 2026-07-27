// _analisis-citas-sin-sello.mjs
// Barre TODAS las citas completadas de todos los tenants y detecta clientes
// cuyo doc en users/ tiene 0 sellos históricos pese a tener citas
// completadas normales (no cortesía). Reporta 5 categorías:
//
//   1. Sin selloProcesado    → CF nunca corrió (raro; falta clienteUid?)
//   2. Sin clienteUid          → cita huérfana, ni siquiera se puede procesar
//   3. clienteUid → doc fusionado → OK, el sello vive en el canónico
//   4. clienteUid → doc con 0 sellos → BUG (Jordan-tipo)
//   5. clienteUid → doc no existe    → cita huérfana crítica
//
// USO:
//   node _analisis-citas-sin-sello.mjs                  # todos los tenants
//   node _analisis-citas-sin-sello.mjs --tenant=aura    # solo uno

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const ONLY = args.tenant || null;
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

async function tenantIds() {
  const docs = await db.collection('tenants').listDocuments();
  return ONLY ? [ONLY] : [...docs.map(d => d.id).sort(), 'elegance'];
}

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  ANÁLISIS · citas completadas sin sello`);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

const tenants = await tenantIds();

const GLOBAL = {
  totalCitasCompletadas: 0,
  cortesias: 0,
  bug_docSinSellos: [],      // (4) — Jordan-tipo, más importante
  cita_sinClienteUid: [],    // (2) — huérfana crítica
  cita_docNoExiste: [],      // (5) — huérfana crítica
  cita_sinSelloProcesado: [], // (1) — CF nunca corrió
  ok_fusionado: 0,           // (3) — OK
  ok_conSellos: 0,           // sano
};

for (const tid of tenants) {
  const citasCol = tid === 'elegance' ? db.collection('citas') : db.collection(`tenants/${tid}/citas`);
  const usersBase = tid === 'elegance' ? 'users' : `tenants/${tid}/users`;

  const snapC = await citasCol.where('estado', '==', 'Completada').get();
  if (snapC.empty) continue;

  const localBug = [];
  const localSinUid = [];
  const localNoExiste = [];
  const localSinProc = [];
  let localCortesias = 0;
  let localOk = 0;
  let localOkFus = 0;

  // Cache de users por id (para no reload).
  const userCache = new Map();
  const getUser = async (uid) => {
    if (!uid) return null;
    if (userCache.has(uid)) return userCache.get(uid);
    const snap = await db.doc(`${usersBase}/${uid}`).get();
    const data = snap.exists ? snap.data() : null;
    userCache.set(uid, data);
    return data;
  };

  for (const cd of snapC.docs) {
    const c = cd.data();
    GLOBAL.totalCitasCompletadas++;
    if (c.cortesia) { GLOBAL.cortesias++; localCortesias++; continue; }

    const uid = c.clienteUid || c.userId || null;
    if (!uid) {
      localSinUid.push({ id: cd.id, fecha: c.fecha, cliente: c.clienteNombre || '', tel: c.clienteTelefono || '' });
      GLOBAL.cita_sinClienteUid.push({ tid, ...localSinUid.at(-1) });
      continue;
    }

    if (!c.selloProcesado) {
      localSinProc.push({ id: cd.id, fecha: c.fecha, cliente: c.clienteNombre || '', uid });
      GLOBAL.cita_sinSelloProcesado.push({ tid, ...localSinProc.at(-1) });
      continue;
    }

    const u = await getUser(uid);
    if (!u) {
      localNoExiste.push({ id: cd.id, fecha: c.fecha, cliente: c.clienteNombre || '', uid });
      GLOBAL.cita_docNoExiste.push({ tid, ...localNoExiste.at(-1) });
      continue;
    }
    if (u.fusionadoCon) { localOkFus++; GLOBAL.ok_fusionado++; continue; }
    const totalSellos = Number(u.sellosHistoricos ?? u.stamps ?? 0);
    if (totalSellos === 0) {
      localBug.push({
        id: cd.id, fecha: c.fecha, hora: c.hora,
        cliente: c.clienteNombre || u.nombre || '',
        email: c.clienteEmail || u.email || '',
        tel: c.clienteTelefono || u.telefono || '',
        uid, selloTipo: c.selloProcesadoTipo || '?',
      });
      GLOBAL.bug_docSinSellos.push({ tid, ...localBug.at(-1) });
    } else {
      localOk++;
      GLOBAL.ok_conSellos++;
    }
  }

  const anom = localBug.length + localSinUid.length + localNoExiste.length + localSinProc.length;
  if (anom === 0 && localCortesias === 0) continue;

  console.log(`── ${tid} — completadas=${snapC.size}, cortesías=${localCortesias}, OK con sellos=${localOk}, OK fusionado=${localOkFus}, anomalías=${anom}`);
  if (localBug.length) {
    console.log(`   🐛 BUG doc sin sellos (Jordan-tipo): ${localBug.length}`);
    for (const b of localBug.slice(0, 10)) {
      console.log(`      · ${b.cliente.padEnd(30)}  ${b.fecha} ${b.hora || ''}  email="${b.email}"  tel="${b.tel}"  uid=${b.uid}`);
    }
    if (localBug.length > 10) console.log(`      … (${localBug.length - 10} más)`);
  }
  if (localSinUid.length) {
    console.log(`   ⚠️  Sin clienteUid (huérfanas): ${localSinUid.length}`);
    for (const b of localSinUid.slice(0, 5)) console.log(`      · ${b.cliente.padEnd(30)}  ${b.fecha}  tel="${b.tel}"`);
    if (localSinUid.length > 5) console.log(`      … (${localSinUid.length - 5} más)`);
  }
  if (localNoExiste.length) {
    console.log(`   ⚠️  clienteUid → doc no existe: ${localNoExiste.length}`);
    for (const b of localNoExiste.slice(0, 5)) console.log(`      · ${b.cliente.padEnd(30)}  ${b.fecha}  uid=${b.uid}`);
    if (localNoExiste.length > 5) console.log(`      … (${localNoExiste.length - 5} más)`);
  }
  if (localSinProc.length) {
    console.log(`   ⚠️  Sin selloProcesado (CF no corrió): ${localSinProc.length}`);
    for (const b of localSinProc.slice(0, 5)) console.log(`      · ${b.cliente.padEnd(30)}  ${b.fecha}`);
    if (localSinProc.length > 5) console.log(`      … (${localSinProc.length - 5} más)`);
  }
  console.log('');
}

console.log(`─────────────────────────────────────────────`);
console.log(`Total citas completadas escaneadas: ${GLOBAL.totalCitasCompletadas}`);
console.log(`   Cortesías (esperado 0 sellos):    ${GLOBAL.cortesias}`);
console.log(`   OK con sellos:                     ${GLOBAL.ok_conSellos}`);
console.log(`   OK doc fusionado (sello en canonical): ${GLOBAL.ok_fusionado}`);
console.log(`   🐛 BUG doc sin sellos:            ${GLOBAL.bug_docSinSellos.length}`);
console.log(`   ⚠️  Sin clienteUid:                ${GLOBAL.cita_sinClienteUid.length}`);
console.log(`   ⚠️  clienteUid → no existe:        ${GLOBAL.cita_docNoExiste.length}`);
console.log(`   ⚠️  Sin selloProcesado:            ${GLOBAL.cita_sinSelloProcesado.length}`);
