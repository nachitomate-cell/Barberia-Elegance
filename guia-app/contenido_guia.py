# -*- coding: utf-8 -*-
"""
Contenido de la Guia de Uso de la App (texto orientado al dueño de barberia).
Cada bloque es una tupla:
  ("h2", titulo)
  ("h3", titulo)
  ("para", texto)
  ("bullets", [items])           # usar "Etiqueta::resto" para resaltar el inicio
  ("steps", [pasos])
  ("callout", titulo, texto)
  ("ph", pie_de_imagen[, alto])  # placeholder para imagen de referencia
  ("spacer", mm)
"""

COVER = {}

# ===========================================================================
# SECCION 1 — AGENDA
# ===========================================================================
AGENDA = [
    ("para",
     "La Agenda es el corazón del día a día de tu barbería. Desde aquí cada barbero ve "
     "sus turnos en tiempo real, agenda clientes, cobra, registra productos y bloquea "
     "horarios. Todo se sincroniza al instante: cuando un cliente reserva desde la app, "
     "el turno aparece solo, con un aviso de “NUEVA” y un sonido de notificación."),
    ("ph", "Vista general de la Agenda del día (captura de pantalla del barbero)", 62),

    ("h2", "1.1  Ingreso y barra superior"),
    ("para",
     "Cada barbero entra con su correo y contraseña. El sistema reconoce que es un "
     "profesional del local y le muestra únicamente su propia agenda."),
    ("bullets", [
        "Indicador EN VIVO:: un punto verde que confirma que la agenda está sincronizada al instante.",
        "Botón Recargar:: refresca la agenda manualmente.",
        "Campana de notificaciones:: activa o desactiva los avisos de nuevas reservas.",
        "Botón de WhatsApp:: acceso directo al soporte técnico.",
        "Cerrar sesión:: para salir de forma segura.",
    ]),

    ("h2", "1.2  Cómo se ve el día"),
    ("para",
     "La pantalla principal muestra el día seleccionado dividido en franjas de Mañana y "
     "Tarde. Arriba hay un selector de fechas con los días cercanos y, al tocar el mes, "
     "se abre un mini-calendario para saltar a cualquier fecha."),
    ("h3", "Mini-resumen del día"),
    ("para",
     "En la parte superior verás tres números que se actualizan solos:"),
    ("bullets", [
        "Citas completadas hoy.",
        "Citas pendientes por atender.",
        "Proyección de ganancias del día según los servicios agendados.",
    ]),
    ("ph", "Selector de fechas y mini-resumen del día", 50),

    ("h3", "Los bloques de horario"),
    ("para", "Cada franja de tiempo puede estar en uno de estos estados, fáciles de "
             "distinguir por su color:"),
    ("bullets", [
        "Cita agendada:: muestra el nombre del cliente, el servicio, la hora y la duración. "
        "El borde de color indica el estado: verde (completada), azul (confirmada), "
        "amarillo (pendiente) y gris (cancelada).",
        "Espacio disponible:: un hueco libre. Al tocarlo puedes agendar un cliente o "
        "bloquear ese horario.",
        "Horario bloqueado:: aparece en rojo con un candado. Tócalo para liberarlo.",
        "Colación:: el horario de descanso se omite automáticamente y no se puede reservar.",
    ]),
    ("callout", "Aviso de cita nueva",
     "Cuando un cliente reserva por su cuenta, el turno aparece de inmediato con una "
     "etiqueta “NUEVA” que brilla unos segundos, acompañada de un sonido. Así ningún "
     "barbero pierde una reserva."),

    ("h2", "1.3  Detalle de una cita"),
    ("para",
     "Al tocar una cita se abre su ficha (a la derecha en computador, o deslizándose "
     "desde abajo en el celular). Ahí encontrarás:"),
    ("bullets", [
        "Servicio, horario, duración y fecha.",
        "Datos del cliente: nombre, teléfono (con botón de WhatsApp) y correo.",
        "Estado de la cita, que puedes cambiar con un toque.",
        "Nota del barbero:: un campo para anotar preferencias del cliente "
        "(por ejemplo, “degradado suave”). Se guarda y queda disponible para la próxima visita.",
    ]),
    ("ph", "Ficha de detalle de una cita con datos del cliente y nota del barbero", 58),

    ("h2", "1.4  Agendar un cliente manualmente"),
    ("para",
     "Además de las reservas que llegan solas, el barbero puede agendar a alguien en el "
     "momento. Toca un espacio libre y elige “Agendar Cliente Manual”."),
    ("steps", [
        "Escribe el nombre del cliente. Si ya está en el Club, el sistema lo sugiere y "
        "completa solo su teléfono y correo.",
        "Elige el servicio: el precio y la duración se cargan automáticamente.",
        "Si corresponde, ajusta el precio o aplica un descuento por porcentaje.",
        "Toca “Guardar Cita Confirmada”. El horario queda reservado y protegido contra "
        "reservas dobles.",
    ]),

    ("h2", "1.5  Completar y cobrar una cita"),
    ("para",
     "Cuando terminas la atención, abres la cita y la marcas como Completada. Ahí se "
     "registra el cobro y, si vendiste algo, los productos del ticket."),
    ("bullets", [
        "Método de pago:: efectivo, débito, crédito o transferencia.",
        "Propina:: campo opcional que se suma al total mostrado.",
        "Productos del ticket:: agrega productos vendidos durante la atención. El sistema "
        "descuenta el stock automáticamente y valida que haya unidades disponibles.",
        "Descuento:: aplica un porcentaje de descuento al servicio.",
    ]),
    ("para",
     "Al completar la cita, el cliente queda habilitado para dejar una reseña y, si "
     "corresponde, suma su sello de fidelidad de forma automática."),
    ("ph", "Pantalla de cobro: método de pago, propina y productos del ticket", 60),

    ("h2", "1.6  Bloquear y liberar horarios"),
    ("para",
     "Para ausencias, almuerzos extendidos o imprevistos, el barbero puede bloquear "
     "cualquier espacio para que nadie pueda reservarlo."),
    ("bullets", [
        "Bloqueo rápido:: toca un espacio libre y elige “Bloquear”. Ese horario queda "
        "cerrado a reservas.",
        "Liberar:: toca un horario bloqueado y confirma para volver a abrirlo.",
        "Bloqueos por barbero o globales:: se puede cerrar el horario de un solo "
        "profesional o de todo el local.",
    ]),

    ("h2", "1.7  Notificaciones y recordatorios"),
    ("para",
     "La agenda usa notificaciones push para avisar de cada reserva nueva, incluso con la "
     "app cerrada. La campana de la barra superior muestra el estado:"),
    ("bullets", [
        "Verde:: notificaciones activas.",
        "Amarilla:: tócala para activarlas.",
        "Roja o gris:: bloqueadas o no compatibles; el sistema explica cómo reactivarlas.",
    ]),
    ("callout", "Recomendación",
     "Pide a cada barbero que active las notificaciones la primera vez que entre. Así "
     "recibirá un aviso inmediato cada vez que un cliente reserve, sin tener que estar "
     "revisando la pantalla."),

    ("h2", "1.8  Últimas reservas recibidas"),
    ("para",
     "En la parte inferior aparece un carrusel con las reservas más recientes (servicio, "
     "cliente, fecha y hora), con una etiqueta “NUEVA” para las de las últimas horas. Es "
     "un vistazo rápido a lo que está entrando sin moverse de la pantalla principal."),
    ("ph", "Carrusel de “Últimas reservas recibidas”", 46),
]

