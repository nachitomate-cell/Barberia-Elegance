# App Review de Meta — permisos de Instagram para los locales

App: **SynapTech Look** · App ID `1709165137063526` · Instagram App ID `2103603593922045`

Objetivo: pasar de **acceso estándar** (solo la cuenta propia y las que tienen
un rol en la app) a **acceso avanzado**, que es lo que permite ofrecerle el
asistente de Instagram a los locales clientes.

---

## 1. Qué ya está listo

| Requisito | Estado |
|---|---|
| App en modo **Activo** | ✅ |
| Política de privacidad | ✅ https://empieza.synaptechspa.cl/privacidad.html |
| Términos del servicio | ✅ https://empieza.synaptechspa.cl/terminos-saas.html |
| **Eliminación de datos (callback)** | ✅ `https://us-central1-barberia-elegance.cloudfunctions.net/metaDataDeletion` |
| Webhook vivo y suscrito | ✅ `messages` + `comments` |
| Integración funcionando en producción | ✅ con @synaptechspa |

El callback de borrado verifica el `signed_request` con HMAC-SHA256, elimina el
hilo, la conversación con el bot, el lead y los comentarios de esa persona, y
deja asiento con el id **hasheado** en `eliminaciones_log`. Guard:
`npm run test:borrado`.

**Pegar el callback en:** Configuración de la app → Básica → *URL de devolución
de llamada de eliminación de datos*.

---

## 2. Permisos a solicitar

| Permiso | Para qué lo usamos |
|---|---|
| `instagram_business_manage_messages` | El asistente responde los mensajes directos del local y agenda citas. **Es el que importa.** |
| `instagram_business_manage_comments` | Responder comentarios y contestar por privado a quien deja una palabra clave. |
| `instagram_business_content_publish` | Publicar y programar fotos, reels e historias desde el panel del local. |
| `instagram_business_manage_insights` | Mostrarle al local sus métricas dentro del panel. |

`instagram_business_basic` ya funciona en estándar y no necesita revisión.

---

## 3. Textos para el formulario

Meta pregunta lo mismo por cada permiso. Estas respuestas son las que hay que
pegar. La regla de oro: **describir el beneficio para el usuario final**, no
para nosotros.

### `instagram_business_manage_messages`

> SynapTech Studio es una plataforma de agenda online para barberías, salones
> de belleza y centros de estética en Chile. Nuestros clientes son los dueños
> de esos negocios, que conectan su propia cuenta profesional de Instagram.
>
> Usamos este permiso para leer y responder los mensajes directos que reciben
> **en su propia cuenta**. Un asistente automático contesta las consultas más
> frecuentes (horarios, servicios, precios y disponibilidad) y agenda la cita
> directamente en el calendario del negocio, 24 horas al día.
>
> El beneficio para la persona que escribe es concreto: recibe respuesta
> inmediata a cualquier hora en vez de esperar al día siguiente, y puede
> reservar sin salir de Instagram. El beneficio para el negocio es no perder
> clientes por no alcanzar a responder mientras atiende.
>
> Solo accedemos a las conversaciones de las cuentas cuyos dueños autorizaron
> explícitamente la conexión mediante OAuth, y únicamente mientras esa
> autorización siga vigente. El dueño puede desactivar el asistente o
> desconectar la cuenta en cualquier momento desde su panel.

### `instagram_business_manage_comments`

> Lo usamos para que el negocio responda los comentarios de sus publicaciones
> desde el mismo panel donde gestiona su agenda, sin cambiar de aplicación.
>
> Además, cuando alguien comenta una palabra clave que el dueño configuró
> (por ejemplo "agenda"), le enviamos un mensaje privado con el enlace para
> reservar. Esto reemplaza el "comenta X y te escribo" que hoy los dueños hacen
> a mano, uno por uno.

### `instagram_business_content_publish`

> Lo usamos para que el dueño publique y **programe** fotos, carruseles, reels
> e historias desde nuestro panel. La mayoría de estos negocios atiende con las
> manos ocupadas todo el día: poder dejar el contenido de la semana cargado y
> que salga solo a la hora buena es la diferencia entre publicar y no publicar.

### `instagram_business_manage_insights`

> Lo usamos para mostrarle al dueño, dentro de nuestro panel, el alcance, las
> interacciones y las visitas al perfil de **su propia cuenta**, junto al resto
> de las métricas de su negocio (citas, ingresos, clientes nuevos). Así ve en
> una sola pantalla si lo que publica se traduce en reservas.

---

## 4. Guion del screencast

Meta exige un video que muestre el flujo **completo y real**. Es donde más se
rechaza. Debe verse la pantalla, sin cortes en los pasos clave, y con la app en
modo Activo.

1. **Contexto (10 s).** Abrir `ops.synaptechspa.cl`. Se ve el panel de la
   plataforma con la pestaña de Instagram.
2. **Consentimiento (30 s).** Pulsar *Conectar cuenta de Instagram*. Grabar la
   pantalla de autorización de Instagram **completa**, con los permisos
   visibles, y aceptar. Volver al panel ya conectado. *Este paso es
   obligatorio: Meta quiere ver que el dueño autoriza de forma explícita.*
3. **Mensajes (60 s).** Desde OTRO teléfono, mandar un DM a la cuenta
   preguntando por una hora. Mostrar el mensaje llegando y **la respuesta
   automática apareciendo en el chat**. Mostrar la cita creada en la agenda.
4. **Comentarios (30 s).** Comentar la palabra clave en una publicación.
   Mostrar la respuesta pública y el mensaje privado que llega.
5. **Publicar (30 s).** Programar una historia desde el panel y mostrarla en la
   cola con su hora.
6. **Métricas (15 s).** Mostrar la pestaña con seguidores, alcance e
   interacciones.
7. **Salida (20 s).** Mostrar cómo el dueño **desconecta** la cuenta y cómo se
   pide la eliminación de datos. Cierra el círculo del consentimiento.

Idioma: se puede grabar en español, pero **poner subtítulos en inglés** o
narrar en inglés. Un video sin explicación entendible se rechaza aunque el
flujo esté perfecto.

---

## 5. Lo administrativo

- **Verificación del negocio** en Business Manager: se suben los documentos de
  **SynapTech SpA** (RUT / e-RUT del SII y comprobante de domicilio). Es lo que
  más demora — conviene empezarlo el mismo día, corre en paralelo a la revisión
  técnica.
- Icono de la app (1024×1024) y categoría, en Configuración → Básica.
- Correo de contacto: `hola@synaptechspa.cl`.

---

## 6. Por qué rechazan (evitarlos de entrada)

- **El video no muestra el consentimiento.** Si no se ve la pantalla de
  autorización, rechazo casi seguro.
- **Describir el beneficio propio** ("para que nuestro SaaS pueda…") en vez del
  beneficio del usuario final.
- **Pedir permisos que el video no muestra usándose.** Pedir solo los cuatro y
  mostrar los cuatro.
- **La app en modo Desarrollo** al momento de revisar.
- **Política de privacidad que no menciona los datos de Instagram.** Revisar que
  `privacidad.html` diga explícitamente qué se guarda de Instagram (mensajes,
  comentarios, métricas) y por cuánto tiempo.

---

## 7. Mientras tanto

El acceso estándar ya permite operar con **cualquier cuenta que tenga un rol en
la app**. O sea: se puede pilotear con locales reales agregándolos como
*probadores de Instagram* en Roles, sin esperar la aprobación. Sirve para
validar el módulo y, de paso, genera el material del screencast.
