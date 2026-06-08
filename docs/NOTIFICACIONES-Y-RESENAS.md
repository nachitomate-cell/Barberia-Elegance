# Notificaciones Push y Reseñas de Google

Documentación de dos sistemas multi-tenant del SaaS. Ambos comparten el mismo
proyecto Firebase (`barberia-elegance`) y la convención de rutas:
**`elegance` vive en la raíz; el resto bajo `tenants/{tenantId}/...`**.

---

## 1. Reseñas de Google (sincronización automática)

Sincroniza **rating + total de opiniones** (y hasta 5 reseñas) desde Google
Places API hacia Firestore, para que el badge del sitio esté siempre al día en
vez de hardcodeado en `config.js` / `middleware.js`.

### Arquitectura
```
Google Places API (New)
   ▲  cron diario (06:00) + callable manual
Cloud Function googleReviewsSync  ──►  settings/googleReviews            (elegance)
                                       tenants/{tid}/settings/googleReviews (resto)
                                          { placeId, rating, totalReviews, reviews[], updatedAt }
                                       │ onSnapshot ─► index.html (badge en vivo, fallback a config.js)
```

- **Función:** [`functions/google-reviews-sync.js`](../functions/google-reviews-sync.js)
  (`googleReviewsSyncScheduled` cron + `googleReviewsSyncManual` callable, solo superadmin).
- **Cliente:** [`index.html`](../index.html) → `subscribeGoogleReviews()` lee el doc
  con `onSnapshot` y actualiza el badge; si el doc no existe usa `config.js` (sin regresión).
- **El `placeId` vive en Firestore** (no hardcodeado): `…/settings/googleReviews { placeId }`.

### Requisitos (una vez)
1. Google Cloud (`barberia-elegance`) → habilitar **Places API (New)** + facturación.
2. Crear API key restringida a Places API (New), **sin** restricción de aplicación
   (las llamadas salen de servidor).
3. Guardar como secret: `firebase functions:secrets:set GOOGLE_PLACES_API_KEY`.

### Cómo activar un local nuevo
1. Obtener su **Place ID** (Place ID Finder de Google, o vía la propia API
   `places:searchText`).
2. Escribir en Firestore: `tenants/{tid}/settings/googleReviews` → `{ placeId: "ChIJ..." }`
   (para elegance: `settings/googleReviews`).
3. El cron lo recoge solo; para forzar, correr `googleReviewsSyncManual` (superadmin)
   o "Forzar ejecución" del job en Cloud Scheduler. **No requiere redeploy.**

### Locales activos (jun 2026)
D'Jones (77), Chameleon (239), AURA (55), Ferraza (47), Elegance (2).

### Límite de Google
La API entrega rating + total siempre, pero **solo hasta 5 reseñas** individuales.
Para las reseñas del carrusel se siguen curando a mano o se usan esas 5.

---

## 2. Notificaciones Push (FCM) multi-tenant

Cloud Functions envían push FCM al staff cuando entra una reserva.

### Regla de oro: dónde viven los tokens
| Tenant | Colección de tokens | Quién la lee |
|---|---|---|
| `elegance` | `fcm_tokens` (raíz) | `getTokensActivos()` |
| resto | `tenants/{tid}/fcm_tokens` | `getTokensActivosTenant()` |

Ambas en [`functions/index.js`](../functions/index.js). **Escribir el token en la
ruta equivocada = no llega push.**

### Quién registra tokens
- **Panel React** (`/gestion-interna`): [`useFCMToken.js`](../admin-panel/src/hooks/useFCMToken.js)
  → `plataforma: 'web-admin'`. Se re-registra solo al abrir el panel si el permiso ya
  está concedido ([`NotificationBanner.jsx`](../admin-panel/src/components/layout/NotificationBanner.jsx)).
- **Agenda estática** (`agenda.html`): usa `tenantCol` → ruta correcta por diseño.
- Clientes: `plataforma: 'web-cliente'` (no notificar como staff).

### Bug corregido (jun 2026)
`useFCMToken` guardaba el token **siempre en la raíz** `fcm_tokens`, así que los
locales (≠ elegance) nunca recibían push (Elegance sí, porque la raíz es su ruta).
Corregido para escribir en `tenants/{tid}/fcm_tokens`. Además se migraron los tokens
ya mal ubicados de la raíz a su ruta de tenant.

### Cómo activar para un local nuevo
Su staff abre el panel `/gestion-interna` desde el celular y toca **"Activar
notificaciones"** (en iPhone: primero "Agregar a pantalla de inicio"). El token
queda en `tenants/{tid}/fcm_tokens` automáticamente.

### Mantenimiento
- Los tokens muertos (`registration-token-not-registered`) se **autodesactivan**
  (`activo:false`) en cada envío real; `limpiarTokensInactivos` los borra a los 60 días.
- Para enviar un push manual a un tenant (admin SDK), leer
  `…/fcm_tokens where activo==true`, excluir `web-cliente`, y `sendEachForMulticast`.

### Nota: sonido de aviso
El warning de consola `AudioContext was not allowed to start` es el **sonido**
in-app (los navegadores requieren un gesto del usuario antes de reproducir audio).
No afecta la entrega del push (que es notificación del sistema).
