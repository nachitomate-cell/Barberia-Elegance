#!/usr/bin/env node
/**
 * test-reagendar-bot.js — que el bot MUEVA la cita de verdad, o no diga que la movió.
 *
 * Pasó de verdad: kronnos_penablanca, 31-jul-2026, 11:11. Una clienta pidió
 * adelantar su hora de 13:00 a 12:00 y el bot respondió "listo, te cambio tu
 * cita" + un código de reserva inventado (#KS-2026-0731-001; el real era
 * PE7-4HK). No tocó la base de datos: no existía herramienta para mover una
 * cita, así que el modelo narró el cambio. La cita quedó a las 13:00 y la
 * movió a mano una persona del local 3 minutos después. Si nadie hubiese
 * estado mirando el panel, la clienta llegaba a las 12:00 a una hora que no
 * existía.
 *
 * Acá se prueba `reagendar_cita`: que mueva la cita, que suelte el cupo viejo,
 * que NO invente código, y que se niegue cuando debe negarse.
 *
 * Se prueba la herramienta, sin Firestore ni red: Firestore es un doble en
 * memoria y `barberoLibreParaSlot` un stub (su lógica real de ocupación ya la
 * cubre el motor de disponibilidad).
 *
 * Uso:  npm run test:reagendar
 */
const Module = require('module');

/* ─────────────────── Doble de Firestore (en memoria) ─────────────────── */

const SERVER_TS = '@serverTimestamp';
const DELETE_ME = '@delete';

let store = new Map();          // 'tenants/x/citas/abc' -> objeto plano
let autoN = 0;

const clone = (o) => JSON.parse(JSON.stringify(o));

function aplicar(path, patch, { merge = true } = {}) {
  const base = merge ? (store.get(path) || {}) : {};
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === DELETE_ME) delete out[k];
    else out[k] = v;
  }
  store.set(path, out);
}

function snapOf(path) {
  const d = store.get(path);
  return {
    exists: d !== undefined,
    id: path.split('/').pop(),
    data: () => (d === undefined ? undefined : clone(d)),
  };
}

function docRef(path) {
  return {
    path,
    id: path.split('/').pop(),
    _isDoc: true,
    async get() { return snapOf(path); },
    async set(data, opts) { aplicar(path, data, { merge: !!(opts && opts.merge) }); },
    async update(patch) {
      if (!store.has(path)) throw new Error(`update sobre doc inexistente: ${path}`);
      aplicar(path, patch);
    },
    async delete() { store.delete(path); },
  };
}

function colRef(path) {
  return {
    path,
    doc(id) { return docRef(`${path}/${id || `auto_${++autoN}`}`); },
    // Lectura de colección completa (cargarServicios la usa para el gate de
    // días). Solo docs directos, sin subcolecciones — igual que Firestore.
    async get() {
      const prefix = `${path}/`;
      const docs = [];
      for (const p of store.keys()) {
        if (p.startsWith(prefix) && !p.slice(prefix.length).includes('/')) docs.push(snapOf(p));
      }
      return { docs, size: docs.length, forEach: (fn) => docs.forEach(fn) };
    },
  };
}

const fakeDb = {
  doc: (p) => docRef(p),
  collection: (p) => colRef(p),
  async runTransaction(fn) {
    // Escrituras en buffer: si `fn` lanza, no se aplica NADA (igual que
    // Firestore). Sin esto, el caso "slot ocupado" podría dejar basura.
    const buf = [];
    const tx = {
      async get(ref) { return ref.get(); },
      set(ref, data, opts) { buf.push(['set', ref.path, data, opts]); },
      update(ref, patch) { buf.push(['update', ref.path, patch]); },
      delete(ref) { buf.push(['delete', ref.path]); },
    };
    await fn(tx);
    for (const [op, path, data, opts] of buf) {
      if (op === 'delete') store.delete(path);
      else if (op === 'set') aplicar(path, data, { merge: !!(opts && opts.merge) });
      else aplicar(path, data);
    }
  },
};

/* ─────────────────── Stub del motor de disponibilidad ─────────────────── */

