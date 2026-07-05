/**
 * migrate-agendapro-latin.js
 *
 * Migra clientes de AgendaPro (Excel .xlsx export, hoja "sheets3") al tenant
 * The Latin Caribe.
 *
 * ⚠️  El tenantId INTERNO es 'latincaribe' (sin "the"). El dominio
 *     thelatincaribe.synaptechspa.cl es solo marca; en Firestore, config.js,
 *     middleware.js y admin-panel/tenantUtils.js todos resuelven a 'latincaribe'.
 *
 * Escribe DOS docs por cliente (mismo patrón que migrate-djones-clientes):
 *   tenants/latincaribe/clientes/{telefonoNormalizado}  — lookup rápido
 *   tenants/latincaribe/users/{telefonoNormalizado}     — perfil pasivo del Club
 *                                                         (uid = telefono).
 * Si el tenant tiene auto-enroll activo, este perfil pasivo es consistente con
 * lo que crearía autoEnrollTenant en la primera cita — la CF hace merge si el
 * cliente vuelve a agendar. Y si el cliente decide registrarse con
 * email+password, dedupeOnCreateTenant fusiona sellos e historial.
 *
 * Deduplicación:
 *   - docId = teléfono normalizado (solo dígitos, con prefijo 56 para Chile).
 *   - Duplicados dentro del CSV (mismo teléfono): se omiten con log.
 *   - Duplicados vs Firestore: `.set(..., {merge: true})` = upsert.
 *
 * Uso:
 *   node scripts/migrate-agendapro-latin.js "ruta/al/archivo.xlsx"
 *   node scripts/migrate-agendapro-latin.js "ruta/al/archivo.xlsx" --commit
 *
 * Si el .xlsx está en la raíz del repo y no se pasa ruta, busca por defecto:
 *   clientes_497317_1782925232.xlsx
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');
const XLSX  = require('xlsx');

// ── Config ──────────────────────────────────────────────────────────
const TENANT_ID    = 'latincaribe';
const BATCH_SIZE   = 200; // 200 clientes × 2 docs = 400 ops (bajo el límite de 500)
const COMMIT       = process.argv.includes('--commit');
const CLI_PATH_ARG  = process.argv.slice(2).find(a => !a.startsWith('--'));
const DEFAULT_XLSX  = 'clientes_497317_1782925232.xlsx';
const XLSX_PATH     = CLI_PATH_ARG
  ? path.resolve(CLI_PATH_ARG)
  : path.join(__dirname, '..', DEFAULT_XLSX);
const SHEET_NAME    = 'sheets3';

// ── Firebase Admin ──────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'service-account.json');
let credential;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  credential = admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8')));
  console.log('🔑 Usando service-account.json');
} else {
  credential = admin.credential.applicationDefault();
  console.log('🔑 Usando Application Default Credentials');
}
admin.initializeApp({ credential, projectId: 'barberia-elegance' });
const db  = admin.firestore();
const TS  = admin.firestore.FieldValue.serverTimestamp;
const INC = admin.firestore.FieldValue.increment;

// ── Normalización ───────────────────────────────────────────────────

/**
 * Devuelve el valor de la primera columna que exista. AgendaPro no es 100%
 * consistente con nombres/mayúsculas/tildes entre exports.
 */
function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  // Fallback case-insensitive
  const lowerMap = {};
  for (const k of Object.keys(row)) lowerMap[k.toLowerCase().trim()] = row[k];
  for (const k of keys) {
    const v = lowerMap[k.toLowerCase().trim()];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/** "Juan   Pérez" → "Juan Pérez"; Title-case básico si viene TODO MAYÚS. */
function normalizeNombre(nombre, apellido) {
  const raw = [nombre, apellido].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  // Si viene TODO EN MAYÚSCULAS, aplicamos Title Case. Si no, respetamos.
  if (raw === raw.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(raw)) {
    return raw
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return raw;
}

/** email lowercase + trim. Rechaza si no tiene @. */
function normalizeEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e || !e.includes('@') || e.length < 5) return '';
  return e;
}

/**
 * Teléfono chileno normalizado a `+56XXXXXXXXX` (E.164).
 * - Elimina espacios, guiones, paréntesis, puntos.
 * - Si viene con 56 al principio (11 dígitos) → agrega +.
 * - Si viene con 9 dígitos empezando en 9 (móvil sin código país) → antepone +56.
 * - Si viene sin nada útil → devuelve '' (skip).
 */
