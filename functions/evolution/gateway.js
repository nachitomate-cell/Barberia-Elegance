'use strict';

// functions/evolution/gateway.js
// ─────────────────────────────────────────────────────────────────────────────
//  GATEWAY multi-tenant del add-on "Asistente IA 24/7 + Confirmaciones".
//  4 Cloud Functions que gobiernan la vinculación por QR sobre el número PROPIO
//  de cada local (Evolution API, ver /evolution + functions/evolution/client.js).
//
//    · evolutionVincular    (callable)  crea instance_{tid} + devuelve QR
//    · evolutionEstado      (callable)  polling del modal; detecta "connected"
//    · evolutionDesvincular (callable)  destruye la sesión (control 100% manual)
//    · evolutionWebhook     (onRequest) pararrayos del VPS → rutea al cerebro (S2)
//
//  Esquema:  tenants/{tid}/configuracion/whatsapp
//    { instanceName, numeroVinculado, estadoConexion:'disconnected'|'qr'|'connected',
//      botEnabled, tycAceptado, tycAceptadoEn, recordatorio:{ ventanaHoras } }
//
//  Config híbrida: este canal (Evolution) NO toca el número oficial de Meta
//  (whatsapp-notif.js), que queda para el aviso al dueño. Aislamiento de riesgo.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const { FieldValue }                    = require('firebase-admin/firestore');
const { crearCliente }                  = require('./client');
const { procesarMensajeEntrante }       = require('./cerebro');
const { tienePlan }                     = require('../lib/wa-plan');
const plataforma                        = require('./plataforma');

const db = admin.firestore();

const EVOLUTION_API_URL       = defineSecret('EVOLUTION_API_URL');
const EVOLUTION_API_KEY       = defineSecret('EVOLUTION_API_KEY');
const EVOLUTION_WEBHOOK_TOKEN = defineSecret('EVOLUTION_WEBHOOK_TOKEN');
const ANTHROPIC_API_KEY       = defineSecret('ANTHROPIC_API_KEY');

const BOOTSTRAP_EMAILS = ['ignaciiio.mate@gmail.com'];
// URL pública de ESTA función (a la que apunta cada instancia del VPS).
const WEBHOOK_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/evolutionWebhook';

/* ─────────────────────────── Helpers ─────────────────────────── */

function cliente() {
  return crearCliente({ baseUrl: EVOLUTION_API_URL.value(), apiKey: EVOLUTION_API_KEY.value() });
}

function waCfgRef(tid) {
  return db.doc(`tenants/${tid}/configuracion/whatsapp`);
}

/* Por qué se cerró la sesión.
   Hasta ahora se guardaba QUE se cayó pero no POR QUÉ, y esa es toda la
   diferencia entre "se fue el wifi, vuelve sola" y "WhatsApp cerró la sesión,
   hay que escanear el QR de nuevo". Sin el código no se puede avisar distinto,
   y avisar igual de las dos cosas entrena a ignorar el aviso.

   Baileys lo manda en distintos sitios según la versión de Evolution, así que
   se buscan todos y gana el primero que aparezca. Si no viene ninguno se
   guarda `null` y el que avise lo tratará como caída común — nunca se inventa
   un código, porque un 401 falso mandaría un correo de "te bloquearon" por un
   corte de red. */
function motivoCierre(body) {
  const d = body?.data || {};
  const code = d.statusCode
    ?? d.lastDisconnect?.error?.output?.statusCode
    ?? d.lastDisconnect?.error?.data?.statusCode
    ?? d.error?.output?.statusCode
    ?? null;
  const razon = d.reason || d.lastDisconnect?.error?.message || d.message || null;
  return {
    cierreStatusCode: Number.isFinite(Number(code)) ? Number(code) : null,
    cierreRazon:      razon ? String(razon).slice(0, 200) : null,
  };
}

