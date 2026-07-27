'use strict';

// functions/lookup-cliente-migrado.js
// ─────────────────────────────────────────────────────────────────
//  LOOKUP DE CLIENTE MIGRADO (registro passwordless) — Fase 3.C
//
//  Al entrar a registro.html, el flujo consulta esta CF por email o
//  teléfono para prellenar el formulario con los datos del cliente
//  si ya existe (migrado de AgendaPro, walk-in previo, etc). Sin esto
//  el cliente tendría que rellenar todo aunque su ficha ya esté cargada.
//
//  Fuente de verdad: `users/` (post Fase 2 + backfill: los walk-ins de
//  clientes/ fueron migrados; toda ficha vive en users/). Antes leía
//  clientes/ mirror que ahora se retira.
//
//  Se llama desde registro.html en blur de #regEmail / #regTelefono.
//  El caller es anónimo — devolvemos SOLO nombre/email/tel, nada
//  sensible (sellos, historial, packs se ocultan).
//
//  DEPLOY:
//    firebase deploy --only functions:lookupClienteMigrado
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const { _resolveMatch: resolveMatch, _colUsers: colUsers } = require('./upsert-cliente');

// no-op — mantengo la ref por si alguien importa el default
admin.firestore;

exports.lookupClienteMigrado = onCall(
  { region: 'us-central1', cors: true },
  async (request) => {
    const data     = request.data || {};
    const tenantId = String(data.tenantId || '').trim();
    const email    = String(data.email    || '').trim().toLowerCase();
    const telefono = String(data.telefono || '').trim();

    if (!tenantId) {
      throw new HttpsError('invalid-argument', 'Falta tenantId.');
    }
    if (!email && !telefono) {
      return { cliente: null };
    }
    // Requerimos email/telefono completos para reducir scraping.
    if (telefono && telefono.replace(/\D/g, '').length < 8) {
      return { cliente: null };
    }
    if (email && !email.includes('@')) {
      return { cliente: null };
    }

    try {
      // resolveMatch aplica la misma regla híbrida que upsertCliente:
      //  · match por email exacto (identificador único humano)
      //  · match por tel en variantes (+56, 56, sin código, con espacios)
      //  · guarda contra familias (grupos con emails distintos y tel compartido
      //    NO matchean por tel — devuelve tel-diff-email → target=null)
      // Devolver null en esos casos es lo correcto: si hay ambigüedad, es
      // más seguro que el usuario rellene el form manualmente.
      const { target } = await resolveMatch(colUsers(tenantId), { email, telefono });
      if (!target) return { cliente: null };
      const doc = target.data();
      return {
        cliente: {
          nombre:   String(doc.nombre   || ''),
          email:    String(doc.email    || ''),
          telefono: String(doc.telefono || ''),
        },
      };
    } catch (err) {
      logger.warn('[lookupClienteMigrado] read failed', {
        tenantId, code: err.code, msg: err.message,
      });
      // Silenciar: el registro seguirá funcionando sin prefill.
      return { cliente: null };
    }
  }
);
