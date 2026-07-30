# Canales de email — Resend + Brevo

**Estado:** implementado 2026-07-30. Falta el paso humano de la sección
[Puesta en marcha](#puesta-en-marcha) antes del deploy.

## Por qué

El plan free de Resend son **100 emails/día** y lo estábamos topando (Resend
manda el aviso "You have reached 100% of your daily quota"). Cuando se agota,
Resend rechaza **todo** lo que venga después: se caen confirmaciones de cita,
recordatorios y recuperación de contraseña, sin plan B.

Brevo suma **300 emails/día** gratis. Los dos conviven: no se reemplazó nada.

**Capacidad combinada: 400 emails/día.**

## Cómo funciona

Todo el correo del sistema sale por un único módulo: `functions/lib/mailer.js`.
Antes había **14 copias** de la misma función `sendResend()` pegadas en 14
archivos; ahora hay una sola implementación y los 14 sitios la llaman.

```js
const { enviarEmail, MAIL_SECRETS } = require('./lib/mailer');

exports.miFuncion = onSchedule({ secrets: [...MAIL_SECRETS] }, async () => {
  await enviarEmail(
    { from, to, subject, html },              // formato Resend, siempre
    { primario: 'brevo', etiqueta: 'cobros' } // a qué canal ir primero
  );
});
```

El payload se escribe **siempre en formato Resend**. Si el envío termina yendo
por Brevo, el módulo lo traduce (`from` → `sender {name,email}`, `to` →
`[{email}]`, `html` → `htmlContent`). Quien manda el correo no sabe ni le
importa qué proveedor se usó.

### Failover

1. Intenta el proveedor `primario`.
2. Si responde **sin cuota** (Resend 429 daily quota, Brevo 402
   `not_enough_credits`), 5xx o falla de red → reintenta por el otro.
3. Si responde **error de validación** (422, email inválido) → NO reintenta:
   iba a fallar igual en el otro y solo quemaría cuota.
4. Si fallan los dos → lanza, salvo que se pase `silencioso: true` (entonces
   devuelve `{ ok: false, error }`).

Cuando un proveedor reporta cuota agotada queda marcado en memoria por el resto
del día, así los envíos siguientes van directo al otro canal sin gastar una
request en el que ya sabemos que está lleno.

### Reparto actual

| Canal primario | Qué manda | Archivos |
|---|---|---|
| **Brevo** (300/día) | Correo que ve el **cliente final** | `confirmacion-cita`, `recordatorio-cita`, `recuperacion-password`, `bioo-reservas-cliente` |
| **Resend** (100/día) | Correo **interno / al dueño** del local | `aviso-cita-staff`, `acceso-staff-email`, `recordatorio-cobro`, `mensualidad-mp`, `wallet-avisos-cobro`, `ops-metrics`, `evolution/salud`, `referidos-aviso`, `synaptech-lead`, `bioo-nuevo-signup`, `bioo-reservas-aviso` |

El criterio: el correo al cliente es el volumen alto (una confirmación por cita,
más el recordatorio 1h) y por eso va al balde grande. El correo interno es un
goteo — leads, alertas de ops, cobros — y le sobra con los 100 de Resend. Igual,
si cualquiera de los dos se llena, el otro lo absorbe.

`acceso-staff-email` va por Resend aunque parezca "de cara al usuario": es el
reset de contraseña del **panel**, o sea staff/dueño, no cliente.

Para cambiar el canal de un envío puntual, se toca su `primario` en la llamada.
Para forzar **todo** el sistema a un canal (incidente, prueba), se setea la env
var `MAIL_PRIMARIO=resend|brevo` en las Functions — pisa todos los `primario`.

### Contador de uso

Cada envío incrementa `_mailUsage/{YYYY-MM-DD}` en Firestore:

```
_mailUsage/2026-07-30 → { resend: 84, brevo: 121, fallidos: 0 }
```

Sirve para ver de un vistazo qué tan cerca del techo vamos sin esperar el correo
de aviso de Resend. Es best-effort: si falla la escritura, el correo se manda
igual.

## Puesta en marcha

Dos pasos humanos, ambos **antes** del `firebase deploy` (si el secret no existe,
el deploy falla al resolver `defineSecret('BREVO_API_KEY')`).

### 1. Autenticar el dominio en Brevo

**Verificado 2026-07-30: `synaptechspa.cl` NO está configurado en Brevo** (el
único remitente registrado es `ignaciiio.mate@gmail.com`).

Brevo igual **acepta** el envío desde `citas@synaptechspa.cl` (devuelve 201),
pero lo firma con su propio dominio: el mensaje sale como
`smtp-relay.mailin.fr`. Gmail lo muestra como *"enviado vía mailin.fr"* y sube
mucho el riesgo de spam — inaceptable para confirmaciones de cita, que es
justo lo que va por este canal.

Los remitentes en uso son todos de `synaptechspa.cl`:

- `citas@synaptechspa.cl` (agenda de todos los tenants)
- `avisos@synaptechspa.cl` (ops, acceso staff)
- `hola@synaptechspa.cl` (bioo, leads, referidos)
- `cobros@synaptechspa.cl` (Wallo)

El dominio ya quedó dado de alta en Brevo (`id 6a6ba3dae8864d37e109769f`,
2026-07-30). Faltan los 4 registros DNS. **El DNS de `synaptechspa.cl` vive en
Vercel** (`ns1/ns2.vercel-dns.com`) → Vercel → Domains → synaptechspa.cl → DNS
Records:

| Tipo | Nombre | Valor |
|---|---|---|
| CNAME | `brevo1._domainkey` | `b1.synaptechspa-cl.dkim.brevo.com` |
| CNAME | `brevo2._domainkey` | `b2.synaptechspa-cl.dkim.brevo.com` |
| TXT | `@` | `brevo-code:5a0c89df6aba58c8eed1c8aae6570bc1` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

**No se toca el SPF.** Brevo autentica por DKIM (los dos CNAME) y no pide
`include:` en el SPF — su return-path va por dominio propio. El SPF actual del
raíz es `v=spf1 include:zohomail.com ~all` y queda igual; Resend tampoco se toca
(firma con `resend._domainkey` y su SPF vive en el subdominio
`send.synaptechspa.cl`). Los tres conviven: son selectores DKIM distintos.

El TXT `brevo-code` va en la raíz junto a los TXT que ya existen
(google-site-verification, zoho-verification, SPF). Varios TXT en la raíz es
normal — el único registro que no puede duplicarse es el SPF, y este no lo es.

El `_dmarc` hoy **no existe**, así que se crea nuevo. `p=none` es solo
monitoreo: no cambia la entrega de nada, solo habilita reportes.

### 2. Cargar la API key

⚠️ Es la **API key** (`xkeysib-…`), NO la contraseña SMTP que muestra
Transaccional → Tiempo real. El módulo habla con la REST API
(`api.brevo.com/v3/smtp/email`), no con `smtp-relay.brevo.com`.

En Brevo: **SMTP & API → API Keys → Generate a new API key**. Después:

```bash
firebase functions:secrets:set BREVO_API_KEY
# pegar la key (empieza con xkeysib-)
```

Y para desarrollo local, agregarla a `functions/.secret.local`.

### 3. Desactivar "IPs autorizadas" para claves API ← BLOQUEANTE

**Verificado 2026-07-30: la restricción está ACTIVADA para claves API.** En
Settings → Seguridad → Direcciones IP autorizadas, el bloque "Claves API" aparece
como *Activada*, con un botón **"Desactivar para claves API"**. Hay que apretarlo.

Autorizar una IP suelta **no sirve**: solo habilita ese equipo. Cualquier llamada
desde una IP no listada responde 401:

```json
{"code":"unauthorized",
 "message":"We have detected you are using an unrecognised IP address …"}
```

Las Cloud Functions salen por **IPs dinámicas de Google**, distintas en cada
invocación. No se pueden poner en una allowlist: los rangos de Google son
enormes y cambian. Mientras esto siga activo, Brevo rechaza el 100% de los
envíos.

Solución: <https://app.brevo.com/security/authorised_ips> → **Desactivar para
claves API**. La API key sigue siendo la autenticación; lo que se quita es el
segundo filtro por IP, que con IPs dinámicas no se puede satisfacer.

Si Brevo no dejara desactivarla, la alternativa es dar salida fija a las
Functions con VPC Connector + Cloud NAT con IP estática y whitelistear esa IP —
pero eso suma ~US$35/mes de infraestructura, así que se intenta solo si no queda
otra.

> El "Whitelist your IP address" del quickstart de Brevo es otra cosa: aplica al
> playground del navegador. Esta restricción es la de Settings → Security.

**Mientras tanto no se rompe nada**: el módulo trata el 401 como caída del
proveedor y manda el correo por Resend (comportamiento actual). Solo no se gana
la capacidad extra.

### 4. Deploy

```bash
firebase deploy --only functions
```

Se redespliegan las 15 funciones que mandan correo (cambió su lista de
`secrets`).

## Verificación

```bash
npm run test:mailer     # 23 asserts: traducción, failover en ambas direcciones,
                        # cuota agotada, error de validación. No manda correo real.
```

Ya corre dentro de `npm run check`.

Para una prueba de punta a punta con un correo real:

```bash
BREVO_API_KEY=xkeysib-xxx node scripts/test-aviso-staff.js tu@correo.cl
```

Después del deploy, en los logs de Functions:

- `[mailer:<etiqueta>] enviado por brevo (failover desde resend)` → el failover
  actuó.
- `[mailer] resend sin cuota diaria` → se topó Resend, el resto del día va por
  Brevo.
- `[mailer:<etiqueta>] falló en todos los canales` → los dos caídos, revisar.

## Pendiente: Brevo reescribe los links (tracking de clics)

**Verificado 2026-07-30** leyendo el HTML almacenado en Brevo
(`GET /v3/smtp/emails/{uuid}`): Brevo reescribe TODOS los `href` a su dominio de
tracking. Un botón que apunta a
`https://delnerobarber.synaptechspa.cl/chat?codigo=ABC-123` le llega al cliente
como `https://bbhihcie.r.af.d.sendibt2.com/tr/cl/2x9OqN48…`.

Afecta a los CTA de **"Reagendar mi cita"** y **"Cancelar mi cita"** de la
confirmación: dominio que el cliente no reconoce (parece phishing) y, si el
tracker de Brevo falla, el cliente no puede cancelar.

No se arregla desde el código. Se probaron `X-Mailin-Track: 0` y
`X-Mailin-Track-Click: 0` en el payload: los tres envíos salieron reescritos
igual. Es un ajuste del panel de Brevo (desactivar seguimiento de clics en
transaccionales), o configurar el subdominio de marca `em` para que al menos el
redirect salga desde `em.synaptechspa.cl`.

## Pendiente: el "Darse de baja" que agrega Brevo

Brevo inyecta un header `List-Unsubscribe` en los correos transaccionales. Gmail
lo muestra como **"Darse de baja"** al lado del remitente — se ve en las
confirmaciones de cita, donde no tiene sentido.

El riesgo no es estético: si un cliente lo aprieta, **Brevo lo mete en su
blocklist** y deja de recibir las confirmaciones de sus próximas citas, sin que
nadie se entere.

Mitigación ya implementada: el mailer detecta el error de destinatario bloqueado
(`blocked|blacklist|unsubscrib|not_allowed`) y hace failover a Resend, que no
comparte esa blocklist. O sea, el cliente igual recibe su confirmación.

**Falta revisar en el panel de Brevo** si se puede desactivar el unsubscribe para
transaccionales (Transaccional → Configuración / Senders). Si no se pudiera, la
alternativa es devolver `confirmacion-cita` y `recordatorio-1h` a Resend primario
— es cambiar dos `primario:` y redesplegar.

## Si más adelante hace falta más volumen

Con 400/día alcanza para el volumen actual, pero no es infinito. Cuando se tope:

- Brevo cobra ~US$9/mes por 5.000 emails/mes; Resend ~US$20/mes por 50.000.
- El módulo ya soporta N proveedores: agregar uno es escribir una función
  `enviarPorX()` y sumarla al objeto `PROVEEDORES`. Los 14 call sites no se
  tocan.
