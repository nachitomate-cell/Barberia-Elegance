/**
 * Test funcional del hook Aura sin pasar por el wizard.
 * Va a la página, invoca la misma función que llama el hook antes
 * de FDB.addCita, y verifica que devuelva el objeto correcto.
 * Simula el mismo entorno que un usuario real haciendo reserva.
 */
const { chromium } = require('playwright');

(async () => {
  const url = 'https://aurasalon.synaptechspa.cl/chiky-barber';
  console.log('\n═══ Test hook aura funcional ═══');
  console.log('  URL:', url, '\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  page.on('console', m => {
    const t = m.text();
    if (/aura|origen/i.test(t)) consoleLogs.push(t);
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  console.log('── Console logs relevantes al cargar ──');
  consoleLogs.forEach(l => console.log('  ', l));

  console.log('\n── Estado inicial ──');
  const preState = await page.evaluate(() => ({
    tenant: window.CURRENT_TENANT_ID,
    hasFn:  typeof window.askAuraOrigenSiCorresponde,
    modal:  !!document.getElementById('auraOrigenModal'),
    ready:  document.body?.getAttribute('data-aura-modal-ready'),
  }));
  console.log('  ', JSON.stringify(preState, null, 2));

  console.log('\n── Simular flujo: invocar hook + elegir "Por Google" + confirmar ──');
  const result = await page.evaluate(async () => {
    if (typeof window.askAuraOrigenSiCorresponde !== 'function') {
      return { error: 'hook function no existe' };
    }
    // Dispara el modal
    const p = window.askAuraOrigenSiCorresponde();
    // Esperar a que aparezca
    await new Promise(r => setTimeout(r, 800));
    const modal = document.getElementById('auraOrigenModal');
    if (!modal || modal.classList.contains('hidden')) {
      return { error: 'modal no aparecio', hasModal: !!modal, classes: modal?.className };
    }
    // Elegir Google
    const googleBtn = document.querySelector('[data-opcion-id="google"]');
    if (!googleBtn) return { error: 'boton google no existe', opciones: document.querySelectorAll('.aura-origen-opt').length };
    googleBtn.click();
    await new Promise(r => setTimeout(r, 300));
    // Confirmar
    const confirmBtn = document.getElementById('auraOrigenConfirmar');
    if (!confirmBtn || confirmBtn.disabled) return { error: 'confirmar disabled' };
    confirmBtn.click();
    // Esperar resultado (max 3s)
    const value = await Promise.race([
      p,
      new Promise(r => setTimeout(() => r('TIMEOUT'), 3000)),
    ]);
    return { ok: true, value };
  });

  console.log('  Resultado:', JSON.stringify(result, null, 2));

  console.log('\n── Console logs finales ──');
  consoleLogs.forEach(l => console.log('  ', l));

  await browser.close();

  const success = result.ok && result.value?.id === 'google';
  console.log('\n═══ VEREDICTO ═══');
  if (success) {
    console.log('  ✅ Hook funciona en produccion.');
    console.log('     Al elegir "Por Google" el hook devuelve el objeto correcto:');
    console.log('    ', JSON.stringify(result.value));
    console.log('     Cualquier reserva NUEVA guardara origenAdquisicion correctamente.');
  } else {
    console.log('  ❌ Hook falló. Detalle:', JSON.stringify(result));
  }
  console.log('');
  process.exit(success ? 0 : 1);
})();
