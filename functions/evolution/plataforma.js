'use strict';

// functions/evolution/plataforma.js
// ─────────────────────────────────────────────────────────────────────────────
//  CANAL PLATAFORMA — confirmaciones y recordatorios desde el número SynapTech
//
//  Tercer canal, y el punto medio entre los dos que ya existen:
//
//    · Canal propio (evolution/confirmaciones.js) → número del LOCAL.
//      Gratis, marca perfecta, pero el riesgo de bloqueo lo corre el local.
//    · Canal oficial (whatsapp-notif.js, Cloud API) → número de plataforma.
//      Cero riesgo para el local, pero ~US$0,02 por mensaje.
//    · ESTE → número de SynapTech por Evolution: gratis Y sin exponer el
//      número del local. Lo que se arriesga es un chip nuestro, desechable.
//
//  ⚠️ LA DIFERENCIA ESTRUCTURAL: la instancia es COMPARTIDA
//  ────────────────────────────────────────────────────────
//  Un chip = una sesión de WhatsApp, así que un solo número atiende a varios
//  locales. Eso rompe el supuesto del canal propio, donde el tenant se deduce
//  del nombre de la instancia (`instance_delnero`). Acá la instancia se llama
//  igual para todos, así que al llegar una respuesta lo único que tenemos es
//  el teléfono del cliente. De ahí la colección raíz `wa_plataforma_chats`:
//  es el índice teléfono → tenant, y sin él un "CONFIRMAR" no se puede aplicar
//  a ninguna cita. Mismo problema y misma solución que en el canal oficial
//  (`wa_cita_pendiente`), por la misma razón: número compartido.
//
//  ⚠️ EL TOPE ANTI-BLOQUEO ES DEL CHIP, NO DEL TENANT
//  ──────────────────────────────────────────────────
//  En el canal propio cada local arriesga su propio número, así que el tope
//  vive en `tenants/{tid}/wa_cuota`. Acá varios locales comparten UN número: si
//  cada tenant llevara su propio contador, diez locales a 20 mensajes serían
//  200 salientes del mismo chip en un día — exactamente el patrón que Meta
//  suspende. El contador es por CHIP, no por local.
//
//  ⚠️ PUEDE HABER VARIOS CHIPS
//  ───────────────────────────
//  Arrancó con uno solo para todos. Ahora un local con volumen propio (o al que
//  no conviene mezclar con el resto) puede tener el suyo: si un chip se quema,
//  se lleva puestos únicamente a los locales que estaban en él. Lo que un chip
//  NO puede es partirse — un chip = una sesión = un número.
//
//  ── Datos ───────────────────────────────────────────────────────────────────
//  _system/wa_plataforma          chip POR DEFECTO (instancia, número, conexión,
//                                 vinculadoDesde) — lo escribe SynapTech.
//  _system/wa_plataforma_{chipId} los demás chips, misma forma.
//  _system/{tid}.waPlataforma     opt-in por local (solo bootstrap lo escribe).
//  _system/{tid}.waPlataformaChip a qué chip está asignado. Ausente = el de
//                                 por defecto, así nada se movió al sumar el 2º.
//  wa_plataforma_chats/{telefono} índice teléfono → tenant + cita + chip.
//  wa_plataforma_cuota/{fecha}          salientes del chip por defecto ese día.
//  wa_plataforma_cuota/{chipId}__{fecha} ídem para los demás.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { esOperador } = require("../lib/operadores");
const { onSchedule }         = require('firebase-functions/v2/scheduler');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const { crearCliente }            = require('./client');
const { _ahoraChile: ahoraChile } = require('../chat-horas-disponibles');
const { estaBloqueado, detectarStop, registrarOptOut } = require('../lib/wa-consent');
const { _normalizeCl: normalizeCl } = require('./confirmaciones');
const { _detectarDecision: detectarDecision,
        _aplicarDecision:  aplicarDecision } = require('./cerebro');
const { logWaSend } = require('../lib/metrics');

const db = admin.firestore();

const EVOLUTION_API_URL       = defineSecret('EVOLUTION_API_URL');
const EVOLUTION_API_KEY       = defineSecret('EVOLUTION_API_KEY');
const EVOLUTION_WEBHOOK_TOKEN = defineSecret('EVOLUTION_WEBHOOK_TOKEN');

const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];
const WEBHOOK_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/evolutionWebhook';

/* ───────────────────────────── Rutas de cada chip ────────────────────────────
   El chip por defecto CONSERVA sus rutas históricas: `_system/wa_plataforma`,
   `wa_plataforma_cuota/{fecha}` e `instance_synaptech`. Migrarlo a un esquema
   uniforme habría dejado a ops sin historial y —peor— al chip que está andando
   ahora mismo sin su sesión: se habría desvinculado solo y había que volver a
   escanear el QR. El precio es este `if`, que vive en UNA función por ruta en
   vez de repartido por el archivo.

   ⚠️ La instancia de los chips nuevos es `instance_plat_{chipId}`, NO
   `instance_{chipId}`: el canal PROPIO de cada local usa `instance_{tid}` y el
   gateway deriva el tenant de ahí. Un chip llamado 'sion' habría chocado de
   frente con la instancia del bot de Sion, y el webhook habría metido las
   respuestas del chip en el flujo del bot del local. */
const CHIP_DEFAULT      = 'synaptech';
const INSTANCIA_DEFAULT = 'instance_synaptech';
const PREFIJO_INSTANCIA = 'instance_plat_';
const RE_CHIP_ID        = /^[a-z0-9][a-z0-9_-]{1,23}$/;

const esDefault = (chipId) => !chipId || chipId === CHIP_DEFAULT;

const instanciaDe = (chipId) => (esDefault(chipId)
  ? INSTANCIA_DEFAULT
  : `${PREFIJO_INSTANCIA}${chipId}`);

