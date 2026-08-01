# Reserve with Google (Actions Center) — plan de integración

Objetivo: que un cliente encuentre la barbería en **Google Maps / Búsqueda** y
reserve con el botón "Reservar" **sin salir de Google**, contra nuestra agenda
real. Es el canal de adquisición que ni AgendaPro chico ni las barberías con
Instagram tienen.

Doc oficial: https://developers.google.com/actions-center/verticals/reservations/e2e/integration-steps/overview

---

## Los 8 pasos que exige Google

| # | Paso | Qué implica | ¿Quién? |
|---|---|---|---|
| 1 | **Setup** | Contrato de partner, cuenta en el Actions Center, subir clave pública SSH, credenciales del booking server, habilitar Cloud APIs, configurar la marca | 👤 Ignacio (gestión) |
| 2 | **Feeds** | 3 archivos en **Protocol Buffer**: `Merchants` (locales), `Services` (servicios), `Availability` (cupos). Se suben periódicamente (SFTP/GCS), se pueden comprimir y shardear | 💻 Construir |
| 3 | **Booking Server** | API REST con 4 endpoints: `BatchAvailabilityLookup`, `CreateBooking`, `UpdateBooking`, `HealthCheck` | 💻 Construir |
| 4 | **Real-Time Updates** | Endpoint `BookingNotification`: avisarle a Google de cancelaciones **antes** de que un usuario vea un cupo que ya no existe | 💻 Construir |
| 5 | **Sandbox review** | Google corre sus casos de prueba contra nuestra implementación | 🤝 Ambos |
| 6 | **Producción** | Replicar la infra aprobada en producción (aún no descubrible) | 💻 Deploy |
| 7 | **Production review** | Segunda tanda de pruebas de Google | 🤝 Ambos |
| 8 | **Launch + monitoreo** | Queda visible en Maps/Search; hay que mantener el healthcheck sano o Google despublica | 💻 Ops |

---

## Qué YA tenemos (y sirve tal cual)

Esta es la buena noticia: el 60% del trabajo técnico existe.

- **Motor de disponibilidad real** (`functions/chat-horas-disponibles.js`):
  respeta duración del servicio, colación, horario por día, jornada de cada
  profesional, bloqueos y citas. Es exactamente lo que alimenta el
  `Availability feed` y el `BatchAvailabilityLookup`.
- **Creación de cita transaccional con candado** (`slotLocks`, misma tx que usa
  el bot): es el `CreateBooking` sin dobles reservas.
- **Cancelar / reagendar** ya implementados y probados (`reagendar_cita`,
  trigger `liberarSlot`): base de `UpdateBooking` y de las RTU.
- **Catálogo por tenant** (`servicios`, con precio, duración y días válidos) →
  `Services feed`. **Datos del local** (`tenants/{tid}`) → `Merchants feed`.
- **Cloud Functions v2 + Firebase**: hosting del booking server sin infra nueva.

## Qué falta construir

1. `functions/rwg/` — booking server: los 4 endpoints REST con el contrato de
   Google (auth por credenciales del paso 1) + `BookingNotification`.
2. Generador de los 3 feeds en protobuf + job programado que los publica.
3. Mapeo `tenant ⇄ merchant de Google` (un local = un merchant; las 3 sedes de
   Kronnos son 3 merchants).
4. Reglas de negocio a decidir **antes** de codear:
   - ¿Se pide prepago? (Google lo soporta; hoy nuestro flujo no lo exige)
   - ¿Qué servicios se publican? (los `soloStaff` NO)
   - ¿Política de cancelación que se le declara a Google?

## Riesgos y advertencias

- **Requiere contrato con Google**: no es self-service. El paso 1 lo gestiona
  Ignacio y puede tardar; sin eso no hay sandbox donde probar.
- **El healthcheck es vinculante**: si el booking server se cae, Google
  despublica el inventario. Hay que sumarlo al panel de ops.
- **Sobreventa**: Google puede tener disponibilidad cacheada. El `CreateBooking`
  debe fallar limpio cuando el cupo ya no existe (nuestro candado ya lo hace) y
  las RTU deben salir rápido tras una cancelación.
- **Protobuf, no JSON**: los feeds no son un CSV — hay que compilar los `.proto`
  que publica Google y versionarlos.

## Orden sugerido

1. Ignacio abre el trámite del paso 1 (bloquea todo lo demás).
2. Mientras tanto: feeds (paso 2) contra el motor actual, que es lo que se
   puede construir y validar sin credenciales.
3. Booking server (pasos 3–4) reusando las transacciones existentes.
4. Sandbox → producción con un solo tenant piloto (delnero) antes de abrir al
   resto.
