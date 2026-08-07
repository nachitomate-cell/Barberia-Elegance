# Comisiones — Massiel · SynapTech
**Vigente desde:** 2026-08-05 · **Versión:** v1.1 (2026-08-07: se suma el Plan Full)

---

## Tu esquema en 4 líneas

| Producto | Precio cliente | Tu bono al cierre | Tu recurring |
|---|---|---|---|
| 🟢 **Plan Básico** | $29.900/mes | **$25.000** | **$2.990/mes** durante 24 meses |
| 🟣 **Plan Pro** (IA WhatsApp + Wallet) | $49.900/mes | **$40.000** | **$7.485/mes** durante 24 meses |
| 🔵 **Plan Full** (IA en WhatsApp + Instagram + Reactivación) | $69.900/mes | **$55.000** | **$10.485/mes** durante 24 meses |
| 🔥 **Plan Anual Contado** | $399.000/año | **$100.000 al toque** | — |

**Sin fijo por trial.** Solo cobras cuando el cliente PAGA (activa un plan). Los trials creados no te generan comisión hasta que se conviertan.

**Un Full completo vale ~$306.000 para ti** ($55.000 + 24 meses de recurring) — 40% más que un Pro. Es el plan que más te conviene cerrar.

**Bonus Wallet ($5.000 por activación)**: solo aplica cuando la Wallet se vende como **add-on del Básico** (o wallet-only). En Pro, Full y Anual ya viene incluida en el plan, así que ahí no suma bonus.

---

## Cuánto ganas en cada escenario

### 🌱 Mes 1 · Aprendizaje (te mueves con Ignacio en las primeras cerradas)

| Cierres | Cálculo | Total mes 1 |
|---|---|---|
| 4 Básico + 6 Pro | 4×$25k + 6×$40k = $340k | **$340.000** |
| + 2 anuales adicionales | + 2×$100k = $200k | **$540.000** |

*Recurring aún = $0 (empieza mes 2).*

### 🚀 Mes 3 · Rutina establecida (recurring ya suma)

Asumiendo mismo ritmo (4 Básico + 6 Pro/mes) y retención 90%:

| Concepto | Cálculo | Monto |
|---|---|---|
| Cierres frescos del mes | 4×$25k + 6×$40k | $340.000 |
| Recurring 8 Básicos activos (mes 2) | 8×$2.990 | $23.920 |
| Recurring 12 Pros activos (mes 2) | 12×$7.485 | $89.820 |
| **Total mes 3** | | **$453.740** |

### 🏆 Mes 6 · Recurring pleno + anuales

| Concepto | Cálculo | Monto |
|---|---|---|
| Cierres frescos del mes | Igual arriba | $340.000 |
| Recurring 18 Básicos acumulados | 18×$2.990 | $53.820 |
| Recurring 27 Pros acumulados | 27×$7.485 | $202.095 |
| + 3 anuales el mes | 3×$100.000 | $300.000 |
| **Total mes 6** | | **$895.915** |

### 💎 Mes 12 · Cliente top

Con 12 meses de recurring acumulado + 3 anuales/mes:

| Concepto | Monto aprox |
|---|---|
| Cierres nuevos + anuales | $640.000 |
| Recurring acumulado (~40 Básicos + ~60 Pros) | $569.100 |
| **Total mes 12** | **~$1.209.100** |

---

## Total año 1 estimado (10 planes/mes + 2 anuales/mes)

| Componente | Cálculo | Total anual |
|---|---|---|
| Bonos mensuales | (4×$25k + 6×$40k) × 12 | $4.080.000 |
| Bonos anuales | 2×$100k × 12 | $2.400.000 |
| Recurring acumulado año 1 | ~50% del steady state | ~$1.500.000 |
| **TOTAL AÑO 1** | | **~$7.980.000** |

**A 24 meses** (con recurring pleno): ~$14-16 millones.

---

## La palanca del Plan Full (el cierre que más te paga al mes)

**Cuándo ofrecerlo:** mira el Instagram del local ANTES de entrar. Si tienen cuenta activa con DMs moviéndose, el pitch es una frase: *"¿Y quién contesta los mensajes de Instagram cuando estás cortando? El plan Full pone la misma IA a responder ahí también, y recupera a los clientes que dejaron de venir."*

- Instagram con el bot **solo existe en el Full** — no se puede armar por partes. Eso lo hace fácil de defender.
- Señales de candidato Full: local con +2.000 seguidores, responde DMs tarde o nunca, ya usa el ancla *"AgendaPro cobra $50.000 solo por su bot de WhatsApp"*.

---

## La palanca del Plan Anual (léelo bien)

Cerrar 1 anual = **$100.000 inmediatos** para ti + **$399.000 cash inmediato** para SynapTech.

**Cuándo ofrecerlo:**
- Al final del cierre de un plan mensual: *"Perfecto, te dejo el Básico mensual. ¿Sabías que si pagas anual te ahorras 3 meses completos?"*
- A clientes que ya tenían Weibook/AgendaPro (están acostumbrados a pagar planes largos).
- A clientes con local establecido (no arrancando) — tienen flujo estable.

**Conversión típica**: 15-20% de los cierres mensuales acepta anual si se ofrece bien. Con 10 cierres mensuales, eso son 1-2 anuales extra/mes = $100-200k más para ti.

---

## Reglas anti-fraude (para que no haya sorpresas)

Un cierre es **válido** y paga comisión SOLO si:

1. ✅ El pago con Mercado Pago se **procesó y aprobó**.
2. ✅ El cliente **NO reembolsa dentro de 30 días** (si lo hace, clawback del bono).
3. ✅ El tenant sigue **activo al día 60** (retención mínima). Si cancela antes: clawback 50% del bono.
4. ✅ El email del dueño es **único** — no se puede crear el mismo cliente 2 veces.
5. ✅ El tenant edita **al menos 1 servicio real** en el panel (prueba de uso).

El **recurring** se detiene automáticamente si el cliente:
- Cancela su suscripción MP
- Pausa el plan
- No renueva un plan anual

---

## Cómo se te paga

1. **Corte mensual día 30**: script `ver-comisiones-massiel.js` calcula todo por ref.
2. **Reporte por WhatsApp día 1** del mes siguiente con desglose.
3. **Transferencia hasta el día 5** del mes.
4. **Boleta de honorarios** por el total mensual.

---

## Meta oficial (contra la que se mide tu desempeño)

**Cuota mensual: 10 planes cerrados** (4 Básico + 6 Pro/Full — un Full cuenta como Pro para la meta) + Plan Anual opcional pero altamente premiado.

**Si superas cuota** durante 3 meses seguidos → conversamos condiciones especiales (bono adicional, expansión geográfica, subir tarifa).

---

**Cualquier duda sobre las comisiones, escríbeme directo. Este documento reemplaza cualquier conversación previa sobre montos.**
