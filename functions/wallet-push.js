'use strict';

// functions/wallet-push.js
// ─────────────────────────────────────────────────────────────────
//  WALLO · PUSH MASIVO POR SEGMENTO
//
//  Callable admin/jefe/super que recibe un lote de uids + mensaje,
//  y envía addMessage al pase Google Wallet de cada uno con
//  tarjeta activa (walletObjectId presente). Sirve para "hoy
//  aviso a los 12 que cumplen este mes" o "promo martes doble
//  sellos a los 45 con wallet".
//
//  El filtrado y selección de destinatarios ocurre en el CLIENTE
//  (tab Clientes ya arma los segmentos). El server valida los uids
//  contra Firestore y aplica cap 500 por llamada.
//
//  Cada llamada se registra en tenants/{tid}/walloPushes/{id} para
//  historial y auditoría.
//
//  Idempotencia: el message tiene un `id` derivado de tenantId +
//  timestamp del batch, así si el user reintenta, Google dedupe.
//
//  Exports:
//    walletPushMasivo — callable
//
//  DEPLOY:
//    firebase deploy --only functions:walletPushMasivo
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

const core = require('./lib/wallet-core');

const db = admin.firestore();
const WALLET_SA_KEY = defineSecret('WALLET_SA_KEY');
const SUPERADMINS = ['ignaciiio.mate@gmail.com'];
const MAX_DEST = 500;

const billingRef = (tid) => db.doc(`_billing/${tid}`);
const usersCol   = (tid) => db.collection(tid === 'elegance' ? 'users' : `tenants/${tid}/users`);
const pushesCol  = (tid) => db.collection(tid === 'elegance' ? 'walloPushes' : `tenants/${tid}/walloPushes`);

async function walletActivo(tid) {
  try {
    const s = await billingRef(tid).get();
    return s.exists && s.data().walletActivo === true;
  } catch (_) { return false; }
}

exports.walletPushMasivo = onCall(
  { region: 'us-central1', cors: true, secrets: [WALLET_SA_KEY] },
  async (request) => {
    const email  = String(request.auth?.token?.email || '').toLowerCase();
    const role   = request.auth?.token?.role;
    const claimT = request.auth?.token?.tenantId;
    const isSuper = SUPERADMINS.includes(email);

    const { tenantId, uids, header, body, filtro } = request.data || {};
    if (!tenantId || typeof tenantId !== 'string') {
      throw new HttpsError('invalid-argument', 'tenantId requerido.');
    }
    if (!Array.isArray(uids) || !uids.length) {
      throw new HttpsError('invalid-argument', 'Necesitas al menos 1 destinatario.');
    }
    if (uids.length > MAX_DEST) {
      throw new HttpsError('invalid-argument', `Máximo ${MAX_DEST} destinatarios por envío.`);
    }
    const headerTxt = String(header || '').trim().slice(0, 60);
    const bodyTxt   = String(body || '').trim().slice(0, 300);
    if (!headerTxt || !bodyTxt) {
      throw new HttpsError('invalid-argument', 'Título y cuerpo del mensaje son requeridos.');
    }

    // Recepción incluida (07-08, pedido Kronnos): maneja la relación con el
    // cliente en el mesón y el push del wallet es mensajería, no números.
    const esStaff = (role === 'admin' || role === 'jefe' || role === 'recepcion') && claimT === tenantId;
    if (!isSuper && !esStaff) {
      throw new HttpsError('permission-denied', 'Solo el staff del local puede enviar mensajes.');
    }
    if (!isSuper && !(await walletActivo(tenantId))) {
      throw new HttpsError('failed-precondition', 'El módulo Wallet no está activo para este local.');
    }

    // Marca única para esta ronda (Google Wallet deduplica por message.id).
    const batchId = 'push_' + Date.now();

    // Cargamos los users en paralelo (batch de 20 gets), filtramos por
    // walletObjectId presente (sólo los que ya guardaron la tarjeta reciben).
    const chunks = [];
    for (let i = 0; i < uids.length; i += 20) chunks.push(uids.slice(i, i + 20));
    const conWallet = [];
    for (const chunk of chunks) {
      const snaps = await Promise.all(chunk.map((u) => usersCol(tenantId).doc(u).get().catch(() => null)));
      snaps.forEach((s, i) => {
        if (!s || !s.exists) return;
        const d = s.data();
        if (d.walletObjectId) conWallet.push({ uid: chunk[i], walletObjectId: d.walletObjectId, nombre: d.nombre || null });
      });
    }

    if (!conWallet.length) {
      throw new HttpsError('failed-precondition', 'Ninguno de los seleccionados tiene tarjeta guardada aún. El mensaje se enviaría al vacío.');
    }

    const saKey = JSON.parse(WALLET_SA_KEY.value());
    let ok = 0, fail = 0;
    const errores = [];
    for (const c of conWallet) {
      try {
        await core.addMessage(saKey, c.walletObjectId, {
          header: headerTxt,
          body: bodyTxt,
          id: (batchId + '_' + c.uid).slice(0, 40),
        });
        ok++;
      } catch (e) {
        fail++;
        errores.push({ uid: c.uid, err: (e.response?.data?.error?.message || e.message || 'error').slice(0, 200) });
        logger.warn(`[Push] ${tenantId}/${c.uid}: ${e.message}`);
      }
    }

    // Historial (asíncrono, best-effort).
    pushesCol(tenantId).add({
      batchId,
      creadoEn: Timestamp.now(),
      creadoPor: email || 'superadmin',
      filtro: String(filtro || 'manual').slice(0, 40),
      header: headerTxt,
      body: bodyTxt,
      alcance: uids.length,
      conWallet: conWallet.length,
      enviados: ok,
      fallidos: fail,
      ...(errores.length ? { errores: errores.slice(0, 10) } : {}),
    }).catch(() => {});

    logger.info(`[Push] ${tenantId} batch=${batchId} · ${ok}/${conWallet.length} enviados · ${fail} fallidos · por ${email}`);
    return {
      ok: true,
      batchId,
      alcance: uids.length,
      conWallet: conWallet.length,
      enviados: ok,
      fallidos: fail,
      sinWallet: uids.length - conWallet.length,
    };
  },
);
