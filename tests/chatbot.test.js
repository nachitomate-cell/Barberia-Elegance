// chatbot.test.js — Tests E2E automatizados del chatbot del SaaS.
//
// Verifica los flujos principales del chat público (/chat), el bio público
// con FAB de Syna, y la integración con el panel admin de mensajes.
//
// Variables de entorno opcionales:
//   HEADED=1      → abre el navegador visible (útil para debug)
//   SLOWMO=120    → ralentiza las interacciones (ms)
//   TENANT=elegance → testea con otro tenant
//   BASE=http://localhost:3000   → URL del chat público
//   ADMIN=http://localhost:5173  → URL del admin Vite
//
// Uso:
//   cd tests && npm install
//   node chatbot.test.js
//   HEADED=1 node chatbot.test.js          (ver lo que hace)
//   HEADED=1 SLOWMO=120 node chatbot.test.js (super lento, paso a paso)

'use strict';

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

// ── Configuración ──────────────────────────────────────────────────
const TENANT     = process.env.TENANT || 'kronnos_penablanca';
const BASE_URL   = process.env.BASE   || 'http://localhost:3000';
const ADMIN_URL  = process.env.ADMIN  || 'http://localhost:5173';
const HEADED     = process.env.HEADED === '1';
const SLOWMO     = Number(process.env.SLOWMO || 0);
const SCREEN_DIR = path.join(__dirname, 'screenshots');

// Viewport mobile-first (iPhone 13 Pro)
const VIEWPORT = { width: 390, height: 844, isMobile: true, hasTouch: true };

// ── Registro de tests ──────────────────────────────────────────────
const tests = [];
const results = [];

function test(name, fn) {
  tests.push({ name, fn });
}

// ── Helpers ────────────────────────────────────────────────────────
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  // Capturar errores de consola del propio sitio
  page.on('pageerror', (err) => page.__lastError = err.message);
  page.on('console', (msg) => {
    if (msg.type() === 'error') page.__lastConsoleError = msg.text();
  });
  return page;
}

async function clearStorage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}
  });
}

// Espera a que el welcome modal esté visible y completa el flujo
async function completeWelcome(page, nombre = 'Test Bot', tel = '') {
  await page.waitForFunction(
    () => document.getElementById('welcomeModal')?.classList.contains('show'),
    { timeout: 8000 },
  );
  await page.type('#welcomeName', nombre, { delay: 30 });
  if (tel) await page.type('#welcomePhone', tel, { delay: 30 });
  await page.click('#welcomeSubmit');
  // Esperar que el modal se oculte
  await page.waitForFunction(
    () => !document.getElementById('welcomeModal')?.classList.contains('show'),
    { timeout: 5000 },
  );
}

// Espera a que aparezca al menos un quick-reply chip del bot
async function waitForBotChips(page, timeout = 12000) {
  await page.waitForSelector('.quick-reply', { timeout });
  // pequeña pausa para que terminen las animaciones de stagger
  await wait(400);
}

// Toca un chip por su texto visible (case-insensitive, busca substring)
async function clickChip(page, text) {
  const clicked = await page.evaluate((search) => {
    const chips = [...document.querySelectorAll('.quick-reply')];
    const target = chips.find(c => c.textContent.toLowerCase().includes(search.toLowerCase()));
    if (!target) return false;
    target.click();
    return true;
  }, text);
  if (!clicked) throw new Error(`Chip no encontrado: "${text}"`);
  await wait(200);
}

async function countBotMessages(page) {
  return await page.evaluate(() => document.querySelectorAll('.bubble.admin').length);
}

async function countServiceCards(page) {
  return await page.evaluate(() => document.querySelectorAll('.service-card').length);
}

async function hasCtaButton(page) {
  return await page.evaluate(() => !!document.querySelector('.cta-button'));
}

async function lastBubbleText(page) {
  return await page.evaluate(() => {
    const all = [...document.querySelectorAll('.bubble')];
    return all[all.length - 1]?.textContent.trim() || '';
  });
}

