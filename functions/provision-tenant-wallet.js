'use strict';

// functions/provision-tenant-wallet.js
// ─────────────────────────────────────────────────────────────────
//  WALLET-ONLY SELF-SERVICE — alta express de tenants SIN agenda.
//
//  Producto standalone: comercios recurrentes (cafés, panaderías,
//  heladerías, mascotas, spa walk-in…) que sólo quieren la tarjeta
//  digital. El dueño entra a wallets.bioo.cl/crea, se registra, y
//  queda operando en <5 min con:
//    · panel admin recortado (_billing.plan='wallet-only' → Sidebar
//      autoconfigura, ver useBillingPlan.js)
//    · editor de tarjeta en wallets.bioo.cl
//    · scanner staff en wallets.bioo.cl/staff
//
//  NO se crean barberos ni servicios (no aplican). El dueño queda
//  como admin del tenant, con claims { role: 'admin', tenantId }.
//
//  Idempotente: si la cuenta ya creó un tenant, devuelve el existente.
//  Slug validado con el mismo chequearSlug de provision-tenant.js
//  (fuente única de reservados + regex).
//
//  Trial: al alta se marca walletActivo=true por 14 días. Después,
//  la CF de mensualidad (o el admin) decide si sigue activo.
//
//  DEPLOY:
//    firebase deploy --only functions:provisionarTenantWalletSelf
// ─────────────────────────────────────────────────────────────────

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const db = admin.firestore();
const BASE_DOMAIN = 'synaptechspa.cl';
const TRIAL_DIAS = 14;

// verificarSlugLibre ya está expuesto por provision-tenant.js y registrado
// en index.js; el HTML del wizard lo llama por nombre. Acá sólo validamos
// server-side para evitar bypass del check previo.

// Como los helpers no se exportan, replicamos las validaciones acá — mismo
// contrato (si divergen algún día, se rompe el uso cruzado explícito).
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;

