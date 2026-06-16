# Plan: Simplificar la creación de tenants

> Estado: **propuesta** (no implementado). Objetivo: pasar de "editar 4-8 archivos a mano + escribir un seed" a "llenar 1 JSON + correr 1 comando".
>
> Tenant de referencia (el más completo hoy): **aura**. Se usa como molde de todo.

---

## 1. El problema: duplicación entre runtimes

La misma información de un tenant (nombre, dominio, colores, dirección, teléfono) se escribe a mano en **4 registros obligatorios**, cada uno con forma distinta porque corren en runtimes distintos. Olvidar uno rompe el tenant en silencio (ya pasó con yugen).

| Archivo | Objeto(s) | Marcador (para inyección) | Runtime |
|---|---|---|---|
| `config.js` | `_domainMap`, `_tenants` | `const _domainMap`, `const _tenants` | Navegador clásico |
| `middleware.js` | `DOMAIN_MAP`, `TENANT_META` | `DOMAIN_MAP = {`, `TENANT_META = {` | Edge |
| `admin-panel/src/lib/tenantUtils.js` | `DOMAIN_MAP` | `const DOMAIN_MAP` | Vite/React |
| `admin-panel/src/contexts/TenantContext.jsx` | `TENANT_META` | `const TENANT_META` | Vite/React |

Ya existe `scripts/check-tenants.mjs` que **detecta** huecos en estos 4 (y conoce justo estos marcadores). El guard valida; no genera.

### Touchpoints adicionales (opt-in, dispersos)
- `seed-<id>.js` — seed de Firestore hecho a mano por tenant (copiar/editar código).
- `functions/auto-enroll-cliente.js` → `AUTO_ENROLL_TENANTS` (si el club auto-inscribe).
- `registro.html` → `PASSWORDLESS_TENANTS` + `clubPassword()` (si login sin password).
- `vercel.json` → rewrite de favicon (si logo propio).
- `admin-panel/src/App.jsx` → `TENANT_MANIFESTS` (informativo, no obligatorio).

---

## 2. Checklist manual actual (lo que hoy hay que hacer)

1. Elegir `tenantId` (minúsculas, alfanumérico + guion bajo).
2. `config.js`: agregar dominio en `_domainMap` + objeto completo en `_tenants`.
3. `middleware.js`: agregar dominio en `DOMAIN_MAP` + objeto en `TENANT_META` (booking/dashboard/registro/siteName/ogImage/local/manifest/adminManifest).
4. `admin-panel/src/lib/tenantUtils.js`: agregar dominio en `DOMAIN_MAP`.
5. `admin-panel/src/contexts/TenantContext.jsx`: agregar entrada en `TENANT_META` (name/accent/emoji/logo).
6. Escribir `seed-<id>.js` (clonando `seed-aura.js`) y correrlo: `node seed-<id>.js`.
7. (Opcional) credenciales de barberos: `seed-<id>-barberos-creds.js`.
8. (Opcional) flags: `AUTO_ENROLL_TENANTS`, `PASSWORDLESS_TENANTS`, favicon vercel.json.
9. Validar: `node scripts/check-tenants.mjs`.
10. El dueño configura el resto desde el panel (`/gestion-interna/?local=<id>`).

**Tiempo real estimado:** 1-2 horas, con alto riesgo de olvidar un registro o un flag.

---

## 3. La solución propuesta

Invertir el flujo. Una **sola fuente de verdad** por tenant + un **generador** que la reparte.

### Pieza 1 — `tenants/<id>.json` (definición única, molde = aura)
Un archivo de datos por tenant con TODO en un solo lugar. Se crea `tenant.template.json` extrayendo los valores reales de **aura** (el más completo) como molde. Tenant nuevo = copiar template + cambiar valores.

Esquema propuesto (campos derivados de lo que hoy viven dispersos):

