'use strict';

// functions/anuncios-cliente.js
// ─────────────────────────────────────────────────────────────────
//  ANUNCIOS AL CLIENTE (push publicitario con targeting + métricas)
//
//  Callables:
//    - enviarAnuncioCliente      → broadcast con reglas server-side
//    - trackAperturaAnuncio      → registra open desde deep link
//    - previewAudienciaAnuncio   → cuenta cuántos users clasifican
//                                   (para el conteo antes del envío)
//
//  Trigger:
//    - onCitaCreadaAnuncioConv   → atribuye conversion si el cliente
//                                   abrió un anuncio en los últimos 7d
//
//  Modelo Firestore:
//    tenants/{tid}/anuncios/{id}                      — campaña + stats
//    tenants/{tid}/anuncios/{id}/recipients/{uid}     — 1 por destinatario
//    tenants/{tid}/anuncios_optout/{uid}              — opt-out list
//    tenants/{tid}/configuracion/anuncios             — caps configurables
//
//  Kronnos (Camino 1.5): users/anuncios_optout viven en pool marca.
//  El helper marca-aware redirige automáticamente los reads/writes.
//
//  DEPLOY:
//    firebase deploy --only \
//      functions:enviarAnuncioCliente,functions:trackAperturaAnuncio,\
//      functions:previewAudienciaAnuncio,functions:onCitaCreadaAnuncioConv
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError }   = require('firebase-functions/v2/https');
const { onDocumentCreated }    = require('firebase-functions/v2/firestore');
const { logger }               = require('firebase-functions');
const admin                    = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const marca                    = require('./lib/kronnos-marca');

const db        = admin.firestore();
const messaging = admin.messaging();

const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com'];
const KRONNOS_SUPERADMIN = 'administracionkronnos@gmail.com';

// ── Config defaults (override en tenants/{tid}/configuracion/anuncios) ──
const DEFAULTS = {
  maxPerMonthPerUser:            2,
  cooldownDays:                  7,
  ventanaHoraInicio:             10,      // hora local Chile (America/Santiago = UTC-4 aprox)
  ventanaHoraFin:                20,
  capBroadcastsPerDay:           3,
  requiresSuperAdminApproval:    500,
  windowUtcOffsetHours:          -4,      // Chile
};

// ── Utilidades ──────────────────────────────────────────────────
function usersCol(tid) {
  const eff = marca.marcaAwareTenant(tid, 'users');
  return db.collection(eff === 'elegance' ? 'users' : `tenants/${eff}/users`);
}
function anunciosCol(tid) {
  // Los anuncios viven per-tenant (el admin de la sede los crea).
  return db.collection(`tenants/${tid}/anuncios`);
}
function optOutCol(tid) {
  // Opt-out marca-aware: para Kronnos legacy → tenants/kronnos/anuncios_optout.
  const eff = marca.marcaAwareTenant(tid, 'users'); // reutilizamos la logica del set marca
  return db.collection(eff === 'elegance' ? 'anuncios_optout' : `tenants/${eff}/anuncios_optout`);
}
function fcmTokensCol(tid) {
  // Tokens siempre per-sede (residen donde el device se registró).
  return db.collection(tid === 'elegance' ? 'fcm_tokens' : `tenants/${tid}/fcm_tokens`);
}

async function loadConfig(tid) {
  try {
    const snap = await db.doc(`tenants/${tid}/configuracion/anuncios`).get();
    return { ...DEFAULTS, ...(snap.exists ? snap.data() : {}) };
  } catch (_) { return { ...DEFAULTS }; }
}

// Hora local Chile (aprox) — para ventana horaria
function horaLocalChile(cfg) {
  const nowUtcMs = Date.now();
  const offsetMs = (cfg.windowUtcOffsetHours || DEFAULTS.windowUtcOffsetHours) * 3600 * 1000;
  return new Date(nowUtcMs + offsetMs).getUTCHours();
}

function autorizado(email, tid) {
  if (BOOTSTRAP_ADMINS.includes(email)) return true;
  if (email === KRONNOS_SUPERADMIN && marca.isKronnosLegacy(tid)) return true;
  // Para admins de sede, el gate real está en Firestore rules. Aquí solo verificamos
  // que tenga sesión — el write ya lo controla la regla esAdmin/esKronnosBrandAdmin.
  return true; // La CF respeta rules downstream, no restringe aquí
}

function normalizeRango(u) {
  const h = Number(u.sellosHistoricos ?? u.stamps ?? 0);
  if (h >= 25) return 'platinum';
  if (h >= 10) return 'gold';
  return 'silver';
}