function normalizePhone(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  // Quitar todo lo que no sea dígito o +
  s = s.replace(/[^\d+]/g, '');
  // Sacar +
  const hadPlus = s.startsWith('+');
  s = s.replace(/\+/g, '');
  if (!s || s.length < 8) return '';
  // Ya viene con 56 al inicio
  if (s.startsWith('56') && s.length >= 10) return '+' + s;
  // 9 dígitos empezando en 9 (móvil chileno estándar)
  if (s.length === 9 && s.startsWith('9')) return '+56' + s;
  // 8 dígitos (fijo antiguo o móvil sin el 9)
  if (s.length === 8) return '+56' + s;
  // Ya tenía + y algo distinto (extranjero): respetamos
  if (hadPlus) return '+' + s;
  // Último recurso: si son 10+ dígitos y no arranca en 56, asumimos +56 delante
  if (s.length >= 9) return '+56' + s;
  return '';
}

/** Sólo dígitos (para docId). */
function phoneDigits(e164) {
  return String(e164 || '').replace(/\D/g, '');
}

// ── Parseo de fecha de nacimiento (opcional) ─────────────────────────
// AgendaPro (.xlsx) trae la fecha en TRES columnas separadas:
//   "Día del nacimiento", "Mes del nacimiento", "Año de nacimiento."
// (sí, la de año viene con un punto final; es literal del export).
// Devuelve { iso: "YYYY-MM-DD" | null, cumpleDia: "MM-DD" | null }.
function reconstructFecha(dia, mes, ano) {
  const d = String(dia || '').trim();
  const m = String(mes || '').trim();
  const y = String(ano || '').trim();
  if (!d || !m || !y) return { iso: null, cumpleDia: null };
  const dNum = parseInt(d, 10);
  const mNum = parseInt(m, 10);
  const yNum = parseInt(y, 10);
  // Rango sano — descarta ruido tipo "0", "-", "N/A"
  if (!Number.isFinite(dNum) || dNum < 1 || dNum > 31) return { iso: null, cumpleDia: null };
  if (!Number.isFinite(mNum) || mNum < 1 || mNum > 12) return { iso: null, cumpleDia: null };
  if (!Number.isFinite(yNum) || yNum < 1900 || yNum > 2100) {
    // Si el año no es válido pero el día/mes sí, al menos devolvemos cumpleDia
    // para que funcione el cron de cumpleaños.
    const dd = String(dNum).padStart(2, '0');
    const mm = String(mNum).padStart(2, '0');
    return { iso: null, cumpleDia: `${mm}-${dd}` };
  }
  const dd = String(dNum).padStart(2, '0');
  const mm = String(mNum).padStart(2, '0');
  return { iso: `${yNum}-${mm}-${dd}`, cumpleDia: `${mm}-${dd}` };
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('📥 XLSX:     ', XLSX_PATH);
  console.log('📄 Hoja:     ', SHEET_NAME);
  console.log('🎯 Tenant:   ', TENANT_ID, '(The Latin Caribe)');
  console.log('📦 Batch:    ', BATCH_SIZE, 'clientes ×', 2, 'docs =', BATCH_SIZE * 2, 'ops');
  console.log(COMMIT
    ? '🚀 MODO COMMIT — escribe a Firestore'
    : '🧪 DRY RUN — pasá --commit para escribir');
  console.log('');

  if (!fs.existsSync(XLSX_PATH)) {
    console.error('❌ No existe el archivo:', XLSX_PATH);
    console.error('   Pasá la ruta como argumento:');
    console.error('   node scripts/migrate-agendapro-latin.js "ruta/al/archivo.xlsx"');
    process.exit(1);
  }

  // SheetJS: lee el workbook y elige la hoja "sheets3" (fallback a la primera).
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true });
  const sheetName = wb.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : wb.SheetNames[0];
  if (sheetName !== SHEET_NAME) {
    console.log(`   ⚠  Hoja "${SHEET_NAME}" no encontrada; uso "${sheetName}" (primera del workbook).`);
  }
  const sheet = wb.Sheets[sheetName];
  // sheet_to_json con { defval: '' } evita undefineds en columnas vacías.
  // { raw: false } convierte fechas/números a strings legibles.
  const records = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  console.log(`   Filas parseadas: ${records.length}`);
  if (records.length === 0) {
    console.error('❌ Hoja vacía o sin encabezados válidos.');
    process.exit(1);
  }
  console.log(`   Columnas detectadas: [${Object.keys(records[0]).join(', ')}]`);
  console.log('');

  // ── Normalización + dedup en memoria ────────────────────────────
  const seen         = new Map();     // docId → { nombres, apellidos } de la fila que se conservó
  const clean        = [];            // filas válidas listas para batch
  const dupGrupos    = new Map();     // docId → { telefono, primerKept, duplicados[] }
  const stats        = {
    sinNombre:      0,
    sinTelefono:    0,
    duplicadoCsv:   0,
    emailInvalido:  0,
  };

  for (const row of records) {
    // Columnas confirmadas del export .xlsx de AgendaPro:
    //   Nombres, Apellidos (pueden venir vacíos), Email, Teléfono (con tilde),
    //   Día del nacimiento, Mes del nacimiento, Año de nacimiento. (con punto).
    // Los fallbacks case-insensitive de pick() cubren variantes históricas.
    const nombresRaw   = pick(row, 'Nombres', 'Nombre', 'nombre', 'Primer Nombre');
    const apellidosRaw = pick(row, 'Apellidos', 'Apellido', 'apellido', 'Primer Apellido');
    // normalizeNombre() filtra falsy antes de join → no imprime "undefined"
    // cuando apellidos viene null/vacío.
    const nombre = normalizeNombre(nombresRaw, apellidosRaw);
    if (!nombre) { stats.sinNombre++; continue; }

    const telefonoE164 = normalizePhone(
      pick(row, 'Teléfono', 'Telefono', 'telefono', 'teléfono', 'Celular', 'celular', 'Movil', 'móvil')
    );
    if (!telefonoE164) { stats.sinTelefono++; continue; }

    const docId = phoneDigits(telefonoE164);
    if (!docId || docId.length < 8) { stats.sinTelefono++; continue; }

    if (seen.has(docId)) {
      stats.duplicadoCsv++;
      // Guardamos el descarte para el reporte JSON (solo relevante en dry-run).
      const kept = seen.get(docId);
      if (!dupGrupos.has(docId)) {
        dupGrupos.set(docId, {
          telefono:    telefonoE164,
          primerKept:  { nombres: kept.nombres, apellidos: kept.apellidos },
          duplicados:  [],
        });
      }
      dupGrupos.get(docId).duplicados.push({
        nombres:   nombresRaw,
        apellidos: apellidosRaw,
      });
      continue;
    }
    seen.set(docId, { nombres: nombresRaw, apellidos: apellidosRaw });

    const emailRaw = pick(row, 'Email', 'email', 'Correo', 'correo', 'E-mail');
    const email    = normalizeEmail(emailRaw);
    if (emailRaw && !email) stats.emailInvalido++;

    // Fecha desde 3 columnas separadas. El "Año de nacimiento." tiene punto
    // literal — es parte del header exportado por AgendaPro.
    const dia = pick(row, 'Día del nacimiento', 'Dia del nacimiento', 'día', 'dia');
    const mes = pick(row, 'Mes del nacimiento', 'mes');
    const ano = pick(row, 'Año de nacimiento.', 'Año de nacimiento', 'Ano de nacimiento', 'año', 'ano', 'anio');
    const { iso: fechaNac, cumpleDia } = reconstructFecha(dia, mes, ano);

    clean.push({
      docId,
      nombre,
      telefono: telefonoE164,
      email,
      fechaNacimiento: fechaNac,
      cumpleDia,
    });
  }

  console.log('📊 Normalización:');
  console.log(`   Válidos:            ${clean.length}`);
  console.log(`   Sin nombre:         ${stats.sinNombre}`);
  console.log(`   Sin teléfono:       ${stats.sinTelefono}`);
  console.log(`   Duplicados en CSV:  ${stats.duplicadoCsv}`);
  console.log(`   Email inválido:     ${stats.emailInvalido}`);
  console.log('');
  if (clean.length === 0) {
    console.error('❌ No hay filas válidas para migrar.');
    process.exit(1);
  }

  // ── Reporte de duplicados (solo en dry-run, para revisar antes de commit) ──
  if (!COMMIT && dupGrupos.size > 0) {
    const REPORT_PATH = path.join(__dirname, '..', 'migraciones', 'reporte_duplicados.json');
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    const grupos = [...dupGrupos.values()].sort(
      (a, b) => b.duplicados.length - a.duplicados.length
    );
    const totalFilasDescartadas = grupos.reduce((s, g) => s + g.duplicados.length, 0);
    fs.writeFileSync(REPORT_PATH, JSON.stringify({
      generadoEn:              new Date().toISOString(),
      xlsxOrigen:              path.basename(XLSX_PATH),
      tenant:                  TENANT_ID,
      totalGruposConflicto:    grupos.length,
      totalFilasDescartadas,
      grupos,
    }, null, 2), 'utf8');
    console.log(`📄 Reporte de duplicados: ${REPORT_PATH}`);
    console.log(`   Grupos conflictivos: ${grupos.length}  ·  Filas descartadas: ${totalFilasDescartadas}`);
    console.log('');
  }

  // ── Sample de las primeras 3 ────────────────────────────────────
  console.log('👀 Sample:');
  clean.slice(0, 3).forEach((c, i) =>
    console.log(`   ${i + 1}. ${c.nombre} · ${c.telefono}${c.email ? ' · ' + c.email : ''}${c.cumpleDia ? ' · cumple ' + c.cumpleDia : ''}`)
  );
  console.log('');

  // ── Escritura por batches ──────────────────────────────────────
  const colClientes = db.collection(`tenants/${TENANT_ID}/clientes`);
  const colUsers    = db.collection(`tenants/${TENANT_ID}/users`);
  let written = 0;
  const total = clean.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = clean.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const c of chunk) {
      const base = {
        nombre:       c.nombre,
        telefono:     c.telefono,
        ...(c.email    ? { email: c.email } : {}),
        ...(c.fechaNacimiento ? { fechaNacimiento: c.fechaNacimiento } : {}),
        ...(c.cumpleDia       ? { cumpleDia: c.cumpleDia } : {}),
        uid:          c.docId, // uid === docId → marca de perfil pasivo (mismo patrón que autoEnroll)
        migratedFrom: 'agendapro',
        importedFrom: 'agendapro', // compat con dedupeOnCreateTenant que busca este flag
        importedAt:   TS(),
        updatedAt:    TS(),
        createdAt:    TS(),
      };

      // clientes/{docId} — usado por scripts de cumpleaños y lookups admin
      batch.set(colClientes.doc(c.docId), {
        ...base,
        sellosDisponibles: INC(0),
        sellosHistoricos:  INC(0),
        historial:         [],
      }, { merge: true });

      // users/{docId} — perfil pasivo del Club (aparece en /gestion-interna/clientes
      // con badge "MIGRADO"; sellosTenant le suma sello al completar citas)
      batch.set(colUsers.doc(c.docId), {
        ...base,
        creadoEn:          TS(),
        sellosDisponibles: INC(0),
        sellosHistoricos:  INC(0),
        stamps:            INC(0),
      }, { merge: true });
    }

    if (COMMIT) {
      try {
        await batch.commit();
        written += chunk.length;
        process.stdout.write(`\r  ✓ ${written}/${total} escritos (${chunk.length * 2} ops en este batch)`);
      } catch (e) {
        console.error(`\n❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} falló:`, e.message);
        process.exit(1);
      }
    } else {
      written += chunk.length;
      console.log(`  [dry] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} clientes · acumulado ${written}/${total}`);
    }
  }

  console.log('\n');
  console.log('════════════════════════════════════════════');
  console.log(COMMIT ? '  ✅  Migración completa' : '  🧪  Dry run completo');
  console.log(`  Total válidos:  ${clean.length}`);
  console.log(`  ${COMMIT ? 'Escritos' : 'Preparados'}:       ${written}  (= ${written * 2} docs en Firestore)`);
  console.log('════════════════════════════════════════════');
  if (!COMMIT) {
    console.log('\n💡 Cuando estés conforme:');
    console.log(`   node scripts/migrate-agendapro-latin.js ${CLI_PATH_ARG ? `"${CLI_PATH_ARG}" ` : ''}--commit\n`);
  }
  process.exit(0);
}

main().catch(e => {
  console.error('❌ Error fatal:', e);
  process.exit(1);
});
