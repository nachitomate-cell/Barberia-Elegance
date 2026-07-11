#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
 *  scripts/seed-ayuda.js
 *  ─────────────────────────────────────────────────────────────
 *  Crea/actualiza las 8 categorías y ~27 guías del Centro de Ayuda.
 *  Idempotente (usa set con merge: true).
 *
 *  Uso:  node scripts/seed-ayuda.js
 * ═══════════════════════════════════════════════════════════════ */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

// ── Categorías ────────────────────────────────────────────
const CATEGORIAS = [
  { id: 'comenzar-aqui',    nombre: 'Comenzar aquí',       descripcion: 'Primera semana. Setup, equipo y horario.',              icono: 'activity', orden: 1 },
  { id: 'agenda-reservas',  nombre: 'Agenda y reservas',   descripcion: 'Bloques, sobrecupos, cancelaciones y el flujo del cliente.', icono: 'calendar', orden: 2 },
  { id: 'servicios-precios',nombre: 'Servicios y precios', descripcion: 'Cortes, add-ons, packs, precios por día y descuentos.',   icono: 'shield',   orden: 3 },
  { id: 'equipo-roles',     nombre: 'Equipo y roles',      descripcion: 'Barberos, jefes, comisiones y horarios personalizados.',  icono: 'users',    orden: 4 },
  { id: 'pagos-caja',       nombre: 'Pagos y caja',        descripcion: 'Mercado Pago, propinas, cierres diarios y facturación.',  icono: 'wallet',   orden: 5 },
  { id: 'fidelizacion',     nombre: 'Fidelización',        descripcion: 'Sellos, rangos, premios y el flujo de canje.',            icono: 'star',     orden: 6 },
  { id: 'marketing',        nombre: 'Marketing y anuncios',descripcion: 'Push, WhatsApp, reseñas Google, campañas segmentadas.',   icono: 'globe',    orden: 7 },
  { id: 'multi-sede',       nombre: 'Multi-sede',          descripcion: 'Un panel para varias sucursales. Pool cross-sede y roles.', icono: 'building', orden: 8 },
];

// ── Helpers para no repetirse ─────────────────────────────
const AUTOR = { nombre: 'Equipo SynapTech', rol: 'Producto' };
const AHORA = () => Timestamp.fromDate(new Date());