async function screenshotOnFail(page, name) {
  try {
    if (!fs.existsSync(SCREEN_DIR)) fs.mkdirSync(SCREEN_DIR, { recursive: true });
    const file = path.join(SCREEN_DIR, `${name.replace(/[^\w]+/g, '_')}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  } catch (_) { return null; }
}

// ════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════

test('chat público responde 200 en /chat', async (page) => {
  const res = await page.goto(`${BASE_URL}/chat?local=${TENANT}`, { waitUntil: 'domcontentloaded' });
  if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
});

test('welcome modal aparece al primer abrir', async (page) => {
  await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
  await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
  await page.waitForFunction(
    () => document.getElementById('welcomeModal')?.classList.contains('show'),
    { timeout: 8000 },
  );
});

test('completar welcome cierra el modal', async (page) => {
  await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
  await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
  await completeWelcome(page, 'Test E2E');
});

test('bot saluda con el nombre del cliente interpolado', async (page) => {
  await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
  await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
  await completeWelcome(page, 'Pedro');
  await page.waitForSelector('.bubble.admin', { timeout: 12000 });
  const txt = await lastBubbleText(page);
  if (!/Pedro/i.test(txt)) throw new Error(`Saludo no incluye el nombre. Texto: "${txt.slice(0,120)}"`);
});

test('al menos 4 chips de quick-reply aparecen tras el saludo', async (page) => {
  await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
  await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
  await completeWelcome(page, 'Chip Tester');
  await waitForBotChips(page);
  const count = await page.evaluate(() => document.querySelectorAll('.quick-reply').length);
  if (count < 4) throw new Error(`Esperaba 4+ chips, encontré ${count}`);
});

test('chip "Precios" carga service cards (precios dinámicos)', async (page) => {
  await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
  await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
  await completeWelcome(page, 'Pricer');
  await waitForBotChips(page);
  await clickChip(page, 'precio');
  // Espera por las service cards (puede tomar ~700ms por typing indicator)
  await page.waitForSelector('.service-card', { timeout: 6000 });
  const cards = await countServiceCards(page);
  if (cards < 1) throw new Error(`Esperaba 1+ service-card, encontré ${cards}`);
});

test('chip "Reservar" muestra CTA button "Reserva aquí"', async (page) => {
  await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
  await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
  await completeWelcome(page, 'Booker');
  await waitForBotChips(page);
  await clickChip(page, 'reservar');
  await page.waitForSelector('.cta-button', { timeout: 6000 });
  const label = await page.evaluate(() => document.querySelector('.cta-button')?.textContent.trim());
  if (!/reserva/i.test(label || '')) throw new Error(`CTA no dice "Reserva". Texto: "${label}"`);
});

test('mensaje libre con keyword "horario" trigerea respuesta del bot', async (page) => {
  await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
  await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
  await completeWelcome(page, 'KeyTester');
  await waitForBotChips(page);
  const before = await countBotMessages(page);
  await page.click('#msgInput');
  await page.type('#msgInput', 'a que hora abren?', { delay: 30 });
  await page.click('#sendBtn');
  // El bot tarda ~600ms en responder (typing indicator)
  await page.waitForFunction(
    (b) => document.querySelectorAll('.bubble.admin').length > b,
    { timeout: 6000 },
    before,
  );
  const after = await countBotMessages(page);
  if (after <= before) throw new Error('El bot no respondió al mensaje libre');
});

test('mensaje sin keyword dispara fallback + escalación', async (page) => {
  await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
  await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
  await completeWelcome(page, 'Fallback');
  await waitForBotChips(page);
  const before = await countBotMessages(page);
  await page.type('#msgInput', 'xyz abracadabra qwerty nonsense', { delay: 25 });
  await page.click('#sendBtn');
  await page.waitForFunction(
    (b) => document.querySelectorAll('.bubble.admin').length > b,
    { timeout: 6000 },
    before,
  );
  const last = await lastBubbleText(page);
  // El fallback default contiene "barbero" o "responderem"
  if (!/(barbero|responde|moment)/i.test(last)) {
    throw new Error(`Fallback inesperado. Texto: "${last.slice(0,120)}"`);
  }
});

test('bot pide código al elegir "Cancelar o reagendar"', async (page) => {
  await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
  await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
  await completeWelcome(page, 'Canceler');
  await waitForBotChips(page);
  await clickChip(page, 'cancelar');
  await page.waitForFunction(
    () => {
      const last = [...document.querySelectorAll('.bubble.admin')].pop();
      return last && /código|codigo/i.test(last.textContent);
    },
    { timeout: 5000 },
  );
});

test('código inválido devuelve error claro', async (page) => {
  await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
  await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
  await completeWelcome(page, 'WrongCode');
  await waitForBotChips(page);
  await clickChip(page, 'cancelar');
  await wait(900);
  const before = await countBotMessages(page);
  await page.type('#msgInput', 'XX', { delay: 30 });  // muy corto
  await page.click('#sendBtn');
  await page.waitForFunction(
    (b) => document.querySelectorAll('.bubble.admin').length > b,
    { timeout: 6000 },
    before,
  );
  const last = await lastBubbleText(page);
  if (!/(valid|XXX-XXX|no parece)/i.test(last)) {
    throw new Error(`Validación no se disparó. Texto: "${last.slice(0,120)}"`);
  }
});

test('bot persiste tras recargar (welcome NO vuelve a aparecer)', async (page) => {
  await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
  await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
  await completeWelcome(page, 'Persist');
  await waitForBotChips(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await wait(1200);
  const shown = await page.evaluate(
    () => document.getElementById('welcomeModal')?.classList.contains('show')
  );
  if (shown) throw new Error('Welcome modal volvió a aparecer tras recarga');
});

test('bio público carga + FAB de Syna se muestra', async (page) => {
  await page.goto(`${BASE_URL}/bio?local=${TENANT}`);
  // El FAB se muestra tras ~600ms (delay para no competir con render del bio)
  await page.waitForFunction(
    () => document.getElementById('synaFab')?.style.display === 'flex',
    { timeout: 8000 },
  );
});

test('FAB de Syna abre el modal con iframe del chat', async (page) => {
  await page.goto(`${BASE_URL}/bio?local=${TENANT}`);
  await page.waitForFunction(
    () => document.getElementById('synaFab')?.style.display === 'flex',
    { timeout: 8000 },
  );
  await page.click('#synaFab');
  await page.waitForFunction(
    () => document.getElementById('synaModal')?.classList.contains('show'),
    { timeout: 3000 },
  );
  const src = await page.evaluate(() => document.getElementById('synaIframe').src);
  if (!src.includes('/chat')) throw new Error(`iframe no apunta a /chat: ${src}`);
});

test('admin Vite responde 200', async (page) => {
  const res = await page.goto(`${ADMIN_URL}/gestion-interna/`, { waitUntil: 'domcontentloaded' });
  if (!res.ok()) throw new Error(`Admin HTTP ${res.status()}`);
});

// ════════════════════════════════════════════════════════════════
// RUNNER
// ════════════════════════════════════════════════════════════════

(async () => {
  const start = Date.now();
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`Chatbot E2E · tenant=${TENANT} · headed=${HEADED} · slowmo=${SLOWMO}ms`);
  console.log(`Chat: ${BASE_URL} · Admin: ${ADMIN_URL}`);
  console.log(`${'─'.repeat(64)}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: HEADED ? false : 'new',
      slowMo: SLOWMO,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (err) {
    console.error('No se pudo iniciar Puppeteer:', err.message);
    console.error('¿Corriste `cd tests && npm install`?');
    process.exit(1);
  }

  let passed = 0, failed = 0;

  for (const t of tests) {
    const page = await newPage(browser);
    const tStart = Date.now();
    try {
      await t.fn(page);
      const dur = Date.now() - tStart;
      console.log(`  ✓ ${t.name} (${dur}ms)`);
      passed++;
      results.push({ name: t.name, ok: true, dur });
    } catch (err) {
      const dur = Date.now() - tStart;
      console.log(`  ✗ ${t.name} (${dur}ms)`);
      console.log(`    └ ${err.message}`);
      if (page.__lastError) console.log(`    └ pageerror: ${page.__lastError}`);
      if (page.__lastConsoleError) console.log(`    └ console.error: ${page.__lastConsoleError}`);
      const shot = await screenshotOnFail(page, t.name);
      if (shot) console.log(`    └ screenshot: ${shot}`);
      failed++;
      results.push({ name: t.name, ok: false, err: err.message, dur });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const total = Date.now() - start;
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`${passed}/${tests.length} pasaron · ${failed} fallaron · ${(total / 1000).toFixed(1)}s`);
  console.log(`${'─'.repeat(64)}\n`);

  // Resumen JSON para CI
  fs.writeFileSync(
    path.join(__dirname, 'last-run.json'),
    JSON.stringify({ tenant: TENANT, total, passed, failed, results }, null, 2),
  );

  process.exit(failed > 0 ? 1 : 0);
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