/** Inversa de instanciaDe(). null si la instancia NO es de este canal — así el
 *  gateway distingue con una sola llamada en vez de con dos condiciones que se
 *  pueden desincronizar. */
function chipIdDeInstancia(instanceName) {
  const n = String(instanceName || '');
  if (n === INSTANCIA_DEFAULT) return CHIP_DEFAULT;
  if (n.startsWith(PREFIJO_INSTANCIA)) return n.slice(PREFIJO_INSTANCIA.length) || null;
  return null;
}

/** Valida y normaliza lo que venga de fuera. Un chipId sucio termina siendo un
 *  path de Firestore y un nombre de instancia: no puede pasar sin revisar. */
function normalizarChipId(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v || v === CHIP_DEFAULT) return CHIP_DEFAULT;
  if (!RE_CHIP_ID.test(v)) {
    throw new HttpsError('invalid-argument',
      'El identificador del chip debe ser minúsculas, números, guion o guion bajo (2 a 24 caracteres).');
  }
  return v;
}

const chipRef  = (chipId) => (esDefault(chipId)
  ? db.doc('_system/wa_plataforma')
  : db.doc(`_system/wa_plataforma_${chipId}`));

const chatRef  = (tel) => db.doc(`wa_plataforma_chats/${tel}`);

const cuotaRef = (chipId, fecha) => (esDefault(chipId)
  ? db.doc(`wa_plataforma_cuota/${fecha}`)
  : db.doc(`wa_plataforma_cuota/${chipId}__${fecha}`));

const citasCol = (tid) => (tid === 'elegance'
  ? db.collection('citas')
  : db.collection(`tenants/${tid}/citas`));

/** Chips vinculados. Se DERIVAN de los docs que existen en /_system y no de
 *  una lista aparte: una lista hay que acordarse de actualizarla al vincular y
 *  al desvincular, y el día que alguien se olvide el chip queda invisible para
 *  el cron —o peor, el cron intenta enviar por una sesión que ya no existe. */
async function listarChips() {
  const refs = await db.collection('_system').listDocuments();
  const ids = [];
  for (const r of refs) {
    if (r.id === 'wa_plataforma') ids.push(CHIP_DEFAULT);
    else if (r.id.startsWith('wa_plataforma_')) {
      const id = r.id.slice('wa_plataforma_'.length);
      if (id) ids.push(id);
    }
  }
  return ids;
}

/** ¿Por qué chip sale este local? Ausente = el de por defecto, que es lo que
 *  hace que sumar un chip nuevo no mueva a nadie de lugar. */
const chipDeTenant = (sys) => {
  const v = String((sys && sys.waPlataformaChip) || '').trim().toLowerCase();
  return v && RE_CHIP_ID.test(v) ? v : CHIP_DEFAULT;
};

exports._CHIP_DEFAULT     = CHIP_DEFAULT;
exports._chipRef          = chipRef;
exports._cuotaRef         = cuotaRef;
exports._listarChips      = listarChips;
exports._chipDeTenant     = chipDeTenant;
exports._instanciaDe      = instanciaDe;
exports.chipIdDeInstancia = chipIdDeInstancia;

const SECRETS = [EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_TOKEN];
const cliente = () => crearCliente({
  baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value(),
});

function exigirBootstrap(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const email = String(req.auth.token?.email || '').toLowerCase();
  if (!esOperador(email)) {
    throw new HttpsError('permission-denied', 'Solo SynapTech administra el número de plataforma.');
  }
}

/* ───────────────────────── Ritmo anti-bloqueo (del chip) ───────────────────── */

const HORA_INICIO   = 9;
const HORA_FIN      = 21;
const MAX_POR_CICLO = 8;

/** Tope diario del CHIP, escalonado por su antigüedad. Mismos números que
 *  evolution/cuota.js: un número recién vinculado despachando decenas de
 *  mensajes el día uno es el patrón que Meta suspende primero. */
function capDiario(cfg) {
  const desde = cfg && cfg.vinculadoDesde && cfg.vinculadoDesde.toMillis
    ? cfg.vinculadoDesde.toMillis() : 0;
  const dias = desde ? (Date.now() - desde) / 86400000 : 0;
  const porEdad = dias >= 30 ? 300 : dias >= 7 ? 120 : 40;

  // Tope MANUAL para arrancar de a poco (`_system/wa_plataforma.topeDiario`).
  // Solo puede BAJAR el límite, nunca subirlo: si alguien escribe 500 acá, el
  // escalonado por antigüedad sigue mandando. Un override que pudiera elevar
  // el tope convertiría la protección anti-bloqueo en una sugerencia.
  const manual = Number(cfg && cfg.topeDiario);
  return Number.isFinite(manual) && manual >= 0 ? Math.min(porEdad, manual) : porEdad;
}

// Exportado para ops-metrics: el dashboard NO debe recalcular el tope por
// su cuenta. Ya pasó con los topes del canal propio — cambiaron acá y el
// panel siguió mostrando los viejos, mintiendo sobre el límite anti-bloqueo.
exports._capDiario = capDiario;

const fechaHoy = () => ahoraChile().fecha;

function dentroDeVentanaHoraria(now = ahoraChile()) {
  const h = Math.floor(now.mins / 60);
  return h >= HORA_INICIO && h < HORA_FIN;
}

async function salientesHoy(chipId) {
  try {
    const s = await cuotaRef(chipId, fechaHoy()).get();
    return s.exists ? (Number(s.data().n) || 0) : 0;
  } catch (_) { return 0; }
}

