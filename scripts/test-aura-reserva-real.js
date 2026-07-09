/**
 * E2E real: reserva completa desde /chiky-barber, elige "Por Google"
 * en el modal Aura, confirma, y verifica en Firestore que la cita
 * tiene origenAdquisicion. Deja la cita en Firestore para que Ignacio
 * la vea en /gestion-interna/aura.
 */
const { chromium } = require('playwright');
const path = require('path');

async function main() {
  const url = 'https://aurasalon.synaptechspa.cl/chiky-barber';
  console.log('\n═══ E2E AURA — reserva real ═══');
  console.log('  URL:', url);

  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 400, height: 900 } });

  page.on('console', m => {
    const t = m.text();
    if (/aura|origen|barbero|hook/i.test(t)) console.log('  [browser]', t);
  });
  page.on('pageerror', err => console.log('  [pageerror]', err.message));

  const TAG = 'QA MODAL AURA ' + new Date().toISOString().slice(11, 19);
  const TEL = '56900000042';
  console.log('  Tag:', TAG);
  console.log('');

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  async function closeBlockingModals() {
    await page.evaluate(() => {
      ['clubInviteModal', 'clubModal', 'auraClubModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) {
          el.classList.add('hidden');
          el.style.display = 'none';
        }
      });
    });
  }

  // ── Step 1: seleccionar primer servicio ──
  console.log('── Step 1: seleccionar servicio ──');
  await closeBlockingModals();
  await page.waitForSelector('.svc-card', { timeout: 15000 });
  const svcCount = await page.locator('.svc-card').count();
  console.log('  Servicios detectados:', svcCount);
  // Preferir cards con onclick (evita headers/labels)
  const svcInfo = await page.evaluate(() => {
    const cards = document.querySelectorAll('.svc-card');
    for (const c of cards) {
      const onclick = c.getAttribute('onclick');
      if (onclick && onclick.includes('selectService')) {
        c.click();
        return { onclick, sel: !!window._selectedService };
      }
    }
    return { onclick: null, sel: false };
  });
  console.log('  Servicio seleccionado onclick:', svcInfo.onclick?.slice(0, 60));
  await page.waitForTimeout(600);
  const svcState = await page.evaluate(() => ({ selected: !!window._selectedService, name: window._selectedService?.nombre }));
  console.log('  _selectedService:', svcState);

  await closeBlockingModals();
  console.log('  Click Continuar → Step 2');
  await page.locator('#btnContinue').click({ force: true });
  await page.waitForTimeout(5000);
  const stepNow = await page.evaluate(() => ({
    step: window.currentStep,
    calVis: !document.getElementById('step2')?.classList.contains('hidden'),
    calHtml: document.getElementById('calendarCarousel')?.innerHTML.length,
  }));
  console.log('  Estado tras continuar:', JSON.stringify(stepNow));

  // ── Step 2: seleccionar hora ──
  console.log('\n── Step 2: seleccionar fecha con disponibilidad ──');
  await closeBlockingModals();

  // Esperar que el calendario cargue días
  await page.waitForFunction(
    () => document.querySelectorAll('#calendarCarousel button.day-btn[data-date]').length > 0,
    { timeout: 25000 },
  ).catch(() => {});

  // Diagnóstico
  const cal = await page.evaluate(() => {
    const el = document.getElementById('calendarCarousel');
    return { exists: !!el, htmlLen: el?.innerHTML.length || 0, dayCount: el?.querySelectorAll('button.day-btn').length || 0 };
  });
  console.log('  calendarCarousel:', JSON.stringify(cal));

  // Iterar días del calendario buscando uno con horas
  let selected = null;
  for (let intento = 0; intento < 10 && !selected; intento++) {
    // Listar días disponibles
    const dias = await page.evaluate(() => {
      const cells = document.querySelectorAll('#calendarCarousel button.day-btn[data-date]');
      return Array.from(cells).map((c, i) => ({
        i,
        date: c.dataset.date || c.getAttribute('data-date') || null,
        text: c.textContent?.trim().slice(0, 12) || '',
        disabled: c.disabled || c.classList.contains('disabled') || c.classList.contains('past'),
      })).filter(d => !d.disabled);
    });
    console.log('  Intento', intento, '· dias disponibles:', dias.length);

    if (dias.length === 0) break;
    const dia = dias[intento] || dias[0];
    console.log('  → probando día:', dia.text || dia.date);

    // Click ese día
    await page.evaluate(idx => {
      const cells = document.querySelectorAll('#calendarCarousel button.day-btn[data-date]');
      const enabled = Array.from(cells).filter(c => !c.disabled && !c.classList.contains('disabled') && !c.classList.contains('past'));
      enabled[idx]?.click();
    }, intento);

    await page.waitForTimeout(2000);

    // Ver horas disponibles
    const horaClicked = await page.evaluate(() => {
      const slots = document.querySelectorAll('.time-pill, .time-slot, button[data-hora]');
      const disponibles = Array.from(slots).filter(s => {
        const style = window.getComputedStyle(s);
        return !s.disabled && !s.classList.contains('disabled') && !s.classList.contains('unavailable') && parseFloat(style.opacity) > 0.5;
      });
      if (disponibles.length === 0) return { total: slots.length, disp: 0 };
      disponibles[0].click();
      return { total: slots.length, disp: disponibles.length, hora: disponibles[0].textContent?.trim() };
    });
    console.log('    horas: total=' + horaClicked.total + ' disponibles=' + horaClicked.disp);
    if (horaClicked.hora) {
      selected = horaClicked.hora;
      console.log('    ✓ hora seleccionada:', selected);
    }
    await page.waitForTimeout(500);
  }

  if (!selected) {
    console.log('  ✗ No se encontró ningún día con horas disponibles');
    await browser.close();
    process.exit(1);
  }

  await closeBlockingModals();
  console.log('  Click Continuar → Step 3');
  await page.locator('#btnContinue').click({ force: true });
  await page.waitForTimeout(2500);

  // ── Step 3: llenar datos ──
  console.log('\n── Step 3: llenar datos ──');
  await closeBlockingModals();
  await page.waitForSelector('#clientName', { timeout: 10000, state: 'visible' });
  await page.locator('#clientName').fill(TAG);
  await page.locator('#clientPhone').fill(TEL);
  const emailInput = page.locator('#clientEmail').first();
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill('qa-modal-aura@test.com');
  }
  await page.waitForTimeout(600);

  await closeBlockingModals();
  console.log('  Click Confirmar reserva → dispara modal Aura');
  await page.locator('#btnContinue').click({ force: true });

  // ── Modal Aura ──
  console.log('\n── Modal Aura ──');
  await page.waitForSelector('#auraOrigenModal', { timeout: 10000 });
  await page.waitForFunction(
    () => !document.getElementById('auraOrigenModal')?.classList.contains('hidden'),
    { timeout: 8000 }
  );
  const opciones = await page.locator('.aura-origen-opt').count();
  console.log('  Modal visible con', opciones, 'opciones');

  // Elegir "Por Google"
  await page.locator('.aura-origen-opt[data-opcion-id="google"]').click();
  await page.waitForTimeout(500);
  console.log('  ✓ Selección: Por Google');

  // Confirmar
  await page.locator('#auraOrigenConfirmar').click();
  console.log('  ✓ Click "Confirmar y reservar"');

  // Esperar success
  await page.waitForTimeout(6000);

  const successVisible = await page.evaluate(() => {
    const s = document.getElementById('success-state');
    return s && !s.classList.contains('hidden');
  });
  console.log('  Success state:', successVisible ? '✓ visible' : '⚠ no visible aún');

  await browser.close();

  // ── Verificar en Firestore ──
  console.log('\n── Verificar Firestore ──');
  const admin = require('firebase-admin');
  admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(__dirname, '..', 'service-account.json'))) });
  const db = admin.firestore();

  // Wait un poco por si el write es async
  await new Promise(r => setTimeout(r, 2000));

  const snap = await db.collection('tenants/aura/citas')
    .where('clienteNombre', '==', TAG).get();

  if (snap.empty) {
    console.log('  ✗ NO se encontró cita con nombre "' + TAG + '"');
    process.exit(1);
  }

  console.log('  ✓ Encontradas', snap.size, 'cita(s) con nombre "' + TAG + '"');
  for (const d of snap.docs) {
    const c = d.data();
    console.log('\n  ═══ Cita creada en Firestore ═══');
    console.log('  ID:                 ', d.id);
    console.log('  fecha:              ', c.fecha, 'hora:', c.hora);
    console.log('  clienteNombre:      ', c.clienteNombre);
    console.log('  barbero:            ', c.barbero);
    console.log('  servicioNombre:     ', c.servicioNombre);
    console.log('  origen:             ', c.origen);
    console.log('  origenAdquisicion:  ', JSON.stringify(c.origenAdquisicion));
    console.log('  creadoEn:           ', c.creadoEn?.toDate?.().toISOString?.());
  }

  const cita = snap.docs[0].data();
  const ok = cita.origenAdquisicion?.id === 'google';
  console.log('\n═══ VEREDICTO ═══');
  if (ok) {
    console.log('  ✅ ÉXITO — Cita creada con origenAdquisicion.id = "google"');
    console.log('  ➜ Aparecerá en /gestion-interna/aura (tab Resultados, período 7d).');
    console.log('  ➜ Deja la cita en Firestore para que la veas en el panel.');
  } else {
    console.log('  ❌ FALLO — origenAdquisicion no se guardó como se esperaba.');
  }
  console.log('');
  process.exit(ok ? 0 : 1);
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