/** Resuelve el tenant del caller (claims) y exige rol admin/jefe. Bootstrap ve todo. */
function tenantDelCaller(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const claims = req.auth.token || {};
  const esBootstrap = BOOTSTRAP_EMAILS.includes(String(claims.email || '').toLowerCase());
  let tid = claims.tenantId || null;
  if (esBootstrap && req.data && req.data.tenantId) tid = String(req.data.tenantId);
  if (!tid) throw new HttpsError('permission-denied', 'Cuenta sin local asociado.');
  if (!esBootstrap && !['admin', 'jefe'].includes(claims.role || '')) {
    throw new HttpsError('permission-denied', 'Solo administradores del local.');
  }
  return tid;
}

const SECRETS = [EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_TOKEN];

/* ─────────────────── 1) Vincular — crea instancia + QR ─────────────────── */

exports.evolutionVincular = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  const tid = tenantDelCaller(req);
  // Barrera de Términos y Condiciones (obligatoria en el modal).
  if (req.data?.tycAceptado !== true) {
    throw new HttpsError('failed-precondition', 'Debes aceptar los términos de uso responsable de WhatsApp.');
  }
  // Barrera de entitlement: el módulo premium lo activa SynapTech en
  // _system/{tid}.waAsistente. El cliente NO se auto-activa. Bootstrap
  // (SynapTech) puede vincular siempre — para configurar o demostrar.
  const esBootstrap = BOOTSTRAP_EMAILS.includes(String(req.auth.token.email || '').toLowerCase());
  if (!esBootstrap) {
    const sys = (await db.doc(`_system/${tid}`).get()).data() || {};
    // Cualquiera de los tres planes habilita vincular el número: el QR es el
    // canal, no el módulo. Qué corre sobre él lo deciden los gates de plan en
    // cerebro.js y confirmaciones.js (ver lib/wa-plan.js).
    if (!tienePlan(sys)) {
      throw new HttpsError('permission-denied', 'El módulo de WhatsApp aún no está activado para tu local. Solicítalo a SynapTech.');
    }
  }
  const instanceName = `instance_${tid}`;
  const c = cliente();
  const opts = { webhookUrl: WEBHOOK_URL, webhookToken: EVOLUTION_WEBHOOK_TOKEN.value() };

  let r;
  try {
    r = await c.crearInstancia(instanceName, opts);
  } catch (e) {
    // La instancia puede existir de un intento previo sin escanear (queda
    // 'connecting') y el create falla por "nombre en uso". La destruimos y
    // reintentamos UNA vez para entregar un QR fresco (auto-sanado).
    logger.warn(`[evolution:vincular] tid=${tid} create falló (${e.message}); auto-sanando`);
    try { await c.logout(instanceName); }           catch (_) {}
    try { await c.eliminarInstancia(instanceName); } catch (_) {}
    try {
      r = await c.crearInstancia(instanceName, opts);
    } catch (e2) {
      logger.error(`[evolution:vincular] tid=${tid}:`, e2.message);
      throw new HttpsError('internal', 'No se pudo iniciar la vinculación. Reintenta en unos segundos.');
    }
  }

  await waCfgRef(tid).set({
    instanceName,
    estadoConexion:  'qr',
    tycAceptado:     true,
    tycAceptadoEn:   FieldValue.serverTimestamp(),
    tycAceptadoPor:  String(req.auth.token.email || ''),
    creadoEn:        FieldValue.serverTimestamp(),
  }, { merge: true });

  logger.info(`[evolution:vincular] tid=${tid} instancia creada`);
  return { instanceName, qr: r.qr, pairingCode: r.pairingCode };
});

/* ─────────────────── 2) Estado — polling del modal ─────────────────── */

