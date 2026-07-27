// Dump completo de docs para Sebastian Mallea y Sebastian Retamales en aura.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = 'aura';
const needles = ['mallea', 'retamales'];

async function scan(col) {
  console.log(`\n═══ ${col} ═══`);
  const snap = await db.collection(`tenants/${T}/${col}`).get();
  const matches = [];
  snap.docs.forEach(d => {
    const data = d.data();
    const nom = (data.nombre || data.name || '').toLowerCase();
    const em  = (data.email || '').toLowerCase();
    if (needles.some(n => nom.includes(n) || em.includes(n))) {
      matches.push({ id: d.id, ...data });
    }
  });
  if (!matches.length) { console.log('  (sin matches)'); return; }
  matches.forEach(m => {
    console.log(`\n  ─── ${m.id} ───`);
    console.log(`    nombre="${m.nombre || ''}"`);
    console.log(`    email="${m.email || ''}"`);
    console.log(`    telefono="${m.telefono || ''}"`);
    console.log(`    uid="${m.uid || ''}"`);
    console.log(`    authUid="${m.authUid || ''}"`);
    const flags = [];
    if (m._mainDocId)     flags.push(`_mainDocId=${m._mainDocId}`);
    if (m.uid === m.id)   flags.push('uid===id (legacy/migrado)');
    if (m.esQA)           flags.push('esQA');
    if (m.eliminado)      flags.push('eliminado');
    if (m.importedFrom)   flags.push(`importedFrom=${m.importedFrom}`);
    if (m.stamps != null) flags.push(`stamps=${m.stamps}`);
    if (m.sellosDisponibles != null) flags.push(`sellosDisp=${m.sellosDisponibles}`);
    if (m.sellosHistoricos != null)  flags.push(`sellosHist=${m.sellosHistoricos}`);
    if (m.fechaRegistroOriginal) flags.push(`fechaRegOrig=${m.fechaRegistroOriginal}`);
    if (m.invitacionEnviadaAt)   flags.push('invitacionEnviada');
    if (m.createdAt)             flags.push(`createdAt=${m.createdAt.toDate ? m.createdAt.toDate().toISOString().slice(0,10) : m.createdAt}`);
    if (flags.length) console.log(`    flags: ${flags.join(' · ')}`);
  });
}

await scan('users');
await scan('clientes');
