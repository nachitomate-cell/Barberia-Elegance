// e2e-cancel-cita.test.js — Test end-to-end completo del flujo de
// cancelar una cita por código desde /chat.
//
// PASO A PASO:
//   1. Crea una cita de prueba en Firestore con código único (admin SDK)
//   2. Abre /chat en navegador real, completa welcome
//   3. Toca chip "Cancelar o reagendar", ingresa el código
//   4. Verifica que el bot muestra los detalles de la cita
//   5. Toca "Cancelar" → "Sí, cancelar"
//   6. Verifica en Firestore que la cita quedó:
//        - estado: 'Cancelada'
//        - canceladaVia: 'cliente_chat'
//        - canceladaAt: serverTimestamp
//   7. CLEANUP: elimina la cita de prueba (siempre, aunque haya falla)
//
// PRE-REQUISITOS:
//   - Cloud Function gestionarCitaPorCodigo desplegada
//   - Service account key en tests/.firebase-admin-key.json
//     (descargar de https://console.firebase.google.com/project/<proyecto>
//      /settings/serviceaccounts/adminsdk)
//
// USO:
//   cd tests && npm install
//   node e2e-cancel-cita.test.js
//   HEADED=1 SLOWMO=200 node e2e-cancel-cita.test.js   (verlo paso a paso)

'use strict';

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

// ── Configuración ──────────────────────────────────────────────────
const TENANT     = process.env.TENANT || 'kronnos_penablanca';
const BASE_URL   = process.env.BASE   || 'http://localhost:3000';
const HEADED     = process.env.HEADED === '1';
const SLOWMO     = Number(process.env.SLOWMO || 0);
const KEY_FILE   = path.join(__dirname, '.firebase-admin-key.json');
const SCREEN_DIR = path.join(__dirname, 'screenshots');

const VIEWPORT = { width: 390, height: 844, isMobile: true, hasTouch: true };

// ── Guard de credenciales ──────────────────────────────────────────
if (!fs.existsSync(KEY_FILE)) {
  console.log('\n' + '═'.repeat(64));
  console.log('⏭   SKIP: este test requiere Firebase Admin SDK credentials.');
  console.log('═'.repeat(64));
  console.log('\nPara correrlo:');
  console.log('  1. Andá a Firebase Console:');
  console.log('     https://console.firebase.google.com/project/barberia-elegance');
  console.log('     /settings/serviceaccounts/adminsdk');
  console.log('  2. Click en "Generate new private key" → descarga JSON.');
  console.log(`  3. Renombrá a "${path.basename(KEY_FILE)}" y movelo a tests/`);
  console.log('  4. Volvé a correr este test.');
  console.log('\nNo subas ese archivo a git. Está en .gitignore por seguridad.\n');
  process.exit(0);
}

// ── Init Admin SDK ─────────────────────────────────────────────────
let admin;
try {
  admin = require('firebase-admin');
} catch (err) {
  console.error('Falta dependency firebase-admin. Corré: cd tests && npm install');
  process.exit(1);
}

const serviceAccount = require(KEY_FILE);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Helpers Firestore ──────────────────────────────────────────────
function citasCol(tid) {
  return tid === 'elegance'
    ? db.collection('citas')
    : db.collection('tenants').doc(tid).collection('citas');
}

