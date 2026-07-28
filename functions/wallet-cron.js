'use strict';

// functions/wallet-cron.js
// ─────────────────────────────────────────────────────────────────
//  WALLO · AUTOMATIZACIÓN DIARIA
//
//  Dos schedules que corren juntos a las 10:00 (hora Santiago):
//    1. walletCumpleanosCron — regala N sellos + push al pase a
//       clientes que cumplen años HOY (fechaNacimiento MM-DD == hoy).
//    2. walletExpiracionCron — resetea sellosDisponibles de clientes
//       inactivos según cfg.expiracion.dias (por defecto 60).
//
//  Ambos escanean todos los tenants con walletActivo:true y aplican
//  su lógica sólo si el tenant activó la regla en configuracion/wallet.
//
//  Idempotencia: cada acción anota una marca en el user doc
//  (ultimoCumpleAplicado / ultimaExpiracionAplicada) con el año/día
//  actual → el cron no dispara dos veces por el mismo cumpleaños/venc.
//
//  Exports:
//    walletCumpleanosCron
//    walletExpiracionCron
//
//  DEPLOY:
//    firebase deploy --only functions:walletCumpleanosCron,functions:walletExpiracionCron
// ─────────────────────────────────────────────────────────────────

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const core = require('./lib/wallet-core');

const db = admin.firestore();
const WALLET_SA_KEY = defineSecret('WALLET_SA_KEY');

const TZ = 'America/Santiago';

// ── Path helpers (elegance = raíz, resto = tenants/{tid}/…) ────────
const billingRef   = (tid) => db.doc(`_billing/${tid}`);
const walletCfgRef = (tid) => tid === 'elegance'
  ? db.doc('configuracion/wallet')
  : db.doc(`tenants/${tid}/configuracion/wallet`);
const usersCol     = (tid) => db.collection(tid === 'elegance' ? 'users' : `tenants/${tid}/users`);

// ── Enumerar tenants (listDocuments → funciona con docs virtuales) ─
// El estándar del repo: NO usar collection('tenants').get() porque los
// docs padre pueden no existir; listDocuments() devuelve refs directas.
async function tenantsConWalletActivo() {
  const out = ['elegance']; // el tenant raíz siempre es candidato
  const refs = await db.collection('tenants').listDocuments();
  const tids = refs.map((r) => r.id);
  // Chequeo de walletActivo en paralelo (batch de 20 lecturas simultáneas).
  const chunks = [];
  for (let i = 0; i < tids.length; i += 20) chunks.push(tids.slice(i, i + 20));
  for (const chunk of chunks) {
    const snaps = await Promise.all(chunk.map((t) => billingRef(t).get().catch(() => null)));
    snaps.forEach((s, i) => {
      if (s && s.exists && s.data().walletActivo === true) out.push(chunk[i]);
    });
  }
  return Array.from(new Set(out));
}

// ═══════════════════════════════════════════════════════════════
//  1) CUMPLEAÑOS — regala sellos + push al pase
// ═══════════════════════════════════════════════════════════════
exports.walletCumpleanosCron = onSchedule(
  { schedule: 'every day 10:00', timeZone: TZ, region: 'us-central1', secrets: [WALLET_SA_KEY] },
  async () => {
    const hoy = new Date();
    const hoyMD = String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    const marcaAno = 'cumple-' + hoy.getFullYear();

    const tenants = await tenantsConWalletActivo();
    logger.info(`[Cumple] escaneando ${tenants.length} tenants (hoy=${hoyMD})`);
    let regalados = 0;

    for (const tid of tenants) {
      try {
        const cfgSnap = await walletCfgRef(tid).get();
        const cfg = cfgSnap.exists ? cfgSnap.data() : {};
        const c = cfg.cumpleanos || {};
        if (c.activa !== true) continue;
        const sellosBonus = Math.max(1, Math.min(20, Math.round(Number(c.sellosBonus) || 3)));
        const mensaje = String(c.mensaje || `🎂 ¡Feliz cumpleaños! Te regalamos ${sellosBonus} sellos.`).slice(0, 200);

        // Filtramos client-side (Firestore no permite filtrar por MM-DD).
        // Volumen bajo por tenant, coste aceptable.
        const usersSnap = await usersCol(tid).get();
        for (const doc of usersSnap.docs) {
          const u = doc.data() || {};
          if (u.noSumaSellos === true) continue;
          if (u.fusionadoCon && u.fusionadoCon !== doc.id) continue;
          if (!u.fechaNacimiento) continue;
          const md = String(u.fechaNacimiento).slice(5, 10); // "YYYY-MM-DD" → "MM-DD"
          if (md !== hoyMD) continue;
          if (u.ultimoCumpleAplicado === marcaAno) continue; // idempotente por año

          // Sumar sellos. El trigger walletSync* actualizará el pase.
          const nowIso = Timestamp.now().toDate().toISOString();
          await doc.ref.update({
            sellosDisponibles: FieldValue.increment(sellosBonus),
            sellosHistoricos:  FieldValue.increment(sellosBonus),
            stamps:            FieldValue.increment(sellosBonus),
            ultimoSello:       nowIso,
            ultimoCumpleAplicado: marcaAno,
            historialSellos:   FieldValue.arrayUnion({
              fecha: nowIso, tipo: 'suma', cantidad: sellosBonus,
              nota: mensaje, origen: 'cumpleanos-cron',
            }),
          });

          // Push al pase Google (si el cliente tiene walletObjectId).
          if (u.walletObjectId) {
            try {
              const key = JSON.parse(WALLET_SA_KEY.value());
              await core.addMessage(key, u.walletObjectId, {
                header: '🎂 ¡Feliz cumpleaños!',
                body: mensaje,
                id: `cumple_${hoy.getFullYear()}`.slice(0, 40),
              });
            } catch (e) {
              logger.warn(`[Cumple] addMessage falló ${tid}/${doc.id}: ${e.message}`);
            }
          }
          regalados++;
          logger.info(`[Cumple] +${sellosBonus} sellos a ${tid}/${doc.id} (${u.nombre || ''})`);
        }
      } catch (e) {
        logger.error(`[Cumple] tenant ${tid} falló: ${e.message}`);
      }
    }
    logger.info(`[Cumple] fin: ${regalados} regalos entregados`);
    return null;
  },
);

