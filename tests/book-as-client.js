// book-as-client.js — Reserva una cita REAL desde el flujo público de
// booking (/?local=X) usando Puppeteer. Como pasa por el flujo normal,
// crea el doc en Firestore con el trigger `confirmacionCitaTenant` que
// envía el email automáticamente — sin necesidad de Admin SDK.

'use strict';

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

const EMAIL  = process.env.EMAIL  || 'ignaciiio.mate@gmail.com';
const NOMBRE = process.env.NOMBRE || 'Ignacio Test';
const TEL    = process.env.TEL    || '+56983568212';
const TENANT = process.env.TENANT || 'kronnos_penablanca';
const BASE   = process.env.BASE   || 'http://localhost:3000';
const HEADED = process.env.HEADED === '1';
const SLOWMO = Number(process.env.SLOWMO || 0);

const SCREEN_DIR = path.join(__dirname, 'screenshots');
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function screenshot(page, label) {
  if (!fs.existsSync(SCREEN_DIR)) fs.mkdirSync(SCREEN_DIR, { recursive: true });
  const file = path.join(SCREEN_DIR, `book_${Date.now()}_${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

(async () => {
  console.log('\n' + '═'.repeat(64));
  console.log('Reserva REAL via flujo público');
  console.log('═'.repeat(64));
  console.log(`Tenant: ${TENANT} | Email: ${EMAIL} | Nombre: ${NOMBRE}`);
  console.log('═'.repeat(64) + '\n');

  const browser = await puppeteer.launch({
    headless: HEADED ? false : 'new',
    slowMo: SLOWMO,
    defaultViewport: { width: 412, height: 915, isMobile: true, hasTouch: true },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('pageerror', (err) => console.log(`  [pageerror] ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`  [console.error] ${msg.text()}`);
  });

  try {
    console.log('▸ Paso 1: abrir página del local');
    await page.goto(`${BASE}/?local=${TENANT}`, { waitUntil: 'domcontentloaded' });
    await wait(3500);  // espera carga de servicios desde Firestore
    await screenshot(page, '1_home');

    // ── Paso 2: seleccionar un servicio ─────────────────────────
    console.log('▸ Paso 2: seleccionar servicio');
    const svcClicked = await page.evaluate(() => {
      const candidates = [
        ...document.querySelectorAll('.service-option, [data-service-id], .svc-radio, [class*="service"]'),
      ].filter(el => el.offsetParent !== null);
      if (!candidates.length) return null;
      const t = candidates[0];
      const r = t.getBoundingClientRect();
      t.click();
      return { text: t.textContent.trim().slice(0, 60), rect: { x: r.x, y: r.y, w: r.width } };
    });
    if (!svcClicked) {
      await screenshot(page, '2_no_services');
      throw new Error('No encontré ningún servicio. Verificá que kronnos_penablanca tenga servicios cargados.');
    }
    console.log(`  · servicio: "${svcClicked.text}"`);
    await wait(900);

    // Click en "Continuar"
    console.log('▸ Paso 3: continuar a barbero');
    let continued = await page.evaluate(() => {
      const btn = document.getElementById('btnContinue');
      if (btn && !btn.disabled) { btn.click(); return true; }
      return false;
    });
    if (!continued) {
      await screenshot(page, '3_no_continue');
      throw new Error('Botón "Continuar" no disponible tras elegir servicio.');
    }
    await wait(1200);

    // ── Paso 4: seleccionar barbero ─────────────────────────────
    console.log('▸ Paso 4: seleccionar barbero');
    const barberoClicked = await page.evaluate(() => {
      const candidates = [
        ...document.querySelectorAll('.barber-option, [data-barbero-id], .barber-radio, [class*="barber"]'),
      ].filter(el => el.offsetParent !== null);
      if (!candidates.length) return null;
      candidates[0].click();
      return candidates[0].textContent.trim().slice(0, 60);
    });
    if (!barberoClicked) {
      await screenshot(page, '4_no_barbero');
      throw new Error('No encontré barberos disponibles.');
    }
    console.log(`  · barbero: "${barberoClicked}"`);
    await wait(900);

    continued = await page.evaluate(() => {
      const btn = document.getElementById('btnContinue');
      if (btn && !btn.disabled) { btn.click(); return true; }
      return false;
    });
    if (!continued) throw new Error('Botón "Continuar" no disponible tras elegir barbero.');
    await wait(1500);

    // ── Paso 5: seleccionar fecha y hora ────────────────────────
    console.log('▸ Paso 5: seleccionar primer slot disponible');
    // El calendario suele estar activo por defecto en el día siguiente
    // Buscamos el primer botón de día seleccionable y luego una hora.
    await wait(600);
    // Click en primera hora disponible (.time-pill o similar)
    const horaClicked = await page.evaluate(() => {
      const candidates = [
        ...document.querySelectorAll('.time-pill, [data-time], [class*="time"]:not([disabled])'),
      ].filter(el => el.offsetParent !== null && !el.classList.contains('disabled') && !el.disabled);
      if (!candidates.length) return null;
      candidates[0].click();
      return candidates[0].textContent.trim().slice(0, 30);
    });
    if (!horaClicked) {
      await screenshot(page, '5_no_hora');
      throw new Error('No encontré horas disponibles para hoy/mañana.');
    }
    console.log(`  · hora: "${horaClicked}"`);
    await wait(900);

    continued = await page.evaluate(() => {
      const btn = document.getElementById('btnContinue');
      if (btn && !btn.disabled) { btn.click(); return true; }
      return false;
    });
    if (!continued) {
      await screenshot(page, '5b_no_continue');
      throw new Error('Botón "Continuar" no disponible tras elegir hora.');
    }
    await wait(1500);

    // ── Paso 6: llenar datos personales ─────────────────────────
    console.log('▸ Paso 6: llenar datos personales');
    await screenshot(page, '6_form');

    // Llenar inputs por ORDEN DOM (más robusto que selectores nombrados).
    // El form de Kronnos tiene 3 inputs en orden: nombre, teléfono, email.
    const filled = await page.evaluate(({ nombre, email, tel }) => {
      const setVal = (el, val) => {
        if (!el) return false;
        el.focus();
        // Disparar como si fuera typing real para que el react-style state
        // funcione (algunos forms tienen handlers en input/change).
        const proto = Object.getPrototypeOf(el);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
        return true;
      };
      // Detectar inputs del paso 4 visibles que NO son de Club login
      const all = [...document.querySelectorAll('input')]
        .filter(el => el.offsetParent !== null && el.type !== 'hidden'
                   && el.type !== 'submit' && el.type !== 'button'
                   && el.type !== 'checkbox' && el.type !== 'radio');
      // Heurística: orden DOM = nombre, tel, email
      // Filtrar inputs que parezcan de Club (placeholder con "contraseña" o email/pass para login)
      const formInputs = all.filter(el => {
        const ph = (el.placeholder || '').toLowerCase();
        return !ph.includes('contraseña') && !ph.includes('password');
      });
      const result = { count: formInputs.length, values: [] };
      // Mapear por posición o por type/placeholder
      let nameEl = null, telEl = null, emailEl = null;
      for (const el of formInputs) {
        const ph   = (el.placeholder || '').toLowerCase();
        const type = (el.type || '').toLowerCase();
        const lbl  = (el.id || el.name || '').toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        const combo = ph + ' ' + lbl + ' ' + aria;
        if (!emailEl && (type === 'email' || /correo|email/.test(combo))) emailEl = el;
        else if (!telEl && (type === 'tel' || /tel[eé]fono|móvil|movil|wha?ts/.test(combo))) telEl = el;
        else if (!nameEl && /nombre/.test(combo)) nameEl = el;
      }
      // Fallback por orden DOM si no se detectaron
      if (!nameEl)  nameEl  = formInputs[0];
      if (!telEl)   telEl   = formInputs.find(e => e !== nameEl && e !== emailEl);
      if (!emailEl) emailEl = formInputs.find(e => e !== nameEl && e !== telEl);

      result.nombre = setVal(nameEl, nombre);
      result.tel    = setVal(telEl, tel);
      result.email  = setVal(emailEl, email);
      result.values = formInputs.map(e => ({ id: e.id, name: e.name, type: e.type, placeholder: e.placeholder, value: e.value }));
      return result;
    }, { nombre: NOMBRE, email: EMAIL, tel: TEL });
    console.log(`  · campos llenados: ${filled.count} inputs detectados | nombre=${filled.nombre}, tel=${filled.tel}, email=${filled.email}`);
    console.log('  · valores finales:', JSON.stringify(filled.values, null, 2));
    await wait(600);
    await screenshot(page, '7_form_filled');

    // ── Paso 7: confirmar reserva ───────────────────────────────
    console.log('▸ Paso 7: confirmar reserva');
    const confirmed = await page.evaluate(() => {
      const btn = document.getElementById('btnContinue');
      if (btn && !btn.disabled) { btn.click(); return true; }
      // Fallback: buscar botón con texto "confirmar" / "reservar"
      const candidates = [...document.querySelectorAll('button, a')]
        .filter(b => /confirmar|reservar|agendar|finalizar/i.test(b.textContent) && b.offsetParent !== null);
      if (candidates.length) { candidates[0].click(); return true; }
      return false;
    });
    if (!confirmed) throw new Error('No pude clicar el botón final de confirmación.');
    console.log('  · click en confirmar');
    await wait(5000);  // espera escritura + trigger
    await screenshot(page, '8_after_confirm');

    // ── Paso 8: verificar pantalla de éxito ─────────────────────
    const successText = await page.evaluate(() => {
      const sel = ['#success-state', '[class*="success"]', '[class*="confirmacion"]'].join(',');
      const el = document.querySelector(sel);
      if (!el || el.offsetParent === null) return null;
      return el.textContent.replace(/\s+/g, ' ').trim().slice(0, 200);
    });

    if (successText) {
      console.log(`  · ✓ pantalla de éxito: "${successText.slice(0, 100)}..."`);
    } else {
      console.log('  ⚠ no detecté pantalla de éxito explícita. Revisar screenshot 8.');
    }

    console.log('\n' + '═'.repeat(64));
    console.log('✓ RESERVA ENVIADA');
    console.log('═'.repeat(64));
    console.log('\nℹ El trigger confirmacionCitaTenant debería enviar el email a:');
    console.log(`  ${EMAIL}`);
    console.log(`\nℹ Revisalo en tu inbox en 30s–1min (puede ir a Spam la 1ra vez).`);
    console.log(`ℹ Screenshots del flujo guardados en: tests/screenshots/`);
    console.log('');

    await browser.close();
    process.exit(0);

  } catch (err) {
    console.error('\n✗ Falló:', err.message);
    await screenshot(page, 'FAIL').catch(() => null);
    await browser.close();
    process.exit(1);
  }
})();
