#!/usr/bin/env node
// scripts/check-tenants.mjs
// ─────────────────────────────────────────────────────────────────────────────
//  GUARD DE CONSISTENCIA DE TENANTS
//  El registro de tenants vive (hoy) duplicado en varios archivos que corren en
//  runtimes distintos (config.js clásico, middleware Edge, admin-panel Vite).
//  Olvidar un tenant en uno de ellos rompe ese tenant en silencio (ya pasó con
//  yugen: faltaba en config.js → público mostraba Elegance; y en middleware →
//  preview de WhatsApp mostraba Elegance).
//
//  Este script extrae los tenants/dominios de cada registro y reporta los huecos.
//  Sale con código 1 si hay inconsistencias (apto para pre-commit / CI).
//
//  Uso:  node scripts/check-tenants.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Tenants de prueba/scaffold que NO exigimos en todos los registros.
const IGNORE = new Set(['sandbox']);

// Alias: ids distintos que apuntan al MISMO tenant (se colapsan para comparar).
const ALIAS = { mapubarber: 'mapubarbershop' };
const canonId = t => ALIAS[t] || t;

// ── Parser tolerante de object-literals (ignora strings y comentarios) ──────
function extractObjectBody(text, marker) {
  const idx = text.indexOf(marker);
  if (idx < 0) return null;
  let i = text.indexOf('{', idx);
  if (i < 0) return null;
  const start = i;
  let depth = 0, str = null;
  for (; i < text.length; i++) {
    const c = text[i];
    if (str) { if (c === '\\') { i++; continue; } if (c === str) str = null; continue; }
    if (c === "'" || c === '"' || c === '`') { str = c; continue; }
    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return text.slice(start + 1, i); }
  }
  return null;
}

function topLevelEntries(src) {
  const entries = [];
  let i = 0; const n = src.length;
  const skip = () => {
    while (i < n) {
      const c = src[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === ',') { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
      break;
    }
  };
  const readKey = () => {
    skip();
    if (i >= n) return null;
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') {
      const q = c; let s = ''; i++;
      while (i < n && src[i] !== q) { if (src[i] === '\\') { s += src[i + 1]; i += 2; continue; } s += src[i++]; }
      i++; return s;
    }
    const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
    if (m) { i += m[0].length; return m[0]; }
    return null;
  };
  const readValue = () => {
    skip();
    let depth = 0, str = null; const start = i;
    while (i < n) {
      const c = src[i];
      if (str) { if (c === '\\') { i += 2; continue; } if (c === str) str = null; i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
      if (c === "'" || c === '"' || c === '`') { str = c; i++; continue; }
      if (c === '{' || c === '[' || c === '(') { depth++; i++; continue; }
      if (c === '}' || c === ']' || c === ')') { if (depth === 0) break; depth--; i++; continue; }
      if (depth === 0 && c === ',') break;
      i++;
    }
    return src.slice(start, i).trim().replace(/^['"`]|['"`]$/g, '');
  };
  while (true) {
    skip();
    if (i >= n || src[i] === '}') break;
    const key = readKey();
    if (key === null) break;
    skip();
    if (src[i] !== ':') break;
    i++;
    entries.push([key, readValue()]);
  }
  return entries;
}

function load(file) { return readFileSync(join(ROOT, file), 'utf8'); }

// ── Registros a comparar ────────────────────────────────────────────────────
const SOURCES = [
  // Registros OBLIGATORIOS: si a un tenant le falta entrada aquí, se rompe (SEO,
  // resolución de dominio, identidad del panel). Fallan el check.
  { name: 'config.js · _tenants',                file: 'config.js',                                    marker: 'const _tenants',         kind: 'tenants', required: true },
  { name: 'config.js · _domainMap',              file: 'config.js',                                    marker: 'const _domainMap',       kind: 'domains', required: true },
  { name: 'middleware.js · DOMAIN_MAP',          file: 'middleware.js',                                marker: 'DOMAIN_MAP = {',         kind: 'domains', required: true },
  { name: 'middleware.js · TENANT_META',         file: 'middleware.js',                                marker: 'TENANT_META = {',        kind: 'tenants', required: true },
  { name: 'panel · tenantUtils DOMAIN_MAP',      file: 'admin-panel/src/lib/tenantUtils.js',           marker: 'const DOMAIN_MAP',       kind: 'domains', required: true },
  { name: 'panel · TenantContext TENANT_META',   file: 'admin-panel/src/contexts/TenantContext.jsx',   marker: 'const TENANT_META',      kind: 'tenants', required: true },
  // INFORMATIVO: lista opt-in (los no listados usan el manifest dinámico del
  // middleware). No falla el check, solo avisa.
  { name: 'panel · App TENANT_MANIFESTS',        file: 'admin-panel/src/App.jsx',                      marker: 'const TENANT_MANIFESTS', kind: 'tenants', required: false },
];

const registries = [];
for (const s of SOURCES) {
  const body = extractObjectBody(load(s.file), s.marker);
  if (body === null) { console.error(`✗ No pude leer ${s.name} (marcador "${s.marker}")`); process.exitCode = 1; continue; }
  const entries = topLevelEntries(body);
  if (s.kind === 'domains') {
    registries.push({ ...s, hosts: entries.map(e => e[0]), tenants: [...new Set(entries.map(e => canonId(e[1])))] });
  } else {
    registries.push({ ...s, hosts: null, tenants: entries.map(e => canonId(e[0])) });
  }
}

// ── Conjunto canónico de tenants (unión de todo lo visto) ───────────────────
const allTenants = new Set();
for (const r of registries) for (const t of r.tenants) if (!IGNORE.has(t)) allTenants.add(t);
const canon = [...allTenants].sort();

// ── Reporte de tenants faltantes por registro ───────────────────────────────
let problems = 0;
console.log(`\n📋 Tenants canónicos (${canon.length}): ${canon.join(', ')}\n`);
console.log('── Cobertura por registro ──────────────────────────────────────');
for (const r of registries) {
  const present = new Set(r.tenants);
  const missing = canon.filter(t => !present.has(t));
  if (!missing.length) { console.log(`✓ ${r.name}`); continue; }
  if (r.required) { problems++; console.log(`✗ ${r.name}\n     falta: ${missing.join(', ')}`); }
  else            { console.log(`⚠ ${r.name} (informativo)\n     sin entrada propia: ${missing.join(', ')}`); }
}

// ── Drift de dominios (hosts presentes en un domain-map pero no en otro) ─────
const domainRegs = registries.filter(r => r.hosts);
const allHosts = new Set();
for (const r of domainRegs) for (const h of r.hosts) allHosts.add(h);
console.log('\n── Cobertura de dominios (host → tenant) ───────────────────────');
for (const r of domainRegs) {
  const present = new Set(r.hosts);
  const missing = [...allHosts].filter(h => !present.has(h)).sort();
  if (missing.length) { problems++; console.log(`✗ ${r.name}\n     falta: ${missing.join(', ')}`); }
  else console.log(`✓ ${r.name}`);
}

console.log('\n────────────────────────────────────────────────────────────────');
if (problems) { console.log(`❌ ${problems} inconsistencia(s). Agrega los tenants/dominios faltantes.`); process.exitCode = 1; }
else console.log('✅ Todos los registros están alineados.');
