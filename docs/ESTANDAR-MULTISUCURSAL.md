# Estándar: Tenant Multi-Sucursal

> **Modelo oficial para toda barbería/negocio con más de un local, de ahora en adelante.**
> Basado en la arquitectura de **Oren Barber** (`oren`). Reemplaza el modelo de
> Kronnos (tenants separados por sede), que queda como **caso legacy/especial**.

---

## 1. Decisión de arquitectura

Existen dos formas de hacer multi-local en la plataforma:

| | **Estándar (Oren/Mapu)** | **Legacy (Kronnos)** |
|---|---|---|
| Tenants | **1 tenant** con `sucursales[]` | N tenants separados (`kronnos_<sede>`) + pool marca |
| Fuente de verdad de sedes | **Una sola**: `configuracion/main.sucursales[]` | Duplicada en ~7 archivos |
| Aislamiento | Filtro `sucursalId` (UX) + reglas (opcional, ver §7) | Por tenant (seguridad nativa) |
| Fidelización cross-sede | Nativa (un cliente = un doc) | Helper `_marcaAwareTenant` (parche) |
| Precio/horario por sede | `preciosSucursal` + `horario` por barbero | Nativo (cada tenant su catálogo) |
| Agregar una sede | Editar un array + seed | ~9 archivos + constantes duplicadas |

**Usa siempre el modelo Oren.** El modelo Kronnos solo se justifica si el cliente
exige **aislamiento físico total a nivel de base de datos** (un encargado no debe
poder leer la otra sede ni por API) — en ese caso, ver §7 antes de decidir.

---

## 2. Modelo de datos

Todo vive bajo `tenants/{tid}/`. Cada documento **transaccional** lleva
`sucursalId` + `sucursalNombre`; los **catálogos del negocio** NO (son compartidos).

**Por sede (llevan `sucursalId`):**
`citas`, `gastos`, `caja_sesiones`, `product_reservations` (ventas), `bloqueos`, `barberos`.

**Compartidos (sin `sucursalId`):**
`servicios`, `productos`, `premios`, `rangos`, `clientes`, `users` (fidelización del negocio), `configuracion`, `settings`.

**`configuracion/main.sucursales[]`** — la fuente única de verdad de las sedes:
```js
sucursales: [
  { id:'renaca', nombre:'Oren Barber Reñaca', nombreCorto:'Reñaca',
    calle:'…', ciudad:'…', mapsUrl:'…', googleReviewUrl:'…',
    color:'#D97706', banner:'/oren/renaca.webp', emoji:'✂️', activo:true, orden:0 },
  { id:'villaalemana', … color:'#2563EB', banner:'/oren/villaalemana.webp', … },
]
```
`color`/`banner`/`emoji` dan la **identidad visual por sede** en el panel.
Se siembra también en `settings/general.sucursales` (lo lee el dropdown de Equipo).

---

## 3. Reserva pública (index.html)

- **Paso 1 del flujo = elegir sucursal** (`_renderSucursales`, `#step0`). Setea `window._selectedSucursal`.
- **Barberos filtrados por sede:** `_activeBarberos = _fsBarberos.filter(b => !b.sucursalId || b.sucursalId === sid)`. Un barbero sin `sucursalId` atiende en todas.
- **Precio por sucursal:** el servicio define `preciosSucursal:{ renaca:X, villaalemana:Y }`. Lo resuelve `_getPrecioEfectivo(s, dow)` — es el chokepoint del display **y** de la escritura de la cita, así que la cita queda con el precio correcto del local. ⚠️ `selectSucursal` **re-renderiza los servicios** (si no, queda el precio base del primer render).
- **Horario por sucursal:** va en el campo `horario` de cada **doc de barbero** (`getConfigBarbero` lo lee). "Cualquier barbero" une los barberos del local → respeta el cierre. Un barbero que atiende en dos sedes con horarios distintos se modela como **2 perfiles** (mismo nombre, distinto `sucursalId` + `horario`).
- La cita se escribe con `sucursalId`/`sucursalNombre` (deriva del `_selectedSucursal`).

---

## 4. Panel admin — aislamiento por sede

Piezas (todas genéricas, sirven para cualquier tenant multi-sucursal):