```jsonc
{
  "id": "nuevotenant",
  "domains": ["nuevotenant.synaptechspa.cl"],

  "identidad": {
    "nombre": "Nombre Completo del Local",
    "nombreCorto": "Nombre",
    "slogan": "...",
    "sobreNosotros": "...",
    "logo": "/ruta-logo.png",
    "direccion": "...",
    "addressLocality": "Viña del Mar",
    "horario": "...",
    "telefono": "+569...",
    "instagram": "https://instagram.com/...",
    "instagramHandle": "@...",
    "club": "Nombre del Club",
    "googleReviewUrl": "https://...",
    "schemaType": "HairSalon"        // o BeautySalon
  },

  "tema": {                          // → tenants/<id>/settings/theme + accent panel
    "accent": "amber",               // color Tailwind del panel
    "colorBg": "#0a0a0a",
    "colorSurface": "#141414",
    "colorPrimary": "#fbbf24",
    "colorAccent": "#f59e0b",
    "colorText": "#f8fafc",
    "colorMuted": "#94a3b8",
    "colorBorder": "rgba(251,191,36,0.15)",
    "colorGlow": "rgba(251,191,36,0.22)",
    "colorButtonText": "#000000",
    "colorProgressTrack": "#171717",
    "emoji": "✂️",
    "themeColor": "#fbbf24"
  },

  "flags": {
    "autoEnroll": true,              // → AUTO_ENROLL_TENANTS
    "passwordless": true,            // → PASSWORDLESS_TENANTS
    "clubPassword": "xxxx",          // password interno fijo si passwordless
    "faviconPropio": true            // → rewrite vercel.json
  },

  "seo": {                           // textos por página (booking/dashboard/registro)
    "booking":   { "title": "...", "description": "...", "ogTitle": "...", "ogDesc": "..." },
    "dashboard": { "title": "...", "description": "...", "ogTitle": "...", "ogDesc": "..." },
    "registro":  { "title": "...", "description": "...", "ogTitle": "...", "ogDesc": "..." },
    "ogImage": "/ruta-og.jpg"
  },

  "reviews": { "ratingGeneral": 5.0, "totalReviews": 0, "items": [] },

  "seed": {                          // datos para Firestore (genérico)
    "categoriasServicio": ["Cortes", "Barba", "..."],
    "servicios":  [ { "nombre": "...", "precio": 0, "duracion": 30, "categoria": "Cortes" } ],
    "barberos":   [ { "nombre": "...", "especialidad": "...", "rol": "barbero" } ],
    "configuracion": { "slotMinutos": 30, "politicaCancelacion": "..." },
    "premios":    [ { "nombre": "...", "sellosRequeridos": 8 } ],
    "productos":  [ { "nombre": "...", "precio": 0, "stock": 0 } ]
  }
}
```

### Pieza 2 — `scripts/new-tenant.mjs` (scaffolder)
Lee `tenants/<id>.json` y **escribe automáticamente**:
- Las entradas en los 4 registros obligatorios, inyectando en los marcadores que `check-tenants.mjs` ya conoce (reutilizar su parser tolerante de `extractObjectBody`).
- Los flags opt-in (`AUTO_ENROLL_TENANTS`, `PASSWORDLESS_TENANTS` + `clubPassword()`, favicon en `vercel.json`) según `flags`.
- Al final corre `check-tenants.mjs` y aborta si algo quedó inconsistente.

Idempotente: si el tenant ya existe en un registro, lo actualiza en vez de duplicar.

Uso: `node scripts/new-tenant.mjs nuevotenant`

### Pieza 3 — `seed-tenant.mjs <id>` (seed genérico data-driven)
Un solo seed que lee `tenants/<id>.json` y crea todas las colecciones en Firestore:
`servicios`, `barberos`, `configuracion/main`, `premios`, `productos`, `profile/main`, `settings/theme`, `settings/general`. Reemplaza los `seed-<id>.js` por-tenant.

Uso: `node seed-tenant.mjs nuevotenant` (requiere `service-account.json`).

---

## 4. Antes vs. después

| | Hoy | Con el plan |
|---|---|---|
| Archivos editados a mano | 4-8 | **0** (solo el JSON) |
| Escribir seed en JS | Sí, por tenant | **No** (genérico) |
| Riesgo de olvidar un registro | Alto | **Nulo** (lo genera) |
| Flags opt-in | A mano, dispersos | Desde el JSON |
| Tiempo | 1-2 h | **~10 min** |

---

## 5. Orden de implementación sugerido

1. **`tenant.template.json`** — extraer los valores reales de aura como molde (base de todo).
2. **`scripts/new-tenant.mjs`** — el de mayor impacto: elimina la duplicación entre los 4 registros. Reutiliza el parser de `check-tenants.mjs`.
3. **`seed-tenant.mjs`** — generaliza el seed; deja el onboarding de datos como "llenar JSON".
4. **Flags opt-in** dentro del scaffolder (auto-enroll, passwordless, favicon).
5. (Opcional) `npm run new-tenant` en package.json para que sea un comando.

---

## 6. Notas / riesgos

- Los 4 registros **no se pueden unificar en runtime** (3 runtimes distintos: clásico, Edge, Vite). Por eso la estrategia es **generar/inyectar** en build, no importar una config común en vivo.
- El scaffolder debe inyectar con cuidado (preservar formato/comentarios). Apoyarse en el parser ya probado de `check-tenants.mjs`.
- Mantener `check-tenants.mjs` como red de seguridad final: aunque el scaffolder genere todo, el guard sigue corriendo en pre-commit/CI.
- `elegance` es legacy (colecciones en raíz, no `tenants/<id>/`). El seed genérico debe respetar esa excepción (igual que `tenantCol()` en tenantUtils).
- Tenants en prueba van en el set `PRELAUNCH` de `check-tenants.mjs` hasta lanzarlos.
