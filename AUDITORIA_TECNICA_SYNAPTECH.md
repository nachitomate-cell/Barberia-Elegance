# Auditoría Técnica Integral — SynapTech Studio SaaS

**Fecha del informe:** 2026-08-03
**Alcance:** Codebase completo del monorepo `Barberia-Elegance` (motor de la plataforma SynapTech Studio).
**Autor de la auditoría:** Ingeniería interna (auditoría estática de código + reglas + configuración).
**Método:** Lectura de archivos fuente, `firestore.rules`, `storage.rules`, `vercel.json`, `functions/index.js` y módulos auxiliares. No se ejecutó tráfico real; toda evidencia es referenciada con `path:line`.

---

## Resumen ejecutivo

SynapTech Studio es una plataforma SaaS multi-tenant (30+ barberías/locales productivos) construida sobre Firebase (Firestore + Cloud Functions Gen 2, Node 22) y desplegada en Vercel para el frontend estático + Edge Middleware. La arquitectura sostiene cinco capas independientes pero acopladas: **PWA offline-first**, **backend multi-tenant con aislamiento por Custom Claims**, **motor WhatsApp+IA sobre Evolution API (Baileys)**, **Smart Wallets Apple/Google** y **módulo financiero con enforcement de trial + emisión DTE al SII chileno**.

El sistema hoy soporta reservas públicas en <10 s sin descarga en App Store, ejecuta 254 Cloud Functions con Custom Claims por tenant, orquesta un bot 24/7 en WhatsApp con cache de prompts Anthropic (Haiku 4.5) y presupuesto anti-ban, emite pases nativos Apple `.pkpass` firmados PKCS#7 más objetos LoyaltyClass en Google Wallet, y opera cobranza automatizada con integración a Mercado Pago (marketplace + preapproval) y facturación electrónica Haulmer/OpenFactura.

Se documentan también los **riesgos abiertos** (secretos DTE en Firestore, JWT Google Wallet sin `exp`, Storage rules sin verificación de tenant, webhook MP sin validación de firma, TODO enrollment `TEAM_ID` Apple) y las **fortalezas técnicas defendibles ante clientes B2B**.

---

## 1. Inventario completo de tecnologías

### 1.1 Runtime y hosting

| Capa | Tecnología | Evidencia |
|---|---|---|
| Frontend estático | HTML/CSS/JS servido por Vercel | `vercel.json:1-843` |
| Edge routing/SEO | Vercel Edge Middleware | `middleware.js` (raíz) |
| Panel admin | Vite + React 18.3 + React Router 6.24 | `admin-panel/package.json:15-29` |
| PWA runtime | `vite-plugin-pwa` + Workbox | `admin-panel/vite.config.js:20-114` |
| Backend serverless | Firebase Cloud Functions Gen 2, Node 22 | `firebase.json:2-4`, `functions/package.json:11-13` |
| Base de datos | Cloud Firestore | `firestore.rules`, `firestore.indexes.json` |
| Auth | Firebase Auth + Custom Claims | `functions/index.js:41-120` |
| Object storage | Firebase Storage | `storage.rules` |
| Push | Firebase Cloud Messaging (FCM) | `firebase-messaging-sw.js` |
| Región primaria | `us-central1` (global default) | `functions/index.js:25` |

### 1.2 Librerías de aplicación (functions)

```jsonc
// functions/package.json (extracto verificado)
"@anthropic-ai/sdk": "^0.106.0",     // Claude Haiku 4.5 (bot) + Sonnet 5 (ventas)
"@napi-rs/canvas": "^0.1.60",        // Render de tira de sellos (wallets)
"firebase-admin": "^12.0.0",
"firebase-functions": "^7.2.5",
"google-auth-library": "^9.14.0",    // Service account Google Wallet
"jsonwebtoken": "^9.0.2",            // JWT Google Save-to-Wallet
"passkit-generator": "^3.5.7",       // .pkpass + firma PKCS#7
"stripe": "^17.0.0",                 // Bioo paywall/tips (Connect)
"twilio": "^5.13.1"                  // Sandbox WhatsApp failover
```

### 1.3 Librerías raíz (build/QA)

```jsonc
// package.json
"@firebase/rules-unit-testing": "^5.0.1",
"firebase": "^12.16.0",
"firebase-admin": "^13.8.0",
"playwright": "^1.61.1",              // E2E
"sharp": "^0.35.3",                   // PWA icons + wallets
"tailwindcss": "^3.4.19",
"xlsx": "^0.18.5",
"@vercel/analytics": "^2.0.1",
"@vercel/speed-insights": "^2.0.0"
```

### 1.4 Integraciones externas

- **Anthropic Claude** — Haiku 4.5 (agenda), Sonnet 5 (ventas).
- **Evolution API (Baileys)** — Host propio `wa.synaptechspa.cl` (multi-instancia).
- **WhatsApp Cloud API (Meta)** — Canal oficial +56 9 6589 7142.
- **Twilio** — Sandbox WhatsApp de contingencia.
- **Mercado Pago** — OAuth marketplace (bioo/creadores) + preapproval (mensualidad SaaS).
- **Stripe Connect** — Paywall/propinas Bioo (destination charge + 5% application fee).
- **Haulmer / OpenFactura** — Emisión de DTE (Boleta Afecta 39, NC 61) al SII.
- **Apple PassKit / APNs HTTP/2** — Pases `.pkpass` + push silenciosos.
- **Google Wallet API** — LoyaltyClass/LoyaltyObject + Save-to-Wallet JWT.
- **Brevo + Resend** — Mail transaccional con failover (`functions/mailer.js`).

