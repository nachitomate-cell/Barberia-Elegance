# Bioo · Pagos con Mercado Pago (marketplace)

Cobros de **paywall** y **propinas** en `bioo.cl`, modelo *marketplace*: cada
creador conecta SU cuenta de Mercado Pago (OAuth) y recibe su plata directo; la
plataforma (SynapTech) retiene una comisión opcional (`marketplace_fee`).

Convive con Stripe Connect (internacional). El lado cliente elige proveedor
según lo que el creador conectó: **Mercado Pago tiene prioridad**, cae a Stripe.

---

## 1. Crear la Aplicación de Mercado Pago (una vez)

1. Entra a <https://www.mercadopago.cl/developers/panel/app> con la cuenta MP de
   la plataforma (SynapTech) y crea una **aplicación** (producto: *Checkout Pro /
   pagos online* con *marketplace*).
2. Copia el **Client ID** (`APP_ID`) y el **Client Secret**.
3. En la app, sección **Redirect URIs**, agrega EXACTAMENTE:
   ```
   https://us-central1-barberia-elegance.cloudfunctions.net/mpBioOAuthCallback
   ```
   (debe coincidir carácter por carácter con `REDIRECT_URI` en `functions/payments-mp.js`).

## 2. Registrar los secretos

```bash
firebase functions:secrets:set MP_APP_ID       # ← Client ID
firebase functions:secrets:set MP_APP_SECRET   # ← Client Secret
```

## 3. Desplegar las funciones

```bash
firebase deploy --only functions:mpBioConnect,functions:mpBioOAuthCallback,functions:mpBioCheckout,functions:mpBioWebhook,functions:mpBioVerify
```

Y publicar reglas (añade la colección cerrada `bio_mp`):

```bash
firebase deploy --only firestore:rules
```

---

## Arquitectura

| Pieza | Stripe (existente) | Mercado Pago (nuevo) |
|---|---|---|
| Onboarding creador | `onboardStripeUser` | `mpBioConnect` → `mpBioOAuthCallback` |
| Crear cobro | `createStripeCheckout` | `mpBioCheckout` (preference + `marketplace_fee`) |
| Confirmación S2S | `stripeWebhook` | `mpBioWebhook` (`?u=username` identifica al creador) |
| Verificar + entregar | `verifyUnlock` | `mpBioVerify` |
| Flag listo (público) | `bios/{u}.stripeReady` | `bios/{u}.mpReady` |
| Flag listo (panel) | `bio_users/{uid}.stripeReady` | `bio_users/{uid}.mpReady` |
| Credenciales | `bio_users/{uid}.stripeAccountId` (no sensible) | **`bio_mp/{uid}`** (tokens, cerrado al cliente) |

### Flujo de cobro
```
Visitante → mpBioCheckout (token del creador + marketplace_fee)
          → Checkout Pro → paga
          → mpBioWebhook (?u=username) marca la compra 'paid'
          → vuelve a bioo.cl/{u}?mp_order=ID → mpBioVerify entrega la hiddenUrl
```

- El **precio se valida server-side** (se lee de `bios/{u}.bloques`), nunca del cliente.
- `external_reference` = `orderId` de `bios/{u}/purchases/{orderId}` (evita parsear strings).
- Tokens con **auto-refresh**: `getValidSellerToken` renueva con el `refresh_token` al vencer.

### Seguridad
- Los tokens OAuth del creador viven en **`bio_mp/{uid}`** con regla `allow read, write: if false`
  → solo el Admin SDK los toca; nunca salen al navegador.
- `bio_users` y `bios` solo exponen el booleano `mpReady`.

## Comisión de plataforma

En `functions/payments-mp.js`:
```js
const PLATFORM_FEE = 0; // 0 = todo al creador. Ej: 0.05 = 5%
```
Con `0` se omite `marketplace_fee` en la preference. Subir el valor activa el split.

## Pendiente / notas
- La cuenta MP del creador debe estar habilitada para recibir pagos (KYC de MP).
- Para probar end-to-end conviene usar credenciales/cuentas de **prueba** de MP
  (usuarios de test vendedor + comprador) antes de producción.
