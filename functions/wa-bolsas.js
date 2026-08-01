'use strict';

// functions/wa-bolsas.js
// ─────────────────────────────────────────────────────────────────────────────
//  BOLSAS DE MENSAJES — canal oficial de WhatsApp (plantillas Meta)
//
//  El plan del canal oficial NO es tarifa plana: el local compra una BOLSA de
//  mensajes y cada plantilla enviada (confirmación al reservar + recordatorio
//  24h) descuenta 1. Sin saldo, no sale nada — fail-closed: nadie le genera
//  costo Meta a SynapTech sin haber pagado su bolsa. El candado y el descuento
//  viven en whatsapp-notif.js (junto a los otros 4 candados del canal).
//
//  Flujo de compra (self-service desde /gestion-interna → WhatsApp):
//    1) El dueño elige bolsa → waBolsaCrearLink crea una preferencia de
//       Checkout Pro por precio NETO + 19% IVA. La plata entra a la cuenta MP
//       de SYNAPTECH (MP_PLATFORM_ACCESS_TOKEN, app "bioo12" — la misma de la
//       mensualidad; ⚠ jamás MP_ACCESS_TOKEN, que es de Yügen/Dusan).
//    2) MP notifica a waBolsaWebhook (notification_url POR PREFERENCIA, así
//       no depende de la URL de webhook a nivel de app).
//    3) Pago aprobado → wa_notif/{tid}: bolsaSaldo += mensajes y se encienden
//       planCliente + planRecordatorio (la primera compra ACTIVA el módulo).
//       Idempotencia en wa_bolsa_pagos/{paymentId}: un reintento de MP no
//       acredita dos veces. Aviso por correo a SynapTech con cada compra.
//
//  Catálogo: _system/whatsapp_notif.bolsas (editable sin deploy). Los precios
//  son NETOS; el +IVA se muestra en el panel y se cobra en MP.
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule }                    = require('firebase-functions/v2/scheduler');
const { defineSecret }                  = require('firebase-functions/params');
const { logger }                        = require('firebase-functions');
const admin                             = require('firebase-admin');
const { FieldValue }                    = require('firebase-admin/firestore');
const { esBootstrap, esOperadorReq }    = require('./lib/operadores');
const { enviarEmail, MAIL_SECRETS }     = require('./lib/mailer');

const db = admin.firestore();

const MP_PLATFORM_ACCESS_TOKEN = defineSecret('MP_PLATFORM_ACCESS_TOKEN');
const MP_API      = 'https://api.mercadopago.com';
const IVA         = 0.19;
const WEBHOOK_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/waBolsaWebhook';
const PANEL_URL   = 'https://app.synaptechspa.cl/gestion-interna/';
const MAIL_OPS    = ['ignaciiio.mate@gmail.com'];

// Catálogo por defecto (NETO, CLP). El costo Meta es ~US$0,02/mensaje (~$19
// CLP), así que hasta la bolsa chica deja margen sano. Se pisa completo con
// _system/whatsapp_notif.bolsas si Ignacio quiere otros tramos o precios.
const BOLSAS_DEFAULT = [
  { id: 'b100', mensajes: 100, precio: 9990 },
  { id: 'b300', mensajes: 300, precio: 24990 },
  { id: 'b800', mensajes: 800, precio: 54990 },
];

const conIva = (neto) => Math.round(Number(neto) * (1 + IVA));

/** Catálogo vigente, saneado (una bolsa sin id/mensajes/precio se descarta). */
function bolsasDe(cfg) {
  const raw = Array.isArray(cfg?.bolsas) && cfg.bolsas.length ? cfg.bolsas : BOLSAS_DEFAULT;
  return raw
    .map(b => ({
      id:       String(b.id || '').trim(),
      mensajes: Math.round(Number(b.mensajes) || 0),
      precio:   Math.round(Number(b.precio) || 0),
    }))
    .filter(b => b.id && b.mensajes > 0 && b.precio >= 1000)
    .map(b => ({ ...b, precioConIva: conIva(b.precio) }));
}
exports._bolsasDe = bolsasDe;
exports._BOLSAS_DEFAULT = BOLSAS_DEFAULT;

/* La bolsa se divide en DOS cupos — confirmaciones y recordatorios — según
   `repartoConfPct` (0–100, default 50): hay locales que prefieren gastar todo
   en confirmar la reserva y otros solo en recordar. El reparto se aplica al
   ACREDITAR (compra, cupo mensual) y al REBALANCEAR (waBolsaReparto). */
