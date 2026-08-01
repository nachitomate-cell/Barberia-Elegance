/**
 * importar-clientes-renacer.js — Base de clientes de Peluquería & Barbería
 * Renacer (migración desde AgendaPro) → tenants/renacer/{clientes,users}.
 *
 * Mismo criterio que Oren (scripts/importar-clientes-oren.js): el TELÉFONO en
 * dígitos es el ID del doc, porque es lo que enlaza al cliente con sus citas y
 * su fidelización. Diferencia deliberada: el export de Renacer trae FILAS
 * REPETIDAS del mismo cliente (mismo nombre + mismo teléfono). Esas se
 * descartan en vez de crearles un id sintético — un cliente duplicado ensucia
 * el buscador y parte sus sellos en dos.
 *
 * Uso:  node scripts/importar-clientes-renacer.js            (dry-run)
 *       node scripts/importar-clientes-renacer.js --commit   (escribe)
 */
const path  = require('path');
const admin = require('firebase-admin');
const XLSX  = require('xlsx');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

const TENANT    = 'renacer';
const XLSX_PATH = 'C:/Users/56983/Downloads/clientes renacer.xlsx';
const COMMIT    = process.argv.includes('--commit');
const col = (name) => db.collection('tenants').doc(TENANT).collection(name);

const clean = v => String(v == null ? '' : v).replace(/\D/g, '');
const cap   = s => String(s || '').trim().replace(/\s+/g, ' ');
const norm  = s => cap(s).toLowerCase();

function buildFechaNac(o) {
  const d = clean(o['Día del nacimiento']), m = clean(o['Mes del nacimiento']), y = clean(o['Año de nacimiento.']);
  if (d && m && y && y.length === 4) {
    const dd = d.padStart(2, '0'), mm = m.padStart(2, '0');
    if (+mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) return { fechaNacimiento: `${y}-${mm}-${dd}`, cumpleDia: `${mm}-${dd}` };
  }
  return null;
}

async function main() {
  const wb   = XLSX.readFile(XLSX_PATH);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  console.log(`\n╔═══ Importar clientes RENACER — ${COMMIT ? 'COMMIT' : 'DRY-RUN'} ═══╗`);
  console.log(`Filas en Excel: ${rows.length}\n`);

  const seenPhone = new Set();     // teléfono → ya tiene doc enlazado
  const seenExact = new Set();     // nombre+teléfono → fila repetida del mismo cliente
  const usedId    = new Set();
  const docs = [];
  let phoneMatched = 0, sintetico = 0, sinNombre = 0, duplicados = 0;

  rows.forEach((o, i) => {
    const nombre = cap(`${o['Nombres'] || ''} ${o['Apellidos'] || ''}`);
    if (!nombre) { sinNombre++; return; }

    const telRaw = clean(o['Teléfono']) || clean(o['Teléfono secundario del cliente']);
    const telOk  = telRaw && telRaw.length >= 8 && telRaw.length <= 12;
    const numero = clean(o['Número de cliente']);
    const email  = cap(o['Email']).toLowerCase();

    // Fila repetida exacta (mismo nombre y mismo teléfono) → no es otra persona.
    const huella = `${norm(nombre)}|${telRaw}`;
    if (telOk && seenExact.has(huella)) { duplicados++; return; }
    if (telOk) seenExact.add(huella);

    let id, enlazado;
    if (telOk && !seenPhone.has(telRaw)) {
      id = telRaw; enlazado = true; seenPhone.add(telRaw); phoneMatched++;
    } else {
      // Mismo teléfono con OTRO nombre (familia compartiendo línea) o sin
      // teléfono: entra con id sintético, sin enlace telefónico.
      id = `renacer-${numero || ('r' + i)}`;
      while (usedId.has(id)) id = id + 'x';
      enlazado = false; sintetico++;
    }
    usedId.add(id);

    const base = {
      uid: id,
      nombre,
      telefono: telOk ? '+' + telRaw : '',
      clienteTelefonoSuf9: telOk ? telRaw.slice(-9) : '',
      stamps: 0, sellosDisponibles: 0, sellosHistoricos: 0,
      importedFrom: 'excel_renacer',
      updatedAt: TS(), creadoEn: TS(),
    };
    if (email.includes('@')) base.email = email;
    if (numero) base.numeroClienteOriginal = numero;
    const fn = buildFechaNac(o);
    if (fn) Object.assign(base, fn);

    docs.push({ id, base, enlazado });
  });

  console.log(`Clientes a importar: ${docs.length}`);
  console.log(`  · enlazados por teléfono (ID = tel): ${phoneMatched}`);
  console.log(`  · ID sintético (mismo tel otro nombre / sin tel): ${sintetico}`);
  console.log(`  · filas repetidas del mismo cliente (omitidas):   ${duplicados}`);
  console.log(`  · filas sin nombre (omitidas):                    ${sinNombre}\n`);
  console.log('Ejemplos:');
  docs.slice(0, 5).forEach(d => console.log(`   ${d.enlazado ? '📞' : '🆔'} ${d.id.padEnd(14)} ${d.base.nombre}${d.base.email ? ' · ' + d.base.email : ''}`));

  if (!COMMIT) { console.log('\nℹ️  Dry-run: nada escrito. Corre con --commit.\n'); process.exit(0); }

  let batch = db.batch(), ops = 0, n = 0;
  for (const d of docs) {
    batch.set(col('users').doc(d.id),    d.base, { merge: true });
    batch.set(col('clientes').doc(d.id), d.base, { merge: true });
    ops += 2; n++;
    if (ops >= 480) { await batch.commit(); batch = db.batch(); ops = 0; process.stdout.write(`\r  escritos: ${n}/${docs.length}`); }
  }
  if (ops) await batch.commit();
  console.log(`\r  escritos: ${docs.length}/${docs.length}`);
  console.log(`\n✅ Importados ${docs.length} clientes de Renacer (users + clientes).\n`);
  process.exit(0);
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