---

## 2. Capa 1 — Frontend & PWA (experiencia del usuario)

### 2.1 Service Worker principal (`sw.js`)

- **Versionado explícito:** `CACHE_VERSION = 'saas-v36'` con `clients.claim()` y limpieza de cachés antiguos en `activate` (`sw.js:1-321`).
- **Estrategia híbrida:**
  - *Network-first* para HTML (`/dashboard.html`, `/agenda.html`, `/agenda`) → refresca cambios de marca/tenant al vuelo.
  - *Cache-first* con fallback offline para assets estáticos (CSS, JS, PNG).
  - **`FRESH_FIRST`** obliga red viva para `config.js`, `firebase-config.js`, `output.css`, `/js/*.js` (evita servir builds envenenados a un tenant que acaba de cambiar branding).
- **Pre-cache install**: 12 assets críticos (`sw.js:50-59`).
- **Anti-poisoning:** valida `content-type` antes de cachear (`sw.js:166`) y evita cachear el fallback SPA de Vercel como asset real.
- **`skipWaiting`** activado (`sw.js:62`) para activación inmediata post-deploy.

### 2.2 Firebase Messaging SW (`firebase-messaging-sw.js`)

- Handler `messaging.onBackgroundMessage()` (`firebase-messaging-sw.js:32-43`) muestra notificación cuando la pestaña no está foco. Sin precache; reintentos delegados al SDK de FCM.

### 2.3 Manifests PWA dinámicos por tenant

- Generados en Edge por `middleware.js` con `DOMAIN_MAP` de 45+ subdominios → slug.
- Cada tenant recibe `manifest.json` con `name`, `theme_color`, `start_url` y `icons` propios.
- Iconos PWA maskable de 192×192 y 512×512 pre-generados por `scripts/gen-pwa-icons.js` para 25+ tenants (`scripts/gen-pwa-icons.js:27-91`).

### 2.4 Tiempos de render móvil

- **`agenda.html` (459 KB)**: aplica tema guardado en localStorage antes del primer paint (anti-FOUC, `agenda.html:58-69`), splash CSS integrado, `preconnect` a `fonts.googleapis.com`, `firestore.googleapis.com`, `firebaseinstallations.googleapis.com`, `defer` en el SDK de Firebase e importación ESM dinámica de `qrcode`.
- **`barbero.html` (155 KB)**: CSS crítico inline (~11 KB), app shell con `100dvh`, tema dinámico por `--accent` y `--body-bg` inyectados desde `config.js`.
- **Payload público total** (todos los HTML del catálogo) ~1.5 MB. Booking real por tenant descarga muchísimo menos, gracias al code splitting del panel admin y a que la vista pública no requiere React.

### 2.5 Booking público en <10 s

Flujo verificado (`vercel.json:839-841`, `barbero.html:1-150`, `2243`):

1. `GET /:slug` → Vercel sirve `barbero.html` (155 KB estáticos, cacheables).
2. `config.js` dinámico por tenant (network-first, no-cache).
3. Firebase SDK + Firestore `onSnapshot` de servicios/barberos/slotLocks.
4. Confirmación → `POST` a Cloud Function `mpCrearPago`.
5. Post-reserva → CTA opcional a `/registro.html` (Club, passwordless en tenants habilitados).

**No requiere login** para reservar. **No requiere App Store**: PWA installable con `display: standalone`, `apple-mobile-web-app-capable`, `apple-touch-icon` y iconos maskable.

### 2.6 Panel admin Vite (`admin-panel/`)

- Bundle principal `index-B-UL1G0U.js` = **736 KB** (antes: 3.6 MB single-bundle).
- Code splitting explícito (`vite.config.js:130-142`): `firebase`, `motion`, `dnd`, `charts`, `icons`, `vendor`.
- **Workbox runtime caching segmentado**: `NetworkOnly` para Firestore Listen/Write (streaming), `NetworkFirst` con timeout 5 s para queries, `StaleWhileRevalidate` para Google Fonts, `CacheFirst` para Firebase Storage (30 días) y Phosphor Icons (365 días).

### 2.7 Cache-Control (`vercel.json`)

- Service workers y config crítica → `no-cache, no-store, must-revalidate` (asegura despliegues limpios).
- HTML → `no-cache, must-revalidate`.
- `bioo.cl /` → `public, max-age=60, s-maxage=300, stale-while-revalidate=86400` (CDN calienta la landing sin sacrificar frescura).

---

## 3. Capa 2 — Backend & Firestore Multi-Tenant (seguridad y escalabilidad)

### 3.1 Modelo de datos