function normalizarSlug(raw) {
  return String(raw || '')
    .toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

// Doble filtro contra slugs de tenants existentes: (1) la CF pública
// verificarSlugLibre corre el mismo Set + doc-check. Acá sólo repetimos el
// doc-check server-side por si un cliente malicioso saltea el chequeo previo.
async function slugYaTomado(slug) {
  if (!SLUG_RE.test(slug)) return true;
  const snap = await db.collection('tenants').doc(slug).get();
  return snap.exists;
}

// Config default: mínima. Solo lo que un lector genérico pueda esperar.
// diasLaborales full-week porque no hay horario en un local sin agenda.
const CONFIG_DEFAULT = {
  horarioInicio:    '09:00',
  horarioFin:       '20:00',
  intervaloMinutos: 30,
  diasLaborales:    [0, 1, 2, 3, 4, 5, 6],
  diasBloqueados:   [],
};

// Config default de wallet: colores neutros que se ven bien de entrada, para
// que la primera tarjeta ya luzca decente antes de que el dueño entre al
// editor. `enabled: false` hasta que el dueño la publique explícitamente.
function walletCfgDefault({ nombre, logoUrl }) {
  return {
    programName: 'Club de Fidelidad',
    issuerName:  String(nombre || 'Mi local').slice(0, 40),
    logoUrl:     logoUrl || null,
    accent:      '#c9a84c',
    bg:          '#0a0a0a',
    stampIcon:   'check',
    enabled:     false,
  };
}

// ═══════════════════════════════════════════════════════════════
//  CALLABLE — alta de tenant wallet-only
// ═══════════════════════════════════════════════════════════════
exports.provisionarTenantWalletSelf = onCall(
  { region: 'us-central1', cors: true },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Crea tu cuenta antes de activar la tarjeta.');
    }
    const uid   = req.auth.uid;
    const email = String(req.auth.token.email || '').toLowerCase();

    const raw       = req.data || {};
    const slug      = normalizarSlug(raw.slug);
    const nombre    = String(raw.nombre || '').trim().slice(0, 60);
    const telefono  = String(raw.telefono || '').replace(/\D/g, '').slice(0, 15);
    const nombreDueno = String(raw.nombreDueno || '').trim().slice(0, 60);
    const logoUrl   = String(raw.logoUrl || '').trim().slice(0, 500) || null;

    // Evidencia B2B del contrato SaaS + DPA + política de privacidad al alta
    // (Ley 21.719: consentimiento previo). Mismo patrón que el self de agenda.
    const acepto = raw.acepto || {};
    const terminosVersion = String(acepto.version || '').trim();
    if (!terminosVersion) {
      throw new HttpsError('failed-precondition',
        'Debes aceptar el Contrato SaaS, el Anexo DPA y la Política de Privacidad antes de crear tu local.');
    }
    const userAgentSignup     = String(acepto.ua || '').slice(0, 500) || null;
    const documentosAceptados = Array.isArray(acepto.documentos)
      ? acepto.documentos.map(String).slice(0, 20)
      : [];

    if (!nombre) throw new HttpsError('invalid-argument', 'Falta el nombre de tu local.');
    if (!slug)   throw new HttpsError('invalid-argument', 'Falta la dirección web (slug).');

    // Idempotencia: si esta cuenta ya creó un tenant, devuélvelo.
    const previo = await db.collection('tenants')
      .where('ownerUid', '==', uid).limit(1).get();
    if (!previo.empty) {
      const pSlug = previo.docs[0].id;
      const pData = previo.docs[0].data() || {};
      return {
        ok: true, yaExistia: true, slug: pSlug,
        urlPanel:  `https://${pSlug}.${BASE_DOMAIN}/gestion-interna/?local=${pSlug}`,
        urlEditor: `https://wallets.bioo.cl/estudio?tid=${encodeURIComponent(pSlug)}`,
        plan: pData.plan || null,
      };
    }

    // Una cuenta que ya pertenece a otro local no puede convertirse en dueña.
    const user   = await admin.auth().getUser(uid);
    const claims = user.customClaims || {};
    if (claims.tenantId && claims.tenantId !== slug) {
      throw new HttpsError('failed-precondition',
        'Esta cuenta ya pertenece a otro local. Usa un correo distinto.');
    }

    if (await slugYaTomado(slug)) {
      throw new HttpsError('already-exists', 'Esa dirección ya está tomada. Prueba otra.');
    }

    const tenantRef   = db.collection('tenants').doc(slug);
    const nombreCorto = nombre.split(/\s+/)[0];

    // 1. Reserva atómica del slug (mismo patrón que el self-service de agenda).
    await db.runTransaction(async (tx) => {
      const cur = await tx.get(tenantRef);
      if (cur.exists) throw new HttpsError('already-exists', 'Esa dirección ya está tomada.');
      tx.create(tenantRef, {
        slug, nombre, nombreCorto,
        tipo:      'wallet-only',    // señal para middlewares/config que no hay agenda
        telefono:  telefono || null,
        color:     null,
        instagram: null,
        slogan:    null,
        direccion: null,
        logoUrl:   logoUrl,
        dominio:   `${slug}.${BASE_DOMAIN}`,
        origen:    'self-service-wallet',
        plan:      'wallet-only',
        estado:    'activo',
        ownerUid:  uid,
        ownerEmail: email || null,
        aceptoTerminosAt:    FieldValue.serverTimestamp(),
        aceptoPrivacidadAt:  FieldValue.serverTimestamp(),
        terminosVersion,
        documentosAceptados,
        signupUserAgent:     userAgentSignup,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // 2. Subcolecciones + _system + _billing + wallet cfg.
    const batch = db.batch();
    const TS = FieldValue.serverTimestamp();
    const trialFin = Timestamp.fromMillis(Date.now() + TRIAL_DIAS * 86400000);

    batch.set(tenantRef.collection('configuracion').doc('main'), {
      ...CONFIG_DEFAULT,
      telefonoAdmin: telefono || null,
      updatedAt: TS,
    });

    batch.set(tenantRef.collection('settings').doc('general'), {
      nombre,
      direccion: '',
      telefono:  telefono || '',
      emailAvisos: email || null,
      logo: logoUrl || null,
      updatedAt: TS,
    });

    // Wallet cfg inicial: tarjeta pre-armada pero oculta (enabled=false).
    // El dueño la activa desde el editor cuando el diseño lo convence.
    batch.set(tenantRef.collection('configuracion').doc('wallet'), {
      ...walletCfgDefault({ nombre, logoUrl }),
      updatedAt: TS,
    });

    // Premio default para arrancar el club. Editable en el panel.
    batch.set(tenantRef.collection('premios').doc(`premio-${slug}-1`), {
      nombre: 'Producto o servicio de regalo',
      costoSellos: 10,
      activo: true,
      creadoEn: TS,
    });

    // Doc de "barbero admin" — abusamos del schema porque el panel usa
    // barberos/{uid} para resolver rol y perfil aunque el tenant no tenga
    // atención por barbero. Sin esto, el AuthContext degrada admin→null en
    // los edge cases donde el claim está pero el doc-espejo no.
    batch.set(tenantRef.collection('barberos').doc(uid), {
      uid,
      email:  email || null,
      nombre: nombreDueno || nombreCorto,
      rol:    'admin',
      activo: true,
      _walletOnly: true,   // señal blanda para vistas que iteren esta colección
    });

    // Kill switch / status.
    batch.set(db.collection('_system').doc(slug), {
      status: 'active',
      plan:   'wallet-only',
      origen: 'self-service-wallet',
      tenantNombre: nombre,
      creadoEn: TS,
    });

    // Billing: activo (trial) por 14 días. Lo lee useBillingPlan (sidebar +
    // App.jsx) y todos los gates de wallet (walletActivo). Trial vence solo;
    // el módulo mp de mensualidad decide si mantener o suspender pasado eso.
    batch.set(db.collection('_billing').doc(slug), {
      plan:            'wallet-only',
      walletActivo:    true,
      walletDesde:     TS,
      trialFinaliza:   trialFin,
      estadoPago:      'trial',
      emailCobro:      email || null,
      origen:          'self-service-wallet',
      creadoEn:        TS,
    }, { merge: true });

    await batch.commit();

    // 3. Claims del dueño (directo, sin esperar triggers).
    await admin.auth().setCustomUserClaims(uid, { role: 'admin', tenantId: slug });

    // 4. QA fantasma (silencioso si falla, no bloquea el alta).
    try {
      const { provisionarQaEnTenant } = require('./qa-fantasma');
      await provisionarQaEnTenant(slug);
    } catch (err) {
      logger.warn(`[self-wallet] provision QA falló (no crítico): ${err.message}`);
    }

    logger.info(`[self-wallet] tenant creado: ${slug} ("${nombre}") owner=${email || uid}`);

    return {
      ok: true,
      slug,
      urlPanel:  `https://${slug}.${BASE_DOMAIN}/gestion-interna/?local=${slug}`,
      urlEditor: `https://wallets.bioo.cl/estudio?tid=${encodeURIComponent(slug)}`,
      urlStaff:  `https://wallets.bioo.cl/staff`,
      trialDias: TRIAL_DIAS,
    };
  },
);

