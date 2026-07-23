/**
 * importar-clientes-oren.js — Importa la base de clientes de Oren Barber desde
 * el Excel a Firestore (tenants/oren/clientes + tenants/oren/users).
 *
 * El sistema usa el TELÉFONO (solo dígitos) como ID del doc para enlazar al
 * cliente con sus citas/fidelización. Pero el Excel trae teléfonos comodín
 * repetidos (uno 78 veces) y filas sin teléfono. Para no perder a nadie:
 *   · 1ª aparición de un teléfono válido → ID = teléfono (queda enlazable).
 *   · repetidos / sin teléfono / inválidos → ID sintético `oren-{número||fila}`
 *     (quedan en la lista, sin enlace por teléfono).
 *
 * Escribe (merge) en users/{id} y clientes/{id}, con stamps 0 (sin sellos).
 * Clientes = compartidos del negocio (sin sucursalId), como los dejamos.
 *
 * Uso:  node scripts/importar-clientes-oren.js            (dry-run)
 *       node scripts/importar-clientes-oren.js --commit   (escribe)
 */
const path  = require('path');
const admin = require('firebase-admin');
const XLSX  = require('xlsx');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

const XLSX_PATH = 'C:/Users/56983/Downloads/Barbero/clientes oren.xlsx';
const COMMIT    = process.argv.includes('--commit');
const col = (name) => db.collection('tenants').doc('oren').collection(name);

const clean = v => String(v == null ? '' : v).replace(/\D/g, '');
const cap   = s => String(s || '').trim().replace(/\s+/g, ' ');

function buildFechaNac(o) {
  const d = clean(o['Día del nacimiento']), m = clean(o['Mes del nacimiento']), y = clean(o['Año de nacimiento.']);
  if (d && m && y && y.length === 4) {
    const dd = d.padStart(2, '0'), mm = m.padStart(2, '0');
    if (+mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) return { fechaNacimiento: `${y}-${mm}-${dd}`, cumpleDia: `${mm}-${dd}` };
  }
  return null;
}

async function main() {
  const wb = XLSX.readFile(XLSX_PATH);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  console.log(`\n╔═══ Importar clientes Oren — ${COMMIT ? 'COMMIT' : 'DRY-RUN'} ═══╗`);
  console.log(`Filas en Excel: ${rows.length}\n`);

  const seenPhone = new Set();
  const usedId    = new Set();
  const docs = [];
  let phoneMatched = 0, sintetico = 0, sinNombre = 0;

  rows.forEach((o, i) => {
    const nombre = cap(`${o['Nombres'] || ''} ${o['Apellidos'] || ''}`);
    if (!nombre) { sinNombre++; return; }

    const telRaw = clean(o['Teléfono']) || clean(o['Teléfono secundario del cliente']);
    const telOk  = telRaw && telRaw.length >= 8 && telRaw.length <= 12;
    const numero = clean(o['Número de cliente']);
    const email  = cap(o['Email']).toLowerCase();

    let id, enlazado;
    if (telOk && !seenPhone.has(telRaw)) {
      id = telRaw; enlazado = true; seenPhone.add(telRaw); phoneMatched++;
    } else {
      // sintético estable: por número de cliente, o por fila
      id = `oren-${numero || ('r' + i)}`;
      while (usedId.has(id)) id = id + 'x';
      enlazado = false; sintetico++;
    }
    usedId.add(id);

    // Cartera de Barbero Pablo: los clientes con sufijo " Cp" en el nombre.
    // Tienen precio y comisión especiales cuando los atiende Pablo (Villa Alemana).
    const esCarteraPablo = /\b[cC][pP]\b/.test(nombre);

    const base = {
      uid: id,
      nombre,
      telefono: telOk ? '+' + telRaw : '',
      clienteTelefonoSuf9: telOk ? telRaw.slice(-9) : '',
      stamps: 0, sellosDisponibles: 0, sellosHistoricos: 0,
      importedFrom: 'excel_oren',
      updatedAt: TS(), creadoEn: TS(),
      ...(esCarteraPablo ? { carteraPablo: true } : {}),
    };
    if (email.includes('@')) base.email = email;
    if (numero) base.numeroClienteOriginal = numero;
    const fn = buildFechaNac(o);
    if (fn) Object.assign(base, fn);

    docs.push({ id, base, enlazado });
  });

  console.log(`Clientes a importar: ${docs.length}`);
  console.log(`  · enlazados por teléfono (ID = tel): ${phoneMatched}`);
  console.log(`  · ID sintético (dup/sin tel):        ${sintetico}`);
  console.log(`  · filas sin nombre (omitidas):       ${sinNombre}\n`);
  console.log('Ejemplos:');
  docs.slice(0, 4).forEach(d => console.log(`   ${d.enlazado ? '📞' : '🆔'} ${d.id.padEnd(14)} ${d.base.nombre}${d.base.email ? ' · ' + d.base.email : ''}`));

  if (!COMMIT) { console.log('\nℹ️  Dry-run: nada escrito. Corre con --commit.\n'); process.exit(0); }

  // Escritura en batches (2 ops por cliente: users + clientes; máx 500 ops)
  let batch = db.batch(), ops = 0, n = 0;
  for (const d of docs) {
    batch.set(col('users').doc(d.id),    d.base, { merge: true });
    batch.set(col('clientes').doc(d.id), d.base, { merge: true });
    ops += 2; n++;
    if (ops >= 480) { await batch.commit(); batch = db.batch(); ops = 0; process.stdout.write(`\r  escritos: ${n}/${docs.length}`); }
  }
  if (ops) await batch.commit();
  console.log(`\r  escritos: ${docs.length}/${docs.length}`);
  console.log(`\n✅ Importados ${docs.length} clientes (users + clientes).\n`);
  process.exit(0);
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
