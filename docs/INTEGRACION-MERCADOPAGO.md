# Integración de pago Mercado Pago (yūgen)

Cobro **previo** a la reserva en el sitio público, con **Checkout Pro**. El cliente
paga con tarjeta de crédito/débito (o transferencia) antes de que se cree la cita;
la cita se crea recién cuando Mercado Pago confirma el pago. El barbero, que
agenda desde el panel, queda **exento** (no pasa por el flujo público).

> Reemplazó a Flow como **única pasarela**. El módulo `functions/flow-pago.js`
> queda en el repo para referencia/rollback, pero ya no se exporta ni se llama.

## Boleta (modelo SII "el voucher es tu boleta")

Mercado Pago reporta la venta al SII a diario y su comprobante vale como boleta.
Para que funcione, el comercio debe (gestión del local, no programable):
1. Tener **inicio de actividades** en el SII.
2. Declarar el modelo de emisión = el comprobante de MP es su boleta.

Sin inicio de actividades, el comprobante **no** cuenta como boleta tributaria.

## Arquitectura

```
Cliente (index.html / barbero.html, tenant yugen)
   │  confirma reserva
   ▼
mpCrearPago (HTTP)  ── crea preference en MP ──►  redirige al checkout de MP
   │                                                  │  cliente paga
   │  guarda pago_pendiente                           ▼
   │                                            ┌──────────────┐
   ▼                                            │ Mercado Pago │
tenants/yugen/pagos_pendientes/{order}          └──────┬───────┘
                                                        │  approved
              webhook server-to-server  ◄───────────────┤
                     mpWebhook ── consulta el pago real y crea la cita
                                          │   en tenants/yugen/citas
                                          ├─► email de confirmación (existente)
                                          ├─► push al barbero (existente)
                                          └─► push al cliente (existente)

              navegador del cliente vuelve ──► mpRetorno (página de resultado)
```

La cita se crea con `estado: 'Confirmada'` y un objeto `pago` con el `mpPaymentId`
y el monto. Al crearse dispara los triggers `onDocumentCreated` ya existentes
(email + push), sin código nuevo.

`external_reference` = el `commerceOrder` (`{tenantId}-{ts}-{rand}`); de ahí se
deduce el tenant tanto en el webhook como en el retorno.

## Seguridad

Nunca se confía en el cuerpo de la notificación. El webhook recibe solo el **id
del pago** y consulta el pago real en la API de MP con nuestro Access Token
(fuente de verdad). Aunque alguien falsifique una notificación, el estado real
lo decide MP. Por eso no se requiere validar firma del webhook.

## Funciones (functions/mercadopago-pago.js)

| Función | Tipo | Rol |
|---|---|---|
| `mpCrearPago` | HTTP POST | El sitio público pide crear el pago. Recalcula el monto server-side. Crea la preference y devuelve `init_point`. |
| `mpWebhook` | HTTP POST | Webhook de MP (`notification_url`). Consulta el pago y crea la cita (idempotente). |
| `mpRetorno` | HTTP | Adonde vuelve el navegador (`back_urls`). Muestra página de resultado estilo Yūgen + confirma como respaldo. |
| `mpReembolsar` | callable | Admin: reembolso parcial del 50% (cancelación con +12 h). |

## Setup (una sola vez)

### 1. Cargar el Access Token de PRODUCCIÓN como secreto
```bash
firebase functions:secrets:set MP_ACCESS_TOKEN
#   pega el Access Token (APP_USR-...) de la cuenta empresa del local
```
El Access Token se obtiene en Mercado Pago → **Tus integraciones** → crear una
aplicación → **Credenciales de producción**.
> NO va en el código ni en git. Vive solo como secreto del servidor.

### 2. Desplegar las funciones
```bash
firebase deploy --only functions:mpCrearPago,functions:mpWebhook,functions:mpRetorno,functions:mpReembolsar
```
> `firebase deploy` hace públicas (invoker `allUsers`) las funciones HTTP. No hay
> que configurar `notification_url` ni `back_urls` en el panel de MP: se envían en
> cada preference.
> Al desplegar, Firebase preguntará por eliminar las funciones `flow*` (ya no se
> exportan). Confirmar para dejar MP como única pasarela.

### 3. Publicar el sitio
`index.html` y `barbero.html` ya apuntan a `mpCrearPago` para el tenant `yugen`.
Commit + push normal.

## Cómo agregar otro tenant
1. En `functions/mercadopago-pago.js`: agregar el tenant a `PAGO_TENANTS` (con `sitio`).
2. En `index.html` y `barbero.html`: agregar el id del tenant al array `_PAGO_TENANTS`.
3. Redesplegar funciones + publicar sitio.
> Hoy hay **un solo** `MP_ACCESS_TOKEN`. Para varios locales con cuentas MP
> distintas, mover el token a Firestore por tenant (p. ej. `tenants/{tid}/settings/pago`)
> y leerlo en `mpCrearPago`/`mpWebhook` en vez del secreto único.

## Prueba segura
Como el token es de **producción**, probar con un servicio de **monto bajo**:
1. Reservar en `yugenstudio.synaptechspa.cl` como cliente.
2. Pagar el monto real (chico) → debe volver a la página "Reserva confirmada".
3. Verificar que la cita aparezca en la agenda y que llegue el email/push.
4. Para devolver: usar `mpReembolsar` (reembolsa el 50%).
> Alternativa: usar credenciales de **test** + tarjetas de prueba de MP antes de
> ir a producción.

## Notas
- El monto se **recalcula server-side** (`calcularMonto`): cobra al menos
  `precio del servicio + recargo por horario`, evitando manipulación a la baja.
- `binary_mode: true` → el pago se aprueba o se rechaza, sin estado "pendiente".
- `pagos_pendientes` guarda las reservas no pagadas (se pueden limpiar luego).
- Hay una ventana corta en que el slot no queda bloqueado hasta que se paga
  (la cita se crea al confirmar el pago). Riesgo bajo con el volumen actual.
- Reembolso 50% al cancelar con +12 h: hoy es manual vía `mpReembolsar`.
