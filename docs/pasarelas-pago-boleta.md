# Pasarelas de pago + boleta electrónica (Chile)

> Investigación para implementar: **agenda en la app → paga el total al tiro → se emite boleta automática**, todo sobre la plataforma propia (marca del local), sin trabajo manual.
> Fecha: 2026-06-17

## ✅ Recomendación: Flow (ya integrado)

Flow cubre **pago (tarjeta + transferencia) + boleta automática** en un solo proveedor, **ya está conectado** en el sistema, y su comisión es **igual o mejor** que Mercado Pago. No hace falta integrar una pasarela nueva.

---

## 1. Comparación de las 4 opciones

| | Tarjeta créd./déb. | Transferencia | Cuotas | Boleta automática | ¿Integrar algo? |
|---|---|---|---|---|---|
| **Flow** ⭐ | ✅ (Webpay) | ✅ (Khipu/ETpay) | ✅ | ✅ Incluida (voucher = boleta) | **No, ya está** |
| Mercado Pago | ✅ | ✅ | ✅ | ✅ Incluida (voucher = boleta) | Sí, de cero |
| TUU | ✅ | ❌ | ✅ | ❌ Separada (OpenFactura) | Sí, 2 integraciones |
| Khipu | ❌ | ✅ | ❌ | ❌ Separada (OpenFactura) | Sí, 2 integraciones |

---

## 2. Comisiones (datos oficiales)

### Flow — débito, crédito y prepago · costo fijo $0 CLP
| Disponibilidad del dinero | Comisión |
|---|---|
| Abono al **3er día hábil** | **2,89% + IVA** |
| Abono al **día hábil siguiente** | **3,19% + IVA** |

**Cuotas sin interés** (adicional sobre la tarifa de abono Flow, vía Webpay):
- 2 y 3 cuotas: +1,99% + IVA
- 4 a 6 cuotas: +3,49% + IVA
- 7 a 12 cuotas: +6,99% + IVA
- El cliente pagador elige la cantidad de cuotas.

Medios: Flow Pay, Webpay, Cargo Automático, Mastercard, Visa, American Express.

### Mercado Pago — todos los medios
| Disponibilidad | Comisión estándar | Comisión "Nuevos"* |
|---|---|---|
| **Al instante** | 3,19% + IVA | 2,59% + IVA |
| **En 10 días** | 2,89% + IVA | 2,29% + IVA |

\* Tarifa promocional para cuentas nuevas (temporal).

### TUU / Khipu
Sin tarifa oficial confirmada. Referencia estimada: Khipu ~1% + IVA (la más barata, pero solo transferencia y sin boleta); TUU ~similar a tarjeta estándar. **Por confirmar.**

---

## 3. Costo sobre $15.000 (IVA incluido)

| Opción | Comisión | Te queda |
|---|---|---|
| Flow / MP — 3er día / 10 días (2,89% + IVA) | ~$516 | **~$14.484** |
| Flow / MP — al tiro / día siguiente (3,19% + IVA) | ~$569 | **~$14.431** |
| MP Nuevos — al instante (2,59% + IVA) | ~$462 | ~$14.538 |
| MP Nuevos — en 10 días (2,29% + IVA) | ~$409 | ~$14.591 |

Flow y Mercado Pago tienen tarifa **prácticamente idéntica**. MP solo gana con la promo "Nuevos" temporal. Flow tiene **costo fijo $0** y ya está integrado → desempata Flow.

---

## 4. Cómo funciona la boleta (Flow y Mercado Pago)

Por el modelo del SII **"Tu voucher es tu boleta"**:
- El **comprobante de pago vale como boleta**.
- La pasarela **envía la info al SII automáticamente** (Flow: a diario) → entra al registro de compra/venta (RCV) del contribuyente.
- **No se necesita** emisor aparte (OpenFactura) ni, en este modelo, certificado digital.
- **TUU y Khipu NO** tienen esto → obligan a integrar OpenFactura por separado.

Caveat: el comprobante "voucher = boleta" es un comprobante simplificado, no una boleta detallada con líneas de servicio. Para una barbería (servicio, monto fijo) normalmente alcanza. Si se requiere boleta con detalle/glosa, conviene OpenFactura.

---

## 5. Flujo técnico (igual para Flow / MP)

```
Cliente agenda en la app (marca propia)
  → paga (tarjeta o transferencia) — sin máquina POS física
  → webhook POST confirma el pago   ← fuente de verdad (no confiar en redirección GET)
  → boleta queda registrada en el SII (modelo voucher = boleta)
Todo automático.
```

- Multi-tenant: credenciales (API key Flow/MP) **por cada local/tenant**.
- La emisión/registro de boleta se dispara **cuando el webhook POST confirma el pago**, nunca antes (evita boletas de pagos fallidos).

### APIs disponibles (referencia)
- **Flow**: REST API + webhooks (POST). developers.flow.cl. Ya integrado.
- **Mercado Pago**: Checkout API (pago en el mismo sitio, sin redirección) + webhooks.
- **TUU**: payment intent (checkout online sin POS) + webhook; boleta vía TUU Facturación / OpenFactura aparte. "Pago Remoto" requiere POS físico (no aplica). developers.tuu.cl.
- **OpenFactura (Haulmer)**: REST API para emitir DTE/boleta, ambiente de pruebas gratis. docsapi-openfactura.haulmer.com.

---

## 6. Requisitos del comercio (lo pone el local, no es programable)

1. **Inicio de actividades** en el SII.
2. Configurar en Flow → sección **"Datos fiscales"** que el comprobante de Flow sea su boleta.
3. Confirmar que el modelo voucher = boleta aplica a su rubro (barbería = servicio, normalmente sí).

Con TUU/Khipu además se necesitaría: cuenta OpenFactura (API key) + certificado digital.

---

## 7. Estado actual / pendientes

- [x] **Flow ya integrado** → pago resuelto.
- [x] Boleta resuelta por el modelo del SII (solo configurar "Datos fiscales" en la cuenta del local).
- [ ] Verificar en el código que el **webhook de Flow** esté enganchado a la confirmación de agenda/pago.
- [ ] Activar/probar el modelo de boleta en la cuenta del local.

---

## Fuentes
- [Flow — Ayuda / FAQ](https://web.flow.cl/es-cl/ayuda/) · [Flow Developers](https://developers.flow.cl)
- [SII — Tu Voucher es tu Boleta](https://www.sii.cl/destacados/boleta_electronica_voucher/index.html)
- [SII — Administrador/Operador de Medios de Pago Electrónicos (ticket por boleta)](https://www.sii.cl/destacados/ticketporboleta/administrador.html)
- [Mercado Pago — Checkout API](https://www.mercadopago.cl/developers/es/docs/checkout-api-payments/overview)
- [TUU Developers — Getting Started](https://developers.tuu.cl/docs/getting-started) · [TUU — Pago online (payment intent)](https://developers.tuu.cl/docs/payment-intent)
- [OpenFactura — API Docs](https://docsapi-openfactura.haulmer.com/)