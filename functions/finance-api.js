'use strict';

// functions/finance-api.js
// ─────────────────────────────────────────────────────────────────────────────
//  API pública (server-to-server) para el asistente financiero de SynapTech.
//
//  Contrato:
//    GET /api/v1/finances[?period=YYYY-MM]
//    Header: Authorization: Bearer <SYNAPTECH_FINANCE_API_KEY>
//
//  Devuelve las cuotas de mensualidad NO pagadas del mes indicado (default:
//  mes actual en zona Santiago), replicando el filtro exacto que usa la vista
//  "Ingresos Proyectados / Pendientes de Pago" del /admin en index.html:
//    · tenant operativo: _system/{tid}.operativo !== false && status !== 'suspended'
//    · cuota del mes:    _billing/{tid}.cuotas.find(c => c.mes === YYYY-MM && monto > 0)
//    · pendiente:        !cuota.pagada
//
//  DEPLOY:
//    firebase functions:secrets:set SYNAPTECH_FINANCE_API_KEY
//    firebase deploy --only functions:financeApi
//
//  El rewrite de Vercel expone la URL bajo /api/v1/finances (ver vercel.json).
// ─────────────────────────────────────────────────────────────────────────────

const { onRequest }    = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger }       = require('firebase-functions');
const admin            = require('firebase-admin');

const db = admin.firestore();

const SYNAPTECH_FINANCE_API_KEY = defineSecret('SYNAPTECH_FINANCE_API_KEY');

const TIMEZONE = 'America/Santiago';

// ── Helpers ─────────────────────────────────────────────────────────────────

// YYYY-MM en zona Santiago (evita off-by-one contra UTC a fin de mes).
function periodoActualSantiago() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  return `${y}-${m}`;
}

// YYYY-MM-DD de un Timestamp/Date/string, en zona Santiago.
function fechaISOSantiago(v) {
  if (!v) return null;
  const d = v && typeof v.toDate === 'function' ? v.toDate()
          : (v instanceof Date ? v : new Date(v));
  if (isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${day}`;
}

// Igual que settingsRef en mensualidad-mp.js: elegance vive en raíz (legacy),
// el resto en tenants/{tid}/settings/general.
function settingsRef(tid) {
  return tid === 'elegance'
    ? db.collection('settings').doc('general')
    : db.collection(`tenants/${tid}/settings`).doc('general');
}

// Mismo helper que mensualidad-mp.js — mantener sincronizado.
async function nombreLocal(tid) {
  try {
    const s = await settingsRef(tid).get();
    if (s.exists && s.data().nombre) return String(s.data().nombre).trim();
  } catch (_) {}
  try {
    const t = await db.doc(`tenants/${tid}`).get();
    if (t.exists && t.data().nombre) return String(t.data().nombre).trim();
  } catch (_) {}
  return tid;
}

// Comparación en tiempo constante para evitar timing attacks sobre la API key.
function eqConstante(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  try {
    return require('crypto').timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function unauthorized(res, motivo) {
  logger.info(`[financeApi] 401: ${motivo}`);
  res.set('WWW-Authenticate', 'Bearer realm="synaptech-finance"');
  return res.status(401).json({
    status: 'error',
    error: 'unauthorized',
    message: 'Bearer token requerido o inválido.',
  });
}

// ── Handler ─────────────────────────────────────────────────────────────────

exports.financeApi = onRequest(
  {
    region: 'us-central1',
    secrets: [SYNAPTECH_FINANCE_API_KEY],
    // Server-to-server: no exponemos CORS a navegadores.
    cors: false,
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.set('Allow', 'GET');
      return res.status(405).json({
        status: 'error',
        error: 'method_not_allowed',
        message: 'Solo GET.',
      });
    }

    // Auth: Authorization: Bearer <key>
    const auth = String(req.get('Authorization') || req.get('authorization') || '').trim();
    if (!auth.toLowerCase().startsWith('bearer ')) {
      return unauthorized(res, 'sin header Bearer');
    }
    const enviada = auth.slice(7).trim();
    const esperada = String(SYNAPTECH_FINANCE_API_KEY.value() || '').trim();
    if (!esperada) {
      // La clave no está seteada en el proyecto — fail-closed, no revelar detalles.
      logger.error('[financeApi] SYNAPTECH_FINANCE_API_KEY no está configurada');
      return unauthorized(res, 'secret no configurado');
    }
    if (!enviada || !eqConstante(enviada, esperada)) {
      return unauthorized(res, 'token no coincide');
    }

    try {
      // Período: default = mes actual en Santiago; override opcional ?period=YYYY-MM.
      const rawPeriod = String(req.query.period || '').trim();
      const period = /^\d{4}-\d{2}$/.test(rawPeriod) ? rawPeriod : periodoActualSantiago();

      // _billing/{tid} y _system/{tid} son colecciones de docs reales
      // (no padres virtuales), así que .get() funciona bien.
      const [billSnap, sysSnap] = await Promise.all([
        db.collection('_billing').get(),
        db.collection('_system').get(),
      ]);

      const sysMap = {};
      sysSnap.forEach(d => { sysMap[d.id] = d.data() || {}; });

      // Recolecta candidatos del mes; resolvemos nombres en paralelo después
      // para no serializar N reads.
      const candidatos = [];
      billSnap.forEach(d => {
        const tid  = d.id;
        const bill = d.data() || {};
        const sys  = sysMap[tid] || {};
        const operativo = sys.operativo !== false && sys.status !== 'suspended';
        if (!operativo) return;

        const cuotas = Array.isArray(bill.cuotas) ? bill.cuotas : [];
        const cuota = cuotas.find(c => c && c.mes === period && Number(c.monto) > 0);
        if (!cuota) return;
        if (cuota.pagada) return;

        candidatos.push({
          tenantId: tid,
          amount_clp: Math.round(Number(cuota.monto)),
          due_date: fechaISOSantiago(bill.fechaProximoPago),
        });
      });

      // Nombres en paralelo (una lectura de settings por tenant candidato).
      const nombres = await Promise.all(candidatos.map(c => nombreLocal(c.tenantId)));

      const pending = candidatos.map((c, i) => ({
        id:         c.tenantId,
        local_name: nombres[i],
        amount_clp: c.amount_clp,
        due_date:   c.due_date,
      })).sort((a, b) => {
        // Vencimiento más próximo primero; sin fecha al final. Empate por nombre.
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        if (a.due_date && b.due_date && a.due_date !== b.due_date) {
          return a.due_date < b.due_date ? -1 : 1;
        }
        return a.local_name.localeCompare(b.local_name, 'es');
      });

      const total = pending.reduce((s, p) => s + p.amount_clp, 0);

      return res.status(200).json({
        status:    'success',
        project:   'barberia-elegance',
        timestamp: new Date().toISOString(),
        summary: {
          total_pending_clp: total,
          pending_count:     pending.length,
          period,
        },
        pending_subscriptions: pending,
      });
    } catch (err) {
      logger.error('[financeApi] error interno', {
        message: err && err.message,
        stack:   err && err.stack,
      });
      return res.status(500).json({
        status: 'error',
        error:  'internal_error',
        message: 'No se pudo consultar el estado financiero. Intenta más tarde.',
      });
    }
  }
);