# ===========================================================================
# SECCION 2 — PANEL DE GESTION INTERNA
# ===========================================================================
PANEL = [
    ("para",
     "El Panel de Gestión Interna es el centro de control administrativo de tu barbería. "
     "Desde un menú lateral accedes a todo: equipo, servicios, productos, caja, reportes "
     "financieros, clientes y configuración. Está pensado para que el dueño tenga una "
     "visión completa del negocio en un solo lugar."),
    ("ph", "Vista general del Panel de Gestión con su menú lateral", 62),

    ("h2", "2.1  Métricas y reportes (P&L)"),
    ("para",
     "La sección de Métricas resume la salud comercial y financiera del local en el "
     "período que elijas (hoy, semana, mes o un rango personalizado)."),
    ("h3", "Indicadores principales"),
    ("bullets", [
        "Citas completadas y canceladas, con su variación respecto al período anterior.",
        "Ingresos por servicios y ticket promedio.",
        "Porcentaje de clientes que repiten y nivel de ocupación.",
        "Análisis automático: mejor día de demanda, barbero destacado y servicio más pedido.",
    ]),
    ("h3", "Estado de resultados (Pérdidas y Ganancias)"),
    ("para",
     "El panel calcula automáticamente las ganancias reales del local, restando a los "
     "ingresos los costos de productos, las comisiones de los barberos, los sueldos y los "
     "gastos operativos. Verás la utilidad neta y el margen, además de gráficos de los "
     "últimos meses."),
    ("bullets", [
        "Desglose por método de pago (efectivo, débito, crédito, transferencia).",
        "Mapa de calor de demanda por hora y día de la semana.",
        "Ranking de barberos y de mejores clientes.",
        "Exportación a CSV e impresión de reportes.",
    ]),
    ("ph", "Tablero de Métricas con indicadores y gráficos", 60),

    ("h2", "2.2  Equipo: barberos, horarios y sueldos"),
    ("para",
     "Aquí administras a todo tu equipo. Cada barbero tiene su ficha con foto, "
     "especialidad, datos de contacto y condiciones."),
    ("h3", "Ficha del barbero"),
    ("bullets", [
        "Comisión por servicios y por productos, y sueldo base mensual.",
        "Horario por día de la semana, con descansos y días libres.",
        "Servicios que puede ofrecer y sucursal asignada (si tienes varias).",
        "Registro de ausencias (vacaciones, permisos) y enlace personal de reserva.",
    ]),
    ("h3", "Liquidación de sueldos y comisiones"),
    ("para",
     "Eliges un barbero y un rango de fechas, y el sistema calcula automáticamente cuánto "
     "se le debe pagar: sueldo base + comisiones por servicios + comisiones por productos. "
     "Muestra el detalle de cada atención y permite imprimir la liquidación y registrar el "
     "pago. Las propinas se muestran aparte, a modo informativo."),
    ("ph", "Ficha de barbero y cálculo de liquidación de comisiones", 58),

    ("h2", "2.3  Servicios"),
    ("para", "Define el catálogo de servicios que ofrece tu barbería."),
    ("bullets", [
        "Nombre, categoría, precio (en pesos) y duración.",
        "Ícono o imagen para que el cliente lo identifique en la app.",
        "Precios variables por día (por ejemplo, un valor distinto los sábados).",
        "Orden personalizado: arrastra para definir cómo se ven en la reserva.",
        "Indicador del servicio “Más solicitado” según la demanda real.",
    ]),

    ("h2", "2.4  Productos e inventario"),
    ("para",
     "Gestiona la venta de productos y el control de stock en un mismo lugar."),
    ("bullets", [
        "Ficha de producto: imagen, marca, precio, costo, stock y stock mínimo.",
        "Alerta de “stock crítico” cuando un producto está por agotarse.",
        "Venta rápida en local, asignando el barbero para su comisión.",
        "Reservas de productos pedidos desde la app, para marcar como entregados.",
        "Generador de imágenes para historias de Instagram con tu catálogo.",
    ]),
    ("ph", "Catálogo de productos con control de stock", 56),

    ("h2", "2.5  Clientes y fidelización"),
    ("para",
     "Cada cliente tiene una ficha completa con sus datos, su cumpleaños, su historial de "
     "citas y su tarjeta de sellos de fidelidad."),
    ("bullets", [
        "Contador de sellos disponibles y progreso hacia el próximo premio.",
        "Histórico acumulado y registro de cada movimiento (sumas, canjes).",
        "Añadir o quitar sellos manualmente y canjear premios desde la ficha.",
        "Últimas citas del cliente y contacto directo por WhatsApp.",
    ]),

    ("h2", "2.6  Caja diaria"),
    ("para",
     "El módulo de Caja te permite controlar el efectivo del día con apertura y cierre."),
    ("steps", [
        "Abrir la caja indicando el monto inicial en efectivo.",
        "Durante el día se registran automáticamente los ingresos por servicios y "
        "productos, además de ingresos o egresos manuales.",
        "El sistema calcula el saldo esperado en efectivo en todo momento.",
        "Al cerrar, ingresas el efectivo contado y se muestra la diferencia (sobrante o "
        "faltante), que queda guardada en el historial.",
    ]),
    ("ph", "Pantalla de Caja con flujo de efectivo y cierre del día", 58),

    ("h2", "2.7  Gastos y configuración del negocio"),
    ("bullets", [
        "Gastos:: registra egresos por categoría (sueldos, arriendo, insumos, "
        "publicidad) para que el estado de resultados sea preciso.",
        "Configuración:: nombre y datos del local, redes sociales, duración de los turnos "
        "y política de cancelación (tiempo mínimo para que un cliente cancele).",
        "Servicios extra:: opciones como cursos de barbería o arriendo de sillones.",
    ]),

    ("h2", "2.8  Roles y permisos"),
    ("para",
     "El panel distingue entre tipos de usuario para proteger la información sensible:"),
    ("bullets", [
        "Dueño / Administrador:: acceso completo, incluyendo reportes financieros, equipo "
        "y configuración.",
        "Barbero:: acceso a su propia agenda, sus clientes y su historial.",
        "Soporte:: acceso técnico para ayudarte cuando lo necesites.",
    ]),
    ("callout", "Nota",
     "Tu app puede incluir módulos adicionales según tu plan (gift cards, lista de espera, "
     "sucursales, marketing, academia, reseñas, etc.). Si activaste alguno y no sabes cómo "
     "usarlo, escríbenos y te guiamos."),
]