const repartoDe = (wa) => {
  const p = Number(wa?.repartoConfPct);
  return Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : 50;
};
const partir = (total, pct) => {
  const conf = Math.round(total * pct / 100);
  return { conf, rec: total - conf };
};

/** Mantiene el checkbox de la reserva pública (configuracion/main.waConfirmActivo)
 *  sincronizado con la realidad: visible SOLO si hay con qué avisar — cupo
 *  oficial con saldo, o confirmaciones Evolution conectadas. Sin saldo, el
 *  checkbox desaparece y todas las citas nacen verdes (regla de producto). */
async function syncCheckboxPublico(tid) {
  try {
    const [nS, eS] = await Promise.all([
      db.doc(`wa_notif/${tid}`).get(),
      db.doc(`tenants/${tid}/configuracion/whatsapp`).get(),
    ]);
    const n = nS.data() || {}, e = eS.data() || {};
    const oficial = (n.planRecordatorio === true && (Number(n.bolsaSaldoRec) || 0) > 0)
                 || (n.planCliente === true && (Number(n.bolsaSaldoConf) || 0) > 0);
    const evolution = e.confirmacionesEnabled === true && e.estadoConexion === 'connected';
    await db.doc(`tenants/${tid}/configuracion/main`).set({ waConfirmActivo: oficial || evolution }, { merge: true });
  } catch (err) { logger.warn(`[wa-bolsa] syncCheckbox ${tid}:`, err.message); }
}
exports._syncCheckboxPublico = syncCheckboxPublico;

/** Preferencias auto-gestionables del canal oficial (estilo AgendaPro): el
 *  local prende/apaga la confirmación al reservar y el recordatorio 24h por
 *  separado. Encender sin saldo no envía nada (el candado de bolsa manda);
 *  apagar detiene ese tipo de envío aunque haya saldo. */
exports.waNotifPreferencias = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const claims = req.auth.token || {};
  const boot = esBootstrap(claims.email);
  let tid = claims.tenantId || null;
  if (boot && req.data?.tenantId) tid = String(req.data.tenantId);
  if (!tid) throw new HttpsError('permission-denied', 'Cuenta sin local asociado.');
  if (!boot && !['admin', 'jefe'].includes(claims.role || '')) {
    throw new HttpsError('permission-denied', 'Solo administradores del local.');
  }
  const patch = {};
  if (typeof req.data?.confirmaciones === 'boolean') patch.planCliente      = req.data.confirmaciones;
  if (typeof req.data?.recordatorios  === 'boolean') patch.planRecordatorio = req.data.recordatorios;
  if (!Object.keys(patch).length) throw new HttpsError('invalid-argument', 'Nada que cambiar.');
  await db.doc(`wa_notif/${tid}`).set(patch, { merge: true });
  await syncCheckboxPublico(tid);
  logger.info(`[wa-bolsa] ${tid}: preferencias ${JSON.stringify(patch)}`);
  return { ok: true, ...patch };
});

/** Cambia el reparto y REBALANCEA el saldo actual (total se conserva). */
exports.waBolsaReparto = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const claims = req.auth.token || {};
  const boot = esBootstrap(claims.email);
  let tid = claims.tenantId || null;
  if (boot && req.data?.tenantId) tid = String(req.data.tenantId);
  if (!tid) throw new HttpsError('permission-denied', 'Cuenta sin local asociado.');
  if (!boot && !['admin', 'jefe'].includes(claims.role || '')) {
    throw new HttpsError('permission-denied', 'Solo administradores del local.');
  }
  const pct = Math.max(0, Math.min(100, Math.round(Number(req.data?.pct))));
  if (!Number.isFinite(pct)) throw new HttpsError('invalid-argument', 'Falta pct (0–100).');

  const ref = db.doc(`wa_notif/${tid}`);
  const out = await db.runTransaction(async (tx) => {
    const wa = (await tx.get(ref)).data() || {};
    const total = (Number(wa.bolsaSaldoConf) || 0) + (Number(wa.bolsaSaldoRec) || 0);
    const { conf, rec } = partir(total, pct);
    tx.set(ref, { repartoConfPct: pct, bolsaSaldoConf: conf, bolsaSaldoRec: rec }, { merge: true });
    return { conf, rec };
  });
  logger.info(`[wa-bolsa] ${tid}: reparto ${pct}% conf → conf=${out.conf} rec=${out.rec}`);
  await syncCheckboxPublico(tid);
  return { ok: true, pct, ...out };
});

