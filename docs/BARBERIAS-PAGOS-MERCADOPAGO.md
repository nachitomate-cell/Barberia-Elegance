# Barberías · Conectar Mercado Pago (marketplace por tenant)

Cada barbería conecta **su propia** cuenta de Mercado Pago (OAuth) desde
gestión-interna → **Recibir Pagos**, para recibir los cobros directo en su
cuenta. Mismo modelo que bioo, pero el "vendedor" es el tenant.

**Yügen no se toca:** sigue cobrando con el token de plataforma
(`MP_ACCESS_TOKEN`) porque no tiene doc en `tenant_mp` → cae al *fallback*.

Reutiliza la **misma Aplicación de MP** y secretos que bioo (`MP_APP_ID`,
`MP_APP_SECRET`). Solo hay que registrar un Redirect URI adicional:
```
https://us-central1-barberia-elegance.cloudfunctions.net/mpTenantOAuthCallback
```

## Lo implementado (✅ listo)

**Backend** — [functions/payments-mp-tenant.js](../functions/payments-mp-tenant.js):
- `mpTenantConnect` (callable, gate admin/jefe) → URL de OAuth.
- `mpTenantOAuthCallback` → canjea el code; token → `tenant_mp/{tid}` (cerrado);
  estado → `_system/mercadopago_{tid}` `{ connected, mpUserId }`.
- `mpTenantDisconnect` (callable, gate admin/jefe).
- `getValidTenantToken(tid)` con auto-refresh — **exportado** para que el flujo
  de reservas lo reutilice.

**Reglas** — `tenant_mp/{tid}`: `allow read, write: if false` (solo Admin SDK).

**Frontend** — [admin-panel/src/views/RecibirPagos.jsx](../admin-panel/src/views/RecibirPagos.jsx):
tarjeta Mercado Pago funcional (conectar/desconectar/estado en vivo, gate admin).
Flow y Stripe quedan "Próximamente".

**Deploy:**
```bash
firebase deploy --only functions:mpTenantConnect,functions:mpTenantOAuthCallback,functions:mpTenantDisconnect
firebase deploy --only firestore:rules
# y publicar gestión-interna (build de admin-panel → ../gestion-interna)
```

## PENDIENTE — enrutar el cobro a la cuenta del tenant (siguiente paso)

Conectar MP **guarda el token** pero todavía no cambia a quién le llega la plata
de una reserva. Para eso hay que adaptar [functions/mercadopago-pago.js](../functions/mercadopago-pago.js)
con un fallback (cambio chico, deja Yügen idéntico):

1. `mpCrearPago`: antes de crear la preference,
   ```js
   const { getValidTenantToken } = require('./payments-mp-tenant');
   const token = (await getValidTenantToken(tenantId)) || MP_ACCESS_TOKEN.value();
   // usar `token` en mpRequest(...) en vez de MP_ACCESS_TOKEN.value()
   // si vino token de tenant → opcional: marketplace_fee = Math.round(amount * FEE)
   ```
   y añadir `?t=${tenantId}` al `notification_url`.
2. `mpWebhook` / `mpRetorno` / `procesarPago`: resolver el token con el mismo
   fallback (leyendo `?t` del webhook) para consultar el pago en la cuenta correcta.

Como hoy **solo Yügen** está en `PAGO_TENANTS` (pago online obligatorio), este
paso recién mueve plata cuando se habilite pago online para otras barberías.

## Decisión pendiente
- **Comisión de plataforma** sobre cobros de barberías: hoy `0%`. Si se cobra %,
  se aplica como `marketplace_fee` cuando se use el token del tenant.