async function registrarSaliente(chipId, tid, ok = true) {
  const fecha = fechaHoy();
  await cuotaRef(chipId, fecha).set({
    fecha, chipId,
    ...(ok ? { n: FieldValue.increment(1) } : {}),
    [`t_${tid}`]: FieldValue.increment(1),   // desglose por local, para cobrar
    [ok ? 'ok' : 'fail']: FieldValue.increment(1),
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}

/** Telemetría de SALUD del chip. Lo que de verdad anticipa un bloqueo no es el
 *  volumen: es que la gente deje de contestar (posible shadowban — el mensaje
 *  "sale" pero no llega) o que empiece a pedir la baja. Se cuenta acá para que
 *  ops pueda decidir el recambio ANTES de que Meta lo suspenda.
 *  Nunca lanza: es telemetría, no puede tumbar una respuesta al cliente. */
async function registrarEvento(chipId, tipo) {
  const fecha = fechaHoy();
  await cuotaRef(chipId, fecha).set({
    fecha, chipId,
    [tipo]: FieldValue.increment(1),
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});
}
exports._registrarEvento = registrarEvento;

/* ─────────────────────────── Vinculación del chip ──────────────────────────── */

exports.plataformaVincular = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  exigirBootstrap(req);
  const chipId = normalizarChipId(req.data?.chipId);
  const inst   = instanciaDe(chipId);
  const c = cliente();
  const opts = { webhookUrl: WEBHOOK_URL, webhookToken: EVOLUTION_WEBHOOK_TOKEN.value() };

  let r;
  try {
    r = await c.crearInstancia(inst, opts);
  } catch (e) {
    // Puede quedar colgada de un intento previo sin escanear. Se destruye y
    // se reintenta UNA vez para entregar un QR fresco (mismo auto-sanado que
    // el canal propio, que ya nos mordió una vez).
    logger.warn(`[plataforma:${chipId}] create falló (${e.message}); auto-sanando`);
    try { await c.logout(inst); }           catch (_) {}
    try { await c.eliminarInstancia(inst); } catch (_) {}
    try {
      r = await c.crearInstancia(inst, opts);
    } catch (e2) {
      logger.error(`[plataforma:${chipId}] vincular:`, e2.message);
      throw new HttpsError('internal', 'No se pudo iniciar la vinculación. Reintenta en unos segundos.');
    }
  }

  await chipRef(chipId).set({
    chipId,
    instanceName:   inst,
    estadoConexion: 'qr',
    // Etiqueta para /admin y ops. Sin esto, el segundo chip aparece como un id
    // suelto y a los dos meses nadie se acuerda de para qué era.
    ...(req.data?.nombre ? { nombre: String(req.data.nombre).slice(0, 60) } : {}),
    creadoEn:       FieldValue.serverTimestamp(),
  }, { merge: true });

  return { chipId, instanceName: inst, qr: r.qr, pairingCode: r.pairingCode };
});

exports.plataformaEstado = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  exigirBootstrap(req);
  const chipId = normalizarChipId(req.data?.chipId);
  const inst   = instanciaDe(chipId);
  let estado = 'unknown';
  try { estado = await cliente().estadoConexion(inst); } catch (_) {}
  const cfg = (await chipRef(chipId).get()).data() || {};

  if (estado === 'open' && cfg.estadoConexion !== 'connected') {
    await chipRef(chipId).set({
      chipId,
      estadoConexion: 'connected',
      conectadoEn:    FieldValue.serverTimestamp(),
      // vinculadoDesde: PRIMERA conexión. No se pisa al reconectar — es la
      // base del tope escalonado.
      ...(cfg.vinculadoDesde ? {} : { vinculadoDesde: FieldValue.serverTimestamp() }),
    }, { merge: true }).catch(() => {});
  }
  return { chipId, estado, cfg: { ...cfg, estadoConexion: estado === 'open' ? 'connected' : cfg.estadoConexion } };
});

exports.plataformaDesvincular = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  exigirBootstrap(req);
  const chipId = normalizarChipId(req.data?.chipId);
  const inst   = instanciaDe(chipId);

  // Desvincular un chip que todavía tiene locales asignados los deja mudos sin
  // que nadie se entere: el cron no falla, simplemente no encuentra sesión. Se
  // avisa con los nombres para que sea una decisión y no un accidente.
  const asignados = await tenantsDelChip(chipId);
  if (asignados.length && req.data?.confirmado !== true) {
    throw new HttpsError('failed-precondition',
      `Este chip atiende a ${asignados.length} local(es): ${asignados.join(', ')}. ` +
      'Reasígnalos primero, o vuelve a intentar confirmando.');
  }

  const c = cliente();
  try { await c.logout(inst); }           catch (_) {}
  try { await c.eliminarInstancia(inst); } catch (_) {}

  // El chip por defecto conserva su doc (ops lee su historial y el resto del
  // código lo asume existente); los demás se borran para que desaparezcan de
  // listarChips() — si no, quedan de fantasmas y el cron los recorre en vano.
  if (esDefault(chipId)) {
    await chipRef(chipId).set({
      estadoConexion:  'disconnected',
      numeroVinculado: FieldValue.delete(),
      desvinculadoEn:  FieldValue.serverTimestamp(),
      // Desvinculación hecha a mano desde el panel: evolution/alerta-sesion.js
      // lo lee y no manda el correo de caída. Ya lo sabe quien apretó el botón.
      cierreManual:    true,
    }, { merge: true }).catch(() => {});
  } else {
    await chipRef(chipId).delete().catch(() => {});
  }
  return { ok: true, chipId, reasignar: asignados };
});

/** Locales asignados a un chip (por nombre legible, para los avisos). */
async function tenantsDelChip(chipId) {
  const refs = await db.collection('_system').listDocuments();
  const out = [];
  for (const r of refs) {
    if (r.id === 'wa_plataforma' || r.id.startsWith('wa_plataforma_')) continue;
    const s = (await r.get()).data() || {};
    if (s.waPlataforma !== true) continue;
    if (chipDeTenant(s) !== chipId) continue;
    const td = (await db.doc(`tenants/${r.id}`).get()).data() || {};
    out.push(td.nombre || td.nombreCorto || r.id);
  }
  return out;
}

