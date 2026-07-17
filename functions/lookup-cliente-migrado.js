'use strict';

// functions/lookup-cliente-migrado.js
// ─────────────────────────────────────────────────────────────────
//  LOOKUP DE CLIENTE MIGRADO (registro passwordless)
//
//  El dueño migra su base histórica de AgendaPro/Weibook a
//  tenants/{tid}/clientes/{phoneDigits}. Antes, si un cliente
//  migrado entraba a registro.html, tenía que rellenar nombre,
//  email y teléfono a mano aunque su ficha ya estuviera cargada.
//
//  Esta CF permite que el registro público consulte el pool de
//  clientes migrados por email O teléfono, SIN estar autenticado
//  (las reglas de Firestore solo dejan leer clientes/ al staff).
//  Devuelve únicamente nombre/email/teléfono para prellenar el
//  formulario — nada de sellos, historial ni notas privadas.
//
//  Se llama desde registro.html en blur de #regEmail / #regTelefono.
//
//  DEPLOY:
//    firebase deploy --only functions:lookupClienteMigrado
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const db = admin.firestore();

function clientesCol(tenantId) {
  return tenantId === 'elegance'
    ? db.collection('clientes')
    : db.collection('tenants').doc(tenantId).collection('clientes');
}

exports.lookupClienteMigrado = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    const data     = request.data || {};
    const tenantId = String(data.tenantId || '').trim();
    const email    = String(data.email    || '').trim().toLowerCase();
    // Normalizamos a solo dígitos — así el docId de clientes/
    // (que es el teléfono normalizado en la migración) matchea.
    const telefono = String(data.telefono || '').replace(/\D/g, '');

    if (!tenantId) {
      throw new HttpsError('invalid-argument', 'Falta tenantId.');
    }
    if (!email && !telefono) {
      return { cliente: null };
    }
    // Requerimos email/telefono completos para reducir scraping.
    if (telefono && telefono.length < 8) {
      return { cliente: null };
    }
    if (email && !email.includes('@')) {
      return { cliente: null };
    }

    const col = clientesCol(tenantId);
    let doc = null;

    try {
      // 1) Match directo por docId (teléfono normalizado). Es lo más
      //    barato: 1 get. La migración deja el doc con id = phoneDigits.
      if (telefono) {
        const snap = await col.doc(telefono).get();
        if (snap.exists) doc = snap.data();
      }

      // 2) Fallback: query por email.
      if (!doc && email) {
        const snap = await col.where('email', '==', email).limit(1).get();
        if (!snap.empty) doc = snap.docs[0].data();
      }
    } catch (err) {
      logger.warn('[lookupClienteMigrado] read failed', {
        tenantId, code: err.code, msg: err.message,
      });
      // Silenciar: el registro seguirá funcionando sin prefill.
      return { cliente: null };
    }

    if (!doc) return { cliente: null };

    // Devolvemos SOLO los campos que van al formulario. Nada de
    // sellos, historial, notas o cualquier dato sensible.
    return {
      cliente: {
        nombre:   String(doc.nombre   || ''),
        email:    String(doc.email    || ''),
        telefono: String(doc.telefono || ''),
      },
    };
  }
);
