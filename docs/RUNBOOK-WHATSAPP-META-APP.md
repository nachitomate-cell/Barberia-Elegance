# Runbook — Crear la app de Meta para Avisos WhatsApp

> Objetivo: dejar operativo el **aviso gratis al dueño** (confirmaciones de reserva al
> barbero/local por WhatsApp). Todo el código y las 4 Cloud Functions ya están
> desplegadas; solo falta la infra de Meta y enganchar 2 credenciales.
>
> Referencia de código: [`functions/whatsapp-notif.js`](../functions/whatsapp-notif.js).

## Valores YA fijos de este proyecto (no inventar)

| Dato | Valor |
|---|---|
| Proyecto Firebase | `barberia-elegance` |
| **Webhook URL** (Callback URL en Meta) | `https://us-central1-barberia-elegance.cloudfunctions.net/whatsappWebhook` |
| **Verify token** (ya seteado, REAL) | `synaptech-wa-dca5b28fac457095c3b6ba90443ea23b` |
| Campo del webhook a suscribir | `messages` |
| Graph API version usada por el código | `v23.0` |

Lo que **falta sacar de Meta** y meter como secrets:
- `WHATSAPP_TOKEN` → token de acceso **permanente** (System User).
- `WHATSAPP_PHONE_ID` → **Phone number ID** del número (NO el número en sí).

---

## PRERREQUISITO CRÍTICO — el número

El número que uses para enviar los avisos **debe estar libre de WhatsApp**:
- **No puede** estar registrado en la app normal de WhatsApp ni en WhatsApp Business.
  Si lo está, primero hay que **eliminar esa cuenta** de WhatsApp (Ajustes → Cuenta →
  Eliminar mi cuenta) y esperar. Ideal: una línea/eSIM nueva y dedicada.
- Debe poder **recibir un SMS o una llamada** para el código de verificación de Meta.
- Es un número **de salida** (desde ahí salen los avisos). Los dueños de cada local
  le escriben a ESE número para activarse.

Si el número que tienes ya está en WhatsApp, resuélvelo antes de seguir.

---

## PARTE A — Crear la app en Meta (navegador, tu cuenta)

1. Entra a **https://developers.facebook.com/** con tu cuenta de Facebook/Meta
   (la ligada a tu Business Manager de SynapTech).
2. **My Apps → Create App**.
   - Caso de uso / tipo: elige **Other → Business**.
   - Nombre de la app: `SynapTech Agenda WhatsApp` (o el que quieras).
   - Vincúlala a tu **Meta Business Account** (Business Portfolio). Si no tienes uno,
     créalo aquí mismo.
3. En el panel de la app: **Add Product → WhatsApp → Set up**.
   - Se te creará automáticamente una **WhatsApp Business Account (WABA)** y un
     **número de prueba** gratuito de Meta.

### A.1 — (Opcional pero recomendado) Validar primero con el número de PRUEBA
El número de prueba de Meta sirve para probar TODO el pipeline hoy mismo (máx. 5
destinatarios que tú registres a mano). Si quieres validar antes de tramitar el número
real, usa su **Phone number ID** y el **token temporal** de esta misma pantalla como
secrets (ver Parte B), agrega tu celular como destinatario de prueba, y comprueba que
llega el aviso. Luego repites con el número real.

### A.2 — Registrar tu número REAL
1. En **WhatsApp → API Setup** (o **Phone numbers**) → **Add phone number**.
2. Ingresa el número dedicado, elige verificación por **SMS** o **llamada**, mete el
   código. El número queda registrado en tu WABA.
3. Copia su **Phone number ID** (es un número largo tipo `123456789012345`).
   ⚠️ Esto es el `WHATSAPP_PHONE_ID`, **no** es el número telefónico.

### A.3 — Token PERMANENTE (System User) — no uses el temporal en producción
El token que aparece por defecto en "API Setup" **expira en 24 h**. Para producción
crea un token permanente:
1. **Business Settings** (business.facebook.com/settings) → **Users → System users**.
2. **Add** → nombre `synaptech-agenda-sys` → rol **Admin**.
3. En ese system user: **Add Assets** → asigna la **app** y la **WhatsApp Account (WABA)**
   con control total.
4. **Generate new token** → elige la app → **expiración: Never** → permisos:
   `whatsapp_business_messaging` **y** `whatsapp_business_management`.
