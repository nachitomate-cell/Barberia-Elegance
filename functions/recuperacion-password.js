'use strict';

// recuperacion-password.js
// Callable: genera un enlace de reset via Firebase Admin y lo envía
// por Resend desde citas@synaptechspa.cl (dominio con reputación).
// El cliente llama: firebase.functions().httpsCallable('enviarRecuperacionPassword')

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }       = require('firebase-functions/params');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const TENANT_CONFIG = {
  elegance: {
    nombre:   'Elegance Barbershop',
    color:    '#D4AF37',
    from:     'Elegance Barbershop <citas@synaptechspa.cl>',
    loginUrl: 'https://barberiaelegance.synaptechspa.cl/registro',
  },
  ferraza: {
    nombre:   'Barbería Ferraza',
    color:    '#C0392B',
    from:     'Barbería Ferraza <citas@synaptechspa.cl>',
    loginUrl: 'https://barberiaferraza.synaptechspa.cl/registro',
  },
  gitana: {
    nombre:   'Gitana Nails Studio',
    color:    '#8E44AD',
    from:     'Gitana Nails Studio <citas@synaptechspa.cl>',
    loginUrl: 'https://gitananails.synaptechspa.cl/registro',
  },
  mapubarbershop: {
    nombre:   'Mapu Barber Shop',
    color:    '#BFA37E',
    from:     'Mapu Barber Shop <citas@synaptechspa.cl>',
    loginUrl: 'https://mapubarbershop.synaptechspa.cl/registro',
  },
  chameleon: {
    nombre:   'Chameleon Barber Studio',
    slogan:   'Clásico y moderno, perfecto para tí!',
    color:    '#DAA520',
    from:     'Chameleon Barber Studio <citas@synaptechspa.cl>',
    loginUrl: 'https://chameleonbarber.synaptechspa.cl/registro',
  },
  lumen: {
    nombre:     "D'Jones Barber",
    slogan:     'Estilo y tradición',
    color:      '#C9A050',
    darkHeader: true,
    from:       "D'Jones Barber <citas@synaptechspa.cl>",
    loginUrl:   'https://djonesbarberia.synaptechspa.cl/registro',
  },
  delnero: {
    nombre:   'Del Nero Barber',
    slogan:   'Estilo que define. Arte que trasciende.',
    color:    '#DAA520',
    from:     'Del Nero Barber <citas@synaptechspa.cl>',
    loginUrl: 'https://delnerobarber.synaptechspa.cl/registro',
  },
  marcelo_hairdressing: {
    nombre:   'Marcelo Palma',
    slogan:   'Hairdressing & Estilo',
    color:    '#ffffff',
    darkHeader: true,
    from:     'Marcelo Palma <citas@synaptechspa.cl>',
    loginUrl: 'https://marcelohairdressing.synaptechspa.cl/registro',
  },
  aura: {
    nombre:     'AURA SALÓN & MALE GROOMING',
    slogan:     'Eleva Tu Aura',
    color:      '#6CABDD',
    from:       'AURA SALÓN & MALE GROOMING <citas@synaptechspa.cl>',
    loginUrl:   'https://aurasalonmalegrooming.synaptechspa.cl/registro',
  },
  machos: {
    nombre:   "Macho´s Barbershop",
    slogan:   'Calidad y Asesoría Profesional',
    color:    '#f97316',
    from:     "Macho´s Barbershop <citas@synaptechspa.cl>",
    loginUrl: 'https://machos.synaptechspa.cl/registro',
  },
  deluxeperfumes: {
    nombre:   'Deluxe Perfumes',
    slogan:   'Tu fragancia perfecta',
    color:    '#D4AF37',
    from:     'Deluxe Perfumes <citas@synaptechspa.cl>',
    loginUrl: 'https://deluxeperfumes.synaptechspa.cl/registro',
  },
  infinity: {
    nombre:   'INFINITY STUDIO',
    slogan:   'Ambiente familiar y confianza',
    color:    '#6366f1',
    from:     'INFINITY STUDIO <citas@synaptechspa.cl>',
    loginUrl: 'https://infinity.synaptechspa.cl/registro',
  },
  sionbarberia: {
    nombre:   'Sion Barbería',
    slogan:   'Calidad y Profesionalismo',
    color:    '#F57808',
    from:     'Sion Barbería <citas@synaptechspa.cl>',
    loginUrl: 'https://barberiasion.synaptechspa.cl/registro',
  },
  omegastudio: {
    nombre:   'OMEGA STUDIO',
    slogan:   'Estudio atendido por profesionales',
    color:    '#9CA3AF',
    from:     'OMEGA STUDIO <citas@synaptechspa.cl>',
    loginUrl: 'https://omegastudio.synaptechspa.cl/registro',
  },
};

// Mapa dominio → tenant (espejo de config.js). Permite resolver el local
// a partir del sitio real desde el que se hizo la petición (Origin/Referer),
// que es más confiable que el tenantId que manda el cliente.
const DOMAIN_MAP = {
  'gitananails.synaptechspa.cl':            'gitana',
  'barberiaelegance.synaptechspa.cl':       'elegance',
  'barberiaferraza.synaptechspa.cl':        'ferraza',
  'mapubarbershop.synaptechspa.cl':         'mapubarbershop',
  'chameleonbarber.synaptechspa.cl':        'chameleon',
  'deluxeperfumes.synaptechspa.cl':         'deluxeperfumes',
  'barberiadjones.synaptechspa.cl':         'lumen',
  'djonesbarberia.synaptechspa.cl':         'lumen',
  'delnerobarber.synaptechspa.cl':          'delnero',
  'marcelohairdressing.synaptechspa.cl':    'marcelo_hairdressing',
  'marcelo-hairdressing.synaptechspa.cl':   'marcelo_hairdressing',
  'marcelopalma.synaptechspa.cl':           'marcelo_hairdressing',
  'aurasalon.synaptechspa.cl':              'aura',
  'aurasalonmalegrooming.synaptech.cl':     'aura',
  'aurasalonmalegrooming.synaptechspa.cl':  'aura',
  'machos.synaptechspa.cl':                 'machos',
  'infinity.synaptechspa.cl':               'infinity',
  'sionbarberia.synaptechspa.cl':           'sionbarberia',
  'barberiasion.synaptechspa.cl':           'sionbarberia',
  'omegastudio.synaptechspa.cl':            'omegastudio',
};