/* Panorama de todos los chips: quién está conectado, cuánto le queda hoy y qué
   locales atiende. Una sola llamada — el panel armaba esto con un get() por
   tenant desde el navegador y con 33 tenants se notaba.

   TODO en paralelo. La primera versión encadenaba un await por tenant y otro
   por chip: ~70 idas a Firestore en serie, y el panel de /admin se quedaba en
   blanco varios segundos esperándolas antes de dibujar nada.

   `locales` trae TODOS los tenants, no solo los que tienen el módulo activo:
   ops necesita poder asignarle a un chip un local que todavía no lo tiene
   encendido, que es justamente el caso de dar de alta uno nuevo. */
exports.plataformaChips = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  exigirBootstrap(req);
  const hoy = fechaHoy();

  const [sysRefs, tenantRefs] = await Promise.all([
    db.collection('_system').listDocuments(),
    db.collection('tenants').listDocuments(),
  ]);

  const ids = [];
  const sysTenantRefs = [];
  for (const r of sysRefs) {
    if (r.id === 'wa_plataforma') { ids.push(CHIP_DEFAULT); continue; }
    if (r.id.startsWith('wa_plataforma_')) {
      const id = r.id.slice('wa_plataforma_'.length);
      if (id) ids.push(id);
      continue;
    }
    sysTenantRefs.push(r);
  }
  if (!ids.includes(CHIP_DEFAULT)) ids.unshift(CHIP_DEFAULT);   // aunque nunca se haya vinculado

  // Universo de tenants: los de /tenants (fuente de verdad) más 'elegance',
  // que vive en la raíz de Firestore y no aparece ahí.
  const tids = new Set(tenantRefs.map(r => r.id));
  tids.add('elegance');
  for (const r of sysTenantRefs) if (r.id !== 'whatsapp_notif') tids.add(r.id);

  const locales = (await Promise.all([...tids].map(async (tid) => {
    const [sysSnap, tSnap] = await Promise.all([
      db.doc(`_system/${tid}`).get().catch(() => null),
      db.doc(`tenants/${tid}`).get().catch(() => null),
    ]);
    const s  = sysSnap?.data() || {};
    const td = tSnap?.data()   || {};
    // Sin nombre y sin módulo, casi seguro no es un tenant real (docs sueltos
    // de infraestructura en /_system). No se listan para no ensuciar el panel.
    const nombre = td.nombre || td.nombreCorto || null;
    if (!nombre && s.waPlataforma !== true && tid !== 'elegance') return null;
    return {
      id: tid,
      nombre: nombre || tid,
      activo: s.waPlataforma === true,
      chipId: chipDeTenant(s),
    };
  }))).filter(Boolean).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const chips = await Promise.all(ids.map(async (chipId) => {
    const [cfgSnap, cuotaSnap] = await Promise.all([
      chipRef(chipId).get(),
      cuotaRef(chipId, hoy).get(),
    ]);
    const cfg   = cfgSnap.data()   || {};
    const cuota = cuotaSnap.data() || {};
    const cap   = capDiario(cfg);
    const usados = Number(cuota.n) || 0;
    return {
      chipId,
      nombre:          cfg.nombre || (chipId === CHIP_DEFAULT ? 'Chip principal' : chipId),
      instanceName:    instanciaDe(chipId),
      estadoConexion:  cfg.estadoConexion || 'disconnected',
      numeroVinculado: cfg.numeroVinculado || null,
      topeDiario:      cfg.topeDiario ?? null,
      vinculadoDesde:  cfg.vinculadoDesde?.toMillis ? cfg.vinculadoDesde.toMillis() : null,
      cap,
      usadosHoy:       usados,
      restanteHoy:     Math.max(0, cap - usados),
      tenants:         locales.filter(l => l.activo && l.chipId === chipId),
    };
  }));

  // Locales apuntando a un chip que no existe: el cron los manda por el de por
  // defecto, pero hay que verlo en el panel y no solo en los logs.
  const huerfanos = locales.filter(l => l.activo && !ids.includes(l.chipId));
  return { chips, locales, huerfanos };
});

/* Asigna un local a un chip (y opcionalmente enciende/apaga su módulo).
   Es una callable y no una escritura directa porque ops.html NO carga el SDK de
   Firestore —solo auth y functions— y porque el chipId hay que validarlo contra
   los que existen de verdad: un id mal escrito manda al local al chip por
   defecto sin que nadie se entere hasta que el cliente recibe el aviso desde
   otro número. */
exports.plataformaAsignar = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  exigirBootstrap(req);
  const tenantId = String(req.data?.tenantId || '').trim();
  if (!tenantId || !/^[a-zA-Z0-9_-]{2,60}$/.test(tenantId)) {
    throw new HttpsError('invalid-argument', 'Falta el local.');
  }

  const patch = {};

  if (req.data?.chipId !== undefined) {
    const chipId = normalizarChipId(req.data.chipId);
    const vivos = await listarChips();
    if (!vivos.includes(chipId)) {
      throw new HttpsError('failed-precondition',
        `El chip '${chipId}' no está vinculado. Vincúlalo antes de asignarle locales.`);
    }
    patch.waPlataformaChip = chipId;
  }

  if (req.data?.activo !== undefined) patch.waPlataforma = req.data.activo === true;

  if (!Object.keys(patch).length) throw new HttpsError('invalid-argument', 'Nada que cambiar.');

  await db.doc(`_system/${tenantId}`).set(patch, { merge: true });
  logger.info(`[plataforma] ${tenantId}: ${JSON.stringify(patch)}`);
  return { ok: true, tenantId, ...patch };
});

