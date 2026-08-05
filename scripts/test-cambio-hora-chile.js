#!/usr/bin/env node
/**
 * test-cambio-hora-chile.js — que el cambio de hora no rompa la agenda.
 *
 * Chile adelanta el reloj el primer sábado de septiembre: el 05-09-2026 a
 * medianoche saltamos a las 01:00 del domingo 6. Ese domingo NO tiene la hora
 * 00:00–00:59, y el 4 de abril de 2027 pasa lo contrario: las 23:00 ocurren
 * dos veces.
 *
 * Es una fecha conocida que llega sola, y toda la agenda se apoya en
 * aritmética de fechas y minutos: `ahoraChile`, `absMin`, `sumarDias`, los
 * rangos de jornada. Un error acá no se ve hasta ese día, con clientes reales
 * y sin nadie mirando (es domingo de madrugada).
 *
 * Se prueba con fechas fijas, sin depender del reloj de la máquina.
 *
 * Uso:  npm run test:cambio-hora
 */
const path = require('path');
const FUNCS = path.join(__dirname, '..', 'functions');

// Los helpers de fecha son puros; se cargan sin tocar Firestore.
const admin = require(require.resolve('firebase-admin', { paths: [FUNCS] }));
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'test-cambio-hora' });   // sin credenciales: no se consulta nada
}
const { _ahoraChile: ahoraChile } = require('../functions/chat-horas-disponibles');

/* Réplicas EXACTAS de los helpers del cerebro: son una línea cada uno y no
   están exportados. Si alguno cambia allá y no acá, este test deja de medir
   lo que dice medir — por eso van con el comentario, no sueltos. */
const toMinsHHMM = (t) => { const [h, m] = String(t || '').split(':').map(Number); return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0); };
const absMin = (fecha, mins) => { const [y, mo, d] = String(fecha).split('-').map(Number); return Math.floor(Date.UTC(y, mo - 1, d) / 86400000) * 1440 + mins; };
const sumarDias = (fechaStr, n) => { const [y, m, d] = fechaStr.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const dowDe = (fechaStr) => { const [y, m, d] = fechaStr.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

let fallos = 0;
function chk(titulo, ok, detalle) {
  if (!ok) { fallos++; console.log(`  ✗ ${titulo}`); if (detalle) console.log(`      ${detalle}`); }
  else console.log(`  ✓ ${titulo}`);
}

console.log('\n🕐 Cambio de hora en Chile — 05/06-sep-2026 (adelanta) y 04-abr-2027 (atrasa)\n');

/* ── Sumar días a través del salto ── */
chk('el día del cambio no se salta ni se repite',
  sumarDias('2026-09-05', 1) === '2026-09-06' && sumarDias('2026-09-06', 1) === '2026-09-07',
  `sáb+1=${sumarDias('2026-09-05', 1)}  dom+1=${sumarDias('2026-09-06', 1)}`);

chk('y tampoco al atrasar el reloj (abr-2027)',
  sumarDias('2027-04-03', 1) === '2027-04-04' && sumarDias('2027-04-04', 1) === '2027-04-05',
  `sáb+1=${sumarDias('2027-04-03', 1)}  dom+1=${sumarDias('2027-04-04', 1)}`);

chk('una semana completa sobre el cambio no pierde días',
  Array.from({ length: 7 }, (_, i) => sumarDias('2026-09-02', i + 1)).join() ===
  ['2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09'].join());

/* ── Día de la semana ── */
chk('el domingo del cambio sigue siendo domingo',
  dowDe('2026-09-06') === 0 && dowDe('2026-09-05') === 6,
  `dow(06-sep)=${dowDe('2026-09-06')}  dow(05-sep)=${dowDe('2026-09-05')}`);

/* ── Distancia entre fechas: es lo que decide "ya pasó" y el mínimo de
      anticipación para cancelar o reagendar ── */
chk('sábado 23:00 → domingo 09:00 son 600 minutos, no 540 ni 660',
  absMin('2026-09-06', toMinsHHMM('09:00')) - absMin('2026-09-05', toMinsHHMM('23:00')) === 600,
  `salió ${absMin('2026-09-06', toMinsHHMM('09:00')) - absMin('2026-09-05', toMinsHHMM('23:00'))}`);

chk('una cita del domingo NO figura como pasada el sábado',
  absMin('2026-09-06', toMinsHHMM('10:00')) > absMin('2026-09-05', toMinsHHMM('23:59')));

chk('la hora que no existe (00:30 del domingo) no rompe la aritmética',
  Number.isFinite(absMin('2026-09-06', toMinsHHMM('00:30'))) &&
  absMin('2026-09-06', toMinsHHMM('00:30')) > absMin('2026-09-05', toMinsHHMM('23:30')));

/* ── El reloj real: viene de Intl con timeZone, que sí sabe de DST ── */
const a = ahoraChile();
chk('ahoraChile devuelve fecha, minutos y HH:MM coherentes',
  /^\d{4}-\d{2}-\d{2}$/.test(a.fecha) &&
  Number.isInteger(a.mins) && a.mins >= 0 && a.mins < 1440 &&
  /^\d{2}:\d{2}$/.test(a.hhmm) &&
  toMinsHHMM(a.hhmm) === a.mins,
  JSON.stringify(a));

chk('usa el huso de Chile, no el del servidor',
  (() => {
    const enChile = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    return a.fecha === enChile;
  })(), `ahoraChile=${a.fecha}`);

if (fallos) { console.log(`\n❌ ${fallos} comprobación(es) fallaron.\n`); process.exit(1); }
console.log('\n✅ Todo en orden — el cambio de hora no mueve fechas ni distancias.\n');
process.exit(0);
