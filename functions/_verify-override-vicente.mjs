// Verifica que el override se guardó y calcula la comisión esperada
// para comparar con lo que muestra Comisiones.jsx / Metricas.jsx.
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const TENANT     = 'delnero';
const BARBERO_ID = 'BmGjJ3AcdJqjnqx4OfMn'; // Vicente Maira

const b = (await db.doc(`tenants/${TENANT}/barberos/${BARBERO_ID}`).get()).data();
console.log(`\n═══ ${b.nombre} ═══`);
console.log(`  global: ${b.comision}% servicio`);
console.log(`  overrides:`, b.comisionPorServicio || '(ninguno)');

// Cargar servicios para precioMap fallback (mismo criterio que el panel)
const svcSnap = await db.collection(`tenants/${TENANT}/servicios`).get();
const precioMap = {};
const nombreMap = {};
svcSnap.docs.forEach(d => {
  const s = d.data();
  precioMap[d.id] = Number(s.precio) || 0;
  nombreMap[d.id] = s.nombre;
});

// Helper igual al del panel
function pctPara(barbero, servicioId) {
  const ovr = barbero?.comisionPorServicio?.[servicioId];
  const n = Number(ovr);
  if (ovr != null && ovr !== '' && Number.isFinite(n) && n >= 0) return n;
  return Number(barbero?.comision) || 0;
}
function precioServicio(c) {
  if (c.cortesia) return 0;
  if (c.precio != null) return Number(c.precio) || 0;
  return precioMap[c.servicioId] || 0;
}

// Rango: mes en curso (para comparar con lo que ve el user)
const now = new Date();
const y = now.getFullYear();
const m = String(now.getMonth() + 1).padStart(2, '0');
const inicio = `${y}-${m}-01`;
const finDia = new Date(y, now.getMonth() + 1, 0).getDate();
const fin    = `${y}-${m}-${String(finDia).padStart(2, '0')}`;
console.log(`\n═══ RANGO: ${inicio} → ${fin} ═══`);

// Traer citas Completadas del barbero en el rango
const cSnap = await db.collection(`tenants/${TENANT}/citas`)
  .where('estado', '==', 'Completada')
  .get();
const citas = cSnap.docs.map(d => ({id:d.id, ...d.data()}))
  .filter(c => c.barberoId === BARBERO_ID)
  .filter(c => (c.fecha || '') >= inicio && (c.fecha || '') <= fin);

console.log(`\nCitas encontradas: ${citas.length}`);
let ingresos = 0;
let comisionConOverride = 0;
let comisionSinOverride = 0; // control: como si no hubiera override
for (const c of citas) {
  const precio = precioServicio(c);
  const pctReal = pctPara(b, c.servicioId);
  const pctFlat = Number(b.comision) || 0;
  const comReal = precio * pctReal / 100;
  const comFlat = precio * pctFlat / 100;
  ingresos            += precio;
  comisionConOverride += comReal;
  comisionSinOverride += comFlat;
  const flag = pctReal !== pctFlat ? ' ← OVERRIDE' : '';
  console.log(`  ${c.fecha} · ${(c.servicioNombre || c.servicioId || '').padEnd(30)} · $${precio.toLocaleString('es-CL').padStart(7)} × ${pctReal}% = $${comReal.toLocaleString('es-CL')}${flag}`);
}

console.log(`\n═══ TOTALES ESPERADOS ═══`);
console.log(`  Ingresos servicios:                $${ingresos.toLocaleString('es-CL')}`);
console.log(`  Comisión CON override (correcto):  $${Math.round(comisionConOverride).toLocaleString('es-CL')}`);
console.log(`  Comisión sin override (bug viejo): $${Math.round(comisionSinOverride).toLocaleString('es-CL')}`);
console.log(`  Ahorro del local por override:     $${Math.round(comisionSinOverride - comisionConOverride).toLocaleString('es-CL')}`);
console.log('');
