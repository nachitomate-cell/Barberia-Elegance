#!/usr/bin/env node
/**
 * check-firestore-safety.js
 *
 * Falla el build si alguna vista llama getDocs()/getDoc() SIN envolverlo en
 * withTimeout() (o sin venir de un wrapper seguro como safeGetDocs).
 *
 * Por que: el SDK web de Firestore no aborta getDocs/getDoc por su cuenta. En
 * PWA con red flaky el socket queda colgado para siempre y el spinner gira
 * eternamente. Eso fue el bug original en Inicio y Metricas. Esta guardia
 * impide que vuelva a colarse al agregar una vista nueva.
 *
 * Como exceptuar legitimamente: si una llamada NO necesita timeout (raro),
 * agregar el comentario `// firestore-safe: <razon>` en la misma linea o en
 * la linea inmediatamente anterior.
 *
 * Se ejecuta en `npm run prebuild` (ver package.json).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR   = join(__dirname, '..', 'src');
const ROOT      = join(__dirname, '..');

const EXEMPT_MARK = 'firestore-safe:';
const SAFE_WRAPPERS = ['withTimeout', 'safeGetDocs', 'safeGetDoc'];

// Permitir el helper mismo (ahi se importan los originales sin envolver).
const ALLOWLIST_FILES = new Set([
  'src/lib/firestore-helpers.js',
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(jsx?|tsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

function scan(file) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (ALLOWLIST_FILES.has(rel)) return [];

  const src = readFileSync(file, 'utf8');
  const violations = [];

  // Calculamos los offsets de cada nueva linea para reportar fila/columna.
  const lineOffsets = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') lineOffsets.push(i + 1);
  const offsetToPos = (off) => {
    let lo = 0, hi = lineOffsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineOffsets[mid] <= off) lo = mid; else hi = mid - 1;
    }
    return { line: lo + 1, col: off - lineOffsets[lo] + 1 };
  };

  // Regex de llamada cruda con su offset en el texto completo.
  const callRe = /\b(getDocs?|getDoc)\s*\(/g;
  let m;
  while ((m = callRe.exec(src)) !== null) {
    const callStart = m.index;

    // Comentario de exencion en la misma linea o la anterior.
    const { line } = offsetToPos(callStart);
    const prevLineStart = lineOffsets[Math.max(0, line - 2)];
    const thisLineEnd   = src.indexOf('\n', callStart);
    const around = src.slice(prevLineStart, thisLineEnd === -1 ? src.length : thisLineEnd);
    if (around.includes(EXEMPT_MARK)) continue;

    // Si esta linea es comentario (// ... o * ... dentro de bloque), saltar.
    const lineStart = lineOffsets[line - 1];
    const lineText  = src.slice(lineStart, thisLineEnd === -1 ? src.length : thisLineEnd);
    const trimmed   = lineText.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // Buscamos el wrapper inmediato: el identificador que precede al `(` que
    // contiene a este `getDocs(`. Caminamos hacia atras saltando espacios,
    // saltos de linea, comas y paramentros previos (matcheando parentesis).
    // Si encontramos `withTimeout(` (u otro SAFE_WRAPPER) como el call que
    // envuelve a este, OK.
    let pos = callStart - 1;
    let depth = 0;
    let wrapped = false;
    while (pos >= 0) {
      const ch = src[pos];
      if (ch === ')') { depth++; pos--; continue; }
      if (ch === '(') {
        if (depth === 0) {
          // Llegamos al `(` del call que contiene a este getDocs.
          // Leemos el identificador inmediato antes.
          let idEnd = pos - 1;
          while (idEnd >= 0 && /\s/.test(src[idEnd])) idEnd--;
          let idStart = idEnd;
          while (idStart >= 0 && /[A-Za-z0-9_$]/.test(src[idStart])) idStart--;
          const id = src.slice(idStart + 1, idEnd + 1);
          if (SAFE_WRAPPERS.includes(id)) { wrapped = true; break; }
          // Si el wrapper inmediato NO es seguro, segui mirando uno mas afuera
          // (cubre `await withTimeout(getDocs(...))` y casos similares en los
          // que getDocs queda anidado en, por ejemplo, una IIFE).
          pos = idStart;
          continue;
        }
        depth--; pos--; continue;
      }
      // Frontera de statement: punto y coma, llave o inicio de archivo.
      if (depth === 0 && (ch === ';' || ch === '{' || ch === '}')) break;
      pos--;
    }

    if (!wrapped) {
      const { line: ln, col } = offsetToPos(callStart);
      violations.push({ file: rel, line: ln, col, snippet: trimmed });
    }
  }
  return violations;
}

const files = walk(SRC_DIR);
const all = files.flatMap(scan);

if (all.length === 0) {
  console.log('✓ firestore-safety: todas las lecturas estan envueltas en withTimeout().');
  process.exit(0);
}

console.error('\n✗ firestore-safety: lecturas a Firestore SIN withTimeout detectadas:\n');
for (const v of all) {
  console.error(`  ${v.file}:${v.line}:${v.col}`);
  console.error(`    ${v.snippet}`);
}
console.error(
  '\nEnvuelve la llamada con withTimeout() de src/lib/firestore-helpers o agrega\n' +
  '`// firestore-safe: <razon>` en la linea anterior si realmente no aplica.\n'
);
process.exit(1);