// Lo controla cada caso. `ultimaLlamada` deja ver los opts que le pasó el
// cerebro: que pida el MISMO profesional y que se excluya a sí misma no es
// cosmético — sin eso, mover 13:00 → 12:45 chocaba con su propio cupo.
let barberoLibreStub = () => ({ id: 'araceli', nombre: 'Araceli' });
let ultimaLlamada = null;

const HOY = { fecha: '2026-07-31', mins: 11 * 60 + 13 };  // viernes 31-jul, 11:13

/* ─────────────────── Dobles de módulos, ANTES de cargar ─────────────────── */

const origLoad = Module._load;
Module._load = function (req) {
  if (req === 'firebase-admin')        return { firestore: () => fakeDb };
  if (req === 'firebase-functions')    return { logger: { info(){}, warn(){}, error(){}, debug(){} } };
  if (req === 'firebase-admin/firestore') {
    return {
      FieldValue: { serverTimestamp: () => SERVER_TS, delete: () => DELETE_ME, increment: (n) => n },
      Timestamp: { fromMillis: (m) => ({ _ms: m }) },
    };
  }
  if (req === '@anthropic-ai/sdk')     return function Anthropic() { return {}; };
  if (req === '../chat-horas-disponibles') {
    return {
      _buscarDisponibilidad: async () => ({ fecha: null, esHoy: false, slots: [] }),
      _barberoLibreParaSlot: async (tid, fecha, hora, dur, opts) => {
        ultimaLlamada = { tid, fecha, hora, dur, opts };
        return barberoLibreStub({ fecha, hora, dur, opts });
      },
      _ahoraChile: () => ({ ...HOY }),
    };
  }
  if (req === '../lib/metrics')        return { logWaSend: async () => {}, logAiUsage: async () => {}, logBotNegocio: async () => {} };
  if (req === '../lib/ai-presupuesto') return { puedeGastar: async () => ({ ok: true }) };
  if (req === '../lib/wa-plan')        return { incluyeBot: () => true, incluyeRecordatorios: () => true };
  if (req === '../upsert-cliente')     return { _upsertClienteCore: async () => ({ uid: 'u1' }) };
  if (req === '../lib/wa-consent') {
    return { detectarStop: () => false, detectarReactivar: () => false, registrarOptOut: async () => {}, registrarOptIn: async () => {} };
  }
  if (req === './cuota')               return { registrarSaliente: async () => {} };
  return origLoad.apply(this, arguments);
};

const { _ejecutarTool: ejecutarTool } = require('../functions/evolution/cerebro');

Module._load = origLoad;

/* ─────────────────────────── Escenario base ─────────────────────────── */

const TID   = 'delnero';
const TEL   = '+56956213336';
const CITA  = 'cita_1';
const P     = (s) => `tenants/${TID}/${s}`;

// La cita del caso real: hoy 13:00, Corte Escolar con Araceli, código ya emitido.
const CITA_BASE = {
  fecha: '2026-07-31',
  hora: '13:00',
  clienteNombre: 'Romina More',
  clienteTelefono: TEL,
  clienteTelefonoSuf9: '956213336',
  servicioNombre: 'Corte Escolar',
  servicioId: 'corte-escolar',
  duracionServicio: 30,
  precio: 11990,
  barbero: 'Araceli',
  barberoId: 'araceli',
  estado: 'Pendiente',
  codigoCita: 'PE7-4HK',
  slotLockId: 'araceli_2026-07-31_1300',
  recordatorio1hEnviado: true,
  recordatorio24hEnviado: true,
};

function montar({ cita = {}, conf = {}, locks = {} } = {}) {
  store = new Map();
  ultimaLlamada = null;
  barberoLibreStub = () => ({ id: 'araceli', nombre: 'Araceli' });
  store.set(P(`citas/${CITA}`), { ...CITA_BASE, ...cita });
  store.set(P('configuracion/main'), { ...conf });
  const lockId = (cita.slotLockId !== undefined ? cita.slotLockId : CITA_BASE.slotLockId);
  if (lockId) {
    store.set(P(`slotLocks/${lockId}`), { citaId: CITA, fecha: CITA_BASE.fecha, hora: (cita.hora || CITA_BASE.hora), barberoId: 'araceli', duracion: 30 });
  }
  for (const [id, data] of Object.entries(locks)) store.set(P(`slotLocks/${id}`), data);
}

