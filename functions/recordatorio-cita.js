'use strict';

// functions/recordatorio-cita.js
// ─────────────────────────────────────────────────────────────────
//  RECORDATORIOS DE CITA: 24H (WhatsApp/FCM) & 1H (Email via Resend)
//
//  Deploy:
//    firebase deploy --only functions:recordatorioCita24h,functions:recordatorioCita1h
// ─────────────────────────────────────────────────────────────────

const { onSchedule }   = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { logger }       = require('firebase-functions');
const admin            = require('firebase-admin');
const { writeNotifLog } = require('./lib/notif-log');

const db        = admin.firestore();
const messaging = admin.messaging();

const TIMEZONE = 'America/Santiago';

const TENANTS_LIST = [
  { id: 'elegance', citasPath: 'citas',                   clientesPath: 'clientes'                   },
  { id: 'gitana',   citasPath: 'tenants/gitana/citas',    clientesPath: 'tenants/gitana/clientes'    },
  { id: 'ferraza',  citasPath: 'tenants/ferraza/citas',   clientesPath: 'tenants/ferraza/clientes'   },
];

const secretSid  = defineSecret('TWILIO_ACCOUNT_SID');
const secretAuth = defineSecret('TWILIO_AUTH_TOKEN');
const secretFrom = defineSecret('TWILIO_WA_FROM');
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