/* ─────────────── Ajuste manual del saldo (solo SynapTech) ───────────────
   Hay recargas que no pasan por Checkout Pro: una transferencia, los mensajes
   que van incluidos en un trato cerrado a mano (Renacer), o devolver los que
   se comió un envío fallido. Antes eso era abrir la consola de Firestore y
   escribir dos campos a ojo — con el riesgo de dejar el reparto conf/rec
   torcido o de pisar saldo comprado.

   Se hace acá y no desde /admin escribiendo el doc directo por tres razones:
   el reparto se calcula con el MISMO `partir()` que usa la compra (una sola
   fuente de verdad), la transacción no puede pisar una compra que entró en el
   mismo instante, y cada ajuste queda firmado en `wa_bolsa_ajustes` — es plata
   del cliente, tiene que poder auditarse quién y cuándo. */
exports.waBolsaAjustar = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!esOperadorReq(req)) throw new HttpsError('permission-denied', 'Solo SynapTech.');
  const tid = String(req.data?.tenantId || '').trim();
  if (!tid) throw new HttpsError('invalid-argument', 'Falta tenantId.');

  const tieneTotal = req.data?.total !== undefined && req.data?.total !== null;
  const tieneDelta = req.data?.delta !== undefined && req.data?.delta !== null;
  const tieneMens  = req.data?.mensualIncluida !== undefined && req.data?.mensualIncluida !== null;
  if (!tieneTotal && !tieneDelta && !tieneMens) {
    throw new HttpsError('invalid-argument', 'Nada que ajustar.');
  }
  // Tope de cordura: un cero de más en un prompt son ~$200.000 de costo Meta.
  const TECHO = 5000;
  const total = tieneTotal ? Math.max(0, Math.min(TECHO, Math.round(Number(req.data.total) || 0))) : null;
  const delta = tieneDelta ? Math.max(-TECHO, Math.min(TECHO, Math.round(Number(req.data.delta) || 0))) : null;
  const mens  = tieneMens  ? Math.max(0, Math.min(TECHO, Math.round(Number(req.data.mensualIncluida) || 0))) : null;
  const quien = String(req.auth?.token?.email || 'desconocido');

  const ref = db.doc(`wa_notif/${tid}`);
  const out = await db.runTransaction(async (tx) => {
    const wa    = (await tx.get(ref)).data() || {};
    const antes = (Number(wa.bolsaSaldoConf) || 0) + (Number(wa.bolsaSaldoRec) || 0);
    const patch = {};
    let despues = antes;

    if (total !== null || delta !== null) {
      despues = Math.max(0, total !== null ? total : antes + delta);
      const { conf, rec } = partir(despues, repartoDe(wa));
      patch.bolsaSaldoConf = conf;
      patch.bolsaSaldoRec  = rec;
    }
    if (mens !== null) patch.bolsaMensualIncluida = mens;

    tx.set(ref, patch, { merge: true });
    return { antes, despues, mens };
  });

  await db.collection('wa_bolsa_ajustes').add({
    tid, quien,
    saldoAntes: out.antes, saldoDespues: out.despues,
    mensualIncluida: out.mens,
    motivo: String(req.data?.motivo || '').slice(0, 200),
    creadoEn: FieldValue.serverTimestamp(),
  }).catch(e => logger.warn('[wa-bolsa] auditoría ajuste:', e.message));

  // El checkbox de la reserva pública depende del saldo: dejarlo desincronizado
  // es prometerle al cliente un aviso que nunca sale (o esconder uno que sí).
  await syncCheckboxPublico(tid);
  logger.info(`[wa-bolsa] ${tid}: ajuste manual de ${quien} — saldo ${out.antes} → ${out.despues}` +
              (out.mens !== null ? ` · incluidos/mes = ${out.mens}` : ''));
  return { ok: true, saldo: out.despues, mensualIncluida: out.mens };
});

/* ─────────────── 1) Crear link de pago (Checkout Pro) ─────────────── */