const mover = (args, ctx = {}) => ejecutarTool('reagendar_cita', { cita_id: CITA, ...args }, { tid: TID, telefono: TEL, chatId: '56956213336', ...ctx });

/* ─────────────────────────── Runner ─────────────────────────── */

let fallos = 0;
const casos = [];
const caso = (titulo, fn) => casos.push([titulo, fn]);

function chk(cond, detalle) {
  if (!cond) { fallos++; console.log(`      ✗ ${detalle}`); }
  return cond;
}

/* ─────────────────────────── Casos ─────────────────────────── */

caso('mueve la cita de verdad: 13:00 → 12:00', async () => {
  montar();
  const r = await mover({ fecha: '2026-07-31', hora: '12:00' });
  chk(r.ok === true, `esperaba ok:true, salió ${JSON.stringify(r)}`);
  const c = store.get(P(`citas/${CITA}`));
  chk(c.hora === '12:00', `la cita quedó a las ${c.hora}, no a las 12:00`);
  chk(c.fecha === '2026-07-31', `fecha quedó ${c.fecha}`);
  chk(c.estado === 'Pendiente', `el estado cambió a ${c.estado} (debía conservarse)`);
  chk(c.servicioNombre === 'Corte Escolar', 'se perdió el servicio');
});

caso('NO inventa código: devuelve y conserva el que ya tenía', async () => {
  montar();
  const r = await mover({ fecha: '2026-07-31', hora: '12:00' });
  chk(r.codigo === 'PE7-4HK', `devolvió el código ${r.codigo} en vez de PE7-4HK`);
  chk(store.get(P(`citas/${CITA}`)).codigoCita === 'PE7-4HK', 'le cambió el codigoCita a la cita');
});

caso('cita sin código: genera uno con formato real (XXX-XXX)', async () => {
  montar({ cita: { codigoCita: '' } });
  const r = await mover({ fecha: '2026-07-31', hora: '12:00' });
  chk(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(r.codigo || ''), `código con formato raro: ${r.codigo}`);
  chk(store.get(P(`citas/${CITA}`)).codigoCita === r.codigo, 'el código devuelto no quedó guardado en la cita');
});

caso('suelta el cupo viejo y toma el nuevo', async () => {
  montar();
  await mover({ fecha: '2026-07-31', hora: '12:00' });
  chk(!store.has(P('slotLocks/araceli_2026-07-31_1300')), 'el candado de las 13:00 quedó vivo (la hora vieja seguiría ocupada para siempre)');
  const nuevo = store.get(P('slotLocks/araceli_2026-07-31_1200'));
  chk(!!nuevo, 'no creó el candado de las 12:00');
  chk(nuevo && nuevo.citaId === CITA, 'el candado nuevo no apunta a la cita');
  chk(store.get(P(`citas/${CITA}`)).slotLockId === 'araceli_2026-07-31_1200', 'la cita no quedó apuntando al candado nuevo');
});

caso('no le roba el candado a otra cita al soltar el suyo', async () => {
  // Cita vieja sin slotLockId: el id del candado se deduce de barbero+fecha+hora
  // y en el camino puede caer sobre el de otra cita. No es suyo → no se borra.
  montar({ cita: { slotLockId: null } });
  store.set(P('slotLocks/araceli_2026-07-31_1300'), { citaId: 'otra_cita', fecha: '2026-07-31', hora: '13:00', barberoId: 'araceli', duracion: 30 });
  const r = await mover({ fecha: '2026-07-31', hora: '12:00' });
  chk(r.ok === true, 'no movió la cita');
  const ajeno = store.get(P('slotLocks/araceli_2026-07-31_1300'));
  chk(!!ajeno && ajeno.citaId === 'otra_cita', 'borró el candado de otra cita, dejándola sin cupo');
});

caso('deja rastro de dónde venía', async () => {
  montar();
  await mover({ fecha: '2026-08-04', hora: '16:00' });
  const c = store.get(P(`citas/${CITA}`));
  chk(c.reagendadaVia === 'wa_bot', 'sin reagendadaVia');
  chk(c.reagendadaDesde && c.reagendadaDesde.hora === '13:00', `reagendadaDesde malo: ${JSON.stringify(c.reagendadaDesde)}`);
});