exports.evolutionEstado = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  const tid = tenantDelCaller(req);
  const instanceName = `instance_${tid}`;
  const c = cliente();

  const state = await c.estadoConexion(instanceName); // open | connecting | close | unknown

  if (state === 'open') {
    const prev = (await waCfgRef(tid).get().catch(() => null))?.data() || {};
    await waCfgRef(tid).set({
      estadoConexion: 'connected',
      conectadoEn:    FieldValue.serverTimestamp(),
      ...(prev.vinculadoDesde ? {} : { vinculadoDesde: FieldValue.serverTimestamp() }),
      desconectadoEn:           FieldValue.delete(),
      alertaDesconexionEnviada: FieldValue.delete(),
    }, { merge: true });
    return { estado: 'connected' };
  }

  // Sigue emparejando → devolvemos un QR fresco para refrescar el modal.
  let qr = null, pairingCode = null;
  if (state === 'connecting' || state === 'close' || state === 'unknown') {
    try {
      const q = await c.obtenerQR(instanceName);
      qr = q.qr; pairingCode = q.pairingCode;
    } catch (_) { /* la instancia puede no existir aún */ }
  }
  return { estado: qr ? 'qr' : 'disconnected', qr, pairingCode };
});

/* ─────────────────── 3) Desvincular — control 100% manual ─────────────────── */

exports.evolutionDesvincular = onCall({ region: 'us-central1', cors: true, secrets: SECRETS }, async (req) => {
  const tid = tenantDelCaller(req);
  const instanceName = `instance_${tid}`;
  const c = cliente();

  try { await c.logout(instanceName); }           catch (e) { logger.warn(`[evolution:desvincular] logout tid=${tid}: ${e.message}`); }
  try { await c.eliminarInstancia(instanceName); } catch (e) { logger.warn(`[evolution:desvincular] delete tid=${tid}: ${e.message}`); }

  await waCfgRef(tid).set({
    estadoConexion:  'disconnected',
    botEnabled:      false,
    numeroVinculado: null,
    desvinculadoEn:  FieldValue.serverTimestamp(),
    // Lo desvinculó una persona desde el panel: el trigger de alerta lo lee y
    // NO manda correo. Avisarle a alguien de algo que acaba de hacer él mismo
    // es la forma más rápida de que deje de leer estos correos.
    cierreManual:    true,
  }, { merge: true });

  logger.info(`[evolution:desvincular] tid=${tid} sesión destruida`);
  return { ok: true };
});

/* ─────────────────── 3.5) Mi consumo — lo que ve el DUEÑO ───────────────────
   Deliberadamente NO devuelve costo en USD, tokens ni llamadas a la API. Dos
   razones:
     · Comercial: mostrarle al local que su bot costó US$11 mientras le
       cobramos el add-on abre una conversación sobre el margen que no aporta.
     · De comportamiento: anclar en costo invita a "estoy pagando por mensaje,
       hay que exprimirlo". Anclamos en VALOR (citas agendadas) y en
       PROTECCIÓN (tope del número), que empujan al uso sano.

   El tope se presenta como escudo antiban, no como cuota de plan: es la
   diferencia entre "me están limitando" y "me están cuidando el número". Y
   las bajas van visibles a propósito — ver que hubo clientes que pidieron no
   recibir más mensajes modera el entusiasmo mejor que cualquier candado.
   ──────────────────────────────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════════════
   BANDEJA DEL LOCAL — leer lo que su bot está conversando

   Un dueño que no puede LEER a su bot no confía en él: apaga el módulo a la
   primera queja de un cliente en vez de revisar qué pasó. Esto le da la
   transcripción y, sobre todo, el control: "tomar" un chat pausa al bot ahí
   mismo (lo mismo que ya ocurre solo cuando el dueño escribe desde su
   teléfono) y "devolverlo" lo reactiva.

   El teléfono va ENMASCARADO por defecto, igual que en ops: la vista se abre
   en cualquier parte y el número completo del cliente no tiene por qué quedar
   a la vista. El nombre sí, que es lo que el dueño necesita para reconocerlo.
   ═══════════════════════════════════════════════════════════════════════════ */

const HORAS_PAUSA = 2;

