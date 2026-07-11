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
    slug: 'motor-de-packs',
    titulo: 'Cómo funciona el motor de packs',
    deck: 'Un pack no es solo un servicio con descuento — es un contrato con memoria. Aquí explicamos cada engranaje: activación, consumo, reversión y auditoría.',
    categoriaId:   'fidelizacion',
    categoriaSlug: 'fidelizacion',
    autor: { nombre: 'Ignacio Mateluna', rol: 'Producto' },
    tiempoLectura: 5,
    publicado: true,
    destacado: true,
    orden: 1,
    pedidoPor: { etiqueta: 'Salón boutique · Viña', region: 'V-Región' },
    tags: ['packs', 'fidelizacion', 'cuponeras'],
    contenidoMd: `Cuando un cliente compra un **pack** — por ejemplo, "Corte Mensual x4" — no está pagando por un servicio. Está pagando por _cuatro visitas prepagas_ con vencimiento. La plataforma tiene que recordar cuántas sesiones le quedan, cuándo expiran, y descontarlas sin errores. Eso lo hace el motor de packs.

## Activación — cuando nace el pack

El barbero marca la cita como \`Completada\`. Si el servicio de esa cita tiene la propiedad \`isPack: true\`, el motor crea una entrada nueva en el perfil del cliente:

- **Sesiones totales** — las que compró
- **Sesiones restantes** — totales − 1 (esta cita ya cuenta como la primera)
- **Fecha de vencimiento** — fecha de compra + días de validez del pack

:::callout Nota
El motor pregunta antes de activar. Aparece un modal claro con el resumen ("Se activará el pack X para Juan. Quedarán 3 sesiones.") — evita activaciones por accidente.
:::

## Consumo — cuando el cliente vuelve

La próxima vez que el cliente reserva un servicio cubierto por su pack activo, la agenda pública lo detecta automáticamente. La cita se cobra en \`$0\` y se marca como \`consumeSesionPack\`. Cuando el barbero la cierra, el motor decrementa \`sesionesRestantes\` en una unidad.

:::mechanism
label: Entrada
title: Cita marcada Completada
desc: Barbero confirma la sesión. Con packs, aparece un modal previo pidiendo confirmación.
---
label: Salida
title: Saldo actualizado
desc: −1 sesión al pack. La ficha del cliente refleja el nuevo saldo en tiempo real.
:::

## Reversión — cuando algo salió mal

No-shows, cobros por error, cambios de última hora. Desde la ficha del cliente hay un botón **"Devolver 1 sesión"**. Suma +1 al saldo, quita la última cita del historial de consumos y registra un evento de reversión con el motivo y la sede donde ocurrió.

## Auditoría — por si el cliente reclama

Cada activación, cada consumo y cada reversión queda escrito en un log inmutable. Si un cliente dice "yo tenía cuatro sesiones y ahora aparecen dos", puedes reconstruir el trail exacto: qué cita descontó cada sesión, en qué sede se atendió, quién fue el barbero.

Los logs no se editan y no se borran. Si hay que corregir algo, se escribe una reversión — no se modifica el pasado.`,
  },

  {
    id: 'pool-fidelizacion-cross-sede',
    slug: 'pool-fidelizacion-cross-sede',
    titulo: 'Pool de fidelización cross-sede',
    deck: 'Un salón con 3 sucursales quería que el cliente acumule sellos en cualquiera de ellas. Construimos una arquitectura híbrida — sin migrar el histórico existente.',
    categoriaId:   'multi-sede',
    categoriaSlug: 'multi-sede',
    autor: { nombre: 'Ignacio Mateluna', rol: 'Producto' },
    tiempoLectura: 6,
    publicado: true,
    destacado: true,
    orden: 1,
    pedidoPor: { etiqueta: 'Salón multi-sede · V-Región', region: 'V-Región' },
    tags: ['multi-sede', 'fidelizacion', 'arquitectura'],
    contenidoMd: `Un cliente que corta en la sucursal Peñablanca debería poder canjear su premio en Limache. Sin llamar al dueño. Sin explicar por WhatsApp. Solo funciona.

## El problema

Cada sucursal ya funcionaba como un tenant independiente en Firestore: \`tenants/salon_penablanca\`, \`tenants/salon_limache\`, \`tenants/salon_woman\`. Cambiar todo a un tenant único hubiera roto años de datos. Y no queríamos duplicar sellos en 3 lugares.

## La solución: Camino híbrido

- **Datos del cliente** viven en un pool marca compartido (\`tenants/salon/users/\`)
- **Datos operativos** (citas, barberos, servicios) siguen viviendo per-sede
- Un helper en 3 capas redirige las colecciones "de fidelización" al pool automáticamente

:::callout Nota
No se migró un solo doc de las sedes existentes. El helper detecta el tenant legacy y redirige en runtime. Los códigos viejos siguen funcionando exactamente igual.
:::

## Qué comparten las sedes

- Sellos y rangos del cliente
- Premios y canjes
- Anuncios y opt-outs de push
- Log de packs
- Base de clientes (2.900+ importados en un caso)

## Qué queda per-sede

- Agenda (cada sede tiene sus horarios)
- Barberos (cada uno pertenece a una sede)
- Servicios y precios
- Configuración operativa

## Auditoría cross-sede

Cada acción de fidelización guarda en qué sede ocurrió (\`sedeId\`). Puedes ver "este premio se canjeó en Peñablanca aunque los sellos venían de Limache" — trazabilidad completa sin duplicar data.`,
  },

  {
    id: 'como-llegaste-modulo-aura',
    slug: 'como-llegaste-modulo-aura',
    titulo: '"¿Cómo llegaste?" — pregunta al reservar',
    deck: 'Una barbería masculina quería medir de dónde vienen sus clientes. Diseñamos un modal que aparece al agendar, con métricas en vivo y respuestas de texto libre por opción.',
    categoriaId:   'marketing',
    categoriaSlug: 'marketing',
    autor: { nombre: 'Ignacio Mateluna', rol: 'Producto' },
    tiempoLectura: 4,
    publicado: true,
    destacado: true,
    orden: 1,
    pedidoPor: { etiqueta: 'Barbería · V-Región', region: 'V-Región' },
    tags: ['marketing', 'metricas', 'origen-adquisicion'],
    contenidoMd: `Google Ads dice X. Instagram dice Y. Pero ¿realmente sabes cuál campaña te trajo al cliente que acabas de cortarle el pelo? El módulo Origen resuelve eso preguntando al cliente en el mismo momento de la reserva.

## Cómo funciona

Al confirmar la reserva, aparece un modal minimalista con 4 opciones configurables (Instagram, Recomendación, Google, Otra razón). Si es obligatorio, el cliente no puede cerrar sin responder. Si es opcional, hay botón "Prefiero no decir".

## Configuración

Desde el panel puedes:

- Activar / desactivar el módulo
- Marcar la respuesta como obligatoria
- Agregar / quitar opciones
- Reordenarlas
- Permitir texto libre en cualquier opción (por default solo "Otra razón" lo tiene)

:::callout Nota
Recomendamos empezar con obligatorio = false los primeros días. Si el cliente ve el modal y no lo entiende, mejor que reserve a que abandone. Después, con los datos que ya tengas, pasas a obligatorio.
:::

## Métricas en vivo

En la vista del panel ves:

- Total de respuestas por período (7d / 30d / 90d)
- Distribución por opción con barra visual
- Respuestas de texto libre expandibles por opción — útil para descubrir canales que no habías considerado (TikTok, un flyer, un amigo del gym)

## Casos de uso

- **Redes** — cuantifica ROI real de Instagram vs Google
- **Recomendación** — descubre a tus "clientes-influencer" que te traen amigos
- **Otra razón** — el texto libre revela canales inesperados. Los mejores insights nacen acá.`,
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
