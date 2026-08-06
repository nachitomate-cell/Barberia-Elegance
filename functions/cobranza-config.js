'use strict';

// functions/cobranza-config.js
// ─────────────────────────────────────────────────────────────────────────────
//  CONFIG DE COBRANZA PARA OPS — la libreta de números de cobro.
//
//  La escalera de cobro (recordatorio-cobro.js) manda WhatsApp SOLO al campo
//  explícito _billing/{tid}.whatsappCobro. Estas dos callables son la forma de
//  ver y editar esa libreta desde ops.html sin tocar Firestore a mano:
//
//    · cobranzaConfig     → lista _billing completo (monto, vencimiento,
//                           estado, número de cobro, canal disponible)
//    · cobranzaConfigSet  → escribe/borra whatsappCobro de UN tenant
//
//  Solo operadores (misma gate que el resto de ops).
// ─────────────────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions');
const admin                  = require('firebase-admin');
const { FieldValue }         = require('firebase-admin/firestore');
const { esOperador }         = require('./lib/operadores');

const db = admin.firestore();
const TIMEZONE = 'America/Santiago';

function exigirOperador(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  if (!esOperador(String(req.auth.token?.email || '').toLowerCase())) {
    throw new HttpsError('permission-denied', 'Solo operadores.');
  }
}

function hoySantiago() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function fechaYmd(v) {
  if (!v) return null;
  try {
    const d = v.toDate ? v.toDate() : new Date(v);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
  } catch { return null; }
}

async function nombreDe(tid) {
  try {
    const s = await db.doc(tid === 'elegance' ? 'settings/general' : `tenants/${tid}/settings/general`).get();
    if (s.exists && s.data().nombre) return String(s.data().nombre).trim();
  } catch (_) {}
  try {
    const t = await db.doc(`tenants/${tid}`).get();
    if (t.exists && t.data().nombre) return String(t.data().nombre).trim();
  } catch (_) {}
  return tid;
}

exports.cobranzaConfig = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  const hoy = hoySantiago();
  const snap = await db.collection('_billing').get();

  const rows = await Promise.all(snap.docs.map(async (d) => {
    const b = d.data() || {};
    const neto = Number(b.montoPendiente) || 0;
    const due  = fechaYmd(b.fechaProximoPago);
    const diasAtraso = (due && due < hoy)
      ? Math.round((Date.parse(hoy) - Date.parse(due)) / 86400000) : 0;
    // Stats de avisos — poblados por recordatorio-cobro.js con FieldValue.increment.
    // Un tenant sin ninguna corrida aún devuelve todos los contadores en 0 (no
    // ausentes) para que la UI no tenga que defenderse de undefined.
    const st = b.avisosStats || {};
    const avisos = {
      total:       Number(st.total || 0),
      fallidos:    Number(st.fallidos || 0),
      costoClp:    Math.round(Number(st.costoClp || 0)),
      porCanal:    st.porCanal || {},
      ultimoCanal: st.ultimoCanal || null,
      ultimoOk:    st.ultimoOk === undefined ? null : !!st.ultimoOk,
      ultimoAt:    fechaYmd(st.ultimoAt),
    };
    return {
      tid:            d.id,
      nombre:         await nombreDe(d.id),
      montoNeto:      Math.round(neto),
      montoConIva:    Math.round(neto * 1.19),
      vence:          due,
      diasAtraso,
      estadoPago:     b.estadoPago || '—',
      whatsappCobro:  b.whatsappCobro || null,
      tieneEmail:     !!(b.emailCobro),
      autopay:        b.suscripcionMp?.status || null,
      ultimoWa:       b.ultimoRecordatorioWa || null,
      avisos,
    };
  }));

  // Totales globales para la barra resumen (todos los tenants sumados).
  const totales = rows.reduce((acc, r) => {
    acc.total    += r.avisos.total;
    acc.fallidos += r.avisos.fallidos;
    acc.costoClp += r.avisos.costoClp;
    for (const [c, n] of Object.entries(r.avisos.porCanal || {})) {
      acc.porCanal[c] = (acc.porCanal[c] || 0) + Number(n || 0);
    }
    return acc;
  }, { total: 0, fallidos: 0, costoClp: 0, porCanal: {} });

  // Atrasados primero (más días arriba), luego por vencimiento más próximo.
  rows.sort((a, b) => {
    if ((a.diasAtraso > 0) !== (b.diasAtraso > 0)) return a.diasAtraso > 0 ? -1 : 1;
    if (a.diasAtraso !== b.diasAtraso) return b.diasAtraso - a.diasAtraso;
    return String(a.vence || '9999').localeCompare(String(b.vence || '9999'));
  });
  return { ok: true, rows, totales };
});

exports.cobranzaConfigSet = onCall({ region: 'us-central1', cors: true }, async (req) => {
  exigirOperador(req);
  const tid = String(req.data?.tenantId || '').trim();
  if (!/^[a-zA-Z0-9_-]{2,60}$/.test(tid)) throw new HttpsError('invalid-argument', 'Falta el local.');
  const ref = db.doc(`_billing/${tid}`);
  if (!(await ref.get()).exists) throw new HttpsError('not-found', `No existe _billing/${tid}.`);

  const raw = String(req.data?.whatsappCobro || '').trim();
  if (!raw) {
    // Vacío = apagar el canal WhatsApp para este local (vuelve a push/email).
    await ref.update({ whatsappCobro: FieldValue.delete() });
    logger.info(`[cobranza:config] ${tid}: whatsappCobro eliminado (${req.auth.token.email})`);
    return { ok: true, tenantId: tid, whatsappCobro: null };
  }

  // Normalización a dígitos con país: "+56 9 1234 5678" / "912345678" → 56912345678.
  let num = raw.replace(/\D/g, '');
  if (/^9\d{8}$/.test(num)) num = '56' + num;
  if (!/^56\d{9}$/.test(num)) {
    throw new HttpsError('invalid-argument',
      'Número inválido. Formato esperado: +56 9 XXXX XXXX (celular chileno).');
  }
  await ref.update({ whatsappCobro: num });
  logger.info(`[cobranza:config] ${tid}: whatsappCobro → ***${num.slice(-4)} (${req.auth.token.email})`);
  return { ok: true, tenantId: tid, whatsappCobro: num };
});