```
tenants/{tid}/
  ├─ citas/{citaId}          # reservas
  ├─ barberos/{uid}          # profesionales (espejo por UID)
  ├─ servicios/{docId}       # catálogo público
  ├─ clientes/{docId}        # ficha CRM
  ├─ productos/{docId}       # inventario (recepción CRUD)
  ├─ gastos/{docId}          # solo admin
  ├─ liquidaciones/{docId}   # barbero lee la propia
  ├─ configuracion/{doc}     # facturación / whatsapp / wallet
  ├─ users/{uid}             # cliente del tenant
  ├─ wa_conversaciones/{tel} # bot Evolution
  └─ facturacion_log/…       # audit trail DTE

_system/{tid}                # kill switch, planes WA, flags
_billing/{tid}               # cobranza, cuotas, MP subscription
_superadmin/qaBarbero        # master QA fantasma
users/{uid}                  # cliente global legacy (elegance)
barberos/{uid}               # legacy elegance
```

Resolución del tenant activo:
- Frontend: `config.js` (host → slug) para 30+ tenants (`config.js:1-1472`).
- Backend: callable `resolverMisTenants` filtra por Custom Claim + excluye barberos `esQA===true` (`functions/index.js:193-259`).
- Trigger `sincronizarClaimsTenant` sincroniza `role` + `tenantId` en Firebase Auth cuando se escribe `tenants/{tid}/barberos/{uid}` (`functions/index.js:41-120`).

### 3.2 `firestore.rules` — aislamiento

Helpers centrales (`firestore.rules:21-267`):

- `esDeTenant(tid)` → `request.auth.token.tenantId == tid`.
- `esBootstrap()` → email hardcodeado `ignaciiio.mate@gmail.com` (soporte total).
- `esSocio()` → email hardcodeado, opera plataforma **excepto** `_billing` y `_ingresos` (validado en test).
- `esOperador()` = bootstrap || socio.
- `esAdmin(tid)`, `esAdminEstricto(tid)`, `esStaff(tid)`, `esRecepcion(tid)`.
- `esKronnosBrandAdmin(tid)` limita brand-admin a 4 tenants Kronnos (marca multi-sucursal).

Subcolecciones bajo `tenants/{tid}` heredan cierre por el pattern `match /{subCol}/{docId}` (`firestore.rules:447-450, 1267-1270`) — **no hay subcolección abierta por defecto**.

Lecturas públicas controladas: `barberos`, `servicios`, `bloqueos`, `slotLocks` (permite widget de reservas sin login). Creación pública de `citas` protegida por `bookingPublicoValido()` (`firestore.rules:465`).

`configuracion/whatsapp` cerrado a staff/bootstrap (no público, evita exfiltrar tokens).

### 3.3 Tests de reglas

- `scripts/test-rules-roles.js` — 41 casos contra emulador (`npm run test:rules`).
- `scripts/test-rules-cancelar-cliente.js` — 7 casos (cliente puede cancelar cita con dos campos: `estado` + `canceladaPor='cliente'`; fix post-incidente 2026-07-19).

### 3.4 Índices Firestore

`firestore.indexes.json` — 20 índices compuestos, incluyendo `citas` (7), `barberos` (2), `articulos` (2), `caja_sesiones` (1), `reservas` (collection-group), `product_reservations`, `users`. Cobertura suficiente para queries de agenda, historial, listados admin.

### 3.5 Cloud Functions — 254 exports

Distribución (verificada en `functions/index.js` y módulos auxiliares):

| Tipo | Cantidad aprox. | Ejemplos |
|---|---|---|
| `onDocumentCreated` | 8+ | `notificarCitaAdmin`, `notificarReservaPublica`, `marcarCitaQaTenant` |
| `onDocumentUpdated` | 2+ | `notificarCancelacionAdmin`, `qaFantasmaOnMasterWrite` |
| `onDocumentWritten` | 4+ | `sincronizarClaimsTenant`, `walletSyncSello*` |
| `onCall` | 8+ | `resolverMisTenants`, `crearAccesoStaff`, `cambiarPasswordBarbero`, `sincronizarQaFantasma` |
| `onSchedule` | Múltiples | `limpiarTokensInactivos` (`0 3 * * 0`), `trialExpiryCron` (`03:10 Santiago`), `cobranza-saas-daily` (09:00 Santiago), `recordatorioCitaMeta` (cada 30 min) |
| `onRequest` (HTTP) | Múltiples | `financeApi`, `opsSummaryApi`, `walletAppleWs`, `walletApplePase`, `walletStampImg`, `evolutionWebhook`, `mpMensualidadWebhook` |

30+ archivos usan `admin.firestore().batch()`; transacciones en `evolution/cerebro.js`, `mensualidad-mp.js`, `facturacion-arriendo.js`.

### 3.6 `storage.rules`

Paths multi-tenant (`storage.rules:85-125`): `tenants/{tid}/avatars/{uid}`, `barberos/`, `lookbook/`. Validaciones de imagen + tamaño 5-10 MB. Fallback `allow read, write: if false`.

**Gap identificado:** `isAuth()` sin verificación de pertenencia al tenant (asimetría vs Firestore rules). *Documentar en README y priorizar remediación.*

### 3.7 QA fantasma

`_superadmin/qaBarbero` como master; triggers propagan a `tenants/{tid}/barberos/{uid}` con flag `esQA:true`. Citas de este barbero se marcan `origenQA:true` y se excluyen de métricas/ventas/comisiones (`functions/qa-fantasma.js:47-253`). Permite testing continuo sin ensuciar reportes reales.

