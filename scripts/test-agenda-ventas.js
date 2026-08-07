'use strict';

// scripts/test-agenda-ventas.js
// ─────────────────────────────────────────────────────────────────────────────
//  Guard de la agenda propia de Ignacio (evolution/ventas-agenda.js).
//
//  Es la agenda que reservan DE VERDAD los bots de ventas de WhatsApp e
//  Instagram: si el candado transaccional se rompe, dos leads quedan citados a
//  la misma hora y el choque se descubre en el Meet, delante del cliente.
//
//  Corre contra el emulador de Firestore (transacciones reales, no mocks):
//    npm run test:agenda-ventas
//  → firebase emulators:exec --only firestore "node scripts/test-agenda-ventas.js"
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const FUNCTIONS = path.join(__dirname, '..', 'functions');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('✗ Este test necesita el emulador (usa: npm run test:agenda-ventas).');
  process.exit(1);
}

// admin resuelto desde functions/ para compartir la instancia con el módulo
// (dos copias = dos registros de apps; mismo patrón que check-bot-prompt.js).
const admin = require(require.resolve('firebase-admin', { paths: [FUNCTIONS] }));
admin.initializeApp({ projectId: 'demo-agenda-ventas' });
const db = admin.firestore();

const agenda = require(path.join(FUNCTIONS, 'evolution', 'ventas-agenda.js'));
const { _ahoraChile: ahoraChile } = require(path.join(FUNCTIONS, 'chat-horas-disponibles.js'));
const { conDiaSemana } = require(path.join(FUNCTIONS, 'lib', 'calendario.js'));

