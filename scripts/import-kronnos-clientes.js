'use strict';

/**
 * scripts/import-kronnos-clientes.js
 * ─────────────────────────────────────────────────────────────────
 *  Importa base de clientes de Kronnos (export Weibook) al pool marca
 *  `tenants/kronnos/users` y `tenants/kronnos/clientes`.
 *
 *  Camino 1.5: los clientes viven en pool marca (no per-sede). Al llegar
 *  citas de cada sede, sellos-automatico.js va incrementando
 *  sellosPorSede[sedeId] y calculamos sede predominante en runtime.
 *
 *  DRY-RUN por default. --commit para escribir.
 *
 *  Uso:
 *    # Dry-run + preview:
 *    node scripts/import-kronnos-clientes.js "C:/Users/56983/Downloads/Barbero/clients-database.xlsx"
 *
 *    # Commit real:
 *    node scripts/import-kronnos-clientes.js "clients-database.xlsx" --commit
 *
 *    # Con opciones:
 *    node scripts/import-kronnos-clientes.js archivo.xlsx --limit=100 --commit
 *
 *  Opciones:
 *    --commit          Escribe a Firebase. Sin flag = dry-run.
 *    --limit=<N>       Solo N filas (util para tests).
 *    --log=<ruta>      Log de auditoria. Default: scripts/import-kronnos-<ts>.log
 *    --service=<ruta>  service-account.json. Default: ./service-account.json
 *
 *  Diferencias vs import-infinity-clientes.js:
 *    - Weibook: header en row 6 (metadata en rows 1-5).
 *    - Columnas: NOMBRE, APELLIDO, CORREO ELECTRONICO, INDICATIVO, CELULAR,
 *      FECHA DE NACIMIENTO, IDENTIFICACION, DIRECCION, PERSONA (NAT/JUR).
 *    - Telefono viene con formato "+56 9 5019 7207" (con espacios).
 *    - INDICATIVO opcional (default +56).
 *    - Tenant destino: kronnos (marca).
 *    - Inicializa sellosPorSede: {penablanca:0, limache:0, woman:0} para
 *      que la sede predominante arranque limpia en cada cliente.
 * ─────────────────────────────────────────────────────────────────
 */

const path = require('path');
const fs   = require('fs');
const XLSX = require('xlsx');

// ── CLI parsing ──────────────────────────────────────────────────
const argv       = process.argv.slice(2);
const filePath   = argv.find(a => !a.startsWith('--'));
const commit     = argv.includes('--commit');
const limitArg   = argv.find(a => a.startsWith('--limit='));
const logArg     = argv.find(a => a.startsWith('--log='));
const serviceArg = argv.find(a => a.startsWith('--service='));

const TENANT       = 'kronnos'; // pool marca
const LIMIT        = limitArg   ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const SERVICE_PATH = serviceArg ? serviceArg.split('=')[1] : path.resolve(__dirname, '..', 'service-account.json');