const RANGO_ORDEN = { silver: 0, gold: 1, platinum: 2 };
function matchesRango(u, rangoMin) {
  if (!rangoMin) return true;
  return RANGO_ORDEN[normalizeRango(u)] >= (RANGO_ORDEN[rangoMin] ?? 0);
}

function matchesUltimaVisita(u, desde, hasta) {
  if (!desde && !hasta) return true;
  const uv = u.ultimoSello || u.updatedAt?.toDate?.().toISOString?.() || null;
  if (!uv) return false; // si no hay dato, no matchea rango de fecha
  if (desde && uv < desde) return false;
  if (hasta && uv > hasta) return false;
  return true;
}

function matchesSedeKronnos(u, sede) {
  if (!sede) return true;
  const ps = u.sellosPorSede || {};
  const max = Math.max(ps.penablanca || 0, ps.limache || 0, ps.woman || 0);
  if (max === 0) return true; // sin sellos → aplicable a todos por ahora
  return (ps[sede] || 0) === max;
}

// Cuenta de anuncios enviados a este user en el mes actual
function mesAnuncios(u) {
  const now = new Date();
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const anunMonth = u.anuncios || {};
  return anunMonth.monthKey === currentMonthKey ? (anunMonth.count || 0) : 0;
}

function pasaCooldown(u, cooldownDays) {
  const last = u.anuncios?.lastAt?.toDate?.() || null;
  if (!last) return true;
  const ms = Date.now() - last.getTime();
  return ms >= cooldownDays * 86400 * 1000;
}

async function citasProximas72h(tid, uids) {
  if (!uids.length) return new Set();
  const now = new Date();
  const in72h = new Date(now.getTime() + 72 * 3600 * 1000);
  const nowISO = now.toISOString().split('T')[0];
  const inISO  = in72h.toISOString().split('T')[0];
  const found = new Set();
  // Firestore: 1 sola query por rango de fecha, luego filtramos uids en memoria.
  const citasRef = tid === 'elegance'
    ? db.collection('citas')
    : db.collection(`tenants/${tid}/citas`);
  try {
    const snap = await citasRef
      .where('fecha', '>=', nowISO)
      .where('fecha', '<=', inISO)
      .get();
    const uidSet = new Set(uids);
    for (const d of snap.docs) {
      const c = d.data();
      const uid = c.clienteUid || c.clienteId;
      if (uid && uidSet.has(uid)) found.add(uid);
    }
  } catch (e) {
    logger.warn(`[Anuncio] citasProximas72h ${tid}: ${e.message}`);
  }
  return found;
}

async function optOutSet(tid) {
  try {
    const snap = await optOutCol(tid).get();
    return new Set(snap.docs.map(d => d.id));
  } catch (_) { return new Set(); }
}

/**
 * Filtra usuarios aplicando TODAS las reglas: targeting + cooldown + max/mes +
 * opt-out + cita 72h. Devuelve estructura con groups clasificados.
 */
async function segmentarUsuarios(tid, targeting, cfg) {
  const usersSnap = await usersCol(tid).get();
  const all = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

  // Filtros de targeting (baratos, en memoria)
  const targetedRaw = all.filter(u => {
    if (!matchesRango(u, targeting.rangoMin)) return false;
    if (!matchesUltimaVisita(u, targeting.ultimaVisitaDesde, targeting.ultimaVisitaHasta)) return false;
    if (marca.isKronnosLegacy(tid) && !matchesSedeKronnos(u, targeting.sedeCanjeEn)) return false;
    return true;
  });

  // Opt-out y citas 72h (queries adicionales)
  const optOut = await optOutSet(tid);
  const uidsTargeted = targetedRaw.map(u => u.uid);
  const conCita = targeting.excluirConCita72h !== false
    ? await citasProximas72h(tid, uidsTargeted)
    : new Set();

  const skippedOptOut = [], skippedCita = [], skippedCooldown = [], skippedMonth = [];
  const enviables = [];
  for (const u of targetedRaw) {
    if (optOut.has(u.uid))                      { skippedOptOut.push(u); continue; }
    if (conCita.has(u.uid))                     { skippedCita.push(u); continue; }
    if (!pasaCooldown(u, cfg.cooldownDays))     { skippedCooldown.push(u); continue; }
    if (mesAnuncios(u) >= cfg.maxPerMonthPerUser) { skippedMonth.push(u); continue; }
    enviables.push(u);
  }

  return {
    targeted:         targetedRaw.length,
    enviables,
    skippedOptOut:    skippedOptOut.length,
    skippedCita:      skippedCita.length,
    skippedCooldown:  skippedCooldown.length,
    skippedMonth:     skippedMonth.length,
  };
}

