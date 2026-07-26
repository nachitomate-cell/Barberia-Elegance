// Inspecciona AMBOS docs del cliente de prueba (legacy + Auth) tras merge.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const TENANT = 'delnero';
const LEGACY_UID = '56999888777';
const AUTH_UID   = 'yGL1cEWYHafPtuxDIhVw0EUyfI02';

async function dump(label, uid) {
  const s = await db.doc(`tenants/${TENANT}/users/${uid}`).get();
  console.log(`\n═══ ${label} (${uid}) ═══`);
  if (!s.exists) { console.log('  (no existe)'); return; }
  const u = s.data();
  console.log(`  nombre=${u.nombre} tel=${u.telefono} esLegacy=${!!u.esLegacy} fusionadoCon=${u.fusionadoCon || '-'}`);
  console.log(`  email=${u.email || '-'}`);
  const packs = Array.isArray(u.packsActivos) ? u.packsActivos : [];
  console.log(`  packsActivos=${packs.length}`);
  for (const p of packs) {
    console.log(`   • ${p.nombrePack} (${p.packId}) — restantes ${p.sesionesRestantes}/${p.sesionesTotales}${p.serviciosRestantes ? ' mapa=' + JSON.stringify(p.serviciosRestantes) : ''}`);
  }
  const anul = Array.isArray(u.packsAnulados) ? u.packsAnulados : [];
  console.log(`  packsAnulados=${anul.length}`);
  console.log(`  sellos=${u.sellos || 0}`);
}

await dump('LEGACY (número)', LEGACY_UID);
await dump('AUTH (uid firebase)', AUTH_UID);
console.log('');