if (!filePath) {
  console.error('ERROR: falta la ruta al archivo xlsx.\n');
  console.error('Uso: node scripts/import-kronnos-clientes.js <archivo.xlsx> [--commit]');
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
  : path.resolve(__dirname, `import-kronnos-${ts}`);
const LOG_JSONL = `${LOG_BASE}.jsonl`;
const LOG_STATS = `${LOG_BASE}.stats.json`;

// ── Normalizacion de telefono ────────────────────────────────────
// Weibook devuelve tel con espacios ("+56 9 5019 7207"). Chile: 56 + 9 digitos.
function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function classifyPhone(indicativo, celular) {
  // Weibook separa INDICATIVO (56) y CELULAR (912345678 sin prefijo).
  // Fallback: si CELULAR ya trae el "+56" al inicio, normalizePhone lo une.
  const cel = normalizePhone(celular);
  const ind = normalizePhone(indicativo);
  if (!cel) return { valid: false, reason: 'empty' };

  // Caso 1: CELULAR ya incluye 56XXXXXXXXX (11 digitos)
  if (cel.length === 11 && cel.startsWith('56')) {
    return { valid: true, normalized: cel, chile: true };
  }
  // Caso 2: CELULAR es de 9 digitos + INDICATIVO 56
  if (cel.length === 9 && (ind === '56' || !ind)) {
    return { valid: true, normalized: '56' + cel, chile: true };
  }
  // Caso 3: CELULAR de 9 digitos sin indicativo (asumimos CL)
  if (cel.length === 9) {
    return { valid: true, normalized: '56' + cel, chile: true };
  }
  // Caso 4: extranjero (indicativo != 56)
  if (ind && ind !== '56' && cel.length >= 7) {
    return { valid: true, normalized: ind + cel, chile: false };
  }
  // Caso 5: muy corto
  if (cel.length < 8) return { valid: false, reason: 'muy_corto', normalized: cel };
  return { valid: false, reason: 'formato_desconocido', normalized: cel };
}

// ── Fecha nacimiento Weibook → ISO ───────────────────────────────
// Weibook la trae como texto "DD/MM/YYYY" o Date/timestamp (dependiendo del XLSX).
function parseFechaNacimiento(raw) {
  if (!raw) return null;
  // XLSX devuelve Dates como Date objects si el celda es formato fecha.
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(raw).trim();
  // DD/MM/YYYY o DD-MM-YYYY
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m1) {
    const d = m1[1].padStart(2, '0');
    const m = m1[2].padStart(2, '0');
    let y = m1[3]; if (y.length === 2) y = (parseInt(y, 10) > 50 ? '19' : '20') + y;
    return `${y}-${m}-${d}`;
  }
  // YYYY-MM-DD ya en ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

// ── Score de completitud (elige la fila "principal" del grupo) ──
function scoreRow(r) {
  let s = 0;
  if ((r['CORREO ELECTRÓNICO'] || r['CORREO ELECTRONICO'] || '').toString().trim()) s += 3;
  if ((r['APELLIDO'] || '').toString().trim()) s += 2;
  if ((r['IDENTIFICACIÓN'] || r['IDENTIFICACION'] || '').toString().trim()) s += 1;
  if ((r['DIRECCIÓN'] || r['DIRECCION'] || '').toString().trim()) s += 1;
  if (r['FECHA DE NACIMIENTO']) s += 3;
  return s;
}

function mergeGroup(rows) {
  const sorted  = [...rows].sort((a, b) => scoreRow(b) - scoreRow(a));
  const primary = sorted[0];
  const merged  = { ...primary };
  for (const r of sorted.slice(1)) {
    for (const k of Object.keys(r)) {
      const cur = merged[k];
      const nxt = r[k];
      if ((cur == null || cur === '' || cur === 0) && nxt != null && nxt !== '' && nxt !== 0) {
        merged[k] = nxt;
      }
    }
  }
  const nombresNorm = new Set(
    rows.map(r => (r.NOMBRE || '').toString().trim().toLowerCase()).filter(Boolean)
  );
  return { merged, sourceCount: rows.length, nombresDistintos: nombresNorm.size > 1 };
}

// ── Doc Firestore ────────────────────────────────────────────────
function toFirestoreDoc(row, meta, sourceFile) {
  const nombre    = (row.NOMBRE   || '').toString().trim();
  const apellido  = (row.APELLIDO || '').toString().trim();
  const email     = (row['CORREO ELECTRÓNICO'] || row['CORREO ELECTRONICO'] || '').toString().trim().toLowerCase();
  const rut       = (row['IDENTIFICACIÓN']     || row['IDENTIFICACION']     || '').toString().trim();
  const direccion = (row['DIRECCIÓN']          || row['DIRECCION']          || '').toString().trim();
  const fechaNacimiento = parseFechaNacimiento(row['FECHA DE NACIMIENTO']);
  const personaTipo = (row['PERSONA (NATURAL/JURÍDICA)'] || row['PERSONA (NATURAL/JURIDICA)'] || '').toString().trim();
  const comoConociste = (row['¿COMO NOS CONOCISTE?']    || '').toString().trim();

  const fullNombre = apellido ? `${nombre} ${apellido}` : nombre;

  return {
    // Base
    uid:                meta.docId,
    nombre:             fullNombre || 'Cliente',
    telefono:           meta.telefono,
    ...(email       ? { email }             : {}),
    ...(rut         ? { rut }               : {}),
    ...(direccion   ? { direccion }         : {}),
    ...(fechaNacimiento ? { fechaNacimiento } : {}),
    ...(comoConociste ? { comoConociste }   : {}),
    ...(personaTipo   ? { personaTipo }     : {}),
    // Fidelizacion (Camino 1.5): pool marca. sedePorSede se inicializa a 0
    // en las 3 sedes para que sede predominante arranque desde cero.
    sellosDisponibles:  0,
    sellosHistoricos:   0,
    stamps:             0,
    sellosPorSede:      { penablanca: 0, limache: 0, woman: 0 },
    // Meta de auditoria
    importSource:       sourceFile,
    importOrigen:       'weibook',
    importedRowsCount:  meta.sourceCount,
    ...(meta.posibleDuplicado ? { posibleDuplicado: true, posibleDuplicadoRazon: meta.razon } : {}),
    ...(meta.telefonoNoChileno ? { telefonoNoChileno: true } : {}),
  };
}

// ── Main ──────────────────────────────────────────────────────────
(async function main() {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`IMPORT CLIENTES KRONNOS → pool marca tenants/${TENANT}/`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`Archivo         : ${filePath}`);
  console.log(`Modo            : ${commit ? '🔴 COMMIT (escribe a Firebase)' : '🟢 DRY-RUN (no escribe)'}`);
  console.log(`Service account : ${SERVICE_PATH}`);
  console.log(`Log             : ${LOG_JSONL}`);
  console.log(`Limit           : ${LIMIT === Infinity ? 'sin limite' : LIMIT}`);
  console.log(`${'═'.repeat(70)}\n`);

  // 1) Leer xlsx. Weibook: header en fila 6 (index 5) → skip 5 filas de metadata.
  const wb    = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // range: 5 = comenzar desde fila 6 (0-indexed) — donde estan los headers reales
  const rows  = XLSX.utils.sheet_to_json(sheet, { defval: null, range: 5 });
  const limited = rows.slice(0, LIMIT);
  console.log(`✓ Leidas ${rows.length} filas (${limited.length} a procesar).`);

  const sourceFile = path.basename(filePath);

  // 2) Filtrar + agrupar por telefono
  const stats = {
    total:                 limited.length,
    skipped_sin_contacto:  0,
    skipped_solo_email:    0,
    skipped_tel_malformado:0,
    grupos_procesados:     0,
    docs_generados:        0,
    flagged_duplicado:     0,
    flagged_extranjero:    0,
    con_cumple:            0,
    con_email:             0,
  };

  const grupos = new Map();
  const soloEmailRows = [];

  const logStream = fs.createWriteStream(LOG_JSONL);
  const logJson   = (obj) => logStream.write(JSON.stringify(obj) + '\n');

  for (const r of limited) {
    const cel   = (r.CELULAR || '').toString().trim();
    const ind   = (r.INDICATIVO || '').toString().trim();
    const email = (r['CORREO ELECTRÓNICO'] || r['CORREO ELECTRONICO'] || '').toString().trim().toLowerCase();
    const clas  = classifyPhone(ind, cel);

    if (!cel && !email) {
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
      stats.skipped_solo_email++;
      soloEmailRows.push(r);
      logJson({ event: 'skipped_solo_email', row: r });
      continue;
    }

    const key = clas.normalized;
    if (!grupos.has(key)) grupos.set(key, { clas, rows: [] });
    grupos.get(key).rows.push(r);
  }

  console.log(`✓ Grupos unicos por telefono: ${grupos.size}`);
  console.log(`✓ Filas descartadas sin contacto: ${stats.skipped_sin_contacto}`);
  console.log(`✓ Filas solo con email: ${stats.skipped_solo_email}`);
  console.log(`✓ Filas telefono malformado: ${stats.skipped_tel_malformado}\n`);

  // 3) Componer docs
  const docs = [];
  for (const [telN, group] of grupos) {
    stats.grupos_procesados++;
    const { merged, sourceCount, nombresDistintos } = mergeGroup(group.rows);

    const telFormatted = `+${telN}`;
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
    });
  }

  stats.docs_generados = docs.length;

  // 4) Escritura (solo --commit)
  let escritos = 0, fallos = 0;
  if (commit) {
    console.log('🔴 Modo COMMIT: inicializando Firebase Admin SDK…\n');
    const admin = require('firebase-admin');
    const serviceAccount = require(SERVICE_PATH);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    const db = admin.firestore();
    const { FieldValue } = admin.firestore;

    console.log(`⚠️  Vas a escribir ${docs.length} users + ${docs.length} clientes en tenants/${TENANT}/.`);
    console.log('⚠️  Idempotente (set con merge). Ctrl+C para abortar en 5s.\n');
    await new Promise(r => setTimeout(r, 5000));

    // Batch 200 (400 ops/batch, seguro bajo 500).
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
          creadoEn:   FieldValue.serverTimestamp(),
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
          importOrigen: 'weibook',
          importedAt:   FieldValue.serverTimestamp(),
          updatedAt:    FieldValue.serverTimestamp(),
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
    console.log('🟢 Dry-run: no se escribio a Firebase. Usa --commit para persistir.\n');
  }

  // 5) Cerrar log + stats
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

  console.log(`${'═'.repeat(70)}`);
  console.log('RESUMEN');
  console.log(`${'═'.repeat(70)}`);
  console.log(`Filas leidas             : ${stats.total}`);
  console.log(`Docs generados           : ${stats.docs_generados}`);
  console.log(`  ├─ con email           : ${stats.con_email}`);
  console.log(`  ├─ con cumpleanos      : ${stats.con_cumple}`);
  console.log(`  ├─ posibleDuplicado    : ${stats.flagged_duplicado}`);
  console.log(`  └─ extranjero          : ${stats.flagged_extranjero}`);
  console.log(`Descartados`);
  console.log(`  ├─ sin contacto        : ${stats.skipped_sin_contacto}`);
  console.log(`  ├─ solo email          : ${stats.skipped_solo_email}`);
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
