'use strict';

/**
 * scripts/import-infinity-clientes.js
 * ─────────────────────────────────────────────────────────────────
 *  Importa una base de clientes desde XLSX a Firestore, en el schema
 *  de perfil pasivo del Club (tenants/{tid}/users y /clientes) que
 *  usa auto-enroll-cliente.js y dedupe-cliente-onCreate.js.
 *
 *  DRY-RUN por default. Requiere --commit para escribir a Firebase.
 *
 *  Uso:
 *    # Análisis + preview (nada escrito):
 *    node scripts/import-infinity-clientes.js "C:/ruta/al/archivo.xlsx"
 *
 *    # Escritura real:
 *    node scripts/import-infinity-clientes.js "C:/ruta/al/archivo.xlsx" --commit
 *
 *    # Con opciones:
 *    node scripts/import-infinity-clientes.js archivo.xlsx --tenant=infinity --limit=50 --commit
 *
 *  Opciones:
 *    --commit          Ejecuta las escrituras. Sin este flag = dry-run.
 *    --tenant=<id>     Tenant destino. Default: infinity.
 *    --limit=<N>       Solo procesa las primeras N filas del xlsx (útil para tests).
 *    --log=<ruta>      Ruta del log de auditoría. Default: scripts/import-<tenant>-<ts>.log
 *    --service=<ruta>  Ruta al service-account.json. Default: ./service-account.json
 *
 *  Salidas:
 *    - stdout: resumen final con contadores.
 *    - <log>.jsonl: una línea JSON por fila procesada (para auditar).
 *    - <log>.stats.json: contadores agregados.
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
const fs   = require('fs');
const XLSX = require('xlsx');

// ── CLI parsing ──────────────────────────────────────────────────
const argv         = process.argv.slice(2);
const filePath     = argv.find(a => !a.startsWith('--'));
const commit       = argv.includes('--commit');
const tenantArg    = argv.find(a => a.startsWith('--tenant='));
const limitArg     = argv.find(a => a.startsWith('--limit='));
const logArg       = argv.find(a => a.startsWith('--log='));
const serviceArg   = argv.find(a => a.startsWith('--service='));

const TENANT       = tenantArg   ? tenantArg.split('=')[1]   : 'infinity';
const LIMIT        = limitArg    ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const SERVICE_PATH = serviceArg  ? serviceArg.split('=')[1]  : path.resolve(__dirname, '..', 'service-account.json');

if (!filePath) {
  console.error('ERROR: falta la ruta al archivo xlsx.\n');
  console.error('Uso: node scripts/import-infinity-clientes.js <archivo.xlsx> [--commit]');
  process.exit(1);
}
if (!fs.existsSync(filePath)) {
  console.error(`ERROR: archivo no existe: ${filePath}`);
  process.exit(1);
}
if (!fs.existsSync(SERVICE_PATH)) {
  console.error(`ERROR: service-account no existe: ${SERVICE_PATH}`);
  process.exit(1);
}

const ts       = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_BASE = logArg
  ? logArg.split('=')[1]
  : path.resolve(__dirname, `import-${TENANT}-${ts}`);
const LOG_JSONL = `${LOG_BASE}.jsonl`;
const LOG_STATS = `${LOG_BASE}.stats.json`;

// ── Normalización de teléfono ────────────────────────────────────
// Alineado con functions/auto-enroll-cliente.js — usamos el mismo esquema
// para que el doc.id de users/clientes coincida con lo que crearían las CFs.
function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function classifyPhone(telRaw) {
  const norm = normalizePhone(telRaw);
  if (!norm)                 return { valid: false, reason: 'empty' };
  if (norm.length < 8)       return { valid: false, reason: 'muy_corto',    normalized: norm };
  if (norm.startsWith('56')) {
    if (norm.length === 11)  return { valid: true,  normalized: norm, chile: true };
    return { valid: false, reason: 'cl_mal_formado', normalized: norm };
  }
  // Sin prefijo país. Si tiene 9 dígitos, asumimos CL y agregamos 56.
  if (norm.length === 9)     return { valid: true, normalized: '56' + norm, chile: true };
  // Extranjero (US, Francia, España, etc.)
  return { valid: true, normalized: norm, chile: false };
}

// ── Score de completitud (para elegir la fila "principal" del grupo) ──
function scoreRow(r) {
  let s = 0;
  if ((r.Email || '').trim())                s += 3;   // email pesa más
  if ((r.Apellidos || '').trim())            s += 2;
  if ((r.RUT || '').toString().trim())       s += 1;
  if ((r['Dirección'] || '').trim())         s += 1;
  if (r['Día del nacimiento'] && r['Mes del nacimiento'] && r['Año de nacimiento.']) s += 3;
  if (r.Edad != null)                        s += 1;
  if (r['Género. 1 = Femenino, 2 = Masculino'] === 1 || r['Género. 1 = Femenino, 2 = Masculino'] === 2) s += 1;
  return s;
}

// ── Merge conservador: prioriza campos de la fila top, rellena con las demás ──
function mergeGroup(rows) {
  const sorted   = [...rows].sort((a, b) => scoreRow(b) - scoreRow(a));
  const primary  = sorted[0];
  const merged   = { ...primary };
  for (const r of sorted.slice(1)) {
    for (const k of Object.keys(r)) {
      const cur = merged[k];
      const nxt = r[k];
      if ((cur == null || cur === '' || cur === 0) && nxt != null && nxt !== '' && nxt !== 0) {
        merged[k] = nxt;
      }
    }
  }
  // Nombres distintos en el mismo teléfono → flagear como posible duplicado.
  const nombresNorm = new Set(
    rows
      .map(r => (r.Nombres || '').toString().trim().toLowerCase())
      .filter(Boolean)
  );
  const nombresDistintos = nombresNorm.size > 1;
  return { merged, sourceCount: rows.length, nombresDistintos };
}

// ── Composición del doc de Firestore ─────────────────────────────
function toFirestoreDoc(row, meta, sourceFile) {
  const nombre   = (row.Nombres   || '').toString().trim();
  const apellido = (row.Apellidos || '').toString().trim();
  const email    = (row.Email     || '').toString().trim().toLowerCase();
  const rut      = (row.RUT       || '').toString().trim();
  const direccion= (row['Dirección'] || '').toString().trim();

  const cumpleD  = row['Día del nacimiento'];
  const cumpleM  = row['Mes del nacimiento'];
  const cumpleY  = row['Año de nacimiento.'];
  let fechaNacimiento = null;
  if (cumpleD && cumpleM && cumpleY) {
    const y = String(cumpleY).padStart(4, '0');
    const m = String(cumpleM).padStart(2, '0');
    const d = String(cumpleD).padStart(2, '0');
    fechaNacimiento = `${y}-${m}-${d}`; // formato ISO alineado con dashboard
  }

  const genero  = row['Género. 1 = Femenino, 2 = Masculino'];
  const generoStr = genero === 1 ? 'F' : genero === 2 ? 'M' : null;

  const fullNombre = apellido ? `${nombre} ${apellido}` : nombre;

  return {
    // Campos base (schema auto-enroll)
    uid:                meta.docId,
    nombre:             fullNombre || 'Cliente',
    telefono:           meta.telefono,     // formato +56XXXXXXXXX cuando aplica
    ...(email       ? { email }               : {}),
    ...(rut         ? { rut }                 : {}),
    ...(direccion   ? { direccion }           : {}),
    ...(fechaNacimiento ? { fechaNacimiento } : {}),
    ...(generoStr   ? { genero: generoStr }   : {}),
    sellosDisponibles:  0,
    sellosHistoricos:   0,
    stamps:             0,
    // Meta de auditoría del import
    importSource:       sourceFile,
    importedRowsCount:  meta.sourceCount,
    ...(meta.posibleDuplicado ? { posibleDuplicado: true, posibleDuplicadoRazon: meta.razon } : {}),
    ...(meta.telefonoNoChileno ? { telefonoNoChileno: true } : {}),
  };
}

// ── Main ──────────────────────────────────────────────────────────
(async function main() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`IMPORT DE CLIENTES → tenant "${TENANT}"`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`Archivo         : ${filePath}`);
  console.log(`Modo            : ${commit ? '🔴 COMMIT (escribe a Firebase)' : '🟢 DRY-RUN (no escribe)'}`);
  console.log(`Service account : ${SERVICE_PATH}`);
  console.log(`Log             : ${LOG_JSONL}`);
  console.log(`Limit           : ${LIMIT === Infinity ? 'sin límite' : LIMIT}`);
  console.log(`${'═'.repeat(70)}\n`);

  // 1) Leer xlsx
  const wb    = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const limited = rows.slice(0, LIMIT);
  console.log(`✓ Leídas ${rows.length} filas (${limited.length} a procesar).`);

  const sourceFile = path.basename(filePath);

  // 2) Filtrar filas basura (sin tel ni email) y agrupar por teléfono
  const stats = {
    total:                 limited.length,
    skipped_sin_contacto:  0,
    skipped_solo_email:    0,  // sin tel, no podemos crear docId
    skipped_tel_malformado:0,
    grupos_procesados:     0,
    docs_generados:        0,
    flagged_duplicado:     0,
    flagged_extranjero:    0,
    con_cumple:            0,
    con_email:             0,
  };

  const grupos = new Map(); // key = teléfono normalizado válido
  const soloEmailRows = []; // rows sin tel válido pero con email

  const logStream = fs.createWriteStream(LOG_JSONL);
  const logJson   = (obj) => logStream.write(JSON.stringify(obj) + '\n');

  for (const r of limited) {
    const tel   = (r['Teléfono'] || '').toString().trim();
    const email = (r.Email        || '').toString().trim().toLowerCase();
    const clas  = classifyPhone(tel);

    if (!tel && !email) {
      stats.skipped_sin_contacto++;
      logJson({ event: 'skipped_sin_contacto', row: r });
      continue;
    }
    if (!clas.valid && !email) {
      stats.skipped_tel_malformado++;
      logJson({ event: 'skipped_tel_malformado', reason: clas.reason, row: r });
      continue;
    }
    if (!clas.valid && email) {
      // No podemos crear doc: docId depende del teléfono. Registramos aparte.
      stats.skipped_solo_email++;
      soloEmailRows.push(r);
      logJson({ event: 'skipped_solo_email', row: r });
      continue;
    }

    const key = clas.normalized;
    if (!grupos.has(key)) grupos.set(key, { clas, rows: [] });
    grupos.get(key).rows.push(r);
  }

  console.log(`✓ Grupos únicos por teléfono: ${grupos.size}`);
  console.log(`✓ Filas descartadas por falta de contacto: ${stats.skipped_sin_contacto}`);
  console.log(`✓ Filas con solo email (sin tel): ${stats.skipped_solo_email}`);
  console.log(`✓ Filas con teléfono malformado y sin email: ${stats.skipped_tel_malformado}\n`);

  // 3) Componer docs de Firestore
  const docs = []; // { telN, telFormatted, doc, sourceCount, flags }

  for (const [telN, group] of grupos) {
    stats.grupos_procesados++;
    const { merged, sourceCount, nombresDistintos } = mergeGroup(group.rows);

    const telFormatted = group.clas.chile ? `+${telN}` : `+${telN}`;
    const meta = {
      docId:             telN,
      telefono:          telFormatted,
      sourceCount,
      posibleDuplicado:  nombresDistintos,
      razon:             nombresDistintos ? 'multiple_nombres_mismo_telefono' : null,
      telefonoNoChileno: !group.clas.chile,
    };

    const doc = toFirestoreDoc(merged, meta, sourceFile);
    docs.push({ telN, telFormatted, doc, sourceCount, flags: meta });

    if (nombresDistintos)   stats.flagged_duplicado++;
    if (!group.clas.chile)  stats.flagged_extranjero++;
    if (doc.fechaNacimiento) stats.con_cumple++;
    if (doc.email)           stats.con_email++;

    logJson({
      event:              nombresDistintos ? 'grupo_ambiguo' : 'grupo_ok',
      telN,
      sourceCount,
      posibleDuplicado:   nombresDistintos,
      telefonoNoChileno:  !group.clas.chile,
      docPreview: {
        nombre:            doc.nombre,
        email:             doc.email || null,
        fechaNacimiento:   doc.fechaNacimiento || null,
      },
      rowsOriginales: group.rows.map(r => ({
        Nombres:  r.Nombres,
        Apellidos:r.Apellidos,
        Email:    r.Email,
        Teléfono: r['Teléfono'],
      })),
    });
  }

  stats.docs_generados = docs.length;

  // 4) Escritura a Firestore (solo si --commit)
  let escritos = 0, fallos = 0;
  if (commit) {
    console.log('🔴 Modo COMMIT: inicializando Firebase Admin SDK…\n');
    const admin = require('firebase-admin');
    const serviceAccount = require(SERVICE_PATH);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    const db = admin.firestore();
    const { FieldValue } = admin.firestore;

    // Confirmación final
    console.log(`⚠️  Vas a escribir ${docs.length} usuarios + ${docs.length} clientes en tenants/${TENANT}/.`);
    console.log('⚠️  Este proceso es IDEMPOTENTE (set con merge), pero de igual forma…');
    console.log('    Confirma abajo con Ctrl+C para abortar en los próximos 5 segundos.\n');
    await new Promise(r => setTimeout(r, 5000));

    // Batch de 200 (cada batch escribe 2 docs por cliente → 400 ops, dentro del límite 500).
    const BATCH = 200;
    for (let i = 0; i < docs.length; i += BATCH) {
      const chunk = docs.slice(i, i + BATCH);
      const batch = db.batch();
      for (const { telN, doc } of chunk) {
        const userRef    = db.doc(`tenants/${TENANT}/users/${telN}`);
        const clienteRef = db.doc(`tenants/${TENANT}/clientes/${telN}`);

        const userData = {
          ...doc,
          importedAt: FieldValue.serverTimestamp(),
          creadoEn:   FieldValue.serverTimestamp(), // solo se aplica si el doc no existe (merge)
          updatedAt:  FieldValue.serverTimestamp(),
        };
        const clienteData = {
          nombre:     doc.nombre,
          telefono:   doc.telefono,
          uid:        doc.uid,
          ...(doc.email       ? { email: doc.email }             : {}),
          ...(doc.rut         ? { rut: doc.rut }                 : {}),
          ...(doc.fechaNacimiento ? { fechaNacimiento: doc.fechaNacimiento } : {}),
          importSource: sourceFile,
          importedAt: FieldValue.serverTimestamp(),
          updatedAt:  FieldValue.serverTimestamp(),
        };

        batch.set(userRef,    userData,    { merge: true });
        batch.set(clienteRef, clienteData, { merge: true });
      }
      try {
        await batch.commit();
        escritos += chunk.length;
        process.stdout.write(`\r  escritos: ${escritos}/${docs.length}`);
      } catch (err) {
        fallos += chunk.length;
        console.error(`\n  ✗ batch @ ${i}: ${err.message}`);
        logJson({ event: 'batch_error', startIndex: i, error: err.message });
      }
    }
    process.stdout.write('\n\n');
  } else {
    console.log('🟢 Dry-run: no se escribió a Firebase. Usa --commit para persistir.\n');
  }

  // 5) Cerrar log + stats
  // Esperar a que el WriteStream drene antes de exit — si no, en Windows
  // el .jsonl queda vacío porque process.exit() mata el buffer.
  await new Promise((resolve, reject) => {
    logStream.end(err => err ? reject(err) : resolve());
  });
  fs.writeFileSync(LOG_STATS, JSON.stringify({
    ...stats,
    commit,
    tenant:      TENANT,
    sourceFile,
    ranAt:       new Date().toISOString(),
    docs_escritos: escritos,
    fallos,
  }, null, 2));

  // Resumen
  console.log(`${'═'.repeat(70)}`);
  console.log('RESUMEN');
  console.log(`${'═'.repeat(70)}`);
  console.log(`Filas leídas             : ${stats.total}`);
  console.log(`Docs generados           : ${stats.docs_generados}`);
  console.log(`  ├─ con email           : ${stats.con_email}`);
  console.log(`  ├─ con cumpleaños      : ${stats.con_cumple}`);
  console.log(`  ├─ flag posibleDuplicado: ${stats.flagged_duplicado}`);
  console.log(`  └─ flag extranjero     : ${stats.flagged_extranjero}`);
  console.log(`Descartados`);
  console.log(`  ├─ sin contacto        : ${stats.skipped_sin_contacto}`);
  console.log(`  ├─ solo email (sin tel): ${stats.skipped_solo_email}`);
  console.log(`  └─ tel malformado      : ${stats.skipped_tel_malformado}`);
  if (commit) {
    console.log(`Escritos a Firebase      : ${escritos} (${fallos} fallos)`);
  }
  console.log(`\nLog detallado : ${LOG_JSONL}`);
  console.log(`Stats         : ${LOG_STATS}`);
  console.log(`${'═'.repeat(70)}\n`);

  process.exit(0);
})().catch(err => {
  console.error('ERROR fatal:', err);
  process.exit(1);
});