// Extrae el hostname desde un header Origin/Referer (ej. "https://x.cl/registro" → "x.cl")
function hostFromHeader(value) {
  if (!value) return '';
  try { return new URL(value).hostname.toLowerCase(); } catch { return ''; }
}

// Resuelve el tenant priorizando el dominio real de la petición, luego el
// tenantId enviado por el cliente, y solo como último recurso "elegance".
function resolveTenantId({ tenantId, hostHint, rawRequest }) {
  const headers = rawRequest?.headers || {};
  const host =
    hostFromHeader(headers.origin) ||
    hostFromHeader(headers.referer) ||
    (hostHint ? String(hostHint).toLowerCase() : '');

  const fromDomain = DOMAIN_MAP[host];
  if (fromDomain && TENANT_CONFIG[fromDomain]) return fromDomain;
  if (tenantId && TENANT_CONFIG[tenantId])     return tenantId;
  return 'elegance';
}

async function sendResend(apiKey, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

function buildResetEmailHtml({ cfg, resetLink }) {
  const btnColor   = cfg.color;
  const isDark     = !!cfg.darkHeader;
  const btnTextClr = isDark ? '#0f172a' : '#000000';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Recuperar contraseña — ${cfg.nombre}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111115;border-radius:16px;overflow:hidden;border:1px solid #222228;">

        <tr>
          <td style="background:${isDark ? '#030f1a' : btnColor};padding:32px 36px 28px;${isDark ? `border-bottom:2px solid ${btnColor};` : ''}">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${isDark ? btnColor : 'rgba(0,0,0,0.55)'};">${cfg.nombre}</p>
            <h1 style="margin:0;font-size:24px;font-weight:900;color:${isDark ? '#f1f5f9' : '#000'};letter-spacing:-0.3px;">Recuperar contraseña</h1>
            ${cfg.slogan ? `<p style="margin:8px 0 0;font-size:12px;letter-spacing:2px;font-style:italic;color:${isDark ? btnColor + 'bb' : 'rgba(0,0,0,0.4)'};">${cfg.slogan}</p>` : ''}
          </td>
        </tr>

        <tr>
          <td style="padding:28px 36px 8px;">
            <p style="margin:0 0 16px;font-size:15px;color:#cccccc;line-height:1.6;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta en
              <strong style="color:#fff;">${cfg.nombre}</strong>.
            </p>
            <p style="margin:0 0 28px;font-size:14px;color:#888;line-height:1.6;">
              Haz clic en el botón de abajo para elegir una nueva contraseña.
              Este enlace es válido por <strong style="color:#aaa;">1 hora</strong>.
            </p>
            <a href="${resetLink}"
              style="display:inline-block;padding:14px 36px;background:${btnColor};color:${btnTextClr};font-size:14px;font-weight:700;border-radius:100px;text-decoration:none;letter-spacing:0.04em;text-transform:uppercase;">
              Restablecer contraseña
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 36px;">
            <p style="margin:0;font-size:12px;color:#444;line-height:1.7;">
              Si no solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá siendo la misma y nadie tendrá acceso a tu cuenta.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 36px 24px;border-top:1px solid #1e1e24;">
            <p style="margin:0;font-size:11px;color:#333;">
              Este correo fue enviado automáticamente por ${cfg.nombre}.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

exports.enviarRecuperacionPassword = onCall(
  { region: 'us-central1', secrets: [RESEND_API_KEY] },
  async (request) => {
    const { email, tenantId, host } = request.data || {};

    if (!email || !String(email).includes('@')) {
      throw new HttpsError('invalid-argument', 'Correo electrónico inválido.');
    }

    const resolvedTenant = resolveTenantId({
      tenantId,
      hostHint:   host,
      rawRequest: request.rawRequest,
    });
    const cfg = TENANT_CONFIG[resolvedTenant];

    // Generar enlace seguro via Firebase Admin
    let resetLink;
    try {
      resetLink = await admin.auth().generatePasswordResetLink(
        email.toLowerCase().trim(),
      );
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        // Responder ok para no revelar qué emails están registrados
        logger.info(`[Reset] Sin cuenta para ${email} — respondiendo ok por seguridad`);
        return { ok: true };
      }
      logger.error('[Reset] generatePasswordResetLink:', err.message);
      throw new HttpsError('internal', 'No se pudo generar el enlace de recuperación.');
    }

    const html = buildResetEmailHtml({ cfg, resetLink });

    try {
      await sendResend(RESEND_API_KEY.value(), {
        from:    cfg.from,
        to:      [email.toLowerCase().trim()],
        subject: `🔑 Recupera tu contraseña — ${cfg.nombre}`,
        html,
      });
    } catch (err) {
      logger.error('[Reset] Resend error:', err.message);
      throw new HttpsError('internal', 'No se pudo enviar el correo. Intenta de nuevo.');
    }

    logger.info(`[Reset] Email enviado a ${email} (tenant solicitado: ${tenantId || '—'} → resuelto: ${resolvedTenant})`);
    return { ok: true };
  },
);
