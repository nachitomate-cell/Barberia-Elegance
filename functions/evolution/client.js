'use strict';

// functions/evolution/client.js
// ─────────────────────────────────────────────────────────────────────────────
//  Cliente/wrapper universal de Evolution API (WhatsApp por sesión/QR).
//  Corre en nuestras Cloud Functions y habla con el VPS propio (ver /evolution).
//
//  Blindajes aprobados:
//   · AISLAMIENTO ESTRICTO: TODO método exige `instanceName` (instance_{tenantId})
//     como primer parámetro. No existe endpoint global → jamás cruza datos entre
//     Renacer y Kronnos.
//   · PACING ANTI-BAN: `enviarTexto` usa el `delay` nativo de Evolution (muestra
//     "escribiendo…" durante `delayMs` antes de soltar el texto). Humaniza el ritmo
//     de salida frente a la heurística de bots de Meta, SIN quemar tiempo de la CF.
//     (Alternativa explícita: `setPresencia` → composing, expuesta por si se necesita.)
//
//  ⚠️ Los paths son convención de Evolution API v2. Verifica contra la versión
//     desplegada en tu VPS (ver /evolution/README.md).
// ─────────────────────────────────────────────────────────────────────────────

const EVENTS = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'SEND_MESSAGE'];

/**
 * Crea un cliente atado a un VPS Evolution concreto.
 * @param {{ baseUrl:string, apiKey:string }} cfg
 */
function crearCliente({ baseUrl, apiKey }) {
  if (!baseUrl || !apiKey) throw new Error('Evolution: falta baseUrl o apiKey (secrets no seteados)');
  const root = String(baseUrl).replace(/\/+$/, '');

  async function req(method, path, body) {
    const res = await fetch(`${root}${path}`, {
      method,
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.response?.message || data?.message || `HTTP ${res.status}`;
      throw new Error(`Evolution ${method} ${path}: ${Array.isArray(msg) ? msg.join('; ') : msg}`);
    }
    return data;
  }

  return {
    /** Crea (o reusa) la instancia del tenant + le fija el webhook de entrada. */
    async crearInstancia(instanceName, { webhookUrl, webhookToken } = {}) {
      const data = await req('POST', '/instance/create', {
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        webhook: webhookUrl ? {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          headers: { 'x-webhook-token': webhookToken || '' },
          events: EVENTS,
        } : undefined,
      });
      // Evolution v2 devuelve el QR en `qrcode:{ base64, pairingCode, code }`.
      const qc = data.qrcode || data.qr || {};
      return { instanceName, qr: qc.base64 || null, pairingCode: qc.pairingCode || null, raw: data };
    },

    /** Estado de la sesión: 'open' | 'connecting' | 'close' | 'unknown'. */
    async estadoConexion(instanceName) {
      try {
        const data = await req('GET', `/instance/connectionState/${encodeURIComponent(instanceName)}`);
        return data?.instance?.state || data?.state || 'unknown';
      } catch (_) {
        return 'unknown';
      }
    },

    /** Re-obtiene un QR fresco (el modal lo refresca antes de que caduque). */
    async obtenerQR(instanceName) {
      const data = await req('GET', `/instance/connect/${encodeURIComponent(instanceName)}`);
      return { qr: data.base64 || null, pairingCode: data.pairingCode || null, code: data.code || null };
    },

    /** Señal "escribiendo…" (composing/paused/available) — anti-ban explícito. */
    async setPresencia(instanceName, numero, presence = 'composing', delayMs = 4000) {
      return req('POST', `/chat/sendPresence/${encodeURIComponent(instanceName)}`, {
        number: numero,
        presence,
        delay: delayMs,
      });
    },

    /** Envía texto con pacing: `delay` muestra "escribiendo…" antes de enviar.
     *  Anti-ban: el delay por defecto es ALEATORIO (3–8 s) — un ritmo fijo de
     *  4 s exactos en cada respuesta es firma de bot para la heurística de
     *  Meta; el jitter lo humaniza. Se puede fijar con delayMs si un caller
     *  necesita determinismo. */
    async enviarTexto(instanceName, numero, texto, { delayMs = null } = {}) {
      const delay = Number.isFinite(delayMs) && delayMs > 0
        ? delayMs
        : 3000 + Math.floor(Math.random() * 5000);   // 3000–7999 ms
      return req('POST', `/message/sendText/${encodeURIComponent(instanceName)}`, {
        number: numero,
        text: texto,
        delay,
      });
    },

    /** Cierra sesión (el teléfono vuelve a control 100% manual). */
    async logout(instanceName) {
      return req('DELETE', `/instance/logout/${encodeURIComponent(instanceName)}`);
    },

    /** Elimina la instancia del VPS por completo. */
    async eliminarInstancia(instanceName) {
      return req('DELETE', `/instance/delete/${encodeURIComponent(instanceName)}`);
    },

    /** (Re)fija el webhook de una instancia existente. */
    async setWebhook(instanceName, { url, token } = {}) {
      return req('POST', `/webhook/set/${encodeURIComponent(instanceName)}`, {
        webhook: {
          enabled: true,
          url,
          byEvents: false,
          base64: true,
          headers: { 'x-webhook-token': token || '' },
          events: EVENTS,
        },
      });
    },
  };
}

module.exports = { crearCliente, EVENTS };
