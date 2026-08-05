# Auditoría · Rename Básico/Pro + Plan Anual + Recurring 24m
**Fecha:** 2026-08-05 · **Autor:** implementación tras decisiones comerciales de Ignacio
**Commit:** ver `git log --oneline -1` después del push a main

---

## Contexto de las 3 decisiones

| Decisión | Racional comercial | Costo |
|---|---|---|
| Rename **Individual→Básico** y **Local→Pro** en todo el producto | Nomenclatura de mercado (Basic/Pro), más aspiracional, permite hooks "IA + Wallet" | 3-4h de copy |
| Plan **Anual $399.000** construido ahora | 1 cierre anual = $399k cash inmediato + $100k comisión Massiel = incentivo enorme para arrancar fuerte | 1 día de dev |
| **Recurring 24 meses** fijos (no indefinido) | Sweet spot: Pro × 24m = $179.640 recurring total = muy motivador; después el cliente queda para SynapTech sin costo variable | Cero costo, solo lógica de reporte |

---

## ✅ Checklist de cambios (por archivo)

### Frontend · TrialGate.jsx (panel del dueño)
- [ ] Verificar en producción que se ven **3 cards**: Básico / Pro / Anual
- [ ] Card Pro tiene badge verde **"IA + Wallet"** (antes "Recomendado")
- [ ] Card Anual tiene badge amarillo **"🔥 Ahorras 3 meses"**
- [ ] Botón Anual dice **"Pagar año completo"** en amarillo
- [ ] Card Anual tiene copy "Un solo pago de $399.000. Sin renovación automática."
- [ ] Grid muestra 3 columnas en desktop (`lg:grid-cols-3`), 2 en tablet, 1 en móvil
- **Archivo:** `admin-panel/src/components/TrialGate.jsx`
- **URL para probar:** cualquier `{slug}.synaptechspa.cl/gestion-interna/` con trial vencido
- **Cómo forzar trial vencido para probar:** setear en Firestore `tenants/{slug}.trialFinaliza` a una fecha pasada

### Frontend · crea.html (landing público)
- [ ] Sección "Después de la prueba" muestra **3 planes** (Básico / Pro / Anual)
- [ ] Card Pro tiene tag **"IA + Wallet"** (antes "Más elegido")
- [ ] Card Anual tiene tag amarillo **"🔥 Ahorra 3 meses"**
- [ ] Bullets del Pro mencionan **"Bot de WhatsApp con IA 24/7"** y **"Google & Apple Wallet"**
- [ ] Bullets del Anual mencionan **"Equivale a 9 meses de Pro (ahorras 3)"**
- [ ] FAQ menciona los 3 planes con sus precios reales
- **Archivo:** `crea.html`
- **URL para probar:** https://crea.synaptechspa.cl/?ref=massiel → scroll a "Después de la prueba"

### Backend · mensualidad-mp.js (pagos MP)
- [ ] `PRECIOS_SELF_SERVICE_NETO` incluye `basico`, `pro`, `anual` + aliases legacy
- [ ] `mpMensualidadCrearLink` bifurca: si `plan='anual'` → Checkout Pro (pago único); si no → Preapproval (recurrente)
- [ ] Al crear el link anual, `_billing/{tid}.pagoAnualMp.status = 'link_creado'`
- [ ] Webhook `mpMensualidadWebhook` maneja tipo `payment` con `external_reference` que empieza con `"anual:"` → llama `procesarPagoAnual`
- [ ] `procesarPagoAnual` marca `_billing.estadoPago='al_dia' + plan='anual' + fechaVencimientoAnual=+365d` idempotente
- [ ] Comprobante por email al aprobar (Brevo)
- **Archivo:** `functions/mensualidad-mp.js`

### Backend · self-service-payment-hook.js (activación automática)
- [ ] Email de bienvenida usa `planLabel` con Básico/Pro/Anual (no Individual/Local)
- [ ] Push admin dice "activó Básico/Pro/Anual" (no Individual/Local)
- **Archivo:** `functions/self-service-payment-hook.js`
- **Nota:** el trigger `onDocumentUpdated('_billing/{tid}')` ya funciona tanto con recurring como con anual porque ambos pasan por `estadoPago='al_dia'`.

