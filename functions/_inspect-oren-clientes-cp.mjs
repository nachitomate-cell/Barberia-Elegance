// Busca clientes en Oren con sufijo tipo "Cp" (u otros barberos) para
// entender la convención antes de rediseñar la lógica de arriendo.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const T = 'oren';

console.log('═══ CLIENTES CON SUFIJO (cp / cd / cv / etc) ═══');
const cs = await db.collection(`tenants/${T}/clientes`).get();
const total = cs.size;
console.log(`Total clientes en ${T}: ${total}\n`);

// Regex: cualquier sufijo tipo "c" + 1-2 letras al final del nombre.
// Ej: "Jorgito xuni cp", "Ana Cd", "juanito c v"
const rx = /\b(c[a-z]{1,2})\s*$/i;
const conSufijo = [];
const porSufijo = {};

cs.docs.forEach(d => {
  const c = d.data();
  const nombre = (c.nombre || '').trim();
  const m = nombre.match(rx);
  if (m) {
    const suf = m[1].toLowerCase();
    conSufijo.push({ id: d.id, nombre, sufijo: suf, tel: c.telefono || '-', uid: c.uid || '-' });
    porSufijo[suf] = (porSufijo[suf] || 0) + 1;
  }
});

console.log(`Con sufijo tipo "cX": ${conSufijo.length} (${((conSufijo.length/total)*100).toFixed(1)}%)`);
console.log('Distribución por sufijo:');
Object.entries(porSufijo).sort((a,b) => b[1]-a[1]).forEach(([s,n]) => console.log(`  ${s}: ${n}`));

console.log('\n═══ MUESTRA (primeros 15) ═══');
conSufijo.slice(0, 15).forEach(c => {
  console.log(`  [${c.sufijo}] ${c.nombre} · tel ${c.tel} · uid ${c.uid}`);
});

// Ver si esos clientes tienen citas y con qué barbero
console.log('\n═══ CITAS DE LOS PRIMEROS 5 CLIENTES CON SUFIJO ═══');
for (const c of conSufijo.slice(0, 5)) {
  const q1 = await db.collection(`tenants/${T}/citas`)
    .where('clienteTelefono', '==', c.tel).limit(3).get();
  console.log(`\n"${c.nombre}" [${c.sufijo}] tel ${c.tel} → ${q1.size} citas encontradas`);
  q1.docs.forEach(d => {
    const x = d.data();
    console.log(`   ${x.fecha} · barbero=${x.barbero || x.barberoId} · svc=${x.servicioNombre || x.servicioId} · $${x.precio || 0}`);
  });
}