# ===========================================================================
# SECCION 3 — CLUB DE FIDELIDAD
# ===========================================================================
CLUB = [
    ("para",
     "El Club de Fidelidad es la herramienta para que tus clientes vuelvan una y otra vez. "
     "Combina tres mecanismos: una tarjeta de sellos por cada visita, premios canjeables y "
     "—si lo activas— membresías o suscripciones de pago con beneficios exclusivos."),
    ("ph", "Vista del Club: tarjeta de membresía y beneficios del cliente", 60),

    ("h2", "3.1  Tarjeta de sellos (puntos de fidelidad)"),
    ("para",
     "Es el sistema clásico de “junta sellos y obtén premios”, pero automático y sin "
     "tarjetas de papel."),
    ("h3", "Cómo se ganan los sellos"),
    ("bullets", [
        "Automático:: cada vez que el barbero marca una cita como Completada, el cliente "
        "suma un sello sin que nadie tenga que hacer nada más.",
        "Manual:: el administrador puede sumar sellos desde la ficha del cliente (útil "
        "para promociones o compras antiguas).",
        "Cumpleaños:: el cliente recibe un sello de regalo el día de su cumpleaños.",
    ]),
    ("para",
     "Cada cliente tiene dos contadores: los sellos disponibles (los que puede canjear "
     "ahora) y los sellos históricos (todo lo que ha acumulado en su vida como cliente). "
     "Cada movimiento queda registrado con fecha y motivo."),
    ("ph", "Tarjeta de sellos del cliente con barra de progreso", 50),

    ("h2", "3.2  Premios canjeables"),
    ("para",
     "Tú defines el catálogo de premios y cuántos sellos cuesta cada uno. El cliente ve "
     "cuánto le falta y canjea cuando alcanza el total; los sellos se descuentan solos."),
    ("h3", "Ejemplos de premios"),
    ("bullets", [
        "Perfilado de barba gratis — 7 sellos.",
        "Corte de cabello gratis — 10 sellos.",
        "Producto premium a elección — 12 sellos.",
        "Combo corte + barba al 50% — 15 sellos.",
        "Servicio VIP completo — 20 sellos.",
    ]),
    ("callout", "Estrategia recomendada",
     "Combina premios baratos (3 a 6 sellos) para enganchar en las primeras visitas, un "
     "premio estándar (8 a 10 sellos) como meta principal, y un premio VIP (más de 10 "
     "sellos) para tus clientes más fieles. El sistema te sugiere ajustes automáticamente."),
    ("ph", "Catálogo de premios con su costo en sellos", 52),

    ("h2", "3.3  Membresías y suscripciones (opcional)"),
    ("para",
     "Si quieres ingresos recurrentes, puedes ofrecer planes de pago mensual o anual. "
     "Existen dos modalidades, según tu negocio:"),
    ("h3", "Planes con beneficios"),
    ("para",
     "El cliente paga una cuota y obtiene ventajas permanentes: descuentos, puntos dobles, "
     "acceso a un chat exclusivo o regalos sorpresa, según el plan que definas."),
    ("h3", "Planes con servicios incluidos"),
    ("para",
     "El cliente paga por una cantidad de servicios al mes (por ejemplo, “2 cortes al mes” "
     "o “2 cortes + 2 barbas”). El sistema lleva la cuenta de los usos disponibles y los "
     "descuenta automáticamente cada vez que el cliente asiste."),
    ("bullets", [
        "Pago mensual o anual (el plan anual suele incluir un ahorro).",
        "Estados de la membresía: activa, vencida o cancelada.",
        "Renovación automática en la fecha de vencimiento.",
        "El cliente puede cancelar: su plan sigue vigente hasta la fecha pagada.",
    ]),
    ("ph", "Planes de membresía con precios mensual y anual", 54),

    ("h2", "3.4  Chat exclusivo de miembros"),
    ("para",
     "Los clientes con membresía activa acceden a un chat privado con el local y el resto "
     "de la comunidad. Es un canal directo para fidelizar y comunicar novedades."),
    ("bullets", [
        "Mensajes entre miembros y con el equipo del local.",
        "Anuncios oficiales destacados (promociones, lanzamientos, avisos).",
        "Votaciones para que los miembros opinen y elijan.",
    ]),

    ("h2", "3.5  Cómo lo administras tú"),
    ("para",
     "Desde el panel de membresías controlas todo el club:"),
    ("bullets", [
        "Métricas:: miembros activos, ingresos del mes y membresías por vencer.",
        "Activar o renovar:: das de alta a un cliente luego de confirmar su pago.",
        "Extender o desactivar:: ajustas la vigencia de cualquier miembro.",
        "Premios:: creas, editas y ordenas el catálogo de recompensas.",
        "Comunicación:: envías anuncios y creas votaciones para el chat.",
    ]),
    ("ph", "Panel de administración de membresías y premios", 56),

    ("callout", "Flujo típico de una membresía",
     "El cliente elige un plan en la app y escribe por WhatsApp para coordinar el pago. "
     "Una vez confirmado, tú lo activas desde el panel y queda con su membresía vigente, "
     "su chat exclusivo y sus beneficios al instante."),
]