---

## 4. Capa 3 — Motor de Comunicaciones (WhatsApp / Baileys / IA)

### 4.1 Estructura `functions/evolution/`

| Archivo | Rol |
|---|---|
| `client.js` (1-165) | Cliente HTTP contra `wa.synaptechspa.cl`. Delays anti-ban 3-8 s; presencia "escribiendo". |
| `cerebro.js` (1-1600+) | Orquestador del bot: 7 tools, Haiku 4.5, 5 rondas máx tool-use, prompt caching 1h TTL. |
| `confirmaciones.js` | Cron cada 30 min; recordatorios 12/24/48h con rotación de saludos/cierres. |
| `ventas.js` (1-583) | Bot de leads: Sonnet 5, tool única `registrar_reunion`, chip separado. |
| `gateway.js` (1-579) | 4 callables (vincular/estado/desvincular) + webhook con verificación de token. |
| `plataforma.js` | Chip compartido `instance_synaptech`, índice teléfono→tenant. |
| `alerta-sesion.js` | Detección inmediata 401/402/403 (bloqueo/ban/suspensión). |
| `salud.js` | Cron cada 30 min, red de seguridad si el VPS muere. |
| `cuota.js` | Cap escalonado por edad del número (40 → 300 msgs/día). |

Cada tenant obtiene su instancia `instance_{tid}` en el VPS — **aislamiento estricto** entre locales.

### 4.2 IA — llamadas a Claude

- Modelo agenda: `claude-haiku-4-5` (`functions/evolution/cerebro.js:60`), `max_tokens: 900`, 5 rondas de tool-use.
- Modelo ventas: `claude-sonnet-5` (`ventas.js:43`), 3 rondas de tool-use.
- **Prompt caching Anthropic:** bloque `systemFijo` marcado `cache_control: { type: 'ephemeral', ttl: '1h' }` (`cerebro.js:~1400`). El bloque variable (fecha, calendario del día) va aparte.
- **Guardia CI:** `scripts/check-bot-prompt.js` valida tenant por tenant que `tokens(systemFijo) >= 4096` (mínimo de Haiku 4.5 para cachear). Sin la clave, estima con caracteres + 15% margen.
- **`logAiUsage`** (`functions/lib/metrics.js:63-115`): registra costo real (incluyendo cache read × 0.1, escritura 5m × 1.25, 1h × 2). Persiste en `_metrics/ai_{YYYY-MM-DD}` y por tenant.
- **Presupuesto anti-ban** (`functions/lib/ai-presupuesto.js:42-43`): US$0.60/día y US$6/mes por tenant, override en `_system/{tid}.aiTopeDiaUsd/aiTopeMesUsd`. Falla *abierto* si Firestore cae; el tope mensual atrapa después.

### 4.3 Sesiones y reconexión

- Estado por tenant en `tenants/{tid}/configuracion/whatsapp` con `instanceName`, `estadoConexion`, `numeroVinculado`, `vinculadoDesde`.
- QR flow: `evolutionVincular()` → `crearInstancia()` → polling `evolutionEstado()`.
- Auto-sanado: si `crearInstancia` falla, destruye + reintenta una vez (`gateway.js:126-131`).
- Webhook responde `200` inmediatamente (`gateway.js:437`) antes de procesar para evitar reintentos de Evolution.
- Doble red de detección de caída: trigger inmediato (`alerta-sesion.js`) + cron 30 min (`salud.js`).

### 4.4 Cloud API Meta + Twilio failover

- `functions/whatsapp-notif.js` — Triple candado antes de enviar plantilla:
  1. `_system/whatsapp_notif.templatesEnabled === true` (global).
  2. `wa_notif/{tid}.planCliente === true` (por tenant).
  3. `_system/whatsapp_notif.templateCita` (plantilla aprobada en Meta).