// ── Master Tenant Config for 1H Email Reminders ──────────────────
const TENANT_CONFIG = {
  elegance: {
    nombre:    'Elegance Barbershop',
    direccion: 'Ecuador 243, Viña del Mar',
    horario:   'Lun–Sáb: 10–20h · Dom: 12–20h',
    color:     '#D4AF37',
    instagram: 'https://www.instagram.com/elegance.cl_/',
    whatsapp:  '',
    from:      'Elegance Barbershop <citas@synaptechspa.cl>',
    dashboardUrl: 'https://barberiaelegance.synaptechspa.cl/dashboard',
  },
  ferraza: {
    nombre:    'Barbería Ferraza',
    direccion: 'Av. Libertad 63 / Local 28',
    horario:   'Lun–Sáb: 10–20h',
    color:     '#C0392B',
    instagram: '',
    whatsapp:  '56994269228',
    from:      'Barbería Ferraza <citas@synaptechspa.cl>',
    dashboardUrl: 'https://barberiaferraza.synaptechspa.cl/dashboard',
  },
  gitana: {
    nombre:    'Gitana Nails Studio',
    direccion: 'Las Encinas 1390 local 18, Concón',
    horario:   'Atención con hora previa',
    color:     '#8E44AD',
    instagram: 'https://www.instagram.com/gitana.nails.studio',
    whatsapp:  '56997023355',
    from:      'Gitana Nails Studio <citas@synaptechspa.cl>',
    dashboardUrl: 'https://gitananails.synaptechspa.cl/dashboard',
  },
  mapubarbershop: {
    nombre:    'Mapu Barber Shop',
    direccion: '',
    horario:   '',
    color:     '#BFA37E',
    instagram: '',
    whatsapp:  '',
    from:      'Mapu Barber Shop <citas@synaptechspa.cl>',
    dashboardUrl: 'https://mapubarbershop.synaptechspa.cl/dashboard',
  },
  chameleon: {
    nombre:    'Chameleon Barber Studio',
    slogan:    'Clásico y moderno, perfecto para tí!',
    direccion: 'Av. Libertad 868, Viña del Mar',
    horario:   'Lun–Sáb: 10:30–20:00 hrs.',
    color:     '#DAA520',
    instagram: 'https://www.instagram.com/chameleon.barberstudio/',
    whatsapp:  '56928186861',
    from:      'Chameleon Barber Studio <citas@synaptechspa.cl>',
    dashboardUrl: 'https://chameleonbarber.synaptechspa.cl/dashboard',
  },
  lumen: {
    nombre:      "D'Jones Barber",
    slogan:      'Estilo y tradición',
    direccion:   'Villanelo 279, Viña del Mar',
    horario:     'Lun a Sáb: 10:00 – 20:15 hrs | Dom: 09:00 – 20:00 hrs',
    color:       '#C9A050',
    darkHeader:  true,
    instagram:   'https://www.instagram.com/d.jonesbarberia/',
    whatsapp:    '56929808223',
    from:        "D'Jones Barber <citas@synaptechspa.cl>",
    dashboardUrl:'https://barberiadjones.synaptechspa.cl/dashboard',
  },
  delnero: {
    nombre:   'Del Nero Barber',
    slogan:   'Estilo que define. Arte que trasciende.',
    direccion: 'Curauma / Placilla',
    horario:   'Lun a Sáb: 10:00 – 20:00 hrs.',
    color:    '#DAA520',
    from:     'Del Nero Barber <citas@synaptechspa.cl>',
    dashboardUrl: 'https://delnerobarber.synaptechspa.cl/dashboard',
  },
  marcelo_hairdressing: {
    nombre:   'Marcelo Palma',
    slogan:   'Hairdressing & Estilo',
    direccion: 'Curauma / Placilla',
    horario:   'Lun a Sáb: 10:00 – 20:00 hrs.',
    color:    '#ffffff',
    darkHeader: true,
    from:     'Marcelo Palma <citas@synaptechspa.cl>',
    dashboardUrl: 'https://marcelohairdressing.synaptechspa.cl/dashboard',
  },
  aura: {
    nombre:      'AURA SALÓN & MALE GROOMING',
    slogan:      'Eleva Tu Aura',
    direccion:   'Viña del Mar',
    horario:     'Lun–Sáb: 10:00–20:00 hrs.',
    color:       '#6CABDD',
    instagram:   'https://www.instagram.com/aura.salon.cl/',
    whatsapp:    '56966153086',
    from:        'AURA SALÓN & MALE GROOMING <citas@synaptechspa.cl>',
    dashboardUrl:'https://aurasalon.synaptechspa.cl/dashboard',
  },
  latincaribe: {
    nombre:      'The Latin Caribe',
    slogan:      'Más que un corte, una experiencia.',
    direccion:   'Manuel Rodríguez 299, Copiapó',
    horario:     'Lun–Sáb: 11:00–21:00 · Dom: 12:00–20:00',
    color:       '#35DDE6',
    darkHeader:  true,
    instagram:   '',
    whatsapp:    '',
    from:        'The Latin Caribe <citas@synaptechspa.cl>',
    dashboardUrl:'https://latincaribe.synaptechspa.cl/dashboard',
  },
  machos: {
    nombre:      "Macho´s Barbershop",
    slogan:      'Calidad y Asesoría Profesional',
    direccion:   '4 Norte 477 local 5, Viña del Mar',
    horario:     'Lun–Sáb: 10:00–20:00 hrs · Dom: 11:00–17:00 hrs',
    color:       '#f97316',
    instagram:   'https://www.instagram.com/machos_barbershop.cl/',
    whatsapp:    '56978390422',
    from:        "Macho´s Barbershop <citas@synaptechspa.cl>",
    dashboardUrl:'https://machos.synaptechspa.cl/dashboard',
  },
  deluxeperfumes: {
    nombre:   'Deluxe Perfumes',
    slogan:   'Tu fragancia perfecta',
    direccion: '1/2 Oriente 831, Oficina 601, Viña del Mar',
    horario:   '🚚 Delivery en Viña, Valparaíso y Con-Con.',
    color:    '#D4AF37',
    from:     'Deluxe Perfumes <citas@synaptechspa.cl>',
    dashboardUrl: 'https://deluxeperfumes.synaptechspa.cl/dashboard',
  },
  infinity: {
    nombre:   'INFINITY STUDIO',
    slogan:   'Ambiente familiar y confianza',
    direccion: 'Traslaviña 114, Viña del Mar',
    horario:   'Lun a Sáb: 10:00 – 20:00 hrs.',
    color:    '#6366f1',
    from:     'INFINITY STUDIO <citas@synaptechspa.cl>',
    dashboardUrl: 'https://infinity.synaptechspa.cl/dashboard',
  },
  sionbarberia: {
    nombre:    'Sion Barbería',
    slogan:    'Calidad y Profesionalismo',
    direccion: 'Av. Libertad 123, Viña del Mar',
    horario:   'Lun–Sáb: 10:00–20:00 hrs',
    color:     '#F57808',
    instagram: 'https://www.instagram.com/sionbarberia/',
    whatsapp:  '56988888888',
    from:      'Sion Barbería <citas@synaptechspa.cl>',
    dashboardUrl: 'https://barberiasion.synaptechspa.cl/dashboard',
  },
  kronnos_penablanca: {
    nombre:      'Kronnos Studio Peñablanca',
    slogan:      'Un espacio unisex donde ambos mundos convergen',
    direccion:   'Av. Vicepresidente Bernardo Leighton 20, local 13, Villa Alemana',
    horario:     'Lun a Sáb · 10:30 – 19:00',
    color:       '#e11d2a',
    instagram:   '',
    whatsapp:    '56982504870',
    from:        'Kronnos Studio Peñablanca <citas@synaptechspa.cl>',
    dashboardUrl:'https://kronnospenablanca.synaptechspa.cl/dashboard',
  },
  kronnos_limache: {
    nombre:      'Kronnos Studio Limache',
    slogan:      'Un espacio unisex donde ambos mundos convergen',
    direccion:   'Paseo Las Araucarias 405, local 5, Limache',
    horario:     'Lun a Sáb · 10:30 – 19:00',
    color:       '#f97316',
    instagram:   '',
    whatsapp:    '56920241041',
    from:        'Kronnos Studio Limache <citas@synaptechspa.cl>',
    dashboardUrl:'https://kronnoslimache.synaptechspa.cl/dashboard',
  },
  kronnos_woman: {
    nombre:      'Kronnos Woman',
    slogan:      'Belleza y estilo en un solo lugar',
    direccion:   'Palmira Romano Sur 405, local 3, Limache',
    horario:     'Lun a Dom · 09:30 – 23:00',
    color:       '#ec4899',
    instagram:   '',
    whatsapp:    '',
    from:        'Kronnos Woman <citas@synaptechspa.cl>',
    dashboardUrl:'https://kronnoswoman.synaptechspa.cl/dashboard',
  },
};

