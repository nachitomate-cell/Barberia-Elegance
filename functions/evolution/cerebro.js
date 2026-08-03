'use strict';

// functions/evolution/cerebro.js
// ─────────────────────────────────────────────────────────────────────────────
//  CEREBRO conversacional del add-on "Asistente IA 24/7" (Sprint 2).
//
//  Recibe cada mensaje entrante de WhatsApp (vía evolutionWebhook), lo pasa por
//  Claude con TOOL USE y responde/agenda solo, sobre el número PROPIO del local.
//
//  Herramientas expuestas al modelo (todas server-side, aisladas por tenant):
//    · consultar_servicios      → catálogo real (tenants/{tid}/servicios)
//    · consultar_disponibilidad → primeros cupos libres (reusa chat-horas)
//    · agendar_cita             → crea la cita + candado (misma tx que addCita)
//    · consultar_mis_citas      → citas futuras del número que escribe
//    · cancelar_cita            → cancela una cita PROPIA (respeta política del local)
//    · reagendar_cita           → mueve una cita PROPIA de hora/día (misma tx: candado viejo fuera, nuevo dentro)
//    · pasar_con_humano         → deriva al equipo (silencia el bot 2h en el chat)
//
//  Blindajes de este sprint:
//    · Solo responde mensajes ENTRANTES (fromMe=false). Ignora sus propios ecos
//      y los mensajes del dueño → sin loops. (La toma-de-control con silencio de
//      2h es el Sprint 4.)
//    · Gating: botEnabled=true Y estadoConexion='connected'. Off = mudo.
//    · Dedup transaccional por messageId (los reintentos de Evolution no
//      re-procesan ni re-agendan).
//    · Nunca inventa: precios/servicios/horas SIEMPRE salen de las tools.
//    · Memoria de conversación acotada (últimos turnos) en
//      tenants/{tid}/wa_conversaciones/{chatId}.
// ─────────────────────────────────────────────────────────────────────────────

const { logger }     = require('firebase-functions');
const admin          = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const Anthropic      = require('@anthropic-ai/sdk');

const {
  _buscarDisponibilidad: buscarDisponibilidad,
  _barberoLibreParaSlot: barberoLibreParaSlot,
  _ahoraChile:           ahoraChile,
} = require('../chat-horas-disponibles');
const { logWaSend, logAiUsage, logBotNegocio } = require('../lib/metrics');
const { puedeGastar } = require('../lib/ai-presupuesto');
const { incluyeBot, incluyeRecordatorios } = require('../lib/wa-plan');
const { _upsertClienteCore: upsertClienteCore } = require('../upsert-cliente');
const {
  detectarStop, detectarReactivar, registrarOptOut, registrarOptIn,
} = require('../lib/wa-consent');
const { registrarSaliente, limiteConversaciones, conversacionesHoy, registrarConversacion,
        capDiario, salientesHoy } = require('./cuota');
const { abrirConversacion, ventanaAbierta, registrarMensajes,
        registrarRechazo } = require('../lib/wa-uso');
const { pareceIlegible, MAX_ILEGIBLES } = require('../lib/texto-ilegible');

const db = admin.firestore();

const MODEL       = 'claude-haiku-4-5-20251001'; // el más barato + rápido, ideal para agendar (subir a 'claude-sonnet-5' si falta calidad)
const MAX_TOKENS  = 900;                 // respuestas de WhatsApp: cortas
const MAX_ROUNDS  = 5;                   // tope de rondas de tool-use por mensaje
const MAX_HISTORIA = 20;                 // turnos que se le MANDAN al modelo (10 pares)
// Turnos que se ARCHIVAN en el doc. Va aparte de MAX_HISTORIA a propósito:
// recortar el archivo al mismo largo que el contexto borraba la conversación
// vieja para siempre, y cuando un local reclamaba ("el bot dijo que no había
// hora") ya no quedaba con qué auditar — había que pedirle capturas del
// teléfono. Archivar no cuesta tokens; solo lo que se envía al modelo.
const MAX_ARCHIVO  = 80;
const SILENCIO_MS  = 2 * 60 * 60 * 1000; // anti-colisión: silencio del bot tras toma-de-control (2h)

// Mínimo de tokens que Anthropic exige para que un prefijo sea cacheable.
// Haiku 4.5 es el modelo con el mínimo MÁS ALTO de la familia (4.096); por
// debajo de eso la API ignora el cache_control EN SILENCIO — sin error, sin
// aviso, y cache_creation/cache_read vuelven en 0. Por eso el bloque fijo del
// system carga catálogo + horario + equipo + manual: no es relleno, es
// contexto que el bot necesitaba igual y que además cruza el umbral.
// Guard que lo verifica por tenant: scripts/check-bot-prompt.js
const CACHE_MIN_TOKENS = 4096;

const millis = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : 0);

/* ─────────────────────────── Helpers de datos ─────────────────────────── */

const esE = (tid) => tid === 'elegance';
const serviciosCol = (tid) => (esE(tid) ? db.collection('servicios')  : db.collection(`tenants/${tid}/servicios`));
const citasCol     = (tid) => (esE(tid) ? db.collection('citas')      : db.collection(`tenants/${tid}/citas`));
const slotLocksCol = (tid) => (esE(tid) ? db.collection('slotLocks')  : db.collection(`tenants/${tid}/slotLocks`));
const configRef    = (tid) => (esE(tid) ? db.doc('configuracion/main') : db.doc(`tenants/${tid}/configuracion/main`));
const waCfgRef     = (tid) => db.doc(`tenants/${tid}/configuracion/whatsapp`);
const convRef      = (tid, chatId) => db.doc(`tenants/${tid}/wa_conversaciones/${chatId}`);

