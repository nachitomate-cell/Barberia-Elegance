# Estructura de comisiones — Massiel (propuesta)

**Autor:** propuesta desde el kit de venta 2026-08-05.
**Estado:** BORRADOR — Ignacio ajusta y valida con Massiel.
**Filosofía:** motivar cantidad (fijo por trial) + calidad (bonus por plan activado) + retención (recurring hasta mes 6). Sin retención el modelo se corrompe: la vendedora sale, cobra su bonus y el cliente se va al mes 2.

---

## Modelo propuesto

### 🎯 Componente 1 — Fijo por trial válido: **$3.000 CLP**

Cada tenant que se crea desde `?ref=massiel` y cumple los criterios de trial válido (ver abajo).

**Por qué:** motivar volumen de puertas tocadas. Massiel cobra algo aunque el trial no termine en pago — reconoce el esfuerzo comercial. $3.000 × 5 trials/sem = $60.000 base al mes.

### 🚀 Componente 2 — Bonus por plan activado (primer mes cobrado)

| Plan activado | Bonus one-time |
|---|---|
| Individual ($29.900) | **$15.000** |
| Local ($49.900) | **$25.000** |

**Por qué:** la conversión trial→plan es donde está la plata real. El bonus representa ~50% del primer mes cobrado (industry standard SaaS 50-100% de la primera mensualidad). Se paga cuando el pago del primer mes efectivamente ingresa.

### 🔁 Componente 3 — Recurring por retención (meses 2 a 6)

**15% del pago mensual** de cada tenant activo, durante los meses 2 al 6 desde su alta.

| Plan | Recurring mensual |
|---|---|
| Individual | $4.485 (15% de $29.900) |
| Local | $7.485 (15% de $49.900) |

**Por qué:** un cliente que se va al mes 3 es un mal cliente y no debería producir comisión completa. Con recurring, a Massiel le conviene traer clientes que se queden — hará seguimiento post-venta sola. Cortamos al mes 6 para no cargar el margen a perpetuidad.

---

## Reglas anti-fraude (importantes)

Un "trial válido" DEBE cumplir TODOS:

1. **Email único:** el email del dueño no puede coincidir con otro tenant creado en los últimos 30 días.
2. **WhatsApp verificable:** el número de contacto debe ser respondible por WhatsApp (no números inventados).
3. **Al menos 1 servicio editado:** el dueño (o Massiel con él) debe editar al menos 1 servicio de la plantilla (nombre, precio o duración) → prueba de que el tenant se usó, no solo se creó.
4. **Sobrevive 72 horas:** el tenant sigue activo (`status: 'trial'`) 3 días después de creado. Esto filtra los "creo y borro" o los que se arrepienten al minuto.
5. **No es un email @sinaptech / @synaptechspa / @sinaptech.cl** (autotest interno).
6. **La cuenta del dueño no tiene rol admin en otro tenant** (Massiel no puede crear "para probar" con emails que ya son dueños).

**Los trials que no cumplen se marcan `_billing.comisionValida: false` y no cuentan para el fijo NI para el bonus.**

---

## Escenarios ejemplo

### Escenario CONSERVADOR (semana 1-2 de aprendizaje)

- 5 trials válidos/semana × 4 semanas = **20 trials/mes**
- Conversión trial → plan pagado: **30%** = 6 planes (mix 4 Individual + 2 Local)

**Ingresos Massiel mes 1:**
- Fijo: 20 × $3.000 = **$60.000**
- Bonus planes: 4 × $15.000 + 2 × $25.000 = **$110.000**
- Recurring mes 1: **$0** (arranca mes 2)
- **Total mes 1: $170.000**

### Escenario BUENO (rutina establecida)

- 10 trials/sem × 4 = **40 trials/mes**
- Conversión **35%** = 14 planes (10 Individual + 4 Local)

**Ingresos Massiel mes 3 (con recurring acumulado meses 1-2):**
- Fijo: 40 × $3.000 = **$120.000**
- Bonus: 10 × $15.000 + 4 × $25.000 = **$250.000**
- Recurring de meses previos: ~20 tenants activos × prom $5.000 = **$100.000**
- **Total mes 3: ~$470.000**

### Escenario GRAN LOTE (Providencia + Ñuñoa + Las Condes)

- 15 trials/sem × 4 = **60 trials/mes**
- Conversión **40%** = 24 planes/mes

**Ingresos Massiel mes 6 (recurring pleno):**
- Fijo: 60 × $3.000 = **$180.000**
- Bonus: 20 × $15.000 + 4 × $25.000 = **$400.000**
- Recurring acumulado (meses 1-5 aún vigente): ~80 tenants × $5.500 prom = **$440.000**
- **Total mes 6: ~$1.020.000**

---

## Costos para SynapTech

| Escenario | Massiel mes | % del MRR captado |
|---|---|---|
| Conservador | $170.000 | ~55% del primer mes; ~15% del LTV a 6m |
| Bueno | $470.000 | ~50% del primer mes; ~13% del LTV a 6m |
| Gran lote | $1.020.000 | ~48% del primer mes; ~11% del LTV a 6m |

**Regla de oro SaaS:** CAC (costo de adquisición) debe ser recuperado en < 12 meses. Con este esquema, Massiel cobra 100% de la comisión en 6 meses; SynapTech recupera desde el mes 7 en adelante en margen 100%.

---

## Cómo se paga (mecánica)

1. **Corte mensual el día 30**: script SQL/Firestore que suma:
   - Trials válidos creados en el mes (fijo)
   - Bonus por planes activados ese mes
   - Recurring por tenants aún activos (meses 2-6 desde su alta)
2. **Reporte automático** vía WhatsApp a Massiel el día 1 del mes siguiente: total a cobrar + desglose.
3. **Transferencia** hasta el día 5.
4. **Boleta de honorarios** (Massiel es freelance/comisionista) por el total.

---

## Reglas de "pause" y "clawback"

- Si un cliente pide reembolso del primer mes → **clawback del bonus** correspondiente.
- Si un cliente cancela antes de 60 días → **clawback del 50% del bonus** (retención mínima esperada).
- Si Massiel detiene la actividad por >30 días sin previo aviso → recurring congelado hasta reanudar.

---

## Discusión abierta con Massiel (antes de firmar)

- ¿Prefiere fijo mensual base + comisión menor? (ej. $150.000 base + 30% del primer mes). Da estabilidad pero menos upside.
- ¿Quiere trabajar solo Providencia o expandir? (define su cuota).
- ¿Qué necesita como herramienta extra? (auto atribución vía QR ya está; falta un dashboard donde ella vea sus tenants + estado + comisión pendiente en tiempo real).

**Sugerencia final:** partir con el modelo de arriba por 30 días como piloto, luego ajustar según data real. NO firmar contrato a 6 meses sin la data del primer mes.