# ===========================================================================
# SECCION 4 — INSTALAR LA APP EN LOS CLIENTES
# ===========================================================================
INSTALL = [
    ("para",
     "Tu app es una “PWA” (aplicación web instalable). Eso significa que tus clientes "
     "pueden tenerla con su ícono en la pantalla de inicio del celular, igual que "
     "cualquier app, pero sin pasar por la App Store ni Google Play. Se instala en "
     "segundos y ocupa muy poco espacio."),
    ("callout", "¿Por qué conviene que la instalen?",
     "Una vez instalada, el cliente abre tu barbería de un toque, reserva más rápido y "
     "recibe notificaciones de sus turnos y promociones. Es la mejor forma de que vuelva."),
    ("ph", "Ícono de la app en la pantalla de inicio de un celular", 50),

    ("h2", "4.1  Antes de empezar"),
    ("para",
     "Comparte con tus clientes el enlace de tu barbería (tu dirección web). Pueden "
     "abrirlo desde un mensaje, tu perfil de Instagram o un código QR en el local. La "
     "instalación se hace una sola vez por celular."),
    ("callout", "Idea para el local",
     "Imprime un código QR con el enlace de tu app y ponlo en el mesón o el espejo. Junto "
     "a él, un cartel: “Reserva tu próximo corte e instala nuestra app”."),

    ("h2", "4.2  Instalar en Android (Chrome)"),
    ("steps", [
        "Abre el enlace de la barbería en el navegador Chrome.",
        "Espera unos segundos: aparece abajo un aviso que dice “Instalar app”. Tócalo.",
        "Confirma tocando “Instalar” o “Agregar”.",
        "Listo: el ícono queda en la pantalla de inicio y la app se abre a pantalla "
        "completa.",
    ]),
    ("para",
     "Si el aviso no aparece, se puede instalar igual desde el menú de Chrome (los tres "
     "puntos arriba a la derecha) eligiendo “Instalar aplicación” o “Agregar a pantalla "
     "de inicio”."),
    ("ph", "Android: aviso “Instalar app” y menú de Chrome", 56),

    ("h2", "4.3  Instalar en iPhone (Safari)"),
    ("para",
     "En el iPhone la instalación es manual (Apple no muestra el aviso automático). Es "
     "muy sencillo:"),
    ("steps", [
        "Abre el enlace de la barbería en el navegador Safari.",
        "Toca el botón Compartir (el cuadrado con una flecha hacia arriba), en la parte "
        "inferior.",
        "Desliza y elige la opción “Agregar a pantalla de inicio”.",
        "Toca “Agregar” en la esquina superior. El ícono aparece en la pantalla de inicio.",
    ]),
    ("callout", "Importante en iPhone",
     "Para recibir notificaciones de turnos en iPhone, el cliente debe abrir la app desde "
     "el ícono instalado (no desde Safari) y aceptar las notificaciones la primera vez."),
    ("ph", "iPhone: botón Compartir y “Agregar a pantalla de inicio”", 56),

    ("h2", "4.4  Ventajas de tenerla instalada"),
    ("bullets", [
        "Acceso de un toque:: ícono propio en la pantalla de inicio.",
        "Rápida y liviana:: ocupa muy poco espacio y se abre a pantalla completa.",
        "Siempre actualizada:: las mejoras llegan solas, sin descargar nada.",
        "Notificaciones:: recordatorios de turnos y avisos de promociones.",
        "Funciona aunque la señal sea inestable:: carga la información ya vista.",
    ]),

    ("h2", "4.5  Guion para invitar al cliente"),
    ("para",
     "Puedes usar este mensaje al terminar la atención o enviarlo por WhatsApp:"),
    ("callout", "Mensaje sugerido",
     "“Para reservar tu próximo corte más rápido, instala nuestra app: entra a este "
     "enlace, y en Android toca ‘Instalar app’; en iPhone toca Compartir y luego "
     "‘Agregar a pantalla de inicio’. ¡Te llegan los recordatorios de tus turnos!”"),
]