- **`contexts/SucursalContext.jsx`** — lee `configuracion/main.sucursales`, el scope del usuario, y expone: `sucursales`, `allowed`, `multiSucursal`, `canViewAll`, `activeId`, `activeSucursal`, `setActive(id)`, `matchSucursal(record)`.
- **`AuthContext.sucursalScope`** — el scope del usuario logueado: `sucursalScope ?? sucursalId del barbero ?? 'all'`. El dueño = `'all'`; un encargado = el id de su sede.
- **`components/SucursalBar.jsx`** — el header de sede (solo si `>1` sede): color/foto/nombre de la sede activa + pills para alternar. Un encargado scopeado lo ve fijo con candado.
- **`hooks/useCollection.js`** — **filtro sistémico**: `data.filter(matchSucursal)`. Cualquier vista que lea por `useCollection` se aísla sola. Los docs sin `sucursalId` (catálogos) pasan siempre.
- **Vistas financieras** (leen con `getDocs`/`onSnapshot`, no `useCollection`): filtran con el patrón **rename-derive** — estado `*Raw` + `const x = useMemo(() => xRaw.filter(matchSucursal), [xRaw, matchSucursal])`. Aplica a: `Inicio`, `Metricas`, `Comisiones`, `Gastos`, `Caja`.
- **Caja POR SEDE:** cada local tiene su propio cajón (`caja_sesiones` con `sucursalId`). La sesión activa se resuelve por `sucursalId`; abrir/cerrar taggea la sede; en modo "Todas" pide elegir una sede para operar (no mezcla arqueos).

**Escritura:** al crear se taggea `sucursalId` — citas y ventas derivan la sede del **barbero**; gastos y sesiones de caja toman la **sede activa**.

**Scope por usuario:** el doc-espejo `barberos/{uid}` del admin lleva `rol:'admin'` + `sucursalScope` (`'renaca'`/`'villaalemana'`/`'all'`). El dueño = `'all'`.

---

## 5. Branding del login del panel (automático)

`TenantContext` lee `logo` + `loginBanner` desde **`settings/general`**. Se siembran en el seed y el panel los toma sin tocar código. El mapa `TENANT_META` queda como fallback.

---

## 6. Checklist para crear un tenant multi-sucursal nuevo

1. **`config.js`**: entrada en `_tenants` con `sucursales:[{id,nombre,color,banner,…}]` + `barberos:[{…,sucursalId}]`; `_domainMap`; `_themeAlias`/`_lightTenants` si aplica.
2. **`middleware.js`**: `DOMAIN_MAP` + `TENANT_META` + geo.
3. **`admin-panel/src/lib/tenantUtils.js`**: `DOMAIN_MAP`. → **rebuild Vite** (`cd admin-panel && npm run build`) + commit del bundle.
4. **index.html** (si reusa tema de otro por `_themeAlias`): override del `.booking-hero` y de cualquier tarjeta con estilos inline que choquen (ver Oren: `.tenant-oren .sucursal-option`). Si debe renderizar como Aura, agregar el id a las listas `_isEleganceSvc`/`_isElegance`/`isLightTheme`, etc.
5. **`seed-{tid}.js`**: `configuracion/main` (con `sucursales[]` + `multiSucursal:true`) · `settings/general` (`sucursales`, `logo`, `loginBanner`) · `servicios` (con `preciosSucursal` donde el precio varíe) · `barberos` (con `sucursalId` + `horario` por sede) · `_system`.
6. **Assets** en `/{tid}/` (logo + banners por sede, en `.webp`).
7. **Accesos admin**: crear cuenta Auth + doc-espejo `barberos/{uid}` con `rol:'admin'` + `sucursalScope` por cada encargado + uno `'all'` para el dueño.
8. **Dominio** en Vercel: `{marca}.synaptechspa.cl`.

Agregar una **sede** a un tenant que ya existe = agregar un item a `sucursales[]` (config + seed `configuracion/main` + `settings/general`) y sus barberos. **No** se crea otro tenant ni subdominio.

---

## 7. Aislamiento: UX vs. seguridad

Por defecto, el aislamiento del estándar es de **UX**: el filtro `matchSucursal`
esconde la otra sede en la interfaz, pero las reglas de Firestore dan a cualquier
admin del tenant acceso a todo `tenants/{tid}/*`. Para la mayoría de cadenas
(dueño + encargados de confianza) esto basta.

Si un cliente exige **aislamiento de seguridad** (el encargado no debe poder leer
la otra sede ni por API), se endurecen las reglas de Firestore por `sucursalId`
(ver `firestore.rules`, helper `scopeSucursalOk`). Requiere:
- `sucursalScope` en los **custom claims** del usuario (no solo en el doc).
- Que las queries de colecciones sede-scoped incluyan `where('sucursalId','==',scope)` para usuarios scopeados (el cliente lo inyecta en `useCollection` y en las vistas financieras).

> **Nota Firestore:** las reglas no pueden filtrar una colección por campo; solo
> pueden *exigir* que la query venga scopeada. Por eso el aislamiento duro dentro
> de un tenant es más frágil que el de Kronnos (tenants separados). Endurecer solo
> si el negocio lo pide.

---

*Referencia viva: `oren` es el tenant de referencia de este estándar.*