// ── Artículos ─────────────────────────────────────────────
const ARTICULOS = [

  // ═════════════════ COMENZAR AQUÍ ═════════════════
  {
    id: 'tu-primera-semana', slug: 'tu-primera-semana',
    titulo: 'Tu primera semana en la plataforma',
    deck: 'Un checklist para tener tu negocio funcionando en 7 días. Sin tecnicismos.',
    categoriaId: 'comenzar-aqui', categoriaSlug: 'comenzar-aqui',
    autor: AUTOR, tiempoLectura: 5, publicado: true, destacado: false, orden: 1,
    tags: ['setup', 'comenzar'],
    contenidoMd: `Bienvenido. Vamos a hacer que tu negocio esté funcionando en la plataforma en menos de una semana. Sigue estos pasos en orden y en 7 días tendrás todo listo para recibir reservas online, cobrar y fidelizar clientes.

## Día 1 · Configurar tu local

Ve a **Configuración** en el menú lateral y llena estos datos:

- Nombre completo y dirección de tu local
- Logo (idealmente cuadrado, mínimo 512x512)
- Teléfono y correo de contacto
- Horario de atención por día (lunes a domingo)

![Pantalla de configuración general](placeholder: Captura de /configuracion mostrando el formulario con nombre del local, logo, dirección y los horarios por día)

## Día 2 · Cargar tus servicios

Ve a **Servicios** y crea al menos los 3-5 servicios principales que ofreces (corte, barba, tinte, etc.). Para cada uno:

- Nombre del servicio
- Precio y duración
- Descripción corta que le hable al cliente

:::callout Tip
Empieza simple: 3 servicios básicos. Después agregas más. No trates de tener el catálogo completo el primer día.
:::

## Día 3 · Agregar tu equipo

Ve a **Equipo** y añade a cada barbero o estilista. Para cada uno:

- Nombre y foto (importante — el cliente elige por cara)
- Servicios que hace
- Horario personal si es distinto al del local

![Ficha de un barbero en el panel](placeholder: Captura de la ficha de un barbero mostrando su foto, servicios asignados y el horario personal)

## Día 4 · Activar tu agenda pública

Tu link de reservas ya está listo. Es tu subdominio (por ejemplo, \`tunombre.synaptechspa.cl\`). Compártelo:

- En el perfil de Instagram
- Por WhatsApp con tus clientes actuales
- En Google Business
- Impreso en el local con QR

## Día 5 · Activar cobros online (opcional)

Si quieres cobrar por adelantado o dejar una seña, ve a **Recibir Pagos** y conecta tu cuenta de Mercado Pago. Toma 5 minutos.

## Día 6 · Configurar fidelización

Ve a **Premios** y crea 2-3 premios sencillos (por ejemplo: "10 sellos = corte gratis"). El sistema empieza a acumular sellos automáticamente con cada visita completada.

## Día 7 · Hacer tu primera reserva de prueba

Entra a tu subdominio como si fueras un cliente, reserva una hora, y confírmala desde el panel. Así ves el flujo completo de punta a punta.

Si algo no anda, escríbenos por WhatsApp. Respondemos en menos de 4 horas.`,
  },

  {
    id: 'configurar-horarios-y-sede', slug: 'configurar-horarios-y-sede',
    titulo: 'Configurar horarios y datos del local',
    deck: 'Los horarios que pongas acá son los que se muestran a los clientes cuando reservan.',
    categoriaId: 'comenzar-aqui', categoriaSlug: 'comenzar-aqui',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 2,
    tags: ['horarios', 'configuracion'],
    contenidoMd: `Los horarios de atención son lo primero que ve un cliente cuando entra a tu sitio a reservar. Si están mal, aparecen horas "libres" que en realidad son de tu día de descanso — y quedas mal.

## Dónde configurarlos

Ve a **Configuración** en el menú lateral. En la sección **Horario de atención**, defines por día:

- **Hora de apertura y cierre**
- **Almuerzo o pausa** (si aplica): el sistema no muestra esas horas como disponibles
- **Día cerrado**: para tu día de descanso semanal

![Configuración de horarios semanal](placeholder: Captura de la sección "Horario de atención" con los 7 días y los inputs de hora apertura/cierre para cada uno)

:::callout Importante
Los cambios se aplican **al instante** para los clientes que reservan. Si es lunes al mediodía y bajas el horario de cierre a las 6pm, cualquier reserva nueva del día ya no verá las horas después de las 6pm.
:::

## Fechas especiales (feriados, eventos)

Para días especiales — feriados nacionales, viajes, cierres puntuales — no toques el horario semanal. Usa **Agenda → Bloquear día**. Así el horario base sigue funcionando el resto del año.

## Ajustar la duración de los turnos

En la misma sección de Configuración puedes definir la **duración del bloque base** (por ejemplo, 30 minutos). El sistema divide tu día en bloques de ese tamaño para mostrarle al cliente las horas disponibles.

Recomendación: si tu servicio más corto es 30 minutos, deja bloques de 30. Si es 45, deja bloques de 15 o 45. Bloques muy chicos pueden confundir; muy grandes limitan las opciones.`,
  },

  {
    id: 'agregar-tu-equipo-al-panel', slug: 'agregar-tu-equipo-al-panel',
    titulo: 'Agregar tu equipo al panel',
    deck: 'Cada barbero necesita su ficha. Y si quieres que use el panel, además su cuenta de acceso.',
    categoriaId: 'comenzar-aqui', categoriaSlug: 'comenzar-aqui',
    autor: AUTOR, tiempoLectura: 4, publicado: true, destacado: false, orden: 3,
    tags: ['equipo', 'accesos'],
    contenidoMd: `Los clientes eligen barbero por foto y nombre. Por eso vale la pena dedicar unos minutos a cargar bien a tu equipo.

## Añadir un miembro nuevo

Ve a **Equipo** en el menú lateral, y toca el botón **"+ Nuevo"**. Llena:

- **Nombre y apellido** (aparece en la agenda pública)
- **Foto** — que sea clara y con buena luz. Es lo que ve el cliente al elegir.
- **Servicios que hace** — no todos hacen todo. Marca solo los suyos.
- **Días y horas de trabajo** — si es distinto al horario general del local

![Formulario de nuevo barbero](placeholder: Captura del formulario "Nuevo miembro del equipo" con los campos de nombre, foto, servicios asignados y horario)

## Habilitar que use el panel

Si quieres que un miembro del equipo entre al panel a ver su agenda del día, marcar sus propias citas como completadas, o cerrar caja, actívale el acceso:

1. En su ficha, activa el toggle **"Habilitar acceso al panel web"**
2. Escribe su correo electrónico
3. Escribe una contraseña temporal
4. Guarda y compártele por WhatsApp los datos

![Sección de acceso al panel web](placeholder: Captura de la sección "Acceso al panel web" con el toggle activado, el campo de email y contraseña temporal)

:::callout Tip
La contraseña temporal es solo la primera. Cuando el barbero inicie sesión, puede cambiarla desde el propio panel. Si la olvida, tienes botones para "Enviar enlace por email" o "Fijar contraseña" desde su ficha.
:::

## Roles: qué puede hacer cada uno

- **Barbero**: ve solo su agenda, marca sus citas completadas, ve sus comisiones
- **Jefe**: ve todo, pero no toca configuración ni facturación
- **Admin**: acceso total (equivalente al dueño)

El rol se elige al momento de habilitar el acceso. Puedes cambiarlo después desde la misma sección.`,
  },

  // ═════════════════ AGENDA Y RESERVAS ═════════════════
  {
    id: 'manejar-la-agenda-del-dia', slug: 'manejar-la-agenda-del-dia',
    titulo: 'Manejar la agenda del día',
    deck: 'El corazón operativo. Todo lo que necesitas saber para mover tus citas sin friccion.',
    categoriaId: 'agenda-reservas', categoriaSlug: 'agenda-reservas',
    autor: AUTOR, tiempoLectura: 4, publicado: true, destacado: false, orden: 1,
    tags: ['agenda', 'operacion'],
    contenidoMd: `La agenda es lo que vas a mirar todo el día. Está diseñada para que veas rápido qué está pasando y actúes sin muchos clics.

## Cómo se ve

Cada columna es un barbero. Cada fila es un bloque horario. Las citas confirmadas aparecen coloreadas — el color depende del estado (confirmada, completada, cancelada).

![Vista completa de la agenda del día](placeholder: Captura de /agenda mostrando 3-4 columnas de barberos con citas del día. Debe verse el badge de estado y algunos badges morados de pack)

## Crear una cita nueva

Toca una hora libre en la columna del barbero que quieras. Se abre el formulario:

- **Cliente** (nombre + teléfono, obligatorios)
- **Servicio**
- **Duración** (se autocompleta según el servicio, editable si es un caso especial)
- **Nota** (opcional — algo para acordarte)

Al guardar, la cita aparece en la agenda de inmediato.

## Cambiar estado de una cita

Toca la cita y elige el nuevo estado:

- **Confirmada** — reservada pero aún no llegó
- **Completada** — el servicio terminó (aquí es donde se descuentan packs y se suman sellos)
- **Cancelada** — el cliente avisó que no viene
- **No asistió** — no llegó y no avisó (queda registrado en su historial)

:::callout Importante
Marcar como **Completada** es lo que dispara la fidelización. Si te acostumbras a cerrar cada cita al terminar, los sellos y descuentos de packs se aplican solos.
:::

## Mover una cita a otra hora o barbero

Arrastra la cita con el mouse (o tap+hold en el móvil) al nuevo bloque. Se mueve al instante y notifica al cliente si lo tienes configurado.

## Citas por cerrar

Al final del día, hay una vista **"Por cerrar"** que te muestra todas las citas que ya pasaron pero siguen en estado "Confirmada". Sirve como recordatorio de no dejar cabos sueltos.`,
  },

  {
    id: 'bloquear-horarios-vacaciones-permisos', slug: 'bloquear-horarios-vacaciones-permisos',
    titulo: 'Bloquear horarios: vacaciones, feriados o permisos',
    deck: 'Cuando no vas a trabajar un día o una hora específica, así lo bloqueas para que nadie reserve ahí.',
    categoriaId: 'agenda-reservas', categoriaSlug: 'agenda-reservas',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 2,
    tags: ['bloqueos', 'vacaciones'],
    contenidoMd: `Un cliente no puede reservar en un horario bloqueado. Si tú o un barbero tienen algo que hacer, bloquéalo — es la única forma de asegurar que no aparezca una reserva a esa hora.

## Bloquear una hora puntual

Desde la agenda, arrastra desde la hora inicial hasta la final en la columna del barbero. Aparece un formulario:

- **Motivo** (opcional pero útil): "almuerzo", "reunión", "ausencia médica"
- **Fecha y hora exactas**

Al guardar, ese bloque queda pintado gris y no se ofrece como disponible.

![Bloqueo de horario en la agenda](placeholder: Captura de la agenda con un bloque gris claro que dice "Almuerzo" ocupando 2 horas de la columna de un barbero)

## Bloquear un día completo

Ve a **Agenda → Bloquear día**. Elige la fecha y el motivo. Puedes bloquear:

- Para **un barbero solo** (si él tiene libre pero el resto trabaja)
- Para **todo el local** (feriado, capacitación, viaje del equipo)

## Vacaciones o ausencias largas

Para bloqueos de varios días (una semana de vacaciones, por ejemplo), ve a la ficha del barbero en **Equipo** y añade una **ausencia** con fecha inicio y fin. Es más rápido que bloquear día por día.

:::callout Tip
Los bloqueos se pueden editar o borrar después. Si un permiso se cancela, borra el bloqueo y las horas vuelven a estar disponibles automáticamente.
:::`,
  },

  {
    id: 'sobrecupos-y-horarios-especiales', slug: 'sobrecupos-y-horarios-especiales',
    titulo: 'Sobrecupos y horarios especiales',
    deck: 'Cuando quieres cobrar más por atender fuera de horario o en un cupo lleno.',
    categoriaId: 'agenda-reservas', categoriaSlug: 'agenda-reservas',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 3,
    tags: ['sobrecupos', 'horarios'],
    contenidoMd: `A veces un cliente te ruega que lo atiendas justo a la hora que ya tienes ocupada, o después de tu horario normal. En vez de decir "no puedo", puedes ofrecerle un **sobrecupo con recargo**.

## Qué es un sobrecupo

Es una reserva que se pone **encima** de una hora ya ocupada (o fuera del horario normal), con un recargo automático. Ejemplo: si Juan quiere un corte a las 8pm y tú cierras a las 7pm, el sistema le agrega un recargo de $3.000 por atención fuera de horario.

## Cómo configurarlo

Ve a cada **Servicio** y define el **recargo por sobrecupo** por defecto. Puedes tener uno distinto para cada servicio (más caro para un tinte, más barato para un corte).

![Campo de recargo por sobrecupo en un servicio](placeholder: Captura del formulario de edición de un servicio mostrando el campo "Recargo por sobrecupo (CLP)")

## Habilitar sobrecupo público

En la agenda pública, los sobrecupos aparecen solo si tienes **VIP habilitado** (opcional). Se muestran como horas con un badge dorado y el precio con recargo — así el cliente sabe que está pagando más por la excepción.

## Sobrecupo interno

Si un cliente te pide directamente por WhatsApp, tú puedes crear la cita en un slot ocupado manualmente. Al guardar, el sistema te avisa que es sobrecupo y aplica el recargo. Queda todo registrado.

:::callout Nota
Un sobrecupo NO bloquea el horario para otros clientes. Si por alguna razón la cita original se cancela, la del sobrecupo sigue en pie y ya no es "sobre" nada.
:::`,
  },

  {
    id: 'cuando-un-cliente-no-llega', slug: 'cuando-un-cliente-no-llega',
    titulo: 'Cuando un cliente no llega (no-show)',
    deck: 'Registra los no-shows para tener control. Los repetidos entran a tu lista negra.',
    categoriaId: 'agenda-reservas', categoriaSlug: 'agenda-reservas',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 4,
    tags: ['no-show', 'lista-negra'],
    contenidoMd: `Cliente reservó, tú lo esperaste, y nunca llegó. Fastidio real. Pero también un dato: los repetidos merecen menos flexibilidad.

## Marcar un no-show

En la agenda, toca la cita del cliente que no llegó y cambia el estado a **"No asistió"**. Con eso:

- La cita queda registrada como no-show (visible en el historial del cliente)
- El horario se libera para que otro pueda tomarlo (si aún es útil)
- Suma 1 al contador de no-shows del cliente

![Cambio de estado a "No asistió" en una cita](placeholder: Captura del modal de edición de cita con el selector de estado abierto y "No asistió" resaltado)

## Ver el historial de un cliente

Ve a **Clientes**, busca el cliente y abre su ficha. En la sección **Historial de citas** ves todas sus visitas con el estado. Los no-shows se cuentan por separado.

## Lista negra automática

Puedes configurar cuántos no-shows tolerar antes de mandar al cliente a la **lista negra**. Por defecto son 3.

Un cliente en lista negra **no puede reservar online** por sí solo. Si quiere agendar, tiene que llamarte y tú decides si lo aceptas manualmente desde el panel.

:::callout Tip
Antes de sacar a alguien de la lista negra, revisa su historial. A veces son 3 no-shows genuinos por circunstancias fuera de su control (enfermedad, viaje, olvido). El chat con el cliente aclara muchos casos.
:::

## Cobrar seña por adelantado

Si los no-shows son un problema grande en tu negocio, considera activar **Recibir Pagos** (Mercado Pago). Cobrar $5.000 de seña al reservar reduce los no-shows en más de 80%.`,
  },

  // ═════════════════ SERVICIOS Y PRECIOS ═════════════════
  {
    id: 'crear-tu-primer-servicio', slug: 'crear-tu-primer-servicio',
    titulo: 'Crear tu primer servicio',
    deck: 'Los servicios son lo que el cliente elige al reservar. Bien definidos, evitan confusiones.',
    categoriaId: 'servicios-precios', categoriaSlug: 'servicios-precios',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 1,
    tags: ['servicios', 'setup'],
    contenidoMd: `Ve a **Servicios** en el menú lateral y toca **"+ Nuevo servicio"**. Estos son los campos clave:

## Los campos esenciales

- **Nombre** — corto y claro: "Corte de pelo", "Corte + Barba", "Tinte completo"
- **Categoría** — agrupa servicios similares (Cortes, Barbas, Color, Extras)
- **Precio** en pesos chilenos
- **Duración** en minutos (30, 45, 60...)
- **Descripción** — 1-2 frases que le hablen al cliente. Ejemplo: "Corte clásico con máquina y tijera. Incluye lavado y peinado."

![Formulario de nuevo servicio](placeholder: Captura del formulario de creación de servicio en /servicios con los campos nombre, categoría, precio y duración visibles)

## Buenas prácticas de nombres

**Bien:** "Corte + Barba" · "Tinte + Hidratación" · "Diseño de barba"
**Mal:** "Servicio 1" · "Corte especial" · "Combo del jueves"

El cliente decide en 3 segundos qué eligir. Nombre claro = menos abandonos.

## Servicios "invisibles" para el cliente

Puedes crear servicios que solo tú veas en el panel pero que NO aparecen en la agenda pública. Útil para:

- Servicios internos (mantenimiento del local)
- Servicios que ofreces solo por WhatsApp (VIP, a domicilio)
- Servicios en pausa temporal (no queremos borrarlos, solo esconderlos)

Para hacer un servicio invisible, en su edición desactiva **"Mostrar en la agenda pública"**.

:::callout Tip
Recomendamos empezar con 3-5 servicios. Después puedes agregar más. Un catálogo con 20 servicios el primer día abruma al cliente y baja las conversiones de reserva.
:::

## Reordenar los servicios

Los servicios se muestran al cliente en el orden que tú los pongas. Arrastra los servicios en la lista para reordenarlos. Pon primero los que más vendes.`,
  },

  {
    id: 'precios-por-dia-de-la-semana', slug: 'precios-por-dia-de-la-semana',
    titulo: 'Cobrar distinto según el día de la semana',
    deck: 'Un poco más caro los sábados. Descuento los lunes. Todo automático, sin tocar el precio a mano.',
    categoriaId: 'servicios-precios', categoriaSlug: 'servicios-precios',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 2,
    tags: ['precios', 'descuentos'],
    contenidoMd: `Los sábados son tu día pico. Los lunes están muertos. Con precios variables por día puedes:

- **Cobrar +$2.000 los sábados** (los que van, van igual — cubres la demanda)
- **Descontar $1.500 los lunes** (llenas la mañana con clientes que en otro día no vendrían)

## Cómo configurarlo

En la edición de cada servicio, activa **"Precio variable por día"**. Aparecen 7 casillas (una por día). En cada una escribes el precio para ese día. Si dejas en blanco, se usa el precio base.

![Precios variables por día en un servicio](placeholder: Captura del formulario de servicio con la sección "Precio variable por día" expandida, mostrando 7 inputs (L, M, X, J, V, S, D) con precios distintos)

## Cómo se muestra al cliente

Al reservar, el cliente ve el precio del día que está eligiendo. Si mueve su reserva a otro día, el precio se actualiza automáticamente.

## Descuentos automáticos

Además del precio por día, puedes agregar un **descuento porcentual** en la ficha del cliente cuando quieras premiar la fidelidad de alguien específico. Ese descuento se aplica sobre el precio del día.

:::callout Estrategia
Los descuentos de lunes/martes funcionan bien para atraer clientes que están dudando. Pero cuidado con acostumbrarlos a esperar el descuento — hazlo por temporadas, no siempre.
:::

## Recargo por horario nocturno o especial

Similar al recargo por sobrecupo: puedes configurar que ciertas horas del día tengan un extra automático (por ejemplo, después de las 8pm). Se define en **Configuración → Recargos horarios**.`,
  },

  {
    id: 'vender-productos-junto-con-servicios', slug: 'vender-productos-junto-con-servicios',
    titulo: 'Vender productos junto con tus servicios',
    deck: 'Cera, shampoo, lociones. El cliente lo lleva al pagar la cita, tú aumentas ticket promedio.',
    categoriaId: 'servicios-precios', categoriaSlug: 'servicios-precios',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 3,
    tags: ['productos', 'inventario'],
    contenidoMd: `Además de servicios, el panel te permite manejar productos: cera, shampoo, lociones, gorros. El cliente los agrega a su reserva o los lleva al pagar en el local.

## Crear un producto

Ve a **Productos** en el menú lateral. Toca **"+ Nuevo"** y define:

- **Nombre** y **descripción**
- **Precio de venta**
- **Categoría** (Cuidado capilar, Barba, Accesorios...)
- **Stock inicial** — cuántos tienes ahora en el local
- **Foto** — importante para que el cliente reconozca lo que está comprando online

![Ficha de un producto en el panel](placeholder: Captura de /productos mostrando una lista de productos con foto, precio, stock disponible y botón editar)

## Mostrar en la agenda pública (cross-sell)

En la reserva online, después de elegir el servicio, el cliente ve una pantalla de "¿Quieres agregar algo?" con tus productos destacados. Es cross-sell puro — bien hecho aumenta el ticket promedio 20-30%.

Para que un producto aparezca ahí, en su edición marca **"Mostrar en checkout"**.

## Manejo de inventario

Cada vez que vendes un producto, el sistema descuenta 1 del stock. Cuando el stock llega a 0, el producto ya no aparece disponible.

En **Inventario** puedes ver el detalle de todos los movimientos y ajustar stock manualmente (por ejemplo, cuando llegan nuevas compras).

:::callout Tip
Empieza con 3-5 productos estrella, no cargues catálogo grande al principio. Un menú corto vende más que uno enorme y abrumador.
:::

## Comisión al barbero por vender

Si quieres motivar al equipo a recomendar productos, puedes darles un porcentaje de comisión por cada venta. Se configura en **Equipo → Comisiones**.`,
  },

  // ═════════════════ EQUIPO Y ROLES ═════════════════
  {
    id: 'agregar-un-barbero-a-tu-equipo', slug: 'agregar-un-barbero-a-tu-equipo',
    titulo: 'Agregar un barbero a tu equipo',
    deck: 'Nueva persona en el equipo. Cómo cargarlo bien para que empiece a trabajar el primer día.',
    categoriaId: 'equipo-roles', categoriaSlug: 'equipo-roles',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 1,
    tags: ['equipo', 'barberos'],
    contenidoMd: `Cuando entra alguien nuevo al equipo, es el momento clave para que el flujo funcione desde el día 1. Ve a **Equipo → + Nuevo miembro** y llena lo siguiente:

## Datos básicos

- **Nombre y apellido** — aparece en la agenda pública y en el ticket del cliente
- **Foto** — la más importante después del nombre. Que sea nítida, con el rostro visible, mirando a cámara.
- **Teléfono y email** de contacto (para ti, no para el cliente)

![Formulario de nuevo miembro del equipo](placeholder: Captura del formulario "Nuevo miembro" mostrando los campos de nombre, foto (con placeholder) y datos personales)

## Servicios que hace

Marca solo los servicios que este barbero sabe hacer. Si es nuevo y aún no hace tintes, no los marques — así el cliente no lo elige por error para un tinte.

## Horario personal

Por defecto, hereda el horario del local. Si trabaja horas distintas (por ejemplo, part-time hasta las 3pm), define su horario específico. El sistema lo cruza con el del local para mostrar solo horas donde AMBOS están disponibles.

## Habilitar acceso al panel

Si quieres que él vea su agenda desde su teléfono, marca **"Habilitar acceso al panel web"** y define un email + contraseña temporal. Compártele los datos por WhatsApp.

:::callout Nota
Un barbero con acceso ve solo sus propias citas por defecto, y puede cerrar sus caja al final del día. No ve la agenda de otros ni la configuración general.
:::

## Reglas de comisión

En la sección **Sueldo y comisiones** defines cómo cobra:

- **Fijo mensual** (sueldo)
- **Comisión por servicio** (porcentaje o monto)
- **Comisión por productos** (porcentaje de venta)
- **Mezcla**: sueldo base + comisión sobre el excedente

Puedes usar el modelo que ya usas hoy. El sistema calcula todo automáticamente al cierre de mes.`,
  },

  {
    id: 'comisiones-de-tu-equipo', slug: 'comisiones-de-tu-equipo',
    titulo: 'Comisiones de tu equipo',
    deck: 'Cómo se calculan y cómo revisar cuánto gana cada barbero al final del mes.',
    categoriaId: 'equipo-roles', categoriaSlug: 'equipo-roles',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 2,
    tags: ['comisiones', 'sueldos'],
    contenidoMd: `Cada vez que un barbero completa un servicio, el sistema calcula la comisión automáticamente según la regla que definiste en su ficha.

## Modelos de comisión soportados

**Comisión pura por servicio** — un porcentaje sobre el precio del servicio. Ejemplo: 50% de cada corte. Bien para independientes que solo cobran lo que producen.

**Sueldo fijo + comisión sobre excedente** — un fijo mensual, y encima de un umbral, comisión. Ejemplo: sueldo $400.000 + 30% sobre lo que supere $800.000 en el mes. Bien para dar estabilidad + incentivo.

**Comisión por producto vendido** — porcentaje sobre cada producto que recomiende y venda. Suele ser 10-20%.

## Ver las comisiones del mes

Ve a **Comisiones** en el menú lateral. Verás una tabla con:

- Cada barbero
- Total de servicios completados
- Ingresos brutos generados
- Comisión calculada según su regla
- Sueldo base (si aplica)
- Total a pagar

![Vista de comisiones mensuales](placeholder: Captura de /comisiones mostrando la tabla con los barberos, sus totales del mes y el cálculo automático de comisión)

## Cambiar la regla a mitad de mes

Si cambias la regla de comisión un 15 del mes, el cambio se aplica **desde ese día en adelante**. Los servicios anteriores mantienen la regla original. Así no hay conflictos ni renegociaciones incómodas.

:::callout Tip
Al cierre de mes, exporta la tabla en PDF para tener respaldo escrito. Se genera con el logo del local y sirve como comprobante para tu contabilidad.
:::

## Descuentos que no cuentan para la comisión

Cuando aplicas descuentos manuales a un cliente (por ejemplo, 30% off para un amigo), tienes la opción de marcar "**no descontar de la comisión del barbero**". El barbero cobra sobre el precio original.

Esto es importante para no penalizar al equipo por decisiones comerciales tuyas.`,
  },

  {
    id: 'roles-admin-jefe-y-barbero', slug: 'roles-admin-jefe-y-barbero',
    titulo: 'Roles: admin, jefe y barbero',
    deck: 'Qué puede hacer cada uno. Elige bien el rol al dar acceso a alguien.',
    categoriaId: 'equipo-roles', categoriaSlug: 'equipo-roles',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 3,
    tags: ['roles', 'permisos'],
    contenidoMd: `Cuando le das acceso a alguien al panel, eliges uno de estos 3 roles. Es importante — un rol equivocado da demasiado poder o no deja hacer lo básico.

## Barbero

**Ve:**
- Su propia agenda del día
- Sus propias citas y clientes
- Sus propias comisiones y estadísticas
- Ficha completa de cualquier cliente que él haya atendido

**No ve:**
- Agendas de otros barberos
- Comisiones del resto del equipo
- Configuración del local
- Facturación y contabilidad

**Ideal para:** todos los barberos. Es el rol por defecto.

## Jefe

**Ve todo lo del barbero + además:**
- Toda la agenda del local
- Clientes de todos los barberos
- Métricas totales del local
- Puede editar y crear citas de cualquier barbero

**No ve:**
- Configuración de sueldos y comisiones
- Facturación electrónica
- Datos financieros globales
- No puede cambiar quién es admin

**Ideal para:** encargado del local, mano derecha del dueño.

## Admin

**Todo.** Equivalente al dueño. Puede cambiar configuraciones, dar acceso a otros, ver facturación, cambiar reglas de comisión, y hasta eliminar el local si quisiera.

**Solo debe haber 1-2 admins.** Todos los demás son jefes o barberos.

![Selector de rol en la sección de acceso al panel web](placeholder: Captura del formulario de habilitar acceso mostrando el selector desplegado con las 3 opciones: Barbero, Jefe, Admin)

:::callout Importante
Cambiar el rol de alguien es un cambio real y grande. Si le subes a admin a alguien de tu equipo, puede modificar la configuración de todo el local. Piénsalo bien antes.
:::

## Cambiar el rol de alguien después

Ve a **Equipo**, abre la ficha, y en "Acceso al panel web" verás el rol actual con la opción de cambiarlo. Al guardar, el cambio es inmediato — la próxima vez que la persona abra el panel, verá los permisos nuevos.`,
  },

  // ═════════════════ PAGOS Y CAJA ═════════════════
  {
    id: 'cerrar-caja-al-final-del-dia', slug: 'cerrar-caja-al-final-del-dia',
    titulo: 'Cerrar caja al final del día',
    deck: 'Contar la plata del día, verificarla contra el sistema y guardar el registro.',
    categoriaId: 'pagos-caja', categoriaSlug: 'pagos-caja',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 1,
    tags: ['caja', 'cierre'],
    contenidoMd: `El cierre de caja es el ritual del final del día. Sirve para tres cosas:

1. Saber cuánto se hizo hoy
2. Detectar diferencias entre lo cobrado y lo registrado
3. Tener un histórico para tus impuestos

## Cómo funciona

Ve a **Caja** en el menú lateral y toca **"Abrir cierre de hoy"**. Verás:

- Total de citas completadas hoy
- Ingresos por método de pago (efectivo, débito, crédito, transferencia)
- Productos vendidos
- Propinas registradas
- Gastos que salieron de caja durante el día

![Pantalla de cierre de caja](placeholder: Captura de /caja mostrando la vista de cierre con los totales por método de pago y el input para ingresar el "efectivo real contado")

Al final, el sistema te muestra el **total esperado**. Tú cuentas la plata física y escribes el **total real contado**. Si hay diferencia, el sistema te avisa y puedes anotar el motivo (ej: "faltaron $2000, cliente pagó justo con tarjeta y no lo registré").

## Cerrar el día

Al confirmar el cierre:

- La caja queda **bloqueada** — no se pueden agregar más movimientos con fecha de hoy
- Se genera un ticket de resumen (imprimible o PDF)
- Los datos entran al histórico

:::callout Nota
Un cierre bloqueado NO significa que no puedas ver el detalle después. Solo evita modificaciones. Si necesitas cambiar algo, contacta a soporte y lo desbloqueamos.
:::

## Ver histórico de cierres

En la misma vista de **Caja**, tienes acceso al histórico completo por día, semana o mes. Útil para reportes y para dar seguimiento a diferencias que puedan ser señales de algo (robo, error humano recurrente).

## Registrar gastos que salen de caja

Si durante el día pagas cuentas con la plata de la caja (café para el equipo, insumos), regístralos en **Gastos** al momento. Al cierre, el sistema ya los contabiliza en el neto.`,
  },

  {
    id: 'activar-cobros-con-mercado-pago', slug: 'activar-cobros-con-mercado-pago',
    titulo: 'Activar cobros online con Mercado Pago',
    deck: 'Conecta tu cuenta de Mercado Pago y empieza a cobrar seña o el total al reservar.',
    categoriaId: 'pagos-caja', categoriaSlug: 'pagos-caja',
    autor: AUTOR, tiempoLectura: 4, publicado: true, destacado: false, orden: 2,
    tags: ['mercadopago', 'pagos-online'],
    contenidoMd: `Cobrar por adelantado tiene un impacto enorme: los no-shows caen 80% y el flujo de caja se estabiliza. Con Mercado Pago la integración es directa.

## Requisitos

- Cuenta activa en Mercado Pago Chile
- Tu RUT/DNI a nombre del dueño
- Datos bancarios para retirar la plata

## Cómo conectar

Ve a **Recibir Pagos** en el menú lateral. Toca **"Conectar Mercado Pago"**. Te redirige a Mercado Pago para iniciar sesión y autorizar la conexión. Al volver, tu cuenta ya está enlazada.

![Pantalla de conexión con Mercado Pago](placeholder: Captura de /recibir-pagos mostrando el botón "Conectar Mercado Pago" y el estado de conexión — antes y después)

## Definir la política de cobro

Elige entre 3 opciones:

**Cobrar el total al reservar** — el cliente paga todo al confirmar. Ideal para servicios cortos donde no hay negociación posterior.

**Cobrar seña (30-50% del total)** — el cliente paga una parte al reservar, el resto al llegar. Balancea compromiso del cliente sin exigirle el pago completo por adelantado.

**Sin cobro online (solo reserva)** — el cliente reserva sin pagar. El pago se hace en el local. Menos fricción para reservar, pero más no-shows.

## Cuánto se demora la plata en llegar

- Pagos con tarjeta de débito → 24 hrs hábiles
- Pagos con tarjeta de crédito → 21 días (o al instante con MercadoPago Point)
- Transferencia → al instante

Puedes ver el detalle de retiros y su estado desde tu cuenta de Mercado Pago.

:::callout Costo
Mercado Pago cobra una comisión por transacción (~3.5% con débito, ~4-5% con crédito según convenio). Ese costo lo pagas tú, no se traspasa al cliente.
:::

## Reembolsos

Si un cliente cancela y quieres devolverle, puedes hacer el reembolso desde el detalle de la cita en el panel. El sistema se conecta con Mercado Pago y devuelve la plata a la tarjeta original en 1-3 días hábiles.`,
  },

  {
    id: 'registrar-gastos-del-local', slug: 'registrar-gastos-del-local',
    titulo: 'Registrar gastos del local',
    deck: 'Todos los gastos que salgan de tu caja o cuenta, categorizados. Te sirven para saber rentabilidad real.',
    categoriaId: 'pagos-caja', categoriaSlug: 'pagos-caja',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 3,
    tags: ['gastos', 'contabilidad'],
    contenidoMd: `El error clásico de muchas barberías: mirar la caja del día y creer que todo son ingresos. Pero de esos ingresos salen arriendo, sueldos, luz, insumos... El neto real puede ser mucho menos.

## Cómo registrar un gasto

Ve a **Gastos** en el menú lateral y toca **"+ Nuevo gasto"**. Llena:

- **Descripción** — qué compraste ("Cera para el mes", "Reparación silla 2")
- **Categoría** — arriendo, insumos, sueldos, servicios básicos, marketing, otros
- **Monto**
- **Fecha**
- **Método de pago** — efectivo (sale de caja), transferencia, tarjeta

![Formulario de nuevo gasto](placeholder: Captura del formulario de nuevo gasto en /gastos con los campos descripción, categoría, monto y método de pago)

## Gastos recurrentes

Para gastos fijos que se repiten cada mes (arriendo, luz, internet), márcalos como **"recurrente"**. El sistema te recuerda cargarlos cada mes y hasta puede sugerir el monto habitual.

## Ver el impacto en la rentabilidad

En **Finanzas** ves un resumen del mes:

- Ingresos totales
- Gastos totales por categoría
- Margen neto (ingresos - gastos)
- Comparación con meses anteriores

Ahí es donde ves si el negocio está creciendo, estable o cayendo — más allá del efectivo diario.

:::callout Tip
Cuanto más disciplinado seas cargando gastos, más útil es la vista de Finanzas. Sugerencia: al final de cada semana, dedica 10 minutos a cargar los gastos de esa semana. En un mes, tienes datos reales.
:::

## Exportar para tu contador

Al final del mes puedes exportar todos los gastos en Excel o PDF, con los datos que tu contador necesita para declarar. Se genera con los códigos categorizados y los métodos de pago.`,
  },

  {
    id: 'entender-tus-metricas', slug: 'entender-tus-metricas',
    titulo: 'Entender tus métricas',
    deck: 'Qué mirar cada semana para saber si tu negocio va bien, mal o estancado.',
    categoriaId: 'pagos-caja', categoriaSlug: 'pagos-caja',
    autor: AUTOR, tiempoLectura: 4, publicado: true, destacado: false, orden: 4,
    tags: ['metricas', 'analytics'],
    contenidoMd: `Muchos dueños de barberías miran la agenda y creen que con eso alcanza. Pero las métricas cuentan otra historia: cuánto crece, quiénes vuelven, dónde pierdes plata.

## Las 5 métricas que sí importan

Ve a **Métricas** en el menú lateral. Verás un dashboard con:

### 1. Ingresos vs. mes anterior

Compara este mes con el anterior en la misma etapa (día 10 con día 10, no el total del mes cerrado). Ver si vas arriba o abajo del ritmo.

### 2. Ticket promedio

Cuánto gasta el cliente promedio cada vez. Si sube, es señal que tus productos y cross-sell funcionan. Si baja, hay que revisar mix.

### 3. Frecuencia de visita

Cada cuánto vuelve el cliente promedio. Si un cliente venía cada 25 días y ahora viene cada 45, algo está pasando (competencia, precio, calidad).

### 4. Clientes nuevos vs. recurrentes

Un negocio sano tiene ambos: nuevos (30-40%) y recurrentes (60-70%). Solo nuevos = alto costo de adquisición, poca fidelización. Solo recurrentes = te vas quedando sin base.

### 5. Ocupación de la agenda

Qué porcentaje de tus horas disponibles se llenan. Si estás sobre 80%, es momento de subir precios o contratar. Si estás bajo 40%, hay que trabajar en atraer más clientes.

![Dashboard de métricas](placeholder: Captura de /metricas mostrando el dashboard con los KPIs principales — ingresos del mes, ticket promedio, ocupación y comparación con mes anterior)

## Métricas por barbero

En la misma vista, filtra por barbero para ver el rendimiento individual. Útil para conversaciones honestas con el equipo — "estás cerrando mucho menos servicios que el promedio, ¿pasa algo?".

## Alertas automáticas

El sistema te avisa cuando detecta algo preocupante:

- **Clientes en riesgo** — llevan más días de lo habitual sin venir
- **Caída de reservas** — un día específico tiene mucha menos ocupación que su promedio
- **Barbero con caída** — su rendimiento cae más de 30% vs. su histórico

Estas alertas aparecen en la vista **Inicio** cada mañana.

:::callout Consejo
No mires métricas todos los días — te confunde el ruido diario. Mira los KPIs una vez por semana (el lunes por la mañana funciona bien) y las tendencias mensuales el primer día de cada mes.
:::`,
  },

  // ═════════════════ FIDELIZACIÓN (ampliar) ═════════════════
  {
    id: 'motor-de-packs', slug: 'vender-packs-a-tus-clientes',
    titulo: 'Vender packs a tus clientes',
    deck: 'Cobra varios cortes juntos con descuento y asegúrate de que el cliente vuelva. La plataforma lleva la cuenta por ti.',
    categoriaId: 'fidelizacion', categoriaSlug: 'fidelizacion',
    autor: AUTOR, tiempoLectura: 4, publicado: true, destacado: true, orden: 1,
    pedidoPor: { etiqueta: 'Salón boutique · Viña', region: 'V-Región' },
    tags: ['packs', 'fidelizacion', 'cuponeras'],
    contenidoMd: `Un pack es una **cuponera prepagada**. En vez de venderle a Juan un corte hoy, le vendes cuatro cortes juntos con un pequeño descuento. Juan paga una sola vez y viene cuatro veces. Tú te aseguras cuatro visitas garantizadas.

La plataforma se encarga de recordar cuántas visitas le quedan y cuándo se vence el pack. Cero libretas de papel, cero errores.

## Cuándo conviene ofrecer packs

- Clientes que ya vienen seguido (el descuento es pequeño para ti, el compromiso es grande para ellos)
- Servicios de mantenimiento (barba, tinte, uñas)
- Temporada baja: prevendes visitas para meses con menos flujo
- Amortizar productos caros (mascarillas capilares, tratamientos)

![La pantalla de servicios donde se crea un pack](placeholder: Captura de /servicios en el panel, específicamente el toggle "Este servicio es un pack" con los campos "Sesiones incluidas" y "Vigencia días" visibles)

## Cómo crear un pack

1. Ve a **Servicios** en el panel y crea un servicio nuevo, por ejemplo "Corte Mensual".
2. Activa el toggle **"Este servicio es un pack / combo"**.
3. Escribe cuántas sesiones incluye (por ejemplo, **4**) y en cuántos días vence (por ejemplo, **60**).
4. Marca qué servicios cubre cada sesión (por ejemplo, "Corte de pelo" y "Corte + Barba").
5. Ponle un precio con descuento — si un corte suelto cuesta $12.000, el pack de 4 puede costar $40.000 en vez de $48.000.

Guarda. Ese pack ya aparece en la agenda pública para tus clientes.

## Cómo se activa un pack

Juan reserva "Corte Mensual" en tu sitio y viene a su primera cita. Cuando la marcas como **Completada** en la agenda, aparece este aviso:

![Modal de activación del pack](placeholder: Screenshot del modal "📦 Activar pack" que aparece al completar una cita de tipo pack. Debe mostrar el resumen "Se activará el pack X para Juan. Quedarán 3 sesiones")

Confirmas, y el pack queda activo para Juan. Le quedan **3 sesiones** disponibles. La plataforma le mostrará un aviso arriba en tu agenda pública la próxima vez que él entre a reservar.

## Cómo se usa un pack

Juan vuelve al mes. Cuando entra a tu sitio a reservar, ve este banner:

![Banner de pack activo en el sitio del cliente](placeholder: Captura del banner morado "Tienes un pack activo — Te quedan 3 de 4 sesiones · Usar sesión →" que aparece arriba de los servicios en la agenda pública)

Toca "Usar sesión", elige la hora, y su reserva queda con precio **$0**. Cuando vengas a completar esa cita, la plataforma te muestra que es prepagada — no hay que cobrar nada.

:::callout Nota
En la agenda ves un badge morado "PREPAGADO · Sesión 2 de 4". Si el pack está por vencer (menos de 3 días), el badge cambia a rojo. Así sabes de un vistazo qué citas son cortesía y cuáles urgen.
:::

## Y si el cliente compra en el local, sin reservar

Común: alguien pasa por el salón y dice "quiero pagar 4 cortes juntos". Ve a la ficha del cliente en **Clientes**, y arriba tienes el botón **"+ Vender pack"**:

![Botón "Vender pack" en la ficha del cliente](placeholder: Captura de la ficha del cliente en /clientes con el bloque "Packs activos" visible y el botón verde "+ Vender pack" en la esquina superior derecha)

Eliges el pack, el método de pago, y listo. El cliente queda con las 4 sesiones disponibles desde ese momento, sin necesidad de agendar cita hoy.

## Devolver una sesión si algo salió mal

A veces marcas una cita como completada por error. O el cliente no llegó pero descontaste la sesión. Desde su ficha, en el bloque de packs activos, tienes el botón **"Devolver 1 sesión"**:

![Botón devolver sesión](placeholder: Captura de la ficha del cliente con el pack activo expandido — mostrar la barra de progreso y el botón "↺ Devolver 1 sesión" abajo a la derecha del card)

Devuelve el saldo instantáneamente. Y queda registrado — si el cliente pregunta, tienes el historial completo.

## Avisos automáticos

Si a un cliente le quedan sesiones pero el pack está por vencer, la plataforma **le manda un push 3 días antes**. No tienes que acordarte. El cliente ve algo como:

> _"Juan, te quedan 2 sesiones de tu Corte Mensual y vencen el jueves. Reserva ahora."_

Con eso recuperas gente que se olvidó y evitas reclamos.`,
  },

  {
    id: 'sistema-de-sellos-y-premios', slug: 'sistema-de-sellos-y-premios',
    titulo: 'Sistema de sellos y premios',
    deck: 'Cada visita suma un sello. Al juntar cierta cantidad, el cliente canjea un premio. La versión digital de la tarjetita perforada.',
    categoriaId: 'fidelizacion', categoriaSlug: 'fidelizacion',
    autor: AUTOR, tiempoLectura: 4, publicado: true, destacado: false, orden: 2,
    tags: ['sellos', 'premios', 'fidelizacion'],
    contenidoMd: `El sistema de sellos es la versión digital de la tarjetita perforada de siempre. Sin plástico, sin perder, sin olvido. Cada vez que un cliente completa una visita, gana automáticamente un sello. Cuando junta X sellos, canjea un premio que tú definiste.

## Cómo se ganan los sellos

**Automático:** cada cita marcada como **Completada** suma 1 sello al cliente. Simple.

**Manual:** desde la ficha del cliente puedes sumar sellos manuales (por ejemplo, si compró un producto grande, o para premiar una recomendación).

Los sellos son **por local** — si tienes multi-sede, se comparten entre sucursales.

## Configurar tus premios

Ve a **Premios** en el menú lateral. Toca **"+ Nuevo premio"**. Define:

- **Nombre** — "Corte gratis", "50% off en tinte"
- **Costo en sellos** — cuántos sellos necesita el cliente para canjearlo (típicamente 8-10)
- **Descripción** — para que quede claro qué gana

![Configuración de un premio](placeholder: Captura de /premios mostrando el formulario de nuevo premio con nombre, costo en sellos y descripción)

## Cómo canjea el cliente

En su dashboard (mi tarjeta de fidelidad), el cliente ve todos los premios disponibles y cuántos sellos le faltan para cada uno. Cuando tiene los sellos, aparece un botón **"Canjear"**.

Al tocarlo, se le muestra un código único que debe compartirte al llegar al local. Tú ingresas el código en el panel y el premio queda aplicado (descuenta los sellos del saldo).

![Vista de canje con código](placeholder: Captura del modal de canje en el dashboard del cliente, mostrando el código único y la advertencia "muéstralo al local")

## Ver el historial de canjes

En **Canjes** ves todos los premios canjeados con fecha, cliente y barbero que lo aplicó. Sirve para entender qué premios funcionan y cuáles no atraen.

:::callout Estrategia
Ponle a los premios un **costo razonable**. Si necesitan 20 sellos para "corte gratis" y el cliente ya viene cada 30 días, tardan un año en llegar y pierden interés. 8-10 sellos es un buen punto: alcanzable pero no regalado.
:::

## Bonus de cumpleaños

Puedes configurar que cada cliente reciba automáticamente 1 sello el día de su cumpleaños. Detalle pequeño, impacto grande — hace sentir al cliente que lo recuerdas.

Ve a **Configuración → Sellos** y activa "**Sello de cumpleaños**".`,
  },

  {
    id: 'rangos-silver-gold-platinum', slug: 'rangos-silver-gold-platinum',
    titulo: 'Rangos Silver, Gold y Platinum',
    deck: 'A medida que un cliente vuelve más, sube de rango y desbloquea beneficios automáticos. Diferenciación real para tus mejores clientes.',
    categoriaId: 'fidelizacion', categoriaSlug: 'fidelizacion',
    autor: AUTOR, tiempoLectura: 4, publicado: true, destacado: false, orden: 3,
    tags: ['rangos', 'tiers'],
    contenidoMd: `Los sellos suben cada visita. Los **rangos** clasifican al cliente según cuántos sellos ha juntado en total desde que empezó. Es una forma de decirle "eres uno de mis clientes fieles" sin que él tenga que hacer nada.

## Los 3 rangos

**Silver** — nivel base. Todos los clientes empiezan aquí. Sin condiciones.

**Gold** — desbloqueado al llegar a cierto umbral (por defecto 15 sellos históricos). Le da acceso a beneficios superiores.

**Platinum** — el nivel más alto (por defecto 30 sellos históricos). Es tu top-tier: los que llevan años contigo.

![Los 3 rangos en el dashboard del cliente](placeholder: Captura del dashboard del cliente mostrando su rango actual — un badge que dice "Gold" con un progreso hacia Platinum)

## Qué beneficios da cada rango

Tú los defines. Ve a **Rangos** en el menú lateral. Para cada rango puedes activar:

- **Sellos automáticos al pagar** — descuento en sellos (ej: Gold gana 2 sellos por visita en vez de 1)
- **Descuento porcentual en agenda pública** — 10% off automático al reservar
- **Prioridad en horarios de alta demanda** — reserva antes que otros (VIP horarios)
- **Regalos en cumpleaños** — un corte gratis, un producto de regalo

Los primeros dos (sellos por rango y descuento en agenda) se aplican automáticamente. Los demás son "informativos" — comunican al cliente que tiene el beneficio pero tú los ejecutas manualmente.

:::callout Bien pensado
Los umbrales por defecto (15 y 30 sellos) los puedes ajustar según tu negocio. Si un cliente promedio viene cada 30 días, 15 sellos = ~1.5 años. Si es demasiado, bájalos.
:::

## Cómo se muestra al cliente

En su dashboard, el cliente ve su rango actual con un badge claro, y el progreso hacia el siguiente. Ejemplo: "Silver · Te faltan 3 sellos para llegar a Gold".

Es motivador — como los niveles de un juego. Muchos clientes agendan solo para subir de rango.

## Rango + sellos: cómo trabajan juntos

- **Sellos** son la moneda: se ganan con visitas, se gastan en premios
- **Rango** es el estatus: se calcula sobre el TOTAL histórico de sellos ganados (nunca baja)

Un cliente Platinum que canjeó todos sus sellos sigue siendo Platinum — el rango premia el compromiso histórico, no el saldo del momento.`,
  },

  {
    id: 'gift-cards-como-regalo', slug: 'gift-cards-como-regalo',
    titulo: 'Gift cards como regalo',
    deck: 'Vende gift cards de tu local. Alguien las regala a otro, y el receptor las canjea por servicios. Nueva fuente de ingresos.',
    categoriaId: 'fidelizacion', categoriaSlug: 'fidelizacion',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 4,
    tags: ['gift-cards', 'regalo'],
    contenidoMd: `Un cliente feliz quiere regalarle a su hermana un corte contigo. Con gift cards, le vendes un código de $30.000, ella se lo pasa a su hermana, y la hermana viene a canjearlo. Todos ganan.

## Vender una gift card

Ve a **Gift Cards** en el menú lateral y toca **"+ Vender gift card"**. Define:

- **Monto** — $10.000, $30.000, $50.000 (o el que quieras)
- **Vigencia** — típicamente 6 o 12 meses desde la venta
- **Comprador** — nombre y método de pago (para tu registro)
- **Mensaje opcional** — un texto personalizado que aparece cuando el receptor la ve

![Formulario de venta de gift card](placeholder: Captura del formulario de venta de gift card mostrando los campos monto, vigencia, datos del comprador y mensaje personalizado)

Al guardar, el sistema genera un **código único de 8 caracteres** que el comprador puede compartir con quien quiera.

## Cómo se canjea

El receptor entra a tu sitio a reservar. En el último paso (confirmar), aparece un campo **"Tengo un código de gift card"**. Ingresa el código, y el precio del servicio se descuenta del saldo de la gift card automáticamente.

Si el servicio cuesta menos que el saldo, el resto queda disponible para usos futuros. Si cuesta más, el receptor paga la diferencia.

:::callout Marketing
Gift cards son excelente contenido para redes: "Regala una experiencia, no cosas". Aumentan las ventas de diciembre (navidad) y mayo (día de la madre) especialmente.
:::

## Ver gift cards emitidas

En la misma vista de **Gift Cards** tienes el histórico:

- Emitidas (activas + canjeadas + expiradas)
- Saldo restante en las activas
- Quién canjeó qué

Si una gift card está por vencer, puedes contactar al comprador (o receptor si lo conoces) para avisarle antes que se pierda.

## Regla útil: gift card sin caducidad

En la mayoría de países, gift cards con vencimiento están reguladas por ley. Revisa la regulación en tu país — muchos permiten vencimiento pero requieren informarlo claramente al comprador. En Chile, la ley del consumidor permite fechas de vencimiento razonables (mínimo 6 meses).`,
  },

  // ═════════════════ MARKETING (ampliar) ═════════════════
  {
    id: 'como-llegaste-modulo-aura', slug: 'saber-de-donde-vienen-tus-clientes',
    titulo: 'Saber de dónde vienen tus clientes',
    deck: 'Le preguntas al cliente cómo te conoció cuando reserva. Al mes ves si tu inversión en Instagram o en Google está funcionando.',
    categoriaId: 'marketing', categoriaSlug: 'marketing',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: true, orden: 1,
    pedidoPor: { etiqueta: 'Barbería · V-Región', region: 'V-Región' },
    tags: ['marketing', 'metricas'],
    contenidoMd: `Le pagas $200.000 al mes a Instagram para pautar. Otro tanto a Google Ads. Y no sabes cuál te trae más clientes reales. Lo peor: no sabes cuánto de ese dinero es tirado a la basura.

Este módulo lo resuelve preguntando directamente a cada cliente nuevo cómo llegó a ti — en el mismo momento en que reserva.

## Cómo se ve para el cliente

Cuando alguien nuevo termina de agendar en tu sitio, aparece este modal:

![Modal de "¿Cómo llegaste?"](placeholder: Screenshot del modal de AURA que aparece post-reserva. Debe mostrar las 4 opciones con emojis: "📸 Por un anuncio en Instagram", "👥 Por una recomendación", "🔍 Por Google", "💬 Otra razón". Y el botón oscuro "Confirmar y reservar")

El cliente toca una opción y confirma. Toma 2 segundos.

Si eligió "Otra razón", puede escribir libremente. Ahí es donde aparecen los canales que no habías considerado: "Un flyer en la calle", "Mi vecina", "Vi la vitrina pasando", "TikTok".

## Configuración desde el panel

Vas a **Fidelización → AURA** en el panel y controlas:

- **Activar / desactivar** el módulo en cualquier momento
- **Obligatorio o no** — con obligatorio, el cliente no puede terminar la reserva sin responder
- **Qué opciones mostrar** — puedes quitar Google si nunca pagas Google Ads
- **El orden** — pon primero la opción que más te importa medir
- **Nuevas opciones** — agrega "TikTok" si notas que muchos escriben eso en "Otra razón"

![Panel de configuración del módulo](placeholder: Captura de /gestion-interna/aura mostrando la sección "Opciones" con las 4 opciones default, con los toggles ON/OFF y las flechas para reordenar visibles)

:::callout Nota
Empieza con la opción **no obligatoria** los primeros días. Si un cliente ve el modal y no lo entiende, mejor que igual reserve. Después de una semana con datos, puedes hacerla obligatoria.
:::

## Los resultados

Abajo del panel de configuración tienes las métricas en vivo:

![Gráfico de resultados del módulo](placeholder: Captura de la sección "RESULTADOS" mostrando "N respuestas totales" con la distribución por opción — barras horizontales de colores mostrando el % de cada canal)

Ves cuántas respuestas tienes esta semana, este mes, o los últimos 90 días. La distribución por canal. Y las respuestas escritas a mano (las de "Otra razón") las puedes expandir para leerlas — ahí están los tesoros escondidos.

## Un ejemplo real

Un salón activó el módulo. En una semana descubrió que:

- **60%** venía por recomendación (no por sus anuncios)
- **25%** por Google
- **10%** por Instagram (donde gastaba más)
- **5%** de "Otra razón" — la mayoría escribió "flyer en la vitrina"

Al mes bajó el gasto en Instagram, lo redirigió a incentivar recomendaciones (regalando un corte gratis por cada amigo referido), y multiplicó por 3 su llegada de clientes nuevos con el mismo presupuesto.`,
  },

  {
    id: 'enviar-anuncios-push-a-clientes', slug: 'enviar-anuncios-push-a-clientes',
    titulo: 'Enviar anuncios push a tus clientes',
    deck: 'Notificaciones al celular de tus clientes con promos, avisos o novedades. Segmentables y con métricas de apertura.',
    categoriaId: 'marketing', categoriaSlug: 'marketing',
    autor: AUTOR, tiempoLectura: 4, publicado: true, destacado: false, orden: 2,
    tags: ['push', 'anuncios'],
    contenidoMd: `Los push notifications son mensajes cortos que llegan al celular del cliente directamente. A diferencia de un email o un WhatsApp, aparecen en la pantalla de bloqueo — tienen ~90% de tasa de apertura.

## Cuándo usarlos

- Promo del día (25% off este lunes)
- Aviso puntual ("Cerramos temprano este viernes")
- Novedad ("Nuevo servicio: masaje capilar")
- Recuperación ("Hace 45 días no vienes, te esperamos")

**No usarlos para:** todos los días. La gente los silencia rápido. Usa con criterio — 1-2 por semana es lo ideal.

## Cómo enviar uno

Ve a **Anuncios** en el menú lateral. Toca **"+ Nuevo anuncio"**. Define:

- **Título** (máx 60 caracteres) — lo primero que ve el cliente
- **Cuerpo** (máx 180 caracteres) — el mensaje
- **Enlace opcional** — si tocan el push, van a esa URL (ej: agenda para reservar)

![Formulario de nuevo anuncio push](placeholder: Captura de /anuncios mostrando el formulario de nuevo anuncio con título, cuerpo, enlace y el selector de segmento)

## Segmentar (a quién enviar)

Para no molestar a todo el mundo con lo mismo, puedes filtrar por:

- **Todos** — a todo tu base
- **Rango específico** — solo Gold+, solo Platinum
- **Días sin visitar** — solo los que llevan más de N días
- **Servicio específico** — solo los que han pedido "Tinte" en los últimos 90 días
- **Género** — mujer, hombre, todos

Bien segmentado, tus mensajes se vuelven relevantes. "Promo tintes -20% este martes" a los clientes de tinte específicamente = alta conversión.

## Previsualización antes de enviar

Antes de enviar, el sistema te muestra cuántos clientes coinciden con tu segmento. Si dice "0 clientes", revisa tus filtros — probablemente combinaste condiciones que no aplican a nadie.

:::callout Tip
Envíalos en horario laboral (10am - 7pm). Un push que llega a las 3am molesta y gana bloqueos.
:::

## Métricas de resultado

Cada anuncio tiene 3 números que importan:

- **Enviados** — a cuántos llegó
- **Abiertos** — cuántos tocaron el push
- **Conversiones** — cuántos terminaron reservando en las siguientes 24hrs

Una buena tasa de apertura es >50%. Una buena tasa de conversión es >10%. Si tus números son mucho menores, revisa el mensaje — probablemente no es relevante o el timing es malo.

## Opt-out del cliente

En su dashboard el cliente puede desactivar las notificaciones si le molestan. Ese opt-out se respeta — no lo puedes forzar. Por eso es tan importante mandar solo mensajes valiosos.`,
  },

  {
    id: 'recuperar-clientes-que-no-vienen', slug: 'recuperar-clientes-que-no-vienen',
    titulo: 'Recuperar clientes que dejaron de venir',
    deck: 'Un cliente que venía cada 30 días ahora no viene hace 60. Con estas acciones puedes recuperar a 20-30% de ellos.',
    categoriaId: 'marketing', categoriaSlug: 'marketing',
    autor: AUTOR, tiempoLectura: 4, publicado: true, destacado: false, orden: 3,
    tags: ['recuperacion', 'churn'],
    contenidoMd: `Un cliente perdido cuesta 5-7 veces más recuperarlo que atraer uno nuevo. Pero también es más fácil que un cliente nuevo. Aquí las acciones que funcionan.

## Detectar a los que se están yendo

Ve a **Clientes → filtro "En riesgo"**. Ves una lista de clientes que:

- Venían con cierta regularidad
- No aparecen hace más días de lo habitual
- El sistema calcula quiénes están en riesgo real vs. quienes simplemente cambiaron de ritmo

![Filtro "En riesgo" en clientes](placeholder: Captura de /clientes con el filtro "En riesgo" activo, mostrando 5-6 clientes con días desde última visita y su historial resumido)

## Segmentar por gravedad

- **Grado 1 (15-30 días extra):** aún activos, un pequeño empujón basta
- **Grado 2 (31-60 días extra):** dudan. Necesitan una razón
- **Grado 3 (61+ días):** perdidos. La ofertas más agresivas

## Acciones por grado

### Grado 1 — Push con recordatorio suave

Un push simple: "Juan, hace 45 días no vienes. Te esperamos cuando quieras." Sin oferta ni presión. Solo recordarle que existes.

### Grado 2 — WhatsApp personal + descuento pequeño

Un mensaje directo (no push masivo), personalizado: "Hola Pedro, te queríamos ver. Este mes tenemos 15% off en tu próximo corte, ¿te sirve alguna hora esta semana?"

Tasa de recuperación: 15-25%.

### Grado 3 — Oferta agresiva de reactivación

50% off en la próxima visita, o corte gratis, o un producto de regalo. La lógica: si no vienen, cero ingresos. Si vienen con 50% off, algo de ingreso + posibilidad de fidelizarlos de nuevo.

Tasa de recuperación: 5-10%.

:::callout Importante
No hagas descuentos grandes constantes. Los clientes se acostumbran y esperan la oferta para venir. Usa las ofertas agresivas solo para grado 3.
:::

## Chatbot automático (opcional)

Puedes configurar un chatbot en WhatsApp que envía automáticamente los mensajes según la clasificación. Ve a **Chatbot** en el menú y activa "Recuperación automática de clientes".

Es "always-on" — trabaja mientras duermes. Pero recuerda revisar los mensajes que se generan de vez en cuando para asegurarte que suenan bien.`,
  },

  {
    id: 'resenas-en-google-de-tus-clientes', slug: 'resenas-en-google-de-tus-clientes',
    titulo: 'Reseñas en Google de tus clientes',
    deck: 'Cómo pedirlas sin ser pesado. Cada estrella nueva sube tu ranking y trae clientes nuevos.',
    categoriaId: 'marketing', categoriaSlug: 'marketing',
    autor: AUTOR, tiempoLectura: 4, publicado: true, destacado: false, orden: 4,
    tags: ['reseñas', 'google'],
    contenidoMd: `Un local con 50 reseñas y 4.7 estrellas convierte 3-4x más visitas a Google en reservas que un local con 5 reseñas y 3.8. Las reseñas son gratis, se acumulan, y actúan como marketing eterno.

## Configurar tu link de Google

Ve a **Configuración → Google Business**. Pega el link de tu ficha de Google Business (la URL que sale cuando alguien busca tu negocio en Maps). Guarda.

![Configuración del link de Google Business](placeholder: Captura de la sección de Google Business con el campo de "URL de tu ficha" y el botón "Guardar")

## El botón "Dejar reseña" en el dashboard

Después de que un cliente completa su cita, en su dashboard aparece un botón grande **"Deja tu reseña en Google"**. Se abre directamente al formulario de reseña, con tu ficha ya cargada.

Es la forma menos fricción posible — el cliente no tiene que buscar tu local, ni copiar el link. Un tap.

## El link de "solicitud rápida"

Alternativa: puedes generar un link para compartir por WhatsApp o email:

> "Hola Juan, gracias por venir. Nos encantaría saber cómo te fue. Cuéntanos: [link]"

El link abre un flujo simple: 1 tap para dar estrellas, luego se abre Google si dio 4-5 estrellas (positivos), o se abre un feedback privado si dio 1-3 (negativos). Los negativos van directo a ti, no se hacen públicos.

![Flujo del link de solicitud de reseña](placeholder: Captura del flujo /rate.html mostrando la pantalla de las 5 estrellas donde el cliente elige su nivel de satisfacción)

## Timing importa

El mejor momento para pedir la reseña es **1-2 horas después de la cita**, cuando el cliente aún tiene fresco el buen sabor y no está en el trabajo. Puedes configurar el envío automático en **Configuración → Automatizaciones**.

:::callout Consejo
NO pidas reseñas a todos los clientes. Selecciona los que sabes que estuvieron contentos — barberos que atendieron especialmente bien, clientes que llevaron amigos, etc. Piden reseñas selectivas evitan reseñas negativas por casualidad.
:::

## Responder reseñas

Cuando alguien deja una reseña (positiva o negativa), responde. Los usuarios que ven la ficha se fijan en si respondes.

- **Reseñas positivas** — agradece cortamente, mencionando algo específico ("Gracias María! El equipo se acuerda de tu peinado")
- **Reseñas negativas** — nunca pelees. Ofrece solucionar por privado. Muestra actitud profesional. Los futuros clientes ven cómo respondes ante quejas.

## Ver todas tus reseñas juntas

En **Reseñas** en el panel ves todas las reseñas de Google que tienes, con la posibilidad de responder desde ahí mismo (se sincroniza con Google). Útil para no perderse ninguna.`,
  },

  // ═════════════════ MULTI-SEDE (ampliar) ═════════════════
  {
    id: 'pool-fidelizacion-cross-sede', slug: 'compartir-clientes-entre-sucursales',
    titulo: 'Compartir clientes entre tus sucursales',
    deck: 'Un mismo cliente puede juntar sellos en cualquiera de tus locales y canjear su premio donde quiera. Sin listas separadas, sin líos.',
    categoriaId: 'multi-sede', categoriaSlug: 'multi-sede',
    autor: AUTOR, tiempoLectura: 4, publicado: true, destacado: true, orden: 1,
    pedidoPor: { etiqueta: 'Salón multi-sede · V-Región', region: 'V-Región' },
    tags: ['multi-sede', 'fidelizacion'],
    contenidoMd: `Pedro corta con nosotros en el local de Peñablanca. La próxima vez está de paso por Limache y quiere cortarse ahí. Nos gustaría que sea el mismo cliente para el sistema: que sus sellos, sus premios y su historial estén ahí sin importar a cuál local vaya.

Eso hace este modo — un solo **pool de clientes** compartido entre todas tus sucursales, con la agenda y el equipo de cada local por separado.

![Cliente entrando a un local distinto al usual](placeholder: Captura del panel superior con el selector de sede — mostrar cómo cambias entre "Peñablanca", "Limache" y "Woman" desde el mismo panel)

## Qué se comparte entre sucursales

- **La base de clientes** — Pedro es una sola persona para el sistema, no tres
- **Los sellos** — cortarse en Limache le suma sello igual que en Peñablanca
- **Los premios** — con 10 sellos puede canjear un corte gratis en cualquier sede
- **Los packs** — si compró un pack en Peñablanca, puede usar sesiones en Limache
- **Los rangos** — Silver, Gold, Platinum se calculan con TODAS sus visitas juntas
- **Los avisos push** — si le mandas una promo, la ve una sola vez (no una por sede)

## Qué queda por separado en cada sucursal

- **La agenda** — cada local tiene sus barberos y horarios propios
- **Los servicios y precios** — puedes cobrar distinto en cada sede
- **La caja** — cada local ve solo su plata del día
- **El equipo** — un barbero pertenece a una sede

![Ficha del cliente con historial cross-sede](placeholder: Screenshot de la ficha de un cliente en /clientes mostrando el detalle de "Última visita: Limache · hace 5 días" y sellos totales. Debe ser visible que los sellos se acumulan sin importar en qué sede)

## Cómo se ve en la práctica

Pedro corta en Peñablanca — sello +1. La próxima vez pasa por Limache — sello +1. En Woman también — otro sello. Al llegar a 10, el sistema le avisa: "Tienes un premio disponible para canjear". Y puede canjear en la sede que quiera.

Tú desde el panel ves todo el historial: qué sede visitó, con qué barbero, cuándo. La foto completa del cliente.

:::callout Nota
Los sellos siempre suman al **mismo** cliente sin importar la sede. El teléfono es el "ID" que une todo — así que la única regla es que el teléfono esté bien escrito.
:::

## ¿Y qué pasa si un cliente ya existía antes?

Si tenías clientes en cada sede por separado antes de activar este modo, se fusionan por teléfono. No pierdes historial. No hay que migrar nada manualmente.`,
  },

  {
    id: 'horarios-distintos-por-sede', slug: 'horarios-distintos-por-sede',
    titulo: 'Horarios distintos por cada sede',
    deck: 'Cada local tiene su propio horario. Un cambio en una sede no afecta a las demás.',
    categoriaId: 'multi-sede', categoriaSlug: 'multi-sede',
    autor: AUTOR, tiempoLectura: 3, publicado: true, destacado: false, orden: 2,
    tags: ['multi-sede', 'horarios'],
    contenidoMd: `Aunque las 3 sucursales son "el mismo negocio" desde el punto de vista del cliente, operacionalmente son independientes: pueden abrir a distintas horas, tener distintos servicios y precios.

## Cambiar entre sedes

En la barra superior del panel, ves el nombre de la sede actual. Toca ahí y aparece el selector con todas las sedes que administras. Cambias con un tap.

![Selector de sede](placeholder: Captura del selector de sede en la barra superior mostrando 3 opciones — Peñablanca (activa), Limache y Woman)

Todo lo que hagas después aplica solo a esa sede: configuración, agenda, equipo, caja.

## Horarios independientes

Cada sede tiene su propia configuración de horario semanal. Cambiar el horario de Peñablanca no afecta a Limache. Ve a **Configuración → Horarios** dentro de la sede que quieras editar.

## Servicios distintos por sede

En **Servicios**, la lista es local a cada sede. Puedes tener "Corte + Barba" en Peñablanca a $18.000 y en Limache a $15.000. Cada sede se administra sola.

Alternativa: si quieres que un servicio sea igual en todas, cárgalo por separado en cada sede con el mismo nombre y precio. No hay clonación automática.

## Equipo por sede

Cada barbero pertenece a **una sola sede**. Si tienes un barbero que trabaja en 2 sedes distintas, créalo dos veces (una en cada sede). Es un caso raro pero soportado.

:::callout Nota
Los clientes SÍ son compartidos entre sedes ([ver artículo](../multi-sede/compartir-clientes-entre-sucursales)). Pero el equipo y los servicios son por sede — así cada local tiene autonomía operativa.
:::

## Multi-usuario con distintos accesos por sede

Un admin de marca (dueño) tiene acceso a todas las sedes. Los barberos solo a la suya. Los jefes normalmente a una sola sede pero pueden tener acceso a más si el dueño lo permite.

Ve a **Equipo** en cada sede para gestionar sus accesos.`,
  },

];

// ── Ejecución ───────────────────────────────────────────────────
async function main() {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  // Doc contenedor
  batch.set(db.doc('_ayuda/global'), { updatedAt: now }, { merge: true });

  console.log(`Sembrando ${CATEGORIAS.length} categorías…`);
  for (const c of CATEGORIAS) {
    const ref = db.doc(`_ayuda/global/categorias/${c.id}`);
    batch.set(ref, {
      ...c,
      slug: c.slug || c.id,
      activo: true,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  console.log(`Sembrando ${ARTICULOS.length} artículos…`);
  for (const a of ARTICULOS) {
    const ref = db.doc(`_ayuda/global/articulos/${a.id}`);
    batch.set(ref, {
      ...a,
      entregadoEn: a.entregadoEn || AHORA(),
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  await batch.commit();
  console.log(`✓ Seed completado: ${CATEGORIAS.length} categorías + ${ARTICULOS.length} artículos.`);
  console.log('  Abre /gestion-interna/ayuda o /ayuda para verlo.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