exports.waMisConversaciones = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const tid = tenantDelCaller(req);
  const limit = Math.min(Number(req.data?.limit) || 15, 40);

  const snap = await db.collection(`tenants/${tid}/wa_conversaciones`)
    .orderBy('updatedAt', 'desc').limit(limit).get();

  const ahora = Date.now();
  const conversaciones = snap.docs.map((d) => {
    const c = d.data() || {};
    const msgs = Array.isArray(c.messages) ? c.messages : [];
    const pausadoHasta = c.botSilencedUntil?.toMillis?.() || 0;
    const ultimo = msgs[msgs.length - 1];
    return {
      chatId:  d.id,
      // ••••1234 — suficiente para reconocer el chat sin exponer la línea.
      telefono: `••••${String(d.id).slice(-4)}`,
      nombre:   c.clienteNombre || '',
      mensajes: msgs.length,
      respHoy:  c.respDia?.n || 0,
      pausado:  pausadoHasta > ahora,
      pausadoHasta: pausadoHasta > ahora ? new Date(pausadoHasta).toISOString() : null,
      actualizado:  c.updatedAt?.toMillis?.() || null,
      ultimoTexto:  ultimo ? String(ultimo.content || '').slice(0, 120) : '',
      ultimoDe:     ultimo?.role === 'assistant' ? 'bot' : 'cliente',
      // Transcripción para AUDITAR: cuando un local reclama ("el bot dijo que
      // no había hora"), 12 turnos se quedaban cortos y había que pedirle
      // capturas del teléfono. Se manda lo archivado (hasta 80).
      turnos: msgs.slice(-80).map(m => ({
        de: m.role === 'assistant' ? 'bot' : 'cliente',
        texto: typeof m.content === 'string' ? m.content : '[contenido no textual]',
      })),
    };
  });

  return { ok: true, conversaciones };
});

/** Pausar o devolver el bot en UN chat. Es el mismo interruptor que usa la
 *  anti-colisión (botSilencedUntil), así que el bot ya sabe respetarlo. */
exports.waChatControl = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const tid    = tenantDelCaller(req);
  const chatId = String(req.data?.chatId || '').trim();
  const pausar = req.data?.pausar === true;
  if (!/^[0-9A-Za-z_@.-]{5,40}$/.test(chatId)) {
    throw new HttpsError('invalid-argument', 'Chat inválido.');
  }

  const ref = db.doc(`tenants/${tid}/wa_conversaciones/${chatId}`);
  await ref.set({
    botSilencedUntil: pausar
      ? admin.firestore.Timestamp.fromMillis(Date.now() + HORAS_PAUSA * 3600e3)
      : FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  logger.info(`[wa:bandeja] ${tid} chat=${chatId}: ${pausar ? 'pausado ' + HORAS_PAUSA + 'h' : 'devuelto al bot'}`);
  return { ok: true, pausado: pausar, horas: HORAS_PAUSA };
});

