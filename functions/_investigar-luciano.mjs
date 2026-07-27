import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();
const T = 'aura';

// 1. Buscar users con "Luciano Arroyo" o similar
console.log(`\n═══ USERS en aura con "arroyo" o "luciano" ═══`);
const uSnap = await db.collection(`tenants/${T}/users`).get();
const matches = [];
uSnap.docs.forEach(d => {
  const data = d.data();
  const nom = (data.nombre || '').toLowerCase();
  if (nom.includes('arroyo') || nom.includes('luciano')) matches.push({ id: d.id, ...data });
});
console.log(`Encontrados: ${matches.length}\n`);
matches.forEach(m => {
  console.log(`─ ${m.id}  (${m.id.length} chars)`);
  console.log(`    nombre="${m.nombre || ''}"  email="${m.email || ''}"  tel="${m.telefono || ''}"`);
  console.log(`    uid="${m.uid || ''}"  authUid="${m.authUid || ''}"`);
  const flags = [];
  if (m._needsReview)  flags.push(`_needsReview (${m._reviewReason || 'sin razón'})`);
  if (m._mainDocId)    flags.push(`_mainDocId=${m._mainDocId}`);
  if (m.esQA)          flags.push('esQA');
  if (m.eliminado)     flags.push('eliminado');
  if (m.importedFrom)  flags.push(`importedFrom=${m.importedFrom}`);
  if (flags.length)    console.log(`    flags: ${flags.join(' · ')}`);
});

// 2. Buscar citas con clienteNombre "Luciano Arroyo"
console.log(`\n═══ CITAS con "arroyo" o "luciano" ═══`);
const cSnap = await db.collection(`tenants/${T}/citas`).get();
const cMatches = cSnap.docs.filter(d => {
  const data = d.data();
  const nom = (data.clienteNombre || '').toLowerCase();
  return nom.includes('arroyo') || nom.includes('luciano');
});
console.log(`Encontradas: ${cMatches.length}\n`);
cMatches.forEach(d => {
  const c = d.data();
  console.log(`─ cita ${d.id}`);
  console.log(`    fecha=${c.fecha} hora=${c.hora} estado=${c.estado} origen="${c.origen || ''}"`);
  console.log(`    cliente="${c.clienteNombre}"  tel="${c.clienteTelefono}"  email="${c.clienteEmail}"`);
  console.log(`    clienteUid=${c.clienteUid || '(NULL)'}  userId=${c.userId || '(NULL)'}  clienteId=${c.clienteId || '(NULL)'}`);
  console.log(`    barbero="${c.barbero || c.barberoNombre}" (${c.barberoId})`);
});

// 3. También revisar clientes/ (mirror)
console.log(`\n═══ CLIENTES (mirror) con "arroyo" o "luciano" ═══`);
const clSnap = await db.collection(`tenants/${T}/clientes`).get();
const clMatches = clSnap.docs.filter(d => {
  const data = d.data();
  const nom = (data.nombre || '').toLowerCase();
  return nom.includes('arroyo') || nom.includes('luciano');
});
console.log(`Encontrados: ${clMatches.length}\n`);
clMatches.forEach(d => {
  const c = d.data();
  console.log(`─ ${d.id}  "${c.nombre}"  tel="${c.telefono || ''}"  email="${c.email || ''}"`);
});