/* ───────────── Índice teléfono → citas pendientes (multi-local) ─────────────
   Un MISMO cliente puede tener hora en dos locales distintos, y el número que
   pregunta es el mismo para todos. Por eso el índice guarda una LISTA, no una
   cita: con un solo doc por teléfono, la segunda confirmación pisaba a la
   primera y un "CONFIRMAR" se aplicaba a la cita equivocada, dejando la otra
   colgada para siempre.

   Cuando hay más de una pendiente no se adivina: se listan y se pregunta cuál.
   La intención ("confirmar" / "cancelar") queda guardada mientras el cliente
   elige, así no tiene que repetirla. */

/** Lee las pendientes vigentes de un teléfono, descartando las vencidas. */
async function leerPendientes(tel) {
  const snap = await chatRef(tel).get();
  if (!snap.exists) return { pendientes: [], intencion: null, intencionChip: null };
  const d = snap.data() || {};
  const ahora = Date.now();
  const vivas = (Array.isArray(d.pendientes) ? d.pendientes : [])
    .filter(p => p && p.citaId && p.tenantId && (!p.expiraMs || p.expiraMs > ahora))
    // Las pendientes anteriores al segundo chip no traen chipId: son del de por
    // defecto, que es el único que existía cuando se escribieron.
    .map(p => ({ ...p, chipId: p.chipId || CHIP_DEFAULT }));
  return { pendientes: vivas, intencion: d.intencion || null, intencionChip: d.intencionChip || null };
}

async function guardarPendientes(tel, pendientes, intencion = null, intencionChip = null) {
  if (!pendientes.length) { await chatRef(tel).delete().catch(() => {}); return; }
  await chatRef(tel).set({
    pendientes, intencion, intencionChip,
    actualizado: FieldValue.serverTimestamp(),
  }).catch(() => {});
}

/** Agrega una cita al índice sin pisar las que ya estaban. */
async function agregarPendiente(tel, item) {
  const { pendientes } = await leerPendientes(tel);
  const sinDuplicar = pendientes.filter(p => p.citaId !== item.citaId);
  sinDuplicar.push(item);
  await guardarPendientes(tel, sinDuplicar, null);
}

/** Texto numerado de las citas pendientes, para que el cliente elija. */
function listarPendientes(pendientes) {
  const num = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
  return pendientes
    .map((p, i) => `${num[i] || (i + 1) + '.'} *${p.local}* — ${p.fecha} a las ${p.hora} hrs`)
    .join('\n');
}

/** ¿A cuál de las pendientes se refiere el cliente? Por número o por nombre
 *  del local. Devuelve el índice, o -1 si no quedó claro. */
function elegirPendiente(texto, pendientes) {
  const t = String(texto || '').toLowerCase().trim()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const m = t.match(/^\s*([1-9])\b/);
  if (m) {
    const i = Number(m[1]) - 1;
    if (i >= 0 && i < pendientes.length) return i;
  }
  // Por nombre del local: basta una palabra distintiva ("ferraza", "nero").
  const porNombre = pendientes.findIndex(p => {
    const local = String(p.local || '').toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return local.split(/\s+/).filter(w => w.length >= 4).some(w => t.includes(w));
  });
  return porNombre;
}

/* ─────────────────────── Entrante: rutear al tenant correcto ───────────────── */

/** ¿Este webhook es de alguna instancia de este canal? */
exports.esInstanciaPlataforma = (instanceName) => chipIdDeInstancia(instanceName) !== null;

/**
 * Procesa una respuesta que llegó al número de plataforma.
 * No hay bot conversacional acá a propósito: un mismo número contestando como
 * varias barberías distintas es una mala idea de producto y una señal rara
 * para Meta. Solo se interpreta CONFIRMAR / CANCELAR sobre la cita pendiente.
 */