# ===========================================================================
# Estructura final
# ===========================================================================
SECCIONES = [
    {
        "titulo": "La Agenda",
        "subtitulo": "Reservas, turnos y cobros en tiempo real, el día a día de cada barbero.",
        "resumen": "Cómo el barbero ve su día, agenda y completa citas, cobra, registra "
                   "productos, bloquea horarios y recibe avisos de cada reserva nueva.",
        "bloques": AGENDA,
    },
    {
        "titulo": "Panel de Gestión Interna",
        "subtitulo": "El centro de control administrativo y financiero de tu barbería.",
        "resumen": "Métricas y estado de resultados, equipo y comisiones, servicios, "
                   "productos e inventario, clientes, caja diaria, gastos y configuración.",
        "bloques": PANEL,
    },
    {
        "titulo": "Club de Fidelidad",
        "subtitulo": "Sellos, premios y membresías para que tus clientes vuelvan siempre.",
        "resumen": "Tarjeta de sellos automática, catálogo de premios canjeables, "
                   "membresías y suscripciones de pago, y chat exclusivo de miembros.",
        "bloques": CLUB,
    },
    {
        "titulo": "Instalar la App en tus Clientes",
        "subtitulo": "Guía paso a paso para que la lleven en su celular, en Android e iPhone.",
        "resumen": "Qué es la app instalable, cómo instalarla en Android y iPhone, sus "
                   "ventajas y un guion listo para invitar a tus clientes a instalarla.",
        "bloques": INSTALL,
    },
]
