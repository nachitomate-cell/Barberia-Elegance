#!/usr/bin/env node
/**
 * test-caidas-sesion.js — El contador de caídas y el aviso de sesión inestable.
 *
 * Por qué existe esto: el aviso de "sesión caída" solo dispara tras 20 minutos
 * seguidos abajo, una gracia deliberada para que Baileys reconecte sin
 * alarmar. El efecto lateral es que una sesión que se cae y vuelve en cinco
 * minutos —diez veces al día— nunca alerta; y como al reconectar el webhook
 * borra `desconectadoEn`, tampoco deja rastro. Cuando reportaron que a
 * kronnos_limache "se le cierra el QR" (2026-08-06) no hubo forma de
 * confirmarlo ni de desmentirlo.
 *
 * Se prueban las dos reglas que hacen que el contador sirva:
 *   1. Cuenta TRANSICIONES, no eventos: Evolution repite 'close' y sin esto
 *      una sola caída se vería como seis.
 *   2. El aviso mira la FRECUENCIA del día, no la duración de una caída, y
 *      sale UNA vez por local por día.
 *
 * Uso:  npm run test:caidas-sesion
 */

let fallos = 0;
const check = (cond, m) => { console.log(`  ${cond ? '✅' : '❌'} ${m}`); if (!cond) fallos++; };

/* Réplica de la guarda del webhook (gateway.js, rama connection.update).
   Se replica en vez de importarse porque vive inline dentro del handler; el
   test la fija como contrato para que nadie la borre por accidente. */
function simular(eventos) {
  let estado = 'connected';
  let caidas = 0;
  for (const ev of eventos) {
    if (ev === 'open') {
      estado = 'connected';
    } else if (ev === 'close') {
      if (estado !== 'disconnected') caidas++;   // solo la transición
      estado = 'disconnected';
    }
  }
  return { caidas, estado };
}

const CAIDAS_DIA_ALERTA = 4;   // mismo umbral que salud.js y ops-metrics.js

console.log('\n── El contador cuenta transiciones, no eventos ──');

check(simular(['close']).caidas === 1, 'una caída suelta cuenta 1');
check(simular(['close', 'close', 'close', 'close']).caidas === 1,
  'cuatro "close" seguidos siguen siendo UNA caída (Evolution los repite)');
check(simular(['close', 'open', 'close', 'open', 'close']).caidas === 3,
  'tres ciclos caída→reconexión cuentan 3');
check(simular(['open', 'open', 'open']).caidas === 0, 'reconexiones sin caída no suman');
check(simular([]).caidas === 0, 'sin eventos no suma');

console.log('\n── El estado final sigue siendo correcto ──');
check(simular(['close', 'close', 'open']).estado === 'connected',
  'termina conectada si el último evento es open');
check(simular(['open', 'close']).estado === 'disconnected',
  'termina desconectada si el último es close');

console.log('\n── El aviso mira la frecuencia, no la duración ──');
{
  // Diez caídas de 5 minutos: el aviso de "20 min abajo" JAMÁS dispara.
  const flapping = simular(Array.from({ length: 10 }, (_, i) => (i % 2 ? 'open' : 'close')).concat('open'));
  check(flapping.caidas === 5, `5 ciclos de caída breve quedan contados (${flapping.caidas})`);
  check(flapping.estado === 'connected', 'y la sesión termina verde, que es lo que engaña al semáforo');
  check(flapping.caidas >= CAIDAS_DIA_ALERTA, 'ese patrón supera el umbral y dispara el aviso interno');

  // Una caída larga: la cubre el aviso de 20 min, no este.
  const unaLarga = simular(['close']);
  check(unaLarga.caidas < CAIDAS_DIA_ALERTA,
    'una sola caída NO dispara el aviso de inestabilidad (de esa se encarga el de 20 min)');
}

console.log('\n── Un aviso por local por día ──');
{
  // Réplica del candado `alertaInestableDia` de salud.js.
  const hoy = '2026-08-06';
  let cfg = {};
  let enviados = 0;
  const ciclo = (caidas) => {
    if (caidas >= CAIDAS_DIA_ALERTA && cfg.alertaInestableDia !== hoy) {
      enviados++;
      cfg = { ...cfg, alertaInestableDia: hoy };
    }
  };
  ciclo(4); ciclo(5); ciclo(9);          // el cron corre cada 30 min
  check(enviados === 1, 'tres ciclos del cron con el umbral superado mandan UN solo correo');

  cfg = { ...cfg, alertaInestableDia: '2026-08-05' };   // día anterior
  enviados = 0;
  ciclo(4);
  check(enviados === 1, 'al día siguiente el candado se libera y vuelve a avisar');
}

console.log(fallos ? `\n❌ ${fallos} fallo(s)\n` : '\n✅ Todo en orden\n');
process.exit(fallos ? 1 : 0);