// ═══════════════════════════════════════════════════════════════
//  1) previewAudienciaAnuncio (callable) — cuenta pre-envío
// ═══════════════════════════════════════════════════════════════
exports.previewAudienciaAnuncio = onCall(
  { region: 'us-central1', timeoutSeconds: 60, memory: '512MiB' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
    const tid = String(req.data?.tenantId || '').trim();
    if (!tid) throw new HttpsError('invalid-argument', 'tenantId requerido.');
    const cfg = await loadConfig(tid);
    const targeting = req.data?.targeting || {};
    const seg = await segmentarUsuarios(tid, targeting, cfg);
    return {
      targeted:         seg.targeted,
      enviables:        seg.enviables.length,
      skippedOptOut:    seg.skippedOptOut,
      skippedCita:      seg.skippedCita,
      skippedCooldown:  seg.skippedCooldown,
      skippedMonth:     seg.skippedMonth,
    };
  }
);

// ═══════════════════════════════════════════════════════════════
//  2) enviarAnuncioCliente (callable) — broadcast real
// ═══════════════════════════════════════════════════════════════
exports.enviarAnuncioCliente = onCall(
  { region: 'us-central1', timeoutSeconds: 540, memory: '1GiB' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
    const email = (req.auth.token?.email || '').toLowerCase();

    const tid       = String(req.data?.tenantId || '').trim();
    const titulo    = String(req.data?.titulo || '').trim();
    const mensaje   = String(req.data?.mensaje || '').trim();
    const ctaUrl    = String(req.data?.ctaUrl || '/').trim();
    const ctaTexto  = String(req.data?.ctaTexto || '').trim();
    const targeting = req.data?.targeting || {};
    const isTest    = !!req.data?.isTest;

    if (!tid || !titulo || !mensaje) {
      throw new HttpsError('invalid-argument', 'tenantId, titulo y mensaje son requeridos.');
    }
    if (titulo.length > 60)  throw new HttpsError('invalid-argument', 'Título máximo 60 caracteres.');
    if (mensaje.length > 240) throw new HttpsError('invalid-argument', 'Mensaje máximo 240 caracteres.');
    if (!autorizado(email, tid)) throw new HttpsError('permission-denied', 'No autorizado.');

    const cfg = await loadConfig(tid);

    // Ventana horaria (excepto test mode)
    if (!isTest) {
      const h = horaLocalChile(cfg);
      if (h < cfg.ventanaHoraInicio || h >= cfg.ventanaHoraFin) {
        throw new HttpsError('failed-precondition',
          `Solo se pueden enviar anuncios entre ${cfg.ventanaHoraInicio}:00 y ${cfg.ventanaHoraFin}:00 (Chile).`);
      }
    }

    // Cap de broadcasts por día (excepto test mode)
    if (!isTest) {
      const hoy = new Date().toISOString().split('T')[0];
      const enviadosHoy = await anunciosCol(tid)
        .where('createdBy', '==', email)
        .where('sentDate', '==', hoy)
        .get();
      if (enviadosHoy.size >= cfg.capBroadcastsPerDay) {
        throw new HttpsError('resource-exhausted',
          `Ya enviaste ${enviadosHoy.size} anuncios hoy (cap: ${cfg.capBroadcastsPerDay}). Vuelve mañana.`);
      }
    }

    // Segmentación
    const seg = await segmentarUsuarios(tid, targeting, cfg);
    let enviables = seg.enviables;

    // Test mode: reducir a solo caller uid
    if (isTest) {
      enviables = enviables.filter(u => u.uid === req.auth.uid);
      if (!enviables.length) {
        // Si el caller no matchea targeting, forzamos su envío (útil para probar)
        const me = await usersCol(tid).doc(req.auth.uid).get();
        if (me.exists) enviables = [{ uid: req.auth.uid, ...me.data() }];
      }
    }

    // Aprobación superadmin si supera umbral
    if (!isTest && enviables.length > cfg.requiresSuperAdminApproval) {
      const esBootstrap = BOOTSTRAP_ADMINS.includes(email);
      const esSuperKronnos = email === KRONNOS_SUPERADMIN && marca.isKronnosLegacy(tid);
      if (!esBootstrap && !esSuperKronnos) {
        throw new HttpsError('permission-denied',
          `Este broadcast alcanza a ${enviables.length} clientes (umbral: ${cfg.requiresSuperAdminApproval}). ` +
          `Requiere aprobación del superadmin.`);
      }
    }

    // Crear doc anuncio
    const anuncioRef = anunciosCol(tid).doc();
    const anuncioId  = anuncioRef.id;
    const now        = Timestamp.now();
    const sentDate   = new Date().toISOString().split('T')[0];
    await anuncioRef.set({
      titulo, mensaje, ctaUrl, ctaTexto,
      targeting,
      createdBy: email,
      createdByUid: req.auth.uid,
      createdAt: now,
      sentAt: now,
      sentDate,
      status: 'sending',
      isTest,
      stats: {
        targeted:            seg.targeted,
        skippedOptOut:       seg.skippedOptOut,
        skippedCita:         seg.skippedCita,
        skippedCooldown:     seg.skippedCooldown,
        skippedMonth:        seg.skippedMonth,
        attempted:           enviables.length,
        delivered:           0,
        failed:              0,
        invalidTokensPurged: 0,
        opened:              0,
        converted:           0,
        optOutFromThis:      0,
      },
    });

    // Deep link con param de tracking
    const separator = ctaUrl.includes('?') ? '&' : '?';
    const trackedLink = `${ctaUrl}${separator}ann=${anuncioId}`;

    // Envío
    const recipientsCol = anuncioRef.collection('recipients');
    const invalidos = []; // token refs a desactivar
    let delivered = 0, failed = 0, invalidTokensPurged = 0;

    // Batches de 50 usuarios (por user hacemos su propia query de tokens)
    for (let i = 0; i < enviables.length; i += 50) {
      const chunk = enviables.slice(i, i + 50);
      await Promise.all(chunk.map(async (u) => {
        try {
          // Tokens FCM del user (siempre en tenant original, no en marca)
          const tokensSnap = await fcmTokensCol(tid)
            .where('userId', '==', u.uid)
            .where('activo', '==', true)
            .get();
          const tokens = tokensSnap.docs
            .map(d => ({ id: d.id, ref: d.ref, token: d.data().token }))
            .filter(t => t.token);

          if (tokens.length === 0) {
            await recipientsCol.doc(u.uid).set({
              status: 'no_tokens',
              sentAt: now,
              tokensAttempted: 0, tokensDelivered: 0, tokensFailed: 0,
            });
            return;
          }

          let userDelivered = 0, userFailed = 0;
          for (const t of tokens) {
            try {
              await messaging.send({
                token: t.token,
                notification: { title: titulo, body: mensaje },
                data: {
                  tipo: 'anuncio_cliente',
                  anuncioId,
                  url: trackedLink,
                },
                webpush: {
                  headers: { Urgency: 'high' },
                  notification: {
                    icon: '/icons/icon-192.png',
                    badge: '/icons/icon-192.png',
                    tag: 'ann-' + anuncioId,
                    renotify: false,
                    vibrate: [180, 90, 180],
                  },
                  fcmOptions: { link: trackedLink },
                },
              });
              userDelivered++;
            } catch (err) {
              userFailed++;
              const code = err.errorInfo?.code || err.code || '';
              if (code === 'messaging/registration-token-not-registered' ||
                  code === 'messaging/invalid-registration-token' ||
                  code === 'messaging/invalid-argument') {
                invalidos.push(t.ref);
              }
            }
          }
          delivered += userDelivered;
          failed    += userFailed;
          await recipientsCol.doc(u.uid).set({
            status: userDelivered > 0 ? 'delivered' : 'failed',
            sentAt: now,
            tokensAttempted: tokens.length,
            tokensDelivered: userDelivered,
            tokensFailed:    userFailed,
          });

          // Update user doc con contadores (solo si se le envió efectivamente)
          if (userDelivered > 0) {
            const monthKey = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`;
            const anunActual = u.anuncios || {};
            const nuevoCount = anunActual.monthKey === monthKey ? (anunActual.count || 0) + 1 : 1;
            await usersCol(tid).doc(u.uid).update({
              anuncios: {
                monthKey,
                count: nuevoCount,
                lastAt: now,
                lastAnuncioId: anuncioId,
              },
            }).catch(() => {});
          }
        } catch (e) {
          logger.warn(`[Anuncio] user ${u.uid} error:`, e.message);
        }
      }));
    }

    // Purga tokens muertos
    for (let i = 0; i < invalidos.length; i += 400) {
      const batch = db.batch();
      invalidos.slice(i, i + 400).forEach(r => batch.update(r, { activo: false }));
      await batch.commit().catch(() => {});
      invalidTokensPurged += Math.min(400, invalidos.length - i);
    }

    // Cerrar anuncio
    await anuncioRef.update({
      status: 'sent',
      finishedAt: FieldValue.serverTimestamp(),
      'stats.delivered':           delivered,
      'stats.failed':              failed,
      'stats.invalidTokensPurged': invalidTokensPurged,
    });

    logger.info(`[Anuncio] ${anuncioId} tid=${tid} enviables=${enviables.length} delivered=${delivered} failed=${failed} test=${isTest}`);
    return {
      ok: true,
      anuncioId,
      stats: {
        ...seg,
        attempted: enviables.length,
        delivered, failed, invalidTokensPurged,
      },
    };
  }
);

// ═══════════════════════════════════════════════════════════════
//  3) trackAperturaAnuncio (callable) — registra open desde deep link
// ═══════════════════════════════════════════════════════════════
exports.trackAperturaAnuncio = onCall(
  { region: 'us-central1', timeoutSeconds: 30, memory: '256MiB' },
  async (req) => {
    if (!req.auth) return { ok: false, reason: 'unauth' }; // silencioso
    const tid       = String(req.data?.tenantId || '').trim();
    const anuncioId = String(req.data?.anuncioId || '').trim();
    if (!tid || !anuncioId) return { ok: false, reason: 'invalid' };

    const uid = req.auth.uid;
    const anuncioRef = anunciosCol(tid).doc(anuncioId);
    const recRef     = anuncioRef.collection('recipients').doc(uid);

    try {
      // Idempotente: solo primer open cuenta
      const already = await recRef.get();
      if (already.exists && already.data()?.openedAt) return { ok: true, alreadyOpened: true };

      await recRef.set({
        openedAt: FieldValue.serverTimestamp(),
        status:   'opened',
      }, { merge: true });
      await anuncioRef.update({ 'stats.opened': FieldValue.increment(1) });

      // Guarda en user doc para atribución de conversion
      await usersCol(tid).doc(uid).update({
        'anuncios.lastOpenedAnuncioId': anuncioId,
        'anuncios.lastOpenedAt':        FieldValue.serverTimestamp(),
        'anuncios.lastOpenedTenant':    tid,
      }).catch(() => {});

      return { ok: true };
    } catch (e) {
      logger.warn(`[Anuncio] trackApertura ${tid}/${anuncioId}/${uid}: ${e.message}`);
      return { ok: false, reason: 'error' };
    }
  }
);

// ═══════════════════════════════════════════════════════════════
//  4) onCitaCreadaAnuncioConv (trigger) — atribuye conversion
// ═══════════════════════════════════════════════════════════════
async function atribuirConversion(tid, cita) {
  const uid = cita.clienteUid || cita.clienteId;
  if (!uid) return;
  try {
    const userSnap = await usersCol(tid).doc(uid).get();
    if (!userSnap.exists) return;
    const u = userSnap.data();
    const anun = u.anuncios || {};
    const lastOpenedAt = anun.lastOpenedAt?.toDate?.() || null;
    const lastAnuncioId = anun.lastOpenedAnuncioId;
    const lastTenant    = anun.lastOpenedTenant || tid;
    if (!lastOpenedAt || !lastAnuncioId) return;
    // 7 días de ventana de atribución
    const ms = Date.now() - lastOpenedAt.getTime();
    if (ms > 7 * 86400 * 1000) return;

    const anuncioRef = anunciosCol(lastTenant).doc(lastAnuncioId);
    const recRef     = anuncioRef.collection('recipients').doc(uid);
    const rec = await recRef.get();
    if (rec.exists && rec.data()?.convertedAt) return; // ya atribuido

    await recRef.set({
      convertedAt: FieldValue.serverTimestamp(),
      status:      'converted',
    }, { merge: true });
    await anuncioRef.update({ 'stats.converted': FieldValue.increment(1) });
    logger.info(`[Anuncio] conversion tid=${tid} uid=${uid} → anuncio=${lastAnuncioId}`);
  } catch (e) {
    logger.warn(`[Anuncio] atribuirConversion ${tid}: ${e.message}`);
  }
}

exports.onCitaCreadaAnuncioConvElegance = onDocumentCreated(
  { document: 'citas/{citaId}', region: 'us-central1' },
  async (event) => {
    const cita = event.data?.data();
    if (!cita) return;
    await atribuirConversion('elegance', cita);
  }
);

exports.onCitaCreadaAnuncioConvTenant = onDocumentCreated(
  { document: 'tenants/{tenantId}/citas/{citaId}', region: 'us-central1' },
  async (event) => {
    const cita = event.data?.data();
    if (!cita) return;
    const tid = event.params.tenantId;
    await atribuirConversion(tid, cita);
  }
);
