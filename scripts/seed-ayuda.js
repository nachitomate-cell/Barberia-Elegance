#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
 *  scripts/seed-ayuda.js
 *  ─────────────────────────────────────────────────────────────
 *  Crea las 8 categorías fijas del Centro de Ayuda y 3 artículos
 *  base para que el módulo tenga contenido al primer arranque:
 *
 *    · Motor de packs con auditoría inmutable
 *    · Pool de fidelización cross-sede
 *    · "¿Cómo llegaste?" — pregunta al reservar
 *
 *  Idempotente: usa set({ merge: true }). Correr sin miedo.
 *
 *  Uso:  node scripts/seed-ayuda.js
 * ═══════════════════════════════════════════════════════════════ */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

// ── Categorías (mismo orden que el mockup) ──────────────────────
const CATEGORIAS = [
  { id: 'comenzar-aqui',    nombre: 'Comenzar aquí',      descripcion: 'Primera semana. Setup, equipo y horario.',              icono: 'activity', orden: 1 },
  { id: 'agenda-reservas',  nombre: 'Agenda y reservas',  descripcion: 'Bloques, sobrecupos, cancelaciones y el flujo del cliente.', icono: 'calendar', orden: 2 },
  { id: 'servicios-precios',nombre: 'Servicios y precios',descripcion: 'Cortes, add-ons, packs, precios por día y descuentos.',   icono: 'shield',   orden: 3 },
  { id: 'equipo-roles',     nombre: 'Equipo y roles',     descripcion: 'Barberos, jefes, comisiones y horarios personalizados.',  icono: 'users',    orden: 4 },
  { id: 'pagos-caja',       nombre: 'Pagos y caja',       descripcion: 'Mercado Pago, propinas, cierres diarios y facturación.',  icono: 'wallet',   orden: 5 },
  { id: 'fidelizacion',     nombre: 'Fidelización',       descripcion: 'Sellos, rangos, premios y el flujo de canje.',            icono: 'star',     orden: 6 },
  { id: 'marketing',        nombre: 'Marketing y anuncios', descripcion: 'Push, WhatsApp, reseñas Google, campañas segmentadas.',  icono: 'globe',    orden: 7 },
  { id: 'multi-sede',       nombre: 'Multi-sede',         descripcion: 'Un panel para varias sucursales. Pool cross-sede y roles.', icono: 'building', orden: 8 },
];

// ── Artículos base ──────────────────────────────────────────────
const ARTICULOS = [
  {
    id: 'motor-de-packs',
    slug: 'vender-packs-a-tus-clientes',
    titulo: 'Vender packs a tus clientes',
    deck: 'Cobra varios cortes juntos con descuento y asegúrate de que el cliente vuelva. La plataforma lleva la cuenta por ti.',
    categoriaId:   'fidelizacion',
    categoriaSlug: 'fidelizacion',
    autor: { nombre: 'Equipo SynapTech', rol: 'Producto' },
    tiempoLectura: 4,
    publicado: true,
    destacado: true,
    orden: 1,
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
    id: 'pool-fidelizacion-cross-sede',
    slug: 'compartir-clientes-entre-sucursales',
    titulo: 'Compartir clientes entre tus sucursales',
    deck: 'Un mismo cliente puede juntar sellos en cualquiera de tus locales y canjear su premio donde quiera. Sin listas separadas, sin líos.',
    categoriaId:   'multi-sede',
    categoriaSlug: 'multi-sede',
    autor: { nombre: 'Equipo SynapTech', rol: 'Producto' },
    tiempoLectura: 4,
    publicado: true,
    destacado: true,
    orden: 1,
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
    id: 'como-llegaste-modulo-aura',
    slug: 'saber-de-donde-vienen-tus-clientes',
    titulo: 'Saber de dónde vienen tus clientes',
    deck: 'Le preguntas al cliente cómo te conoció cuando reserva. Al mes ves si tu inversión en Instagram o en Google está funcionando.',
    categoriaId:   'marketing',
    categoriaSlug: 'marketing',
    autor: { nombre: 'Equipo SynapTech', rol: 'Producto' },
    tiempoLectura: 3,
    publicado: true,
    destacado: true,
    orden: 1,
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
];

// ── Ejecución ───────────────────────────────────────────────────
async function main() {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  // Doc contenedor (path debe ser par en Firestore)
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

  console.log(`Sembrando ${ARTICULOS.length} artículos base…`);
  for (const a of ARTICULOS) {
    const ref = db.doc(`_ayuda/global/articulos/${a.id}`);
    batch.set(ref, {
      ...a,
      entregadoEn: a.entregadoEn || Timestamp.fromDate(new Date()),
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  await batch.commit();
  console.log('✓ Seed completado. Abre /gestion-interna/ayuda para verlo.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