caso('rearma los recordatorios (eran del horario viejo)', async () => {
  montar();
  await mover({ fecha: '2026-08-04', hora: '16:00' });
  const c = store.get(P(`citas/${CITA}`));
  chk(c.recordatorio1hEnviado === false, 'no rearmó el recordatorio de 1h');
  chk(c.recordatorio24hEnviado === false, 'no rearmó el recordatorio de 24h');
});

caso('busca profesional excluyendo su propio cupo y prefiriendo al mismo', async () => {
  montar();
  await mover({ fecha: '2026-07-31', hora: '12:45' });
  chk(ultimaLlamada && ultimaLlamada.opts, 'no le pasó opts al motor de disponibilidad');
  chk(ultimaLlamada.opts.excluirCitaId === CITA, 'no se excluyó a sí misma: mover a un horario solapado (13:00→12:45) chocaría con su propio candado');
  chk(ultimaLlamada.opts.preferirBarberoId === 'araceli', 'no pidió conservar al mismo profesional');
});

caso('si el profesional cambia, lo dice', async () => {
  montar();
  barberoLibreStub = () => ({ id: 'evelyn', nombre: 'Evelyn Contreras' });
  const r = await mover({ fecha: '2026-07-31', hora: '12:00' });
  chk(r.ok === true, 'no movió la cita');
  chk(r.cambio_profesional === true, 'no avisó que cambió el profesional');
  chk(/Evelyn/.test(r.nota || ''), `la nota no menciona al profesional nuevo: ${r.nota}`);
  chk(store.get(P(`citas/${CITA}`)).barberoId === 'evelyn', 'no actualizó el barberoId');
});

caso('hora ocupada: no mueve nada', async () => {
  montar();
  barberoLibreStub = () => null;
  const r = await mover({ fecha: '2026-07-31', hora: '12:00' });
  chk(r.ok === false, 'aceptó una hora sin nadie libre');
  chk(store.get(P(`citas/${CITA}`)).hora === '13:00', 'movió la cita igual');
  chk(store.has(P('slotLocks/araceli_2026-07-31_1300')), 'soltó el candado viejo sin haber movido nada');
});

caso('carrera: el candado del destino ya es de otra cita', async () => {
  montar({ locks: { 'araceli_2026-07-31_1200': { citaId: 'otra_cita', fecha: '2026-07-31', hora: '12:00', barberoId: 'araceli', duracion: 30 } } });
  const r = await mover({ fecha: '2026-07-31', hora: '12:00' });
  chk(r.ok === false, 'pisó el candado de otra cita');
  chk(store.get(P(`citas/${CITA}`)).hora === '13:00', 'movió la cita igual');
  chk(store.get(P('slotLocks/araceli_2026-07-31_1200')).citaId === 'otra_cita', 'le robó el candado a la otra cita');
  chk(store.has(P('slotLocks/araceli_2026-07-31_1300')), 'soltó el candado viejo pese a fallar');
});

caso('cita ajena: no la toca aunque le pasen el id', async () => {
  montar();
  const r = await mover({ fecha: '2026-07-31', hora: '12:00' }, { telefono: '+56911112222' });
  chk(r.ok === false, 'movió la cita de otra persona');
  chk(store.get(P(`citas/${CITA}`)).hora === '13:00', 'la cita ajena se movió');
});

caso('cita ya cancelada o completada: no revive', async () => {
  for (const estado of ['Cancelada', 'Completada', 'NoAsistio']) {
    montar({ cita: { estado } });
    const r = await mover({ fecha: '2026-08-04', hora: '16:00' });
    chk(r.ok === false, `movió una cita ${estado}`);
  }
});

caso('no mueve al pasado', async () => {
  montar();
  const r = await mover({ fecha: '2026-07-31', hora: '09:00' });   // hoy 11:13
  chk(r.ok === false, 'aceptó moverla a una hora que ya pasó');
  chk(store.get(P(`citas/${CITA}`)).hora === '13:00', 'movió la cita al pasado');
});

caso('misma fecha y hora: no hace nada, pero no miente', async () => {
  montar();
  const r = await mover({ fecha: '2026-07-31', hora: '13:00' });
  chk(r.ok === true && r.sin_cambios === true, `esperaba sin_cambios, salió ${JSON.stringify(r)}`);
  chk(store.has(P('slotLocks/araceli_2026-07-31_1300')), 'borró el candado sin motivo');
});