let fallos = 0;
const ok = (nombre, cond, extra) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${nombre}${cond ? '' : `  → ${extra}`}`);
  if (!cond) fallos++;
};

/** Primer día hábil (según defaults lun–vie) al menos 2 días en el futuro:
 *  lejos del corte de antelación, para que el test no dependa de la hora. */
function diaHabilFuturo() {
  const hoy = ahoraChile().fecha;
  for (let i = 2; i < 10; i++) {
    const x = conDiaSemana(hoy, i);
    const dow = agenda._dowDe(x.fecha);
    if (dow >= 1 && dow <= 5) return x.fecha;
  }
  throw new Error('no encontré día hábil');
}

(async () => {
  console.log('\n🧮 Helpers puros');
  ok('dowDe: 2026-08-10 es lunes', agenda._dowDe('2026-08-10') === 1, String(agenda._dowDe('2026-08-10')));
  ok('lockIdDe normaliza la hora', agenda._lockIdDe('2026-08-10', '10:30') === '2026-08-10_1030', agenda._lockIdDe('2026-08-10', '10:30'));

  console.log('\n⚙️  Config con defaults (doc inexistente)');
  const cfg = await agenda.leerCfgAgenda();
  ok('activo por defecto', cfg.activo === true);
  ok('30 min por reunión', cfg.duracionMin === 30, String(cfg.duracionMin));
  ok('lunes 10:00–19:00', JSON.stringify(cfg.horario[1]) === JSON.stringify(['10:00', '19:00']), JSON.stringify(cfg.horario[1]));
  ok('domingo libre', cfg.horario[0] === null, JSON.stringify(cfg.horario[0]));
  const lun = agenda._slotsJornada(cfg, '2026-08-10');
  ok('jornada del lunes: 18 bloques de 10:00 a 18:30', lun.length === 18 && lun[0] === '10:00' && lun[lun.length - 1] === '18:30', JSON.stringify(lun));
  ok('sábado sin bloques', agenda._slotsJornada(cfg, '2026-08-08').length === 0);

  const fecha = diaHabilFuturo();
  const hab = conDiaSemana(fecha).hablada;
  console.log(`\n📅 Reservas reales (emulador) — usando el ${hab} (${fecha})`);

  const disp0 = await agenda.disponibilidad({ soloFecha: fecha });
  ok('día hábil futuro: toda la jornada libre', disp0[0].horas.length === 18, String(disp0[0].horas.length));

  // 1. Agendar toma el candado.
  const r1 = await agenda.agendarReunion({
    contacto: '56911111111', canal: 'ventas', fecha, hora: '10:30',
    datos: { nombre: 'Marta', negocio: 'Salón Prueba' },
  });
  ok('agendar responde ok con la forma hablada', r1.ok === true && r1.cuando === `${hab} a las 10:30`, JSON.stringify(r1));
  const lock1 = await db.doc(`ventas_agenda_locks/${fecha}_1030`).get();
  ok('el candado existe y es de la reunión', lock1.exists && lock1.data().reunionId === '56911111111', JSON.stringify(lock1.data() || null));
  const lead1 = (await db.doc('wa_ventas_leads/56911111111').get()).data() || {};
  ok('el lead quedó confirmado con su hora real', lead1.estado === 'confirmada' && lead1.reunionFecha === fecha && lead1.reunionHora === '10:30', JSON.stringify(lead1));

  // 2. Otro lead pide LA MISMA hora → el candado lo rebota.
  const r2 = await agenda.agendarReunion({ contacto: 'ig_222', canal: 'instagram', fecha, hora: '10:30', datos: {} });
  ok('doble reserva rebotada por el candado', r2.ok === false && /tomó esa hora|tomaron/i.test(r2.motivo || ''), JSON.stringify(r2));

  // 3. El lead de Instagram toma otra hora (mismo id de contacto que el lead).
  const r3 = await agenda.agendarReunion({ contacto: 'ig_222', canal: 'instagram', fecha, hora: '11:00', datos: { nombre: 'Pau' } });
  ok('Instagram reserva con contacto ig_*', r3.ok === true, JSON.stringify(r3));

  // 4. Reagendo: mueve la reunión y suelta el candado viejo EN el mismo commit.
  const r4 = await agenda.agendarReunion({ contacto: '56911111111', canal: 'ventas', fecha, hora: '15:00', datos: {} });
  const viejo = await db.doc(`ventas_agenda_locks/${fecha}_1030`).get();
  const nuevo = await db.doc(`ventas_agenda_locks/${fecha}_1500`).get();
  ok('reagendar marca reagendada', r4.ok === true && r4.reagendada === true, JSON.stringify(r4));
  ok('el candado viejo quedó libre', !viejo.exists);
  ok('el candado nuevo existe', nuevo.exists && nuevo.data().reunionId === '56911111111');
  const run4 = (await db.doc('ventas_reuniones/56911111111').get()).data() || {};
  ok('el reagendo sin datos NO borró el nombre', run4.nombre === 'Marta', JSON.stringify(run4.nombre));

  // 5. La disponibilidad refleja los candados.
  const disp1 = await agenda.disponibilidad({ soloFecha: fecha });
  ok('las horas tomadas ya no se ofrecen',
    !disp1[0].horas.includes('15:00') && !disp1[0].horas.includes('11:00') && disp1[0].horas.includes('10:30'),
    JSON.stringify(disp1[0].horas));

  // 6. Cancelar libera el candado y devuelve el lead a solicitado.
  const r6 = await agenda.cancelarReunion({ contacto: '56911111111', motivo: 'se arrepintió' });
  const lockC = await db.doc(`ventas_agenda_locks/${fecha}_1500`).get();
  const leadC = (await db.doc('wa_ventas_leads/56911111111').get()).data() || {};
  ok('cancelar responde ok', r6.ok === true, JSON.stringify(r6));
  ok('el candado quedó libre al cancelar', !lockC.exists);
  ok('el lead volvió a reunion_solicitada sin hora', leadC.estado === 'reunion_solicitada' && !leadC.reunionFecha, JSON.stringify(leadC));
  const r6b = await agenda.cancelarReunion({ contacto: '56911111111' });
  ok('cancelar dos veces avisa que no hay reunión', r6b.ok === false, JSON.stringify(r6b));

  // 7. Validaciones masticadas para el modelo.
  const ayer = conDiaSemana(ahoraChile().fecha, -1).fecha;
  const rPas = await agenda.agendarReunion({ contacto: '56933333333', canal: 'ventas', fecha: ayer, hora: '10:00', datos: {} });
  ok('fecha pasada rebotada con motivo', rPas.ok === false && /pasó/.test(rPas.motivo || ''), JSON.stringify(rPas));
  const rFor = await agenda.agendarReunion({ contacto: '56933333333', canal: 'ventas', fecha, hora: '10:17', datos: {} });
  ok('hora fuera de la grilla rebotada', rFor.ok === false && /no calzan/.test(rFor.motivo || ''), JSON.stringify(rFor));
  const dom = (() => { const h = ahoraChile().fecha; for (let i = 2; i < 10; i++) { const x = conDiaSemana(h, i); if (agenda._dowDe(x.fecha) === 0) return x.fecha; } })();
  const rDom = await agenda.agendarReunion({ contacto: '56933333333', canal: 'ventas', fecha: dom, hora: '10:00', datos: {} });
  ok('día sin jornada rebotado', rDom.ok === false && /no tiene agenda/.test(rDom.motivo || ''), JSON.stringify(rDom));

  // 8. Agenda pausada → el bot degrada a registrar_reunion.
  await db.doc('_system/ventas_agenda').set({ activo: false }, { merge: true });
  const rOff = await agenda.agendarReunion({ contacto: '56944444444', canal: 'ventas', fecha, hora: '12:00', datos: {} });
  ok('agenda pausada rebota con instrucción de fallback', rOff.ok === false && /registrar_reunion/.test(rOff.motivo || ''), JSON.stringify(rOff));

  console.log(fallos === 0
    ? '\n✅ Agenda de ventas sana: candados, reagendo, cancelación y validaciones.\n'
    : `\n❌ ${fallos} problema(s) en la agenda de ventas.\n`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error('✗ Test reventó:', e); process.exit(1); });