async function procesarEntrantePlataforma({ body, evoClient, chipId = CHIP_DEFAULT }) {
  const data = body.data || {};
  const key  = data.key || {};
  if (key.fromMe) return;                                   // eco nuestro
  const remoteJid = String(key.remoteJid || '');
  if (remoteJid.endsWith('@g.us')) return;                  // grupos, jamás

  const tel = normalizeCl(remoteJid.replace(/[:@].*$/, ''));
  if (!tel) return;

  const msg = data.message || {};
  const texto = String(
    msg.conversation ?? msg.extendedTextMessage?.text ?? '',
  ).trim();
  if (!texto) return;

  // El índice de pendientes es por TELÉFONO, no por chip: el mismo cliente
  // puede tener hora en un local del chip A y otra en uno del chip B, y su
  // número es el mismo para los dos.
  //
  // Solo se atienden las de ESTE chip. Si no se filtrara, el cliente que
  // escribe al chip de Sion vería listada su cita de Kronnos y este número le
  // hablaría de un local al que nunca le escribió — desde su punto de vista,
  // un desconocido que sabe dónde tiene hora.
  //
  // `otras` se conserva aparte y se vuelve a guardar SIEMPRE: escribir solo la
  // lista filtrada borraría las pendientes del otro chip, y esas citas se
  // quedarían sin poder confirmarse nunca.
  const { pendientes: todas, intencion: intencionGuardada, intencionChip } = await leerPendientes(tel);
  const pendientes = todas.filter(p => p.chipId === chipId);
  const otras      = todas.filter(p => p.chipId !== chipId);

  const responder = async (t) => {
    try { await evoClient.enviarTexto(instanciaDe(chipId), tel, t); }
    catch (e) { logger.warn(`[plataforma:${chipId}] no pude responder a ***${tel.slice(-4)}: ${e.message}`); }
  };

  // Toda respuesta cuenta para la tasa de respuesta del chip, que es la
  // señal más temprana de un shadowban: los envíos siguen saliendo "ok"
  // pero nadie contesta porque no están llegando.
  await registrarEvento(chipId, 'respuestas');

  // ── STOP: se honra ANTES que cualquier otra cosa ──
  // Obligatorio por política de Meta y por Ley 21.719, y además es el
  // indicador adelantado del bloqueo: lo que sube primero no es el error de
  // envío, es la gente pidiendo la baja. Se escribe en el libro GLOBAL
  // /wa_optout, así que frena también los otros dos canales.
  if (detectarStop(texto)) {
    // El opt-out es GLOBAL: se borra el índice entero, no solo lo de este chip.
    // "No me escriban más" no significa "que me escriba el otro número".
    await registrarOptOut(tel, 'stop-plataforma').catch(e =>
      logger.error(`[plataforma:${chipId}] optout ${tel}:`, e.message));
    await chatRef(tel).delete().catch(() => {});
    await registrarEvento(chipId, 'optout');
    await responder(
      '🔕 Listo, no volveremos a escribirte por este medio.\n\n' +
      'Tu cita sigue agendada; si necesitas cambiarla, contacta directamente a tu local.');
    logger.info(`[plataforma] opt-out ***${tel.slice(-4)}`);
    return;
  }

  if (!pendientes.length) {
    // Sin cita pendiente no sabemos de qué local habla. Se responde una vez
    // para no dejarlo hablando solo, pero no se inventa nada.
    await responder(
      'Hola 👋 Este número solo envía confirmaciones de citas.\n\n' +
      'Si necesitas reagendar o cancelar, contacta directamente a tu local.');
    return;
  }

  /** Aplica la decisión a UNA pendiente y la saca del índice. */
  const resolver = async (idx, decision) => {
    const p = pendientes[idx];
    await aplicarDecision(p.tenantId, tel, p.citaId, decision);
    // `otras` vuelve entera: son las pendientes del otro chip y no se tocan.
    await guardarPendientes(tel, [...otras, ...pendientes.filter((_, i) => i !== idx)], null);
    await registrarEvento(chipId, decision === 'confirmar' ? 'conf_si' : 'conf_no');
    await responder(decision === 'confirmar'
      ? `✅ ¡Listo! Tu cita en *${p.local}* quedó confirmada.\n\nTe esperamos el ${p.fecha} a las ${p.hora} hrs.`
      : `🙏 Listo, cancelamos tu cita en *${p.local}* del ${p.fecha} a las ${p.hora} hrs.`);
    logger.info(`[plataforma:${chipId}] ${decision} tenant=${p.tenantId} cita=${p.citaId}`);
  };

  // ── Una sola pendiente: camino directo ──
  if (pendientes.length === 1) {
    const decision = detectarDecision(texto);
    if (!decision) {
      const p = pendientes[0];
      await responder(
        `Perdona, no te entendí 🙈\n\n` +
        `Sobre tu cita en *${p.local}* del ${p.fecha} a las ${p.hora} hrs: ` +
        'responde *CONFIRMAR* si vienes, o *CANCELAR* si no podrás.');
      return;
    }
    await resolver(0, decision);
    return;
  }

  // ── Varias pendientes: NO se adivina ──
  // Aplicar la decisión a la última recibida sería lo cómodo y lo incorrecto:
  // el cliente cancelaría una hora que no quería cancelar.
  const idx = elegirPendiente(texto, pendientes);

  // Ya venía eligiendo (guardamos su intención en el turno anterior). La
  // intención se guarda con el chip en que se produjo: si no, una conversación
  // a medias con el chip A haría que un "2" escrito al chip B cancelara una
  // cita sin que el cliente haya dicho "cancelar" a ESE número.
  if (intencionGuardada && intencionChip === chipId && idx >= 0) {
    await resolver(idx, intencionGuardada);
    return;
  }

  const decision = detectarDecision(texto);

  // Dijo "confirmar" y además cuál ("cancelar la de ferraza"): resolver ya.
  if (decision && idx >= 0) { await resolver(idx, decision); return; }

  // Dijo qué quiere pero no de cuál: guardar la intención y preguntar.
  if (decision) {
    await guardarPendientes(tel, [...otras, ...pendientes], decision, chipId);
    await responder(
      `Tienes ${pendientes.length} citas pendientes 🤔 ¿A cuál te refieres?\n\n` +
      `${listarPendientes(pendientes)}\n\n` +
      `Responde con el número (por ejemplo *1*) y la ${decision === 'confirmar' ? 'confirmo' : 'cancelo'}.`);
    return;
  }

  // Ni qué ni cuál: listar y pedir las dos cosas.
  await responder(
    `Tienes ${pendientes.length} citas pendientes 🤔\n\n` +
    `${listarPendientes(pendientes)}\n\n` +
    'Responde con el número y qué quieres hacer — por ejemplo *1 CONFIRMAR* o *2 CANCELAR*.');
}
exports.procesarEntrantePlataforma = procesarEntrantePlataforma;

/* ──────────────────── Cron: confirmaciones desde el número SynapTech ───────── */

const toMins = (t) => { const [h, m] = String(t || '').split(':').map(Number); return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0); };
const absMin = (fecha, mins) => { const [y, mo, d] = String(fecha).split('-').map(Number); return Math.floor(Date.UTC(y, mo - 1, d) / 86400000) * 1440 + mins; };
const sumarDias = (fecha, n) => {
  const [y, m, d] = String(fecha).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
};