exports.evolutionMiConsumo = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const tid = tenantDelCaller(req);
  const { capDiario, capConfirmaciones, resumenHoy } = require('./cuota');
  const { _ahoraChile: ahoraChile } = require('../chat-horas-disponibles');

  const hoyCl = ahoraChile().fecha;
  const mes   = hoyCl.slice(0, 7);

  const [waSnap, botSnap, cuota] = await Promise.all([
    waCfgRef(tid).get(),
    db.doc(`_metrics/bot_${tid}_${mes}`).get(),
    resumenHoy(tid),
  ]);
  const wa  = waSnap.data() || {};
  const neg = botSnap.data() || {};

  const capTotal   = capDiario(wa);
  const capConfirm = capConfirmaciones(wa);
  const desde   = wa.vinculadoDesde && wa.vinculadoDesde.toMillis ? wa.vinculadoDesde.toMillis() : 0;
  const edadDias = desde ? Math.floor((Date.now() - desde) / 86400000) : null;

  // Próximo escalón de madurez: convierte el límite en algo que MEJORA solo,
  // en vez de un techo fijo contra el que uno se frustra.
  let siguienteNivel = null;
  if (edadDias !== null) {
    if (edadDias < 7)       siguienteNivel = { enDias: 7 - edadDias,  nuevoTope: 120 };
    else if (edadDias < 30) siguienteNivel = { enDias: 30 - edadDias, nuevoTope: 300 };
  }

  // ── Histórico acumulado ("lo que el bot ha hecho hasta ahora") ──
  // Suma TODOS los meses: los docs bot_{tid}_{YYYY-MM} llevan vendorId, así
  // que un where basta; se filtra por prefijo para no sumar los ai_* (costo).
  const hist = { agendadas: 0, reubicadas: 0, canceladas: 0, confSi: 0, confNo: 0 };
  try {
    const hq = await db.collection('_metrics').where('vendorId', '==', tid).get();
    hq.forEach((d) => {
      if (!d.id.startsWith('bot_')) return;
      const x = d.data() || {};
      hist.agendadas  += Number(x.agendada)   || 0;
      hist.reubicadas += Number(x.reagendada) || 0;
      hist.canceladas += Number(x.cancelada)  || 0;
      hist.confSi     += Number(x.conf_si)    || 0;
      hist.confNo     += Number(x.conf_no)    || 0;
    });
  } catch (_) { /* sin índice o sin docs: el histórico sale en cero, no rompe */ }

  /* ── Lo que el bot le PUSO EN CAJA al local, en pesos ──
     "12 reservas agendadas" no le dice nada a un dueño que está decidiendo si
     renovar; "$156.000 agendados mientras trabajabas" sí. Se suma el precio
     real de las citas que creó el bot (origen wa_bot) y el de las que MOVIÓ en
     vez de dejar caer (reagendadaVia wa_bot) — esas últimas son horas que se
     iban a perder. Se descuentan canceladas y cortesías: cobrar en el discurso
     lo que no entró a la caja destruye la confianza en el número. */
  const dineroMes = { agendado: 0, salvado: 0 };
  try {
    const citasCol = tid === 'elegance' ? db.collection('citas') : db.collection(`tenants/${tid}/citas`);
    const desde = `${mes}-01`;
    const snapCitas = await citasCol.where('fecha', '>=', desde).get();
    snapCitas.forEach((d) => {
      const c = d.data() || {};
      if (c.estado === 'Cancelada' || c.estado === 'NoAsistio' || c.cortesia === true) return;
      const monto = Number(c.precio) || 0;
      if (c.origen === 'wa_bot')        dineroMes.agendado += monto;
      if (c.reagendadaVia === 'wa_bot') dineroMes.salvado  += monto;
    });
  } catch (e) { logger.warn(`[miConsumo] dinero ${tid}:`, e.message); }

  const agendadas  = Number(neg.agendada)   || 0;
  const confSi     = Number(neg.conf_si)    || 0;
  const confNo     = Number(neg.conf_no)    || 0;
  const bajas      = Number(neg.optout)     || 0;
  const reubicadas = Number(neg.reagendada) || 0;

  return {
    ok: true,
    hoy: {
      enviados: cuota.n,
      tope: capTotal,
      pct: capTotal ? Math.round((cuota.n / capTotal) * 100) : 0,
      confirmaciones: cuota.confOk,
      topeConfirmaciones: capConfirm,
    },
    mes: {
      etiqueta: mes,
      citasAgendadas: agendadas,
      confirmadas: confSi,
      // "avisaron que no venían" — un CANCELAR es una hora que alcanzaste a
      // revender, no una pérdida. Se nombra así en la UI a propósito.
      avisaronQueNo: confNo,
      // Citas que el bot MOVIÓ en vez de dejar caer (tool reagendar_cita):
      // narrativa de valor — es una hora salvada, no un trámite.
      reubicadas,
      canceladas: Number(neg.cancelada) || 0,
      bajas,
      // En pesos: lo que entró por el bot y lo que rescató al mover una cita.
      dineroAgendado: Math.round(dineroMes.agendado),
      dineroSalvado:  Math.round(dineroMes.salvado),
    },
    historico: hist,   // acumulado de TODOS los meses, para el CRM del panel
    numero: { edadDias, siguienteNivel, conectado: wa.estadoConexion === 'connected' },
  };
});