exports.waBolsaCrearLink = onCall(
  { region: 'us-central1', cors: true, secrets: [MP_PLATFORM_ACCESS_TOKEN] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
    const claims = req.auth.token || {};
    const boot   = esBootstrap(claims.email);
    let tid      = claims.tenantId || null;
    if (boot && req.data?.tenantId) tid = String(req.data.tenantId);
    if (!tid) throw new HttpsError('permission-denied', 'Cuenta sin local asociado.');
    if (!boot && !['admin', 'jefe'].includes(claims.role || '')) {
      throw new HttpsError('permission-denied', 'Solo administradores del local.');
    }

    const cfg   = (await db.doc('_system/whatsapp_notif').get()).data() || {};
    const bolsa = bolsasDe(cfg).find(b => b.id === String(req.data?.bolsaId || ''));
    if (!bolsa) throw new HttpsError('invalid-argument', 'Esa bolsa no existe.');

    const nombreLocal = (await db.doc(`tenants/${tid}`).get()).data()?.nombre || tid;

    const pref = {
      items: [{
        title:       `WhatsApp oficial · Bolsa de ${bolsa.mensajes} mensajes · ${nombreLocal}`,
        description: `Confirmaciones y recordatorios de cita por WhatsApp oficial (incluye IVA)`,
        quantity:    1,
        currency_id: 'CLP',
        unit_price:  bolsa.precioConIva,
      }],
      external_reference: `wabolsa|${tid}|${bolsa.id}|${bolsa.mensajes}`,
      notification_url:   WEBHOOK_URL,
      back_urls: { success: PANEL_URL, pending: PANEL_URL, failure: PANEL_URL },
      auto_return: 'approved',
      statement_descriptor: 'SYNAPTECH',
      metadata: { tid, bolsaId: bolsa.id, mensajes: bolsa.mensajes, neto: bolsa.precio },
    };

    const r = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_PLATFORM_ACCESS_TOKEN.value()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pref),
    });
    const j = await r.json();
    if (!r.ok || !j.init_point) {
      logger.error(`[wa-bolsa] preferencia falló tid=${tid}:`, JSON.stringify(j).slice(0, 300));
      throw new HttpsError('internal', 'No se pudo crear el link de pago. Reintenta en unos minutos.');
    }

    logger.info(`[wa-bolsa] link creado tid=${tid} bolsa=${bolsa.id} ($${bolsa.precioConIva} IVA inc.)`);
    return { ok: true, initPoint: j.init_point, bolsa };
  },
);

/* ─────────────── 1.5) Cupo mensual incluido (tratos tipo Renacer) ───────────
   Tenants con `wa_notif/{tid}.bolsaMensualIncluida = N` tienen N mensajes/mes
   DENTRO de su mensualidad. El día 1 el saldo se REPONE HASTA N — dos reglas
   anti-quiebra, deliberadas:
     · NO se acumula: lo que no usó en el mes se pierde (como toda bolsa de
       telefonía). Sumar en vez de reponer dejaría a un tenant inactivo
       juntando saldo gratis que después es costo Meta real, todo junto.
     · NUNCA se pisa saldo mayor: si compró bolsas y tiene 250, se queda con
       250 — lo pagado no expira. El costo regalado queda acotado a N×$19/mes. */

exports.waBolsaReponerMensual = onSchedule(
  { schedule: '0 6 1 * *', timeZone: 'America/Santiago', region: 'us-central1' },
  async () => {
    const refs = await db.collection('wa_notif').listDocuments();
    let repuestos = 0;
    for (const ref of refs) {
      try {
        await db.runTransaction(async (tx) => {
          const s = await tx.get(ref);
          const d = s.data() || {};
          const incluida = Math.round(Number(d.bolsaMensualIncluida) || 0);
          if (incluida <= 0) return;
          const saldo = (Number(d.bolsaSaldoConf) || 0) + (Number(d.bolsaSaldoRec) || 0);
          if (saldo >= incluida) return;   // compró bolsas o no gastó: no se toca
          const { conf, rec } = partir(incluida, repartoDe(d));
          tx.set(ref, {
            bolsaSaldoConf:   conf,
            bolsaSaldoRec:    rec,
            bolsaRepuestaEn:  FieldValue.serverTimestamp(),
          }, { merge: true });
          repuestos++;
        });
        await syncCheckboxPublico(ref.id);
      } catch (e) {
        logger.error(`[wa-bolsa] reposición ${ref.id}:`, e.message);
      }
    }
    logger.info(`[wa-bolsa] reposición mensual: ${repuestos} tenant(s) repuestos a su cupo incluido`);
  },
);

/* ─────────────── 2) Webhook — acredita la bolsa al aprobarse ───────────────
   La validación es por CONSULTA, no por firma: pase lo que pase en el POST,
   el saldo solo se acredita si la API de MP (con NUESTRO token) confirma un
   pago approved con external_reference nuestro. Un request forjado no puede
   fabricar esa respuesta. */

