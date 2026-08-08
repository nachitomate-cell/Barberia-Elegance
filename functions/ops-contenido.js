'use strict';

// functions/ops-contenido.js
// ─────────────────────────────────────────────────────────────────────────────
//  PLAN SEMANAL DE CONTENIDO (@synaptechspa) PARA OPS.
//
//  Una vez por semana se planifica el contenido de Instagram (reels, historias,
//  carruseles) y durante la semana solo se va marcando el estado de cada pieza
//  desde ops.html. El plan VIVE en Firestore para que pueda mutar en la semana
//  sin tocar código:
//
//    ops_contenido/{semana}   (id = sábado de inicio, YYYY-MM-DD)
//      titulo: string
//      items: [{ id, dia (YYYY-MM-DD), tipo, titulo, estado, hora, asset,
//                caption, notas }]
//
//    · opsContenidoVer  → últimas semanas (para el selector de la pestaña)
//    · opsContenidoSet  → cambia el ESTADO de un item (lo único que se edita
//                         a diario; el plan completo lo escribe el ritual
//                         semanal vía Admin SDK)
//
//  Solo operadores (misma gate que el resto de ops).
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');
const { esOperador }         = require('./lib/operadores');

const db = admin.firestore();

const ESTADOS = ['pendiente', 'produccion', 'listo', 'subido', 'descartado'];

function exigirOperador(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  if (!esOperador(String(req.auth.token?.email || '').toLowerCase())) {
    throw new HttpsError('permission-denied', 'Solo operadores.');
  }
}

exports.opsContenidoVer = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  // Últimas 6 semanas alcanzan para el selector; el histórico completo queda
  // en Firestore por si algún día se quiere un archivo.
  const snap = await db.collection('ops_contenido')
    .orderBy('__name__', 'desc').limit(6).get();
  const semanas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { ok: true, semanas };
});

exports.opsContenidoSet = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  const semana = String(req.data?.semana || '').trim();
  const itemId = String(req.data?.itemId || '').trim();
  const estado = String(req.data?.estado || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) throw new HttpsError('invalid-argument', 'Semana inválida.');
  if (!itemId) throw new HttpsError('invalid-argument', 'Falta el item.');
  if (!ESTADOS.includes(estado)) throw new HttpsError('invalid-argument', 'Estado inválido.');

  const ref = db.doc(`ops_contenido/${semana}`);
  const doc = await ref.get();
  if (!doc.exists) throw new HttpsError('not-found', `No existe la semana ${semana}.`);

  const items = Array.isArray(doc.data().items) ? doc.data().items : [];
  const idx = items.findIndex((i) => i && i.id === itemId);
  if (idx === -1) throw new HttpsError('not-found', `No existe el item ${itemId}.`);

  items[idx] = { ...items[idx], estado, estadoAt: Date.now() };
  await ref.update({ items, actualizadoEn: FieldValue.serverTimestamp() });
  logger.info(`[ops:contenido] ${semana}/${itemId} → ${estado} (${req.auth.token.email})`);
  return { ok: true, semana, itemId, estado };
});