function armarMensaje({ nombre, local, fecha, hora, servicio, esRecordatorio }) {
  // El cliente NO conoce este número, así que el local va en la PRIMERA línea:
  // sin eso el mensaje parece spam y sube la tasa de bloqueo, que es
  // justamente lo que quema el chip.
  const quien = nombre ? ` ${nombre}` : '';
  return [
    `Hola${quien} 👋 Te escribimos de *${local}*.`,
    '',
    esRecordatorio ? 'Te recordamos tu cita:' : 'Tienes tu cita agendada:',
    `📅 ${fecha}`,
    `🕐 ${hora} hrs`,
    servicio ? `✂️ ${servicio}` : '',
    '',
    esRecordatorio
      // Una cita que el cliente YA agendó no necesita que "confirme" de nuevo;
      // lo que el local necesita saber es si NO va a ir, para liberar el cupo.
      ? '¿Sigue en pie? Responde *CONFIRMAR* si vienes, o *CANCELAR* para liberar tu hora. 🙌'
      : '¿La confirmas? Responde *CONFIRMAR* para asistir o *CANCELAR* si no podrás. 🙌',
  ].filter(Boolean).join('\n');
}

/** Un ciclo por cada chip vinculado. Cada uno con su propio cupo, su propia
 *  sesión y sus propios locales: si un chip está caído o llegó a su tope, los
 *  del otro salen igual. Devuelve el total de mensajes enviados. */
async function procesarCiclo({ evoClient }) {
  const chips = await listarChips();
  if (!chips.length) { logger.info('[plataforma] no hay chips vinculados'); return 0; }

  let total = 0;
  for (const chipId of chips) {
    try {
      total += await procesarCicloChip({ evoClient, chipId });
    } catch (e) {
      // Un chip que revienta no puede llevarse los demás: el cron corre cada
      // 30 min y perder la vuelta entera por uno solo es perder el recordatorio
      // de todos.
      logger.error(`[plataforma:${chipId}] ciclo falló:`, e.message);
    }
  }
  return total;
}