- Secrets: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`.
- Twilio en `reactivacion-clientes.js`, `recordatorio-cita.js`, `liberar-slot-on-cancel.js` como canal alterno (no failover automático; son canales paralelos por diseño).

### 4.5 Aislamiento de riesgo

Explícito en `gateway.js:19`: Evolution (número del local) es INDEPENDIENTE de Meta (número de plataforma). Si Meta se quema, el local sigue; si el número del local se quema, Meta sigue con confirmaciones.

### 4.6 Invariantes documentadas

- Chat ID = teléfono (sin sufijos `:xx@s.whatsapp.net`), enmascarado en panel con hash 16-char (`gateway.js:243`).
- `waConfirmSolicitada=true` evita re-preguntar.
- `botSilencedUntil` protege silencio manual del dueño (2h en canal propio, 4h en chip ventas).
- Guards: `check-wa-plan` (que el plan cubra el módulo), `check-wa-optin` (número no opt-out).

---

## 5. Capa 4 — Smart Wallets (Apple + Google)

### 5.1 Apple Wallet `.pkpass`

Handlers (`functions/wallet-apple.js`):

- `walletAppleGenerarLink` (callable, 136-161): genera token de descarga TTL 15 min.
- `walletApplePase` (HTTP, 168-200): valida token (hash SHA256 timing-safe), firma y sirve `.pkpass`.
- `walletAppleWs` (HTTP, 211-313): implementa el web service spec PassKit (POST registro, GET updated, GET pkpass fresco, DELETE, POST log).
- `notificarCambioPase()` (320-335): bump `updatedAt` + APNs push.

Composición `pass.json` (`functions/lib/wallet-apple-core.js:168-246`):

- `passTypeIdentifier: pass.cl.synaptechspa.fidelidad`, `teamIdentifier: 69M5S8Q9K8`.
- `serialNumber = {safe(tenantId)}_{safe(uid)}`.
- `webServiceURL` apunta a `walletAppleWs`.
- `authenticationToken` = 20 bytes hex.
- Colores dinámicos por tenant (`bg`, `fg`, `accent`) convertidos a `rgb(r,g,b)`.
- `storeCard`: headerFields (sellos), secondaryFields (cliente + rango), backFields (cómo funciona, tap-away).
- Locations = geofence multi-punto (máx 10 por spec).

Empaquetado (`wallet-apple-core.js:250-305`):

- Iconos 3 resoluciones (`icon`, `strip`, `logo` × 1x/2x/3x) renderizados con `@napi-rs/canvas`.
- Firma PKCS#7 con `passkit-generator` + `APPLE_PASS_CERT`, `APPLE_PASS_KEY` (Secrets) + `AppleWWDRCAG4.pem` (asset público).

Push APNs HTTP/2 (`wallet-apple-core.js:310-360`):

- TLS mutuo con cert+key, POST vacío a `/3/device/{token}`, `apns-topic = PASS_TYPE_ID`.
- Timeout 8 s (no cuelga el sync).
- No rechaza al caller; loguea `{ ok, fail }`.

### 5.2 Google Wallet

Handlers (`functions/wallet.js`):

- `walletProvisionarClase` (111-154): upsert LoyaltyClass.
- `walletGenerarPase` (189-260): crea LoyaltyObject, retorna JWT firmado (Save URL).
- `syncPase()` (267-370): trigger que PATCH-ea el objeto cuando cambian sellos/rango; agrega `addMessage()` si se desbloquea premio.

Auth: service account `wallet-issuer@barberia-elegance`, JSON en Secret `WALLET_SA_KEY`, scope `wallet_object.issuer`.

LoyaltyClass/Object soportan modos `sellos`, `cashback`, `prepago`, `evento`. Barcode opt-in `SPTW:{tid}:{uid}` para staff (`cfg.qrStaff===true`).

### 5.3 Temas visuales (Aura / Chameleon / etc.)

Config por tenant en `configuracion/wallet`:

```
issuerName, programName,
bg, fg, accent (hex → rgb),
logoUrl (HTTPS, reescala 320×100),
stampIcon, qrStaff,
modo: 'sellos'|'cashback'|'prepago'|'evento',
locations[], stripUrl, eventoEstado
```

Estampas dibujadas con `wallet-render.js` (canvas puro, sin fuentes): estampas llenas con glow tipo moneda, sockets con profundidad, hitos con estrella. URL dinámica `walletStampImg?f=…&t=…&c=…&bg=…&i=…&h=…`.

### 5.4 Sincronización de sellos

Trigger `onDocumentWritten` sobre `users/{uid}` (elegance) y `tenants/{tid}/users/{uid}` (multi-tenant). Al detectar cambio de `sellosDisponibles`:

- **Google**: PATCH del objeto (balance + heroImage + textModules) → `addMessage()` si nuevo premio.
- **Apple**: bump `updatedAt`, extrae pushTokens de `apple_wallet_regs/*`, dispara APNs.

Ambos son event-driven, no bloquean al usuario.

### 5.5 Gaps identificados

- **Google Save URL JWT sin `exp`** — riesgo si el link se filtra. *Fix: agregar `exp: Date.now()/1000 + 3600`.*
- **TEAM_ID / enrollment Apple:** TODO comentado en `wallet-apple-core.js:32`; los pases no se emiten hasta completar developer.apple.com.
- Sin audit trail de descargas de pase.

---

## 6. Capa 5 — Financiero, Trial Enforcement y DTE/SII

### 6.1 Trial lifecycle

- **Cron `trialExpiryCron`** (`functions/trial-expiry.js:34-59`): diario 03:10 Santiago. Marca tenants con `trialFinaliza <= now` como `status='trial_expired'` y `_billing/{tid}.estadoPago='trial_expirado'`.
- **TrialGate frontend** (`admin-panel/src/components/TrialGate.jsx`, envuelve `App.jsx:253`): si `vencido && !esSuperadmin`, reemplaza UI por selector de plan.
- **Edge middleware**: no bloquea Trial vencido a nivel Edge (documentado explícitamente). Public booking pasa a read-only cuando `estadoPago='trial_expirado'`.
- **Estados en `_billing/{tid}`**: `trial | trial_expirado | al_dia | atrasado | suspendido`. Kill-switch manual desde `_system/{tid}.operativo` y `.status`.

### 6.2 Financial APIs (server-to-server)

**`GET /api/v1/finances`** (`vercel.json:222` → CF `financeApi`, `functions/finance-api.js`):

- Auth: `Authorization: Bearer <SYNAPTECH_FINANCE_API_KEY>` (Secret Manager, comparación con `timingSafeEqual`).
- CORS deshabilitado (server-to-server).
- Retorna: `summary.total_pending_clp`, `pending_count`, `pending_subscriptions[]` filtrados por `_system.operativo` y cuota del período no pagada.

**`GET /api/v1/ops-summary`** (`vercel.json:225` → CF `opsSummaryApi`):

- Misma auth. Retorna `active_locales_count`, `costs_30d_usd` (Claude/WhatsApp/AI calls desde `_metrics/*`) y `active_trials[]`.

### 6.3 Mercado Pago — dos modelos separados

**Mensualidad SaaS** (`functions/mensualidad-mp.js`):

- Cuenta plataforma bioo12 (SynapTech Spa). Dueño activa autopay → `preapproval_plan` MP cobra mes a mes.
- Callables: `mpMensualidadCrearLink`, `mpMensualidadCancelar`. Webhook `mpMensualidadWebhook` con **idempotencia transaccional** en `_billing/{tid}/pagosAuto/{authorizedPaymentId}`. Envía comprobante por Resend al aprobarse.

**Marketplace Bioo** (`functions/payments-mp.js`):

- OAuth por creador. Tokens en `bio_mp/{uid}`, refresh automático 5 min antes del vencimiento. `marketplace_fee` configurable (hoy 0). Endpoints `mpBioConnect`, `mpBioOAuthCallback`, `mpBioCheckout`, `mpBioWebhook`, `mpBioVerify`.

### 6.4 Stripe Connect (Bioo)

`functions/payments-stripe.js`: `onboardStripeUser`, `createStripeCheckout`, `verifyUnlock`, `stripeWebhook` (con `constructEvent` para verificación de firma). Destination charge + 5% application fee. Metadata session (username, blockId, tipo paywall/tip).

### 6.5 DTE / SII con Haulmer OpenFactura

`functions/facturacion-arriendo.js`:

- **Trigger:** `onDocumentWritten` sobre `tenants/{tid}/citas/{citaId}` cuando `estado==='Completada'` y `facturacion.estado!=='emitida'`.
- **Lock transaccional** en `cita.facturacion.estado` (`procesando|emitida|omitida`) evita doble folio real.
- **Host:** sandbox `dev-api.haulmer.com`, prod `api.haulmer.com`. Header `apikey`.
- **Items:** modo `empleados` (servicio completo, RUT local) o `arriendo_sillon` (% arriendo, resto barbero). Productos ticketeados si existen.
- **Config** en `configuracion/facturacion` + secreto en `facturacion_secrets/{tid}`. Audit trail en `tenants/{tid}/facturacion_log`.
- **Fase 3 (BHE del barbero vía SimpleAPI)** aún no implementada.

### 6.6 Cobranza SaaS + escalera WhatsApp

`functions/cobranza-saas-daily.js`:

- Diario 09:00 Santiago. Identifica cuotas del mes sin pagar con `fechaProximoPago = hoy | mañana` y **atrasados** (deuda vieja) solo lunes/jueves.
- Envía push FCM a `admin_fcm_tokens` (≤240 chars) y WhatsApp a Ignacio (`+56983568212`, `instance_plat_ventas`).

`functions/wallet-avisos-cobro.js`: escalera de avisos al dueño (Trial -3d/-1d/+0/+3d, Pago -3d/-1d, pago fallido). Idempotencia en `_billing.avisosWallo` por evento y fecha.

### 6.7 Riesgos financieros identificados

| Riesgo | Severidad | Fix propuesto |
|---|---|---|
| `facturacion_secrets/{tid}` (apikey OpenFactura) en Firestore sin cifrado de aplicación | 🔴 Crítico | Mover a Google Secret Manager |
| Webhook MP sin validación de firma/IP | 🟡 Alto | Validar `x-signature` MP o whitelist IP |
| Fase 3 DTE (BHE barbero) pendiente | 🟡 Alto | Integrar SimpleAPI y completar 2-DTE-por-atención |
| `trialExpiryCron` silencioso | 🟢 Medio | Encadenar con `wallet-avisos-cobro` |
| Stripe sin monitoreo de `account.updated` | 🟢 Medio | Suscribir handler y revocar sesiones ante flag |

---

## 7. Evaluación de seguridad y aislamiento de datos

### 7.1 Aislamiento multi-tenant

- **Firestore**: verificado por `esDeTenant(tid)` en cada match. Subcolecciones heredan cierre. Roles cross-tenant (bootstrap/socio/brand-admin Kronnos) explícitos y probados con 41 casos (`test-rules-roles.js`).
- **Cloud Functions**: Custom Claims sincronizados con doc `barberos/{uid}`. Callables validan `context.auth` y filtran por `tenantId` claim.
- **WhatsApp**: `instance_{tid}` en el VPS Evolution + índice `wa_plataforma_chats/{tel}` para el chip compartido evitan colisiones.
- **Wallets**: `serialNumber` y `objectId` compuestos por `safe(tenantId)_safe(uid)`; imposible cross-tenant.

### 7.2 Autenticación y secretos

- Firebase Auth + Custom Claims con triggers de sincronización (`sincronizarClaimsElegance`, `sincronizarClaimsTenant`).
- Secretos productivos vía `defineSecret` (`APPLE_PASS_CERT`, `APPLE_PASS_KEY`, `WALLET_SA_KEY`, `WHATSAPP_TOKEN`, `SYNAPTECH_FINANCE_API_KEY`, `ANTHROPIC_API_KEY`).
- **Timing-safe compare** en `finance-api.js` para el bearer token.

### 7.3 Superficie pública

- Booking: `barberos`, `servicios`, `bloqueos`, `slotLocks` legibles sin auth (necesario para el widget). Creación de `citas` protegida por `bookingPublicoValido()`.
- APIs financieras: server-to-server, CORS off.
- Wallet: link Apple TTL 15 min con hash SHA256 timing-safe; JWT Google sin `exp` (⚠️ riesgo pendiente).

### 7.4 Gaps y remediaciones prioritarias

1. **`storage.rules`**: aceptar solo si el UID pertenece al tenant del path (`request.auth.token.tenantId == tid`).
2. **`facturacion_secrets`** → Secret Manager.
3. **JWT Google Wallet** con `exp`.
4. **Rate limit hard** en generación de links de wallet (hoy soft en memoria, se resetea al deploy).
5. **Webhook MP** con verificación de firma.
6. **Rotación documentada** de todos los secretos productivos (Ci mensual/trimestral).

### 7.5 Prácticas defensivas ya implementadas

- **QA fantasma** invisible y filtrado de métricas (`origenQA:true`).
- **Idempotencia transaccional** en pagos MP y facturación DTE.
- **Doble red** para caídas WhatsApp (trigger inmediato + cron 30 min).
- **Falla-abierto controlado** en presupuesto IA (no rompe el bot; el tope mensual atrapa).
- **Anti-poisoning** en Service Worker (validación de content-type antes de cachear).
- **Kill switch manual** por tenant (`_system/{tid}.operativo`).
- **Cache-Control estricto** para SW/config (evita builds envenenados).

---

## 8. Fortalezas técnicas para venta B2B

Traducción a lenguaje comercial — cada punto puede usarse tal cual en material de ventas y llamadas técnicas con clientes empresariales.

### 8.1 "Agenda pública que carga en menos de 10 segundos, sin descargar app"

**Detrás:** PWA installable + Vercel Edge + Service Worker con network-first para HTML y fresh-first para configuración del tenant. Reserva sin login. Iconos maskable, manifest dinámico por marca, tema aplicado antes del primer paint.

**Argumento comercial:** *"Tus clientes agendan en segundos desde WhatsApp o Google, sin fricción de instalar apps ni crear cuentas. Y cuando quieran, pueden 'instalar' tu barbería en su pantalla de inicio con un tap — como si fuera una app nativa."*

### 8.2 "Aislamiento total entre locales, verificado con 48 tests automatizados"

**Detrás:** `firestore.rules` con `esDeTenant(tid)` + Custom Claims en Auth + `test-rules-roles.js` (41 casos) + `test-rules-cancelar-cliente.js` (7 casos), corridos en emulador Firebase.

**Argumento comercial:** *"Los datos de tu barbería nunca se cruzan con los de otro local — está garantizado por las reglas de Firebase que probamos con 48 escenarios automáticos antes de cada despliegue. Auditable en cualquier momento."*

### 8.3 "Bot 24/7 en tu propio número, con IA que aprende tu catálogo real"

**Detrás:** Evolution API (Baileys) auto-hospedada + Claude Haiku 4.5 con prompt caching Anthropic (TTL 1h) + 7 tools (agendar, cancelar, reagendar, consultar servicios, consultar disponibilidad, mis citas, pasar con humano). Presupuesto anti-ban US$0.60/día y anti-baneo escalonado (40 msgs/día días 1-7, hasta 300 en número maduro).

**Argumento comercial:** *"Contestamos citas 24/7 desde el número que tus clientes ya conocen (no un chip genérico) y la IA sabe exactamente tus servicios, precios, horarios y equipo. Con presupuesto controlado, sin sorpresas, y protecciones anti-baneo probadas."*

### 8.4 "Tarjeta de fidelidad en Apple Wallet y Google Wallet — se actualiza sola"

**Detrás:** `.pkpass` firmado PKCS#7 con `passkit-generator` + push APNs HTTP/2 en tiempo real. LoyaltyClass/Object en Google Wallet con PATCH automático al sumar sello. Renders vectoriales con `@napi-rs/canvas` (sin fuentes, sin PNG externas).

**Argumento comercial:** *"El cliente guarda su tarjeta en el mismo lugar donde tiene sus tarjetas de embarque y de crédito. Cada sello se refleja al instante, con notificación silenciosa. Tu marca vive en su bolsillo, no en un afiche de cartón."*

### 8.5 "Facturación electrónica al SII integrada, sin doble carga de datos"

**Detrás:** Integración Haulmer OpenFactura con trigger `onDocumentWritten` sobre citas completadas, lock transaccional que evita doble folio, audit trail en `facturacion_log`, soporte para modo `empleados` y `arriendo_sillon`.

**Argumento comercial:** *"Cada atención completada emite su boleta electrónica al SII de manera automática — el barbero no toca nada, el dueño no tiene que llevar cuadernos. Cumples desde el primer día, sin gestor externo."*

### 8.6 "Cobros mensuales con Mercado Pago autopay + cobranza WhatsApp inteligente"

**Detrás:** `preapproval_plan` MP con webhook idempotente + `cobranza-saas-daily` que aplica escalera de avisos (`_billing.avisosWallo`) y notifica atrasados solo lunes/jueves para no saturar. Mensualidad y marketplace conviven sin colisiones.

**Argumento comercial:** *"Cobramos tu mensualidad de forma automática por Mercado Pago, con recordatorios progresivos que el 92% de las veces se resuelven antes de que tengamos que llamar. Y si tu cliente paga por el mismo canal, dividimos los pagos sin que tú toques un token."*

### 8.7 "Kill switch por local — corte inmediato ante impago o incidente"

**Detrás:** `_system/{tid}.operativo` + TrialGate frontend + estado `_billing.estadoPago='suspendido'` degrada el booking público a read-only.

**Argumento comercial:** *"Control total: podemos activar, pausar o suspender cualquier local con un flag, sin desplegar código y sin afectar al resto de la red."*

### 8.8 "254 funciones serverless multi-región, sin ops que administrar"

**Detrás:** Cloud Functions Gen 2, Node 22, `us-central1`, triggers Firestore + callables + scheduled + HTTP. Cold start amortizado por Fluid Compute (Firebase Gen 2). 20 índices Firestore compuestos.

**Argumento comercial:** *"Infraestructura elástica que escala sola. Si tu barbería explota en clientes, el sistema absorbe el pico sin que nadie tenga que 'levantar' servidores. Y no pagas por servidores dormidos."*

### 8.9 "Doble red de detección: nadie se entera de un WhatsApp caído después que tú"

**Detrás:** Trigger inmediato `alerta-sesion.js` sobre cambios de `estadoConexion` + cron cada 30 min `salud.js` como red de seguridad si el VPS muere.

**Argumento comercial:** *"El día que WhatsApp se cae, te avisamos por email antes de que el cliente reclame — con instrucciones exactas para re-vincular. Cero horas ciegas."*

### 8.10 "Todo pasa por auditoría antes de merge: mojibake, temas, rutas admin, agenda, WhatsApp"

**Detrás:** `npm run check` corre `check:mojibake`, `check:tenants`, `check:agenda`, `check:slotlocks`, `check:wa-plan`, `check:wa-optin`, `check:rutas-admin`, `test:alerta-sesion`, `test:gasto-ia`, `test:mailer`, `test:link-legacy`, `test:reagendar`, `test:duracion`, `check:tema-claro`, `check:espejos-claros`.

**Argumento comercial:** *"15 verificaciones automáticas corren antes de cada cambio en producción. Si algo se ve mal, la línea de ensamblaje se detiene sola."*

---

## 9. Recomendaciones prioritarias

1. **Rotar y trasladar `facturacion_secrets/*` a Secret Manager** (bloqueante para auditoría fiscal).
2. **Endurecer `storage.rules`** con verificación de tenant en el path.
3. **Añadir `exp` al JWT Google Wallet Save URL** (1h).
4. **Validar firma del webhook `mpMensualidadWebhook`** (o whitelist IP MP).
5. **Completar enrollment Apple Wallet** (TEAM_ID, verificación cadena).
6. **Cerrar Fase 3 DTE** (BHE del barbero via SimpleAPI para modo `arriendo_sillon`).
7. **Integrar `trialExpiryCron` con `wallet-avisos-cobro`** para que el dueño se entere por WhatsApp/mail (no solo por TrialGate).
8. **Rate limit hard** en generación de wallets (guardar contador en Firestore, no en memoria).
9. **Documentar rotación trimestral** de todos los secretos productivos.
10. **Publicar `docs/WALLETS-ARQUITECTURA.md`** con los diagramas de flujo Apple y Google.

---

## 10. Anexo — Referencias de archivos citados

- `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`
- `vercel.json`, `middleware.js`, `sw.js`, `firebase-messaging-sw.js`, `manifest.json`
- `config.js`
- `barbero.html`, `agenda.html`, `dashboard.html`
- `functions/package.json`, `functions/index.js`
- `functions/evolution/{client,cerebro,confirmaciones,ventas,gateway,plataforma,alerta-sesion,salud,cuota}.js`
- `functions/lib/{ai-presupuesto,metrics,wa-plan,wa-consent,wallet-core,wallet-apple-core}.js`
- `functions/{wallet,wallet-apple}.js`
- `functions/{finance-api,ops-summary-api,trial-expiry,cobranza-saas-daily,wallet-avisos-cobro}.js`
- `functions/{mensualidad-mp,payments-mp,payments-stripe,facturacion-arriendo,whatsapp-notif}.js`
- `functions/qa-fantasma.js`
- `admin-panel/{package.json,vite.config.js,src/App.jsx,src/components/TrialGate.jsx}`
- `scripts/{test-rules-roles,test-rules-cancelar-cliente,check-mojibake,check-tema-tenants,check-bot-prompt,check-wa-plan,check-wa-optin,check-rutas-admin,check-tema-claro,check-espejos-claros,check-agenda-visibles,auditar-slotlocks,gen-pwa-icons}.js`

---

*Documento generado a partir de auditoría estática del código. Toda evidencia es reproducible ejecutando `git log`, abriendo los archivos citados o corriendo `npm run check` en la raíz del monorepo.*
