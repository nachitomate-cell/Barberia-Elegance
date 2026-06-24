# Bioo · Quitar marca de agua (Mercado Pago single-seller)

Producto premium one-time: **$4.990 CLP** para que el creador quite el
footer `⚡ Creado gratis en bioo.cl` de su página pública `bioo.cl/<user>`.

A diferencia de [BIOO-PAGOS-MERCADOPAGO.md](BIOO-PAGOS-MERCADOPAGO.md)
(marketplace OAuth — cada creador cobra a SU MP), acá la **plataforma
(SynapTech) cobra al creador** con un access_token estático.

---

## 1 · Setup (una sola vez)

### Secreto

```bash
firebase functions:secrets:set MP_PLATFORM_ACCESS_TOKEN
# pega el Access Token de PRODUCCIÓN de la app MP de SynapTech
# (panel MP → tu app → Credenciales de producción → Access Token)
```

> ⚠️ NO es el Client Secret (ese es para OAuth marketplace). Es el
> Access Token que aparece junto a la Public Key.

### Deploy

```bash
firebase deploy --only \
  functions:mpBioPlatformCheckout,\
functions:mpBioPlatformWebhook,\
functions:mpBioPlatformVerify
firebase deploy --only firestore:rules
```

### Webhook en panel MP

```
URL:     https://us-central1-barberia-elegance.cloudfunctions.net/mpBioPlatformWebhook
Eventos: payment
```

(La preference ya pasa `notification_url` inline, pero registrarlo en
la app es respaldo si alguno se pierde.)

---

## 2 · Arquitectura

| Pieza | Detalle |
|---|---|
| Checkout | `mpBioPlatformCheckout` (callable) recibe `{ sku }`, valida idempotencia, crea preference con el token de plataforma. Devuelve `init_point`. |
| Webhook | `mpBioPlatformWebhook` (HTTP) consulta `/v1/payments/{id}`, verifica `approved`, resuelve `uid` via `metadata` o `collectionGroup('platform_orders')`, marca orden `paid` y aplica grants. |
| Verify | `mpBioPlatformVerify` (callable) — fallback si el webhook se atrasa: busca el pago por `external_reference` con `/v1/payments/search`. |
| Orden | `bio_users/{uid}/platform_orders/{orderId}` — read del dueño, write solo Admin SDK. |
| Grants | Se aplican a `bio_users/{uid}` y se espejan en `bios/{username}` para lectura pública. |

### Flujo

```
Editor → mpBioPlatformCheckout({ sku: 'removeWatermark' })
       → preference (token plataforma)
       → init_point → Checkout Pro
       → paga
       → mpBioPlatformWebhook valida
       → bio_users/{uid}.proRemoveWatermark = true
       → bios/{username}.proRemoveWatermark = true (espejo público)
       → editor redirige a ?platform_order={orderId}&status=ok
       → mpBioPlatformVerify confirma estado (UX)
       → u.html oculta el footer
```

---

## 3 · Catálogo

`SKUS` en `functions/payments-mp-platform.js`:

```js
removeWatermark: {
  id: 'removeWatermark',
  title: 'Quitar marca de agua — bioo',
  price: 4990,
  currency: 'CLP',
  grants: { proRemoveWatermark: true },
}
```

Para agregar más productos premium (custom domain, analytics avanzadas,
más bloques, etc.), basta con sumar entradas al catálogo y declarar
sus `grants`. El backend ya está genérico.

---

## 4 · Cambiar precio

Editar `SKUS.removeWatermark.price` y redeployar **solo** la checkout:

```bash
firebase deploy --only functions:mpBioPlatformCheckout
```

(El webhook y el verify no dependen del precio.) También actualizar el
precio mostrado en el editor (`bioo-editor/src/sections/...`).

---

## 5 · Seguridad

- El cliente NUNCA decide el precio: el catálogo es server-side. Si un
  cliente malicioso pasa `sku: 'removeWatermark'` con un body manipulado,
  el precio se lee del `SKUS` del servidor.
- `bio_users/{uid}/platform_orders/{orderId}.write = if false` —
  imposible para el cliente autotorgarse `status: 'paid'`.
- Idempotencia: si `proRemoveWatermark === true` ya, el checkout falla
  con `already-exists` antes de cobrar.
- Webhook valida `payment.status === 'approved'` antes de aplicar grants.
- `metadata.uid` se setea server-side en checkout — el cliente no puede
  comprar para otro uid.

---

## 6 · Reembolsos / revocar el feature

Hoy es manual: en Firestore, setear
`bio_users/{uid}.proRemoveWatermark = false` y
`bios/{username}.proRemoveWatermark = false`. El reembolso en MP se hace
desde el panel de Mercado Pago.

Si esto se vuelve frecuente, vale la pena agregar un endpoint
`mpBioPlatformRefund` que llame al refund de MP y revoque los grants.