// ═══════════════════════════════════════════════════════════════
//  2) EXPIRACIÓN — resetea sellos de inactivos
// ═══════════════════════════════════════════════════════════════
exports.walletExpiracionCron = onSchedule(
  { schedule: 'every day 10:15', timeZone: TZ, region: 'us-central1', secrets: [WALLET_SA_KEY] },
  async () => {
    const now = Date.now();
    const hoyISO = new Date().toISOString().slice(0, 10);
    const tenants = await tenantsConWalletActivo();
    logger.info(`[Expira] escaneando ${tenants.length} tenants`);
    let expirados = 0;

    for (const tid of tenants) {
      try {
        const cfgSnap = await walletCfgRef(tid).get();
        const cfg = cfgSnap.exists ? cfgSnap.data() : {};
        const e = cfg.expiracion || {};
        if (e.activa !== true) continue;
        const dias = Math.max(7, Math.min(365, Math.round(Number(e.dias) || 60)));
        const cutoff = now - dias * 86400000;

        const usersSnap = await usersCol(tid).get();
        for (const doc of usersSnap.docs) {
          const u = doc.data() || {};
          if (u.noSumaSellos === true) continue;
          if (u.fusionadoCon && u.fusionadoCon !== doc.id) continue;
          const disp = Number(u.sellosDisponibles) || 0;
          if (disp <= 0) continue;
          const last = u.ultimoSello ? Date.parse(String(u.ultimoSello)) : 0;
          if (!last || last > cutoff) continue; // aún vigente
          if (u.ultimaExpiracionAplicada === hoyISO) continue; // idempotente por día

          // Reset a 0 (mantenemos sellosHistoricos como memoria de vida).
          const nowIso = new Date().toISOString();
          await doc.ref.update({
            sellosDisponibles: 0,
            stamps: 0,
            ultimaExpiracionAplicada: hoyISO,
            historialSellos: FieldValue.arrayUnion({
              fecha: nowIso, tipo: 'canje', cantidad: -disp,
              nota: `Sellos expirados por inactividad (${dias} días)`,
              origen: 'expiracion-cron',
            }),
          });
          if (u.walletObjectId) {
            try {
              const key = JSON.parse(WALLET_SA_KEY.value());
              await core.addMessage(key, u.walletObjectId, {
                header: '⏰ Tus sellos expiraron',
                body: `Como no visitaste en ${dias} días, tu saldo se reseteó. ¡Vuelve pronto para arrancar de nuevo!`,
                id: `expira_${hoyISO}`.slice(0, 40),
              });
            } catch (err) {
              logger.warn(`[Expira] addMessage falló ${tid}/${doc.id}: ${err.message}`);
            }
          }
          expirados++;
          logger.info(`[Expira] reset ${disp} sellos → 0 en ${tid}/${doc.id} (${u.nombre || ''})`);
        }
      } catch (err) {
        logger.error(`[Expira] tenant ${tid} falló: ${err.message}`);
      }
    }
    logger.info(`[Expira] fin: ${expirados} clientes reseteados`);
    return null;
  },
);