/* ─────────────────── 4) Webhook — pararrayos del VPS ─────────────────── */

exports.evolutionWebhook = onRequest({
  region: 'us-central1',
  secrets: [EVOLUTION_WEBHOOK_TOKEN, EVOLUTION_API_URL, EVOLUTION_API_KEY, ANTHROPIC_API_KEY],
  cors: false,
  timeoutSeconds: 60,
}, async (req, res) => {
  // Validar que venga de NUESTRO VPS.
  if (req.get('x-webhook-token') !== EVOLUTION_WEBHOOK_TOKEN.value()) {
    res.status(403).send('forbidden');
    return;
  }
  // Responder 200 rápido pase lo que pase (si acumula errores, Evolution reintenta/pausa).
  try {
    const body         = req.body || {};
    const instanceName = body.instance || body.instanceName || '';
    const event        = String(body.event || '').toLowerCase();

    // ── Chips de SynapTech (evolution/plataforma.js) ──
    // Se intercepta ANTES de derivar el tid: `instance_synaptech` pasaría el
    // replace de abajo y quedaría como un tenant llamado "synaptech",
    // escribiendo en tenants/synaptech/… que no existe. Acá el tenant NO sale
    // del nombre de la instancia — sale del índice teléfono → tenant.
    //
    // Puede haber varios chips; `chipIdDeInstancia` devuelve cuál (o null si la
    // instancia es del canal propio de un local). Es UNA función y no dos
    // condiciones sueltas justamente para que reconocer la instancia y saber de
    // qué chip es no puedan contradecirse.
    const chipId = plataforma.chipIdDeInstancia(instanceName);
    if (chipId) {
      if (event === 'connection.update') {
        const state = body.data?.state || body.data?.connection;
        const ref   = plataforma._chipRef(chipId);
        if (state === 'open') {
          const numero = body.data?.wuid || body.data?.me?.id || body.sender || null;
          const prev = (await ref.get().catch(() => null))?.data() || {};
          await ref.set({
            chipId,
            estadoConexion:  'connected',
            numeroVinculado: numero ? String(numero).replace(/[:@].*$/, '') : null,
            conectadoEn:     FieldValue.serverTimestamp(),
            ...(prev.vinculadoDesde ? {} : { vinculadoDesde: FieldValue.serverTimestamp() }),
            // Reconectó → se borra el rastro de la caída y se re-arma la
            // alerta. Sin limpiar el candado, la SIGUIENTE caída de este chip
            // sería silenciosa: el trigger la vería como "ya avisada".
            desconectadoEn:           FieldValue.delete(),
            alertaDesconexionEnviada: FieldValue.delete(),
            cierreStatusCode:         FieldValue.delete(),
            cierreRazon:              FieldValue.delete(),
            cierreManual:             FieldValue.delete(),
          }, { merge: true }).catch(() => {});
        } else if (state === 'close') {
          const prev = (await ref.get().catch(() => null))?.data() || {};
          await ref.set({
            estadoConexion: 'disconnected',
            // Conserva el PRIMER momento de la caída: los 'close' se repiten
            // y sin esto se pierde cuánto lleva realmente caído.
            ...(prev.estadoConexion === 'disconnected' && prev.desconectadoEn
              ? {} : { desconectadoEn: FieldValue.serverTimestamp() }),
            ...motivoCierre(body),
          }, { merge: true }).catch(() => {});
          // Cuenta de caídas del día: una sesión que se cae seguido es una
          // sesión degradada, y eso precede al bloqueo. Solo la transición.
          if (prev.estadoConexion !== 'disconnected') {
            await plataforma._registrarEvento(chipId, 'caidas').catch(() => {});
          }
        }
      } else if (event === 'messages.upsert') {
        try {
          // Chips de VENTAS (ventasBot en su doc): conversan con el cerebro
          // comercial (evolution/ventas.js) en vez del flujo de confirmaciones.
          // Nació con el chip 'ventas' (número de Ignacio, leads de ExpoVino).
          const chipCfg = (await plataforma._chipRef(chipId).get()).data() || {};
          if (chipCfg.ventasBot === true) {
            await require('./ventas').procesarMensajeVentas({
              chipId,
              cfg:          chipCfg,
              body,
              evoClient:    cliente(),
              anthropicKey: ANTHROPIC_API_KEY.value(),
              instancia:    plataforma._instanciaDe(chipId),
            });
          } else {
            await plataforma.procesarEntrantePlataforma({
              body,
              evoClient: cliente(),
              chipId,
            });
          }
        } catch (e) {
          logger.error(`[plataforma:webhook:${chipId}]`, e.message);
        }
      }
      res.status(200).send('ok');
      return;
    }

    const tid = instanceName.replace(/^instance_/, '');
    if (!tid) { res.status(200).send('ok'); return; }

    // ── connection.update → refleja el estado en Firestore (empuje, complementa el polling) ──
    if (event === 'connection.update') {
      const state = body.data?.state || body.data?.connection;
      if (state === 'open') {
        const numero = body.data?.wuid || body.data?.me?.id || body.sender || null;
        const prev = (await waCfgRef(tid).get().catch(() => null))?.data() || {};
        await waCfgRef(tid).set({
          estadoConexion:  'connected',
          numeroVinculado: numero ? String(numero).replace(/[:@].*$/, '') : null,
          conectadoEn:     FieldValue.serverTimestamp(),
          // vinculadoDesde: PRIMERA conexión, no se pisa en reconexiones — es
          // la base del tope diario anti-ban escalonado (confirmaciones.js).
          ...(prev.vinculadoDesde ? {} : { vinculadoDesde: FieldValue.serverTimestamp() }),
          // Reconectó → se limpia el rastro de la caída y re-arma la alerta.
          desconectadoEn:           FieldValue.delete(),
          alertaDesconexionEnviada: FieldValue.delete(),
          cierreStatusCode:         FieldValue.delete(),
          cierreRazon:              FieldValue.delete(),
          cierreManual:             FieldValue.delete(),
        }, { merge: true }).catch(() => {});
      } else if (state === 'close') {
        const prev = (await waCfgRef(tid).get().catch(() => null))?.data() || {};
        await waCfgRef(tid).set({
          estadoConexion: 'disconnected',
          // Conserva el PRIMER momento de la caída (los 'close' se repiten);
          // el cron de salud alerta si lleva >20 min caída (anti-flapping).
          ...(prev.estadoConexion === 'disconnected' && prev.desconectadoEn
            ? {} : { desconectadoEn: FieldValue.serverTimestamp() }),
          ...motivoCierre(body),
        }, { merge: true }).catch(() => {});
      }
    }

    // ── messages.upsert → CEREBRO (Sprint 2): responde y agenda solo ──
    //  Se procesa INLINE (antes del 200) a propósito: el claim de dedup por
    //  messageId se escribe temprano, así que un reintento de Evolution por un
    //  200 lento no re-procesa ni re-agenda. El cerebro filtra grupos, gatea
    //  por botEnabled+connected, y maneja la anti-colisión (Sprint 4): fromMe
    //  humano → silencio 2h; ecos propios se reconocen por botMsgIds + gracia.
    if (event === 'messages.upsert') {
      await procesarMensajeEntrante({
        tid,
        body,
        evoClient:    cliente(),
        anthropicKey: ANTHROPIC_API_KEY.value(),
      }).catch((e) => logger.error(`[evolution:webhook] cerebro tid=${tid}:`, e.message));
    }

    logger.info(`[evolution:webhook] tid=${tid} event=${event}`);
  } catch (e) {
    logger.error('[evolution:webhook]', e.message);
  }
  res.status(200).send('ok');
});
