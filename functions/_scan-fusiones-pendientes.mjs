// _scan-fusiones-pendientes.mjs
// Detecta pares de docs no fusionados en users/: un ac_hash (walk-in)
// que tiene el mismo TELEFONO_SUF9 que otro user con authUid (registrado
// al club con email distinto). Estos son casos "tipo Jordan Zamora":
// linkLegacy no los fusionó porque los emails son distintos y antes del
// backfill los ac_hash no tenían suf9.
//
// USO:
//   node _scan-fusiones-pendientes.mjs                # dry-run report
//   node _scan-fusiones-pendientes.mjs --apply        # ejecuta fusiones

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

async function tenantIds() {
  const docs = await db.collection('tenants').listDocuments();
  return [...docs.map(d => d.id).sort(), 'elegance'];
}

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║  SCAN fusiones pendientes ${APPLY ? '⚠️  APPLY  ' : '(DRY-RUN)'}`);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

const tenants = await tenantIds();

let totalPares = 0;
let totalFusionados = 0;

for (const tid of tenants) {
  const usersCol = tid === 'elegance'
    ? db.collection('users')
    : db.collection(`tenants/${tid}/users`);
  const snap = await usersCol.get();

  // Índice: suf9 → [docs]
  const bySuf9 = new Map();
  for (const d of snap.docs) {
    const data = d.data();
    const suf9 = data.telefonoSuf9;
    if (!suf9) continue;
    if (data.fusionadoCon) continue; // ya fusionado
    if (!bySuf9.has(suf9)) bySuf9.set(suf9, []);
    bySuf9.get(suf9).push({ id: d.id, data });
  }

  // Buscar pares: al menos un ac_hash + al menos un authUid con mismo suf9.
  const pares = [];
  for (const [suf9, docs] of bySuf9) {
    if (docs.length < 2) continue;
    const acs   = docs.filter(x => x.id.startsWith('ac_'));
    const auths = docs.filter(x => !x.id.startsWith('ac_') && !/^\d+$/.test(x.id));
    if (!acs.length || !auths.length) continue;
    // Guarda anti-familia: si los emails son claramente distintos personas,
    // no fusionar (ver upsertCliente/resolveMatch). Solo fusionar si:
    //  a) el ac_hash NO tiene email, o
    //  b) el ac_hash y el authUid tienen mismo email (raro pero posible)
    for (const ac of acs) {
      for (const auth of auths) {
        const acEmail = String(ac.data.email || '').toLowerCase().trim();
        const auEmail = String(auth.data.email || '').toLowerCase().trim();
        const sameEmail  = acEmail && auEmail && acEmail === auEmail;
        const acSinEmail = !acEmail;
        // Si ambos tienen email y son distintos, probable persona distinta
        // (compartieron tel: cónyuges, roommates, tel corporativo). SKIP salvo
        // que el nombre sea idéntico (case-insensitive normalizado).
        const acName = String(ac.data.nombre || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const auName = String(auth.data.nombre || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const sameName = acName && auName && acName === auName;
        const decision = sameEmail
          ? { fusionar: true,  motivo: 'mismo email' }
          : acSinEmail
            ? { fusionar: true,  motivo: 'ac_hash sin email' }
            : sameName
              ? { fusionar: true,  motivo: 'emails distintos pero nombre idéntico' }
              : { fusionar: false, motivo: 'emails distintos + nombres distintos (posible familia)' };
        pares.push({ tid, suf9, ac, auth, decision });
      }
    }
  }

  if (!pares.length) continue;

  console.log(`── ${tid} — ${pares.length} par(es) detectado(s) ──`);
  for (const p of pares) {
    const acSellos   = p.ac.data.sellosDisponibles || 0;
    const authSellos = p.auth.data.sellosDisponibles || 0;
    const flag = p.decision.fusionar ? '✅' : '⏭ ';
    console.log(`  ${flag} suf9=${p.suf9}`);
    console.log(`      ac  ${p.ac.id}   "${p.ac.data.nombre || '?'}"  email="${p.ac.data.email || '—'}"  sellos=${acSellos}`);
    console.log(`      auth ${p.auth.id}  "${p.auth.data.nombre || '?'}"  email="${p.auth.data.email || '—'}"  sellos=${authSellos}`);
    console.log(`      → ${p.decision.motivo} ${p.decision.fusionar ? '' : '(NO fusionar)'}`);
    totalPares++;

    if (!APPLY || !p.decision.fusionar) continue;

    // Fusionar: mover sellos del ac_hash al auth (SUM absoluto para no perder),
    // reasignar citas por clienteUid == ac.id, marcar ac_hash como fusionado.
    // Reusamos la lógica de link-legacy-on-auth reducida.
    const usersBase = tid === 'elegance' ? 'users' : `tenants/${tid}/users`;
    const acRef   = db.doc(`${usersBase}/${p.ac.id}`);
    const authRef = db.doc(`${usersBase}/${p.auth.id}`);
    const acData   = p.ac.data;
    const authData = p.auth.data;

    // Sellos y historial
    const acHist   = Array.isArray(acData.historialSellos) ? acData.historialSellos : [];
    const authHist = Array.isArray(authData.historialSellos) ? authData.historialSellos : [];
    const authCitaIds = new Set(authHist.map(h => h.citaId).filter(Boolean));
    const acHistNueva = acHist.filter(h => !authCitaIds.has(h.citaId));
    const acSellosDisp = Number(acData.sellosDisponibles) || 0;
    const acSellosHist = Number(acData.sellosHistoricos)  || 0;

    // Auth: solo sumamos los sellos históricos del ac_hash que no estén ya
    // representados en el historial del auth (por citaId). Aproximación: si
    // el ac tiene N sellos y el authHist NO tiene N citaIds del ac, sumamos
    // (asumimos sin doble-conteo). Simplificación defensiva.
    const authUpdate = {
      fusionRescateAt: Timestamp.now(),
    };
    if (acSellosDisp > 0) authUpdate.sellosDisponibles = FieldValue.increment(acSellosDisp);
    if (acSellosHist > 0) {
      authUpdate.sellosHistoricos = FieldValue.increment(acSellosHist);
      authUpdate.stamps           = FieldValue.increment(acSellosHist);
    }
    if (acHistNueva.length) authUpdate.historialSellos = FieldValue.arrayUnion(...acHistNueva);
    if (Object.keys(authUpdate).length > 1) {
      await authRef.update(authUpdate);
    }

    // Reasignar citas
    const citasCol = tid === 'elegance' ? db.collection('citas') : db.collection(`tenants/${tid}/citas`);
    const qCitas = await citasCol.where('clienteUid', '==', p.ac.id).get();
    const batch = db.batch();
    for (const cd of qCitas.docs) batch.update(cd.ref, { userId: p.auth.id, userIdLegacy: p.ac.id, clienteUid: p.auth.id });
    if (qCitas.size) await batch.commit();

    // Marcar ac_hash fusionado
    await acRef.update({
      fusionadoCon:      p.auth.id,
      fusionadoEn:       Timestamp.now(),
      packsActivos:      [],
      sellosDisponibles: 0,
      sellosHistoricos:  0,
      stamps:            0,
      historialSellos:   [],
    });

    console.log(`      ✅ fusionado (+${acSellosDisp} sellos, +${qCitas.size} cita(s) reasignadas)`);
    totalFusionados++;
  }
}

console.log(`\n─────────────────────────────────────────────`);
console.log(`Total pares detectados: ${totalPares}`);
if (APPLY) console.log(`Total fusionados:      ${totalFusionados}`);
else       console.log(`(dry-run) --apply para ejecutar`);