// Genera código de cita estilo XXX-XXX con prefijo "Z" para diferenciarlo de
// los reales (en caso de no llegar al cleanup, son fáciles de identificar).
function generarCodigoTest() {
  const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = 'Z';
  for (let i = 0; i < 5; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code.slice(0, 3) + '-' + code.slice(3);
}

function fechaFutura(diasOffset = 7) {
  const d = new Date(Date.now() + diasOffset * 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function createTestCita(tid) {
  const codigo = generarCodigoTest();
  const cita = {
    fecha:            fechaFutura(7),
    hora:             '15:00',
    clienteNombre:    'Cliente E2E Test',
    clienteTelefono:  '56900000000',
    clienteEmail:     'e2e@test.local',
    servicioNombre:   'Test E2E Corte',
    duracionServicio: 30,
    precio:           10000,
    barbero:          'Barbero Test',
    barberoId:        'test-barbero',
    estado:           'Pendiente',
    codigoCita:       codigo,
    _testRun:         true,                // marca útil para limpieza masiva
    creadoEn:         admin.firestore.FieldValue.serverTimestamp(),
  };
  const ref = await citasCol(tid).add(cita);
  return { id: ref.id, codigo, ...cita };
}

async function readCita(tid, id) {
  const snap = await citasCol(tid).doc(id).get();
  return snap.exists ? snap.data() : null;
}

async function deleteCita(tid, id) {
  await citasCol(tid).doc(id).delete().catch(() => {});
}

// ── Helpers Puppeteer ──────────────────────────────────────────────
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
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

async function completeWelcome(page, nombre = 'E2E Tester') {
  await page.waitForFunction(
    () => document.getElementById('welcomeModal')?.classList.contains('show'),
    { timeout: 8000 },
  );
  await page.type('#welcomeName', nombre, { delay: 25 });
  await page.click('#welcomeSubmit');
  await page.waitForFunction(
    () => !document.getElementById('welcomeModal')?.classList.contains('show'),
    { timeout: 5000 },
  );
}

async function waitForBotChips(page, timeout = 12000) {
  await page.waitForSelector('.quick-reply', { timeout });
  await wait(400);
}

async function clickChipByText(page, search) {
  const clicked = await page.evaluate((s) => {
    const chips = [...document.querySelectorAll('.quick-reply')];
    const t = chips.find(c => c.textContent.toLowerCase().includes(s.toLowerCase()));
    if (!t) return false;
    t.click();
    return true;
  }, search);
  if (!clicked) throw new Error(`Chip no encontrado: "${search}"`);
  await wait(200);
}

async function waitChipByText(page, search, timeout = 8000) {
  await page.waitForFunction(
    (s) => [...document.querySelectorAll('.quick-reply')]
      .some(c => c.textContent.toLowerCase().includes(s.toLowerCase())),
    { timeout },
    search,
  );
}

async function lastBotBubbleText(page) {
  return await page.evaluate(() => {
    const bots = [...document.querySelectorAll('.bubble.admin')];
    return bots[bots.length - 1]?.textContent.trim() || '';
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
// FLUJO E2E
// ════════════════════════════════════════════════════════════════

async function runE2E() {
  const start = Date.now();
  console.log('\n' + '═'.repeat(64));
  console.log(`E2E Cancelar Cita por Código · tenant=${TENANT}`);
  console.log(`Chat: ${BASE_URL} · headed=${HEADED}`);
  console.log('═'.repeat(64) + '\n');

  // ── SETUP ───────────────────────────────────────────────────────
  console.log('▸ Setup: creando cita de prueba en Firestore...');
  const citaTest = await createTestCita(TENANT);
  console.log(`  · id=${citaTest.id}  codigo=${citaTest.codigo}  fecha=${citaTest.fecha} ${citaTest.hora}\n`);

  const browser = await puppeteer.launch({
    headless: HEADED ? false : 'new',
    slowMo: SLOWMO,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await newPage(browser);
  let pass = false;
  let errMsg = null;

  try {
    // ── 1. ABRIR CHAT ───────────────────────────────────────────
    console.log('▸ Paso 1: abrir /chat y completar welcome');
    await clearStorage(page, `${BASE_URL}/chat?local=${TENANT}`);
    await page.goto(`${BASE_URL}/chat?local=${TENANT}`);
    await completeWelcome(page, 'E2E Cancel');
    await waitForBotChips(page);
    console.log('  · ✓ chat cargado, chips visibles');

    // ── 2. CHIP "CANCELAR O REAGENDAR" ──────────────────────────
    console.log('▸ Paso 2: tocar chip "Cancelar o reagendar"');
    await clickChipByText(page, 'cancelar');
    await page.waitForFunction(
      () => {
        const last = [...document.querySelectorAll('.bubble.admin')].pop();
        return last && /código|codigo/i.test(last.textContent);
      },
      { timeout: 6000 },
    );
    console.log('  · ✓ bot pide código');

    // ── 3. INGRESAR CÓDIGO ──────────────────────────────────────
    console.log(`▸ Paso 3: ingresar código "${citaTest.codigo}"`);
    await page.click('#msgInput');
    await page.type('#msgInput', citaTest.codigo, { delay: 40 });
    await page.click('#sendBtn');

    // Esperar a que el bot muestre la cita con chips de acción
    await waitChipByText(page, '❌ Cancelar', 10000);
    const detalleBot = await lastBotBubbleText(page);
    if (!/Test E2E Corte/.test(detalleBot)) {
      throw new Error(`El bot no muestra el servicio. Texto: "${detalleBot.slice(0, 200)}"`);
    }
    if (!new RegExp(citaTest.hora).test(detalleBot)) {
      throw new Error(`El bot no muestra la hora. Texto: "${detalleBot.slice(0, 200)}"`);
    }
    console.log('  · ✓ bot muestra detalle de la cita (servicio + hora)');

    // ── 4. TOCAR "CANCELAR" ─────────────────────────────────────
    console.log('▸ Paso 4: tocar chip "❌ Cancelar"');
    await clickChipByText(page, '❌ cancelar');
    await waitChipByText(page, 'sí, cancelar', 6000);
    console.log('  · ✓ bot pide confirmación');

    // ── 5. CONFIRMAR "SÍ, CANCELAR" ─────────────────────────────
    console.log('▸ Paso 5: confirmar "Sí, cancelar"');
    await clickChipByText(page, 'sí, cancelar');

    // Esperar mensaje final del bot (Listo / cancelada / ✓)
    await page.waitForFunction(
      () => {
        const bots = [...document.querySelectorAll('.bubble.admin')];
        const last = bots[bots.length - 1]?.textContent || '';
        return /(listo|cancelad|✓)/i.test(last);
      },
      { timeout: 12000 },
    );
    const finalBot = await lastBotBubbleText(page);
    console.log(`  · ✓ bot confirma: "${finalBot.slice(0, 80)}..."`);

    // ── 6. VERIFICAR EN FIRESTORE ───────────────────────────────
    console.log('▸ Paso 6: verificar estado en Firestore');
    await wait(800); // colchón por escritura asíncrona
    const finalCita = await readCita(TENANT, citaTest.id);
    if (!finalCita) {
      throw new Error('La cita desapareció de Firestore (no debería).');
    }
    if (finalCita.estado !== 'Cancelada') {
      throw new Error(`estado esperado "Cancelada", obtenido "${finalCita.estado}"`);
    }
    if (finalCita.canceladaVia !== 'cliente_chat') {
      throw new Error(`canceladaVia esperado "cliente_chat", obtenido "${finalCita.canceladaVia}"`);
    }
    if (!finalCita.canceladaAt) {
      throw new Error('canceladaAt no fue seteado por la function');
    }
    console.log('  · ✓ Firestore: estado=Cancelada, canceladaVia=cliente_chat, canceladaAt=ok');

    pass = true;
  } catch (err) {
    errMsg = err.message;
    if (page.__lastError) errMsg += `  | pageerror: ${page.__lastError}`;
    if (page.__lastConsoleError) errMsg += `  | console.error: ${page.__lastConsoleError}`;
    const shot = await screenshotOnFail(page, `e2e_cancel_${Date.now()}`);
    if (shot) console.log(`\n  └ screenshot: ${shot}`);
  } finally {
    // ── CLEANUP (siempre, aunque haya falla) ───────────────────
    console.log('\n▸ Cleanup: eliminando cita de prueba');
    await deleteCita(TENANT, citaTest.id);
    console.log(`  · cita ${citaTest.id} eliminada`);
    await browser.close();
  }

  const total = Date.now() - start;
  console.log('\n' + '═'.repeat(64));
  if (pass) {
    console.log(`✓ E2E PASS · ${(total / 1000).toFixed(1)}s`);
  } else {
    console.log(`✗ E2E FAIL · ${(total / 1000).toFixed(1)}s`);
    console.log(`  └ ${errMsg}`);
  }
  console.log('═'.repeat(64) + '\n');

  process.exit(pass ? 0 : 1);
}

runE2E().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