exports.waBolsaWebhook = onRequest(
  { region: 'us-central1', secrets: [MP_PLATFORM_ACCESS_TOKEN, ...MAIL_SECRETS], cors: false },
  async (req, res) => {
    try {
      const q = req.query || {};
      const b = req.body || {};
      const tipo = String(q.type || q.topic || b.type || b.topic || '');
      const payId = String(b?.data?.id || q['data.id'] || q.id || '');
      if (!/payment/.test(tipo) || !payId) { res.status(200).send('ok'); return; }

      const r = await fetch(`${MP_API}/v1/payments/${payId}`, {
        headers: { Authorization: `Bearer ${MP_PLATFORM_ACCESS_TOKEN.value()}` },
      });
      if (!r.ok) { res.status(200).send('ok'); return; }   // id ajeno o borrado: nada que hacer
      const pago = await r.json();

      const ref = String(pago.external_reference || '');
      if (!ref.startsWith('wabolsa|')) { res.status(200).send('ok'); return; }  // pago de otro flujo de la app
      if (pago.status !== 'approved')  { res.status(200).send('ok'); return; }

      const [, tid, bolsaId, mensajesRaw] = ref.split('|');
      const mensajes = Math.round(Number(mensajesRaw) || 0);
      if (!tid || mensajes <= 0) { res.status(200).send('ok'); return; }

      // Idempotencia: MP reintenta webhooks — el ledger decide una sola vez.
      const ledger = db.doc(`wa_bolsa_pagos/${payId}`);
      const acreditado = await db.runTransaction(async (tx) => {
        // TODAS las lecturas antes de cualquier escritura (regla de Firestore).
        const [s, waSnap] = await Promise.all([tx.get(ledger), tx.get(db.doc(`wa_notif/${tid}`))]);
        if (s.exists) return false;
        const waPrev = waSnap.data() || {};
        tx.set(ledger, {
          tid, bolsaId, mensajes,
          monto:    Number(pago.transaction_amount) || 0,
          payerEmail: pago.payer?.email || '',
          creadoEn: FieldValue.serverTimestamp(),
        });
        const { conf, rec } = partir(mensajes, repartoDe(waPrev));
        tx.set(db.doc(`wa_notif/${tid}`), {
          bolsaSaldoConf: FieldValue.increment(conf),
          bolsaSaldoRec:  FieldValue.increment(rec),
          // La primera compra ACTIVA el módulo completo; las siguientes solo recargan.
          planCliente:      true,
          planRecordatorio: true,
          bolsaUltimaCompra: { bolsaId, mensajes, monto: Number(pago.transaction_amount) || 0, paymentId: payId },
          bolsaUltimaCompraEn: FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
      });

      if (acreditado) {
        await syncCheckboxPublico(tid);
        logger.info(`[wa-bolsa] ✅ ${tid}: +${mensajes} mensajes (pago ${payId}, $${pago.transaction_amount})`);
        await enviarEmail({
          from: 'SynapTech <cobros@synaptechspa.cl>',
          to:   MAIL_OPS,
          subject: `💰 ${tid} compró bolsa de ${mensajes} mensajes WhatsApp ($${Number(pago.transaction_amount).toLocaleString('es-CL')})`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:520px">
              <h2 style="font-size:16px">Bolsa acreditada automáticamente</h2>
              <p style="font-size:14px;line-height:1.6">Local: <b>${tid}</b><br>
              Bolsa: <b>${bolsaId}</b> (+${mensajes} mensajes)<br>
              Pago MP: <b>${payId}</b> · $${Number(pago.transaction_amount).toLocaleString('es-CL')} (IVA incluido)<br>
              El módulo quedó activo y el saldo cargado — no hay nada que hacer a mano.</p>
              <p style="font-size:12px;color:#666">Detalle en <a href="https://ops.synaptechspa.cl">ops.synaptechspa.cl</a>.</p>
            </div>`,
        }, { grupo: 'interno', etiqueta: 'wa-bolsa-compra', silencioso: true }).catch((e) =>
          logger.warn('[wa-bolsa] correo aviso:', e.message));
      }

      res.status(200).send('ok');
    } catch (e) {
      logger.error('[wa-bolsa] webhook:', e.message);
      // 200 igual: si acumulamos errores MP reintenta en ráfaga y no ganamos nada.
      res.status(200).send('ok');
    }
  },
);
