#!/usr/bin/env node
/**
 * check-wa-optin.js — Guard de la casilla de consentimiento de WhatsApp.
 *
 * La casilla es la ÚNICA puerta al canal: sin marcarla no sale ni un mensaje, y
 * marcarla además decide que la cita nazca 'Pendiente' en vez de 'Confirmada'.
 * Eso la vuelve un contrato repartido en cuatro archivos que no comparten
 * código, y que se rompe en SILENCIO — la página sigue reservando igual, solo
 * que deja de pedir permiso (o deja de mandar nunca).
 *
 *   1. index.html    · casilla del flujo público
 *   2. barbero.html  · casilla del flujo por barbero (mismo cliente, misma decisión)
 *   3. firebaseUtils.js · ReservaCore.waOptInMarcado() la lee por id, y
 *                         estadoInicialCita() traduce el opt-in a estado
 *   4. functions/evolution/{plataforma,confirmaciones}.js · el servidor
 *      descarta las citas sin waOptIn y el espejo decide cuándo mostrarla
 *
 * Uso:  npm run check:wa-optin   (va dentro de `npm run check`)
 */
const fs   = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const leer = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');

const PAGINAS = ['index.html', 'barbero.html'];
const fallos  = [];

// ── 1. Las dos páginas públicas dibujan la casilla con los ids del contrato ──
for (const p of PAGINAS) {
  const src = leer(p);
  if (!/id="waOptInCheck"/.test(src)) {
    fallos.push(`${p}: no encontré id="waOptInCheck" — waOptInMarcado() devolvería false y esa página no pediría consentimiento nunca`);
  }
  if (!/id="waOptInWrap"/.test(src)) {
    fallos.push(`${p}: no encontré id="waOptInWrap" — el JS no tendría qué mostrar y la casilla quedaría oculta para siempre`);
  }
  // Nace oculta: la muestra el JS solo si el local tiene un canal activo.
  if (!/id="waOptInWrap"[^>]*class="hidden/.test(src)) {
    fallos.push(`${p}: waOptInWrap ya no nace con la clase "hidden" — la casilla se mostraría en locales sin WhatsApp activo`);
  }
  // Promesa al cliente: sin marcar, igual le llega el aviso. Es lo que hace
  // que la casilla se lea como "elige el canal" y no como "quédate sin nada".
  if (!/correo<\/b>/.test(src)) {
    fallos.push(`${p}: la casilla ya no dice que sin marcarla el aviso llega por correo`);
  }
}

// ── 2. El estado inicial se deriva del opt-in, en un solo lugar ──
const utils = leer('firebaseUtils.js');
if (!/function estadoInicialCita\(/.test(utils)) {
  fallos.push('firebaseUtils.js: desapareció estadoInicialCita() — el estado de la cita ya no se derivaría del opt-in');
}
// Los DOS caminos que crean citas públicas tienen que usarla. Un `estado:
// 'Confirmada'` literal en cualquiera de ellos es la regresión exacta que este
// guard existe para atrapar.
const usos = (utils.match(/estado:\s*estadoInicialCita\(/g) || []).length;
if (usos < 2) {
  fallos.push(`firebaseUtils.js: solo ${usos} camino(s) usan estadoInicialCita(); se esperan 2 (addCita y addCitasGrupo)`);
}
if (!/waOptInMarcado/.test(utils)) {
  fallos.push('firebaseUtils.js: desapareció waOptInMarcado() — nadie leería la casilla');
}

// ── 3. El servidor sigue exigiendo el opt-in ──
const plataforma = leer('functions/evolution/plataforma.js');
if (!/cita\.waOptIn !== true/.test(plataforma)) {
  fallos.push('functions/evolution/plataforma.js: se perdió el filtro `cita.waOptIn !== true` — el chip le escribiría a gente que no lo pidió');
}

// ── 4. El espejo público mira los DOS canales ──
// Si vuelve a mirar solo el número propio del local, los tenants que usan el
// chip de SynapTech dejan de mostrar la casilla y el canal se apaga entero.
const confirm = leer('functions/evolution/confirmaciones.js');
if (!/waPlataforma\s*===\s*true/.test(confirm) || !/confirmacionesEnabled === true/.test(confirm)) {
  fallos.push('functions/evolution/confirmaciones.js: waConfirmActivo dejó de ser el OR de los dos canales (propio + chip de SynapTech)');
}

if (fallos.length) {
  console.error('\n❌ El contrato de la casilla de consentimiento de WhatsApp está roto:\n');
  fallos.forEach(f => console.error(`   · ${f}`));
  console.error('\n   Se rompe callado: la reserva sigue funcionando, solo deja de pedir permiso.\n');
  process.exit(1);
}

console.log('✓ Casilla de opt-in de WhatsApp: contrato intacto en las 2 páginas + estado derivado + filtro de servidor');