caso('local que no gestiona cambios por chat', async () => {
  montar({ conf: { chatCancelEnabled: false } });
  const r = await mover({ fecha: '2026-08-04', hora: '16:00' });
  chk(r.ok === false, 'ignoró la política del local');
  chk(store.get(P(`citas/${CITA}`)).hora === '13:00', 'movió la cita igual');
});

caso('respeta el mínimo de anticipación del local', async () => {
  // Cita a las 13:00, ahora son las 11:13 → faltan 107 min, el local pide 120.
  montar({ conf: { minutosLimiteReagendar: 120 } });
  const r = await mover({ fecha: '2026-08-04', hora: '16:00' });
  chk(r.ok === false, 'movió una cita bajo el mínimo de anticipación');

  // La misma política NO debe estorbar cuando hay margen de sobra.
  montar({ cita: { fecha: '2026-08-10', hora: '13:00', slotLockId: 'araceli_2026-08-10_1300' }, conf: { minutosLimiteReagendar: 120 } });
  const r2 = await mover({ fecha: '2026-08-11', hora: '16:00' });
  chk(r2.ok === true, `bloqueó un cambio con días de anticipación: ${JSON.stringify(r2)}`);
});

caso('sobrecupo del local: lo deriva a una persona', async () => {
  montar({ cita: { sobrecupo: true, slotLockId: null } });
  const r = await mover({ fecha: '2026-08-04', hora: '16:00' });
  chk(r.ok === false, 'movió un sobrecupo que puso el local a mano');
});

caso('entradas basura', async () => {
  for (const args of [{ fecha: '4 de agosto', hora: '16:00' }, { fecha: '2026-08-04', hora: '4pm' }, { fecha: '2026-08-04', hora: '16:00', cita_id: '' }]) {
    montar();
    const r = await ejecutarTool('reagendar_cita', { cita_id: CITA, ...args }, { tid: TID, telefono: TEL, chatId: 'x' });
    chk(r.ok === false, `aceptó basura: ${JSON.stringify(args)}`);
  }
  montar();
  const r = await mover({ fecha: '2026-08-04', hora: '16:00' }, {});
  chk(r.ok === true, 'falso negativo en el caso bueno');
});

caso('servicio restringido por días: respeta la restricción al mover', async () => {
  // El caso del "Corte Masculino (Promoción)" Lu-Ju ofrecido un viernes: si el
  // servicio de la cita tiene diasDisponibles, el día NUEVO debe ser uno de esos.
  montar();
  store.set(P('servicios/corte-escolar'), { nombre: 'Corte Escolar', precio: 11990, duracion: 30, diasDisponibles: [1, 2, 3, 4] });
  const r = await mover({ fecha: '2026-08-01', hora: '16:00' });   // sábado
  chk(r.ok === false, 'movió un servicio Lu-Ju a un sábado');
  chk(store.get(P(`citas/${CITA}`)).hora === '13:00', 'la cita se movió igual');
  const r2 = await mover({ fecha: '2026-08-04', hora: '16:00' });  // martes
  chk(r2.ok === true, `bloqueó un día válido (martes): ${JSON.stringify(r2)}`);
});

caso('cita inexistente', async () => {
  montar();
  const r = await ejecutarTool('reagendar_cita', { cita_id: 'no_existe', fecha: '2026-08-04', hora: '16:00' }, { tid: TID, telefono: TEL, chatId: 'x' });
  chk(r.ok === false, 'dijo que movió una cita que no existe');
});

/* ─────────────────────────── Main ─────────────────────────── */

(async () => {
  console.log('\n🔁 reagendar_cita — el bot mueve la cita, o no dice que la movió\n');
  for (const [titulo, fn] of casos) {
    const antes = fallos;
    try {
      await fn();
    } catch (e) {
      fallos++;
      console.log(`      ✗ excepción: ${e.stack}`);
    }
    console.log(`  ${fallos === antes ? '✓' : '✗'} ${titulo}`);
  }
  if (fallos) {
    console.log(`\n❌ ${fallos} comprobación(es) fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✅ ${casos.length} casos OK — mueve la cita, suelta el cupo viejo y no inventa códigos.\n`);
})();
