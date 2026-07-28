/**
 * importar-clientes-sion.js — Importa la base de clientes de Sion Barbería
 * desde el Excel de AgendaPro a Firestore (tenants/sion/clientes + users).
 *
 * Espejo de importar-clientes-oren.js (mismo formato de export). El sistema
 * usa el TELÉFONO (solo dígitos) como ID del doc para poder enlazar al
 * cliente con sus citas y su fidelización. Para no perder filas:
 *   · 1ª aparición de un teléfono válido → ID = teléfono (queda enlazable).
 *   · repetidos / sin teléfono / inválidos → ID sintético `sion-{número||fila}`
 *     (quedan en la lista, sin enlace por teléfono).
 *
 * Escribe (merge) en users/{id} y clientes/{id} con 0 sellos: son clientes
 * traídos de otro sistema, no traen historial de fidelización.
 *
 * Los docs que ya existen en tenants/sion/users están keyed por UID de Auth
 * (staff y cuentas de prueba), así que no colisionan con estos IDs.
 *
 * Uso:  node scripts/importar-clientes-sion.js            (dry-run)
 *       node scripts/importar-clientes-sion.js --commit   (escribe)
 */
const path  = require('path');
const admin = require('firebase-admin');
const XLSX  = require('xlsx');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;

const XLSX_PATH = 'C:/Users/56983/Downloads/Barbero/Clientes Sion.xlsx';
const COMMIT    = process.argv.includes('--commit');
const col = (name) => db.collection('tenants').doc('sion').collection(name);

const clean = v => String(v == null ? '' : v).replace(/\D/g, '');
const cap   = s => String(s || '').trim().replace(/\s+/g, ' ');
// Para comparar nombres: sin tildes, sin mayúsculas, sin dobles espacios.
const norm  = s => cap(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Un email con tildes/ñ no existe para el servidor de correo: si hay dos
// variantes del mismo cliente, la ASCII es la buena. AgendaPro guardó varias
// así (cristóbalsilva707@…, jiménezbustamante…@…).
const emailSano = e => !!e && !/[^\x00-\x7F]/.test(e);

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
  const rowsRaw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  console.log(`\n╔═══ Importar clientes Sion — ${COMMIT ? 'COMMIT' : 'DRY-RUN'} ═══╗`);
  console.log(`Filas en Excel: ${rowsRaw.length}`);

  // ── Dedupe de filas repetidas ───────────────────────────────────
  // AgendaPro exportó a varios clientes DOS veces, con el email mal tipeado
  // en una de las copias. Mismo nombre + mismo teléfono = misma persona:
  // se fusionan para no dejar dos fichas del mismo cliente.
  // Ojo: mismo teléfono con nombre DISTINTO no se toca — son familias
  // compartiendo un número (hermanos, el celular de la mamá) y cada uno
  // es un cliente real.
  const porClave = new Map();
  let fusionadas = 0;
  for (const o of rowsRaw) {
    const nombre = cap(`${o['Nombres'] || ''} ${o['Apellidos'] || ''}`);
    const tel    = clean(o['Teléfono']) || clean(o['Teléfono secundario del cliente']);
    const clave  = (nombre && tel) ? `${norm(nombre)}|${tel}` : null;
    if (!clave || !porClave.has(clave)) {
      if (clave) porClave.set(clave, o);
      else porClave.set(`__solo_${porClave.size}`, o);
      continue;
    }
    // Ya vimos a esta persona: completamos huecos con lo que traiga la copia.
    const base = porClave.get(clave);
    fusionadas++;
    for (const k of Object.keys(o)) {
      if (!cap(base[k]) && cap(o[k])) base[k] = o[k];
    }
    const eBase = cap(base['Email']).toLowerCase();
    const eNuevo = cap(o['Email']).toLowerCase();
    if (eNuevo && !emailSano(eBase) && emailSano(eNuevo)) base['Email'] = eNuevo;
  }
  const rows = [...porClave.values()];
  console.log(`Filas fusionadas (misma persona duplicada): ${fusionadas}`);
  console.log(`Clientes reales: ${rows.length}\n`);

  const seenPhone = new Set();
  const usedId    = new Set();
  const docs = [];
  let phoneMatched = 0, sintetico = 0, sinNombre = 0, conEmail = 0, conCumple = 0;

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
      id = `sion-${numero || ('r' + i)}`;
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
      importedFrom: 'excel_sion',
      updatedAt: TS(), creadoEn: TS(),
    };
    if (email.includes('@')) { base.email = email; conEmail++; }
    if (numero) base.numeroClienteOriginal = numero;
    const fn = buildFechaNac(o);
    if (fn) { Object.assign(base, fn); conCumple++; }

    docs.push({ id, base, enlazado });
  });

  console.log(`Clientes a importar: ${docs.length}`);
  console.log(`  · enlazados por teléfono (ID = tel): ${phoneMatched}`);
  console.log(`  · ID sintético (dup/sin tel):        ${sintetico}`);
  console.log(`  · filas sin nombre (omitidas):       ${sinNombre}`);
  console.log(`  · con email:                         ${conEmail}`);
  console.log(`  · con fecha de nacimiento:           ${conCumple}\n`);
  console.log('Ejemplos:');
  docs.slice(0, 5).forEach(d => console.log(`   ${d.enlazado ? '📞' : '🆔'} ${d.id.padEnd(14)} ${d.base.nombre}${d.base.email ? ' · ' + d.base.email : ''}`));

  if (!COMMIT) { console.log('\nℹ️  Dry-run: nada escrito. Corre con --commit.\n'); process.exit(0); }

  // 2 ops por cliente (users + clientes); el límite de un batch es 500.
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