5. **Copia el token completo** (empieza con `EAA...`). Solo se muestra una vez.
   ⚠️ Esto es el `WHATSAPP_TOKEN`.

> Verificación del negocio: para producción real (números ilimitados) Meta pide
> **Business Verification**. Puede tardar días. Se puede empezar a probar antes con
> límites; deja la verificación andando en paralelo (**Business Settings → Security
> Center**).

---

## PARTE B — Setear secrets y redeployar (esto lo hago yo)

Con el `WHATSAPP_TOKEN` y el `WHATSAPP_PHONE_ID` en mano, se corre:

```bash
# desde c:\Users\56983\OneDrive\Desktop\Barberia-Elegance
printf '%s' 'EAA...tokenpermanente...' | firebase functions:secrets:set WHATSAPP_TOKEN --data-file=-
printf '%s' '123456789012345'          | firebase functions:secrets:set WHATSAPP_PHONE_ID --data-file=-

# redeploy de las 4 funciones que usan los secrets
firebase deploy --only functions:whatsappWebhook,functions:notificarCitaWhatsAppElegance,functions:notificarCitaWhatsAppTenant,functions:waNotifEstado
```

---

## PARTE C — Configurar el webhook en Meta

1. En la app → **WhatsApp → Configuration → Webhook** (o **Webhooks**).
2. **Callback URL:** `https://us-central1-barberia-elegance.cloudfunctions.net/whatsappWebhook`
3. **Verify token:** `synaptech-wa-dca5b28fac457095c3b6ba90443ea23b`
4. **Verify and save** → Meta hace un GET; debe dar OK (el código ya responde el challenge).
5. En **Webhook fields** → **Subscribe** al campo **`messages`**.

---

## PARTE D — Publicar el número en la plataforma (esto lo hago yo)

Una vez que los avisos llegan bien, se siembra el número visible para que el panel
deje de mostrar "próximamente" y todos los locales puedan activarse:

```bash
# el número en formato Meta E.164 sin '+'  (Chile: 569XXXXXXXX)
node scripts/wa-notif-activar.js 569XXXXXXXX
```

Esto escribe `_system/whatsapp_notif.numero` y `freeEnabled:true` →
`waNotifEstado.disponible` pasa a `true`.

---

## PARTE E — Cómo activa cada local (flujo del dueño, ya construido)

El dueño entra a su panel de gestión → **WhatsApp → Avisos de reservas** →
botón **"Activar por WhatsApp"**. Eso abre `wa.me/<numero>` con el texto
`ACTIVAR <tenantId>` pre-cargado. Al enviarlo:
- El webhook vincula su teléfono al tenant (`wa_notif/{tid}` + `wa_notif_phones/{fono}`).
- Desde ahí, cada reserva nueva le llega al WhatsApp. Responde **1** para confirmar
  (y renovar la ventana gratis de 24 h). Comandos: `PAUSAR` · `REANUDAR`.

Garantía de costo **$0**: el nivel gratis solo envía mensajes de sesión (`type:text`),
que Meta nunca factura. Si la ventana de 24 h está cerrada, cae al push FCM existente.

---

## MÁS ADELANTE (opcional) — nivel PAGADO: confirmación al CLIENTE

Esto sí cuesta plata (plantillas utility de Meta, centavos por mensaje) y está
**apagado con triple candado**. Para encenderlo:
1. Crear y **aprobar** en Meta una plantilla utility (5 variables: nombre, servicio,
   fecha, hora, local). Nombre sugerido: `confirmacion_cita`.
2. Encender `_system/whatsapp_notif.templatesEnabled = true` (global).
3. Encender `wa_notif/{tid}.planCliente = true` por cada local que lo pague.

No hace falta para "dejar todo listo" el aviso al dueño.

---

## Checklist rápido

- [ ] Número dedicado libre de WhatsApp y verificable por SMS/llamada
- [ ] App creada en Meta con producto WhatsApp
- [ ] Número real registrado → copiar **Phone number ID**
- [ ] Token permanente de System User → copiar **token EAA...**
- [ ] `firebase functions:secrets:set` de los 2 secrets + redeploy (yo)
- [ ] Webhook configurado (URL + verify token) y suscrito a `messages`
- [ ] `node scripts/wa-notif-activar.js 569XXXXXXXX` (yo)
- [ ] Prueba E2E: crear una reserva y confirmar que llega el aviso
</content>
</invoke>