/** Recorre los tenants de ESTE chip y manda lo que toque. */
async function procesarCicloChip({ evoClient, chipId }) {
  const INSTANCIA = instanciaDe(chipId);
  const cfg = (await chipRef(chipId).get()).data() || {};
  if (cfg.estadoConexion !== 'connected') {
    logger.info(`[plataforma:${chipId}] chip no conectado; ciclo omitido`);
    return 0;
  }

  const cap = capDiario(cfg);
  let enviadosHoy = await salientesHoy(chipId);
  if (enviadosHoy >= cap) {
    logger.warn(`[plataforma:${chipId}] tope diario alcanzado (${enviadosHoy}/${cap})`);
    return 0;
  }

  // listDocuments, NO collection().get(): la mayoría de los docs padre
  // tenants/{id} no existen como documentos y get() los omite.
  const refs = await db.collection('tenants').listDocuments();
  const tids = new Set(refs.map(r => r.id));
  tids.add('elegance');

  const chipsVivos = new Set(await listarChips());

  const now    = ahoraChile();
  const nowAbs = absMin(now.fecha, now.mins);

  // ── FASE 1: juntar candidatas de TODOS los locales ──
  // Antes se enviaba local por local hasta agotar el cupo. Con un tope
  // apretado eso significa que el primero de la lista se lo come todo y los
  // últimos no reciben nada NUNCA — no es un retraso, es hambre permanente.
  // Y dentro de un mismo día el orden de Firestore es arbitrario, así que una
  // cita de mañana a las 9 podía perder su recordatorio frente a una de las 20.
  const candidatas = [];
  let enEsperaPorCupo = 0;

  for (const tid of tids) {
    const sys = (await db.doc(`_system/${tid}`).get()).data() || {};
    if (sys.waPlataforma !== true) continue;

    // ¿Le toca a este chip? Un local asignado a un chip que ya no existe
    // (desvinculado, o un id mal escrito a mano) cae al de por defecto en vez
    // de quedarse mudo: preferimos que el cliente reciba su recordatorio desde
    // el número compartido —que es de donde salía antes— a que no lo reciba.
    // El warning es para que no se quede así para siempre.
    let suyo = chipDeTenant(sys);
    if (!chipsVivos.has(suyo)) {
      logger.warn(`[plataforma] ${tid} apunta al chip '${suyo}', que no existe; va por '${CHIP_DEFAULT}'`);
      suyo = CHIP_DEFAULT;
    }
    if (suyo !== chipId) continue;

    // Guard anti doble envío: si el local ya manda por SU número, este canal
    // se calla. Los dos crons miran las mismas citas.
    const waCfg = (await db.doc(`tenants/${tid}/configuracion/whatsapp`).get()).data() || {};
    if (waCfg.confirmacionesEnabled === true && waCfg.estadoConexion === 'connected') {
      logger.warn(`[plataforma] ${tid}: ya manda por su propio número; omitido para no duplicar`);
      continue;
    }

    const td    = (await db.doc(`tenants/${tid}`).get()).data() || {};
    const local = td.nombre || td.nombreCorto || tid;
    // La ventana sale del doc del LOCAL, no de _system: el local no puede
    // escribir _system, y esta sí es una preferencia suya.
    const ventana = Number(waCfg?.recordatorio?.ventanaHoras) || 24;
    const optInImplicito = sys.waPlataformaOptInImplicito === true;

    for (let i = 0; i <= Math.ceil(ventana / 24); i++) {
      const snap = await citasCol(tid).where('fecha', '==', sumarDias(now.fecha, i)).get();

      for (const doc of snap.docs) {
        const cita = doc.data() || {};

        // 'Pendiente'  → el cliente pidió el WhatsApp y todavía no contesta.
        //   Desde que la casilla de la reserva decide el estado inicial
        //   (estadoInicialCita en firebaseUtils.js), ámbar significa
        //   exactamente eso. También lo pone el bot al agendar.
        // 'Confirmada' → no hay nada que preguntar: o no marcó la casilla —y
        //   entonces el filtro de consentimiento de más abajo la descarta— o la
        //   reservó con menos de 12 h de anticipación. En ese caso sí se le
        //   escribe, pero como recordatorio, no como pregunta.
        const estado = String(cita.estado || '');
        if (estado !== 'Pendiente' && estado !== 'Confirmada') continue;

        if (cita.waConfirmSolicitada === true) continue;
        if (cita.waNumeroInvalido === true)    continue;
        if (cita.origenQA)                     continue;   // barbero fantasma
        if (typeof cita.hora !== 'string' || !cita.hora.includes(':')) continue;

        // Consentimiento: la casilla explícita de la reserva y nada más.
        //
        // optInImplicito existía porque la casilla no se mostraba en los
        // locales que usan el chip de SynapTech: waConfirmActivo solo miraba el
        // número propio del local, así que sin este bypass no salía un solo
        // mensaje. Eso se arregló en el espejo (evolution/confirmaciones.js) y
        // el bypass quedó APAGADO en todos los tenants: mandarle a alguien que
        // no lo pidió es lo que se lleva el número por delante, y además hace
        // indistinguible quién aceptó de quién no.
        //
        // Sigue en el código para el caso de reservas que no pasan por la
        // agenda pública (carga manual, migración), donde no hay casilla que
        // marcar. No es una perilla de volumen. El opt-out global nunca se
        // releva, ni con esto encendido.
        if (cita.waOptIn !== true && !optInImplicito) continue;

        const tel = normalizeCl(cita.clienteTelefono);
        if (!tel) continue;

        const diffH = (absMin(cita.fecha, toMins(cita.hora)) - nowAbs) / 60;
        if (diffH <= 0 || diffH > ventana) continue;

        candidatas.push({
          tid, local, doc, cita, tel, diffH,
          esRecordatorio: estado === 'Confirmada',
        });
      }
    }
  }

  // ── FASE 2: la más urgente primero ──
  // Cuando el cupo no alcanza, se gasta en la cita que está por ocurrir. Una
  // que quede fuera hoy se recupera en el ciclo siguiente; una que ya pasó,
  // no — el recordatorio pierde todo su sentido.
  candidatas.sort((a, b) => a.diffH - b.diffH);

  // ── FASE 3: enviar hasta donde alcance el cupo ──
  const margen = Math.min(MAX_POR_CICLO, cap - enviadosHoy);
  let enviados = 0;

  for (const c of candidatas) {
    if (enviados >= margen) { enEsperaPorCupo++; continue; }

    if (await estaBloqueado(c.tel)) {
      await c.doc.ref.update({ waConfirmSolicitada: true, waOmitidaMotivo: 'optout' }).catch(() => {});
      continue;
    }

    try {
      const existe = await evoClient.verificarNumeros(INSTANCIA, [c.tel]);
      if (existe.size && existe.get(c.tel) === false) {
        await c.doc.ref.update({ waNumeroInvalido: true, waOmitidaMotivo: 'sin-whatsapp' }).catch(() => {});
        continue;
      }
    } catch (e) {
      logger.warn(`[plataforma] verificarNumeros falló (${e.message}); se envía sin verificar`);
    }

    const texto = armarMensaje({
      nombre:   String(c.cita.clienteNombre || '').trim().split(/\s+/)[0] || '',
      local:    c.local,
      fecha:    c.cita.fecha,
      hora:     c.cita.hora,
      servicio: c.cita.servicioNombre || '',
      esRecordatorio: c.esRecordatorio,
    });

    try {
      await evoClient.enviarTexto(INSTANCIA, c.tel, texto);
    } catch (e) {
      logger.error(`[plataforma:${chipId}] ${c.tid}/${c.doc.id} falló: ${e.message}`);
      await registrarSaliente(chipId, c.tid, false);
      continue;
    }

    await c.doc.ref.update({
      waConfirmSolicitada:   true,
      waConfirmSolicitadaEn: FieldValue.serverTimestamp(),
      waConfirmCanal:        'plataforma',
    }).catch(() => {});

    // Índice teléfono → tenant. Se AGREGA, no se pisa: el mismo cliente puede
    // tener hora en dos locales y el número que pregunta es el mismo.
    await agregarPendiente(c.tel, {
      tenantId: c.tid,
      citaId:   c.doc.id,
      fecha:    c.cita.fecha,
      hora:     c.cita.hora,
      local:    c.local,
      // Por qué número salió: la respuesta va a llegar a ESE, y solo ese debe
      // poder resolverla.
      chipId,
      expiraMs: Date.now() + Math.max(1, c.diffH + 6) * 3600e3,
    });

    await registrarSaliente(chipId, c.tid, true);
    await logWaSend(c.tid, 'confirmacion', true).catch(() => {});
    enviados++;
    logger.info(`[plataforma:${chipId}] ${c.tid}/${c.doc.id} → enviada a ***${c.tel.slice(-4)} (en ${c.diffH.toFixed(1)}h)`);
  }

  // Deja el pendiente visible en ops: sin esto, un cupo apretado se ve igual
  // que 'no había nada que enviar'.
  if (enEsperaPorCupo) {
    logger.warn(`[plataforma:${chipId}] ${enEsperaPorCupo} cita(s) esperando cupo (tope ${cap}/día)`);
  }
  await cuotaRef(chipId, fechaHoy()).set({
    fecha: fechaHoy(), chipId, enEsperaPorCupo,
    actualizado: FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});

  return enviados;
}
exports._procesarCiclo = procesarCiclo;

exports.plataformaConfirmaciones = onSchedule({
  schedule:       'every 30 minutes',
  timeZone:       'America/Santiago',
  region:         'us-central1',
  secrets:        SECRETS,
  timeoutSeconds: 300,
}, async () => {
  if (!dentroDeVentanaHoraria()) {
    logger.info(`[plataforma] fuera de ventana (${HORA_INICIO}:00–${HORA_FIN}:00 Chile); ciclo omitido`);
    return;
  }
  const n = await procesarCiclo({ evoClient: cliente() });
  if (n > 0) logger.info(`[plataforma] ciclo completo: ${n} confirmación(es)`);
});
