'use strict';

// functions/mi-plan-detalle.js
// ─────────────────────────────────────────────────────────────────────────────
//  QUÉ TENGO CONTRATADO — detalle exacto para /gestion-interna/mensualidad.
//
//  El dueño veía un monto sin saber qué lo compone: "¿esto incluye el bot?
//  ¿los mensajes de WhatsApp están dentro?". Esta callable arma la verdad
//  DERIVADA de las fuentes reales, sin copiarla a ningún lado:
//
//    _billing/{tid}          → monto neto, desglose de add-ons, cortesías
//    _system/{tid}           → plan de WhatsApp (waPlan) y techos
//    configuracion/whatsapp  → switches del local + estado de la sesión
//    _metrics/bot_{tid}_{mes}→ lo que el bot HIZO este mes (modelo híbrido)
//
//  ⚠️ No es una lista espejo: nada se persiste. Si mañana cambia el plan en
//  _system, esta vista lo refleja sola.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin                  = require('firebase-admin');
const { planDe, incluyeBot, incluyeRecordatorios } = require('./lib/wa-plan');

const db = admin.firestore();
const IVA = 19;

// Modelo HÍBRIDO del asistente IA (decisión de Ignacio, 02-08-2026): una base
// baja + comisión por cita que el bot agenda solo. El cliente paga poco fijo y
// el resto solo cuando el bot le trajo plata de verdad.
const HIBRIDO = { baseNeto: 4900, porCitaNeto: 500 };

const conIva = (n) => Math.round(n * (1 + IVA / 100));

function tenantDelCaller(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const c = req.auth.token || {};
  const tid = c.tenantId || null;
  if (!tid) throw new HttpsError('permission-denied', 'Cuenta sin local asociado.');
  if (!['admin', 'jefe'].includes(c.role || '')) {
    throw new HttpsError('permission-denied', 'Solo administradores del local.');
  }
  return tid;
}

const mesActual = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit',
}).format(new Date()).slice(0, 7);

exports.miPlanDetalle = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const tid = tenantDelCaller(req);
  const mes = mesActual();

  // Lo que el bot hizo este mes se DERIVA de las citas, no del contador
  // _metrics/bot_*: acá se calcula la comisión por cita del modelo híbrido, y
  // ese contador se desviaba en las dos direcciones (02-08-2026: kronnos_limache
  // marcaba 3 con 2 citas reales; delnero 0 con 2). Facturar con un número que
  // no cuadra con la agenda que el cliente ve es la peor forma de perderlo.
  const { negocioDelMes } = require('./lib/bot-negocio');
  const { usoDelMes }     = require('./lib/wa-uso');

  const [billSnap, sysSnap, waSnap, negMes, uso] = await Promise.all([
    db.doc(`_billing/${tid}`).get(),
    db.doc(`_system/${tid}`).get(),
    db.doc(`tenants/${tid}/configuracion/whatsapp`).get(),
    negocioDelMes(tid, mes),
    usoDelMes(tid, mes),
  ]);
  const bill = billSnap.data() || {};
  const sys  = sysSnap.data()  || {};
  const wa   = waSnap.data()   || {};

  const desglose = bill.desglose || null;
  const baseNeto = Number(desglose?.baseNeto) || Number(bill.montoPendiente) || 0;
  const cortesias = bill.addonsCortesia || {};

  /* ── Add-ons contratados (los que SE COBRAN) ── */
  const addons = [];
  const addonsDesglose = Array.isArray(desglose?.addons) ? desglose.addons : [];
  const NOMBRES = {
    wallets:      { nombre: 'Wallets', desc: 'Tarjeta de fidelidad en Apple y Google Wallet' },
    'bioo-pro':   { nombre: 'Bioo Pro', desc: 'Link in bio con reservas' },
    'bioo-studio':{ nombre: 'Bioo Studio', desc: 'Link in bio con diseño a medida' },
  };
  for (const a of addonsDesglose) {
    const meta = NOMBRES[a.id] || { nombre: a.id, desc: '' };
    addons.push({ id: a.id, ...meta, neto: Number(a.neto) || 0, cobrado: true });
  }

  /* ── Cortesías: activas pero NO se cobran (con su fecha de término) ── */
  const cortesiasList = Object.entries(cortesias).map(([id, c]) => ({
    id,
    nombre: (NOMBRES[id] || { nombre: id }).nombre,
    desc:   (NOMBRES[id] || { desc: '' }).desc,
    hasta:  c?.hasta || null,
    precioListaBruto: Number(c?.precioListaBruto) || 0,
  }));

  /* ── WhatsApp: qué plan tiene y qué le permite ── */
  const plan = planDe(sys);
  const bots = incluyeBot(sys);
  const recs = incluyeRecordatorios(sys);
  const conectado = wa.estadoConexion === 'connected';
  const techoConv = Number(sys.botMaxConversaciones) || 0;
  const elegidoConv = Number(wa.botLimiteConversaciones) || 0;
  const limiteConv = (techoConv && elegidoConv) ? Math.min(techoConv, elegidoConv)
    : (techoConv || elegidoConv || 0);

  // `agendadasVivas` = sin las canceladas ni las que no llegaron. Cobrar
  // comisión por una reserva que el propio bot canceló después es indefendible
  // frente al cliente, y la primera factura que no cuadra con su agenda es la
  // que hace desconfiar de todas las demás.
  const citasBot    = negMes.agendadasVivas;
  const reubicadas  = negMes.reubicadas;
  const confirmadas = negMes.confSi;

  const whatsapp = {
    contratado: !!plan,
    plan,                       // 'recordatorios' | 'bot' | 'full' | null
    incluyeBot: bots,
    incluyeRecordatorios: recs,
    conectado,
    numeroVinculado: wa.numeroVinculado || null,
    botEncendido: wa.botEnabled === true && bots,
    confirmacionesEncendidas: wa.confirmacionesEnabled === true && recs,
    limiteConversacionesDia: limiteConv,   // 0 = sin límite
    usoMes: {
      citasAgendadas: citasBot, citasReubicadas: reubicadas, confirmadas,
      // Conversaciones del mes: la unidad del plan. Una conversación = una
      // ventana de 24 h con un cliente, responda el bot 2 veces o 20.
      conversaciones: uso.conversaciones,
      mensajesRecibidos: uso.mensajesIn,
      mensajesEnviados:  uso.mensajesOut,
    },
  };

  /* ── Modelo híbrido del asistente: base + comisión por cita agendada ──
     Solo informativo mientras el tenant tenga tarifa plana o especial: el
     monto que se cobra sigue siendo _billing.montoPendiente. Se muestra para
     que el dueño VEA qué le generó el bot este mes. */
  const hibrido = bots ? {
    baseNeto:    HIBRIDO.baseNeto,
    porCitaNeto: HIBRIDO.porCitaNeto,
    citas:       citasBot,
    comisionNeto: citasBot * HIBRIDO.porCitaNeto,
    totalNeto:   HIBRIDO.baseNeto + citasBot * HIBRIDO.porCitaNeto,
  } : null;

  const totalNeto = Number(bill.montoPendiente) || 0;
  return {
    ok: true,
    plan: bill.plan || null,
    tarifaEspecial: !!bill.tarifaEspecial,
    locales: Number(desglose?.locales) || 1,
    precioPorLocal: Number(desglose?.precioPorLocal) || 0,
    baseNeto,
    addons,
    cortesias: cortesiasList,
    whatsapp,
    hibrido,
    totales: { neto: totalNeto, iva: conIva(totalNeto) - totalNeto, conIva: conIva(totalNeto) },
    mes,
  };
});