// ── Shared Helpers ────────────────────────────────────────────────
function fmtFecha(fechaStr) {
  if (!fechaStr) return '—';
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase());
}

function fmtPrecio(precio) {
  const n = Number(precio);
  if (!n) return null;
  return `$${n.toLocaleString('es-CL')}`;
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

function getSantiagoDateString(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year:  'numeric',
    month: '2-digit',
    day:   '2-digit',
  });
  return dtf.format(d);
}

function getSantiagoNowParts() {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = dtf.formatToParts(new Date());
  const map = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  return {
    year:   parseInt(map.year, 10),
    month:  parseInt(map.month, 10),
    day:    parseInt(map.day, 10),
    hour:   parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
  };
}

function getMinutesDiff(nowParts, fechaStr, horaStr) {
  if (!fechaStr || !horaStr) return null;
  const [apptYear, apptMonth, apptDay] = fechaStr.split('-').map(Number);
  const [apptHour, apptMin] = horaStr.split(':').map(Number);
  
  const nowUtc = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, nowParts.hour, nowParts.minute);
  const apptUtc = Date.UTC(apptYear, apptMonth - 1, apptDay, apptHour, apptMin);
  
  return (apptUtc - nowUtc) / (1000 * 60);
}

function buildWAMessage(nombre, hora, barbero, servicio) {
  const quien    = barbero  ? ` con *${barbero}*`    : '';
  const servText = servicio ? ` para *${servicio}*`  : '';
  return (
    `✂️ *Recordatorio de cita — Barbería Elegance*\n\n` +
    `Hola *${nombre}*! Te recordamos que mañana a las *${hora} hrs*` +
    `${servText}${quien} tienes tu cita agendada.\n\n` +
    `Si necesitas cancelar o reagendar, responde este mensaje. ¡Te esperamos! 💈`
  );
}