### Backend · admin-listar-tenants.js (superadmin)
- [ ] `PRECIOS_NETOS` incluye los 3 planes + aliases legacy
- [ ] `adminActivarPlanTenant` acepta `basico|pro|anual` (rechaza otros)
- [ ] Cuando `plan='anual'`, seteo también `planTipo='anual'` + `fechaVencimientoAnual=+365d`
- **Archivo:** `functions/admin-listar-tenants.js`

### Frontend · admin/index.html (panel superadmin)
- [ ] Botón activar plan pregunta por `"basico"`, `"pro"` o `"anual"` (no `individual/local`)
- [ ] Acepta aliases legacy `individual→basico`, `local→pro`
- **Archivo:** `admin/index.html`
- **URL para probar:** `/admin` → botón morado "Tenants nuevos" → botón ⚡ en cualquier tenant en trial

### Script · ver-comisiones-massiel.js
- [ ] Bonos actualizados: **$25k Básico, $40k Pro, $100k Anual**
- [ ] Recurring: **$2.990/mes Básico, $7.485/mes Pro, $0 Anual**
- [ ] Cap 24 meses de recurring (después el cliente sigue sin generar comisión)
- [ ] Header del script incluye las **reglas de pago** documentadas inline
- [ ] Muestra desglose por plan (Básico / Pro / Anual) en el resumen
- **Archivo:** `scripts/ver-comisiones-massiel.js`
- **Uso:** `node scripts/ver-comisiones-massiel.js massiel`

---

## 📋 Cómo se paga (para dejar guardado)

- **Corte los días 30 de cada mes**
- **Reporte por WhatsApp el día 1 siguiente** con desglose
- **Transferencia hasta el día 5**
- **Boleta de honorarios** por el total

## ⚠️ Reglas anti-fraude (pa' que no haya sorpresas)

- El pago del cliente tiene que estar aprobado por Mercado Pago
- Si el cliente pide devolución en 30 días = clawback del bono
- Si cancela antes de 60 días = clawback 50% del bono
- El tenant tiene que editar al menos 1 servicio real (prueba de uso)

**Todo lo demás es limpio. Cada peso que aparezca en el reporte es del vendedor.**

---

## 🧪 Verificación E2E sugerida (opcional pero recomendada)

1. Ir a `https://crea.synaptechspa.cl/?ref=testauditoria` → crear tenant demo
2. Ver que el email de alerta (Brevo) menciona "trial 14d"
3. En el panel del tenant, forzar en Firestore `trialFinaliza` a hace 1 día → `TrialGate` se activa
4. Confirmar que aparecen **3 cards** (Básico/Pro/Anual) con precios y badges correctos
5. Click en "Pagar año completo" → debería crear una **preferencia MP Checkout Pro** (no Preapproval)
6. Ver que `_billing/{tid}.pagoAnualMp.status = 'link_creado'` en Firestore
7. Sin llegar a pagar, verificar `/admin` → "Tenants nuevos" → botón ⚡ → prompt acepta `anual`
8. Borrar el tenant demo con `firebase firestore:delete tenants/testauditoria --recursive --force`

## 🚨 Riesgos identificados

- **Tenants existentes con plan='local' o plan='individual'** siguen funcionando (los aliases están cubiertos), pero deberías considerar migrarlos manualmente a `basico`/`pro` para consistencia. Script sugerido en el próximo commit.
- **Renovación del plan anual al vencer los 365 días**: HOY no hay recordatorio automático. Al mes 11 debería llegar email + WhatsApp al dueño. **Pendiente para próxima ronda** — ver TODO en `mensualidad-mp.js`.
- **Webhook MP debe estar apuntando a `mpMensualidadWebhook`** en el panel de MP (app bioo12). Ya está configurado según documentación existente en el archivo.

---

## Commits relacionados (llenar después del push)

- `<HASH>`: rename Individual/Local → Básico/Pro
- `<HASH>`: Plan Anual + Checkout Pro + procesarPagoAnual webhook
- `<HASH>`: recurring 24m tope + reglas de pago documentadas
