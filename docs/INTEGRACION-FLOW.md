# Integración de pago Flow (yūgen)

Cobro **previo** a la reserva en el sitio público. El cliente paga con tarjeta o
transferencia antes de que se cree la cita; la cita se crea recién cuando Flow
confirma el pago. El barbero, que agenda desde el panel, queda **exento** (no
pasa por el flujo público).

## Arquitectura

```
Cliente (index.html / barbero.html, tenant yugen)
   │  confirma reserva
   ▼
flowCrearPago (HTTP)  ── crea pago en Flow ──►  redirige al checkout de Flow
   │                                                  │  cliente paga
   │  guarda pago_pendiente                           ▼
   │                                            ┌──────────────┐
   ▼                                            │  Flow.cl     │
tenants/yugen/pagos_pendientes/{order}          └──────┬───────┘
                                                        │  pagado
              webhook server-to-server  ◄───────────────┤
                     flowConfirmacion ── crea la cita en tenants/yugen/citas
                                          │
                                          ├─► email de confirmación (existente)
                                          ├─► push al barbero (existente)
                                          └─► push al cliente (existente)

              navegador del cliente vuelve ──► flowRetorno (página de resultado)
```

La cita se crea con `estado: 'Confirmada'` y un objeto `pago` con el `flowOrder`
y el monto. Al crearse dispara los triggers `onDocumentCreated` ya existentes
(email + push), sin código nuevo.

## Funciones (functions/flow-pago.js)

| Función | Tipo | Rol |
|---|---|---|
| `flowCrearPago` | HTTP POST | El sitio público pide crear el pago. Recalcula el monto server-side. Devuelve la URL de checkout. |
| `flowConfirmacion` | HTTP POST | Webhook de Flow (`urlConfirmation`). Verifica el pago y crea la cita (idempotente). |
| `flowRetorno` | HTTP | Adonde vuelve el navegador (`urlReturn`). Muestra página de resultado estilo Yūgen. |
| `flowReembolsar` | callable | Admin: reembolso del 50% (cancelación con +12 h). |

## Setup (una sola vez)

### 1. Cargar las credenciales como secretos
```bash
firebase functions:secrets:set FLOW_API_KEY
#   pega:  44E4F29E-CB4E-4AD8-8C9A-7C970A8LA682
firebase functions:secrets:set FLOW_SECRET_KEY
#   pega:  4cec1bfda4c08d4de88c21d05d44be6b2b2ca877
```
> Las llaves NO van en el código ni en git. Viven solo como secretos del servidor.

### 2. Desplegar las funciones
```bash
firebase deploy --only functions:flowCrearPago,functions:flowConfirmacion,functions:flowRetorno,functions:flowReembolsar
```
> `firebase deploy` hace públicas (invoker `allUsers`) las funciones HTTP, igual
> que `instagramOAuthCallback`. No hay que configurar `urlConfirmation` ni
> `urlReturn` en el panel de Flow: se envían en cada pago.

### 3. Publicar el sitio
`index.html` y `barbero.html` ya redirigen a Flow para el tenant `yugen`
(arreglo en este commit). Commit + push normal.

## Cómo agregar otro tenant
1. En `functions/flow-pago.js`: agregar el tenant a `PAGO_TENANTS` (con `sitio`).
2. En `index.html` y `barbero.html`: agregar el id del tenant al array
   `_PAGO_TENANTS`.
3. Redesplegar funciones + publicar sitio.

## Prueba segura
Como las llaves son de **producción**, probar con un servicio de **monto bajo**:
1. Reservar en `yugenstudio.synaptechspa.cl` como cliente.
2. Pagar el monto real (chico) → debe volver a la página "Reserva confirmada".
3. Verificar que la cita aparezca en la agenda y que llegue el email/push.
4. Para devolver: usar `flowReembolsar` (reembolsa el 50%).

## Notas
- El monto se **recalcula server-side** (`calcularMonto`): cobra al menos
  `precio del servicio + recargo por horario`, evitando manipulación a la baja.
- `pagos_pendientes` guarda las reservas no pagadas (se pueden limpiar luego).
- Hay una ventana corta en que el slot no queda bloqueado hasta que se paga
  (la cita se crea al confirmar el pago). Riesgo bajo con el volumen actual.
- **Pendiente (fase 2):** reembolso automático del 50% al cancelar con +12 h
  (hoy es manual vía `flowReembolsar`).