function build1hEmailHtml({ cfg, cita }) {
  const btnColor   = cfg.color;
  const isDark     = !!cfg.darkHeader;
  const btnTextClr = isDark ? '#f1f5f9' : '#000000';
  const nombre     = cita.clienteNombre || 'Cliente';
  const fechaFmt   = fmtFecha(cita.fecha);
  const duracion   = cita.duracion ? `${cita.duracion} min` : null;
  const precio     = fmtPrecio(cita.precio);

  const filaExtra = (label, value) => value ? `
    <tr>
      <td style="padding:6px 0;color:#999;font-size:13px;width:130px;">${label}</td>
      <td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:600;">${value}</td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Tu cita comienza en 1 hora — ${cfg.nombre}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111115;border-radius:16px;overflow:hidden;border:1px solid #222228;">

        <!-- Header con color del tenant -->
        <tr>
          <td style="background:${isDark ? '#030f1a' : btnColor};padding:32px 36px 28px;${isDark ? `border-bottom:2px solid ${btnColor};` : ''}">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${isDark ? btnColor : 'rgba(0,0,0,0.55)'};">${cfg.nombre}</p>
            <h1 style="margin:0;font-size:26px;font-weight:900;color:${isDark ? '#f1f5f9' : '#000'};letter-spacing:-0.5px;">⏰ ¡Cita en 1 hora!</h1>
            ${cfg.slogan ? `<p style="margin:8px 0 0;font-size:12px;letter-spacing:2px;font-style:italic;color:${isDark ? btnColor + 'bb' : 'rgba(0,0,0,0.4)'};">${cfg.slogan}</p>` : ''}
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td style="padding:28px 36px 0;">
            <p style="margin:0;font-size:15px;color:#cccccc;line-height:1.6;">
              Hola <strong style="color:#fff;">${nombre}</strong>, te recordamos que tu cita en <strong style="color:#fff;">${cfg.nombre}</strong> está programada para comenzar en **1 hora**. ¡Prepárate, te estaremos esperando!
            </p>
          </td>
        </tr>

        <!-- Tarjeta de la cita -->
        <tr>
          <td style="padding:24px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#1a1a1f;border-radius:12px;border:1px solid #2a2a30;padding:20px 24px;">
              <tr>
                <td>
                  <p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${btnColor};">Detalle de tu cita</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${filaExtra('📅 Fecha',    fechaFmt)}
                    ${filaExtra('🕐 Hora',     cita.hora ? `${cita.hora} hrs` : null)}
                    ${filaExtra('✂️ Servicio',  cita.servicioNombre)}
                    ${filaExtra('💈 Barbero',   cita.barbero || cita.barberoNombre)}
                    ${filaExtra('📍 Sede',      cita.sucursalNombre || null)}
                    ${filaExtra('⏱ Duración',  duracion)}
                    ${filaExtra('💰 Precio',    precio)}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Info del local -->
        ${(cfg.direccion || cfg.horario) ? `
        <tr>
          <td style="padding:0 36px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#141417;border-radius:10px;border:1px solid #1e1e24;padding:16px 20px;">
              ${cfg.direccion ? `<tr><td style="font-size:13px;color:#888;padding:3px 0;">📍 ${cfg.direccion}</td></tr>` : ''}
              ${cfg.horario   ? `<tr><td style="font-size:13px;color:#888;padding:3px 0;">🕒 ${cfg.horario}</td></tr>`   : ''}
            </table>
          </td>
        </tr>` : ''}

        <!-- Botón Ver Cita -->
        <tr>
          <td style="padding:0 36px 28px;">
            <a href="${cfg.dashboardUrl}"
              style="display:inline-block;padding:14px 36px;background:${isDark ? '#030f1a' : btnColor};color:${isDark ? btnColor : '#000000'};font-size:14px;font-weight:700;border-radius:100px;text-decoration:none;letter-spacing:0.04em;text-transform:uppercase;border:${isDark ? `1px solid ${btnColor}` : 'none'};">
              Ver en el Club
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #1e1e24;">
            <p style="margin:0;font-size:11px;color:#444;line-height:1.6;">
              Este correo fue enviado automáticamente como recordatorio de tu cita en ${cfg.nombre}.
              ${cfg.instagram ? `· <a href="${cfg.instagram}" style="color:#555;text-decoration:none;">Instagram</a>` : ''}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// ── Cron 1: 19:00 Santiago — enviar recordatorios 24h antes (WhatsApp / FCM) ──
exports.recordatorioCita24h = onSchedule(
  {
    schedule:  '0 19 * * *',
    timeZone:  TIMEZONE,
    secrets:   [secretSid, secretAuth, secretFrom],
  },
  async () => {
    const mananaISO = getSantiagoDateString(1);
    logger.info(`[Recordatorio 24h] Buscando citas para ${mananaISO}`);

    const sid  = secretSid.value();
    const auth = secretAuth.value();
    const from = secretFrom.value();
    const twilioClient = (sid && auth) ? require('twilio')(sid, auth) : null;

    if (!twilioClient) {
      logger.warn('[Recordatorio 24h] Twilio no configurado — solo se enviará FCM push');
    }

    let totalWA  = 0;
    let totalFCM = 0;

    for (const tenant of TENANTS_LIST) {
      const citasCol    = db.collection(tenant.citasPath);
      const clientesCol = db.collection(tenant.clientesPath);

      const snap = await citasCol
        .where('fecha', '==', mananaISO)
        .where('estado', 'in', ['pendiente', 'Pendiente', 'confirmada', 'Confirmada', 'Confirmado'])
        .get();

      if (snap.empty) {
        logger.info(`[Recordatorio 24h] ${tenant.id}: sin citas para ${mananaISO}`);
        continue;
      }

      logger.info(`[Recordatorio 24h] ${tenant.id}: ${snap.size} cita(s)`);

      for (const citaDoc of snap.docs) {
        const cita   = citaDoc.data();
        const citaId = citaDoc.id;

        if (cita.recordatorio24hEnviado === true) {
          logger.info(`[Recordatorio 24h] ${citaId}: ya procesado, omitiendo`);
          continue;
        }
        await citaDoc.ref.update({ recordatorio24hEnviado: true });

        const telefono = (cita.clienteTelefono || '').replace(/\D/g, '');
        const nombre   = cita.clienteNombre || cita.nombre || 'Cliente';
        const hora     = cita.hora          || '';
        const barbero  = cita.barbero       || cita.barberoNombre || '';
        const servicio = cita.servicioNombre || '';

        if (!telefono) {
          logger.warn(`[Recordatorio 24h] ${citaId}: sin teléfono, omitiendo`);
          continue;
        }

        // WhatsApp Twilio
        if (twilioClient && from) {
          const phoneE164 = `+${telefono}`;
          try {
            await twilioClient.messages.create({
              from: from,
              to:   `whatsapp:${phoneE164}`,
              body: buildWAMessage(nombre, hora, barbero, servicio),
            });
            logger.info(`[WA] ✓ ${nombre} (${telefono}) → cita ${citaId}`);
            totalWA++;
            await writeNotifLog(db, {
              tenantId: tenant.id,
              type:    'whatsapp_24h',
              channel: 'whatsapp',
              status:  'sent',
              to:      { nombre, telefono },
              meta:    { citaId, fecha: mananaISO, hora },
            });
          } catch (err) {
            logger.warn(`[WA] ✗ ${telefono} / ${citaId}: ${err.message}`);
          }
        }

        // FCM push
        const clienteSnap = await clientesCol.doc(telefono).get();
        const fcmToken    = clienteSnap.exists ? (clienteSnap.data().fcmToken || null) : null;

        if (!fcmToken) continue;

        const bodyDetalle = barbero
          ? `Mañana a las ${hora} hrs con ${barbero}.`
          : `Mañana a las ${hora} hrs.`;

        try {
          await messaging.send({
            token: fcmToken,
            notification: {
              title: '📅 Recordatorio de cita',
              body:  `¡Hola ${nombre}! ${bodyDetalle}`,
            },
            data: {
              citaId:   citaId,
              tipo:     'recordatorio',
              tenantId: tenant.id,
            },
            webpush: {
              notification: {
                icon:     '/icons/icon-192.png',
                badge:    '/icons/icon-192.png',
                tag:      `recordatorio-${citaId}`,
                renotify: false,
                vibrate:  [200, 100, 200],
                actions:  [
                  { action: 'confirmar', title: '✅ Confirmar' },
                  { action: 'cancelar',  title: '❌ Cancelar'  },
                ],
              },
              fcmOptions: { link: '/dashboard.html' },
            },
          });
          logger.info(`[FCM] ✓ ${nombre} (${telefono}) → cita ${citaId}`);
          totalFCM++;
        } catch (err) {
          logger.warn(`[FCM] ✗ ${telefono} / ${citaId}: ${err.code || err.message}`);
        }
      }
    }

    logger.info(`[Recordatorio 24h] Resumen: WA=${totalWA} FCM=${totalFCM}`);
  },
);

// ── Cron 2: cada 30 min (07:00–22:30 Santiago) — recordatorios por Email 1h antes ──
//
// OPTIMIZACION DE COSTO (mayo 2026):
//   - Antes: '*/15 * * * *' (96 ejecuciones/dia, 24/7) → ~2880 invocaciones/mes
//   - Ahora: '*/30 7-22 * * *' (32 ejecuciones/dia, solo horario operativo)
//     → ~960 invocaciones/mes = 67% menos.
//   - La ventana de envio es 30-90 min antes de la cita, asi que cada 30 min
//     cubre todas las citas posibles. No se pierde ninguna.
//   - Salir temprano si no hay citas (sin logger.info verboso) reduce
//     Cloud Logging que cobra por GB ingerido.
exports.recordatorioCita1h = onSchedule(
  {
    schedule: '*/30 7-22 * * *',
    timeZone: TIMEZONE,
    secrets:  [RESEND_API_KEY],
  },
  async () => {
    const todayStr    = getSantiagoDateString(0);
    const tomorrowStr = getSantiagoDateString(1);
    const nowParts    = getSantiagoNowParts();

    // Sin logger.info al inicio: corre 32 veces al dia. Solo loggeamos cuando
    // efectivamente hay algo que enviar (mas abajo).

    const promises = [];

    // 1. Root Collection (Elegance)
    promises.push((async () => {
      try {
        const snap = await db.collection('citas')
          .where('fecha', 'in', [todayStr, tomorrowStr])
          .get();
        return { tenantId: 'elegance', docs: snap.docs };
      } catch (err) {
        logger.error(`[Recordatorio 1h] Error root collection:`, err.message);
        return { tenantId: 'elegance', docs: [] };
      }
    })());

    // 2. Tenant Collections
    // OJO: los docs padre tenants/{id} NO existen como documentos (solo tienen
    // subcolecciones), por eso collection('tenants').get() devuelve 0 y se
    // saltaban TODOS los tenants (solo elegance recibía el correo 1h).
    // listDocuments() sí lista esas referencias.
    try {
      const tenantRefs = await db.collection('tenants').listDocuments();
      for (const tenantRef of tenantRefs) {
        const tid = tenantRef.id;
        if (tid === 'elegance') continue; // ya cubierto por la colección root
        promises.push((async () => {
          try {
            const snap = await db.collection(`tenants/${tid}/citas`)
              .where('fecha', 'in', [todayStr, tomorrowStr])
              .get();
            return { tenantId: tid, docs: snap.docs };
          } catch (err) {
            logger.error(`[Recordatorio 1h] Error tenant ${tid} collection:`, err.message);
            return { tenantId: tid, docs: [] };
          }
        })());
      }
    } catch (err) {
      logger.error(`[Recordatorio 1h] Error fetching tenants list:`, err.message);
    }

    const results = await Promise.all(promises);
    const toSend = [];

    for (const res of results) {
      const { tenantId, docs } = res;
      for (const doc of docs) {
        const cita = doc.data();

        if (cita.recordatorio1hEnviado === true) continue;

        const estado = (cita.estado || '').toLowerCase();
        if (!['pendiente', 'confirmada', 'confirmado'].includes(estado)) continue;

        const diff = getMinutesDiff(nowParts, cita.fecha, cita.hora);
        if (diff === null) continue;

        // Mandar el correo si faltan entre 30 y 90 minutos para la cita
        if (diff >= 30 && diff <= 90) {
          toSend.push({
            ref:      doc.ref,
            tenantId,
            citaId:   doc.id,
            cita
          });
        }
      }
    }

    if (toSend.length === 0) {
      // Salir silencioso — el cron corre 32 veces al dia y la mayoria no tendra citas
      // en la ventana de 30-90 min. Loggear cada vez infla Cloud Logging.
      return;
    }

    logger.info(`[Recordatorio 1h] Enviando correos para ${toSend.length} cita(s)`);
    const apiKey = RESEND_API_KEY.value();

    for (const item of toSend) {
      const { ref, tenantId, citaId, cita } = item;
      const email = cita.clienteEmail;

      if (!email || !email.includes('@')) {
        logger.warn(`[Recordatorio 1h] Cita ${citaId} (${tenantId}) sin email válido. Omitiendo.`);
        continue;
      }

      // Marcar antes de enviar para evitar envíos múltiples (Idempotencia)
      await ref.update({ recordatorio1hEnviado: true });

      const cfg = TENANT_CONFIG[tenantId] || TENANT_CONFIG.elegance;
      const html = build1hEmailHtml({ cfg, cita });

      try {
        await sendResend(apiKey, {
          from:    cfg.from,
          to:      [email.toLowerCase().trim()],
          subject: `⏰ Tu cita comienza en 1 hora — ${cfg.nombre}`,
          html,
        });
        logger.info(`[Email 1H] ✓ Enviado exitosamente a ${email} para cita ${citaId} (${tenantId})`);
        await writeNotifLog(db, {
          tenantId,
          type:    'email_recordatorio_1h',
          channel: 'email',
          status:  'sent',
          to:      { nombre: cita.clienteNombre || '', email },
          meta:    { citaId, servicio: cita.servicioNombre || '', fecha: cita.fecha || '', hora: cita.hora || '' },
        });
      } catch (err) {
        // En caso de error de Resend, desmarcar para reintento en el siguiente ciclo
        await ref.update({ recordatorio1hEnviado: false });
        logger.error(`[Email 1H] ✗ Error enviando correo a ${email} para cita ${citaId}:`, err.message);
      }
    }
  }
);

// ── Helpers para el push 30 min al cliente ───────────────────────
function fcmTokensColPath(tenantId) {
  return tenantId === 'elegance' ? 'fcm_tokens' : `tenants/${tenantId}/fcm_tokens`;
}

// Tokens del cliente (registrados desde dashboard.html con userId == uid).
async function tokensClienteDe(tenantId, uid) {
  if (!uid) return [];
  try {
    const snap = await db.collection(fcmTokensColPath(tenantId))
      .where('userId', '==', uid)
      .where('activo', '==', true)
      .get();
    return snap.docs.map(d => ({ id: d.id, token: d.data().token })).filter(t => t.token);
  } catch (e) {
    logger.warn(`[Recordatorio 30min] tokens ${tenantId}/${uid}: ${e.message}`);
    return [];
  }
}

// Resuelve el uid del cliente desde los campos posibles de la cita.
async function resolverUidCliente(tenantId, cita) {
  if (cita.clienteUid) return cita.clienteUid;
  if (cita.clienteId && cita.clienteId.length > 12) return cita.clienteId; // probablemente firebaseUid
  const email = (cita.clienteEmail || '').toLowerCase().trim();
  if (!email) return null;
  try {
    const usersPath = tenantId === 'elegance' ? 'users' : `tenants/${tenantId}/users`;
    const q = await db.collection(usersPath).where('email', '==', email).limit(1).get();
    return q.empty ? null : q.docs[0].id;
  } catch (_) { return null; }
}

// ── Cron 3: cada 10 min (07:00–22:00 Santiago) — recordatorio PUSH 30 min antes ──
//
//  Envía notificación push FCM al CLIENTE ~30 min antes de su cita.
//  Reemplaza al recordatorio que antes solo existía como timer local en
//  dashboard.html (que únicamente funcionaba con la pestaña abierta).
//  WhatsApp 24h y Email 1h se mantienen como respaldo en sus propios crons.
//
//  Tokens del cliente: fcm_tokens (elegance) | tenants/{tid}/fcm_tokens,
//  filtrando por userId == uid del cliente y activo == true.
//  Idempotente por cita con el flag recordatorio30minEnviado.
exports.recordatorioCita30min = onSchedule(
  {
    schedule: '*/10 7-22 * * *',
    timeZone: TIMEZONE,
  },
  async () => {
    const todayStr    = getSantiagoDateString(0);
    const tomorrowStr = getSantiagoDateString(1);
    const nowParts    = getSantiagoNowParts();

    const promises = [];

    // 1. Root Collection (Elegance)
    promises.push((async () => {
      try {
        const snap = await db.collection('citas')
          .where('fecha', 'in', [todayStr, tomorrowStr])
          .get();
        return { tenantId: 'elegance', docs: snap.docs };
      } catch (err) {
        logger.error('[Recordatorio 30min] Error root collection:', err.message);
        return { tenantId: 'elegance', docs: [] };
      }
    })());

    // 2. Tenant Collections
    // OJO: los docs padre tenants/{id} NO existen como documentos (solo tienen
    // subcolecciones), por eso collection('tenants').get() devuelve 0 y se
    // saltaba TODOS los tenants. listDocuments() sí lista esas referencias.
    try {
      const tenantRefs = await db.collection('tenants').listDocuments();
      for (const tenantRef of tenantRefs) {
        const tid = tenantRef.id;
        if (tid === 'elegance') continue; // ya cubierto por la colección root
        promises.push((async () => {
          try {
            const snap = await db.collection(`tenants/${tid}/citas`)
              .where('fecha', 'in', [todayStr, tomorrowStr])
              .get();
            return { tenantId: tid, docs: snap.docs };
          } catch (err) {
            logger.error(`[Recordatorio 30min] Error tenant ${tid}:`, err.message);
            return { tenantId: tid, docs: [] };
          }
        })());
      }
    } catch (err) {
      logger.error('[Recordatorio 30min] Error fetching tenants:', err.message);
    }

    const results = await Promise.all(promises);
    const toSend = [];

    for (const res of results) {
      const { tenantId, docs } = res;
      for (const doc of docs) {
        const cita = doc.data();
        if (cita.recordatorio30minEnviado === true) continue;

        const estado = (cita.estado || '').toLowerCase();
        if (!['pendiente', 'confirmada', 'confirmado'].includes(estado)) continue;

        const diff = getMinutesDiff(nowParts, cita.fecha, cita.hora);
        if (diff === null) continue;

        // Ventana 25–37 min: con cron cada 10 min + idempotencia, ninguna cita se escapa.
        if (diff >= 25 && diff <= 37) {
          toSend.push({ ref: doc.ref, tenantId, citaId: doc.id, cita });
        }
      }
    }

    if (toSend.length === 0) return; // salida silenciosa (corre muchas veces al día)

    logger.info(`[Recordatorio 30min] Procesando ${toSend.length} cita(s)`);

    for (const item of toSend) {
      const { ref, tenantId, citaId, cita } = item;

      const uid = await resolverUidCliente(tenantId, cita);
      if (!uid) continue; // cliente no es miembro del Club / sin perfil

      const tokens = await tokensClienteDe(tenantId, uid);
      if (!tokens.length) continue; // cliente sin push activo (recibe WhatsApp/Email igual)

      // Marcar antes de enviar para evitar duplicados entre ejecuciones solapadas.
      await ref.update({ recordatorio30minEnviado: true });

      const nombre   = cita.clienteNombre || cita.nombre || 'Cliente';
      const hora     = cita.hora || '';
      const barbero  = cita.barbero || cita.barberoNombre || '';
      const servicio = cita.servicioNombre || cita.servicio || '';
      const cuerpo   = `¡Hola ${nombre}! Tu cita${barbero ? ` con ${barbero}` : ''} es a las ${hora} hrs. ¡Te esperamos! 💈`;

      // Crear el registro ANTES de enviar para incrustar su id (logId) en la
      // push: así el Service Worker del cliente puede confirmar entrega/click.
      const logId = await writeNotifLog(db, {
        tenantId,
        type:    'push_recordatorio_30min',
        channel: 'push',
        status:  'sent',
        to:      { nombre, email: cita.clienteEmail || '' },
        meta:    { citaId, servicio, fecha: cita.fecha || '', hora },
      });

      const invalidos = [];
      let enviados = 0;
      await Promise.all(tokens.map(async (t) => {
        try {
          await messaging.send({
            token: t.token,
            notification: {
              title: '⏰ Tu cita es en ~30 minutos',
              body:  cuerpo,
            },
            data: {
              citaId,
              tipo:     'recordatorio',
              tenantId,
              logId:    logId || '',
            },
            webpush: {
              headers: { Urgency: 'high' },
              notification: {
                icon:     '/icons/icon-192.png',
                badge:    '/icons/icon-192.png',
                tag:      `recordatorio-${citaId}`,
                renotify: false,
                vibrate:  [200, 100, 200],
                actions:  [
                  { action: 'confirmar', title: '✅ Confirmar' },
                  { action: 'cancelar',  title: '❌ Cancelar'  },
                ],
              },
              fcmOptions: { link: '/dashboard.html' },
            },
          });
          enviados++;
        } catch (err) {
          const code = err.errorInfo?.code || err.code || '';
          if (code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/invalid-argument') {
            invalidos.push(t.id);
          }
          logger.warn(`[Recordatorio 30min] ✗ ${tenantId}/${citaId}: ${code || err.message}`);
        }
      }));

      // Desactivar tokens muertos.
      if (invalidos.length) {
        const batch = db.batch();
        invalidos.forEach((id) =>
          batch.update(db.collection(fcmTokensColPath(tenantId)).doc(id), { activo: false }));
        await batch.commit().catch(() => {});
      }

      if (enviados > 0) {
        logger.info(`[Recordatorio 30min] ✓ ${tenantId}/${citaId} → ${enviados} push (log ${logId || '-'})`);
      } else {
        // Ningún envío exitoso → marcar el log como fallido y desmarcar la cita
        // para reintentar en el próximo ciclo.
        if (logId) await db.collection('notification_logs').doc(logId).update({ status: 'failed' }).catch(() => {});
        await ref.update({ recordatorio30minEnviado: false }).catch(() => {});
      }
    }
  }
);
