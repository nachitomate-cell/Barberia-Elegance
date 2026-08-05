#!/usr/bin/env node
/**
 * test-jornada-medianoche.js — que cerrar a medianoche no borre el día.
 *
 * En el panel, "cierro a las 12 de la noche" se guarda como fin: "00:00".
 * Leído con toMins a secas eso es el MINUTO CERO, así que la jornada queda
 * invertida (08:00 → 00:00) y `rangosFueraDeJornada` empuja [0,1440]: el día
 * entero fuera de jornada. `atiendeEseDia` interpreta eso como día libre.
 *
 * Estudio Luxury tenía a Matías —su ÚNICO profesional— con 08:00–00:00 los
 * siete días. El bot llevaba desde su alta respondiendo "no hay horas" todos
 * los días, y el auditor de citas marcaba sus reservas como imposibles.
 *
 * La web no lo mostraba porque su guard de "horario corrupto" lo reescribía en
 * silencio a 09:00–20:00: dos motores, dos respuestas distintas para el mismo
 * dato. Por eso el test cubre los dos.
 *
 * Uso:  npm run test:medianoche
 */
const path = require('path');
const FUNCS = path.join(__dirname, '..', 'functions');
const admin = require(require.resolve('firebase-admin', { paths: [FUNCS] }));
if (!admin.apps.length) admin.initializeApp({ projectId: 'test-medianoche' });

const { _rangosFueraDeJornada: fuera } = require('../functions/chat-horas-disponibles');

let fallos = 0;
const chk = (t, ok, det) => {
  if (ok) return console.log(`  ✓ ${t}`);
  fallos++; console.log(`  ✗ ${t}`); if (det) console.log(`      ${det}`);
};
const dia = (inicio, fin, extra = {}) => ({ 1: { activo: true, inicio, fin, ...extra } });
const tapaTodo = (r) => r.some(([a, b]) => a === 0 && b === 1440);
const cubre = (r, m) => r.some(([a, b]) => m >= a && m < b);

console.log('\n🌙 Jornadas que terminan a medianoche\n');

/* ── El caso de Estudio Luxury ── */
const luxury = fuera({ docHorario: dia('08:00', '00:00'), cfgPersonal: null, dow: 1 });
chk('08:00–00:00 NO es día libre', !tapaTodo(luxury), JSON.stringify(luxury));
chk('  …y a las 16:00 está trabajando', !cubre(luxury, 16 * 60), JSON.stringify(luxury));
chk('  …y a las 23:00 también', !cubre(luxury, 23 * 60), JSON.stringify(luxury));
chk('  …pero a las 07:00 no', cubre(luxury, 7 * 60));

/* ── Que el arreglo no ablande el día libre de verdad ── */
chk('activo:false sigue siendo día libre',
  tapaTodo(fuera({ docHorario: { 1: { activo: false, inicio: '08:00', fin: '00:00' } }, cfgPersonal: null, dow: 1 })));

chk('un día sin configurar sigue sin jornada propia',
  fuera({ docHorario: dia('08:00', '00:00'), cfgPersonal: null, dow: 3 }).length === 0);

/* ── Jornadas normales, intactas ── */
const normal = fuera({ docHorario: dia('11:00', '19:00'), cfgPersonal: null, dow: 1 });
chk('11:00–19:00 no cambia', cubre(normal, 10 * 60 + 45) && !cubre(normal, 12 * 60) && cubre(normal, 19 * 60));

chk('los descansos siguen bloqueando',
  cubre(fuera({ docHorario: dia('09:00', '00:00', { descansos: [{ inicio: '15:00', fin: '16:00' }] }), cfgPersonal: null, dow: 1 }), 15 * 60 + 30));

/* ── Jornada base personal (sin config del día) ── */
chk('horarioFin 00:00 en configuracion/main tampoco borra el día',
  !tapaTodo(fuera({ docHorario: null, cfgPersonal: { horarioInicio: '10:00', horarioFin: '00:00' }, dow: 2 })));

/* ── El mismo criterio en la web (firebaseUtils) ── */
const src = require('fs').readFileSync(path.join(__dirname, '..', 'firebaseUtils.js'), 'utf8');
chk('firebaseUtils declara toMinsFin', /const toMinsFin\s*=/.test(src));
chk('firebaseUtils no dejó ningún cierre leído con toMins',
  !/(?:fin|bFin)\s*=\s*toMins\(/.test(src),
  (src.match(/^.*(?:fin|bFin)\s*=\s*toMins\(.*$/gm) || []).join('\n      '));

if (fallos) { console.log(`\n❌ ${fallos} comprobación(es) fallaron.\n`); process.exit(1); }
console.log('\n✅ Cerrar a medianoche ya no equivale a no trabajar.\n');
process.exit(0);
