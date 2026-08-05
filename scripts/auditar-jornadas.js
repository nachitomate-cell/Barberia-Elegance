#!/usr/bin/env node
/**
 * auditar-jornadas.js — jornadas sospechosamente cortas.
 *
 * En el editor de horario, la fila de la jornada y la del descanso se ven
 * casi iguales. Si el dueño escribe el descanso SIN pulsar antes "Añadir
 * descanso", esas horas caen en `inicio`/`fin` y el día entero se encoge a la
 * duración del descanso.
 *
 * Le pasó a Aura: Matiaz cutz quedó con jueves, viernes y sábado de 14:00 a
 * 15:00 —exactamente el descanso que sí tiene bien puesto los lunes y
 * miércoles—. El local abre 10:00–20:00. Nadie se dio cuenta: el panel no
 * avisa, la agenda dibuja la columna igual, y el cliente simplemente ve una
 * sola hora disponible y se va.
 *
 * Este chequeo compara la jornada de cada profesional contra la del LOCAL ese
 * día y marca las que se quedan en una fracción mínima. No decide por nadie:
 * una jornada corta puede ser real. Solo la saca a la luz.
 *
 * Solo lectura.
 *
 * Uso:  npm run check:jornadas
 *       node scripts/auditar-jornadas.js aura
 */
const path = require('path');
const FUNCS = path.join(__dirname, '..', 'functions');
const admin = require(require.resolve('firebase-admin', { paths: [FUNCS] }));
const key = require('../service-account.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

const ARG = process.argv[2] || 'ALL';
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const toMins = (t) => { const [h, m] = String(t || '').split(':').map(Number); return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0); };
const toMinsFin = (t) => { const m = toMins(t); return m === 0 ? 1440 : m; };

/* Umbrales: una jornada es sospechosa si dura 90 min o menos Y el local ese
   día abre al menos el cuádruple. Así no molesta a quien de verdad atiende
   dos horas, y sí caza el descanso-convertido-en-jornada. */
const MAX_SOSPECHOSA = 90;
const FACTOR_LOCAL   = 4;

(async () => {
  console.log('\n🔎 Jornadas sospechosamente cortas\n');
  const tenants = ARG === 'ALL'
    ? (await db.collection('tenants').listDocuments()).map(t => t.id)
    : [ARG];

  let malos = 0, afectados = 0;

  for (const tid of tenants) {
    const conf = await db.doc(`tenants/${tid}/configuracion/main`).get().catch(() => null);
    if (!conf || !conf.exists) continue;
    const c = conf.data() || {};
    const dc = c.diasConfig || {};
    const localDe = (dow) => {
      const d = dc[dow] ?? dc[String(dow)] ?? null;
      const ini = toMins((d && d.inicio) || c.horarioInicio || '09:00');
      const fin = toMinsFin((d && d.fin) || c.horarioFin || '20:00');
      return Math.max(0, fin - ini);
    };

    const snap = await db.collection(`tenants/${tid}/barberos`).get().catch(() => null);
    if (!snap) continue;

    const filas = [];
    for (const doc of snap.docs) {
      const b = doc.data() || {};
      if (b._mainDocId || b.disponible === false || b.activo === false) continue;
      const h = b.horario || {};

      // Descansos que ESE profesional usa bien en otros días: si la jornada
      // corta coincide con uno, es casi seguro el error de tipeo.
      const suyos = new Set();
      for (let d = 0; d <= 6; d++) {
        const day = h[d] ?? h[String(d)];
        (Array.isArray(day && day.descansos) ? day.descansos : [])
          .forEach(x => x && x.inicio && x.fin && suyos.add(`${x.inicio}-${x.fin}`));
      }

      for (let dow = 0; dow <= 6; dow++) {
        const day = h[dow] ?? h[String(dow)];
        if (!day || day.activo !== true) continue;
        const ini = toMins(day.inicio), fin = toMinsFin(day.fin);
        const dur = fin - ini;
        const local = localDe(dow);
        if (dur > MAX_SOSPECHOSA) continue;
        if (local < dur * FACTOR_LOCAL) continue;
        const coincide = suyos.has(`${day.inicio}-${day.fin}`);
        filas.push({
          nombre: b.nombre || doc.id,
          dow, ini: day.inicio, fin: day.fin, dur, local,
          pista: coincide ? '← es su descanso de otro día' : '',
        });
      }
    }

    if (!filas.length) continue;
    afectados++; malos += filas.length;
    console.log(`==== ${tid} ====`);
    filas.forEach(f => {
      console.log(`  ${f.nombre.padEnd(20)} ${DIAS[f.dow].padEnd(10)} ${f.ini}–${f.fin}  (${f.dur} min; el local abre ${Math.round(f.local / 60)} h)  ${f.pista}`);
    });
    console.log('');
  }

  console.log('==== RESUMEN ====');
  console.log(`  jornadas sospechosas : ${malos}`);
  console.log(`  tenants afectados    : ${afectados} de ${tenants.length}`);
  if (malos) {
    console.log('\n  Revisar en Equipo → Horario. Si la hora corta es el descanso, hay que');
    console.log('  devolver la jornada al horario real y ponerlo con "Añadir descanso".\n');
    process.exitCode = 1;
  } else {
    console.log('  Ninguna jornada parece un descanso mal puesto.\n');
  }
  process.exit(process.exitCode || 0);
})().catch(e => { console.error('ERROR:', e); process.exit(2); });
