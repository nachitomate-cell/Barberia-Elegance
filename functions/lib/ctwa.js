'use strict';

// functions/lib/ctwa.js
// ─────────────────────────────────────────────────────────────────────────────
//  Click-to-WhatsApp: leer el rastro que deja un anuncio de Meta en el mensaje.
//
//  Contexto de por qué existe (auditoría 05-08-2026): la campaña B2B gastó
//  $124.548 y trajo 59 conversaciones, pero 14 de 23 chats quedaron con CERO
//  mensajes guardados y sin respuesta. Dos causas, ambas acá:
//
//   1. El tap en el quick-reply del mensaje de bienvenida del anuncio NO llega
//      como `conversation` ni `extendedTextMessage`, sino como respuesta de
//      botón / lista / Flow. El lector de texto lo veía vacío y descartaba el
//      mensaje antes de procesarlo.
//   2. Aunque llegara el texto, la puerta de activación del bot de ventas exige
//      un gatillo ("ExpoVino"/"agenda online"). El quick-reply que precarga
//      Meta ("Quiero obtener más información.") no matchea ninguno.
//
//  Se resuelven leyendo el referido del anuncio (`externalAdReply`), que además
//  trae el id del anuncio y el `ctwaClid` — la única atribución anuncio→lead
//  disponible mientras no haya píxel.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrae el referido del anuncio si el mensaje viene de un Click-to-WhatsApp.
 * @param {object} data payload `body.data` del webhook de Evolution
 * @param {object} msg  mensaje ya desenvuelto (sin ephemeral/viewOnce)
 * @returns {{sourceId:string|null, sourceUrl:string|null, ctwaClid:string|null,
 *            titulo:string|null, origen:string}|null}
 */
function referidoDeAnuncio(data, msg) {
  const cands = [
    msg?.extendedTextMessage?.contextInfo, msg?.imageMessage?.contextInfo,
    msg?.videoMessage?.contextInfo, msg?.interactiveResponseMessage?.contextInfo,
    msg?.buttonsResponseMessage?.contextInfo, msg?.listResponseMessage?.contextInfo,
    msg?.templateButtonReplyMessage?.contextInfo,
    msg?.contextInfo, data?.contextInfo, data?.message?.contextInfo,
  ].filter(Boolean);

  for (const ctx of cands) {
    const ad  = ctx.externalAdReply || null;
    const src = String(ctx.entryPointConversionSource || ctx.conversionSource || '').toLowerCase();
    // `externalAdReply` solo lo pone Meta en referidos de anuncio. El match por
    // `src` cubre las variantes que Baileys reporta sin el bloque completo.
    const esAd = !!ad || /ctwa|fb_ads|ig_ads|_ad$|^ad$/.test(src);
    if (!esAd) continue;
    return {
      sourceId:  String(ad?.sourceId  || '').slice(0, 64)  || null,   // id del anuncio
      sourceUrl: String(ad?.sourceUrl || '').slice(0, 300) || null,
      ctwaClid:  String(ctx.ctwaClid || ad?.ctwaClid || '').slice(0, 200) || null,
      titulo:    String(ad?.title || '').slice(0, 120) || null,
      origen:    src || 'ctwa',
    };
  }
  return null;
}

/**
 * Texto de las respuestas interactivas: quick-replies del mensaje de bienvenida
 * del anuncio, botones de plantilla, listas y formularios de WhatsApp Flow.
 * @param {object} msg mensaje ya desenvuelto
 * @returns {string} texto plano (vacío si el mensaje no es interactivo)
 */
function textoInteractivo(msg) {
  const flowJson = msg?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  if (flowJson) {
    // El Flow devuelve el formulario como JSON plano; se aplana a "campo: valor"
    // para que el modelo lo lea como contexto y el lead no se pierda.
    try {
      const p = JSON.parse(flowJson);
      const campos = Object.entries(p)
        .filter(([k, v]) => !/^flow_token$/i.test(k) && v !== null && v !== ''
          && typeof v !== 'object' && typeof v !== 'boolean')
        .map(([k, v]) => `${k.replace(/^screen_\d+_/, '').replace(/_/g, ' ')}: ${v}`);
      if (campos.length) return `[Respondió el formulario del anuncio]\n${campos.join('\n')}`;
    } catch (_) { /* payload raro: cae al texto del body más abajo */ }
  }
  return String(
    msg?.buttonsResponseMessage?.selectedDisplayText ??
    msg?.templateButtonReplyMessage?.selectedDisplayText ??
    msg?.listResponseMessage?.title ??
    msg?.interactiveResponseMessage?.body?.text ?? '',
  ).trim();
}

/**
 * ¿Es la respuesta a un formulario de WhatsApp Flow?
 *
 * Vale como identificación por sí sola: un Flow solo existe si un negocio lo
 * envió, y en este número los únicos Flows vivos son los del mensaje de
 * bienvenida de los anuncios. La respuesta del formulario llega como un mensaje
 * SEPARADO que ya no arrastra el `contextInfo` del anuncio, así que sin este
 * predicado el lead que completó el formulario —el más caliente de todos— se
 * quedaba sin respuesta. Un amigo jamás puede gatillar esto.
 * @param {object} msg mensaje ya desenvuelto
 * @returns {boolean}
 */
function esRespuestaDeFormulario(msg) {
  return !!msg?.interactiveResponseMessage?.nativeFlowResponseMessage;
}

module.exports = { referidoDeAnuncio, textoInteractivo, esRespuestaDeFormulario };