function lockIdFor(barberoId, fecha, hora) {
  const safeHora = String(hora || '').replace(':', '');
  const safeBid  = String(barberoId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeBid}_${fecha}_${safeHora}`;
}

function genCodigoCita() {
  const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code.slice(0, 3) + '-' + code.slice(3);
}

const norm = (s) => String(s || '').toLowerCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

// Minutos absolutos (día*1440 + minutos) para comparar fechas+horas sin líos
// de zona — todo en hora Chile (mismo helper que confirmaciones.js).
const toMinsHHMM = (t) => { const [h, m] = String(t || '').split(':').map(Number); return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0); };
const absMin = (fecha, mins) => { const [y, mo, d] = String(fecha).split('-').map(Number); return Math.floor(Date.UTC(y, mo - 1, d) / 86400000) * 1440 + mins; };

// Tope de seguridad: respuestas del bot conversacional por chat por día.
// Protege del cliente-troll (o de un loop imprevisto): costo + señal anti-ban.
// Bajado de 30 a 15: agendar una cita completa toma 4 respuestas, así que 15
// no le quita nada al caso real, y quien llegue a ese número probablemente ya
// está molesto — y un cliente molesto que aprieta "Bloquear" pesa más en la
// heurística de Meta que cualquier volumen.
const MAX_RESP_CHAT_DIA = 15;

/** Lista los servicios activos del local (para el prompt + para validar al agendar).
 *  Orden ALFABÉTICO estable: el catálogo viaja dentro del bloque cacheado del
 *  system, así que un orden que baile entre lecturas rompería el caché. */
async function cargarServicios(tid) {
  const snap = await serviciosCol(tid).get();
  const out = [];
  snap.forEach(d => {
    const s = d.data() || {};
    if (s.activo === false) return;
    // Restricción de días (0=Dom … 6=Sáb), la MISMA que respeta la reserva
    // pública (ReservaCore.diaPermitido). Array vacío o ausente = todos los días.
    const dias = Array.isArray(s.diasDisponibles)
      ? s.diasDisponibles.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
      : [];
    out.push({
      id:       d.id,
      nombre:   String(s.nombre || '').trim(),
      precio:   Number(s.precio) || 0,
      duracion: Number(s.duracion || s.duracionServicio) || 30,
      descripcion: String(s.descripcion || '').replace(/\s+/g, ' ').trim(),
      dias:     dias.length ? dias.sort((a, b) => a - b) : null,
    });
  });
  return out.filter(s => s.nombre).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Día de la semana (0=Dom…6=Sáb) de una fecha YYYY-MM-DD, sin sorpresas de
 *  zona horaria: se ancla a mediodía UTC, igual que ultimosDias() en ops. */
const dowDe = (fechaStr) => new Date(fechaStr + 'T12:00:00Z').getUTCDay();
const nombresDias = (dias) => dias.map(d => DIAS[d] ?? d).join(', ');

/** Equipo visible para el cliente: MISMA regla que la reserva pública
 *  (_mainDocId / disponible / activo / admin oculto) + fuera el barbero
 *  fantasma de QA, que jamás debe nombrarse a un cliente real. */
async function cargarEquipo(tid) {
  const snap = await (esE(tid) ? db.collection('barberos') : db.collection(`tenants/${tid}/barberos`)).get();
  const out = [];
  const vistos = new Set();
  snap.forEach(d => {
    const b = d.data() || {};
    if (b._mainDocId) return;
    if (b.esQA === true) return;
    if (b.disponible === false || b.activo === false) return;
    if (b.rol === 'admin' && b.mostrarEnAgenda !== true && tid !== 'delnero') return;
    const nombre = String(b.nombre || '').trim();
    if (!nombre || vistos.has(norm(nombre))) return;
    vistos.add(norm(nombre));
    out.push({ nombre, especialidad: String(b.especialidad || '').trim() });
  });
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Matchea el nombre que dijo el modelo contra un servicio real (exacto → incluye). */
function matchServicio(servicios, nombre) {
  const n = norm(nombre);
  if (!n) return null;
  return servicios.find(s => norm(s.nombre) === n)
      || servicios.find(s => norm(s.nombre).includes(n) || n.includes(norm(s.nombre)))
      || null;
}

/* ─────────────────────────── Herramientas (Claude) ─────────────────────────── */

const TOOLS = [
  {
    name: 'consultar_servicios',
    description: 'Devuelve el catálogo REAL de servicios del local con su precio y duración. Úsalo antes de nombrar precios o servicios: nunca los inventes.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'consultar_disponibilidad',
    description: 'Devuelve las horas libres del local. Si pasas `fecha`, busca desde ese día; si no, desde hoy. Pasa SIEMPRE `servicio_nombre` cuando ya sepas qué servicio quiere: sin él las horas se calculan con 30 minutos genéricos y un servicio más largo puede no caber. Úsalo siempre antes de ofrecer horas: nunca inventes disponibilidad.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha inicial de búsqueda en formato YYYY-MM-DD (opcional).' },
        servicio_nombre: { type: 'string', description: 'Servicio que quiere el cliente, tal como aparece en el catálogo (recomendado: ajusta las horas a su duración real y a sus días válidos).' },
      },
      required: [],
    },
  },
  {
    name: 'agendar_cita',
    description: 'Reserva una cita real. Llama esto SOLO cuando ya confirmaste con el cliente: servicio, fecha (YYYY-MM-DD), hora (HH:MM) y su nombre. La hora debe haber salido de consultar_disponibilidad. Para GRUPOS (2+ personas), llama esta herramienta UNA VEZ POR PERSONA, cada una con su nombre — pueden ir a la misma hora si hay varios profesionales. Devuelve el código de la reserva si tuvo éxito.',
    input_schema: {
      type: 'object',
      properties: {
        servicio_nombre: { type: 'string', description: 'Nombre del servicio, tal como aparece en consultar_servicios.' },
        fecha:           { type: 'string', description: 'Fecha de la cita en formato YYYY-MM-DD.' },
        hora:            { type: 'string', description: 'Hora de la cita en formato HH:MM (24h).' },
        cliente_nombre:  { type: 'string', description: 'Nombre del cliente.' },
      },
      required: ['servicio_nombre', 'fecha', 'hora', 'cliente_nombre'],
    },
  },
  {
    name: 'consultar_mis_citas',
    description: 'Devuelve las citas FUTURAS del cliente que está escribiendo (se buscan por su número de WhatsApp). Úsala cuando pregunte por su cita, quiera cancelarla o cambiarla de hora.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'verificar_reserva',
    description: 'Busca una reserva por NOMBRE y FECHA, no por el número que escribe. Úsala SIEMPRE que el cliente diga que ya tiene hora y consultar_mis_citas no la haya encontrado — el caso normal es que la haya reservado en la web con otro teléfono. NUNCA le digas que su reserva no existe, ni que el sistema falló, ni le ofrezcas agendar de nuevo, sin haber usado esta herramienta antes: agendar sin verificar le deja DOS citas al cliente.',
    input_schema: {
      type: 'object',
      properties: {
        cliente_nombre: { type: 'string', description: 'Nombre con el que reservó, tal como lo dijo el cliente.' },
        fecha:          { type: 'string', description: 'Fecha de la cita en formato YYYY-MM-DD.' },
      },
      required: ['cliente_nombre', 'fecha'],
    },
  },
  {
    name: 'cancelar_cita',
    description: 'Cancela UNA cita futura del cliente. Primero llama a consultar_mis_citas, confirma con el cliente CUÁL cancelar, y recién entonces llama esto. Si lo que quiere es CAMBIAR de hora (no anular), usa reagendar_cita en vez de esta.',
    input_schema: {
      type: 'object',
      properties: {
        cita_id: { type: 'string', description: 'El cita_id devuelto por consultar_mis_citas.' },
      },
      required: ['cita_id'],
    },
  },
  {
    name: 'reagendar_cita',
    description: 'Mueve una cita YA EXISTENTE del cliente a otra fecha/hora, conservando su servicio y su código de reserva. Úsala siempre que quiera adelantar, atrasar o cambiar el día de su cita. Flujo: consultar_mis_citas (para saber cuál) → consultar_disponibilidad (para la hora nueva) → reagendar_cita. NUNCA le digas al cliente que le cambiaste la hora sin haber llamado a esta herramienta y recibido ok:true.',
    input_schema: {
      type: 'object',
      properties: {
        cita_id: { type: 'string', description: 'El cita_id de la cita a mover, devuelto por consultar_mis_citas.' },
        fecha:   { type: 'string', description: 'Nueva fecha en formato YYYY-MM-DD.' },
        hora:    { type: 'string', description: 'Nueva hora en formato HH:MM (24h). Debe haber salido de consultar_disponibilidad.' },
      },
      required: ['cita_id', 'fecha', 'hora'],
    },
  },
  {
    name: 'pasar_con_humano',
    description: 'Úsala cuando el cliente pida hablar con una persona, esté molesto o reclame, o pida algo fuera de tus herramientas (cotizaciones especiales, reclamos, temas de pago). Pausa el bot 2 horas en este chat para que el equipo del local responda. Después de llamarla, despídete corto indicando que el equipo le escribirá pronto.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

// Se ofrece SOLO cuando el cliente tiene una cita pendiente de confirmar.
const GESTION_CONFIRMACION_TOOL = {
  name: 'gestionar_confirmacion',
  description: 'Aplica la respuesta del cliente a su cita PENDIENTE de confirmación. decision:"confirmar" si asistirá; decision:"cancelar" si no podrá ir.',
  input_schema: {
    type: 'object',
    properties: {
      decision: { type: 'string', enum: ['confirmar', 'cancelar'] },
    },
    required: ['decision'],
  },
};

/** Detecta CONFIRMAR/CANCELAR sin gastar el modelo (respuesta directa al cron). */
function detectarDecision(texto) {
  const t = norm(texto);
  if (/\b(confirmar|confirmo|confirmada|confirmado|asistire|ahi estare|ahi voy|si voy|voy a ir)\b/.test(t)) return 'confirmar';
  if (/\b(cancelar|cancela|cancelo|cancelada|anular|anula|no podre|no puedo|no ire|no asisto|no voy)\b/.test(t)) return 'cancelar';
  return null;
}

/** Aplica la decisión a la cita + limpia el pendiente de la conversación. */
async function aplicarDecision(tid, chatId, citaId, decision) {
  const patch = { estado: decision === 'confirmar' ? 'Confirmada' : 'Cancelada' };
  if (decision === 'confirmar') patch.waClienteConfirmoEn = FieldValue.serverTimestamp();
  else                          patch.waClienteCanceloEn  = FieldValue.serverTimestamp();
  // Cancelar → estado 'Cancelada' dispara liberar-slot-on-cancel (libera el cupo).
  await citasCol(tid).doc(citaId).update(patch).catch(e => logger.error(`[cerebro] aplicarDecision ${tid}/${citaId}:`, e.message));
  await convRef(tid, chatId).update({ citaPendiente: FieldValue.delete() }).catch(() => {});
  logBotNegocio(tid, decision === 'confirmar' ? 'conf_si' : 'conf_no').catch(() => {}); // ratio para ops
}

/** Ejecuta la tool que pidió el modelo. Devuelve un objeto (se serializa a JSON). */
async function ejecutarTool(name, input, ctx) {
  const { tid, telefono } = ctx;

  if (name === 'gestionar_confirmacion') {
    const dec = input?.decision === 'cancelar' ? 'cancelar' : (input?.decision === 'confirmar' ? 'confirmar' : null);
    if (!dec) return { ok: false, motivo: 'decision inválida' };
    if (!ctx.citaPendiente?.citaId) return { ok: false, motivo: 'no hay cita pendiente' };
    await aplicarDecision(ctx.tid, ctx.chatId, ctx.citaPendiente.citaId, dec);
    return { ok: true, decision: dec };
  }

  if (name === 'consultar_mis_citas') {
    const suf9 = String(telefono).slice(-9);
    const hoyC = ahoraChile();
    // Dos consultas: por sufijo-9 (flujo público) y por teléfono completo (citas del bot).
    const [q1, q2] = await Promise.all([
      citasCol(tid).where('clienteTelefonoSuf9', '==', suf9).get().catch(() => ({ docs: [] })),
      citasCol(tid).where('clienteTelefono', '==', String(telefono)).get().catch(() => ({ docs: [] })),
    ]);
    const vistos = new Set();
    const futuras = [];
    for (const d of [...q1.docs, ...q2.docs]) {
      if (vistos.has(d.id)) continue;
      vistos.add(d.id);
      const x = d.data();
      if (['Cancelada', 'NoAsistio', 'Completada'].includes(x.estado)) continue;
      if (typeof x.fecha !== 'string' || typeof x.hora !== 'string') continue;
      if (absMin(x.fecha, toMinsHHMM(x.hora)) <= absMin(hoyC.fecha, hoyC.mins)) continue; // solo futuras
      futuras.push({
        cita_id: d.id, fecha: x.fecha, hora: x.hora,
        servicio: x.servicioNombre || '', profesional: x.barbero || '', codigo: x.codigoCita || '',
      });
    }
    futuras.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    if (!futuras.length) {
      return {
        citas: [],
        nota: 'Este NÚMERO no tiene citas futuras. OJO: eso NO significa que la reserva no exista ni que el sistema haya fallado — lo más común es que la haya hecho desde la web con OTRO teléfono, o que otra persona la haya reservado por él. Si el cliente afirma tener hora, pídele su NOMBRE y la FECHA y usa verificar_reserva antes de ofrecerle agendar de nuevo: agendar sin verificar le deja DOS citas.',
      };
    }
    return { citas: futuras.slice(0, 5) };
  }

  /* ── verificar_reserva ─────────────────────────────────────────────────────
     Para el caso real (kronnos_limache, 03-08-2026): el cliente reservó en la
     web con un teléfono y escribe por WhatsApp desde otro. `consultar_mis_citas`
     no la encontraba, el bot dijo "es posible que la reserva no se haya
     sincronizado o haya habido un inconveniente" —culpando al sistema sin
     evidencia— y ofreció agendar de nuevo, con riesgo de cita duplicada.

     Privacidad: esto CONFIRMA datos que el cliente ya dijo, no revela una
     agenda. Exige nombre + fecha, compara el nombre normalizado y devuelve solo
     servicio/hora/profesional — nunca el teléfono ni el nombre completo de
     terceros, y nunca lista "las citas de ese día". */
  if (name === 'verificar_reserva') {
    const nombreBuscado = norm(input?.cliente_nombre);
    const fecha = String(input?.fecha || '').trim();
    if (!nombreBuscado || nombreBuscado.length < 3) return { ok: false, motivo: 'Pide el nombre con el que reservó.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, motivo: 'Pide la fecha de la cita (YYYY-MM-DD).' };

    const snap = await citasCol(tid).where('fecha', '==', fecha).get().catch(() => ({ docs: [] }));
    const partes = nombreBuscado.split(/\s+/).filter(p => p.length >= 3);
    const encontradas = [];
    for (const d of snap.docs) {
      const x = d.data() || {};
      if (['Cancelada', 'NoAsistio'].includes(x.estado)) continue;
      const n = norm(x.clienteNombre);
      // Coincidencia por nombre: exacta, o todas las partes largas presentes
      // (cubre "Agustín Maiben" vs "agustin maiben m.").
      const coincide = n === nombreBuscado
        || (partes.length > 0 && partes.every(p => n.includes(p)));
      if (!coincide) continue;
      encontradas.push({
        cita_id: d.id, fecha: x.fecha, hora: x.hora,
        servicio: x.servicioNombre || '', profesional: x.barbero || '',
        codigo: x.codigoCita || '', estado: x.estado || '',
      });
    }
    if (!encontradas.length) {
      return { existe: false, nota: `No hay ninguna reserva a nombre de "${input?.cliente_nombre}" para el ${fecha}. Dile que no la encuentras a ese nombre y ofrécele agendarla ahora — recién acá es seguro ofrecer.` };
    }
    return {
      existe: true, citas: encontradas.slice(0, 5),
      nota: 'La reserva EXISTE y está en pie. Confírmasela con sus datos y NO ofrezcas agendar de nuevo. Como escribe desde otro número, avísale que sus recordatorios llegarán al teléfono con el que reservó.',
    };
  }

  if (name === 'cancelar_cita') {
    const id = String(input?.cita_id || '').trim();
    if (!id) return { ok: false, motivo: 'Falta cita_id (llama antes a consultar_mis_citas).' };
    const snap = await citasCol(tid).doc(id).get();
    if (!snap.exists) return { ok: false, motivo: 'No encontré esa cita.' };
    const x = snap.data();
    // Solo SUS citas: el teléfono del chat debe calzar (jamás cancelar ajenas).
    const suf9 = String(telefono).slice(-9);
    const esSuya = x.clienteTelefonoSuf9 === suf9
      || String(x.clienteTelefono || '').replace(/\D/g, '').endsWith(suf9);
    if (!esSuya) return { ok: false, motivo: 'Esa cita no pertenece a este número.' };
    if (x.estado === 'Cancelada') return { ok: true, nota: 'Esa cita ya estaba cancelada.' };
    // Política del local — la misma del chat público (el dueño la configura):
    const conf = (await configRef(tid).get()).data() || {};
    if (conf.chatCancelEnabled === false) {
      return { ok: false, motivo: 'Este local gestiona las cancelaciones directamente: indícale al cliente que llame o escriba al local.' };
    }
    const limMin = Number(conf.minutosLimiteReagendar) || 0;
    if (limMin > 0 && typeof x.fecha === 'string' && typeof x.hora === 'string') {
      const hoyC = ahoraChile();
      const faltan = absMin(x.fecha, toMinsHHMM(x.hora)) - absMin(hoyC.fecha, hoyC.mins);
      if (faltan < limMin) {
        return { ok: false, motivo: `La cita está muy próxima (el local pide al menos ${Math.round(limMin / 60)}h de anticipación). Indícale que se comunique directo con el local.` };
      }
    }
    // Cancelada → el trigger liberarSlot suelta el cupo solo.
    await citasCol(tid).doc(id).update({
      estado: 'Cancelada',
      canceladaPor: 'cliente',
      canceladaVia: 'wa_bot',
      updatedAt: FieldValue.serverTimestamp(),
    });
    // Si era la cita del flujo de confirmación de ESTE chat, limpiar el
    // pendiente: un "CONFIRMAR" posterior no debe revivir una cita cancelada.
    if (ctx.citaPendiente?.citaId === id) {
      await convRef(tid, ctx.chatId).update({ citaPendiente: FieldValue.delete() }).catch(() => {});
    }
    logger.info(`[cerebro] ${tid}: cita ${id} cancelada por el cliente vía bot`);
    logBotNegocio(tid, 'cancelada').catch(() => {});  // métrica de negocio para ops
    return { ok: true, cancelada: { fecha: x.fecha, hora: x.hora, servicio: x.servicioNombre || '' } };
  }

  if (name === 'reagendar_cita') {
    const id    = String(input?.cita_id || '').trim();
    const fecha = String(input?.fecha   || '').trim();
    const hora  = String(input?.hora    || '').trim();
    if (!id) return { ok: false, motivo: 'Falta cita_id (llama antes a consultar_mis_citas).' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, motivo: 'Fecha inválida (usa YYYY-MM-DD).' };
    if (!/^\d{2}:\d{2}$/.test(hora))        return { ok: false, motivo: 'Hora inválida (usa HH:MM).' };

    const citaRef = citasCol(tid).doc(id);
    const snap    = await citaRef.get();
    if (!snap.exists) return { ok: false, motivo: 'No encontré esa cita.' };
    const x = snap.data();

    // Solo SUS citas: mismo candado que cancelar_cita (jamás mover ajenas).
    const suf9 = String(telefono).slice(-9);
    const esSuya = x.clienteTelefonoSuf9 === suf9
      || String(x.clienteTelefono || '').replace(/\D/g, '').endsWith(suf9);
    if (!esSuya) return { ok: false, motivo: 'Esa cita no pertenece a este número.' };
    if (['Cancelada', 'Completada', 'NoAsistio'].includes(x.estado)) {
      return { ok: false, motivo: `Esa cita figura como ${x.estado} y ya no se puede mover. Si quiere una nueva hora, agenda una cita desde cero.` };
    }
    // Sobrecupo = overbooking que puso el local a mano, sin candado propio.
    // Moverlo por bot rompería esa intención: que lo vea una persona.
    if (x.sobrecupo === true) {
      return { ok: false, motivo: 'Esa cita la gestionó el local a mano: indícale que se comunique directo con el local para cambiarla.' };
    }
    if (x.fecha === fecha && x.hora === hora) {
      return { ok: true, sin_cambios: true, fecha, hora, codigo: x.codigoCita || '', nota: 'La cita ya estaba a esa misma fecha y hora: no había nada que cambiar.' };
    }

    // Cinturón: nunca mover al pasado (igual que agendar_cita).
    const hoyC = ahoraChile();
    const faltanMin = absMin(fecha, toMinsHHMM(hora)) - absMin(hoyC.fecha, hoyC.mins);
    if (faltanMin <= 0) return { ok: false, motivo: `Esa fecha/hora ya pasó (hoy es ${hoyC.fecha}). Ofrece horarios desde hoy en adelante.` };

    // Servicio restringido por días: la cita conserva su servicio al moverse,
    // así que el día NUEVO también tiene que ser un día válido del servicio
    // (misma regla que agendar_cita). Falla-abierto si el catálogo no se pudo
    // leer: bloquear un cambio legítimo por un error de lectura es peor.
    const serviciosR = await cargarServicios(tid).catch(() => []);
    const svcR = serviciosR.find(s => s.id === x.servicioId) || matchServicio(serviciosR, x.servicioNombre);
    if (svcR && svcR.dias && !svcR.dias.includes(dowDe(fecha))) {
      return { ok: false, motivo: `"${svcR.nombre}" solo está disponible los días: ${nombresDias(svcR.dias)}. El ${fecha} cae ${DIAS[dowDe(fecha)]}: ofrece uno de sus días válidos.` };
    }

    // Política del local: mover suelta el cupo igual que cancelar, así que pasa
    // por la MISMA puerta que cancelar_cita.
    const conf = (await configRef(tid).get()).data() || {};
    if (conf.chatCancelEnabled === false) {
      return { ok: false, motivo: 'Este local gestiona los cambios de hora directamente: indícale al cliente que llame o escriba al local.' };
    }
    const limMin = Number(conf.minutosLimiteReagendar) || 0;
    if (limMin > 0 && typeof x.fecha === 'string' && typeof x.hora === 'string') {
      const faltanActual = absMin(x.fecha, toMinsHHMM(x.hora)) - absMin(hoyC.fecha, hoyC.mins);
      if (faltanActual < limMin) {
        return { ok: false, motivo: `La cita está muy próxima (el local pide al menos ${Math.round(limMin / 60)}h de anticipación). Indícale que se comunique directo con el local.` };
      }
    }

    const dur = Number(x.duracionServicio ?? x.duracion) || 30;
    // Profesional para el horario nuevo, prefiriendo al mismo que ya tenía. Se
    // excluye esta cita del cálculo: su propio cupo actual no puede bloquear el
    // traslado (mordía al mover a un horario solapado, ej. 13:00 → 12:45).
    const barb = await barberoLibreParaSlot(tid, fecha, hora, dur, {
      preferirBarberoId: x.barberoId || null,
      excluirCitaId:     id,
    });
    if (!barb) return { ok: false, motivo: 'Esa hora ya no está disponible. Vuelve a consultar disponibilidad y ofrece otra.' };

    const oldLockId  = x.slotLockId
      || (x.barberoId && x.fecha && x.hora ? lockIdFor(x.barberoId, x.fecha, x.hora) : null);
    const nextLockId = lockIdFor(barb.id, fecha, hora);
    const lockRef    = slotLocksCol(tid).doc(nextLockId);
    // El código de reserva NO cambia al mover: es el mismo compromiso. Si la
    // cita venía sin código (Flow, Mercado Pago, citas viejas del panel) se
    // genera uno ahora, para poder dárselo al cliente sin inventarlo.
    const codigo = String(x.codigoCita || '').trim() || genCodigoCita();

    try {
      await db.runTransaction(async (tx) => {
        // TODAS las lecturas antes de cualquier escritura (regla de Firestore).
        const oldRef = (oldLockId && oldLockId !== nextLockId) ? slotLocksCol(tid).doc(oldLockId) : null;
        const [ls, olds] = await Promise.all([tx.get(lockRef), oldRef ? tx.get(oldRef) : null]);
        if (ls.exists && ls.data()?.citaId !== id) {
          const e = new Error('slot-taken'); e.code = 'slot-taken'; throw e;
        }
        tx.set(lockRef, {
          citaId: id, fecha, hora, barberoId: barb.id,
          duracion: dur, origen: 'wa_bot', creadoEn: FieldValue.serverTimestamp(),
        });
        // Soltar el cupo viejo. asegurarSlot solo CREA el candado del horario
        // actual: si no lo borramos acá, el horario viejo queda ocupado para
        // siempre (mismo batch que usa el panel al mover una cita). Solo si es
        // SUYO: en citas viejas sin slotLockId el id se deduce de barbero+hora
        // y podría caer sobre el candado de otra cita.
        if (oldRef && olds?.exists && olds.data()?.citaId === id) {
          tx.delete(oldRef);
        }
        tx.update(citaRef, {
          fecha,
          hora,
          barbero:    barb.nombre,
          barberoId:  barb.id,
          slotLockId: nextLockId,
          codigoCita: codigo,
          // Los avisos ya enviados eran del horario VIEJO: se rearman para que
          // el recordatorio salga con la hora nueva ('false' = pendiente de envío).
          recordatorio24hEnviado: false,
          recordatorio1hEnviado:  false,
          reagendadaVia:   'wa_bot',
          reagendadaEn:    FieldValue.serverTimestamp(),
          reagendadaDesde: { fecha: x.fecha || '', hora: x.hora || '', barberoId: x.barberoId || '', barbero: x.barbero || '' },
          updatedAt:       FieldValue.serverTimestamp(),
        });
      });
    } catch (e) {
      if (e.code === 'slot-taken') {
        return { ok: false, motivo: 'Alguien tomó esa hora recién. Ofrece otra hora libre.' };
      }
      throw e;
    }

    const cambioProfesional = !!x.barberoId && x.barberoId !== barb.id;
    logger.info(`[cerebro] ${tid}: cita ${id} (${codigo}) movida ${x.fecha} ${x.hora} → ${fecha} ${hora} (${barb.nombre}) vía bot`);
    logBotNegocio(tid, 'reagendada').catch(() => {});   // métrica de negocio para ops
    return {
      ok: true,
      codigo,
      antes:    { fecha: x.fecha || '', hora: x.hora || '' },
      fecha, hora,
      servicio: x.servicioNombre || '',
      precio:   Number(x.precio) || 0,
      profesional: barb.nombre,
      cambio_profesional: cambioProfesional,
      ...(cambioProfesional ? { nota: `A esa hora no estaba ${x.barbero || 'su profesional habitual'}: la cita queda con ${barb.nombre}. AVÍSASELO al cliente.` } : {}),
    };
  }

  if (name === 'pasar_con_humano') {
    await convRef(tid, ctx.chatId).set({
      botSilencedUntil: Timestamp.fromMillis(Date.now() + SILENCIO_MS),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    logger.info(`[cerebro] ${tid} chat=${ctx.chatId}: derivado a humano (bot en pausa 2h)`);
    return { ok: true, nota: 'Bot pausado 2 horas en este chat. Despídete corto: el equipo del local le escribirá.' };
  }

  if (name === 'consultar_servicios') {
    const servicios = await cargarServicios(tid);
    if (!servicios.length) return { servicios: [], nota: 'El local aún no cargó servicios.' };
    return { servicios: servicios.map(s => ({
      nombre: s.nombre, precio: s.precio, duracion_min: s.duracion,
      ...(s.dias ? { solo_dias: nombresDias(s.dias) } : {}),
    })) };
  }

  if (name === 'consultar_disponibilidad') {
    // Con servicio: las horas se calculan con su DURACIÓN real (un masaje de
    // 60 min ya no "cabe" en un hueco de 30) y saltando los días en que el
    // servicio no existe. Sin servicio (aún no lo elige), la duración típica
    // del local (la más repetida de su catálogo), que la resuelve el motor.
    let svc = null;
    if (input?.servicio_nombre) {
      svc = matchServicio(await cargarServicios(tid).catch(() => []), input.servicio_nombre);
    }
    const r = await buscarDisponibilidad(tid, input?.fecha, {
      durMin:        svc?.duracion || null,
      diasServicio:  svc?.dias || null,
    });
    if (!r.slots.length) {
      return { hay_cupos: false, mensaje: svc?.dias
        ? `Sin horas libres para "${svc.nombre}" en sus días válidos (${nombresDias(svc.dias)}) dentro de los próximos días.`
        : 'Sin horas libres en los próximos días.' };
    }
    return {
      hay_cupos: true, fecha: r.fecha, es_hoy: r.esHoy, horas: r.slots,
      // La lista es una MUESTRA repartida por el día, no el listado completo:
      // sin decirlo, el modelo lee "10:30…13:15" como "después no hay nada" y
      // le niega al cliente una hora que sí existe (kronnos_penablanca, 02-08).
      aviso_muestra: 'Estas horas son una MUESTRA repartida por el día, NO el listado completo. Puede haber más cupos entre medio y después de la última. Si el cliente pide una hora que no está en la lista, NO le digas que está tomada: intenta agendarla igual — la herramienta te dirá si de verdad no está libre.',
      ...(svc ? { servicio: svc.nombre, duracion_min: svc.duracion } : { nota: 'Horas calculadas con la duración típica del local: cuando sepas el servicio, vuelve a consultar pasando servicio_nombre (uno más largo puede no caber en estas horas).' }),
    };
  }

  if (name === 'agendar_cita') {
    const fecha = String(input?.fecha || '').trim();
    const hora  = String(input?.hora || '').trim();
    const nombre = String(input?.cliente_nombre || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, motivo: 'Fecha inválida (usa YYYY-MM-DD).' };
    if (!/^\d{2}:\d{2}$/.test(hora))        return { ok: false, motivo: 'Hora inválida (usa HH:MM).' };
    if (!nombre)                            return { ok: false, motivo: 'Falta el nombre del cliente.' };

    // Cinturón de seguridad: jamás agendar en el pasado (aunque el modelo se
    // confunda con "el lunes" del mes anterior, etc.).
    const hoyC = ahoraChile();
    const faltanMin = absMin(fecha, toMinsHHMM(hora)) - absMin(hoyC.fecha, hoyC.mins);
    if (faltanMin <= 0) return { ok: false, motivo: `Esa fecha/hora ya pasó (hoy es ${hoyC.fecha}). Ofrece horarios desde hoy en adelante.` };

    const servicios = await cargarServicios(tid);
    const svc = matchServicio(servicios, input?.servicio_nombre);
    if (!svc) return { ok: false, motivo: 'Servicio no encontrado.', servicios_validos: servicios.map(s => s.nombre) };

    // Cinturón: servicio restringido por días (ej. una promoción de lunes a
    // jueves) JAMÁS se agenda fuera de sus días, aunque el modelo lo ofrezca.
    // Misma regla que la reserva pública. Mordió el 31-jul (viernes): el bot
    // ofreció "Corte Masculino (Promoción)" que es solo Lu-Ju.
    if (svc.dias && !svc.dias.includes(dowDe(fecha))) {
      return { ok: false, motivo: `"${svc.nombre}" solo está disponible los días: ${nombresDias(svc.dias)}. El ${fecha} cae ${DIAS[dowDe(fecha)]}: ofrece uno de sus días válidos u otro servicio del catálogo.` };
    }

    // Elegir profesional libre en ese slot exacto (misma regla que la agenda pública).
    const barb = await barberoLibreParaSlot(tid, fecha, hora, svc.duracion);
    if (!barb) return { ok: false, motivo: 'Esa hora ya no está disponible. Vuelve a consultar disponibilidad y ofrece otra.' };

    const codigo  = genCodigoCita();
    const lockId  = lockIdFor(barb.id, fecha, hora);
    const lockRef = slotLocksCol(tid).doc(lockId);
    const citaRef = citasCol(tid).doc();

    // Resolver clienteUid canónico ANTES del write (fuera de transacción
    // porque upsert usa .where() que no funciona dentro). Fallback silencioso:
    // si el CF falla, la cita se guarda sin uid y el trigger rescate la agarra.
    let clienteUidBot = null;
    try {
      const res = await upsertClienteCore({
        tenantId: tid,
        nombre,
        email:    '',
        telefono, // el bot siempre tiene el tel del cliente WhatsApp
      });
      clienteUidBot = res?.uid || null;
    } catch (e) {
      logger.warn(`[cerebro] upsertCliente falló para ${nombre}/${telefono} (fallback rescate):`, e?.message || e);
    }

    const citaData = {
      fecha,
      hora,
      clienteNombre:    nombre,
      clienteTelefono:  telefono,
      clienteTelefonoSuf9: String(telefono).replace(/\D/g, '').slice(-9), // para consultar_mis_citas + agenda
      clienteEmail:     '',
      ...(clienteUidBot ? { clienteUid: clienteUidBot, userId: clienteUidBot } : {}),
      servicioNombre:   svc.nombre,
      servicioId:       svc.id,
      duracionServicio: svc.duracion,
      precio:           svc.precio,
      barbero:          barb.nombre,
      barberoId:        barb.id,
      // Con confirmaciones activas la cita nace 'Pendiente' (ámbar) y pasa a
      // 'Confirmada' cuando el cliente responde CONFIRMAR. Sin el add-on, nace
      // confirmada como siempre (retrocompat). Excepción: cita para dentro de
      // <12h — el cliente la acaba de pedir en este mismo chat, no hay ciclo de
      // confirmación que corra → nace Confirmada (evita el ámbar eterno y el
      // "¿confirmas?" absurdo minutos después de reservar).
      estado:           (ctx.confirmacionesEnabled && faltanMin > 12 * 60) ? 'Pendiente' : 'Confirmada',
      nota:             '',
      origen:           'wa_bot',
      codigoCita:       codigo,
      slotLockId:       lockId,
      waOptIn:          true,
      creadoEn:         FieldValue.serverTimestamp(),
    };

    try {
      await db.runTransaction(async (tx) => {
        const ls = await tx.get(lockRef);
        if (ls.exists) { const e = new Error('slot-taken'); e.code = 'slot-taken'; throw e; }
        tx.set(lockRef, {
          citaId: citaRef.id, fecha, hora, barberoId: barb.id,
          duracion: svc.duracion, origen: 'wa_bot', creadoEn: FieldValue.serverTimestamp(),
        });
        tx.set(citaRef, citaData);
      });
    } catch (e) {
      if (e.code === 'slot-taken') {
        return { ok: false, motivo: 'Alguien tomó esa hora recién. Ofrece otra hora libre.' };
      }
      throw e;
    }

    logger.info(`[cerebro] ${tid}: cita agendada ${codigo} ${fecha} ${hora} (${svc.nombre} · ${barb.nombre})`);
    logBotNegocio(tid, 'agendada').catch(() => {});   // métrica de negocio para ops
    return {
      ok: true, codigo, fecha, hora,
      servicio: svc.nombre, precio: svc.precio, profesional: barb.nombre,
    };
  }

  return { error: `Herramienta desconocida: ${name}` };
}

/* ─────────────────────────── Prompt de sistema ─────────────────────────── */

// PROMPT CACHING: el system se divide en DOS bloques para que el prefijo
// estable (herramientas + identidad del local + reglas) se cachee y las
// llamadas del loop agéntico (2-4 por respuesta) + los turnos siguientes lo
// lean al 10% del precio. Lo VARIABLE (fecha, cliente, cita pendiente) va en
// un segundo bloque DESPUÉS del breakpoint — meterlo en el bloque fijo
// invalidaría el caché en cada cliente nuevo.
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Horario de atención del local, con la MISMA precedencia que el motor de
 *  disponibilidad (diasLaborales → diasConfig[dow] → horarioInicio/Fin), para
 *  que el bot no prometa un horario distinto al que la agenda respeta. */
function formatearHorario(conf) {
  const laborales = (Array.isArray(conf.diasLaborales) ? conf.diasLaborales : [1, 2, 3, 4, 5, 6]).map(Number);
  const dc = conf.diasConfig || {};
  const lineas = [];
  for (const dow of [1, 2, 3, 4, 5, 6, 0]) {
    if (!laborales.includes(dow)) { lineas.push(`- ${DIAS[dow]}: cerrado`); continue; }
    const dia = dc[dow] ?? dc[String(dow)] ?? null;
    if (dia && dia.activo === false) { lineas.push(`- ${DIAS[dow]}: cerrado`); continue; }
    const ini = (dia && dia.inicio) || conf.horarioInicio || '09:00';
    const fin = (dia && dia.fin)    || conf.horarioFin    || '20:00';
    lineas.push(`- ${DIAS[dow]}: ${ini} a ${fin}`);
  }
  if (conf.colacion && conf.colacion.inicio && conf.colacion.fin) {
    lineas.push(`- Cierre por colación todos los días: ${conf.colacion.inicio} a ${conf.colacion.fin}`);
  }
  return lineas.join('\n');
}

const clp = (n) => '$' + Number(n || 0).toLocaleString('es-CL');

/** Catálogo completo (con descripción) para que el bot NO gaste una ronda de
 *  herramienta en pedir algo que ya podemos entregarle escrito. */
function formatearCatalogo(servicios) {
  return servicios.map(s => {
    // La restricción de días viaja EN la línea del servicio: si viviera solo en
    // una regla general, un modelo chico la pierde justo cuando lista opciones.
    const soloDias = s.dias ? ` · SOLO ${nombresDias(s.dias)}` : '';
    const base = `- ${s.nombre} — ${clp(s.precio)} · ${s.duracion} min${soloDias}`;
    return s.descripcion ? `${base}\n  ${s.descripcion}` : base;
  }).join('\n');
}

// Manual de atención: es IDÉNTICO para todos los locales y no cambia nunca, así
// que vive dentro del prefijo cacheado (se escribe una vez por hora y se lee al
// 10%). Sube mucho la calidad de un modelo chico como Haiku: sin casuística
// explícita improvisa, y sin las reglas de formato escupe Markdown (`**texto**`)
// que WhatsApp muestra con los asteriscos a la vista.
const MANUAL_ATENCION = `
FORMATO DE WHATSAPP (importante, se ve feo si te equivocas):
- Negrita: UN solo asterisco a cada lado, *así*. NUNCA uses **doble asterisco**: WhatsApp no lo entiende y el cliente ve los asteriscos escritos.
- Cursiva: _así_. Tachado: ~así~.
- PROHIBIDO Markdown: nada de #, ##, tablas, bloques de código, ni [texto](enlace).
- Listas: usa un guion y espacio al principio de la línea. Máximo 5 ítems por mensaje.
- Los precios en pesos chilenos con punto de miles: $14.000 (nunca 14000 ni CLP 14.000).
- Las horas en formato 24h con dos puntos: 15:00 (nunca 3 PM ni 15 hrs).
- Mensajes cortos: 2 a 5 líneas. Si necesitas más, es señal de que estás explicando de más.

CÓMO OFRECER HORAS:
- Nunca vuelques la lista completa de horas libres. Ofrece 3 opciones bien espaciadas (por ejemplo temprano, mediodía y tarde) y pregunta cuál le acomoda.
- Si el cliente pide una hora exacta y está libre, confirma esa y no ofrezcas alternativas.
- Si la hora que pidió está ocupada, dilo en una línea y ofrece las 2 más cercanas: "Las 15:00 ya están tomadas. Tengo 14:20 o 16:00, ¿alguna te sirve?".
- Si no hay cupos en el día que pidió, ofrece el primer día con cupos y di qué día es.

CÓMO CONFIRMAR ANTES DE AGENDAR:
- Un solo mensaje corto con servicio, día, hora y precio, y una pregunta de cierre.
- No repitas ese resumen dos veces. Si el cliente ya dijo que sí, agenda: no vuelvas a preguntar.
- Trata como confirmación cualquier respuesta afirmativa clara: "sí", "dale", "confirmo", "ya", "perfecto", "listo".
- Cuando el cliente ya confirmó el resumen, llama a agendar_cita DE INMEDIATO. PROHIBIDO volver a consultar disponibilidad o re-preguntar la hora después de un "sí": eso se percibe como un loop y quema la paciencia del cliente (pasó el 31-jul: 4 vueltas para una hora ya confirmada).
- Si una hora aparece ocupada y el cliente insiste justo con esa hora, revisa consultar_mis_citas ANTES de ofrecer alternativas: muchas veces la hora está ocupada por SU PROPIA cita ya agendada. En ese caso díselo ("¡esa hora ya es tuya!") con su código, en vez de tratar de venderle otra.
- Para servicios largos (60 min o más), las horas de consultar_disponibilidad son referenciales: si agendar_cita rechaza dos horas seguidas, no sigas ofreciendo de la misma lista — deriva con pasar_con_humano.

RESERVAS PARA VARIAS PERSONAS (grupos):
- Pide UNA VEZ los datos: cuántas personas, el nombre de cada una y el servicio.
- Agenda con agendar_cita UNA LLAMADA POR PERSONA, cada una con su nombre. Pueden quedar a la MISMA hora (los atienden profesionales distintos si los hay).
- NUNCA asumas que la hora siguiente está libre: toda hora que ofrezcas o agendes debe haber salido de consultar_disponibilidad EN ESTA conversación.
- Cuando el cliente confirme el resumen del grupo, ejecuta TODAS las llamadas a agendar_cita de inmediato, una tras otra, SIN volver a consultar disponibilidad ni repreguntar. Después entrega el código de CADA persona en un solo mensaje.
- Si una de las citas del grupo falla (hora tomada), agenda las que sí resultaron, avisa cuál quedó fuera y ofrece la alternativa solo para esa persona.

CASOS QUE VAS A VER SEGUIDO:
- Pide un servicio que no existe en el catálogo: no lo inventes ni lo agendes. Di que no lo tienes y ofrece lo más parecido que sí esté en el catálogo.
- Pide dos servicios juntos: revisa si existe el combinado en el catálogo (suele salir más barato). Si existe, ofrécelo. Si no, agenda el principal y aclara que el otro lo conversa en el local.
- Dice "lo de siempre" o "lo mismo de la otra vez": no adivines. Usa consultar_mis_citas si tiene citas futuras; si no, pregunta cuál servicio quiere.
- No te dio su nombre y WhatsApp tampoco lo muestra: pídelo en una línea antes de agendar.
- Pregunta el precio de algo: respóndelo directo del catálogo, sin rodeos y sin ofrecer agendar en el mismo mensaje si no lo pidió.
- Pide descuento, regatea o pregunta por promociones: no inventes ni negocies. Di que los precios son los del catálogo y que cualquier convenio lo ve el equipo en el local.
- Pregunta por atención a domicilio, estacionamiento, medios de pago, wifi, si atienden niños o cualquier dato que no esté en este mensaje: NO inventes. Di que no manejas ese dato y que el equipo del local se lo confirma, o usa pasar_con_humano si insiste.
- Escribe con errores de tipeo, todo en mayúsculas o sin tildes: entiéndelo igual y responde normal. Nunca lo corrijas.
- Manda varios mensajes seguidos: responde a todo junto en un solo mensaje, no uno por cada uno.
- Pide una hora fuera del horario de atención: dilo con amabilidad, menciona el horario real de ese día y ofrece la hora más cercana que sí exista.
- Quiere cambiar de barbero o pide uno específico: no lo prometas. El sistema asigna al profesional disponible; dile que lo coordine al llegar al local.
- Está molesto, reclama o pide hablar con una persona: no intentes resolverlo tú. Llama a pasar_con_humano de inmediato y despídete en una línea.
- Se despide o agradece: responde corto y cálido, sin volver a ofrecer nada.

FECHAS Y AMBIGÜEDADES:
- "Hoy", "mañana" y "pasado mañana" se calculan siempre desde la fecha que te doy más abajo. Nunca supongas la fecha.
- Si dice un día de la semana ("el viernes"), asume el próximo que venga. Si hoy ES ese día y todavía hay horas, pregunta si se refiere a hoy o al de la próxima semana.
- Si dice "en la mañana", "al mediodía" o "en la tarde", tradúcelo a un rango razonable y ofrece horas dentro de ese rango.
- Si dice una hora sin minutos ("a las 4"), asume la del horario de atención que tenga sentido (16:00, no 04:00).
- Si la fecha o la hora quedan ambiguas, pregunta UNA sola vez y de forma concreta, con dos opciones.

DESPUÉS DE AGENDAR:
- Entrega el código de la reserva, el día, la hora y el servicio en un mensaje corto.
- No sigas ofreciendo servicios ni intentes vender más. La conversación terminó bien: cierra cálido y corto.
- Si después pide cambiar la hora o el día, usa el flujo de reagendar (consultar_mis_citas → consultar_disponibilidad → reagendar_cita). No la canceles para volver a agendarla.

SI ALGO FALLA:
- Si una herramienta devuelve un error o no encuentra lo que buscabas, NO se lo expliques con términos técnicos al cliente y no muestres mensajes de sistema.
- Discúlpate en una línea y ofrece la alternativa que sí tengas. Si no tienes ninguna, usa pasar_con_humano.
- Si el mismo problema se repite dos veces seguidas, deja de intentarlo y deriva con pasar_con_humano.
- Nunca inventes un código de reserva ni digas que agendaste si la herramienta no te confirmó que resultó.

CITAS PENDIENTES DE CONFIRMAR:
- Si te aviso que el cliente tiene una cita pendiente de confirmar, tu prioridad es esa: resolver si asiste o no.
- Cualquier señal de que sí va ("ahí estaré", "sí", "confirmo", "de todas maneras") es una confirmación.
- Cualquier señal de que no puede ("no voy a poder", "se me complicó", "cancélala") es una cancelación.
- Si el mensaje no tiene relación con la cita, atiéndelo normal y recién al final recuérdale en una línea que confirme.

LO QUE NUNCA DEBES HACER:
- Inventar precios, horas, servicios, promociones, nombres de profesionales o datos del local.
- Prometer algo que tus herramientas no pueden cumplir (cobrar, mandar fotos, reservar productos, garantizar un profesional).
- Agendar sin haber confirmado servicio, día y hora con el cliente.
- Pedir datos personales que no necesitas: solo el nombre. Nunca RUT, dirección, correo ni datos de pago.
- Decir que eres una inteligencia artificial salvo que te lo pregunten directo. Si te lo preguntan, dilo simple y sigue ayudando.
- Escribir párrafos largos, despedirte en cada mensaje o repetir el saludo si ya saludaste.

EJEMPLOS DEL TONO QUE QUEREMOS (adáptalos, no los copies literal):
Cliente: hola, tienen hora para hoy?
Tú: ¡Hola! 👋 Déjame revisar la agenda de hoy. ¿Qué servicio buscas?

Cliente: cuanto sale el corte
Tú: El *Corte Clásico* está en $14.000 (35 min) y el *Degradado* en $15.000 (40 min). ¿Te reservo alguno?

Cliente: si, el degradado mañana en la tarde
Tú: Perfecto. Para mañana en la tarde tengo 16:00, 17:20 y 18:40. ¿Cuál te acomoda?

Cliente: 17:20
Tú: Listo, te confirmo:
- *Servicio*: Corte Degradado
- *Cuándo*: mañana a las 17:20
- *Precio*: $15.000
¿Lo agendo?
`.trim();

function construirSystemFijo({ nombreLocal, direccion, telefonoLocal, estiloChileno, horario, catalogo, equipo, politicas }) {
  return [
    `Eres el asistente virtual de "${nombreLocal}", una barbería/peluquería en Chile. Atiendes a los clientes por WhatsApp.`,
    direccion ? `Dirección del local: ${direccion}.` : '',
    telefonoLocal ? `Teléfono del local: ${telefonoLocal}.` : '',
    '',
    horario ? `HORARIO DE ATENCIÓN:\n${horario}\n` : '',
    catalogo ? `CATÁLOGO DE SERVICIOS (estos son TODOS los que existen; los precios son finales):\n${catalogo}\n` : '',
    equipo ? `EQUIPO QUE ATIENDE:\n${equipo}\n` : '',
    politicas ? `POLÍTICAS DEL LOCAL:\n${politicas}\n` : '',
    'REGLAS:',
    '- Sé cálido, cercano y BREVE (es WhatsApp). Frases cortas, máximo 1–2 emojis.',
    // Estilo configurable por local (configuracion/whatsapp.estiloChileno).
    // Default = neutro (doctrina de copy externo de la plataforma).
    estiloChileno
      ? '- ESTILO CHILENO CERCANO: habla como un chileno amable. Puedes usar modismos suaves CHILENOS con moderación ("bacán", "al tiro", "ya po") — máximo UNO por mensaje y siempre entendible. SIN voseo escrito ("querís", "podís", "vos") ni groserías. PROHIBIDOS los modismos de otros países: nada mexicano ("te late", "órale", "ahorita", "padrísimo", "chido") ni rioplatense ("dale che", "querés", "tenés", "elegís"). La claridad manda: fechas, horas y precios siempre en lenguaje estándar.'
      : '- ESPAÑOL NEUTRO SIEMPRE: trato de "tú" con conjugación estándar (tienes, puedes, quieres, prefieres). PROHIBIDO el voseo en cualquier variante ("querís", "podís", "vos", "querés", "tenés", "elegís") y los modismos REGIONALES DE CUALQUIER PAÍS: ni chilenos ("bacán", "al tiro", "cachai", "po"), ni mexicanos ("te late", "órale", "ahorita", "padrísimo", "chido"), ni argentinos ("che", "dale che"), ni de ningún otro. En vez de "¿cuál te late?" di "¿cuál prefieres?". Escribe claro y universal, como para cualquier país hispanohablante.',
    '- Tu único trabajo es informar del local y agendar/gestionar citas. Si preguntan otra cosa, redirige con amabilidad.',
    '- NUNCA inventes precios ni servicios: los del CATÁLOGO de arriba son los únicos que existen y ya los tienes completos, no necesitas ninguna herramienta para consultarlos.',
    '- Si un servicio del catálogo dice "SOLO <días>", existe ÚNICAMENTE esos días: no lo ofrezcas ni lo agendes para ningún otro día. Antes de listar opciones, descarta los que no correspondan al día que pide el cliente; si insiste en ese servicio otro día, explica la restricción y ofrece su día válido más próximo u otro servicio.',
    '- NUNCA inventes horas libres: sácalas SIEMPRE de consultar_disponibilidad. El HORARIO DE ATENCIÓN te dice cuándo abre el local, no qué horas quedan libres.',
    '- Antes de agendar, confirma con el cliente el servicio, la fecha y la hora en un mensaje corto.',
    '- Solo llama a agendar_cita con una hora que haya salido de consultar_disponibilidad.',
    '- Si el nombre del cliente ya lo sabes por WhatsApp, úsalo; si no, pídelo antes de agendar.',
    '- Al agendar con éxito, dale el código de la reserva y recuérdale día, hora y servicio.',
    '- NUNCA inventes un código de reserva: el único código válido es el que te devuelve la herramienta en el campo `codigo`. Si no tienes ese campo, no menciones ningún código.',
    '- REGLA DE ORO — nada de cambios imaginarios: JAMÁS afirmes que agendaste, cancelaste o cambiaste una cita si no llamaste a la herramienta correspondiente y te respondió ok:true. Nada de "listo", "ya te lo cambié" ni "quedó agendado" por adelantado. Si la herramienta falla o no la llamaste, dile la verdad al cliente u ofrécele hablar con el local. Prometer un cambio que no ocurrió es el peor error posible: el cliente llega y su hora no existe.',
    '- Si una hora ya no está disponible, discúlpate y ofrece las alternativas reales que devuelva la herramienta.',
    '- Si el cliente pregunta por su cita, o quiere CANCELARLA: usa consultar_mis_citas, confirma con él de cuál se trata y recién entonces llama a cancelar_cita.',
    '- SI EL CLIENTE DICE QUE YA TIENE HORA Y NO LA ENCUENTRAS: consultar_mis_citas busca por el número desde el que te escribe, así que si reservó en la web con OTRO teléfono no aparece — es lo más común y NO es una falla. Pídele su nombre y la fecha y llama a verificar_reserva. JAMÁS le digas que su reserva "no se sincronizó", que "hubo un inconveniente" ni nada que sugiera que el sistema falló: no tienes cómo saber eso y lo asustas. Y NUNCA le ofrezcas agendar de nuevo sin haber verificado: terminaría con DOS citas.',
    '- Si quiere CAMBIAR la hora o el día de su cita (adelantar, atrasar, moverla): consultar_mis_citas → consultar_disponibilidad → reagendar_cita. NO la canceles para volver a agendarla: reagendar_cita la mueve conservando su código. Solo después de recibir ok:true confírmale el cambio.',
    '- Si el cliente pide hablar con una persona, tiene un reclamo o pide algo que tus herramientas no cubren (pagos, cotizaciones especiales, convenios), llama a pasar_con_humano y despídete corto: el equipo del local seguirá la conversación.',
    '- Si pide agendar para una fecha que ya pasó, acláralo con amabilidad y ofrece fechas desde hoy.',
    '- No prometas nada fuera de las herramientas (no cobras online, no cambias precios, no confirmas cosas del local que no sepas).',
    '',
    MANUAL_ATENCION,
  ].filter(Boolean).join('\n');
}

/**
 * Arma TODO el prefijo cacheable de un local: el bloque fijo del system + la
 * lista de herramientas. Es la única fuente de verdad — la usa el bot en
 * producción y también el guard `scripts/check-bot-prompt.js`, que mide sus
 * tokens y falla si el local queda bajo CACHE_MIN_TOKENS (si se desincronizaran
 * mediríamos un prompt y enviaríamos otro).
 */
async function armarContextoLocal(tid, { estiloChileno = false } = {}) {
  const [tenantSnap, confSnap, servicios, equipo] = await Promise.all([
    db.doc(`tenants/${tid}`).get(),
    configRef(tid).get(),
    cargarServicios(tid).catch(() => []),
    cargarEquipo(tid).catch(() => []),
  ]);
  const tdoc = tenantSnap.data() || {};
  const conf = confSnap.data() || {};

  const politicas = [
    conf.chatCancelEnabled === false
      ? '- Las cancelaciones NO se gestionan por chat: el cliente debe comunicarse directamente con el local.'
      : '- El cliente puede cancelar su cita por este chat.',
    Number(conf.minutosLimiteReagendar) > 0
      ? `- Para cancelar o cambiar una cita se piden al menos ${Math.round(Number(conf.minutosLimiteReagendar) / 60)} hora(s) de anticipación. Sobre la hora, tiene que hablar directo con el local.`
      : '',
    String(conf.politicaMensaje || '').trim() ? `- ${String(conf.politicaMensaje).trim()}` : '',
  ].filter(Boolean).join('\n');

  const systemFijo = construirSystemFijo({
    nombreLocal: tdoc.nombre || tdoc.nombreCorto || tid,
    // Dirección y teléfono a veces viven en el doc del tenant y a veces en
    // configuracion/main (sion los tenía SOLO en conf y el bot no los sabía).
    direccion:     tdoc.direccion || conf.direccion || '',
    telefonoLocal: tdoc.telefono  || conf.telefono || conf.telefonoAdmin || '',
    estiloChileno,
    horario:  formatearHorario(conf),
    catalogo: servicios.length ? formatearCatalogo(servicios) : '',
    equipo:   equipo.length ? equipo.map(b => `- ${b.nombre}${b.especialidad ? ` (${b.especialidad})` : ''}`).join('\n') : '',
    politicas,
  });

  // Con el catálogo ya escrito en el system, consultar_servicios sobra: dejarla
  // solo invita al modelo a gastar una llamada en datos que ya tiene. Se
  // mantiene como red de seguridad si el catálogo no se pudo cargar.
  const toolsBase = servicios.length ? TOOLS.filter(t => t.name !== 'consultar_servicios') : TOOLS;

  return { systemFijo, toolsBase, servicios, equipo };
}

// Bloque variable: cambia por día y por cliente — queda FUERA del caché.
//
// El calendario va MASTICADO (día de la semana de hoy y de los próximos 7):
// los LLM son notoriamente malos convirtiendo fecha→día de la semana, y el
// 02-08-2026 el bot de kronnos_penablanca bautizó al lunes 3 como "domingo",
// le aplicó el horario dominical y le negó al cliente una hora de las 10:30
// que SÍ existía (el lunes abren justo a las 10:30). Con la tabla explícita
// el modelo no tiene que calcular nada — y se le prohíbe intentarlo.
const { lineasCalendario } = require('../lib/calendario');
function construirSystemVariable({ fechaHoy, pushName, telefono }) {
  return [
    ...lineasCalendario(fechaHoy),
    `El cliente escribe desde el número ${telefono}${pushName ? ` y en WhatsApp aparece como "${pushName}"` : ''}.`,
  ].join('\n');
}

/* ─────────────────────────── Loop agéntico ─────────────────────────── */

async function pensarYResponder({ anthropicKey, systemFijo, systemVariable, historia, texto, ctx, tools }) {
  const client = new Anthropic({ apiKey: anthropicKey });
  const messages = [...historia, { role: 'user', content: texto }];

  // Prompt caching: breakpoint al final del bloque fijo → el prefijo
  // (tools + identidad + horario + catálogo + equipo + reglas + manual) se
  // escribe una vez y se lee al 10% en las llamadas del loop, en los turnos
  // siguientes y en las conversaciones que vengan después en el mismo local.
  //
  // TTL de 1 HORA a propósito, no los 5 min por defecto: en WhatsApp el cliente
  // se demora en contestar y con 5 min el caché se vencía a media conversación
  // y volvíamos a pagar la escritura completa en cada turno. Escribir a 2× una
  // vez por hora sale MUCHO más barato que escribir a 1.25× cuatro veces por
  // conversación, y además el prefijo se comparte entre clientes del local.
  const system = [
    { type: 'text', text: systemFijo, cache_control: { type: 'ephemeral', ttl: '1h' } },
    { type: 'text', text: systemVariable },
  ];

  let finalText = '';
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const resp = await client.messages.create({
      model: MODEL, max_tokens: MAX_TOKENS, system, tools: tools || TOOLS, messages,
    });
    logAiUsage(MODEL, resp.usage || {}, ctx?.tid).catch(() => {}); // métrica ops (global + por tenant)
    messages.push({ role: 'assistant', content: resp.content });

    if (resp.stop_reason === 'tool_use') {
      const results = [];
      for (const block of resp.content) {
        if (block.type !== 'tool_use') continue;
        let out;
        try { out = await ejecutarTool(block.name, block.input, ctx); }
        catch (e) { logger.error(`[cerebro] tool ${block.name}:`, e.message); out = { error: 'Fallo interno al ejecutar la acción.' }; }
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(out) });
      }
      messages.push({ role: 'user', content: results });
      continue;
    }

    finalText = resp.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    break;
  }
  return finalText || 'Perdona, ¿me repites eso? 🙏';
}

/* ─────────────────────────── Entrada pública ─────────────────────────── */

/**
 * Punto de entrada desde evolutionWebhook para eventos messages.upsert.
 * @param {object} p
 * @param {string} p.tid          tenant (derivado de instance_{tid})
 * @param {object} p.body         payload crudo del webhook de Evolution
 * @param {object} p.evoClient    cliente Evolution ya construido (con secrets)
 * @param {string} p.anthropicKey ANTHROPIC_API_KEY.value()
 */
async function procesarMensajeEntrante({ tid, body, evoClient, anthropicKey }) {
  const data      = body?.data || {};
  const key       = data.key || {};
  let   remoteJid = String(key.remoteJid || '');
  // LID: WhatsApp puede dirigir un chat con un id de privacidad (…@lid) y el
  // número real viaja en `remoteJidAlt`. Sin este mapeo el silencio
  // anti-colisión caía en un doc @lid huérfano mientras los mensajes del
  // MISMO cliente seguían llegando a su doc por número: el equipo tomaba el
  // control y el bot igual se metía (visto en kronnos_penablanca, 31-jul).
  const jidAlt = String(key.remoteJidAlt || key.senderPn || '');
  if (remoteJid.endsWith('@lid') && jidAlt.endsWith('@s.whatsapp.net')) remoteJid = jidAlt;
  const fromMe    = key.fromMe === true;
  const msgId     = String(key.id || '');

  // ── Filtros de seguridad ──
  if (!remoteJid) return;
  if (remoteJid.endsWith('@g.us')) return;              // grupos: no
  if (remoteJid === 'status@broadcast') return;         // estados: no

  const telefono = remoteJid.replace(/[:@].*$/, '');    // dígitos para responder/guardar
  const chatId   = telefono;                            // doc id de la conversación
  const ref      = convRef(tid, chatId);

  // ── Gating: conectado siempre; luego bot conversacional Y/O confirmaciones ──
  const waCfg = (await waCfgRef(tid).get()).data() || {};
  if (waCfg.estadoConexion !== 'connected') return;
  // El PLAN manda sobre el switch. Las reglas impiden que el local encienda un
  // módulo que no contrató, pero no revisan el pasado: si a un tenant se le
  // baja de 'full' a 'recordatorios', su `botEnabled` sigue en true en el doc.
  // Sin este AND, el bot seguiría contestando algo que ya no está pagado.
  const sys    = (await db.doc(`_system/${tid}`).get()).data() || {};
  const botOn  = waCfg.botEnabled === true && incluyeBot(sys);
  const confOn = waCfg.confirmacionesEnabled === true && incluyeRecordatorios(sys);
  if (!botOn && !confOn) return;

  // ── ANTI-COLISIÓN (Sprint 4): mensajes SALIENTES (fromMe) ──
  //   · Eco de un mensaje que enviamos NOSOTROS (bot/confirmación) → ignorar.
  //   · Si no, el DUEÑO escribió a mano desde su celular → "efecto fantasma":
  //     silenciamos el bot 2h en ESE chat para no pisarle la conversación.
  if (fromMe) {
    const conv = (await ref.get()).data() || {};
    const botIds = Array.isArray(conv.botMsgIds) ? conv.botMsgIds : [];
    if (msgId && botIds.includes(msgId)) return;         // eco propio → nada
    // Gracia anti-carrera: si NOSOTROS enviamos algo hace <15s, este eco es
    // casi seguro nuestro aunque su id aún no alcanzara a persistirse (el
    // webhook del eco puede ganarle a la escritura). Sin esta gracia, el bot
    // se silenciaba 2h a sí mismo por su propia respuesta. Costo: una toma de
    // control humana en esos mismos 15s no silencia — el siguiente mensaje
    // del dueño (>15s) sí lo hace.
    if (Date.now() - millis(conv.lastBotSendAt) < 15_000) return;
    await ref.set({
      botSilencedUntil: Timestamp.fromMillis(Date.now() + SILENCIO_MS),
      remoteJid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => {});
    logger.info(`[cerebro] ${tid} chat=${chatId}: el dueño tomó el control → bot en silencio 2h`);
    return;
  }

  // ── Mensaje ENTRANTE del cliente (fromMe:false) ──
  // Baileys envuelve efímeros/ver-una-vez un nivel: desenvolver antes de leer.
  let msg = data.message || {};
  msg = msg.ephemeralMessage?.message || msg.viewOnceMessage?.message
     || msg.viewOnceMessageV2?.message || msg;
  const texto = String(
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??      // foto con texto → al menos leemos el texto
    msg.videoMessage?.caption ??
    '',
  ).trim();
  // Medios que merecen respuesta amable en vez de silencio (un cliente que
  // manda un AUDIO y no recibe nada percibe el canal como muerto). Reacciones,
  // stickers y mensajes de protocolo (editar/borrar) sí se ignoran en silencio.
  const esAudio = !!msg.audioMessage;
  const esMedia = esAudio || !!msg.imageMessage || !!msg.videoMessage
    || !!msg.documentMessage || !!msg.documentWithCaptionMessage
    || !!msg.locationMessage || !!msg.contactMessage || !!msg.contactsArrayMessage;
  if (!texto && !esMedia) return;                       // reacciones/stickers/protocolo: nada
  const pushName = String(data.pushName || '').trim();

  // Lo que "vio" el modelo y lo que guardamos en la memoria del chat.
  const textoClaude = (esMedia && texto)
    ? `${texto}\n\n[Nota: el cliente adjuntó ${esAudio ? 'un audio' : 'una imagen o archivo'} que NO puedes ver ni escuchar. Si es relevante, pídele que lo describa en texto.]`
    : texto;
  const textoHistoria = textoClaude
    || (esAudio ? '[el cliente envió un audio]' : '[el cliente envió una imagen o archivo]');

  // ── Dedup transaccional: reclama el mensaje antes del trabajo lento ──
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? (snap.data() || {}) : {};
    if (prev.lastMsgId && prev.lastMsgId === msgId) return false;   // reintento → skip
    tx.set(ref, { lastMsgId: msgId, remoteJid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
  if (!claimed) return;

  // Doble check azul: barato y humaniza el perfil del número (un WhatsApp que
  // contesta pero jamás marca leído es raro). Fire-and-forget: si falla, da
  // exactamente lo mismo — no puede frenar la respuesta.
  evoClient.marcarLeido(`instance_${tid}`, [{ remoteJid, fromMe: false, id: msgId }])
    .catch(() => {});

  // ── Estado de la conversación (memoria + cita pendiente + silencio del bot) ──
  const convSnap = await ref.get();
  const convData = convSnap.data() || {};
  const historia = Array.isArray(convData.messages) ? convData.messages : [];
  const citaPendiente = convData.citaPendiente || null;
  const silenciado = millis(convData.botSilencedUntil) > Date.now();
  const botActivo = botOn && !silenciado;               // ¿responde el bot conversacional?
  const hoyChile = ahoraChile().fecha;
  const respHoy = (convData.respDia && convData.respDia.fecha === hoyChile)
    ? (Number(convData.respDia.n) || 0) : 0;            // respuestas ya enviadas hoy en ESTE chat

  const sentIds = [];
  const responder = async (txt) => {
    let ok = false;
    try {
      const r = await evoClient.enviarTexto(`instance_${tid}`, telefono, txt);
      const id = r && r.key && r.key.id;
      if (id) sentIds.push(String(id));                 // registrar nuestro eco (anti-colisión)
      // El id del eco se registra AL TIRO (no solo en persistir(), que corre
      // después): el webhook del eco fromMe puede llegar antes que esa
      // persistencia y, sin el id en botMsgIds, la anti-colisión leería
      // nuestro propio mensaje como "el dueño escribió" → silencio de 2h
      // autoinfligido. lastBotSendAt alimenta la gracia anti-carrera de arriba.
      await ref.set({
        ...(id ? { botMsgIds: FieldValue.arrayUnion(String(id)) } : {}),
        lastBotSendAt: FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => {});
      ok = true;
    } catch (e) { logger.error(`[cerebro] ${tid} enviar:`, e.message); }
    await logWaSend(tid, 'bot', ok).catch(() => {});    // métrica para el dashboard ops
    await registrarSaliente(tid, { tipo: 'bot', ok }); // cuota anti-ban: el contador es UNO para bot + confirmaciones
  };
  const persistir = async (respuesta) => {
    const nuevaHistoria = [
      ...historia,
      { role: 'user', content: textoHistoria },
      { role: 'assistant', content: respuesta },
    ].slice(-MAX_ARCHIVO);
    const botMsgIds = [...(Array.isArray(convData.botMsgIds) ? convData.botMsgIds : []), ...sentIds].slice(-20);
    await ref.set({
      messages:      nuevaHistoria,
      botMsgIds,
      respDia:       { fecha: hoyChile, n: respHoy + 1 },  // tope diario anti-troll
      clienteNombre: pushName || convData.clienteNombre || '',
      remoteJid,
      updatedAt:     FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => {});

    /* Unidad de cobro del plan. Abre la ventana de 24 h de ESTE chat si estaba
       vencida y suma la conversación al mes, todo en UNA transacción sobre el
       doc del chat.

       Antes era `if (respHoy === 0) registrarConversacion(tid)`: un increment
       suelto que dependía de un snapshot leído mucho antes de responder. Dos
       mensajes seguidos del mismo cliente —"hola" + "quiero hora", lo normal en
       WhatsApp— llegan como dos webhooks concurrentes, los dos veían
       `respDia.n = 0` y los dos sumaban: una conversación cobrada dos veces.
       La transacción usa el propio doc del chat como candado, así que ahora es
       exactamente-una-vez por construcción.

       Se sigue llamando a registrarConversacion() para no romper el tope diario
       de cuota.js, que aún cuenta por día calendario. */
    const { nueva } = await abrirConversacion(tid, ref, chatId);
    if (nueva) registrarConversacion(tid).catch(() => {});
    // Volumen del mes: lo entrante mide demanda real (nunca se había medido) y
    // lo saliente, qué tan cerca está el número del techo anti-ban.
    registrarMensajes(tid, { entrantes: 1, salientes: 1 }).catch(() => {});
  };

  // ── BAJA / REACTIVACIÓN (va PRIMERO que todo lo demás) ──
  //  Corre aunque el bot conversacional esté apagado o silenciado: el caso
  //  crítico es justamente el local que solo tiene confirmaciones activas y
  //  cuyo cliente responde "no me escriban más" — antes eso no tenía ningún
  //  efecto y el cron le seguía escribiendo al día siguiente. El registro va
  //  al libro GLOBAL /wa_optout, así que también frena el canal oficial.
  if (texto && detectarStop(texto)) {
    await registrarOptOut(telefono, `stop-evolution-${tid}`).catch(e =>
      logger.error(`[cerebro] ${tid} optout ${telefono}:`, e.message));
    // Se limpia la cita pendiente: si no, el cron sigue esperando una
    // respuesta que ya no va a llegar.
    await ref.update({ citaPendiente: FieldValue.delete() }).catch(() => {});
    // Contador por local para ops: la TASA de bajas es el indicador adelantado
    // del ban. Meta no avisa antes de suspender — lo que sube primero es la
    // gente pidiendo baja y bloqueando.
    logBotNegocio(tid, 'optout').catch(() => {});
    logger.info(`[cerebro] ${tid} chat=${chatId}: BAJA registrada (opt-out global)`);
    // Un único acuse y silencio. Confirmar la baja no es spam: es lo que evita
    // que la persona use "Bloquear", que es lo que de verdad quema el número.
    if (!silenciado) {
      const reply = 'Listo, no te escribiremos más por WhatsApp. 🙏 Si algún día quieres volver a recibir los recordatorios de tus citas, respóndenos *REACTIVAR*.';
      await responder(reply);
      await persistir(reply);
    }
    return;
  }
  if (texto && detectarReactivar(texto)) {
    await registrarOptIn(telefono, `reactivar-evolution-${tid}`).catch(() => {});
    logger.info(`[cerebro] ${tid} chat=${chatId}: reactivación registrada`);
    if (!silenciado) {
      const reply = '¡Listo! Volverás a recibir los recordatorios de tus citas por acá. 🙌';
      await responder(reply);
      await persistir(reply);
    }
    return;
  }

  // ── FAST-PATH de confirmación: CONFIRMAR / CANCELAR (aplica aunque el bot esté silenciado) ──
  if (confOn && citaPendiente) {
    const decision = detectarDecision(texto);
    if (decision) {
      await aplicarDecision(tid, chatId, citaPendiente.citaId, decision);
      const reply = decision === 'confirmar'
        ? '¡Listo! Tu cita quedó *confirmada* ✅ Te esperamos. 🙌'
        : 'Tu cita quedó *cancelada*. ¡Gracias por avisar! Cuando quieras, escríbeme y agendamos de nuevo. 🙏';
      await responder(reply);
      await persistir(reply);
      logger.info(`[cerebro] ${tid} chat=${chatId} confirmación=${decision} (fast-path)`);
      return;
    }
    // Ambiguo: si el bot conversacional NO está activo, nudge (solo si no está silenciado) y cortar.
    if (!botActivo) {
      if (!silenciado) {
        const reply = 'Para tu cita, por favor responde *CONFIRMAR* o *CANCELAR* 🙏';
        await responder(reply);
        await persistir(reply);
      }
      return;
    }
    // Con bot conversacional activo seguimos: Claude maneja la respuesta ambigua con contexto.
  }

  if (!botActivo) return;   // bot apagado o silenciado (dueño al mando) → no respondemos

  // ── Teclado en el bolsillo: se contesta 2 veces y después silencio ──
  // Mismo criterio que el agente de ventas (lib/texto-ilegible): un cliente
  // con el teléfono en el bolsillo se comía respuestas del cupo del local y
  // salientes del número. El contador se resetea con el primer mensaje
  // entendible, así que retomar la conversación no cuesta nada.
  {
    const ilegible = pareceIlegible(texto);
    const previos  = Number(convData.ilegiblesSeguidos) || 0;
    if (ilegible && previos >= MAX_ILEGIBLES) {
      await ref.set({ ilegiblesSeguidos: previos + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
      logger.info(`[cerebro] ${tid} chat=${chatId}: ${previos + 1} ilegibles seguidos; no respondo`);
      return;
    }
    await ref.set({
      ilegiblesSeguidos: ilegible ? previos + 1 : 0,
    }, { merge: true }).catch(() => {});
  }

  // ── Tope diario por chat (anti-troll / anti-loop): tras avisar UNA vez, mudo ──
  if (respHoy >= MAX_RESP_CHAT_DIA) {
    if (respHoy === MAX_RESP_CHAT_DIA) {
      const reply = 'Por hoy te dejo con el equipo del local para seguir ayudándote 🙏 Si es urgente, contáctalos directamente.';
      await responder(reply);
      await persistir(reply);   // deja respDia en tope+1 → los siguientes ni avisan
    }
    logger.warn(`[cerebro] ${tid} chat=${chatId}: tope diario de respuestas (${MAX_RESP_CHAT_DIA}) alcanzado`);
    return;
  }

  // ── Tope de CONVERSACIONES del día para TODO el local ──
  // El tope de arriba es por chat (anti-troll); este es del local completo y
  // es comercial: acota el gasto de IA y es lo que se le vende ("hasta N
  // conversaciones al día"). Cuenta chats, no mensajes: una conversación que
  // ya empezó sigue atendiéndose hasta el final aunque se toque el tope —
  // cortar a mitad de un agendamiento sería peor que no haber contestado.
  //
  // "Ya empezó" se define por la VENTANA DE 24 H del chat (lib/wa-uso.js), no
  // por el día calendario: si no, un cliente que escribe a las 23:50 y cierra
  // su hora a las 00:10 cuenta —y se le cobra al local— como dos.
  const convNueva = !ventanaAbierta(convData);
  if (convNueva) {
    const limiteConv = limiteConversaciones(sys, waCfg);
    if (limiteConv > 0 && (await conversacionesHoy(tid)) >= limiteConv) {
      logger.warn(`[cerebro] ${tid}: tope de ${limiteConv} conversaciones del día alcanzado; chat=${chatId} sin atender`);
      // Se anota QUÉ no se atendió y por qué: un local con rechazos es un local
      // que necesita un plan más grande, y eso vivía solo en este log.
      registrarRechazo(tid, 'tope_conversaciones', chatId).catch(() => {});
      return;
    }
  }

  /* ── Tope ANTI-BAN de salientes del número (el que mira Meta) ─────────────
     cuota.js dice que "el contador es UNO para bot + confirmaciones", pero el
     bot solo lo INCREMENTABA: nunca lo consultaba. Un número recién vinculado
     (tope 40/día) podía emitir cientos de respuestas y quemarse, y de paso
     dejaba sin cupo a las confirmaciones —que sí respetan el tope— sin que
     nadie entendiera por qué. Auditoría del 03-08-2026.

     Va DESPUÉS del tope de conversaciones y ANTES de gastar Claude: si no se
     puede enviar, tampoco tiene sentido pagar la respuesta. Se avisa UNA vez
     al llegar (para que el cliente no quede hablando solo) y ese aviso también
     cuenta como saliente, así que no hay bucle.

     Falla-abierto igual que el resto de la cuota: si Firestore no responde,
     salientesHoy devuelve 0 y se atiende — mejor responder que quedar mudo por
     un hipo de red. */
  const capSalientes = capDiario(waCfg);
  const salientes    = await salientesHoy(tid);
  if (capSalientes > 0 && salientes >= capSalientes) {
    if (salientes === capSalientes) {
      const aviso = 'Por hoy ya no puedo seguir respondiendo por acá 🙏 El equipo del local te contesta apenas pueda.';
      await responder(aviso);
      await persistir(aviso);
    }
    logger.warn(`[cerebro] ${tid}: tope ANTI-BAN de salientes alcanzado (${salientes}/${capSalientes}); chat=${chatId} sin atender`);
    registrarRechazo(tid, 'tope_antiban', chatId).catch(() => {});
    return;
  }

  // ── Medios SIN texto (audio/foto/documento): respuesta amable sin pasar por
  //    Claude. Máx. 1 aviso cada 10 min (5 audios seguidos ≠ 5 avisos). ──
  if (!texto) {
    if (millis(convData.mediaAvisoAt) <= Date.now() - 10 * 60_000) {
      const reply = esAudio
        ? 'Por ahora no puedo escuchar audios 🙏 ¿Me lo escribes en un mensaje de texto?'
        : 'Por ahora solo puedo leer mensajes de texto 🙏 ¿Me escribes tu consulta?';
      await responder(reply);
      await ref.set({ mediaAvisoAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
      await persistir(reply);
    }
    return;
  }

  // ── Contexto del local (una sola función, compartida con el guard
  //    scripts/check-bot-prompt.js para que lo que medimos sea lo que se envía) ──
  const { systemFijo, toolsBase } = await armarContextoLocal(tid, {
    estiloChileno: waCfg.estiloChileno === true,
  });
  let systemVariable = construirSystemVariable({ fechaHoy: hoyChile, pushName, telefono });
  if (citaPendiente) {
    systemVariable += `\n\nIMPORTANTE: Este cliente tiene una cita PENDIENTE de confirmar: ${citaPendiente.servicio || 'servicio'} el ${citaPendiente.fecha} a las ${citaPendiente.hora}. Si su mensaje indica que asistirá, llama a gestionar_confirmacion con decision:"confirmar". Si indica que no podrá o quiere cancelar, llama con decision:"cancelar". Luego responde corto y cálido.`;
  }
  const tools = citaPendiente ? [...toolsBase, GESTION_CONFIRMACION_TOOL] : toolsBase;

  // ── Tope de gasto ──
  // Se revisa acá y no en el gate de arriba a propósito: arriba también pasan
  // las CONFIRMACIONES, que se resuelven con una expresión regular y no cuestan
  // IA. Cortarlas por un tope de tokens sería cambiar plata por citas perdidas.
  // Solo se apaga el bot conversacional, que es lo que gasta.
  const presupuesto = await puedeGastar(tid, sys);
  if (!presupuesto.ok) {
    // Una sola vez por conversación: repetirlo en cada mensaje es spam, y el
    // cliente ya entendió a la primera que no le va a contestar un robot.
    const conv = (await ref.get()).data() || {};
    if (!conv.avisoTopeIaAt) {
      await responder('Gracias por escribir 🙌 En este momento no puedo responderte automáticamente, ' +
        'pero tu mensaje quedó registrado y te contactamos a la brevedad.');
      await ref.set({ avisoTopeIaAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
    }
    logger.warn(`[cerebro] ${tid}: tope de gasto ${presupuesto.motivo} alcanzado ` +
      `(día $${presupuesto.gastoDia?.toFixed(4)}/$${presupuesto.topeDia} · ` +
      `mes $${presupuesto.gastoMes?.toFixed(4)}/$${presupuesto.topeMes}) → bot en pausa`);
    return;
  }

  // ── Pensar ──
  let respuesta;
  try {
    respuesta = await pensarYResponder({
      anthropicKey, systemFijo, systemVariable,
      // Al modelo solo los últimos turnos: el archivo es más largo (auditoría).
      historia: historia.slice(-MAX_HISTORIA),
      texto: textoClaude, tools,
      ctx: { tid, telefono, pushName, confirmacionesEnabled: confOn, chatId, citaPendiente },
    });
  } catch (e) {
    logger.error(`[cerebro] ${tid} pensar:`, e.message);
    return; // sin respuesta antes que una respuesta rota
  }

  await responder(respuesta);
  await persistir(respuesta);
  logger.info(`[cerebro] ${tid} chat=${chatId} respondido (${respuesta.length} chars)`);
}

module.exports = { procesarMensajeEntrante };

// Para tests locales y para el guard scripts/check-bot-prompt.js (Admin SDK):
// no es parte del API público.
module.exports._ejecutarTool        = ejecutarTool;
module.exports._cargarServicios     = cargarServicios;
module.exports._cargarEquipo        = cargarEquipo;
module.exports._armarContextoLocal  = armarContextoLocal;
module.exports._MODEL               = MODEL;
// Reutilizados por evolution/plataforma.js (canal del numero SynapTech): la
// semantica de CONFIRMAR/CANCELAR tiene que ser UNA sola, o el mismo 'si'
// significa cosas distintas segun por que numero entro la respuesta.
module.exports._detectarDecision    = detectarDecision;
module.exports._aplicarDecision     = aplicarDecision;
module.exports._CACHE_MIN_TOKENS    = CACHE_MIN_TOKENS;
