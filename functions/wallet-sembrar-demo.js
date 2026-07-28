'use strict';

// functions/wallet-sembrar-demo.js
// ─────────────────────────────────────────────────────────────────
//  ONE-SHOT: sembrar el tenant demo wallodemo en Google Wallet.
//
//  Provisiona la LoyaltyClass del tenant + LoyaltyObject para cada
//  user con esDemo:true. Se corre 1 vez para dejar la demo funcional
//  en el celu (podés compartir el Save URL por WhatsApp a leads).
//
//  Auth: HTTP público pero con secret compartido en query param.
//  BORRAR ESTE ARCHIVO Y REDEPLOY DESPUÉS DE USARLO — no debe quedar
//  en producción una CF que provisione sin auth Firebase.
//
//  DEPLOY:
//    firebase deploy --only functions:walletSembrarDemo
//
//  USO:
//    curl "https://us-central1-barberia-elegance.cloudfunctions.net/walletSembrarDemo?secret=WALLO_DEMO_2026"
// ─────────────────────────────────────────────────────────────────

const { onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const core = require('./lib/wallet-core');

const db = admin.firestore();
const WALLET_SA_KEY = defineSecret('WALLET_SA_KEY');

// Secret compartido rotable — cualquiera con este string puede sembrar el
// demo. Como el tenantId está hardcoded a 'wallodemo', el blast radius es
// nulo (solo se re-provisiona la demo).
const ONESHOT_SECRET = 'WALLO_DEMO_2026';

const TENANT = 'wallodemo';

exports.walletSembrarDemo = onRequest(
  { region: 'us-central1', cors: true, secrets: [WALLET_SA_KEY] },
  async (req, res) => {
    if (req.query.secret !== ONESHOT_SECRET) {
      return res.status(403).send('forbidden');
    }
    try {
      const saKey = JSON.parse(WALLET_SA_KEY.value());

      // 1. Leer configuración del wallet + premios del tenant demo.
      const [cfgSnap, premiosSnap, usersSnap] = await Promise.all([
        db.doc(`tenants/${TENANT}/configuracion/wallet`).get(),
        db.collection(`tenants/${TENANT}/premios`).get(),
        db.collection(`tenants/${TENANT}/users`).where('esDemo', '==', true).get(),
      ]);

      const cfg = cfgSnap.exists ? cfgSnap.data() : {};
      const premios = premiosSnap.docs.map((d) => d.data());
      const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      logger.info(`[SembrarDemo] cfg=${!!cfg.enabled} · premios=${premios.length} · users=${users.length}`);

      // 2. Upsert LoyaltyClass.
      const cls = core.buildClass(TENANT, cfg);
      const classResult = await core.upsertClass(saKey, cls);
      logger.info(`[SembrarDemo] class ${cls.id} → ${classResult}`);

      // 3. Upsert LoyaltyObject × user demo.
      const objectResults = [];
      for (const u of users) {
        const disp = Number(u.sellosDisponibles) || 0;
        const hist = Number(u.sellosHistoricos) || disp;
        const { filled, target, hitos } = core.stampState(disp, premios);
        const rango = core.rangoNombre(hist, []);
        const accountName = u.nombre || 'Cliente';
        const obj = core.buildObject(TENANT, u.id, {
          accountName, filled, target, hitos, premios, rango,
          accent: cfg.accent, bg: cfg.bg, icon: cfg.stampIcon,
        });
        const r = await core.upsertObject(saKey, obj);
        objectResults.push({ uid: u.id, nombre: accountName, sellos: `${filled}/${target}`, result: r });
        logger.info(`[SembrarDemo] object ${obj.id} → ${r} (${filled}/${target})`);
      }

      // 4. Save URLs por si querés compartir directo.
      const saveUrls = users.map((u) => {
        const obj = core.buildObject(TENANT, u.id, {
          accountName: u.nombre || 'Cliente',
          filled: Number(u.sellosDisponibles) || 0,
          target: 10,
        });
        return {
          nombre: u.nombre,
          uid: u.id,
          saveUrl: core.buildSaveUrl(saKey, {
            loyaltyObjects: [{ id: obj.id, classId: obj.classId }],
          }),
        };
      });

      res.status(200).json({
        ok: true,
        tenant: TENANT,
        class: { id: cls.id, result: classResult },
        objects: objectResults,
        saveUrls,
      });
    } catch (e) {
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      logger.error(`[SembrarDemo] falló: ${detail}`);
      res.status(500).json({ ok: false, error: detail });
    }
  },
);
