/**
 * generar-plantilla-productos.js — Crea el archivo Excel de plantilla para
 * carga masiva de productos e inventario en /gestion-interna/productos.
 *
 * Deja el archivo en `scripts/plantillas/plantilla-productos.xlsx` con:
 *  · Hoja "Productos": columnas + 3 filas de ejemplo (borrables).
 *  · Hoja "Instrucciones": qué significa cada columna, formatos aceptados,
 *    reglas de multi-sucursal, comportamiento del stock.
 *
 * Uso:
 *   node scripts/generar-plantilla-productos.js
 */
const path = require('path');
const XLSX = require('xlsx');

const OUT = path.resolve(__dirname, 'plantillas', 'plantilla-productos.xlsx');

// Columnas del CSV/Excel, en el orden en que aparecen en el panel actual.
// El importador leerá por NOMBRE de columna, así que se puede reordenar
// libremente al editar. Nombres en el header, un array por fila.
const HEADERS = [
  'nombre',           // obligatorio (texto)
  'descripcion',      // opcional (texto largo)
  'marca',            // opcional (texto)
  'categoria',        // opcional (texto; se crea si no existe)
  'precio',           // obligatorio (número entero CLP)
  'precioOriginal',   // opcional (para mostrar tachado — antes)
  'precioCosto',      // opcional (para calcular margen)
  'stock',            // opcional (número entero; vacío = sin control)
  'stockMinimo',      // opcional (número entero; alerta amarilla si stock <= mínimo)
  'imagen',           // opcional (URL pública HTTPS)
  'activo',           // opcional (SI/NO; default SI)
  'sucursalId',       // opcional (id de sede — solo tenants multi-sucursal)
];

const EJEMPLOS = [
  // Ejemplo 1: producto normal, sin sede específica.
  {
    nombre: 'Cera moldeadora Premium 100ml',
    descripcion: 'Fijación fuerte, acabado mate. Sirve para peinados con volumen.',
    marca: 'Uppercut',
    categoria: 'Peinado',
    precio: 12990,
    precioOriginal: 15990,
    precioCosto: 7500,
    stock: 24,
    stockMinimo: 5,
    imagen: 'https://ejemplo.cl/img/cera.jpg',
    activo: 'SI',
    sucursalId: '',
  },
  // Ejemplo 2: producto solo de una sede (multi-sucursal).
  {
    nombre: 'Perfume Barbero clásico 50ml',
    descripcion: 'Fragancia amaderada con notas cítricas.',
    marca: 'Reuzel',
    categoria: 'Fragancias',
    precio: 24990,
    precioOriginal: '',
    precioCosto: 15000,
    stock: 8,
    stockMinimo: 3,
    imagen: '',
    activo: 'SI',
    sucursalId: 'villaalemana', // solo se ve/vende en Villa Alemana
  },
  // Ejemplo 3: producto sin stock controlado (siempre disponible).
  {
    nombre: 'Peineta de bolsillo',
    descripcion: '',
    marca: '',
    categoria: 'Accesorios',
    precio: 1990,
    precioOriginal: '',
    precioCosto: 500,
    stock: '',
    stockMinimo: '',
    imagen: '',
    activo: 'SI',
    sucursalId: '',
  },
];

const INSTRUCCIONES = [
  ['📦 Plantilla de carga masiva — Productos e inventario', ''],
  ['', ''],
  ['Cómo usarla', ''],
  ['1. Abre la hoja "Productos" y llena una fila por producto.', ''],
  ['2. Deja las columnas opcionales en blanco si no aplican.', ''],
  ['3. Guarda el archivo como .xlsx y envíalo a SynapTech para importarlo.', ''],
  ['', ''],
  ['Detalle de cada columna', ''],
  ['Columna', 'Qué va acá'],
  ['nombre', 'OBLIGATORIO. Nombre visible del producto.'],
  ['descripcion', 'Opcional. Texto corto para mostrar bajo el nombre.'],
  ['marca', 'Opcional. Fabricante o marca (útil para filtrar).'],
  ['categoria', 'Opcional. Ej: Peinado, Fragancias, Accesorios. Si no existe, se crea.'],
  ['precio', 'OBLIGATORIO. Precio de venta en pesos chilenos (entero, sin puntos).'],
  ['precioOriginal', 'Opcional. Precio "antes" para mostrar tachado con % descuento.'],
  ['precioCosto', 'Opcional. Cuánto cuesta el producto — sirve para calcular margen.'],
  ['stock', 'Opcional. Unidades disponibles. Deja en blanco si el producto no se controla por stock.'],
  ['stockMinimo', 'Opcional. Alerta cuando el stock cae a este nivel (STOCK CRÍTICO).'],
  ['imagen', 'Opcional. URL pública HTTPS de la foto. Si no la tienes, la subimos por el panel después.'],
  ['activo', 'Opcional. SI = visible en la tienda. NO = oculto. Default SI.'],
  ['sucursalId', 'Opcional. Solo tenants MULTI-SUCURSAL. Deja en blanco = disponible en todas las sedes. Pon el id de sede (ej. "villaalemana", "renaca") para restringir a un solo local.'],
  ['', ''],
  ['Reglas y cuidados', ''],
  ['· El importador es idempotente: si envías dos filas con el mismo nombre, se toma el LAST-WRITE.', ''],
  ['· Precios sin puntos ni comas. 12990, no 12.990.', ''],
  ['· "SI/NO" en la columna "activo" (mayúscula o minúscula, con o sin acento).', ''],
  ['· En multi-sucursal, si "sucursalId" está vacío el producto se ve en TODAS las sedes.', ''],
  ['· El stock se guarda tal cual — no se resta automáticamente al importar; solo lo inicializa.', ''],
];

function main() {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Productos (headers + ejemplos)
  const dataRows = EJEMPLOS.map(e => HEADERS.map(h => (e[h] !== undefined ? e[h] : '')));
  const wsProd = XLSX.utils.aoa_to_sheet([HEADERS, ...dataRows]);
  // Anchos de columna razonables (se aproxima al contenido más largo esperado).
  wsProd['!cols'] = [
    { wch: 38 }, // nombre
    { wch: 42 }, // descripcion
    { wch: 14 }, // marca
    { wch: 16 }, // categoria
    { wch: 10 }, // precio
    { wch: 14 }, // precioOriginal
    { wch: 12 }, // precioCosto
    { wch: 8 },  // stock
    { wch: 12 }, // stockMinimo
    { wch: 34 }, // imagen
    { wch: 8 },  // activo
    { wch: 16 }, // sucursalId
  ];
  XLSX.utils.book_append_sheet(wb, wsProd, 'Productos');

  // Hoja 2: Instrucciones
  const wsInst = XLSX.utils.aoa_to_sheet(INSTRUCCIONES);
  wsInst['!cols'] = [{ wch: 20 }, { wch: 82 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

  XLSX.writeFile(wb, OUT);
  console.log(`\n  ✓ Plantilla generada:\n    ${OUT}\n`);
}

main();
