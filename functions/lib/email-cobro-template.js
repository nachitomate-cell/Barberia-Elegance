'use strict';

// functions/lib/email-cobro-template.js
// ─────────────────────────────────────────────────────────────────
//  Copy + HTML del aviso de mensualidad. Vive aparte para que la Cloud
//  Function (recordatorio-cobro.js) y el script de previsualización
//  (scripts/preview-email-cobro.js) rendericen EXACTAMENTE lo mismo:
//  lo que se revisa por diseño es lo que reciben los locales.
// ─────────────────────────────────────────────────────────────────

/** Copy según los días respecto al vencimiento (+ = atrasado). */
function buildMensaje(dias, monto) {
  const m = Number(monto) > 0 ? `$${Number(monto).toLocaleString('es-CL')}` : 'tu mensualidad';
  if (dias < 0) {
    const n = Math.abs(dias);
    return { title: `💳 Tu mensualidad vence en ${n} día${n !== 1 ? 's' : ''}`, body: `Paga ${m} a tiempo para mantener tu cuenta activa.` };
  }
  if (dias === 0) return { title: '💳 Tu mensualidad vence hoy', body: `Paga ${m} para mantener tu cuenta activa.` };
  if (dias < 8)  return { title: '⚠️ Tu mensualidad está atrasada', body: `Venció hace ${dias} día${dias !== 1 ? 's' : ''}. Regulariza ${m} para no perder funciones.` };
  if (dias < 15) return { title: '🔒 Secciones bloqueadas por falta de pago', body: `Llevas ${dias} días de atraso. Regulariza ${m} para reactivar Métricas, Comisiones y Caja.` };
  return { title: '⛔ Tu cuenta puede ser suspendida', body: `${dias} días de atraso. Regulariza ${m} hoy para evitar la suspensión.` };
}

/** HTML del correo. Tabla + estilos inline: es lo único que renderiza bien
 *  en Gmail/Outlook (ignoran <style> y flex/grid). */
function buildEmailHtml({ title, body, tid, nombreLocal }) {
  const url = `https://${tid === 'elegance' ? 'www' : tid}.synaptechspa.cl/gestion-interna/mensualidad`;
  const saludo = nombreLocal ? `Hola, ${nombreLocal}` : 'Hola';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${body}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.06);">

        <tr><td style="padding:22px 26px 0;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">SynapTech</p>
        </td></tr>

        <tr><td style="padding:14px 26px 8px;">
          <p style="margin:0 0 10px;font-size:13px;color:#6b7280;">${saludo},</p>
          <h1 style="margin:0 0 10px;font-size:19px;line-height:1.3;color:#111827;font-weight:800;">${title}</h1>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">${body}</p>
        </td></tr>

        <tr><td style="padding:20px 26px 6px;">
          <a href="${url}" style="display:block;text-align:center;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 20px;border-radius:10px;">Ver mi mensualidad</a>
        </td></tr>

        <tr><td style="padding:14px 26px 26px;">
          <p style="margin:0 0 10px;padding-top:14px;border-top:1px solid #f3f4f6;font-size:11px;line-height:1.6;color:#9ca3af;">
            Recibes este correo porque es el contacto de avisos de tu local.
            Puedes cambiarlo en el panel, en Configuración → Correo para avisos.
          </p>
          <p style="margin:0;font-size:11px;line-height:1.6;color:#9ca3af;">
            ¿Prefieres que te avisemos al teléfono? Activa las notificaciones en
            Configuración → Notificaciones del panel.
          </p>
        </td></tr>

      </table>
      <p style="margin:14px 0 0;font-size:10px;color:#b0b4bb;">SynapTech · Agenda y gestión para barberías</p>
    </td></tr>
  </table>
</body></html>`;
}

module.exports = { buildMensaje, buildEmailHtml };
